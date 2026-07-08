from fastapi import APIRouter
from services.health_score import compute_health_score

router = APIRouter()


@router.get("/api/financial-health")
def api_financial_health():
    return compute_health_score()
