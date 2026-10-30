from expense_tracker.analytics import generate_advanced_analytics
from expense_tracker.models import (
    BudgetRepository,
    Expense,
    ExpenseRepository,
    WalletRepository,
)
from expense_tracker.tags import TagRepository


def test_advanced_analytics_aggregates_wallets_tags_and_budget(tmp_db):
    wallet_id = WalletRepository.create("Travel Wallet", "USD")
    tag_id = TagRepository.create("Travel")
    ExpenseRepository.create(
        Expense(40, "Train", "2026-10-05", wallet_id=wallet_id),
        tag_ids=[tag_id],
    )
    ExpenseRepository.create(
        Expense(60, "Hotel", "2026-10-06", wallet_id=wallet_id),
        tag_ids=[tag_id],
    )
    BudgetRepository.set_budget("2026-10", 200)

    result = generate_advanced_analytics("2026-10", currency="USD")
    assert result["total"] == 100
    assert result["transaction_count"] == 2
    assert result["average_transaction"] == 50
    assert result["median_transaction"] == 50
    assert result["budget_remaining"] == 100
    assert result["budget_utilization"] == 50
    assert result["tag_breakdown"][0]["name"] == "Travel"
    assert result["wallet_breakdown"][0]["name"] == "Travel Wallet"


def test_analytics_returns_empty_safe_metrics(tmp_db):
    result = generate_advanced_analytics("2026-10", currency="USD")
    assert result["total"] == 0
    assert result["transaction_count"] == 0
    assert result["average_transaction"] == 0
    assert result["median_transaction"] == 0
    assert result["largest_expense"] is None
