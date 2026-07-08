# app.py
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from services import process_due_recurring

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    process_due_recurring()
    yield


app = FastAPI(lifespan=lifespan)


from routes.dashboard import router as dashboard_router
from routes.transactions import router as transactions_router
from routes.goals import router as goals_router
from routes.budgets import router as budgets_router
from routes.recurring import router as recurring_router
from routes.reports import router as reports_router
from routes.categories import router as categories_router
from routes.dashboard_note import router as dashboard_note_router
from routes.profile import router as profile_router
from routes.emergency_fund import router as emergency_fund_router
from routes.net_worth import router as net_worth_router
from routes.health_score import router as health_score_router
from routes.insurance import router as insurance_router
from routes.investments import router as investments_router
from routes.retirement import router as retirement_router

app.include_router(dashboard_router)
app.include_router(transactions_router)
app.include_router(goals_router)
app.include_router(budgets_router)
app.include_router(recurring_router)
app.include_router(reports_router)
app.include_router(categories_router)
app.include_router(dashboard_note_router)
app.include_router(profile_router)
app.include_router(emergency_fund_router)
app.include_router(net_worth_router)
app.include_router(health_score_router)
app.include_router(insurance_router)
app.include_router(investments_router)
app.include_router(retirement_router)
