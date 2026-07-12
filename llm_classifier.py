import os
import json
from litellm import completion

CATEGORIES = [
    "FOOD", "SHOPPING", "UTILITIES", "TRANSPORT", "FUEL", "ENTERTAINMENT",
    "SUBSCRIPTION", "INSURANCE", "INVESTMENT", "HEALTHCARE", "EDUCATION",
    "SALARY", "RENT", "LOAN_EMI", "TRANSFER", "PERSONAL_SERVICES",
    "TAXES", "TRAVEL", "FEES_CHARGES", "CASH_WITHDRAWAL",
    "GIFTS_DONATIONS", "PERSONAL_CARE", "INCOME", "OTHER",
]

PROMPT_TEMPLATE = """You are an expert categorizer of Indian UPI/GPay transaction statements. Each transaction below has a payee/payer NAME, a DIRECTION (sent/received), an AMOUNT, and a RECURRENCE COUNT (how many times this exact name appears as a "sent" transaction in the full statement). There is no explicit "UPI" tag in the name — every transaction in this statement is already a UPI payment, so do not use "it says UPI" as a signal.

Categories: {categories}

## How to read the name field
UPI merchant strings vary wildly in format. Use these signals together:

1. **Registered business suffixes** (Pvt Ltd, LLP, Enterprises, Technologies, "AND CO", Suppliers, Traders, Broking) mean it's a business, not a person — but the suffix alone doesn't tell you WHAT it sells. Use general knowledge of the name when recognizable; otherwise OTHER with low confidence rather than guessing.
2. **A plain human name** (2-4 tokens, no business suffix, often ALL CAPS or "Mr/Mrs [Name]") paired with:
   - **recurrence ≥ 2 and amount ≤ ₹500** → PERSONAL_SERVICES (household help, tutor, milkman, driver — small recurring payments to the same individual)
   - **recurrence = 1 and amount is large** (say ≥ ₹5,000) → TRANSFER, but flag it: large one-off transfers to individuals often aren't "spending" at all (could be rent-splitting, loan repayment, family support) — say so in reasoning rather than asserting a category confidently.
   - **recurrence = 1 and amount is small** → TRANSFER with lower confidence; genuinely ambiguous, could be a casual purchase from an unregistered vendor (street food, local kirana) mislabeled as a person.
3. **Direction = "received"** → INCOME by default, unless the name and pattern suggest a refund/reversal from a merchant already categorized elsewhere in the batch (still call it INCOME; don't recategorize as the original spend type).
4. **Known brand/platform names** — resolve deterministically, do not treat these as ambiguous even if you're "guessing" at what they sell:
   - Food delivery/restaurants (Zomato, Swiggy, KFC, named restaurants, "Hotel X", canteens) → FOOD
   - Quick-commerce/grocery (Zepto, BigBasket, named vegetable/kirana suppliers) → FOOD
   - Shopping platforms (Myntra, Meesho, Ajio, Zudio, named clothing companies, IKEA) → SHOPPING
   - CRED → UTILITIES (credit card bill payment, not a "subscription")
   - Zerodha/Groww/Upstox/Coin → INVESTMENT
   - Named insurance companies (LIC, Bajaj Allianz, Axis Max Life, Acko, HDFC Life, etc.) → INSURANCE
   - Airtel/Jio/Vi/broadband/DTH (Tata Play) → UTILITIES
   - Metro/IRCTC/Ola/Uber/Rapido → TRANSPORT
   - Google Play/Netflix/Spotify/Hotstar → SUBSCRIPTION

## Determine GROUP (NEEDS / WANTS / INVESTMENT / NOT_APPLICABLE) for each transaction using the 50/30/20 rule:

When CATEGORY is one of these, follow DETERMINISTICALLY:
- INVESTMENT → INVESTMENT
- UTILITIES / RENT / LOAN_EMI / INSURANCE / HEALTHCARE / TAXES / FUEL / FEES_CHARGES → NEEDS
- ENTERTAINMENT / SUBSCRIPTION / TRAVEL / GIFTS_DONATIONS → WANTS
- SALARY / INCOME / CASH_WITHDRAWAL / TRANSFER → NOT_APPLICABLE

When CATEGORY is FOOD, SHOPPING, TRANSPORT, PERSONAL_SERVICES, PERSONAL_CARE, EDUCATION, or OTHER:
Use the NAME and AMOUNT to decide:
- **FOOD**: Groceries (BigBasket, Zepto, vegetable vendor, kirana) → NEEDS. Restaurant/food delivery (Zomato, Swiggy, KFC, Hotel, Cafe) → WANTS.
- **SHOPPING**: Essential items (medicines, household supplies) → NEEDS. Discretionary (clothing, electronics, gifts) → WANTS.
- **TRANSPORT**: Daily commute (metro, bus, auto to work) → NEEDS. Leisure (Ola, Uber, Rapido for personal trips) → WANTS.
- **EDUCATION**: Course fees, tuition, books → NEEDS.
- **PERSONAL_SERVICES / PERSONAL_CARE**: Haircut, salon, household help → NEEDS.
- **OTHER**: Use judgment from name/amount; default WANTS if truly ambiguous.

## Only use OTHER when
Nothing above applies and the name gives no usable signal (e.g. a business-suffixed name you don't recognize and can't infer a category for). This should be rare — flag it with confidence ≤ 0.3 rather than forcing a guess into FOOD/SHOPPING/etc.

## Output format
Return ONLY valid JSON, no markdown fences:
{{
  "predictions": [
    {{
      "description": "<original name>",
      "category": "<one category>",
      "group": "<NEEDS|WANTS|INVESTMENT|NOT_APPLICABLE>",
      "confidence": <0.0-1.0>,
      "reasoning": "<short phrase; required if confidence < 0.7>"
    }}
  ]
}}

## Examples

Input: {{"description": "RAVI KUMAR", "direction": "sent", "amount": 130, "recurrence": 7}}
Output: {{"description": "RAVI KUMAR", "category": "PERSONAL_SERVICES", "group": "NEEDS", "confidence": 0.8, "reasoning": "Recurring small payment to individual, 7x in statement"}}

Input: {{"description": "anil deshmukh", "direction": "sent", "amount": 50000, "recurrence": 3}}
Output: {{"description": "anil deshmukh", "category": "TRANSFER", "group": "NOT_APPLICABLE", "confidence": 0.5, "reasoning": "Large recurring payment to individual — likely rent/loan/family support, not discretionary spend; confirm manually"}}

Input: {{"description": "SHREE ENTERPRISES", "direction": "sent", "amount": 110, "recurrence": 5}}
Output: {{"description": "SHREE ENTERPRISES", "category": "OTHER", "group": "WANTS", "confidence": 0.3, "reasoning": "Registered business, recurring small amounts suggest local shop/vendor, but nature unclear from description alone"}}

Input: {{"description": "Zerodha Broking Ltd", "direction": "sent", "amount": 10000, "recurrence": 6}}
Output: {{"description": "Zerodha Broking Ltd", "category": "INVESTMENT", "group": "INVESTMENT", "confidence": 0.98}}

Transactions to categorize:
{descriptions}"""


def classify_descriptions(descriptions: list[str]) -> list[dict]:
    if not descriptions:
        return []

    model = os.getenv("GROQ_MODEL", "llama3-70b-8192")
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        return [{"description": d, "category": "OTHER", "group": None, "confidence": 0.0} for d in descriptions]

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
        except Exception as err:
            print(f"Error classifying batch {i // batch_size + 1}: {batch}")
            print(f"Error details: {err}")
    return all_predictions
