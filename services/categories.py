from db import SessionLocal
from models import Transaction, CategoryRule
from sqlalchemy import func

GROUPS = ["NEEDS", "WANTS", "INVESTMENT", "NOT_APPLICABLE"]

DIRECT_GROUP_MAP = {
    "INVESTMENT": "INVESTMENT",
    "UTILITIES": "NEEDS",
    "RENT": "NEEDS",
    "LOAN_EMI": "NEEDS",
    "INSURANCE": "NEEDS",
    "HEALTHCARE": "NEEDS",
    "TAXES": "NEEDS",
    "FUEL": "NEEDS",
    "FEES_CHARGES": "NEEDS",
    "ENTERTAINMENT": "WANTS",
    "SUBSCRIPTION": "WANTS",
    "TRAVEL": "WANTS",
    "GIFTS_DONATIONS": "WANTS",
    "SALARY": "NOT_APPLICABLE",
    "INCOME": "NOT_APPLICABLE",
    "CASH_WITHDRAWAL": "NOT_APPLICABLE",
}


def assign_group(category: str | None, description: str = "") -> str | None:
    if not category:
        return None
    cat = category.upper().strip()
    if cat in DIRECT_GROUP_MAP:
        return DIRECT_GROUP_MAP[cat]
    desc_lower = description.lower()
    if cat == "FOOD":
        for kw in ["zomato", "swiggy", "kfc", "restaurant", "cafe", "hotel", "food delivery", "dining"]:
            if kw in desc_lower:
                return "WANTS"
        return "NEEDS"
    if cat == "SHOPPING":
        for kw in ["myntra", "ajio", "zudio", "meesho", "ikea", "fashion", "clothing"]:
            if kw in desc_lower:
                return "WANTS"
        return "WANTS"
    if cat == "TRANSPORT":
        for kw in ["ola", "uber", "rapido"]:
            if kw in desc_lower:
                return "WANTS"
        return "NEEDS"
    if cat == "PERSONAL_SERVICES":
        return "NEEDS"
    if cat == "PERSONAL_CARE":
        return "NEEDS"
    if cat == "EDUCATION":
        return "NEEDS"
    if cat == "TRANSFER":
        return "NOT_APPLICABLE"
    if cat == "OTHER":
        return None
    return None


def categorize(description):
    desc = description.lower()
    session = SessionLocal()
    rules = session.query(CategoryRule).all()
    session.close()

    for rule in rules:
        if rule.keyword.lower() in desc:
            return rule.category

    hardcoded = {
        "salary": "SALARY", "upi": "UPI", "amazon": "SHOPPING",
        "swiggy": "FOOD", "zomato": "FOOD", "sip": "INVESTMENT",
        "mf": "INVESTMENT", "mutual": "INVESTMENT", "electricity": "UTILITIES",
        "netflix": "SUBSCRIPTION", "insurance": "INSURANCE",
        "fuel": "TRANSPORT", "petrol": "TRANSPORT", "atm": "CASH",
    }
    for keyword, cat in hardcoded.items():
        if keyword in desc:
            return cat

    return "OTHER"


def get_unique_descriptions():
    session = SessionLocal()
    rules = session.query(CategoryRule).all()
    keywords = [r.keyword.lower() for r in rules]

    rows = (
        session.query(
            Transaction.description,
            func.count(Transaction.id),
        )
        .group_by(Transaction.description)
        .order_by(func.count(Transaction.id).desc())
        .all()
    )
    session.close()
    return [
        {"description": desc, "count": count}
        for desc, count in rows
        if desc and not any(k in desc.lower() for k in keywords)
    ]


def get_category_rules():
    session = SessionLocal()
    rules = session.query(CategoryRule).order_by(CategoryRule.keyword).all()
    session.close()
    return rules


def create_category_rule(keyword: str, category: str):
    from services.transactions import apply_category_to_transactions
    keyword = keyword.strip().lower()
    category = category.strip().upper()
    session = SessionLocal()
    existing = session.query(CategoryRule).filter(CategoryRule.keyword == keyword).first()
    if existing:
        existing.category = category
        session.commit()
        session.refresh(existing)
        session.close()
    else:
        rule = CategoryRule(keyword=keyword, category=category)
        session.add(rule)
        session.commit()
        session.refresh(rule)
        session.close()
    count = apply_category_to_transactions(keyword, category)
    return rule if not existing else existing, count


def delete_category_rule(rule_id: int):
    session = SessionLocal()
    rule = session.query(CategoryRule).filter(CategoryRule.id == rule_id).first()
    if rule:
        session.delete(rule)
        session.commit()
    session.close()


def get_uncategorized_descriptions():
    session = SessionLocal()
    rows = (
        session.query(
            Transaction.description,
            func.count(Transaction.id),
        )
        .filter(Transaction.category == "OTHER")
        .group_by(Transaction.description)
        .order_by(func.count(Transaction.id).desc())
        .all()
    )
    session.close()
    return [
        {"description": desc, "count": count}
        for desc, count in rows
        if desc
    ]


def bulk_categorize_by_description(mappings: list[dict]):
    session = SessionLocal()
    updated = 0
    rules_created = 0
    for item in mappings:
        desc = item["description"]
        category = item["category"].strip().upper()
        group = (item.get("group") or "").upper().strip() or None
        if not desc or not category:
            continue
        rows = (
            session.query(Transaction)
            .filter(Transaction.description == desc)
            .all()
        )
        for tx in rows:
            if tx.category != category or tx.group != group:
                tx.category = category
                tx.group = group or assign_group(category, tx.description or "")
                updated += 1
        keyword = desc.lower().strip()
        existing = session.query(CategoryRule).filter(CategoryRule.keyword == keyword).first()
        if not existing:
            rule = CategoryRule(keyword=keyword, category=category)
            session.add(rule)
            rules_created += 1
    session.commit()
    session.close()
    return updated, rules_created



