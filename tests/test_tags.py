from expense_tracker.models import Expense, ExpenseRepository
from expense_tracker.tags import TagRepository


def test_expense_supports_multiple_tags_and_replacement(tmp_db):
    food = TagRepository.create("Food")
    essential = TagRepository.create("Essential", "#ef4444")
    expense_id = ExpenseRepository.create(
        Expense(12.5, "Groceries", "2026-10-01"),
        tag_ids=[food, essential, food],
    )

    expense = ExpenseRepository.get(expense_id)
    assert expense is not None
    assert {tag["id"] for tag in expense.tags} == {food, essential}
    assert len(ExpenseRepository.list(tag_id=essential)) == 1

    assert ExpenseRepository.update(expense_id, tag_ids=[essential]) is True
    refreshed = ExpenseRepository.get(expense_id)
    assert refreshed is not None
    assert [tag["id"] for tag in refreshed.tags] == [essential]


def test_deleting_tag_preserves_expense_and_removes_relationship(tmp_db):
    tag_id = TagRepository.create("Travel")
    expense_id = ExpenseRepository.create(
        Expense(25, "Train", "2026-10-02"),
        tag_ids=[tag_id],
    )

    assert TagRepository.delete(tag_id) is True
    expense = ExpenseRepository.get(expense_id)
    assert expense is not None
    assert expense.tags == []


def test_unknown_tag_rolls_back_expense_creation(tmp_db):
    import pytest

    with pytest.raises(ValueError, match="Unknown tag"):
        ExpenseRepository.create(
            Expense(20, "Invalid tag", "2026-10-03"),
            tag_ids=[999_999],
        )

    assert ExpenseRepository.list() == []
