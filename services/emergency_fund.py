from db import SessionLocal
from models import EmergencyFund, FinancialProfile


def get_emergency_fund():
    session = SessionLocal()
    ef = session.query(EmergencyFund).first()
    if not ef:
        profile = session.query(FinancialProfile).first()
        ef = EmergencyFund(
            target_months=profile.emergency_fund_months if profile else 6,
            monthly_expenses=profile.monthly_expenses if profile else 0,
            current_amount=0,
        )
        session.add(ef)
        session.commit()
        session.refresh(ef)
    session.close()
    return _enrich(ef)


def update_emergency_fund(data: dict):
    session = SessionLocal()
    ef = session.query(EmergencyFund).first()
    if not ef:
        ef = EmergencyFund()
        session.add(ef)
    for key in ("target_months", "monthly_expenses", "current_amount"):
        if key in data:
            setattr(ef, key, data[key])
    session.commit()
    session.refresh(ef)
    session.close()
    return _enrich(ef)


def contribute_to_emergency_fund(amount: float):
    session = SessionLocal()
    ef = session.query(EmergencyFund).first()
    if not ef:
        profile = session.query(FinancialProfile).first()
        ef = EmergencyFund(
            target_months=profile.emergency_fund_months if profile else 6,
            monthly_expenses=profile.monthly_expenses if profile else 0,
            current_amount=0,
        )
        session.add(ef)
        session.commit()
        session.refresh(ef)
    ef.current_amount += amount
    session.commit()
    session.refresh(ef)
    session.close()
    return _enrich(ef)


def _enrich(ef: EmergencyFund):
    target_amount = round(ef.monthly_expenses * ef.target_months, 2)
    deficit = max(target_amount - ef.current_amount, 0)
    pct = round((ef.current_amount / target_amount) * 100, 1) if target_amount else 0
    months_covered = round(ef.current_amount / ef.monthly_expenses, 1) if ef.monthly_expenses else 0
    return {
        "id": ef.id,
        "target_months": ef.target_months,
        "monthly_expenses": ef.monthly_expenses,
        "current_amount": ef.current_amount,
        "target_amount": target_amount,
        "deficit": deficit,
        "pct": min(pct, 100),
        "months_covered": months_covered,
    }
