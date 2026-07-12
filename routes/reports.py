from fastapi import APIRouter
from services import report_monthly, report_category, report_trends, report_budget_vs_actual, report_group, _parse_date
from routes.common import serialize

router = APIRouter()


@router.get("/api/reports/monthly")
def api_report_monthly(months: int = 12, date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return serialize(report_monthly(months, df, dt))


@router.get("/api/reports/category")
def api_report_category_api(month: str = None, date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return serialize(report_category(month, df, dt))


@router.get("/api/reports/trends")
def api_report_trends(months: int = 6, categories: str = None, date_from: str = None, date_to: str = None):
    cat_list = categories.split(",") if categories else None
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return serialize(report_trends(months, cat_list, df, dt))


@router.get("/api/reports/budget-vs-actual")
def api_report_budget_vs_actual(date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return serialize(report_budget_vs_actual(df, dt))


@router.get("/api/reports/group")
def api_report_group(month: str = None, date_from: str = None, date_to: str = None):
    df = _parse_date(date_from) if date_from else None
    dt = _parse_date(date_to) if date_to else None
    return serialize(report_group(month, df, dt))
