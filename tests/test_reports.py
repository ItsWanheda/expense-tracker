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