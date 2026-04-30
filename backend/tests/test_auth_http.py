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
def auth_service_override() -> tuple[AuthService, StubRefreshTokenRepository]:
    hasher = BcryptPasswordHasher()
    uid = str(uuid.uuid4())
    user = User(id=uid, user_name="httpuser", phone="+5511777777777", role=UserRole.ORGANIZER)
    record = UserAuthRecord(user=user, password_hash=hasher.hash("pass1234"))
    stub = StubRefreshTokenRepository()
    svc = AuthService(
        users=StubUserRepository(record),
        passwords=hasher,
        tokens=PyJwtAccessTokenService(
            secret="y" * 64,
            algorithm="HS256",
            expires_minutes=60,
        ),
        refresh_tokens=stub,
        refresh_pepper="http-test-pepper",
        refresh_expires_days=7,
    )
    return svc, stub


@pytest.fixture
def client(auth_service_override: tuple[AuthService, StubRefreshTokenRepository]) -> TestClient:
    svc, _stub = auth_service_override
    app.dependency_overrides[get_auth_service] = lambda: svc
    app.dependency_overrides[get_writable_db] = lambda: MagicMock()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(get_auth_service, None)
    app.dependency_overrides.pop(get_writable_db, None)


def test_login_sets_two_http_only_cookies(client: TestClient) -> None:
    res = client.post(
        "/api/v1/auth/login",
        json={"user_name": "httpuser", "password": "pass1234"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["user_name"] == "httpuser"
    assert "players:read" in body["user"]["permissions"]
    assert res.cookies.get("fm_access") is not None and len(res.cookies.get("fm_access", "")) > 20
    assert res.cookies.get("fm_refresh") is not None and len(res.cookies.get("fm_refresh", "")) > 20


def test_me_with_cookie(client: TestClient) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"user_name": "httpuser", "password": "pass1234"},
    )
    assert login.status_code == 200
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["user_name"] == "httpuser"


def test_refresh_returns_user_and_rotates_cookies(client: TestClient) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"user_name": "httpuser", "password": "pass1234"},
    )
    assert login.status_code == 200
    old_refresh = login.cookies.get("fm_refresh")
    ref = client.post("/api/v1/auth/refresh")
    assert ref.status_code == 200
    assert ref.json()["user"]["user_name"] == "httpuser"
    new_refresh = ref.cookies.get("fm_refresh")
    assert new_refresh is not None and new_refresh != old_refresh


def test_refresh_without_cookie_is_401(client: TestClient) -> None:
    res = client.post("/api/v1/auth/refresh")
    assert res.status_code == 401


def test_logout_clears_cookies_and_me_unauthorized(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/login",
        json={"user_name": "httpuser", "password": "pass1234"},
    )
    out = client.post("/api/v1/auth/logout")
    assert out.status_code == 204
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 401


def test_logout_revokes_refresh_rows(
    client: TestClient,
    auth_service_override: tuple[AuthService, StubRefreshTokenRepository],
) -> None:
    _svc, stub = auth_service_override
    client.post(
        "/api/v1/auth/login",
        json={"user_name": "httpuser", "password": "pass1234"},
    )
    assert len(stub._rows) == 1 and not stub._rows[0]["revoked"]
    client.post("/api/v1/auth/logout")
    assert stub.revoked_all_users
    assert all(r["revoked"] for r in stub._rows)
