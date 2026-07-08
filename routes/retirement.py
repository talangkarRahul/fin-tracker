from fastapi import APIRouter
from services.retirement import get_retirement_plan, update_retirement_plan
from routes.common import serialize

router = APIRouter()


@router.get("/api/retirement-plan")
def api_get_retirement_plan():
    return serialize(get_retirement_plan())


@router.put("/api/retirement-plan")
def api_update_retirement_plan(data: dict):
    return serialize(update_retirement_plan(data))
