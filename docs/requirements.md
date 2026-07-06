# Personal Finance Tracker — Feature Requirements

## Architecture
- **Backend**: FastAPI (Python) serving JSON-only API on `:8000`
- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4 + shadcn-style components on `:5173`
- **Database**: SQLite (`finance.db`) via SQLAlchemy
- **Charts**: Recharts (React-native charting library)
- **Vite proxy** forwards `/api/*` to `localhost:8000`

---

## 1. CSV Import

### Overview
Import bank statements via CSV with user-defined column mapping. Supports any bank's CSV format.

### Models
None — CSV rows are parsed and inserted directly as `Transaction` rows.

### API / UI
- **`POST /api/import`** — accepts `file` + optional `mapping` (JSON form field)
  - With mapping: uses `import_csv_generic()` — returns `{ status, imported }`
  - Without mapping: falls back to `import_icici_csv()` (legacy ICICI format)
- **ImportCSVDialog**: modal with file selector, CSV preview (first 5 rows), column mapping dropdowns
  - Auto-detects columns: Date, Description, Amount (single or split Debit/Credit), Balance
  - Date format toggle: Day first (DD/MM) or Month first (MM/DD)
  - Sends `ColumnMapping` JSON + file to backend

### Business Logic
- `import_csv_generic(file_path, mapping)` — parses CSV with pandas, maps columns to Transaction fields
- Handles single amount column (sign determines income/expense) or split debit/credit columns
- Auto-categorizes via `categorize()` (DB rules → hardcoded keywords → "OTHER")
- `import_icici_csv(file_path)` — legacy ICICI-specific import (hardcoded column names)

---

## 2. Transactions

### Overview
Core entity representing a financial transaction. Supports inline editing, adding, deletion, and filtering.

### Models

#### `Transaction`
| Field | Type | Notes |
|---|---|---|
| `id` | Integer, PK | |
| `date` | Date | |
| `description` | String(500) | |
| `amount` | Float | Negative = expense, positive = income |
| `balance` | Float, nullable | Running balance from statement |
| `transaction_type` | String(20) | `"expense"` or `"income"` |
| `category` | String(50) | Auto-categorized or user-specified |

### API / UI
- **CRUD endpoints**: `GET /transactions`, `POST /transactions`, `PUT /transactions/{id}`, `DELETE /transactions/{id}`
- **Transactions page**: table with filters (date range, type, category)
- **Inline editing**: click Edit → row becomes editable inputs → Save/Cancel
- **Add Transaction form**: date, description, amount, category, type
- Amount sign is negated for expenses before storing

### Category Rules
- DB-backed `CategoryRule` model (keyword → category mapping)
- `categorize(description)` — checks DB rules first, then hardcoded keywords, then returns `"OTHER"`
- `apply_category_to_transactions()` — retroactively re-categorizes all uncategorized transactions

---

## 3. Budgets (Envelope Budgeting)

### Overview
Track spending against monthly or annual limits per category. Users set a budget for a category and a period (monthly or annual), and the system flags overspend.

### Models

#### `Budget`
| Field | Type | Notes |
|---|---|---|
| `id` | Integer, PK | |
| `category` | String(50), unique | FK-like reference to transaction categories |
| `period` | String(10) | `"monthly"` or `"annual"` |
| `limit_amount` | Float | Max allowed spend in the period |
| `start_date` | Date | When the budget takes effect |
| `end_date` | Date, nullable | Optional expiry; NULL = ongoing |

### API / UI
- **CRUD endpoints**: `GET /budgets`, `POST /budgets`, `PUT /budgets/{id}`, `DELETE /budgets/{id}`
- **Budgets page**: grid of budget cards with progress bars
- **Warning/alert** badges at 80% (warning) and 100%+ (danger)
- **Dashboard note**: editable "My Goal" textarea with Save button (shown on Budgets page)

### Business Logic
- `get_budget_progress(budget_id)` — returns `{ category, limit, period, spent, remaining, pct }` for the current period
- Spent = `SUM(amount)` where `amount < 0`, `category = X`, date within budget period
- `period = "monthly"` → current calendar month; `period = "annual"` → current year (or since `start_date`)

---

## 4. Goals

### Overview
Users define financial goals with a target amount and optional target date. Three types: savings, debt paydown, purchase.

### Models

#### `Goal`
| Field | Type | Notes |
|---|---|---|
| `id` | Integer, PK | |
| `name` | String(100) | |
| `goal_type` | String(20) | `"savings"`, `"debt"`, `"purchase"` |
| `target_amount` | Float | |
| `current_amount` | Float | |
| `target_date` | Date, nullable | Optional — made nullable via migration |
| `category` | String(50), nullable | Optional link to budget category |
| `notes` | Text, nullable | |
| `achieved` | Boolean | |

### API / UI
- **CRUD endpoints**: `GET /goals`, `POST /goals`, `PUT /goals/{id}`, `DELETE /goals/{id}`
- **`POST /goals/{id}/contribute`** — manual contribution (updates `current_amount`)
- **Progress bar**: `(current / target) * 100`, with on-track indicator
- `on_track` computed from projection vs target date

---

## 5. Recurring Transactions

### Overview
Track subscriptions, memberships, EMIs, and regular payments/income. Processed on FastAPI startup via lifespan.

### Models

#### `RecurringTransaction`
| Field | Type | Notes |
|---|---|---|
| `id` | Integer, PK | |
| `description` | String(255) | |
| `category` | String(50) | |
| `amount` | Float | Positive = income, negative = expense |
| `frequency` | String(20) | `"daily"`, `"weekly"`, `"monthly"`, `"yearly"` |
| `interval` | Integer | e.g. 2 for "every 2 months" (default 1) |
| `next_run` | Date | Next date to generate a transaction |
| `last_run` | Date, nullable | |
| `active` | Boolean | |
| `end_date` | Date, nullable | Optional auto-stop |

### API / UI
- **CRUD endpoints**: `GET /recurring`, `POST /recurring`, `PUT /recurring/{id}`, `DELETE /recurring/{id}`
- **Toggle active/inactive**: `POST /recurring/{id}/toggle`
- **Process now**: `POST /recurring/process`

### Processing
- `process_due_recurring()` runs on FastAPI startup (lifespan event)
- For each active item where `next_run ≤ today`:
  1. Creates a `Transaction`
  2. Computes next `next_run` based on frequency + interval
  3. Updates `last_run`

---

## 6. Reports

### API / UI
- **Dashboard** (main page) with 4 Recharts charts:
  - Monthly bar chart (income vs expenses)
  - Category pie chart
  - Budget-vs-actual bar chart
  - Trend line chart
- **Date range filter** (`date_from`/`date_to`) on dashboard — passed to all summary/report endpoints

### Data Endpoints
- `GET /api/reports/monthly?months=N` — `[{ month, income, expenses, savings, savings_rate }]`
- `GET /api/reports/category?month=YYYY-MM` — `[{ category, amount, pct }]`
- `GET /api/reports/trends?months=N&categories=X,Y` — `[{ month, category, amount }]`
- `GET /api/reports/budget-vs-actual` — `[{ category, limit, spent, remaining, pct }]`

### Dashboard Note
- `DashboardNote` model (single-row table)
- `GET /api/dashboard-note` / `PUT /api/dashboard-note`
- Editable textarea on Budgets page

---

## Non-Goals (out of scope)
- User authentication / multi-user
- Bank API integration (manual CSV import only)
- Mobile app / responsive PWA
- Currency conversion / multi-currency
- Investment portfolio tracking
