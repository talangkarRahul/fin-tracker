# models.py
from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    Float,
    Date,
    Text,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False)
    description = Column(String(500))
    amount = Column(Float, nullable=False)
    balance = Column(Float)
    transaction_type = Column(String(20))
    category = Column(String(50))


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True)
    category = Column(String(50), nullable=False)
    period = Column(String(10), nullable=False, default="monthly")
    limit_amount = Column(Float, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    goal_type = Column(String(20), nullable=False, default="savings")
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0)
    target_date = Column(Date, nullable=True)
    category = Column(String(50))
    notes = Column(Text)
    achieved = Column(Boolean, default=False)


class CategoryRule(Base):
    __tablename__ = "category_rules"

    id = Column(Integer, primary_key=True)
    keyword = Column(String(100), nullable=False, unique=True)
    category = Column(String(50), nullable=False)


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id = Column(Integer, primary_key=True)
    description = Column(String(255), nullable=False)
    category = Column(String(50))
    amount = Column(Float, nullable=False)
    frequency = Column(String(20), nullable=False)
    interval = Column(Integer, default=1)
    next_run = Column(Date, nullable=False)
    last_run = Column(Date)
    end_date = Column(Date)
    active = Column(Boolean, default=True)


class DashboardNote(Base):
    __tablename__ = "dashboard_notes"

    id = Column(Integer, primary_key=True)
    content = Column(Text, default="")