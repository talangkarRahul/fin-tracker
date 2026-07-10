import re
from collections import defaultdict
import pdfplumber
import pandas as pd
import pypdfium2 as pdfium
import pytesseract
from db import SessionLocal
from models import Transaction
from services.categories import categorize
from services.transactions import safe_float, _is_duplicate


def _extract_lines_pdfplumber(file_path: str) -> str | None:
    """Extract text line-by-line using pdfplumber char positions."""
    with pdfplumber.open(file_path) as pdf:
        lines = []
        for page in pdf.pages:
            if not page.chars:
                return None
            by_y = defaultdict(list)
            for c in page.chars:
                by_y[round(c["top"], 1)].append(c)
            for y in sorted(by_y):
                text = "".join(
                    c["text"] for c in sorted(by_y[y], key=lambda c: c["x0"])
                )
                if text.strip():
                    lines.append(text)
    return "\n".join(lines)


def _get_pdf_text(file_path: str) -> str | None:
    """Extract text from a PDF. Falls back to OCR if no text found."""
    text = _extract_lines_pdfplumber(file_path)
    if text:
        return text
    return _ocr_pdf_text(file_path)


def _ocr_pdf_text(file_path: str) -> str | None:
    """Extract text from an image-based PDF using OCR."""
    try:
        pdf = pdfium.PdfDocument(file_path)
        texts = []
        for i in range(len(pdf)):
            page = pdf[i]
            bitmap = page.render(scale=3)
            pil = bitmap.to_pil()
            ocr_text = pytesseract.image_to_string(pil)
            texts.append(ocr_text)
        return "\n".join(texts)
    except Exception:
        return None


_TRANSACTION_RE = re.compile(
    r"(\d{1,2}\s*[A-Z][a-z]{2}\s*,?\s*\d{4})\s*(.+)", re.MULTILINE
)

_AMOUNT_RE = re.compile(r"[₹%]?\s*([\d,]+)\s*$")


def _parse_gpay_lines(lines: list[str]) -> list[dict]:
    """Parse GPay statement lines into transaction dicts.

    Handles both no-space pdfplumber format (01May,2026Paidto...₹160)
    and OCR format (01 May, 2026 Paid to ... ₹160).
    """
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

        is_expense = (
            desc.startswith("Paid to")
            or desc.startswith("Paidto")
            or desc.startswith("Paid by")
            or desc.startswith("Paidby")
        )
        is_income = (
            desc.startswith("Received from")
            or desc.startswith("Receivedfrom")
        )

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


def _extract_gpay_transactions(file_path: str) -> list[dict]:
    """Extract transactions from a GPay PDF file."""
    text = _get_pdf_text(file_path)
    if not text:
        return []

    lines = text.split("\n")
    return _parse_gpay_lines(lines)


def parse_pdf_preview(file_path: str, preview_rows: int = 5) -> dict:
    rows = _extract_gpay_transactions(file_path)
    if not rows:
        return {"columns": [], "rows": []}

    columns = ["date", "description", "amount"]
    data = [[r["date"], r["description"], r["amount"]] for r in rows[:preview_rows]]
    return {"columns": columns, "rows": data}


def import_pdf_with_mapping(file_path: str, mapping: dict) -> int:
    rows = _extract_gpay_transactions(file_path)
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

        db_tx = Transaction(
            date=date_val,
            description=desc,
            amount=amount,
            transaction_type=tx_type,
            category=categorize(desc),
        )
        session.add(db_tx)
        count += 1

    session.commit()
    session.close()
    return count
