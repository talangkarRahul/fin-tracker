#!/usr/bin/env python3
"""Migrate data from SQLite to PostgreSQL.

Usage:
    DATABASE_URL=postgresql://fin_user:fin_password@localhost:5432/personal_fin \
    python scripts/migrate_to_postgres.py

The script reads from the existing SQLite file (finance.db) and writes to
the PostgreSQL database specified in DATABASE_URL.
"""

import os
import sys

import sqlite3
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Base


def get_sqlite_connection(db_path="finance.db"):
    if not os.path.exists(db_path):
        print(f"SQLite database not found at {db_path}")
        sys.exit(1)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def get_tables(conn):
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    return [row[0] for row in cursor.fetchall()]


def table_has_data(conn, table):
    cursor = conn.execute(f"SELECT COUNT(*) FROM \"{table}\"")
    return cursor.fetchone()[0] > 0


def get_pg_columns(pg_engine, table):
    with pg_engine.connect() as conn:
        result = conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name = :t ORDER BY ordinal_position"
        ), {"t": table})
        return {row[0]: row[1] for row in result}


def migrate_table(conn, table, pg_engine):
    print(f"  Migrating {table}...", end=" ")

    cursor = conn.execute(f"SELECT * FROM \"{table}\"")
    rows = cursor.fetchall()
    if not rows:
        print("no data")
        return

    columns = [desc[0] for desc in cursor.description]
    pg_types = get_pg_columns(pg_engine, table)

    pg_conn = pg_engine.raw_connection()
    pg_cursor = pg_conn.cursor()

    placeholders = ",".join(["%s"] * len(columns))
    quoted_cols = ",".join(f'"{c}"' for c in columns)
    insert_sql = f'INSERT INTO "{table}" ({quoted_cols}) VALUES ({placeholders})'

    batch = []
    for row in rows:
        values = []
        for col in columns:
            val = row[col]
            pg_type = pg_types.get(col)
            if pg_type == "boolean" and isinstance(val, int):
                val = bool(val)
            values.append(val)
        batch.append(values)

    from psycopg2 import extras

    extras.execute_batch(pg_cursor, insert_sql, batch, page_size=500)
    pg_conn.commit()
    pg_cursor.close()
    pg_conn.close()

    print(f"{len(rows)} rows")


def main():
    pg_url = os.getenv("DATABASE_URL")
    if not pg_url:
        print("DATABASE_URL environment variable is required")
        sys.exit(1)

    sqlite_path = "finance.db"

    print("Connecting to SQLite...")
    sqlite_conn = get_sqlite_connection(sqlite_path)

    print("Connecting to PostgreSQL...")
    pg_engine = create_engine(pg_url)
    Base.metadata.create_all(pg_engine)

    print("Clearing existing data from PostgreSQL...")
    with pg_engine.connect() as conn:
        table_names = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
        conn.execute(text(f"TRUNCATE TABLE {table_names} CASCADE"))
        conn.commit()

    tables = get_tables(sqlite_conn)
    print(f"Found tables: {tables}")

    model_table_names = {t.name for t in Base.metadata.sorted_tables}
    print(f"Model tables: {model_table_names}")

    for table in tables:
        if table in model_table_names and table_has_data(sqlite_conn, table):
            migrate_table(sqlite_conn, table, pg_engine)

    print("Resetting sequences...")
    with pg_engine.connect() as conn:
        for table in model_table_names:
            result = conn.execute(text(f'SELECT MAX(id) FROM "{table}"'))
            max_id = result.scalar()
            if max_id:
                seq_name = f"{table}_id_seq"
                conn.execute(text(f"ALTER SEQUENCE {seq_name} RESTART WITH {max_id + 1}"))
                print(f"  {table}: sequence set to {max_id + 1}")
        conn.commit()

    sqlite_conn.close()
    print("\nMigration complete!")


if __name__ == "__main__":
    main()
