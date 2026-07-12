import re
from collections import defaultdict
import pdfplumber
import pandas as pd
import pypdfium2 as pdfium
import pytesseract
from PIL import Image
from db import SessionLocal
from models import Transaction
from services.categories import categorize, assign_group
from services.transactions import safe_float, _is_duplicate


def _extract_lines_pdfplumber(file_path: str) -> list[dict] | None:
    """Extract text line-by-line using pdfplumber char positions.

    Returns list of {y, text} for each line, with x-ranges for column detection.
    """
    with pdfplumber.open(file_path) as pdf:
        page_data = []
        for page in pdf.pages:
            if not page.chars:
                return None
            by_y = defaultdict(list)
            for c in page.chars:
                by_y[round(c["top"], 1)].append(c)
            lines = []
            for y in sorted(by_y):
                chars = sorted(by_y[y], key=lambda c: c["x0"])
                parts = []
                prev_x = None
                for c in chars:
                    gap = c["x0"] - prev_x if prev_x is not None else 0
                    if gap > 15:
                        parts.append(" ")
                    parts.append(c["text"])
                    prev_x = c["x0"]
                text = "".join(parts)
                if text.strip():
                    lines.append({
                        "y": y,
                        "text": text,
                        "x0": chars[0]["x0"],
                        "x1": chars[-1]["x0"],
                        "chars": chars,
                    })
            page_data.extend(lines)
    return page_data


def _ocr_full_text(file_path: str, ocr_scale: int = 2) -> str:
    """Full-page OCR for description spacing. Only used for building fix map."""
    pdf = pdfium.PdfDocument(file_path)
    all_text = []
    for i in range(len(pdf)):
        page = pdf[i]
        bitmap = page.render(scale=ocr_scale)
        pil = bitmap.to_pil()
        text = pytesseract.image_to_string(pil)
        all_text.append(text)
    return "\n".join(all_text)


_TRANSACTION_RE = re.compile(
    r"(\d{1,2}\s*[A-Z][a-z]{2}\s*,?\s*\d{4})\s*(.+)", re.MULTILINE
)

_AMOUNT_RE = re.compile(r"[₹%]?\s*([\d,]+(?:\.\d+)?)\s*$")


def _build_desc_fix_map(file_path: str) -> dict[str, str]:
    """Build a mapping of no-space descriptions to spaced descriptions using OCR."""
    ocr_text = _ocr_full_text(file_path)
    if not ocr_text:
        return {}

    mapping = {}
    lines = ocr_text.split("\n")
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        if _TRANSACTION_RE.match(line):
            rest = _TRANSACTION_RE.match(line).group(2).strip()
        elif (line.startswith("Paid to") or line.startswith("Paid by") or line.startswith("Received from")):
            rest = line
        else:
            continue

        desc = rest.replace("₹", "").replace("%", "").replace("S$", "").strip()
        desc = re.sub(r"\s*[RrVv]+\s*[\d,]+(?:\.\d+)?\s*$", "", desc).strip()
        desc = re.sub(r"\s*[\d,]+(?:\.\d+)?\s*$", "", desc).strip()
        desc = re.sub(r"\s*[<>=™∙•.\[\]·]+\s*$", "", desc).strip()
        desc = re.sub(r"\s+", " ", desc).strip()
        no_space = re.sub(r"\s+", "", desc)
        if no_space != desc and len(no_space) > 3:
            mapping[no_space] = desc
    return mapping


def _fix_description(desc: str, fix_map: dict[str, str] | None = None) -> str:
    """Insert spaces into PDF descriptions that lack them."""
    # Apply OCR fix map first
    if fix_map:
        no_space = re.sub(r"\s+", "", desc)
        if no_space in fix_map:
            return fix_map[no_space]

    desc = desc.replace("Paidto", "Paid to ").replace("Paidby", "Paid by ")
    desc = desc.replace("Receivedfrom", "Received from ")
    desc = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", desc)
    desc = re.sub(r"(?<=\d)(?=[A-Z])", " ", desc)
    desc = re.sub(r"\s+", " ", desc).strip()
    return desc


def _parse_gpay_lines(lines: list[str], fix_map: dict[str, str] | None = None) -> list[dict]:
    """Parse GPay statement lines into transaction dicts."""
    text = "\n".join(lines)
    transactions = []

    for match in _TRANSACTION_RE.finditer(text):
        date_raw = match.group(1).strip()
        line_content = match.group(2).strip()
        line_content = line_content.replace("%", "").replace("S$", "").strip()

        amt_m = _AMOUNT_RE.search(line_content)
        if not amt_m:
            continue

        try:
            amount = float(amt_m.group(1).replace(",", ""))
        except ValueError:
            continue

        desc = line_content[: amt_m.start()].strip()
        desc = desc.replace("₹", "").replace("%", "").replace("S$", "").strip()
        desc = _fix_description(desc, fix_map)

        is_expense = desc.startswith("Paid to") or desc.startswith("Paid by")
        is_income = desc.startswith("Received from")

        if not is_expense and not is_income:
            continue

        tx_type = "income" if is_income else "expense"
        if tx_type == "expense":
            amount = -amount

        transactions.append(
            {
                "date": date_raw,
                "description": desc,
                "amount": amount,
                "transaction_type": tx_type,
            }
        )

    return transactions


def _extract_gpay_transactions(file_path: str, full: bool = False) -> list[dict]:
    """Extract transactions from a GPay PDF file.

    Args:
        file_path: Path to the PDF file.
        full: If True, runs OCR for properly spaced descriptions (slower).
              If False, uses heuristics only (faster).
    """
    lines_data = _extract_lines_pdfplumber(file_path)

    if lines_data is None:
        # Image-based PDF - use OCR
        text = _ocr_full_text(file_path)
        if not text:
            return []
        return _parse_gpay_lines(text.split("\n"))

    lines_text = [l["text"] for l in lines_data]
    parsed = _parse_gpay_lines(lines_text)

    if not parsed:
        return []

    if full:
        fix_map = _build_desc_fix_map(file_path)
        if fix_map:
            return _parse_gpay_lines(lines_text, fix_map)

    return parsed


def parse_pdf_preview(file_path: str, preview_rows: int = 5) -> dict:
    rows = _extract_gpay_transactions(file_path, full=False)
    if not rows:
        return {"columns": [], "rows": []}

    columns = ["date", "description", "amount"]
    data = [[r["date"], r["description"], r["amount"]] for r in rows[:preview_rows]]
    return {"columns": columns, "rows": data}


def import_pdf_with_mapping(file_path: str, mapping: dict) -> int:
    rows = _extract_gpay_transactions(file_path, full=True)
    if not rows:
        return 0

    date_format = mapping.get("date_format", "dayfirst")
    session = SessionLocal()
    count = 0

    for tx in rows:
        try:
            date_val = pd.to_datetime(tx["date"], dayfirst=(date_format == "dayfirst")).date()
        except Exception:
            continue

        desc = tx["description"]
        amount = tx["amount"]
        tx_type = tx["transaction_type"]

        if _is_duplicate(session, date_val, desc, amount):
            continue

        cat = categorize(desc)
        db_tx = Transaction(
            date=date_val,
            description=desc,
            amount=amount,
            transaction_type=tx_type,
            category=cat,
            group=assign_group(cat, desc),
        )
        session.add(db_tx)
        count += 1

    session.commit()
    session.close()
    return count
