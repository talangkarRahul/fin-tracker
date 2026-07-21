#!/usr/bin/env python3
"""
Generic Indian bank statement transaction extractor.

Works across most Indian bank PDF statement formats (HDFC, ICICI, SBI, Axis,
Kotak, IDFC, PNB, BoB, Yes Bank, Union, IndusInd, etc.) using two
complementary strategies per page:

  1. TABLE STRATEGY  - pdfplumber's table detector, with the header row
     matched generically against common column-name synonyms
     (Date / Narration / Debit / Withdrawal / Credit / Deposit / Balance ...).

  2. TEXT STRATEGY (fallback) - line-by-line regex anchored on a leading
     date, with multi-line narration continuation, and a "balance-delta"
     heuristic to decide debit vs credit when the layout doesn't make it
     obvious. Since almost every Indian bank statement prints a running
     balance after each transaction, and that balance is monotonically
     consistent with debit/credit, this heuristic is far more portable
     across formats than trying to hard-code column positions.

Usage:
    python extract_transactions.py statement.pdf -o transactions.xlsx
    python extract_transactions.py statement.pdf --password 1234 -o out.csv

Output columns: Date, Description, Ref No, Debit, Credit, Balance
"""
import argparse
import re
import sys
from datetime import datetime

import pandas as pd
import pdfplumber

# --------------------------------------------------------------------------
# Regex helpers
# --------------------------------------------------------------------------

DATE_PATTERNS = [
    r"\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}",           # 01/04/2024, 01-04-24
    r"\d{1,2}[\-\s][A-Za-z]{3}[\-\s]\d{2,4}",        # 01-Apr-2024, 01 Apr 2024
    r"\d{4}[/\-]\d{1,2}[/\-]\d{1,2}",                # 2024-04-01
]
DATE_RE = re.compile(r"^\s*(" + "|".join(DATE_PATTERNS) + r")\b")

# Money token: optional minus, digits with optional Indian-style commas,
# and a MANDATORY 2-decimal part (this is what distinguishes a rupee amount
# from a reference/UTR/cheque number embedded in the narration, which is
# almost always a bare integer with no decimal point), plus an optional
# trailing Dr/Cr marker.
MONEY_RE = re.compile(
    r"(-?\d{1,3}(?:,\d{2,3})*\.\d{2}|-?\d+\.\d{2})\s*(Cr|CR|Dr|DR)?\b"
)

HEADER_SYNONYMS = {
    "date": ["date", "txn date", "transaction date", "value date"],
    "description": [
        "narration", "description", "particulars", "transaction remarks",
        "remarks", "details", "transaction details",
    ],
    "ref_no": ["chq", "ref", "reference", "chq/ref no", "cheque no", "cheque/ref no"],
    "debit": ["debit", "withdrawal", "withdrawal amt", "withdrawal(dr)", "dr"],
    "credit": ["credit", "deposit", "deposit amt", "deposit(cr)", "cr"],
    "balance": ["balance", "closing balance", "running balance"],
}

NOISE_LINE_RE = re.compile(
    r"^(page \d|statement of account|account (no|number)|ifsc|micr|branch|"
    r"opening balance|closing balance|generated on|this is a system|"
    r"account holder|customer id|address|email|phone)",
    re.IGNORECASE,
)


def clean_amount(tok):
    """Convert a matched money token like '1,23,456.78 Dr' to a signed float."""
    if not tok:
        return None
    tok = tok.strip()
    m = MONEY_RE.match(tok)
    if not m:
        return None
    num, sign_marker = m.groups()
    if num in (None, "", "-"):
        return None
    val = float(num.replace(",", ""))
    if sign_marker and sign_marker.lower() == "dr":
        val = -abs(val)
    return val


def parse_date(tok):
    tok = tok.strip()
    fmts = [
        "%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y", "%d-%m-%y", "%d.%m.%Y", "%d.%m.%y",
        "%d-%b-%Y", "%d-%b-%y", "%d %b %Y", "%d %b %y",
        "%Y-%m-%d", "%Y/%m/%d",
    ]
    for f in fmts:
        try:
            return datetime.strptime(tok, f).date()
        except ValueError:
            continue
    return None


def normalize_header(text):
    return re.sub(r"[^a-z0-9/() ]", "", text.lower().strip())


