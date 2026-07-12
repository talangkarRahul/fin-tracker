from fastapi import APIRouter
from services import (
    get_category_rules, create_category_rule, delete_category_rule,
    get_unique_descriptions, get_uncategorized_descriptions, bulk_categorize_by_description,
)
from services.categories import assign_group
from llm_classifier import classify_descriptions
from routes.common import serialize

router = APIRouter()


@router.get("/api/category-rules")
def api_get_category_rules():
    return serialize(get_category_rules())


@router.post("/api/category-rules")
def api_create_category_rule(data: dict):
    rule, count = create_category_rule(data["keyword"], data["category"])
    return {**serialize(rule), "updated_count": count}


@router.delete("/api/category-rules/{rule_id}")
def api_delete_category_rule(rule_id: int):
    delete_category_rule(rule_id)
    return {"status": "ok"}


@router.get("/api/descriptions")
def api_get_descriptions():
    return serialize(get_unique_descriptions())


@router.get("/api/auto-categorize/preview")
def api_auto_categorize_preview():
    descriptions = get_uncategorized_descriptions()
    descs = [d["description"] for d in descriptions]
    if not descs:
        return {"predictions": []}
    predictions = classify_descriptions(descs)
    # Restore original descriptions — LLM may truncate/modify them
    for i, p in enumerate(predictions):
        if i < len(descs):
            p["description"] = descs[i]
        if "group" not in p or p["group"] is None:
            p["group"] = assign_group(p.get("category", ""), p.get("description", ""))
    lookup = {d["description"]: d["count"] for d in descriptions}
    return {
        "predictions": [
            {**p, "count": lookup.get(p.get("description", ""), 0)}
            for p in predictions
        ]
    }


@router.post("/api/auto-categorize/apply")
def api_auto_categorize_apply(data: dict):
    mappings = data.get("mappings", [])
    updated, rules_created = bulk_categorize_by_description(mappings)
    return {"updated": updated, "rules_created": rules_created}
