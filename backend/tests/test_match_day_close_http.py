"""Encerramento do dia: isolado com repositório de match day em memória novo."""

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


def test_close_day_finishes_pending_and_returns_summary(client: TestClient) -> None:
    hasher = BcryptPasswordHasher()
    uid = str(uuid.uuid4())
    user = User(id=uid, user_name="close_day_user", phone="+5511999999999", role=UserRole.ORGANIZER)
    record = UserAuthRecord(user=user, password_hash=hasher.hash("secret99"))
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
        refresh_pepper="close-day-test-pepper",
        refresh_expires_days=7,
    )
    app.dependency_overrides[get_auth_service] = lambda: svc
    app.dependency_overrides[get_writable_db] = lambda: MagicMock()
    match_day_repo = MemoryMatchDayRepository()
    app.dependency_overrides[get_match_day_service] = lambda: MatchDayService(
        settings=get_settings(),
        match_days=match_day_repo,
        players=_memory_repo_singleton(),
    )
    try:
        r = client.post("/api/v1/auth/login", json={"user_name": "close_day_user", "password": "secret99"})
        assert r.status_code == 200

        suf = uuid.uuid4().hex[:8]
        for i in range(6):
            cr = client.post(
                "/api/v1/players",
                json={
                    "display_name": f"CD{suf}{i}",
                    "skill_stars": 3.0,
                    "profile": "mixed",
                    "position": "MC",
                    "active": True,
                },
            )
            assert cr.status_code == 201, cr.text

        p = client.patch(
            "/api/v1/match-day/today/settings",
            json={"team_count": 3, "players_per_team": 2, "default_match_duration_seconds": 420},
        )
        assert p.status_code == 200, p.text
        dr = client.post("/api/v1/match-day/today/draw")
        assert dr.status_code == 200, dr.text
        fid0 = dr.json()["session"]["fixtures"][0]["id"]
        assert client.post(f"/api/v1/match-day/today/fixtures/{fid0}/start").status_code == 200
        assert client.post(f"/api/v1/match-day/today/fixtures/{fid0}/finish").status_code == 200
        today = client.get("/api/v1/match-day/today").json()
        fxs = today["session"]["fixtures"]
        assert len(fxs) == 2
        assert sum(1 for f in fxs if f["status"] == "finished") == 1
        assert sum(1 for f in fxs if f["status"] == "pending") == 1

        close = client.post("/api/v1/match-day/today/close-day")
        assert close.status_code == 200, close.text
        sess = close.json()["session"]
        assert sess["phase"] == "closed"
        assert sess["closed_at"] is not None
        ds = sess["day_summary"]
        assert ds is not None
        assert len(ds["fixtures"]) == 2
        assert sum(1 for x in ds["fixtures"] if x["not_contested"]) == 1
        assert all(f["status"] == "finished" for f in sess["fixtures"])

        again = client.post("/api/v1/match-day/today/close-day")
        assert again.status_code == 400

        blocked = client.patch(
            "/api/v1/match-day/today/settings",
            json={"default_match_duration_seconds": 400},
        )
        assert blocked.status_code == 400
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_writable_db, None)
        app.dependency_overrides.pop(get_match_day_service, None)
