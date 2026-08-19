"""Reporting & aggregation logic."""
from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date as date_cls
from typing import Optional

from .models import BudgetRepository, CurrencyRepository, ExpenseRepository


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


def generate_monthly_report(month: Optional[str] = None, wallet_id: Optional[int] = None, currency: str = "USD"):
    month = month or current_month()
    year, mon = map(int, month.split("-"))
    last_day = calendar.monthrange(year, mon)[1]   # = number of days
    start, end = f"{month}-01", f"{month}-{last_day:02d}"

    expenses = ExpenseRepository.list(
        start_date=start, end_date=end, limit=10_000, wallet_id=wallet_id
    )
    currency = currency.upper()
    converted = []
    for e in expenses:
        try:
            amount = CurrencyRepository.convert(e.amount, e.currency, currency)
        except ValueError:
            amount = e.amount if e.currency == currency else 0.0
        converted.append((e, amount))
    total = sum(amount for _, amount in converted)

    by_cat = {}
    for e, amount in converted:
        name = e.category_name or "Uncategorized"
        if name not in by_cat:
            by_cat[name] = CategoryTotal(name, 0.0, 0)
        by_cat[name].total += amount
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