import os
import json
from litellm import completion

CATEGORIES = [
    "FOOD", "SHOPPING", "UTILITIES", "TRANSPORT", "ENTERTAINMENT",
    "SUBSCRIPTION", "INSURANCE", "INVESTMENT", "HEALTHCARE",
    "SALARY", "RENT", "UPI", "TAXES", "TRAVEL", "INCOME", "OTHER",
]

PROMPT_TEMPLATE = """You are a bank statement categorizer. For each description below, pick the best category from: {categories}

Rules:
- UPI / phonepe / gpay payments → UPI (do NOT put in FOOD or SHOPPING even if the merchant name appears)
- Refunds, cashbacks, interest → INCOME
- Credit card bill payments → UTILITIES
- Rent → RENT
- Salary / wages → SALARY
- Insurance premiums → INSURANCE
- Mutual fund / SIP / stocks → INVESTMENT
- Only use OTHER as a last resort

Return a JSON object with a "predictions" key containing an array of objects with "description", "category", and "confidence" (0.0 to 1.0).

Descriptions:
{descriptions}"""


def classify_descriptions(descriptions: list[str]) -> list[dict]:
    if not descriptions:
        return []

    model = os.getenv("GROQ_MODEL", "llama3-70b-8192")
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        return [{"description": d, "category": "OTHER", "confidence": 0.0} for d in descriptions]

    batch_size = 50
    all_predictions = []

    for i in range(0, len(descriptions), batch_size):
        batch = descriptions[i: i + batch_size]
        numbered = "\n".join(f"{j+1}. {d}" for j, d in enumerate(batch))
        prompt = PROMPT_TEMPLATE.format(
            categories=", ".join(CATEGORIES),
            descriptions=numbered,
        )

        try:
            resp = completion(
                model=f"groq/{model}",
                api_key=api_key,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            raw = resp.choices[0].message.content
            data = json.loads(raw)
            batch_preds = data.get("predictions", [])
            all_predictions.extend(batch_preds)
        except Exception:
            all_predictions.extend(
                {"description": d, "category": "OTHER", "confidence": 0.0}
                for d in batch
            )

    return all_predictions
