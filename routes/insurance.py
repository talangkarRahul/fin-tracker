from fastapi import APIRouter
from services.insurance import (
    get_insurance_policies, get_insurance_policy,
    create_insurance_policy, update_insurance_policy,
    delete_insurance_policy, get_insurance_summary,
)

router = APIRouter()


@router.get("/api/insurance")
def api_list_insurance():
    return get_insurance_policies()


@router.get("/api/insurance/summary")
def api_insurance_summary():
    return get_insurance_summary()


@router.get("/api/insurance/{policy_id}")
def api_get_insurance(policy_id: int):
    return get_insurance_policy(policy_id)


@router.post("/api/insurance")
def api_create_insurance(data: dict):
    return create_insurance_policy(data)


@router.put("/api/insurance/{policy_id}")
def api_update_insurance(policy_id: int, data: dict):
    return update_insurance_policy(policy_id, data)


@router.delete("/api/insurance/{policy_id}")
def api_delete_insurance(policy_id: int):
    delete_insurance_policy(policy_id)
    return {"status": "ok"}
