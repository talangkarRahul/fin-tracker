from datetime import date
from math import pow
from db import SessionLocal
from models import Goal, Investment
from services.common import _parse_date

DEFAULT_INFLATION = 6.0  # Indian context default


def calculate_sip(target_amount: float, months: int,
                  current_amount: float = 0, expected_return: float = 8.0) -> float:
    if months <= 0:
        return 0
    r = expected_return / 12 / 100
    n = months
    if r == 0:
        total = target_amount - current_amount
        return total / n if n > 0 else 0
    fv_needed = target_amount - current_amount * pow(1 + r, n)
    if fv_needed <= 0:
        return 0
    sip = fv_needed * r / (pow(1 + r, n) - 1)
    return round(sip, 2)


def inflation_adjusted_target(target_amount: float, months: int,
                              inflation_rate: float = DEFAULT_INFLATION) -> float:
    if months <= 0:
        return target_amount
    years = months / 12
    return round(target_amount * pow(1 + inflation_rate / 100, years), 2)


def get_goals():
    session = SessionLocal()
    goals = session.query(Goal).order_by(Goal.target_date).all()
    session.close()
    return [_enrich_goal(g) for g in goals]


def get_goal(goal_id: int):
    session = SessionLocal()
    goal = session.query(Goal).filter(Goal.id == goal_id).first()
    session.close()
    return _enrich_goal(goal) if goal else None


def create_goal(data: dict):
    session = SessionLocal()
    goal = Goal(
        name=data["name"],
        goal_type=data.get("goal_type", "savings"),
        target_amount=data["target_amount"],
        target_date=_parse_date(data.get("target_date")),
        current_amount=data.get("current_amount", 0),
        category=data.get("category"),
        notes=data.get("notes"),
        expected_return=data.get("expected_return", 8.0),
    )
    session.add(goal)
    session.commit()
    session.refresh(goal)
    session.close()
    return goal


def update_goal(goal_id: int, data: dict):
    session = SessionLocal()
    goal = session.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        session.close()
        return None
    for key in ("name", "goal_type", "target_amount", "current_amount",
                "target_date", "category", "notes", "achieved", "expected_return"):
        if key in data:
            value = _parse_date(data[key]) if key.endswith("_date") else data[key]
            setattr(goal, key, value)
    session.commit()
    session.refresh(goal)
    session.close()
    return goal


def delete_goal(goal_id: int):
    session = SessionLocal()
    goal = session.query(Goal).filter(Goal.id == goal_id).first()
    if goal:
        session.delete(goal)
        session.commit()
    session.close()


def contribute_to_goal(goal_id: int, amount: float):
    session = SessionLocal()
    goal = session.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        session.close()
        return None
    goal.current_amount += amount
    if goal.current_amount >= goal.target_amount:
        goal.achieved = True
    session.commit()
    session.refresh(goal)
    session.close()
    return goal


def _enrich_goal(goal: Goal):
    session = SessionLocal()
    linked_invs = session.query(Investment).filter(Investment.goal_id == goal.id, Investment.active == True).all()
    session.close()
    invested_via_goal = sum((i.current_value or 0) for i in linked_invs)
    total_current = goal.current_amount + invested_via_goal
    pct = round((total_current / goal.target_amount) * 100, 1) if goal.target_amount else 0
    remaining = max(goal.target_amount - total_current, 0)
    days_left = (goal.target_date - date.today()).days if goal.target_date else None
    on_track = _compute_on_track(goal)
    months_left = max(round(days_left / 30.0), 0) if days_left else None
    monthly_sip = calculate_sip(goal.target_amount, months_left,
                                total_current, goal.expected_return) if months_left else None
    inflation_adj = inflation_adjusted_target(goal.target_amount, months_left) if months_left else None
    return {
        "id": goal.id,
        "name": goal.name,
        "goal_type": goal.goal_type,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount,
        "invested_via_goal": round(invested_via_goal, 2),
        "target_date": goal.target_date,
        "category": goal.category,
        "notes": goal.notes,
        "achieved": goal.achieved,
        "expected_return": goal.expected_return,
        "progress": {
            "pct": min(pct, 100),
            "remaining": remaining,
            "days_left": days_left,
            "on_track": on_track,
        },
        "monthly_sip": monthly_sip,
        "inflation_adjusted_target": inflation_adj,
        "linked_investments": [
            {
                "id": inv.id,
                "name": inv.name,
                "amount_invested": inv.amount_invested,
                "current_value": inv.current_value,
                "investment_type": inv.investment_type,
            }
            for inv in linked_invs
        ],
    }


def _compute_on_track(goal: Goal):
    if goal.achieved or goal.current_amount <= 0 or not goal.target_date:
        return goal.achieved if goal.achieved else None
    days_since_start = (date.today() - goal.target_date).days
    if days_since_start >= 0:
        return False
    age_days = abs(days_since_start)
    if age_days < 30:
        return None
    monthly_rate = goal.current_amount / max(age_days / 30, 1)
    if monthly_rate <= 0:
        return False
    months_remaining = max((goal.target_date - date.today()).days / 30, 0)
    projected = goal.current_amount + monthly_rate * months_remaining
    return projected >= goal.target_amount
