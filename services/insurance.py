from db import SessionLocal
from models import InsurancePolicy
from services.common import _parse_date

POLICY_TYPES = [
    "term_life", "health", "endowment", "ulip",
    "car", "bike", "home", "travel",
    "critical_illness", "personal_accident", "other",
]


def get_insurance_policies():
    session = SessionLocal()
    policies = session.query(InsurancePolicy).order_by(InsurancePolicy.start_date.desc()).all()
    session.close()
    return [_enrich(p) for p in policies]


def get_insurance_policy(policy_id: int):
    session = SessionLocal()
    p = session.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
    session.close()
    return _enrich(p) if p else None


def create_insurance_policy(data: dict):
    session = SessionLocal()
    policy = InsurancePolicy(
        policy_type=data.get("policy_type", "other"),
        provider=data.get("provider"),
        policy_number=data.get("policy_number"),
        sum_insured=data.get("sum_insured", 0),
        premium_amount=data.get("premium_amount", 0),
        premium_frequency=data.get("premium_frequency", "yearly"),
        start_date=_parse_date(data.get("start_date")),
        end_date=_parse_date(data.get("end_date")),
        nominee=data.get("nominee"),
        notes=data.get("notes"),
        active=data.get("active", True),
    )
    session.add(policy)
    session.commit()
    session.refresh(policy)
    session.close()
    return _enrich(policy)


def update_insurance_policy(policy_id: int, data: dict):
    session = SessionLocal()
    policy = session.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
    if not policy:
        session.close()
        return None
    for key in ("policy_type", "provider", "policy_number", "sum_insured",
                "premium_amount", "premium_frequency", "start_date", "end_date",
                "nominee", "notes", "active"):
        if key in data:
            value = _parse_date(data[key]) if key.endswith("_date") else data[key]
            setattr(policy, key, value)
    session.commit()
    session.refresh(policy)
    session.close()
    return _enrich(policy)


def delete_insurance_policy(policy_id: int):
    session = SessionLocal()
    policy = session.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
    if policy:
        session.delete(policy)
        session.commit()
    session.close()


FREQ_MULTIPLIER = {
    "monthly": 12,
    "quarterly": 4,
    "half_yearly": 2,
    "yearly": 1,
    "one_time": 0,
}


def get_insurance_summary():
    session = SessionLocal()
    policies = session.query(InsurancePolicy).all()
    session.close()

    by_type = {}
    total_annual_premium = 0
    total_cover = 0
    active_count = 0

    for p in policies:
        if not p.active:
            continue
        active_count += 1
        mult = FREQ_MULTIPLIER.get(p.premium_frequency, 1)
        total_annual_premium += (p.premium_amount or 0) * mult
        total_cover += p.sum_insured or 0
        t = p.policy_type
        if t not in by_type:
            by_type[t] = {"count": 0, "total_cover": 0}
        by_type[t]["count"] += 1
        by_type[t]["total_cover"] += p.sum_insured or 0

    return {
        "total_cover": total_cover,
        "total_annual_premium": round(total_annual_premium, 2),
        "active_policies": active_count,
        "by_type": by_type,
    }


def _enrich(p: InsurancePolicy):
    return {
        "id": p.id,
        "policy_type": p.policy_type,
        "provider": p.provider,
        "policy_number": p.policy_number,
        "sum_insured": p.sum_insured,
        "premium_amount": p.premium_amount,
        "premium_frequency": p.premium_frequency,
        "start_date": p.start_date.isoformat() if p.start_date else None,
        "end_date": p.end_date.isoformat() if p.end_date else None,
        "nominee": p.nominee,
        "notes": p.notes,
        "active": p.active,
    }
