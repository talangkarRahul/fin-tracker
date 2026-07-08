from fastapi import APIRouter
from services.net_worth import get_net_worth

router = APIRouter()


@router.get("/api/net-worth")
def api_get_net_worth():
    return get_net_worth()
