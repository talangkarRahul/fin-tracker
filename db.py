# db.py
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

DATABASE_URL = "sqlite:///finance.db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(engine)


def _run_migrations():
    conn = sqlite3.connect("finance.db")

    # Migrate goals table
    cursor = conn.execute("PRAGMA table_info(goals)")
    goals_cols = {row[1] for row in cursor.fetchall()}
    for col, dtype in {
        "goal_type": "VARCHAR(20) NOT NULL DEFAULT 'savings'",
        "category": "VARCHAR(50)",
        "notes": "TEXT",
        "achieved": "BOOLEAN NOT NULL DEFAULT 0",
    }.items():
        if col not in goals_cols:
            conn.execute(f"ALTER TABLE goals ADD COLUMN {col} {dtype}")

    # Recreate budgets table with new schema
    cursor = conn.execute("PRAGMA table_info(budgets)")
    budget_cols = {row[1] for row in cursor.fetchall()}
    if "monthly_limit" in budget_cols:
        conn.execute("ALTER TABLE budgets RENAME TO budgets_old")
        conn.commit()
        Base.metadata.create_all(engine)
        conn2 = sqlite3.connect("finance.db")
        conn2.execute("DROP TABLE budgets_old")
        conn2.commit()
        conn2.close()

    # Migrate recurring_transactions table
    cursor = conn.execute("PRAGMA table_info(recurring_transactions)")
    rec_cols = {row[1] for row in cursor.fetchall()}
    for col, dtype in {
        "interval": "INTEGER NOT NULL DEFAULT 1",
        "last_run": "DATE",
        "end_date": "DATE",
    }.items():
        if col not in rec_cols:
            conn.execute(f"ALTER TABLE recurring_transactions ADD COLUMN {col} {dtype}")

    # Make target_date nullable in goals table
    cursor = conn.execute("PRAGMA table_info(goals)")
    for row in cursor.fetchall():
        if row[1] == "target_date" and row[3] == 1:
            conn.execute("ALTER TABLE goals RENAME TO goals_old")
            conn.commit()
            Base.metadata.create_all(engine)
            conn.execute("""
                INSERT INTO goals (id, name, goal_type, target_amount, current_amount,
                                   target_date, category, notes, achieved)
                SELECT id, name, goal_type, target_amount, current_amount,
                       NULLIF(target_date, ''), category, notes, achieved
                FROM goals_old
            """)
            conn.execute("DROP TABLE goals_old")
            conn.commit()
            break

    conn.close()


_run_migrations()