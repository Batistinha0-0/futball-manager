import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as c:
        yield c


def test_health_ok(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_players_not_public(client: TestClient) -> None:
    """Without DATABASE_URL auth is unavailable (503); with DB, unauthenticated requests get 401."""
    response = client.get("/api/v1/players")
    assert response.status_code in (401, 503)
