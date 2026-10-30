from expense_tracker.web import create_app


def test_tags_expenses_notifications_and_locales_api(tmp_db):
    app = create_app()
    client = app.test_client()

    response = client.post(
        "/api/tags",
        json={"name": "Work", "color": "#123456"},
    )
    assert response.status_code == 201
    tag_id = response.get_json()["id"]
    wallet_id = client.get("/api/wallets").get_json()[0]["id"]

    response = client.post(
        "/api/expenses",
        json={
            "amount": 25,
            "description": "Lunch",
            "date": "2026-10-12",
            "wallet_id": wallet_id,
            "tag_ids": [tag_id],
        },
    )
    assert response.status_code == 201
    expense_id = response.get_json()["id"]

    response = client.get("/api/expenses?tag_id=" + str(tag_id))
    assert response.status_code == 200
    assert response.get_json()[0]["id"] == expense_id
    assert response.get_json()[0]["tags"][0]["name"] == "Work"

    assert client.get("/api/locales?locale=fa-IR").get_json()["selected"] == "fa"
    assert client.get("/api/notifications").status_code == 200
    assert client.get(
        "/api/reports/advanced-analytics?month=2026-10"
    ).status_code == 200


def test_budget_threshold_notifications_are_deduplicated(tmp_db):
    app = create_app()
    client = app.test_client()

    budget = client.put(
        "/api/budget",
        json={"month": "2026-10", "amount": 100},
    )
    assert budget.status_code == 200

    first = client.post(
        "/api/expenses",
        json={
            "amount": 85,
            "description": "First purchase",
            "date": "2026-10-10",
        },
    )
    assert first.status_code == 201

    second = client.post(
        "/api/expenses",
        json={
            "amount": 20,
            "description": "Second purchase",
            "date": "2026-10-11",
        },
    )
    assert second.status_code == 201

    notifications = client.get("/api/notifications").get_json()
    kinds = {item["kind"] for item in notifications["items"]}
    assert kinds == {"budget_warning", "budget_exceeded"}
    assert notifications["unread_count"] == 2
