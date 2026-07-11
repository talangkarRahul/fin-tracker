import json
from datetime import date
from db import SessionLocal
from models import FinancialProfile, EmergencyFund, Goal, Budget, Transaction
from sqlalchemy import func
from services.investments import get_investment_assets


def compute_health_score():
    session = SessionLocal()

    profile = session.query(FinancialProfile).first()
    ef = session.query(EmergencyFund).first()
    goals = session.query(Goal).all()
    budgets = session.query(Budget).all()

    annual_income = profile.income if profile and profile.income else 0
    monthly_expenses = profile.monthly_expenses if profile and profile.monthly_expenses else 0
    monthly_income = annual_income / 12 if annual_income > 0 else 0

    # --- 1. Emergency Fund Score (25%) ---
    ef_target = 0
    ef_current = 0
    if ef:
        ef_current = ef.current_amount or 0
        ef_target = (ef.monthly_expenses or 0) * (ef.target_months or 6)
    ef_score = min(100, (ef_current / ef_target) * 100) if ef_target > 0 else 0

    # --- 2. Debt-to-Income Score (20%) ---
    total_liabilities = 0
    try:
        if profile and profile.existing_liabilities:
            liabs = json.loads(profile.existing_liabilities)
            total_liabilities = sum(v for v in liabs.values() if v)
    except (json.JSONDecodeError, TypeError):
        pass
    dti_ratio = total_liabilities / annual_income if annual_income > 0 else total_liabilities
    dti_score = max(0, 100 - dti_ratio * 100)

    # --- 3. Savings Rate Score (20%) ---
    if monthly_income > 0 and monthly_expenses >= 0:
        raw_rate = (monthly_income - monthly_expenses) / monthly_income
        savings_rate = max(0, raw_rate) * 100
    else:
        savings_rate = 0
    savings_score = min(100, savings_rate * 5)  # 20% savings = 100

    # --- 4. Goal Progress Score (15%) ---
    in_progress = [g for g in goals if not g.achieved and g.target_amount > 0]
    if in_progress:
        avg_progress = sum(
            min((g.current_amount / g.target_amount) * 100, 100) for g in in_progress
        ) / len(in_progress)
    else:
        avg_progress = 100 if goals else 0
    goal_score = avg_progress

    # --- 5. Net Worth Score (10%) ---
    total_assets = 0
    try:
        if profile and profile.existing_assets:
            assets = json.loads(profile.existing_assets)
            total_assets = sum(v for v in assets.values() if v)
    except (json.JSONDecodeError, TypeError):
        pass
    if ef:
        total_assets += ef.current_amount or 0
    # Include investments aggregated by type
    total_assets += sum(a["amount"] for a in get_investment_assets())
    net_worth = total_assets - total_liabilities
    if net_worth > 0:
        nw_score = 100
    elif net_worth == 0:
        nw_score = 50
    else:
        nw_score = 0

    # --- 6. Budget Adherence Score (10%) ---
    today = date.today()
    budget_scores = []
    for b in budgets:
        if b.period == "monthly":
            start = today.replace(day=1)
            if today.month == 12:
                end = today.replace(year=today.year + 1, month=1, day=1)
            else:
                end = today.replace(month=today.month + 1, day=1)
        else:
            start = today.replace(month=1, day=1)
            end = today.replace(year=today.year + 1, month=1, day=1)

        spent = (
            session.query(func.abs(func.sum(Transaction.amount)))
            .filter(
                Transaction.amount < 0,
                Transaction.category == b.category,
                Transaction.date >= start,
                Transaction.date < end,
            )
            .scalar()
            or 0
        )

        if b.limit_amount > 0:
            ratio = spent / b.limit_amount
            if ratio <= 1:
                budget_scores.append(100)
            else:
                budget_scores.append(max(0, 100 - (ratio - 1) * 100))
    budget_score = sum(budget_scores) / len(budget_scores) if budget_scores else 100

    session.close()

    total = (
        ef_score * 0.25
        + dti_score * 0.20
        + savings_score * 0.20
        + goal_score * 0.15
        + nw_score * 0.10
        + budget_score * 0.10
    )

    if total >= 90:
        rating = "Excellent"
        color = "success"
    elif total >= 75:
        rating = "Good"
        color = "primary"
    elif total >= 55:
        rating = "Fair"
        color = "warning"
    elif total >= 35:
        rating = "Needs Work"
        color = "danger"
    else:
        rating = "Critical"
        color = "destructive"

    return {
        "score": round(total, 1),
        "rating": rating,
        "color": color,
        "components": {
            "emergency_fund": {"score": round(ef_score, 1), "weight": 25,
                               "label": "Emergency Fund", "detail": f"{ef_current:,.0f} / {ef_target:,.0f}"},
            "debt_to_income": {"score": round(dti_score, 1), "weight": 20,
                               "label": "Debt-to-Income", "detail": f"{total_liabilities:,.0f} / {annual_income:,.0f}"},
            "savings_rate": {"score": round(savings_score, 1), "weight": 20,
                             "label": "Savings Rate", "detail": f"{savings_rate:.1f}%"},
            "goal_progress": {"score": round(goal_score, 1), "weight": 15,
                              "label": "Goal Progress", "detail": f"{avg_progress:.1f}%"},
            "net_worth": {"score": round(nw_score, 1), "weight": 10,
                          "label": "Net Worth", "detail": f"{'Positive' if net_worth > 0 else 'Negative' if net_worth < 0 else 'Zero'}"},
            "budget_adherence": {"score": round(budget_score, 1), "weight": 10,
                                 "label": "Budget Adherence", "detail": f"{len(budget_scores)} budgets tracked"},
        },
    }
