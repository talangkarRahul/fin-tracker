# services.py
from datetime import date, timedelta
from db import SessionLocal
from models import Transaction, Goal, Budget, RecurringTransaction, CategoryRule, DashboardNote
from sqlalchemy import func
import pandas as pd


def _parse_date(value):
    if value is None or isinstance(value, date):
        return value
    return date.fromisoformat(value)


def get_transactions():
    session = SessionLocal()

    rows = (
        session.query(Transaction)
        .order_by(Transaction.date.desc())
        .all()
    )

    return rows

def create_transaction(data: dict):
    session = SessionLocal()
    cat = categorize(data.get("description", ""))
    raw_amount = float(data["amount"])
    tx_type = data.get("transaction_type", "expense" if raw_amount < 0 else "income")
    if tx_type in ("debit", "expense") and raw_amount > 0:
        raw_amount = -raw_amount
    elif tx_type in ("credit", "income") and raw_amount < 0:
        raw_amount = -raw_amount
    tx = Transaction(
        date=_parse_date(data["date"]),
        description=data.get("description"),
        amount=raw_amount,
        transaction_type=tx_type,
        category=data.get("category") or cat,
        balance=data.get("balance"),
    )
    session.add(tx)
    session.commit()
    session.refresh(tx)
    session.close()
    return tx


def delete_transaction(tx_id: int):
    session = SessionLocal()
    tx = session.query(Transaction).filter(Transaction.id == tx_id).first()
    if tx:
        session.delete(tx)
        session.commit()
    session.close()


def update_transaction(tx_id: int, data: dict):
    session = SessionLocal()
    tx = session.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        session.close()
        return None
    for key in ("date", "description", "amount", "transaction_type", "category", "balance"):
        if key in data:
            if key == "date":
                setattr(tx, key, _parse_date(data[key]))
            else:
                setattr(tx, key, data[key])
    if "amount" in data or "transaction_type" in data:
        raw_amount = tx.amount
        if tx.transaction_type in ("debit", "expense") and raw_amount > 0:
            tx.amount = -raw_amount
        elif tx.transaction_type in ("credit", "income") and raw_amount < 0:
            tx.amount = -raw_amount
    session.commit()
    session.refresh(tx)
    session.close()
    return tx


def _date_filter(query, date_from=None, date_to=None):
    if date_from:
        query = query.filter(Transaction.date >= date_from)
    if date_to:
        query = query.filter(Transaction.date <= date_to)
    return query


def monthly_summary(date_from=None, date_to=None):
    session = SessionLocal()

    base = session.query(func.sum(Transaction.amount))
    if date_from or date_to:
        base = _date_filter(base, date_from, date_to)

    income = (
        base.filter(Transaction.amount > 0)
        .scalar()
        or 0
    )

    base2 = session.query(func.sum(Transaction.amount))
    if date_from or date_to:
        base2 = _date_filter(base2, date_from, date_to)

    expenses = (
        base2.filter(Transaction.amount < 0)
        .scalar()
        or 0
    )

    savings = income + expenses

    return {
        "income": income,
        "expenses": abs(expenses),
        "savings": savings,
    }


def expense_breakdown(date_from=None, date_to=None):
    session = SessionLocal()

    query = (
        session.query(
            Transaction.category,
            func.sum(Transaction.amount)
        )
        .filter(Transaction.amount < 0)
    )
    if date_from or date_to:
        query = _date_filter(query, date_from, date_to)
    rows = query.group_by(Transaction.category).all()

    return {
        category: abs(amount)
        for category, amount in rows
    }


def savings_rate(date_from=None, date_to=None):
    summary = monthly_summary(date_from, date_to)

    income = summary["income"]
    savings = summary["savings"]

    if income == 0:
        return 0

    return round((savings / income) * 100, 2)



# ── Goals ─────────────────────────────────────────────

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
                "target_date", "category", "notes", "achieved"):
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


