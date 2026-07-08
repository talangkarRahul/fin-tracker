from fastapi import APIRouter
from services import get_budgets, get_budget, create_budget, update_budget, delete_budget
from routes.common import serialize

router = APIRouter()


@router.get("/api/budgets")
def api_get_budgets():
    return serialize(get_budgets())


@router.get("/api/budgets/{budget_id}")
def api_get_budget(budget_id: int):
    return serialize(get_budget(budget_id))


@router.post("/api/budgets")
def api_create_budget(data: dict):
    return serialize(create_budget(data))


@router.put("/api/budgets/{budget_id}")
def api_update_budget(budget_id: int, data: dict):
    return serialize(update_budget(budget_id, data))


@router.delete("/api/budgets/{budget_id}")
def api_delete_budget(budget_id: int):
    delete_budget(budget_id)
    return {"status": "ok"}
