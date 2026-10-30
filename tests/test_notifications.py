from expense_tracker.notifications import NotificationRepository


def test_notification_deduplication_and_read_state(tmp_db):
    first = NotificationRepository.create(
        "budget_warning",
        "Budget warning",
        "You have used 80% of your monthly budget.",
        {"month": "2026-10"},
        "budget:2026-10:all:80",
    )
    duplicate = NotificationRepository.create(
        "budget_warning",
        "Duplicate",
        "Duplicate body",
        dedupe_key="budget:2026-10:all:80",
    )

    assert first == duplicate
    assert NotificationRepository.unread_count() == 1
    items = NotificationRepository.list()
    assert items[0]["metadata"]["month"] == "2026-10"
    assert NotificationRepository.mark_read(first) is True
    assert NotificationRepository.unread_count() == 0
    assert NotificationRepository.mark_all_read() == 0


def test_notifications_can_be_deleted(tmp_db):
    notification_id = NotificationRepository.create(
        "info",
        "Test",
        "Message",
    )
    assert NotificationRepository.delete(notification_id) is True
    assert NotificationRepository.list() == []
