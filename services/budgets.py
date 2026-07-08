from datetime import date
from db import SessionLocal
from models import Budget, Transaction
from sqlalchemy import func


def get_budgets():
    session = SessionLocal()
    budgets = session.query(Budget).all()
    session.close()
    return [_enrich_budget(b) for b in budgets]


def get_budget(budget_id: int):
    session = SessionLocal()
    budget = session.query(Budget).filter(Budget.id == budget_id).first()
    session.close()
    return _enrich_budget(budget) if budget else None


def create_budget(data: dict):
    from services.common import _parse_date
    session = SessionLocal()
    budget = Budget(
        category=data["category"],
        period=data.get("period", "monthly"),
        limit_amount=data["limit_amount"],
        start_date=_parse_date(data["start_date"]),
        end_date=_parse_date(data.get("end_date")),
    )
    session.add(budget)
    session.commit()
    session.refresh(budget)
    session.close()
    return budget


def update_budget(budget_id: int, data: dict):
    from services.common import _parse_date
    session = SessionLocal()
    budget = session.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        session.close()
        return None
    for key in ("category", "period", "limit_amount", "start_date", "end_date"):
        if key in data:
            value = _parse_date(data[key]) if key.endswith("_date") else data[key]
            setattr(budget, key, value)
    session.commit()
    session.refresh(budget)
    session.close()
    return budget


def delete_budget(budget_id: int):
    session = SessionLocal()
    budget = session.query(Budget).filter(Budget.id == budget_id).first()
    if budget:
        session.delete(budget)
        session.commit()
    session.close()


def _enrich_budget(budget: Budget):
    session = SessionLocal()
    today = date.today()

    if budget.period == "monthly":
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(year=today.year + 1, month=1, day=1)
        else:
            end = today.replace(month=today.month + 1, day=1)
    else:
        start = today.replace(month=1, day=1)
        end = today.replace(year=today.year + 1, month=1, day=1)

    spent_raw = (
        session.query(func.abs(func.sum(Transaction.amount)))
        .filter(
            Transaction.amount < 0,
            Transaction.category == budget.category,
            Transaction.date >= start,
            Transaction.date < end,
        )
        .scalar()
        or 0
    )

    session.close()

    pct = round((spent_raw / budget.limit_amount) * 100, 1) if budget.limit_amount else 0
    remaining = max(budget.limit_amount - spent_raw, 0)

    alert = None
    if pct >= 100:
        alert = "exceeded"
    elif pct >= 80:
        alert = "warning"

    return {
        "id": budget.id,
        "category": budget.category,
        "period": budget.period,
        "limit_amount": budget.limit_amount,
        "start_date": budget.start_date,
        "end_date": budget.end_date,
        "spent": spent_raw,
        "remaining": remaining,
        "pct": min(pct, 100),
        "alert": alert,
    }
