from datetime import date
from db import SessionLocal
from models import Transaction


def _parse_date(value):
    if value is None or isinstance(value, date):
        return value
    return date.fromisoformat(value)


def _date_filter(query, date_from=None, date_to=None):
    if date_from:
        query = query.filter(Transaction.date >= date_from)
    if date_to:
        query = query.filter(Transaction.date <= date_to)
    return query
