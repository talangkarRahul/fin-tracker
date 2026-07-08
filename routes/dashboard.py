from fastapi import APIRouter
from services import monthly_summary, expense_breakdown, savings_rate, _parse_date
from services.dashboard import get_dashboard_overview
from routes.common import serialize

router = APIRouter()


@router.get("/api/dashboard/overview")
def api_dashboard_overview(date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return serialize(get_dashboard_overview(df, dt))


@router.get("/api/summary")
def api_summary(date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return serialize(monthly_summary(df, dt))


@router.get("/api/expense-breakdown")
def api_expense_breakdown(date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return serialize(expense_breakdown(df, dt))


@router.get("/api/savings-rate")
def api_savings_rate(date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return {"rate": savings_rate(df, dt)}
