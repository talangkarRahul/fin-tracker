from fastapi import APIRouter
from services import (
    get_recurring, get_recurring_item, create_recurring, update_recurring,
    delete_recurring, process_due_recurring,
)
from routes.common import serialize

router = APIRouter()


@router.get("/api/recurring")
def api_get_recurring():
    return serialize(get_recurring())


@router.get("/api/recurring/{item_id}")
def api_get_recurring_item(item_id: int):
    return serialize(get_recurring_item(item_id))


@router.post("/api/recurring")
def api_create_recurring(data: dict):
    return serialize(create_recurring(data))


@router.put("/api/recurring/{item_id}")
def api_update_recurring(item_id: int, data: dict):
    return serialize(update_recurring(item_id, data))


@router.delete("/api/recurring/{item_id}")
def api_delete_recurring(item_id: int):
    delete_recurring(item_id)
    return {"status": "ok"}


@router.post("/api/recurring/{item_id}/toggle")
def api_toggle_recurring(item_id: int):
    item = get_recurring_item(item_id)
    if item:
        update_recurring(item_id, {"active": not item.active})
    return {"status": "ok"}


@router.post("/api/recurring/process")
def api_process_recurring():
    count = process_due_recurring()
    return {"processed": count}
