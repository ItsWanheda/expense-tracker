"""Advanced spending analytics using the existing SQLite repositories."""
from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import date as date_cls, datetime
from statistics import median
from typing import Any

from .models import BudgetRepository, CurrencyRepository, Expense, ExpenseRepository
from .reports import current_month


def _converted_amount(expense: Expense, currency: str) -> float:
    if expense.currency.upper() == currency:
        return expense.amount
    # Never silently omit spending when a conversion rate is unavailable.
    return CurrencyRepository.convert(
        expense.amount,
        expense.currency,
        currency,
    )


def generate_advanced_analytics(
    month: str | None = None,
    wallet_id: int | None = None,
    currency: str = "USD",
) -> dict[str, Any]:
    """Return transaction distribution, projections, and concentration metrics."""
    period = month or current_month()
    parsed_month = datetime.strptime(f"{period}-01", "%Y-%m-%d")
    year, month_number = parsed_month.year, parsed_month.month
    days_in_month = calendar.monthrange(year, month_number)[1]
    normalized_currency = currency.upper()

    expenses = ExpenseRepository.list(
        start_date=f"{period}-01",
        end_date=f"{period}-{days_in_month:02d}",
        limit=10_000,
        wallet_id=wallet_id,
    )
    converted = [
        (expense, _converted_amount(expense, normalized_currency))
        for expense in expenses
    ]
    amounts = [amount for _, amount in converted]
    total = sum(amounts)

    daily_totals: dict[str, float] = defaultdict(float)
    daily_counts: dict[str, int] = defaultdict(int)
    weekday_totals: dict[int, float] = defaultdict(float)
    weekday_counts: dict[int, int] = defaultdict(int)
    category_totals: dict[str, float] = defaultdict(float)
    wallet_totals: dict[str, float] = defaultdict(float)
    tag_totals: dict[str, float] = defaultdict(float)

    for expense, amount in converted:
        daily_totals[expense.date] += amount
        daily_counts[expense.date] += 1
        weekday = datetime.strptime(expense.date, "%Y-%m-%d").weekday()
        weekday_totals[weekday] += amount
        weekday_counts[weekday] += 1
        category_totals[expense.category_name or "Uncategorized"] += amount
        wallet_totals[expense.wallet_name or "Main Wallet"] += amount
        for tag in expense.tags:
            tag_totals[str(tag["name"])] += amount

    category_breakdown = [
        {"name": name, "total": amount}
        for name, amount in sorted(
            category_totals.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    ]
    top_three_total = sum(
        float(row["total"]) for row in category_breakdown[:3]
    )
    # Overall monthly budgets are not attributable to one wallet.
    budget = BudgetRepository.get_budget(period) if wallet_id is None else None
    budget_remaining = budget - total if budget is not None else None

    today = date_cls.today()
    elapsed_days = (
        min(today.day, days_in_month)
        if period == today.strftime("%Y-%m")
        else days_in_month
    )
    projected_total = (
        total / elapsed_days * days_in_month
        if elapsed_days > 0
        else 0.0
    )

    largest_expense: dict[str, Any] | None = None
    if converted:
        largest, largest_amount = max(
            converted,
            key=lambda item: item[1],
        )
        largest_expense = {
            "id": largest.id,
            "description": largest.description,
            "date": largest.date,
            "amount": largest_amount,
            "currency": normalized_currency,
        }

    return {
        "month": period,
        "currency": normalized_currency,
        "total": total,
        "transaction_count": len(expenses),
        "average_transaction": total / len(expenses) if expenses else 0.0,
        "median_transaction": float(median(amounts)) if amounts else 0.0,
        "largest_expense": largest_expense,
        "projected_month_total": projected_total,
        "budget": budget,
        "budget_remaining": budget_remaining,
        "budget_utilization": (
            total / budget * 100.0
            if budget is not None and budget > 0
            else None
        ),
        "top_three_category_share": (
            top_three_total / total * 100.0
            if total > 0
            else 0.0
        ),
        "daily_spending": [
            {
                "date": expense_date,
                "total": daily_totals[expense_date],
                "count": daily_counts[expense_date],
            }
            for expense_date in sorted(daily_totals)
        ],
        "weekday_spending": [
            {
                "weekday": calendar.day_name[weekday],
                "total": weekday_totals[weekday],
                "count": weekday_counts[weekday],
            }
            for weekday in range(7)
        ],
        "category_breakdown": category_breakdown,
        "wallet_breakdown": [
            {"name": name, "total": amount}
            for name, amount in sorted(
                wallet_totals.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        ],
        "tag_breakdown": [
            {"name": name, "total": amount}
            for name, amount in sorted(
                tag_totals.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        ],
        "days_in_month": days_in_month,
        "elapsed_days": elapsed_days,
    }
