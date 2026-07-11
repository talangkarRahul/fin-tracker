# Personal Finance Tracker

Track your income, expenses, budgets, goals, investments, and recurring transactions. CSV import with column mapping supports any bank statement. Features a modern dark-mode UI with interactive charts.

![Dashboard](screenshots/dashboard.png)

## Quick Start

### Backend

```bash
cp .env.example .env   # add your GROQ_API_KEY
uv sync
uv run uvicorn app:app --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite, pandas
- **Frontend**: React, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Lucide icons
- **Vite proxy** forwards `/api` → `localhost:8000`

## Features

- **Transactions** — table with inline editing, add/delete, filters, pagination
- **CSV Import** — column mapping dialog auto-detects fields from any bank CSV
- **Budgets** — monthly/annual limits per category with progress alerts (80%/100%)
- **Goals** — savings/debt/purchase goals with contribution tracking
- **Recurring Transactions** — subscriptions, EMIs, auto-process on startup
- **Reports & Dashboard** — income/expense bars, category donut, budget vs actual, spending trends with gradient fills and animations
- **Category Rules** — keyword-based auto-categorization with AI suggestion
- **Insurance** — policies grouped by type (health, life, vehicle, travel) with premium tracking
- **Investments** — portfolio tracking (MF, stocks, EPF, PPF, NPS, FD, SSY), CSV import with column mapping, gain/loss analysis
- **Retirement Planning** — SIP calculator, expense projection, timeline visualization
- **Net Worth** — assets vs liabilities summary with trend chart
- **Financial Health** — component score gauge with recommendations
- **Profile** — personal info, investment-linked assets (auto-synced), manual asset/liability tracking
- **Dark Mode** — toggle in navbar, respects `prefers-color-scheme`, persists to localStorage

## Screenshots

| Dashboard | Transactions |
|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Transactions](screenshots/transactions.png) |

| Investments |
|---|
| ![Investments](screenshots/investments.png) |

## Project Structure

```
app.py              — FastAPI app (JSON API endpoints)
services/           — Business logic (transactions, budgets, goals, recurring, reports, categorize, investments, net_worth, health_score, profile)
routes/             — API route modules
models.py           — SQLAlchemy models
db.py               — Engine, session, migrations
frontend/src/
  api.ts            — API client
  pages/            — Dashboard, Transactions, Budgets, Goals, Recurring, Categories, Insurance, Investments, Retirement, NetWorth, FinancialHealth, Profile
  components/       — UI components (Card, Button, Badge, Progress, ImportCSVDialog, theme toggle)
  lib/format.ts     — Currency formatting with Indian numbering
```
