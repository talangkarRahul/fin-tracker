from services.reports import monthly_summary, expense_breakdown, savings_rate
from services.goals import get_goals
from services.budgets import get_budgets
from services.emergency_fund import get_emergency_fund
from services.health_score import compute_health_score
from services.net_worth import get_net_worth
from services.retirement import get_retirement_plan
from services.investments import get_investment_summary
from services.insurance import get_insurance_summary


def get_dashboard_overview(date_from=None, date_to=None):
    return {
        "summary": monthly_summary(date_from, date_to),
        "net_worth": get_net_worth(),
        "health_score": compute_health_score(),
        "emergency_fund": get_emergency_fund(),
        "retirement": get_retirement_plan(),
        "investments": get_investment_summary(),
        "insurance": get_insurance_summary(),
        "goals": get_goals(),
        "budgets": get_budgets(),
        "expense_breakdown": expense_breakdown(date_from, date_to),
        "savings_rate": {"rate": savings_rate(date_from, date_to)},
    }