def map_columns(header_row):
    """Map a table header row (list of cell strings) to canonical field names."""
    mapping = {}
    for idx, cell in enumerate(header_row):
        if not cell:
            continue
        norm = normalize_header(cell)
        for field, synonyms in HEADER_SYNONYMS.items():
            if field in mapping.values():
                continue
            if any(syn in norm for syn in synonyms):
                mapping[idx] = field
                break
    return mapping


# --------------------------------------------------------------------------
# Strategy 1: table extraction
# --------------------------------------------------------------------------

def extract_from_tables(pdf):
    rows = []
    for page in pdf.pages:
        for table in page.extract_tables():
            if not table or len(table) < 2:
                continue
            header = table[0]
            col_map = map_columns(header)
            if "date" not in col_map.values() or "balance" not in col_map.values():
                continue  # doesn't look like a transaction table
            inv_map = {v: k for k, v in col_map.items()}
            for raw in table[1:]:
                if not raw or all(c is None or str(c).strip() == "" for c in raw):
                    continue
                date_cell = raw[inv_map["date"]] if inv_map.get("date") is not None else None
                if not date_cell or not parse_date(str(date_cell).strip()):
                    continue  # continuation/wrapped line, skip (merged into desc below)
                date_val = parse_date(str(date_cell).strip())
                desc = str(raw[inv_map["description"]]).strip() if "description" in inv_map and raw[inv_map["description"]] else ""
                ref = str(raw[inv_map["ref_no"]]).strip() if "ref_no" in inv_map and raw[inv_map["ref_no"]] else ""
                debit = clean_amount(str(raw[inv_map["debit"]])) if "debit" in inv_map and raw[inv_map["debit"]] else None
                credit = clean_amount(str(raw[inv_map["credit"]])) if "credit" in inv_map and raw[inv_map["credit"]] else None
                balance = clean_amount(str(raw[inv_map["balance"]])) if "balance" in inv_map and raw[inv_map["balance"]] else None
                rows.append({
                    "Date": date_val, "Description": desc, "Ref No": ref,
                    "Debit": abs(debit) if debit else None,
                    "Credit": abs(credit) if credit else None,
                    "Balance": balance,
                })

    # Balance-delta heuristic: fill missing Debit/Credit from consecutive balances
    prev_balance = None
    for row in rows:
        balance = row["Balance"]
        if balance is not None and prev_balance is not None and row["Debit"] is None and row["Credit"] is None:
            delta = round(balance - prev_balance, 2)
            if delta > 0:
                row["Credit"] = abs(delta)
            elif delta < 0:
                row["Debit"] = abs(delta)
        if balance is not None:
            prev_balance = balance

    return rows


# --------------------------------------------------------------------------
# Strategy 2: text/regex fallback with balance-delta heuristic
# --------------------------------------------------------------------------

def extract_from_text(pdf):
    blocks = []  # list of raw merged transaction line-groups
    current = None

    for page in pdf.pages:
        text = page.extract_text(layout=False) or ""
        for line in text.split("\n"):
            if not line.strip() or NOISE_LINE_RE.search(line.strip()):
                continue
            if DATE_RE.match(line):
                if current:
                    blocks.append(current)
                current = line.strip()
            elif current is not None:
                # continuation of a wrapped narration - only merge if this
                # line doesn't itself look like unrelated boilerplate
                current += " " + line.strip()
    if current:
        blocks.append(current)

    rows = []
    prev_balance = None
    for block in blocks:
        date_match = DATE_RE.match(block)
        if not date_match:
            continue
        date_val = parse_date(date_match.group(1))
        rest = block[date_match.end():].strip()

        money_matches = list(MONEY_RE.finditer(rest))
        # keep only tokens that actually contain a digit (avoid stray '-' etc.)
        money_matches = [m for m in money_matches if any(c.isdigit() for c in m.group(0))]
        if not money_matches:
            continue  # no amounts on this line at all, skip

        balance_tok = money_matches[-1]
        balance = clean_amount(balance_tok.group(0))
        desc_end = money_matches[0].start()
        description = re.sub(r"\s{2,}", " ", rest[:desc_end]).strip(" -|")

        debit = credit = None
        amount_matches = money_matches[:-1]  # everything except trailing balance

        if len(amount_matches) >= 1:
            amt_val = clean_amount(amount_matches[-1].group(0))
            marker = amount_matches[-1].group(2)
            if marker:
                if marker.lower() == "dr":
                    debit = abs(amt_val)
                else:
                    credit = abs(amt_val)
            elif prev_balance is not None and balance is not None:
                delta = round(balance - prev_balance, 2)
                if delta > 0:
                    credit = abs(amt_val) if amt_val is not None else delta
                elif delta < 0:
                    debit = abs(amt_val) if amt_val is not None else abs(delta)
            else:
                # first row - no prior balance to compare; leave unsigned
                # amount as debit-or-credit unknown, store as credit by
                # default only if it clearly increases assumed balance
                pass

        rows.append({
            "Date": date_val, "Description": description, "Ref No": "",
            "Debit": debit, "Credit": credit, "Balance": balance,
        })
        if balance is not None:
            prev_balance = balance

    return rows


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------

