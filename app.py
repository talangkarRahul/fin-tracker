# app.py
import os
from datetime import date
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form
from services import (
    monthly_summary,
    expense_breakdown,
    get_transactions,
    create_transaction,
    update_transaction,
    delete_transaction,
    savings_rate,
    _parse_date,
    import_icici_csv,
    import_csv_generic,
    get_goals,
    get_goal,
    create_goal,
    update_goal,
    delete_goal,
    contribute_to_goal,
    get_budgets,
    get_budget,
    create_budget,
    update_budget,
    delete_budget,
    get_recurring,
    get_recurring_item,
    create_recurring,
    update_recurring,
    delete_recurring,
    process_due_recurring,
    report_monthly,
    report_category,
    report_trends,
    report_budget_vs_actual,
    get_category_rules,
    create_category_rule,
    delete_category_rule,
    apply_category_to_transactions,
    get_unique_descriptions,
    get_dashboard_note,
    set_dashboard_note,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    process_due_recurring()
    yield


app = FastAPI(lifespan=lifespan)


def _serialize(obj):
    if obj is None:
        return None
    if hasattr(obj, "__table__"):
        d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
        for k, v in d.items():
            if isinstance(v, date):
                d[k] = v.isoformat()
        return d
    if isinstance(obj, list):
        return [_serialize(item) for item in obj]
    if isinstance(obj, dict):
        return {k: v.isoformat() if isinstance(v, date) else v for k, v in obj.items()}
    return obj


# ── Dashboard ──

@app.get("/api/summary")
def api_summary(date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return _serialize(monthly_summary(df, dt))


@app.get("/api/expense-breakdown")
def api_expense_breakdown(date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return _serialize(expense_breakdown(df, dt))


@app.get("/api/savings-rate")
def api_savings_rate(date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return {"rate": savings_rate(df, dt)}


# ── Transactions ──

@app.get("/api/transactions")
def api_get_transactions():
    return _serialize(get_transactions())


@app.post("/api/transactions")
def api_create_transaction(data: dict):
    return _serialize(create_transaction(data))


@app.put("/api/transactions/{tx_id}")
def api_update_transaction(tx_id: int, data: dict):
    return _serialize(update_transaction(tx_id, data))


@app.delete("/api/transactions/{tx_id}")
def api_delete_transaction(tx_id: int):
    delete_transaction(tx_id)
    return {"status": "ok"}


@app.post("/api/import")
async def api_import_statement(file: UploadFile = File(...), mapping: str = Form("")):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())

    if mapping:
        import json
        mapping_dict = json.loads(mapping)
        count = import_csv_generic(file_path, mapping_dict)
        return {"status": "ok", "file": file.filename, "imported": count}
    else:
        import_icici_csv(file_path)
        return {"status": "ok", "file": file.filename}


# ── Goals ──

@app.get("/api/goals")
def api_get_goals():
    return _serialize(get_goals())


@app.get("/api/goals/{goal_id}")
def api_get_goal(goal_id: int):
    return _serialize(get_goal(goal_id))


@app.post("/api/goals")
def api_create_goal(data: dict):
    goal = create_goal(data)
    return _serialize(get_goal(goal.id))


@app.put("/api/goals/{goal_id}")
def api_update_goal(goal_id: int, data: dict):
    return _serialize(update_goal(goal_id, data))


@app.delete("/api/goals/{goal_id}")
def api_delete_goal(goal_id: int):
    delete_goal(goal_id)
    return {"status": "ok"}


@app.post("/api/goals/{goal_id}/contribute")
def api_contribute_to_goal(goal_id: int, data: dict):
    return _serialize(contribute_to_goal(goal_id, data["amount"]))


# ── Budgets ──

@app.get("/api/budgets")
def api_get_budgets():
    return _serialize(get_budgets())


@app.get("/api/budgets/{budget_id}")
def api_get_budget(budget_id: int):
    return _serialize(get_budget(budget_id))


@app.post("/api/budgets")
def api_create_budget(data: dict):
    return _serialize(create_budget(data))


@app.put("/api/budgets/{budget_id}")
def api_update_budget(budget_id: int, data: dict):
    return _serialize(update_budget(budget_id, data))


@app.delete("/api/budgets/{budget_id}")
def api_delete_budget(budget_id: int):
    delete_budget(budget_id)
    return {"status": "ok"}


# ── Recurring ──

@app.get("/api/recurring")
def api_get_recurring():
    return _serialize(get_recurring())


@app.get("/api/recurring/{item_id}")
def api_get_recurring_item(item_id: int):
    return _serialize(get_recurring_item(item_id))


@app.post("/api/recurring")
def api_create_recurring(data: dict):
    return _serialize(create_recurring(data))


@app.put("/api/recurring/{item_id}")
def api_update_recurring(item_id: int, data: dict):
    return _serialize(update_recurring(item_id, data))


@app.delete("/api/recurring/{item_id}")
def api_delete_recurring(item_id: int):
    delete_recurring(item_id)
    return {"status": "ok"}


@app.post("/api/recurring/{item_id}/toggle")
def api_toggle_recurring(item_id: int):
    item = get_recurring_item(item_id)
    if item:
        update_recurring(item_id, {"active": not item.active})
    return {"status": "ok"}


@app.post("/api/recurring/process")
def api_process_recurring():
    count = process_due_recurring()
    return {"processed": count}


# ── Reports ──

@app.get("/api/reports/monthly")
def api_report_monthly(months: int = 12, date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return _serialize(report_monthly(months, df, dt))


@app.get("/api/reports/category")
def api_report_category_api(month: str = None, date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return _serialize(report_category(month, df, dt))


@app.get("/api/reports/trends")
def api_report_trends(months: int = 6, categories: str = None, date_from: str = None, date_to: str = None):
    cat_list = categories.split(",") if categories else None
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return _serialize(report_trends(months, cat_list, df, dt))


@app.get("/api/reports/budget-vs-actual")
def api_report_budget_vs_actual(date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return _serialize(report_budget_vs_actual(df, dt))


# ── Category Rules ──

@app.get("/api/category-rules")
def api_get_category_rules():
    return _serialize(get_category_rules())


@app.post("/api/category-rules")
def api_create_category_rule(data: dict):
    rule, count = create_category_rule(data["keyword"], data["category"])
    return {**_serialize(rule), "updated_count": count}


@app.delete("/api/category-rules/{rule_id}")
def api_delete_category_rule(rule_id: int):
    delete_category_rule(rule_id)
    return {"status": "ok"}


@app.get("/api/descriptions")
def api_get_descriptions():
    return _serialize(get_unique_descriptions())


# ── Dashboard Note ──

@app.get("/api/dashboard-note")
def api_get_dashboard_note():
    return _serialize(get_dashboard_note())


@app.put("/api/dashboard-note")
def api_set_dashboard_note(data: dict):
    return _serialize(set_dashboard_note(data.get("content", "")))