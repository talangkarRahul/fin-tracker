from datetime import date, timedelta
from db import SessionLocal
from models import Transaction, Budget
from sqlalchemy import func
from services.common import _parse_date, _date_filter


def monthly_summary(date_from=None, date_to=None):
    session = SessionLocal()

    base = session.query(func.sum(Transaction.amount))
    if date_from or date_to:
        base = _date_filter(base, date_from, date_to)

    income = (
        base.filter(Transaction.amount > 0)
        .scalar()
        or 0
    )

    base2 = session.query(func.sum(Transaction.amount))
    if date_from or date_to:
        base2 = _date_filter(base2, date_from, date_to)

    expenses = (
        base2.filter(Transaction.amount < 0)
        .scalar()
        or 0
    )

    savings = income + expenses

    return {
        "income": income,
        "expenses": abs(expenses),
        "savings": savings,
    }


def expense_breakdown(date_from=None, date_to=None):
    session = SessionLocal()

    query = (
        session.query(
            Transaction.category,
            func.sum(Transaction.amount)
        )
        .filter(Transaction.amount < 0)
    )
    if date_from or date_to:
        query = _date_filter(query, date_from, date_to)
    rows = query.group_by(Transaction.category).all()

    return {
        category: abs(amount)
        for category, amount in rows
    }


def savings_rate(date_from=None, date_to=None):
    summary = monthly_summary(date_from, date_to)
    income = summary["income"]
    savings = summary["savings"]
    if income == 0:
        return 0
    return round((savings / income) * 100, 2)


def report_monthly(months: int = 12, date_from=None, date_to=None):
    session = SessionLocal()
    today = date.today()
    rows = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m < 1:
            m += 12
            y -= 1
        start = date(y, m, 1)
        if m == 12:
            end = date(y + 1, 1, 1)
        else:
            end = date(y, m + 1, 1)

        range_start = max(start, date_from) if date_from else start
        range_end = min(end, date_to) if date_to else end
        if range_start >= range_end:
            continue

        income = (
            session.query(func.abs(func.sum(Transaction.amount)))
            .filter(Transaction.amount > 0, Transaction.date >= range_start, Transaction.date < range_end)
            .scalar()
            or 0
        )
        expenses = (
            session.query(func.abs(func.sum(Transaction.amount)))
            .filter(Transaction.amount < 0, Transaction.date >= range_start, Transaction.date < range_end)
            .scalar()
            or 0
        )
        savings = income - expenses
        rate = round((savings / income) * 100, 1) if income else 0
        rows.append({
            "month": f"{y}-{m:02d}",
            "income": income,
            "expenses": expenses,
            "savings": savings,
            "savings_rate": rate,
        })
    session.close()
    return rows


def _month_bounds(year: int, month: int):
    start = date(year, month, 1)
    if month == 12:
        return start, date(year + 1, 1, 1)
    return start, date(year, month + 1, 1)


def _latest_month_with_data(session):
    row = (
        session.query(Transaction.date)
        .filter(Transaction.amount < 0)
        .order_by(Transaction.date.desc())
        .first()
    )
    if not row:
        return date.today().year, date.today().month
    return row[0].year, row[0].month


def report_category(month_str: str = None, date_from=None, date_to=None):
    session = SessionLocal()
    if month_str:
        y, m = map(int, month_str.split("-"))
        start, end = _month_bounds(y, m)
    else:
        if date_from:
            start = date_from
            end = date_to + timedelta(days=1) if date_to else date.today() + timedelta(days=1)
        else:
            y, m = _latest_month_with_data(session)
            start, end = _month_bounds(y, m)

    query = session.query(
        Transaction.category,
        func.abs(func.sum(Transaction.amount)),
    ).filter(Transaction.amount < 0)
    query = query.filter(Transaction.date >= start)
    if end:
        query = query.filter(Transaction.date < end)
    rows = (
        query.group_by(Transaction.category)
        .order_by(func.abs(func.sum(Transaction.amount)).desc())
        .all()
    )
    total = sum(amount for _, amount in rows)
    session.close()
    return [
        {"category": cat, "amount": amt, "pct": round((amt / total) * 100, 1) if total else 0}
        for cat, amt in rows
    ]


def report_trends(months: int = 6, categories: list[str] = None, date_from=None, date_to=None):
    session = SessionLocal()
    if date_from and date_to:
        months_list = []
        y, m = date_from.year, date_from.month
        while date(y, m, 1) <= date_to:
            months_list.append((y, m))
            m += 1
            if m > 12:
                m = 1
                y += 1
    else:
        today = date.today()
        months_list = []
        for i in range(months - 1, -1, -1):
            m = today.month - i
            y = today.year
            while m < 1:
                m += 12
                y -= 1
            months_list.append((y, m))

    rows = []
    for y, m in months_list:
        start = date(y, m, 1)
        if m == 12:
            end = date(y + 1, 1, 1)
        else:
            end = date(y, m + 1, 1)

        range_start = max(start, date_from) if date_from else start
        range_end = min(end, date_to) if date_to else end
        if range_start >= range_end:
            continue

        query = session.query(
            Transaction.category,
            func.abs(func.sum(Transaction.amount)),
        ).filter(
            Transaction.amount < 0,
            Transaction.date >= range_start,
            Transaction.date < range_end,
        )
        if categories:
            query = query.filter(Transaction.category.in_(categories))
        query = query.group_by(Transaction.category)

        for cat, amt in query.all():
            rows.append({
                "month": f"{y}-{m:02d}",
                "category": cat,
                "amount": amt,
            })
    session.close()
    return rows


def report_budget_vs_actual(date_from=None, date_to=None):
    session = SessionLocal()
    today = date_to or date.today()
    period_start = date_from or today.replace(day=1)
    period_end = date_to + timedelta(days=1) if date_to else (
        today.replace(year=today.year + 1, month=1, day=1) if today.month == 12
        else today.replace(month=today.month + 1, day=1)
    )

    budgets = session.query(Budget).all()

    results = []
    for budget in budgets:
        spent = (
            session.query(func.abs(func.sum(Transaction.amount)))
            .filter(
                Transaction.amount < 0,
                Transaction.category == budget.category,
                Transaction.date >= period_start,
                Transaction.date < period_end,
            )
            .scalar()
            or 0
        )
        pct = round((spent / budget.limit_amount) * 100, 1) if budget.limit_amount else 0
        results.append({
            "category": budget.category,
            "limit": budget.limit_amount,
            "spent": spent,
            "remaining": max(budget.limit_amount - spent, 0),
            "pct": min(pct, 100),
        })

    session.close()
    return results
