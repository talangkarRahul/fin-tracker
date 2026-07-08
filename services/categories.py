from db import SessionLocal
from models import Transaction, CategoryRule
from sqlalchemy import func


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
        if not desc or not category:
            continue
        rows = (
            session.query(Transaction)
            .filter(Transaction.description == desc)
            .all()
        )
        for tx in rows:
            if tx.category != category:
                tx.category = category
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
