"""Listagem de sessões recentes e query session_date em GET today."""

import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.deps import _memory_repo_singleton, get_auth_service, get_match_day_service, get_writable_db
from app.application.auth.auth_service import AuthService
from app.application.matchday.match_day_service import MatchDayService
from app.core.config import get_settings
from app.domain.user import User, UserAuthRecord, UserRole
from app.infrastructure.persistence.memory_match_day_repository import MemoryMatchDayRepository
from app.infrastructure.security.bcrypt_password_hasher import BcryptPasswordHasher
from app.infrastructure.security.pyjwt_access_token_service import PyJwtAccessTokenService
from app.main import app
from tests.test_auth_service import StubRefreshTokenRepository, StubUserRepository


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as c:
        yield c


def _login_organizer(client: TestClient, match_day_repo: MemoryMatchDayRepository) -> None:
    hasher = BcryptPasswordHasher()
    uid = str(uuid.uuid4())
    user = User(id=uid, user_name="recent_sess_user", phone="+5511888888888", role=UserRole.ORGANIZER)
    record = UserAuthRecord(user=user, password_hash=hasher.hash("secret88"))
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
        refresh_pepper="recent-sess-test-pepper",
        refresh_expires_days=7,
    )
    app.dependency_overrides[get_auth_service] = lambda: svc
    app.dependency_overrides[get_writable_db] = lambda: MagicMock()
    app.dependency_overrides[get_match_day_service] = lambda: MatchDayService(
        settings=get_settings(),
        match_days=match_day_repo,
        players=_memory_repo_singleton(),
    )
    r = client.post("/api/v1/auth/login", json={"user_name": "recent_sess_user", "password": "secret88"})
    assert r.status_code == 200


def test_recent_sessions_empty_then_one_after_settings(client: TestClient) -> None:
    match_day_repo = MemoryMatchDayRepository()
    _login_organizer(client, match_day_repo)
    try:
        empty = client.get("/api/v1/match-day/recent-sessions")
        assert empty.status_code == 200
        assert empty.json() == []

        p = client.patch(
            "/api/v1/match-day/today/settings",
            json={"team_count": 2, "players_per_team": 5, "default_match_duration_seconds": 420},
        )
        assert p.status_code == 200, p.text
        sd = p.json()["session"]["session_date"]

        lst = client.get("/api/v1/match-day/recent-sessions")
        assert lst.status_code == 200
        data = lst.json()
        assert len(data) == 1
        assert data[0]["session_date"] == sd
        assert data[0]["phase"] == "pre_match"
        assert "has_draft" in data[0]
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_writable_db, None)
        app.dependency_overrides.pop(get_match_day_service, None)


def test_get_today_session_date_future_returns_400(client: TestClient) -> None:
    match_day_repo = MemoryMatchDayRepository()
    _login_organizer(client, match_day_repo)
    try:
        r = client.get("/api/v1/match-day/today", params={"session_date": "2099-01-01"})
        assert r.status_code == 400
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_writable_db, None)
        app.dependency_overrides.pop(get_match_day_service, None)


def test_patch_settings_past_date_without_session_returns_400(client: TestClient) -> None:
    match_day_repo = MemoryMatchDayRepository()
    _login_organizer(client, match_day_repo)
    try:
        r = client.patch(
            "/api/v1/match-day/today/settings",
            params={"session_date": "2020-01-01"},
            json={"team_count": 2, "players_per_team": 5, "default_match_duration_seconds": 420},
        )
        assert r.status_code == 400
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_writable_db, None)
        app.dependency_overrides.pop(get_match_day_service, None)
