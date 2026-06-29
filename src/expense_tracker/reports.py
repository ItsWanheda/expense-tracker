"""Reporting & aggregation logic."""
from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date as date_cls
from typing import Optional

from .models import BudgetRepository, ExpenseRepository


def current_month() -> str:
    return date_cls.today().strftime("%Y-%m")


@dataclass
class CategoryTotal:
    category: str
    total: float
    count: int


@dataclass
class MonthlyReport:
    month: str
    total: float
    count: int
    by_category: list
    budget: Optional[float]
    budget_remaining: Optional[float]


def generate_monthly_report(month: Optional[str] = None):
    month = month or current_month()
    year, mon = map(int, month.split("-"))
    last_day = calendar.monthrange(year, mon)[1]   # = number of days
    start, end = f"{month}-01", f"{month}-{last_day:02d}"

    expenses = ExpenseRepository.list(
        start_date=start, end_date=end, limit=10_000
    )
    total = sum(e.amount for e in expenses)

    by_cat = {}
    for e in expenses:
        name = e.category_name or "Uncategorized"
        if name not in by_cat:
            by_cat[name] = CategoryTotal(name, 0.0, 0)
        by_cat[name].total += e.amount
        by_cat[name].count += 1

    sorted_cats = sorted(by_cat.values(), key=lambda c: c.total, reverse=True)
    budget = BudgetRepository.get_budget(month)
    remaining = (budget - total) if budget is not None else None

    return MonthlyReport(
        month=month,
        total=total,
        count=len(expenses),
        by_category=sorted_cats,
        budget=budget,
        budget_remaining=remaining,
    )
