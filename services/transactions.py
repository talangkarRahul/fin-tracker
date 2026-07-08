from db import SessionLocal
from models import Transaction
from services.categories import categorize
from services.common import _parse_date
import pandas as pd


def get_transactions():
    session = SessionLocal()
    rows = (
        session.query(Transaction)
        .order_by(Transaction.date.desc())
        .all()
    )
    return rows


def create_transaction(data: dict):
    session = SessionLocal()
    cat = categorize(data.get("description", ""))
    raw_amount = float(data["amount"])
    tx_type = data.get("transaction_type", "expense" if raw_amount < 0 else "income")
    if tx_type in ("debit", "expense") and raw_amount > 0:
        raw_amount = -raw_amount
    elif tx_type in ("credit", "income") and raw_amount < 0:
        raw_amount = -raw_amount
    tx = Transaction(
        date=_parse_date(data["date"]),
        description=data.get("description"),
        amount=raw_amount,
        transaction_type=tx_type,
        category=data.get("category") or cat,
        balance=data.get("balance"),
    )
    session.add(tx)
    session.commit()
    session.refresh(tx)
    session.close()
    return tx


def delete_transaction(tx_id: int):
    session = SessionLocal()
    tx = session.query(Transaction).filter(Transaction.id == tx_id).first()
    if tx:
        session.delete(tx)
        session.commit()
    session.close()


def update_transaction(tx_id: int, data: dict):
    session = SessionLocal()
    tx = session.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        session.close()
        return None
    for key in ("date", "description", "amount", "transaction_type", "category", "balance"):
        if key in data:
            if key == "date":
                setattr(tx, key, _parse_date(data[key]))
            else:
                setattr(tx, key, data[key])
    if "amount" in data or "transaction_type" in data:
        raw_amount = tx.amount
        if tx.transaction_type in ("debit", "expense") and raw_amount > 0:
            tx.amount = -raw_amount
        elif tx.transaction_type in ("credit", "income") and raw_amount < 0:
            tx.amount = -raw_amount
    session.commit()
    session.refresh(tx)
    session.close()
    return tx


def safe_float(value):
    if pd.isna(value):
        return 0.0
    value = str(value).replace(",", "").strip()
    if value == "":
        return 0.0
    return float(value)


def import_csv_generic(file_path, mapping):
    df = pd.read_csv(file_path)
    date_col = mapping.get("date_column")
    desc_col = mapping.get("description_column")
    amount_col = mapping.get("amount_column")
    debit_col = mapping.get("debit_column")
    credit_col = mapping.get("credit_column")
    balance_col = mapping.get("balance_column")
    date_format = mapping.get("date_format", "dayfirst")
    date_col_fallback = mapping.get("date_column_fallback")

    session = SessionLocal()
    count = 0

    for _, row in df.iterrows():
        date_val = None
        for col in [date_col, date_col_fallback]:
            if col and col in row:
                try:
                    date_val = pd.to_datetime(
                        row[col], dayfirst=(date_format == "dayfirst")
                    ).date()
                    break
                except Exception:
                    continue
        if date_val is None:
            continue

        desc = str(row.get(desc_col, "")).strip() if desc_col else ""

        if amount_col and amount_col in row:
            raw = safe_float(row.get(amount_col))
            if raw < 0:
                amount = raw
                tx_type = "expense"
            else:
                amount = raw
                tx_type = "income"
        elif debit_col and credit_col:
            debit = safe_float(row.get(debit_col))
            credit = safe_float(row.get(credit_col))
            if credit > 0:
                amount = credit
                tx_type = "income"
            else:
                amount = -debit
                tx_type = "expense"
        else:
            continue

        balance = (
            safe_float(row.get(balance_col)) if balance_col and balance_col in row else None
        )

        tx = Transaction(
            date=date_val,
            description=desc,
            amount=amount,
            balance=balance,
            transaction_type=tx_type,
            category=categorize(desc),
        )
        session.add(tx)
        count += 1

    session.commit()
    session.close()
    return count


def import_icici_csv(file_path):
    df = pd.read_csv(file_path)

    session = SessionLocal()

    for _, row in df.iterrows():
        withdrawal = safe_float(
            row.get("Withdrawal Amount(INR)")
        )
        deposit = safe_float(
            row.get("Deposit Amount(INR)")
        )
        balance = safe_float(
            row.get("Balance(INR)")
        )

        if deposit > 0:
            amount = deposit
            tx_type = "INCOME"
        else:
            amount = -withdrawal
            tx_type = "EXPENSE"

        tx = Transaction(
            date=pd.to_datetime(
                row["Transaction Date"],
                dayfirst=True,
            ).date(),
            description=str(
                row["Transaction Remarks"]
            ).strip(),
            amount=amount,
            balance=balance,
            transaction_type=tx_type,
            category=categorize(
                str(row["Transaction Remarks"])
            ),
        )

        session.add(tx)

    session.commit()
    session.close()


def apply_category_to_transactions(keyword: str, category: str):
    session = SessionLocal()
    like_pattern = f"%{keyword}%"
    rows = (
        session.query(Transaction)
        .filter(Transaction.description.ilike(like_pattern))
        .all()
    )
    count = 0
    for tx in rows:
        if tx.category != category:
            tx.category = category
            count += 1
    session.commit()
    session.close()
    return count