def get_goal_progress(goal_id: int):
    goal = get_goal(goal_id)
    if not goal:
        return None
    return goal["progress"]


def _enrich_goal(goal: Goal):
    pct = round((goal.current_amount / goal.target_amount) * 100, 1) if goal.target_amount else 0
    remaining = max(goal.target_amount - goal.current_amount, 0)
    days_left = (goal.target_date - date.today()).days if goal.target_date else None
    on_track = _compute_on_track(goal)
    return {
        "id": goal.id,
        "name": goal.name,
        "goal_type": goal.goal_type,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount,
        "target_date": goal.target_date,
        "category": goal.category,
        "notes": goal.notes,
        "achieved": goal.achieved,
        "progress": {
            "pct": min(pct, 100),
            "remaining": remaining,
            "days_left": days_left,
            "on_track": on_track,
        },
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


# ── Budgets ────────────────────────────────────────────


def get_budgets():
    session = SessionLocal()
    budgets = session.query(Budget).all()
    session.close()
    return [_enrich_budget(b) for b in budgets]


def get_budget(budget_id: int):
    session = SessionLocal()
    budget = session.query(Budget).filter(Budget.id == budget_id).first()
    session.close()
    return _enrich_budget(budget) if budget else None


def create_budget(data: dict):
    session = SessionLocal()
    budget = Budget(
        category=data["category"],
        period=data.get("period", "monthly"),
        limit_amount=data["limit_amount"],
        start_date=_parse_date(data["start_date"]),
        end_date=_parse_date(data.get("end_date")),
    )
    session.add(budget)
    session.commit()
    session.refresh(budget)
    session.close()
    return budget


def update_budget(budget_id: int, data: dict):
    session = SessionLocal()
    budget = session.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        session.close()
        return None
    for key in ("category", "period", "limit_amount", "start_date", "end_date"):
        if key in data:
            value = _parse_date(data[key]) if key.endswith("_date") else data[key]
            setattr(budget, key, value)
    session.commit()
    session.refresh(budget)
    session.close()
    return budget


def delete_budget(budget_id: int):
    session = SessionLocal()
    budget = session.query(Budget).filter(Budget.id == budget_id).first()
    if budget:
        session.delete(budget)
        session.commit()
    session.close()


def _enrich_budget(budget: Budget):
    session = SessionLocal()
    today = date.today()

    if budget.period == "monthly":
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(year=today.year + 1, month=1, day=1)
        else:
            end = today.replace(month=today.month + 1, day=1)
    else:
        start = today.replace(month=1, day=1)
        end = today.replace(year=today.year + 1, month=1, day=1)

    spent_raw = (
        session.query(func.abs(func.sum(Transaction.amount)))
        .filter(
            Transaction.amount < 0,
            Transaction.category == budget.category,
            Transaction.date >= start,
            Transaction.date < end,
        )
        .scalar()
        or 0
    )

    session.close()

    pct = round((spent_raw / budget.limit_amount) * 100, 1) if budget.limit_amount else 0
    remaining = max(budget.limit_amount - spent_raw, 0)

    alert = None
    if pct >= 100:
        alert = "exceeded"
    elif pct >= 80:
        alert = "warning"

    return {
        "id": budget.id,
        "category": budget.category,
        "period": budget.period,
        "limit_amount": budget.limit_amount,
        "start_date": budget.start_date,
        "end_date": budget.end_date,
        "spent": spent_raw,
        "remaining": remaining,
        "pct": min(pct, 100),
        "alert": alert,
    }


# ── Recurring Transactions ─────────────────────────────


def get_recurring():
    session = SessionLocal()
    items = (
        session.query(RecurringTransaction)
        .order_by(RecurringTransaction.next_run)
        .all()
    )
    session.close()
    return items


def get_recurring_item(item_id: int):
    session = SessionLocal()
    item = (
        session.query(RecurringTransaction)
        .filter(RecurringTransaction.id == item_id)
        .first()
    )
    session.close()
    return item


def create_recurring(data: dict):
    session = SessionLocal()
    item = RecurringTransaction(
        description=data["description"],
        category=data.get("category"),
        amount=data["amount"],
        frequency=data["frequency"],
        interval=data.get("interval", 1),
        next_run=_parse_date(data["next_run"]),
        end_date=_parse_date(data.get("end_date")),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    session.close()
    return item


def update_recurring(item_id: int, data: dict):
    session = SessionLocal()
    item = (
        session.query(RecurringTransaction)
        .filter(RecurringTransaction.id == item_id)
        .first()
    )
    if not item:
        session.close()
        return None
    for key in ("description", "category", "amount", "frequency",
                "interval", "next_run", "end_date", "active", "last_run"):
        if key in data:
            value = _parse_date(data[key]) if key in ("next_run", "end_date", "last_run") else data[key]
            setattr(item, key, value)
    session.commit()
    session.refresh(item)
    session.close()
    return item


def delete_recurring(item_id: int):
    session = SessionLocal()
    item = (
        session.query(RecurringTransaction)
        .filter(RecurringTransaction.id == item_id)
        .first()
    )
    if item:
        session.delete(item)
        session.commit()
    session.close()


def _compute_next_run(item: RecurringTransaction, from_date: date) -> date:
    if item.frequency == "daily":
        return from_date + timedelta(days=item.interval)
    elif item.frequency == "weekly":
        return from_date + timedelta(weeks=item.interval)
    elif item.frequency == "monthly":
        month = from_date.month - 1 + item.interval
        year = from_date.year + month // 12
        month = month % 12 + 1
        day = min(from_date.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                                   31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
        return date(year, month, day)
    elif item.frequency == "yearly":
        return date(from_date.year + item.interval, from_date.month, from_date.day)
    return from_date


def process_due_recurring():
    session = SessionLocal()
    today = date.today()
    due = (
        session.query(RecurringTransaction)
        .filter(
            RecurringTransaction.active == True,
            RecurringTransaction.next_run <= today,
        )
        .all()
    )
    created = 0
    for item in due:
        if item.end_date and today > item.end_date:
            item.active = False
            session.commit()
            continue

        tx_type = "INCOME" if item.amount > 0 else "EXPENSE"
        tx = Transaction(
            date=today,
            description=item.description,
            amount=item.amount,
            transaction_type=tx_type,
            category=item.category,
        )
        session.add(tx)
        item.last_run = today
        item.next_run = _compute_next_run(item, today)
        created += 1

    session.commit()
    session.close()
    return created


# ── Transactions ──────────────────────────────────────


def safe_float(value):
    if pd.isna(value):
        return 0.0

    value = str(value).replace(",", "").strip()

    if value == "":
        return 0.0

    return float(value)


def import_csv_generic(file_path, mapping):
    df = pd.read_csv(file_path)
    date_col = mapping.get("date_column")
    desc_col = mapping.get("description_column")
    amount_col = mapping.get("amount_column")
    debit_col = mapping.get("debit_column")
    credit_col = mapping.get("credit_column")
    balance_col = mapping.get("balance_column")
    date_format = mapping.get("date_format", "dayfirst")
    date_col_fallback = mapping.get("date_column_fallback")

    session = SessionLocal()
    count = 0

    for _, row in df.iterrows():
        date_val = None
        for col in [date_col, date_col_fallback]:
            if col and col in row:
                try:
                    date_val = pd.to_datetime(
                        row[col], dayfirst=(date_format == "dayfirst")
                    ).date()
                    break
                except Exception:
                    continue
        if date_val is None:
            continue

        desc = str(row.get(desc_col, "")).strip() if desc_col else ""

        if amount_col and amount_col in row:
            raw = safe_float(row.get(amount_col))
            if raw < 0:
                amount = raw
                tx_type = "expense"
            else:
                amount = raw
                tx_type = "income"
        elif debit_col and credit_col:
            debit = safe_float(row.get(debit_col))
            credit = safe_float(row.get(credit_col))
            if credit > 0:
                amount = credit
                tx_type = "income"
            else:
                amount = -debit
                tx_type = "expense"
        else:
            continue

        balance = (
            safe_float(row.get(balance_col)) if balance_col and balance_col in row else None
        )

        tx = Transaction(
            date=date_val,
            description=desc,
            amount=amount,
            balance=balance,
            transaction_type=tx_type,
            category=categorize(desc),
        )
        session.add(tx)
        count += 1

    session.commit()
    session.close()
    return count


def import_icici_csv(file_path):
    df = pd.read_csv(file_path)

    session = SessionLocal()

    for _, row in df.iterrows():
        withdrawal = safe_float(
            row.get("Withdrawal Amount(INR)")
        )
        deposit = safe_float(
            row.get("Deposit Amount(INR)")
        )
        balance = safe_float(
            row.get("Balance(INR)")
        )

        if deposit > 0:
            amount = deposit
            tx_type = "INCOME"
        else:
            amount = -withdrawal
            tx_type = "EXPENSE"

        tx = Transaction(
            date=pd.to_datetime(
                row["Transaction Date"],
                dayfirst=True,
            ).date(),
            description=str(
                row["Transaction Remarks"]
            ).strip(),
            amount=amount,
            balance=balance,
            transaction_type=tx_type,
            category=categorize(
                str(row["Transaction Remarks"])
            ),
        )

        session.add(tx)

    session.commit()
    session.close()


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


def apply_category_to_transactions(keyword: str, category: str):
    session = SessionLocal()
    like_pattern = f"%{keyword}%"
    rows = (
        session.query(Transaction)
        .filter(Transaction.description.ilike(like_pattern))
        .all()
    )
    count = 0
    for tx in rows:
        if tx.category != category:
            tx.category = category
            count += 1
    session.commit()
    session.close()
    return count


def get_category_rules():
    session = SessionLocal()
    rules = session.query(CategoryRule).order_by(CategoryRule.keyword).all()
    session.close()
    return rules


def create_category_rule(keyword: str, category: str):
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


# ── Reports ────────────────────────────────────────────


def report_monthly(months: int = 12, date_from=None, date_to=None):
    session = SessionLocal()
    today = date.today()
    rows = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m < 1:
            m += 12
            y -= 1
        start = date(y, m, 1)
        if m == 12:
            end = date(y + 1, 1, 1)
        else:
            end = date(y, m + 1, 1)

        range_start = max(start, date_from) if date_from else start
        range_end = min(end, date_to) if date_to else end
        if range_start >= range_end:
            continue

        income = (
            session.query(func.abs(func.sum(Transaction.amount)))
            .filter(Transaction.amount > 0, Transaction.date >= range_start, Transaction.date < range_end)
            .scalar()
            or 0
        )
        expenses = (
            session.query(func.abs(func.sum(Transaction.amount)))
            .filter(Transaction.amount < 0, Transaction.date >= range_start, Transaction.date < range_end)
            .scalar()
            or 0
        )
        savings = income - expenses
        rate = round((savings / income) * 100, 1) if income else 0
        rows.append({
            "month": f"{y}-{m:02d}",
            "income": income,
            "expenses": expenses,
            "savings": savings,
            "savings_rate": rate,
        })
    session.close()
    return rows


def _month_bounds(year: int, month: int):
    start = date(year, month, 1)
    if month == 12:
        return start, date(year + 1, 1, 1)
    return start, date(year, month + 1, 1)


def _latest_month_with_data(session):
    row = (
        session.query(Transaction.date)
        .filter(Transaction.amount < 0)
        .order_by(Transaction.date.desc())
        .first()
    )
    if not row:
        return date.today().year, date.today().month
    return row[0].year, row[0].month


def report_category(month_str: str = None, date_from=None, date_to=None):
    session = SessionLocal()
    if month_str:
        y, m = map(int, month_str.split("-"))
        start, end = _month_bounds(y, m)
    else:
        if date_from:
            start = date_from
            end = date_to + timedelta(days=1) if date_to else date.today() + timedelta(days=1)
        else:
            y, m = _latest_month_with_data(session)
            start, end = _month_bounds(y, m)

    query = session.query(
        Transaction.category,
        func.abs(func.sum(Transaction.amount)),
    ).filter(Transaction.amount < 0)
    query = query.filter(Transaction.date >= start)
    if end:
        query = query.filter(Transaction.date < end)
    rows = (
        query.group_by(Transaction.category)
        .order_by(func.abs(func.sum(Transaction.amount)).desc())
        .all()
    )
    total = sum(amount for _, amount in rows)
    session.close()
    return [
        {"category": cat, "amount": amt, "pct": round((amt / total) * 100, 1) if total else 0}
        for cat, amt in rows
    ]


def report_trends(months: int = 6, categories: list[str] = None, date_from=None, date_to=None):
    session = SessionLocal()
    if date_from and date_to:
        months_list = []
        y, m = date_from.year, date_from.month
        while date(y, m, 1) <= date_to:
            months_list.append((y, m))
            m += 1
            if m > 12:
                m = 1
                y += 1
    else:
        today = date.today()
        months_list = []
        for i in range(months - 1, -1, -1):
            m = today.month - i
            y = today.year
            while m < 1:
                m += 12
                y -= 1
            months_list.append((y, m))

    rows = []
    for y, m in months_list:
        start = date(y, m, 1)
        if m == 12:
            end = date(y + 1, 1, 1)
        else:
            end = date(y, m + 1, 1)

        range_start = max(start, date_from) if date_from else start
        range_end = min(end, date_to) if date_to else end
        if range_start >= range_end:
            continue

        query = session.query(
            Transaction.category,
            func.abs(func.sum(Transaction.amount)),
        ).filter(
            Transaction.amount < 0,
            Transaction.date >= range_start,
            Transaction.date < range_end,
        )
        if categories:
            query = query.filter(Transaction.category.in_(categories))
        query = query.group_by(Transaction.category)

        for cat, amt in query.all():
            rows.append({
                "month": f"{y}-{m:02d}",
                "category": cat,
                "amount": amt,
            })
    session.close()
    return rows


def report_budget_vs_actual(date_from=None, date_to=None):
    session = SessionLocal()
    today = date_to or date.today()
    period_start = date_from or today.replace(day=1)
    period_end = date_to + timedelta(days=1) if date_to else (
        today.replace(year=today.year + 1, month=1, day=1) if today.month == 12
        else today.replace(month=today.month + 1, day=1)
    )

    budgets = session.query(Budget).all()

    results = []
    for budget in budgets:
        spent = (
            session.query(func.abs(func.sum(Transaction.amount)))
            .filter(
                Transaction.amount < 0,
                Transaction.category == budget.category,
                Transaction.date >= period_start,
                Transaction.date < period_end,
            )
            .scalar()
            or 0
        )
        pct = round((spent / budget.limit_amount) * 100, 1) if budget.limit_amount else 0
        results.append({
            "category": budget.category,
            "limit": budget.limit_amount,
            "spent": spent,
            "remaining": max(budget.limit_amount - spent, 0),
            "pct": min(pct, 100),
        })

    session.close()
    return results


def get_dashboard_note():
    session = SessionLocal()
    note = session.query(DashboardNote).first()
    if not note:
        note = DashboardNote(content="")
        session.add(note)
        session.commit()
        session.refresh(note)
    session.close()
    return note


def set_dashboard_note(content: str):
    session = SessionLocal()
    note = session.query(DashboardNote).first()
    if not note:
        note = DashboardNote(content=content)
        session.add(note)
    else:
        note.content = content
    session.commit()
    session.refresh(note)
    session.close()
    return note