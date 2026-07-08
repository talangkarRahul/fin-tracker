from datetime import date, timedelta
from db import SessionLocal
from models import Transaction, RecurringTransaction
from services.common import _parse_date


def get_recurring():
    session = SessionLocal()
    items = (
        session.query(RecurringTransaction)
        .order_by(RecurringTransaction.next_run)
        .all()
    )
    session.close()
    return items


def get_recurring_item(item_id: int):
    session = SessionLocal()
    item = (
        session.query(RecurringTransaction)
        .filter(RecurringTransaction.id == item_id)
        .first()
    )
    session.close()
    return item


def create_recurring(data: dict):
    session = SessionLocal()
    item = RecurringTransaction(
        description=data["description"],
        category=data.get("category"),
        amount=data["amount"],
        frequency=data["frequency"],
        interval=data.get("interval", 1),
        next_run=_parse_date(data["next_run"]),
        end_date=_parse_date(data.get("end_date")),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    session.close()
    return item


def update_recurring(item_id: int, data: dict):
    session = SessionLocal()
    item = (
        session.query(RecurringTransaction)
        .filter(RecurringTransaction.id == item_id)
        .first()
    )
    if not item:
        session.close()
        return None
    for key in ("description", "category", "amount", "frequency",
                "interval", "next_run", "end_date", "active", "last_run"):
        if key in data:
            value = _parse_date(data[key]) if key in ("next_run", "end_date", "last_run") else data[key]
            setattr(item, key, value)
    session.commit()
    session.refresh(item)
    session.close()
    return item


def delete_recurring(item_id: int):
    session = SessionLocal()
    item = (
        session.query(RecurringTransaction)
        .filter(RecurringTransaction.id == item_id)
        .first()
    )
    if item:
        session.delete(item)
        session.commit()
    session.close()


def _compute_next_run(item: RecurringTransaction, from_date: date) -> date:
    if item.frequency == "daily":
        return from_date + timedelta(days=item.interval)
    elif item.frequency == "weekly":
        return from_date + timedelta(weeks=item.interval)
    elif item.frequency == "monthly":
        month = from_date.month - 1 + item.interval
        year = from_date.year + month // 12
        month = month % 12 + 1
        day = min(from_date.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                                   31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
        return date(year, month, day)
    elif item.frequency == "yearly":
        return date(from_date.year + item.interval, from_date.month, from_date.day)
    return from_date


def process_due_recurring():
    session = SessionLocal()
    today = date.today()
    due = (
        session.query(RecurringTransaction)
        .filter(
            RecurringTransaction.active == True,
            RecurringTransaction.next_run <= today,
        )
        .all()
    )
    created = 0
    for item in due:
        if item.end_date and today > item.end_date:
            item.active = False
            session.commit()
            continue

        tx_type = "INCOME" if item.amount > 0 else "EXPENSE"
        tx = Transaction(
            date=today,
            description=item.description,
            amount=item.amount,
            transaction_type=tx_type,
            category=item.category,
        )
        session.add(tx)
        item.last_run = today
        item.next_run = _compute_next_run(item, today)
        created += 1

    session.commit()
    session.close()
    return created
