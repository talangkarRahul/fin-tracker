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
    expected_return = Column(Float, default=8.0)


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


class FinancialProfile(Base):
    __tablename__ = "financial_profiles"

    id = Column(Integer, primary_key=True)
    age = Column(Integer)
    income = Column(Float)
    monthly_expenses = Column(Float)
    dependents = Column(Integer)
    existing_assets = Column(Text)
    existing_liabilities = Column(Text)
    tax_regime = Column(String(10))
    risk_appetite = Column(String(10))
    emergency_fund_months = Column(Integer, default=6)


class EmergencyFund(Base):
    __tablename__ = "emergency_fund"

    id = Column(Integer, primary_key=True)
    target_months = Column(Float, default=6)
    monthly_expenses = Column(Float, default=0)
    current_amount = Column(Float, default=0)


class NetWorthSnapshot(Base):
    __tablename__ = "net_worth_snapshots"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False)
    total_assets = Column(Float, default=0)
    total_liabilities = Column(Float, default=0)
    net_worth = Column(Float, default=0)
    breakdown = Column(Text)


class InsurancePolicy(Base):
    __tablename__ = "insurance_policies"

    id = Column(Integer, primary_key=True)
    policy_type = Column(String(30), nullable=False)
    provider = Column(String(100))
    policy_number = Column(String(100))
    sum_insured = Column(Float, default=0)
    premium_amount = Column(Float, default=0)
    premium_frequency = Column(String(20), default="yearly")
    start_date = Column(Date)
    end_date = Column(Date)
    nominee = Column(String(100))
    notes = Column(Text)
    active = Column(Boolean, default=True)


class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True)
    investment_type = Column(String(30), nullable=False)
    name = Column(String(200), nullable=False)
    amount_invested = Column(Float, default=0)
    current_value = Column(Float, default=0)
    purchase_date = Column(Date)
    sip_amount = Column(Float, default=0)
    sip_frequency = Column(String(20))
    notes = Column(Text)
    active = Column(Boolean, default=True)


class RetirementPlan(Base):
    __tablename__ = "retirement_plans"

    id = Column(Integer, primary_key=True)
    retirement_age = Column(Integer, default=60)
    life_expectancy = Column(Integer, default=85)
    expected_inflation = Column(Float, default=6.0)
    pre_retirement_return = Column(Float, default=8.0)
    post_retirement_return = Column(Float, default=6.0)
    monthly_expenses_override = Column(Float)
    current_corpus = Column(Float, default=0)