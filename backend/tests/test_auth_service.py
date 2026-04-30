import uuid
from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest

from app.application.auth.auth_service import AuthService
from app.domain.exceptions import AuthenticationError
from app.domain.user import User, UserAuthRecord, UserRole
from app.infrastructure.security.bcrypt_password_hasher import BcryptPasswordHasher
from app.infrastructure.security.pyjwt_access_token_service import PyJwtAccessTokenService


class StubUserRepository:
    def __init__(self, record: UserAuthRecord | None) -> None:
        self._record = record

    def get_auth_record_by_username(self, user_name: str) -> UserAuthRecord | None:
        if self._record is not None and self._record.user.user_name == user_name:
            return self._record
        return None

    def get_by_id(self, user_id: UUID) -> User | None:
        if self._record is not None and UUID(self._record.user.id) == user_id:
            return self._record.user
        return None

    def create(
        self,
        *,
        user_name: str,
        phone: str,
        role: UserRole,
        password_hash: str,
    ) -> User:
        raise NotImplementedError

    def list_all(self) -> list[User]:
        if self._record is not None:
            return [self._record.user]
        return []

    def update(
        self,
        user_id: UUID,
        *,
        user_name: str | None = None,
        phone: str | None = None,
        role: UserRole | None = None,
        password_hash: str | None = None,
    ) -> User | None:
        return None

    def delete_by_id(self, user_id: UUID) -> bool:
        return False


class StubRefreshTokenRepository:
    def __init__(self) -> None:
        self.revoked_all_users: list[UUID] = []
        self.revoked_ids: list[UUID] = []
        self._rows: list[dict] = []

    def create(self, *, user_id: UUID, token_hash: str, expires_at: datetime) -> UUID:
        tid = uuid.uuid4()
        self._rows.append(
            {
                "id": tid,
                "user_id": user_id,
                "token_hash": token_hash,
                "revoked": False,
                "expires_at": expires_at,
            }
        )
        return tid

    def find_active_by_token_hash(self, token_hash: str) -> tuple[UUID, UUID] | None:
        now = datetime.now(timezone.utc)
        for r in self._rows:
            if r["token_hash"] == token_hash and not r["revoked"] and r["expires_at"] > now:
                return (r["id"], r["user_id"])
        return None

    def revoke_by_id(self, token_id: UUID) -> None:
        self.revoked_ids.append(token_id)
        for r in self._rows:
            if r["id"] == token_id:
                r["revoked"] = True

    def revoke_all_for_user(self, user_id: UUID) -> None:
        self.revoked_all_users.append(user_id)
        for r in self._rows:
            if r["user_id"] == user_id:
                r["revoked"] = True

    def revoke_unrevoked_by_token_hash(self, token_hash: str) -> None:
        for r in self._rows:
            if r["token_hash"] == token_hash and not r["revoked"]:
                r["revoked"] = True


def _auth_service(
    jwt_tokens: PyJwtAccessTokenService,
    record: UserAuthRecord | None,
    *,
    refresh_stub: StubRefreshTokenRepository | None = None,
    pepper: str = "unit-test-pepper",
) -> tuple[AuthService, StubRefreshTokenRepository]:
    hasher = BcryptPasswordHasher()
    stub = refresh_stub or StubRefreshTokenRepository()
    svc = AuthService(
        users=StubUserRepository(record),
        passwords=hasher,
        tokens=jwt_tokens,
        refresh_tokens=stub,
        refresh_pepper=pepper,
        refresh_expires_days=7,
    )
    return svc, stub


@pytest.fixture
def jwt_tokens() -> PyJwtAccessTokenService:
    return PyJwtAccessTokenService(
        secret="x" * 64,
        algorithm="HS256",
        expires_minutes=120,
    )


def test_login_and_resolve_roundtrip(jwt_tokens: PyJwtAccessTokenService) -> None:
    hasher = BcryptPasswordHasher()
    uid = str(uuid.uuid4())
    user = User(id=uid, user_name="organizer1", phone="+5511999999999", role=UserRole.ORGANIZER)
    record = UserAuthRecord(user=user, password_hash=hasher.hash("correct-horse"))
    svc, _stub = _auth_service(jwt_tokens, record)

    logged, token, refresh_raw = svc.login(user_name="organizer1", plain_password="correct-horse")
    assert logged.id == uid
    assert len(refresh_raw) > 20
    assert svc.resolve_user_from_token(token).user_name == "organizer1"


def test_login_rejects_bad_password(jwt_tokens: PyJwtAccessTokenService) -> None:
    hasher = BcryptPasswordHasher()
    uid = str(uuid.uuid4())
    user = User(id=uid, user_name="u2", phone="+5511888888888", role=UserRole.ADMIN)
    record = UserAuthRecord(user=user, password_hash=hasher.hash("secret"))
    svc, _stub = _auth_service(jwt_tokens, record)

    with pytest.raises(AuthenticationError) as excinfo:
        svc.login(user_name="u2", plain_password="wrong")
    assert excinfo.value.code == "invalid_credentials"


def test_login_unknown_user(jwt_tokens: PyJwtAccessTokenService) -> None:
    hasher = BcryptPasswordHasher()
    svc, _stub = _auth_service(jwt_tokens, None)
    with pytest.raises(AuthenticationError):
        svc.login(user_name="nobody", plain_password="x")


def test_exchange_refresh_rotates_and_issues_new_access(jwt_tokens: PyJwtAccessTokenService) -> None:
    hasher = BcryptPasswordHasher()
    uid = str(uuid.uuid4())
    user = User(id=uid, user_name="r1", phone="+5511666666666", role=UserRole.ORGANIZER)
    record = UserAuthRecord(user=user, password_hash=hasher.hash("pw"))
    svc, stub = _auth_service(jwt_tokens, record)

    _u, access1, refresh1 = svc.login(user_name="r1", plain_password="pw")
    u2, access2, refresh2 = svc.exchange_refresh(refresh_raw=refresh1)
    assert u2.user_name == "r1"
    assert access2 != access1
    assert refresh2 != refresh1
    assert len(stub.revoked_ids) == 1
    with pytest.raises(AuthenticationError):
        svc.exchange_refresh(refresh_raw=refresh1)


def test_logout_revokes_all_when_access_valid(jwt_tokens: PyJwtAccessTokenService) -> None:
    hasher = BcryptPasswordHasher()
    uid = str(uuid.uuid4())
    user = User(id=uid, user_name="lo", phone="+5511555555555", role=UserRole.ADMIN)
    record = UserAuthRecord(user=user, password_hash=hasher.hash("pw"))
    svc, stub = _auth_service(jwt_tokens, record)

    _u, access, refresh_raw = svc.login(user_name="lo", plain_password="pw")
    svc.logout(access_token=access, refresh_raw=refresh_raw)
    assert stub.revoked_all_users == [UUID(uid)]
    assert all(r["revoked"] for r in stub._rows)
