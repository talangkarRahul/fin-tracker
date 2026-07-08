from fastapi import APIRouter, Query
from services import get_goals, get_goal, create_goal, update_goal, delete_goal, contribute_to_goal
from services.goals import calculate_sip, inflation_adjusted_target
from routes.common import serialize

router = APIRouter()


@router.get("/api/goals/calculator")
def api_goal_calculator(
    target_amount: float = Query(...),
    months: int = Query(...),
    current_amount: float = Query(0),
    expected_return: float = Query(8.0),
    inflation_rate: float = Query(6.0),
):
    return serialize({
        "monthly_sip": calculate_sip(target_amount, months, current_amount, expected_return),
        "inflation_adjusted_target": inflation_adjusted_target(target_amount, months, inflation_rate),
    })


@router.get("/api/goals")
def api_get_goals():
    return serialize(get_goals())


@router.get("/api/goals/{goal_id}")
def api_get_goal(goal_id: int):
    return serialize(get_goal(goal_id))


@router.post("/api/goals")
def api_create_goal(data: dict):
    goal = create_goal(data)
    return serialize(get_goal(goal.id))


@router.put("/api/goals/{goal_id}")
def api_update_goal(goal_id: int, data: dict):
    return serialize(update_goal(goal_id, data))


@router.delete("/api/goals/{goal_id}")
def api_delete_goal(goal_id: int):
    delete_goal(goal_id)
    return {"status": "ok"}


@router.post("/api/goals/{goal_id}/contribute")
def api_contribute_to_goal(goal_id: int, data: dict):
    return serialize(contribute_to_goal(goal_id, data["amount"]))