def extract_transactions(pdf_path, password=None):
    with pdfplumber.open(pdf_path, password=password) as pdf:
        rows = extract_from_tables(pdf)
        if len(rows) < 2:
            rows = extract_from_text(pdf)

    df = pd.DataFrame(rows, columns=["Date", "Description", "Ref No", "Debit", "Credit", "Balance"])
    df = df.dropna(subset=["Date"]).reset_index(drop=True)
    return df


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", help="Path to the bank statement PDF")
    ap.add_argument("-o", "--output", default="transactions.xlsx", help="Output .xlsx or .csv path")
    ap.add_argument("--password", default=None, help="PDF password, if encrypted")
    args = ap.parse_args()

    df = extract_transactions(args.pdf, password=args.password)
    if df.empty:
        print("No transactions could be extracted. The statement format may need adjustments.", file=sys.stderr)
        sys.exit(1)

    if args.output.lower().endswith(".csv"):
        df.to_csv(args.output, index=False)
    else:
        df.to_excel(args.output, index=False)

    print(f"Extracted {len(df)} transactions -> {args.output}")


# --------------------------------------------------------------------------
# API helpers — used by routes/transactions.py
# --------------------------------------------------------------------------

def preview_bank_pdf(file_path: str, password: str = None, preview_rows: int = 5) -> dict:
    """Return first N rows as {columns, rows} for the frontend preview table."""
    df = extract_transactions(file_path, password=password)
    if df.empty:
        return {"columns": [], "rows": []}
    columns = list(df.columns)
    rows = df.head(preview_rows).fillna("").values.tolist()
    # Convert dates to strings for JSON
    for row in rows:
        for i, val in enumerate(row):
            if hasattr(val, "isoformat"):
                row[i] = val.isoformat()
            elif val is None:
                row[i] = ""
    return {"columns": columns, "rows": rows}


def import_bank_pdf(file_path: str, password: str = None) -> int:
    """Extract transactions from a bank PDF and insert into the DB."""
    from db import SessionLocal
    from models import Transaction
    from services.categories import categorize, assign_group

    df = extract_transactions(file_path, password=password)
    if df.empty:
        return 0

    session = SessionLocal()
    count = 0

    for _, row in df.iterrows():
        date_val = row["Date"]
        if date_val is None:
            continue

        description = str(row.get("Description", "") or "").strip()
        ref_no = str(row.get("Ref No", "") or "").strip()
        debit = row.get("Debit")
        credit = row.get("Credit")
        balance = row.get("Balance")

        # Determine amount and type from debit/credit columns
        if debit and float(debit) > 0:
            amount = -abs(float(debit))
            tx_type = "expense"
        elif credit and float(credit) > 0:
            amount = abs(float(credit))
            tx_type = "income"
        else:
            continue

        # Append ref number to description if present
        full_desc = description
        if ref_no:
            full_desc = f"{description} [Ref: {ref_no}]"

        cat = categorize(full_desc)
        group = assign_group(cat, full_desc)

        # Duplicate check: same date + description + amount
        from sqlalchemy import func
        existing = (
            session.query(Transaction)
            .filter(
                Transaction.date == date_val,
                Transaction.description == full_desc,
                func.abs(Transaction.amount) == abs(amount),
            )
            .first()
        )
        if existing:
            continue

        tx = Transaction(
            date=date_val,
            description=full_desc,
            amount=amount,
            transaction_type=tx_type,
            category=cat,
            group=group,
            balance=float(balance) if balance else None,
        )
        session.add(tx)
        count += 1

    session.commit()
    session.close()
    return count


if __name__ == "__main__":
    main()
