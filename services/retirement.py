from datetime import date
from math import pow
from db import SessionLocal
from models import RetirementPlan, FinancialProfile, Goal, Investment
from services.goals import calculate_sip


def get_retirement_plan():
    session = SessionLocal()
    plan = session.query(RetirementPlan).first()
    profile = session.query(FinancialProfile).first()
    retirement_goals = session.query(Goal).filter(Goal.goal_type == "retirement").all()
    investments = session.query(Investment).filter(Investment.active == True).all()

    if not plan:
        plan = RetirementPlan()
        session.add(plan)
        session.commit()
        session.refresh(plan)

    current_age = profile.age if profile and profile.age else 30
    monthly_expenses = (
        plan.monthly_expenses_override
        or (profile.monthly_expenses if profile and profile.monthly_expenses else 0)
    )

    corpus_from_goals = sum(
        (g.current_amount or 0) for g in retirement_goals
    )
    corpus_from_investments = sum(
        (i.current_value or 0) for i in investments
    )
    total_corpus = (plan.current_corpus or 0) + corpus_from_goals + corpus_from_investments

    years_to_retirement = max(plan.retirement_age - current_age, 0)
    years_in_retirement = max(plan.life_expectancy - plan.retirement_age, 1)

    monthly_exp_at_retire = monthly_expenses * pow(
        1 + (plan.expected_inflation or 6) / 100, years_to_retirement
    )
    annual_exp_at_retire = monthly_exp_at_retire * 12

    post_r = (plan.post_retirement_return or 6) / 100
    if post_r > 0:
        corpus_needed = annual_exp_at_retire * (
            1 - pow(1 + post_r, -years_in_retirement)
        ) / post_r
    else:
        corpus_needed = annual_exp_at_retire * years_in_retirement

    corpus_needed = round(corpus_needed, 2)
    gap = max(corpus_needed - total_corpus, 0)
    pct = round((total_corpus / corpus_needed) * 100, 1) if corpus_needed > 0 else 0

    months_to_retirement = years_to_retirement * 12
    monthly_sip = calculate_sip(
        corpus_needed, months_to_retirement,
        total_corpus, plan.pre_retirement_return or 8,
    ) if months_to_retirement > 0 else 0

    session.close()

    return {
        "id": plan.id,
        "retirement_age": plan.retirement_age,
        "life_expectancy": plan.life_expectancy,
        "expected_inflation": plan.expected_inflation,
        "pre_retirement_return": plan.pre_retirement_return,
        "post_retirement_return": plan.post_retirement_return,
        "current_age": current_age,
        "monthly_expenses": monthly_expenses,
        "current_corpus": round(total_corpus, 2),
        "years_to_retirement": years_to_retirement,
        "years_in_retirement": years_in_retirement,
        "monthly_expenses_at_retirement": round(monthly_exp_at_retire, 2),
        "annual_expenses_at_retirement": round(annual_exp_at_retire, 2),
        "corpus_needed": corpus_needed,
        "gap": round(gap, 2),
        "pct": min(pct, 100),
        "monthly_sip_needed": round(monthly_sip, 2),
    }


def update_retirement_plan(data: dict):
    session = SessionLocal()
    plan = session.query(RetirementPlan).first()
    if not plan:
        plan = RetirementPlan()
        session.add(plan)
    for key in ("retirement_age", "life_expectancy", "expected_inflation",
                "pre_retirement_return", "post_retirement_return",
                "monthly_expenses_override", "current_corpus"):
        if key in data:
            setattr(plan, key, data[key])
    session.commit()
    session.refresh(plan)
    session.close()
    return plan
