from fastapi import APIRouter
from services import get_dashboard_note, set_dashboard_note
from routes.common import serialize

router = APIRouter()


@router.get("/api/dashboard-note")
def api_get_dashboard_note():
    return serialize(get_dashboard_note())


@router.put("/api/dashboard-note")
def api_set_dashboard_note(data: dict):
    return serialize(set_dashboard_note(data.get("content", "")))
