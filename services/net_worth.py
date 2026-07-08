import json
from datetime import date
from db import SessionLocal
from models import NetWorthSnapshot, FinancialProfile, EmergencyFund


def get_net_worth():
    session = SessionLocal()
    profile = session.query(FinancialProfile).first()
    ef = session.query(EmergencyFund).first()

    assets_list = []
    liabilities_list = []

    if profile and profile.existing_assets:
        try:
            assets = json.loads(profile.existing_assets)
            for label, amount in assets.items():
                if amount:
                    assets_list.append({"label": label, "amount": round(amount, 2)})
        except (json.JSONDecodeError, TypeError):
            pass

    if profile and profile.existing_liabilities:
        try:
            liabilities = json.loads(profile.existing_liabilities)
            for label, amount in liabilities.items():
                if amount:
                    liabilities_list.append({"label": label, "amount": round(amount, 2)})
        except (json.JSONDecodeError, TypeError):
            pass

    if ef and ef.current_amount:
        assets_list.append({"label": "Emergency Fund", "amount": round(ef.current_amount, 2)})

    total_assets = round(sum(a["amount"] for a in assets_list), 2)
    total_liabilities = round(sum(l["amount"] for l in liabilities_list), 2)
    net = round(total_assets - total_liabilities, 2)

    today = date.today()
    existing = session.query(NetWorthSnapshot).filter(NetWorthSnapshot.date == today).first()
    if not existing:
        snapshot = NetWorthSnapshot(
            date=today,
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            net_worth=net,
            breakdown=json.dumps({"assets": assets_list, "liabilities": liabilities_list}),
        )
        session.add(snapshot)
        session.commit()

    history = (
        session.query(NetWorthSnapshot)
        .order_by(NetWorthSnapshot.date.asc())
        .all()
    )

    session.close()

    return {
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": net,
        "assets": assets_list,
        "liabilities": liabilities_list,
        "history": [
            {
                "date": h.date.isoformat(),
                "total_assets": h.total_assets,
                "total_liabilities": h.total_liabilities,
                "net_worth": h.net_worth,
            }
            for h in history
        ],
    }
