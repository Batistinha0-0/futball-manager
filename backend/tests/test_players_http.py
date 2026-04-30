import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_auth_service, get_writable_db
from app.application.auth.auth_service import AuthService
from app.domain.user import User, UserAuthRecord, UserRole
from app.infrastructure.security.bcrypt_password_hasher import BcryptPasswordHasher
from app.infrastructure.security.pyjwt_access_token_service import PyJwtAccessTokenService
from app.main import app
from tests.test_auth_service import StubRefreshTokenRepository, StubUserRepository


@pytest.fixture
def client() -> TestClient:
    hasher = BcryptPasswordHasher()
    uid = str(uuid.uuid4())
    user = User(id=uid, user_name="pitchuser", phone="+5511999999999", role=UserRole.ORGANIZER)
    record = UserAuthRecord(user=user, password_hash=hasher.hash("secret99"))
    stub = StubRefreshTokenRepository()
    svc = AuthService(
        users=StubUserRepository(record),
        passwords=hasher,
        tokens=PyJwtAccessTokenService(
            secret="z" * 64,
            algorithm="HS256",
            expires_minutes=60,
        ),
        refresh_tokens=stub,
        refresh_pepper="players-http-test-pepper",
        refresh_expires_days=7,
    )
    app.dependency_overrides[get_auth_service] = lambda: svc
    app.dependency_overrides[get_writable_db] = lambda: MagicMock()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(get_auth_service, None)
    app.dependency_overrides.pop(get_writable_db, None)


def _login(c: TestClient) -> None:
    r = c.post("/api/v1/auth/login", json={"user_name": "pitchuser", "password": "secret99"})
    assert r.status_code == 200


def test_players_crud_flow(client: TestClient) -> None:
    _login(client)

    empty = client.get("/api/v1/players")
    assert empty.status_code == 200
    assert empty.json() == []

    create = client.post(
        "/api/v1/players",
        json={
            "display_name": "Zé Goleiro",
            "skill_stars": 4.0,
            "profile": "defense",
            "position": "GR",
            "active": True,
        },
    )
    assert create.status_code == 201
    body = create.json()
    assert body["display_name"] == "Zé Goleiro"
    assert body["skill_stars"] == 4.0
    assert body["profile"] == "defense"
    pid = body["id"]

    listed = client.get("/api/v1/players")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    patch = client.patch(
        f"/api/v1/players/{pid}",
        json={"display_name": "Zé", "skill_stars": 4.5},
    )
    assert patch.status_code == 200
    assert patch.json()["display_name"] == "Zé"
    assert patch.json()["skill_stars"] == 4.5

    deleted = client.delete(f"/api/v1/players/{pid}")
    assert deleted.status_code == 204

    again = client.get("/api/v1/players")
    assert again.status_code == 200
    assert again.json() == []


def test_players_list_includes_inactive(client: TestClient) -> None:
    _login(client)
    r = client.post(
        "/api/v1/players",
        json={
            "display_name": "Inativo",
            "skill_stars": 2.0,
            "profile": "mixed",
            "active": False,
        },
    )
    assert r.status_code == 201
    pid = r.json()["id"]

    active_only = client.get("/api/v1/players?active_only=true")
    assert active_only.status_code == 200
    assert active_only.json() == []

    all_rows = client.get("/api/v1/players?active_only=false")
    assert all_rows.status_code == 200
    assert len(all_rows.json()) == 1
    assert all_rows.json()[0]["id"] == pid
