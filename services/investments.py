import pandas as pd
from db import SessionLocal
from models import Investment
from services.common import _parse_date
from services.transactions import safe_float

INVESTMENT_TYPES = [
    "mutual_fund", "stock", "fd", "ppf", "epf",
    "nps", "gold", "sgb", "bonds", "other",
]

# Mapping from investment_type to profile asset label
INVESTMENT_TO_ASSET_LABEL = {
    "mutual_fund": "Mutual Funds",
    "stock": "Stocks",
    "ppf": "PPF",
    "epf": "EPF",
    "nps": "NPS",
    "gold": "Gold / Jewelry",
    "sgb": "SGB",
    "bonds": "Bonds",
    "fd": "Fixed Deposit",
    "other": "Other Investments",
}


def get_investments():
    session = SessionLocal()
    items = session.query(Investment).order_by(Investment.purchase_date.desc()).all()
    session.close()
    return [_enrich(i) for i in items]


def get_investment(item_id: int):
    session = SessionLocal()
    item = session.query(Investment).filter(Investment.id == item_id).first()
    session.close()
    return _enrich(item) if item else None


def create_investment(data: dict):
    session = SessionLocal()
    item = Investment(
        investment_type=data.get("investment_type", "other"),
        name=data["name"],
        amount_invested=data.get("amount_invested", 0),
        current_value=data.get("current_value", 0),
        purchase_date=_parse_date(data.get("purchase_date")),
        sip_amount=data.get("sip_amount", 0),
        sip_frequency=data.get("sip_frequency"),
        notes=data.get("notes"),
        active=data.get("active", True),
        goal_id=data.get("goal_id"),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    session.close()
    return _enrich(item)


def update_investment(item_id: int, data: dict):
    session = SessionLocal()
    item = session.query(Investment).filter(Investment.id == item_id).first()
    if not item:
        session.close()
        return None
    for key in ("investment_type", "name", "amount_invested", "current_value",
                "purchase_date", "sip_amount", "sip_frequency", "notes", "active", "goal_id"):
        if key in data:
            value = _parse_date(data[key]) if key.endswith("_date") else data[key]
            setattr(item, key, value)
    session.commit()
    session.refresh(item)
    session.close()
    return _enrich(item)


def delete_investment(item_id: int):
    session = SessionLocal()
    item = session.query(Investment).filter(Investment.id == item_id).first()
    if item:
        session.delete(item)
        session.commit()
    session.close()


def get_investment_summary():
    session = SessionLocal()
    items = session.query(Investment).all()
    session.close()

    total_invested = 0
    total_current = 0
    by_type = {}

    for i in items:
        if not i.active:
            continue
        total_invested += i.amount_invested or 0
        total_current += i.current_value or 0
        t = i.investment_type
        if t not in by_type:
            by_type[t] = {"invested": 0, "current": 0, "count": 0}
        by_type[t]["invested"] += i.amount_invested or 0
        by_type[t]["current"] += i.current_value or 0
        by_type[t]["count"] += 1

    gain = round(total_current - total_invested, 2)
    gain_pct = round((gain / total_invested) * 100, 1) if total_invested > 0 else 0

    return {
        "total_invested": round(total_invested, 2),
        "total_current": round(total_current, 2),
        "gain": gain,
        "gain_pct": gain_pct,
        "active_count": sum(1 for i in items if i.active),
        "by_type": by_type,
    }


def import_investments_csv(file_path, mapping=None):
    df = pd.read_csv(file_path)

    col_map = {
        "name": "name",
        "investment_type": "investment_type",
        "amount_invested": "amount_invested",
        "current_value": "current_value",
        "purchase_date": "purchase_date",
        "sip_amount": "sip_amount",
        "sip_frequency": "sip_frequency",
        "notes": "notes",
        "active": "active",
    }
    if mapping:
        col_map.update(mapping)

    # Auto-detect columns by common names if not in mapping
    for alias, field in [
        ("name", "name"), ("scheme", "name"), ("fund", "name"),
        ("type", "investment_type"), ("invested", "amount_invested"),
        ("value", "current_value"), ("date", "purchase_date"),
        ("sip", "sip_amount"),
    ]:
        if col_map[field] not in df.columns:
            for col in df.columns:
                if alias in col.lower():
                    col_map[field] = col
                    break

    session = SessionLocal()
    count = 0

    for _, row in df.iterrows():
        name = str(row.get(col_map["name"], "")).strip()
        if not name:
            continue

        inv_type = str(row.get(col_map["investment_type"], "other")).strip().lower()
        if inv_type not in INVESTMENT_TYPES:
            inv_type = "other"

        amount_invested = safe_float(row.get(col_map["amount_invested"]))
        current_value = safe_float(row.get(col_map["current_value"]))

        raw_date = row.get(col_map["purchase_date"])
        purchase_date = None
        if raw_date:
            try:
                purchase_date = pd.to_datetime(raw_date, dayfirst=True).date()
            except Exception:
                try:
                    purchase_date = pd.to_datetime(raw_date).date()
                except Exception:
                    purchase_date = _parse_date(str(raw_date)) if raw_date else None

        sip_amount = safe_float(row.get(col_map["sip_amount"]))
        sip_frequency = str(row.get(col_map["sip_frequency"], "")).strip() or None
        notes = str(row.get(col_map["notes"], "")).strip() or None

        raw_active = row.get(col_map["active"])
        active = True
        if raw_active is not None:
            if isinstance(raw_active, bool):
                active = raw_active
            elif isinstance(raw_active, str):
                active = raw_active.strip().lower() in ("true", "yes", "1", "active", "y")

        item = Investment(
            investment_type=inv_type,
            name=name,
            amount_invested=amount_invested,
            current_value=current_value,
            purchase_date=purchase_date,
            sip_amount=sip_amount,
            sip_frequency=sip_frequency,
            notes=notes,
            active=active,
        )
        session.add(item)
        count += 1

    session.commit()
    session.close()
    return count


def get_investment_assets():
    """Aggregate active investments by type into asset label/value pairs."""
    session = SessionLocal()
    items = session.query(Investment).filter(Investment.active == True).all()
    session.close()

    totals: dict[str, float] = {}
    for i in items:
        label = INVESTMENT_TO_ASSET_LABEL.get(i.investment_type, i.investment_type.replace("_", " ").title())
        totals[label] = totals.get(label, 0) + (i.current_value or 0)

    return [{"label": k, "amount": round(v, 2)} for k, v in sorted(totals.items())]


def _enrich(i: Investment):
    gain = round((i.current_value or 0) - (i.amount_invested or 0), 2)
    gain_pct = round((gain / (i.amount_invested or 1)) * 100, 1)
    return {
        "id": i.id,
        "investment_type": i.investment_type,
        "name": i.name,
        "amount_invested": i.amount_invested,
        "current_value": i.current_value,
        "gain": gain,
        "gain_pct": gain_pct,
        "purchase_date": i.purchase_date.isoformat() if i.purchase_date else None,
        "sip_amount": i.sip_amount,
        "sip_frequency": i.sip_frequency,
        "notes": i.notes,
        "active": i.active,
        "goal_id": i.goal_id,
    }


def get_investments_by_goal(goal_id: int):
    session = SessionLocal()
    items = session.query(Investment).filter(Investment.goal_id == goal_id).order_by(Investment.purchase_date.desc()).all()
    session.close()
    return [_enrich(i) for i in items]
