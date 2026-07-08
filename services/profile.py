import json
from db import SessionLocal
from models import FinancialProfile


def get_financial_profile():
    session = SessionLocal()
    profile = session.query(FinancialProfile).first()
    if not profile:
        profile = FinancialProfile()
        session.add(profile)
        session.commit()
        session.refresh(profile)
    session.close()
    return profile


def update_financial_profile(data: dict):
    session = SessionLocal()
    profile = session.query(FinancialProfile).first()
    if not profile:
        profile = FinancialProfile()
        session.add(profile)
    for key in ("age", "income", "monthly_expenses", "dependents",
                 "tax_regime", "risk_appetite", "emergency_fund_months"):
        if key in data:
            setattr(profile, key, data[key])
    if "existing_assets" in data:
        profile.existing_assets = json.dumps(data["existing_assets"])
    if "existing_liabilities" in data:
        profile.existing_liabilities = json.dumps(data["existing_liabilities"])
    session.commit()
    session.refresh(profile)
    session.close()
    return profile
