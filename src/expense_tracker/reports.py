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



def _shift_month(month: str, offset: int) -> str:
    """Return a YYYY-MM month shifted by *offset* months."""
    year, mon = map(int, month.split("-"))
    absolute = year * 12 + (mon - 1) + offset
    shifted_year, shifted_mon = divmod(absolute, 12)
    return f"{shifted_year:04d}-{shifted_mon + 1:02d}"


def generate_financial_intelligence(
    month: Optional[str] = None,
    wallet_id: Optional[int] = None,
    currency: str = "USD",
):
    """Build the v0.5.0 financial-intelligence dataset.

    This is additive to the existing reporting API: it reuses the current
    repositories and currency conversion layer without changing existing
    report semantics.
    """
    month = month or current_month()
    currency = currency.upper()

    year, mon = map(int, month.split("-"))
    days_in_month = calendar.monthrange(year, mon)[1]

    current_expenses = ExpenseRepository.list(
        start_date=f"{month}-01",
        end_date=f"{month}-{days_in_month:02d}",
        limit=10_000,
        wallet_id=wallet_id,
    )

    def converted_amount(expense) -> float:
        try:
            return CurrencyRepository.convert(
                expense.amount,
                expense.currency,
                currency,
            )
        except ValueError:
            return expense.amount if expense.currency == currency else 0.0

    converted = [
        (expense, converted_amount(expense))
        for expense in current_expenses
    ]
    total = sum(amount for _, amount in converted)

    previous_month = _shift_month(month, -1)
    previous_report = generate_monthly_report(
        previous_month,
        wallet_id=wallet_id,
        currency=currency,
    )
    previous_total = previous_report.total

    change = total - previous_total
    change_pct = (
        (change / previous_total) * 100.0
        if previous_total
        else None
    )

    by_category = {}
    for expense, amount in converted:
        category = expense.category_name or "Uncategorized"
        if category not in by_category:
            by_category[category] = CategoryTotal(category, 0.0, 0)
        by_category[category].total += amount
        by_category[category].count += 1

    top_categories = sorted(
        by_category.values(),
        key=lambda item: item.total,
        reverse=True,
    )[:5]

    top_expenses = [
        {
            "id": expense.id,
            "description": expense.description,
            "date": expense.date,
            "amount": expense.amount,
            "currency": expense.currency,
            "converted_amount": amount,
            "category": expense.category_name or "Uncategorized",
        }
        for expense, amount in sorted(
            converted,
            key=lambda item: item[1],
            reverse=True,
        )[:5]
    ]

    trend = []
    for offset in range(-11, 1):
        trend_month = _shift_month(month, offset)
        report = generate_monthly_report(
            trend_month,
            wallet_id=wallet_id,
            currency=currency,
        )
        trend.append({
            "month": trend_month,
            "total": report.total,
            "count": report.count,
        })

    active_days = len({expense.date for expense in current_expenses})

    return {
        "month": month,
        "currency": currency,
        "total": total,
        "previous_total": previous_total,
        "change": change,
        "change_pct": change_pct,
        "transaction_count": len(current_expenses),
        "active_days": active_days,
        "days_in_month": days_in_month,
        "daily_average": total / days_in_month if days_in_month else 0.0,
        "top_categories": [
            {
                "category": item.category,
                "total": item.total,
                "count": item.count,
            }
            for item in top_categories
        ],
        "top_expenses": top_expenses,
        "monthly_trend": trend,
    }

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