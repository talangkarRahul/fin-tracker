# Personal Finance Tracker

Track your income, expenses, budgets, goals, and recurring transactions. CSV import with column mapping supports any bank statement.

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
- **Frontend**: React, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts
- **Vite proxy** forwards `/api` → `localhost:8000`

## Features

- **Transactions** — table with inline editing, add/delete, filters
- **CSV Import** — column mapping dialog auto-detects fields from any CSV
- **Budgets** — monthly/annual limits per category with progress alerts (80%/100%)
- **Goals** — savings/debt/purchase goals with contribution tracking
- **Recurring Transactions** — subscriptions, EMIs, auto-process on startup
- **Reports** — dashboard with charts (monthly, category, trends, budget vs actual)
- **Category Rules** — keyword-based auto-categorization

## Project Structure

```
app.py            — FastAPI app (JSON API endpoints)
services.py       — Business logic (CRUD, reports, import, categorize)
models.py         — SQLAlchemy models
db.py             — Engine, session, migrations
frontend/src/
  api.ts          — API client
  pages/          — Dashboard, Transactions, Budgets, Goals, Recurring, Categories
  components/     — UI components (Card, Button, Badge, Progress, ImportCSVDialog)
  lib/format.ts   — ₹ formatting with Indian numbering
```
