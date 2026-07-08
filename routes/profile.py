import json
from fastapi import APIRouter
from services import get_financial_profile, update_financial_profile
from routes.common import serialize

router = APIRouter()


@router.get("/api/financial-profile")
def api_get_financial_profile():
    profile = get_financial_profile()
    d = serialize(profile)
    if isinstance(d.get("existing_assets"), str):
        d["existing_assets"] = json.loads(d["existing_assets"])
    if isinstance(d.get("existing_liabilities"), str):
        d["existing_liabilities"] = json.loads(d["existing_liabilities"])
    return d


@router.put("/api/financial-profile")
def api_update_financial_profile(data: dict):
    return serialize(update_financial_profile(data))
