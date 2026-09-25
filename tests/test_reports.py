from expense_tracker.models import CategoryRepository, Expense, ExpenseRepository
from expense_tracker.reports import generate_monthly_report


def test_monthly_report(tmp_db):
    food = CategoryRepository.create("Food")
    transport = CategoryRepository.create("Transport")
    ExpenseRepository.create(Expense(15, "Lunch", "2024-05-03", food))
    ExpenseRepository.create(Expense(8, "Coffee", "2024-05-04", food))
    ExpenseRepository.create(Expense(40, "Bus pass", "2024-05-10", transport))
    ExpenseRepository.create(Expense(100, "Old", "2024-04-30", food))  # outside month

    r = generate_monthly_report("2024-05")
    assert r.count == 3
    assert abs(r.total - 63.0) < 1e-6

    cats = {c.category: c.total for c in r.by_category}
    assert cats["Food"] == 23
    assert cats["Transport"] == 40

def test_financial_intelligence(tmp_db):
    food = CategoryRepository.create("Food")
    ExpenseRepository.create(Expense(15, "Lunch", "2024-05-03", food))
    ExpenseRepository.create(Expense(45, "Dinner", "2024-05-10", food))
    ExpenseRepository.create(Expense(100, "Old", "2024-04-30", food))

    from expense_tracker.reports import generate_financial_intelligence

    result = generate_financial_intelligence("2024-05")

    assert result["month"] == "2024-05"
    assert result["total"] == 60
    assert result["previous_total"] == 0
    assert result["change"] == 60
    assert result["change_pct"] is None
    assert result["transaction_count"] == 2
    assert result["active_days"] == 2
    assert result["daily_average"] == 60 / 31
    assert result["top_categories"][0]["category"] == "Food"
    assert result["top_categories"][0]["total"] == 60
    assert result["top_expenses"][0]["description"] == "Dinner"
    assert len(result["monthly_trend"]) == 12
    assert result["monthly_trend"][-1]["month"] == "2024-05"
