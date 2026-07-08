from fastapi import APIRouter
from services.emergency_fund import (
    get_emergency_fund, update_emergency_fund, contribute_to_emergency_fund,
)
from routes.common import serialize

router = APIRouter()


@router.get("/api/emergency-fund")
def api_get_emergency_fund():
    return serialize(get_emergency_fund())


@router.put("/api/emergency-fund")
def api_update_emergency_fund(data: dict):
    return serialize(update_emergency_fund(data))


@router.post("/api/emergency-fund/contribute")
def api_contribute(data: dict):
    return serialize(contribute_to_emergency_fund(data["amount"]))
