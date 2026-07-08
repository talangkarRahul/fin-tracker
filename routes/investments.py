from fastapi import APIRouter
from services.investments import (
    get_investments, get_investment, create_investment,
    update_investment, delete_investment, get_investment_summary,
)

router = APIRouter()


@router.get("/api/investments")
def api_list_investments():
    return get_investments()


@router.get("/api/investments/summary")
def api_investment_summary():
    return get_investment_summary()


@router.get("/api/investments/{item_id}")
def api_get_investment(item_id: int):
    return get_investment(item_id)


@router.post("/api/investments")
def api_create_investment(data: dict):
    return create_investment(data)


@router.put("/api/investments/{item_id}")
def api_update_investment(item_id: int, data: dict):
    return update_investment(item_id, data)


@router.delete("/api/investments/{item_id}")
def api_delete_investment(item_id: int):
    delete_investment(item_id)
    return {"status": "ok"}
