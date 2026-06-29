from expense_tracker.models import (
    BudgetRepository,
    CategoryRepository,
    Expense,
    ExpenseRepository,
)


def test_add_and_get_expense(tmp_db):
    cat_id = CategoryRepository.create("Food")
    eid = ExpenseRepository.create(
        Expense(amount=12.50, description="Lunch", date="2024-05-01", category_id=cat_id)
    )
    e = ExpenseRepository.get(eid)
    assert e is not None
    assert e.amount == 12.50
    assert e.category_name == "Food"


def test_update_expense(tmp_db):
    eid = ExpenseRepository.create(Expense(amount=10, description="x", date="2024-05-01"))
    assert ExpenseRepository.update(eid, amount=20, description="y") is True
    e = ExpenseRepository.get(eid)
    assert e.amount == 20 and e.description == "y"


def test_delete_expense(tmp_db):
    eid = ExpenseRepository.create(Expense(amount=10, description="x", date="2024-05-01"))
    assert ExpenseRepository.delete(eid) is True
    assert ExpenseRepository.get(eid) is None


def test_list_with_filters(tmp_db):
    c1 = CategoryRepository.create("Food")
    c2 = CategoryRepository.create("Transport")
    ExpenseRepository.create(Expense(10, "a", "2024-05-01", c1))
    ExpenseRepository.create(Expense(20, "b", "2024-05-15", c2))
    ExpenseRepository.create(Expense(30, "c", "2024-06-01", c1))

    assert len(ExpenseRepository.list(start_date="2024-05-01", end_date="2024-05-31")) == 2
    assert len(ExpenseRepository.list(category_id=c1)) == 2


def test_budget_set_and_get(tmp_db):
    BudgetRepository.set_budget("2024-05", 500.0)
    assert BudgetRepository.get_budget("2024-05") == 500.0
    BudgetRepository.set_budget("2024-05", 750.0)  # upsert
    assert BudgetRepository.get_budget("2024-05") == 750.0