from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.database import Base, get_db
from src.main import app


def test_workspace_categories_include_direct_amount_total():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    testing_session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    password = "Pa$$word1!"
    email = "category-amount@example.com"
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "device_id": "category-app",
            "client_type": "app",
            "platform": "test",
        },
    )
    app_token = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
            "device_id": "category-app",
            "client_type": "app",
            "platform": "test",
        },
    ).json()["access_token"]
    web_token = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
            "device_id": "category-web",
            "client_type": "web",
            "platform": "test",
        },
    ).json()["access_token"]

    now = datetime.now(timezone.utc).isoformat()
    ledger_id = "ledger-category-amount"
    entities = [
        ("ledger", ledger_id, {"syncId": ledger_id, "ledgerName": "Personal", "currency": "CNY"}),
        (
            "account",
            "account-cash",
            {"syncId": "account-cash", "name": "Cash", "type": "cash", "currency": "CNY"},
        ),
        (
            "category",
            "cat-food",
            {"syncId": "cat-food", "name": "Food", "kind": "expense", "level": 1},
        ),
        (
            "category",
            "cat-lunch",
            {
                "syncId": "cat-lunch",
                "name": "Lunch",
                "kind": "expense",
                "level": 2,
                "parentName": "Food",
            },
        ),
        (
            "category",
            "cat-salary",
            {"syncId": "cat-salary", "name": "Salary", "kind": "income", "level": 1},
        ),
        (
            "transaction",
            "tx-lunch",
            {
                "syncId": "tx-lunch",
                "type": "expense",
                "amount": 35.5,
                "happenedAt": now,
                "categoryName": "Lunch",
                "categoryId": "cat-lunch",
                "accountName": "Cash",
                "accountId": "account-cash",
            },
        ),
        (
            "transaction",
            "tx-salary",
            {
                "syncId": "tx-salary",
                "type": "income",
                "amount": 5000,
                "happenedAt": now,
                "categoryName": "Salary",
                "categoryId": "cat-salary",
                "accountName": "Cash",
                "accountId": "account-cash",
            },
        ),
    ]
    push = client.post(
        "/api/v1/sync/push",
        headers={"Authorization": f"Bearer {app_token}"},
        json={
            "device_id": "category-app",
            "changes": [
                {
                    "ledger_id": ledger_id,
                    "entity_type": entity_type,
                    "entity_sync_id": sync_id,
                    "action": "upsert",
                    "updated_at": now,
                    "payload": payload,
                }
                for entity_type, sync_id, payload in entities
            ],
        },
    )
    assert push.status_code == 200, push.text

    response = client.get(
        f"/api/v1/read/workspace/categories?ledger_id={ledger_id}",
        headers={"Authorization": f"Bearer {web_token}"},
    )
    assert response.status_code == 200, response.text
    by_id = {row["id"]: row for row in response.json()}
    assert by_id["cat-lunch"]["tx_count"] == 1
    assert by_id["cat-lunch"]["amount_total"] == 35.5
    assert by_id["cat-salary"]["amount_total"] == 5000.0
    assert by_id["cat-food"]["amount_total"] == 0.0

    app.dependency_overrides.clear()
