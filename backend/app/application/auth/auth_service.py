import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.domain.exceptions import AuthenticationError
from app.domain.user import User
from app.infrastructure.security.refresh_token_hash import hash_refresh_token
from app.ports.jwt_access_token import JwtAccessTokenService
from app.ports.password_hasher import PasswordHasher
from app.ports.refresh_token_repository import RefreshTokenRepository
from app.ports.user_repository import UserRepository


class AuthService:
    """Login, refresh rotation, token-backed session resolution."""

    def __init__(
        self,
        *,
        users: UserRepository,
        passwords: PasswordHasher,
        tokens: JwtAccessTokenService,
        refresh_tokens: RefreshTokenRepository,
        refresh_pepper: str,
        refresh_expires_days: int,
    ) -> None:
        self._users = users
        self._passwords = passwords
        self._tokens = tokens
        self._refresh_tokens = refresh_tokens
        self._refresh_pepper = refresh_pepper
        self._refresh_expires_days = refresh_expires_days

    def login(self, *, user_name: str, plain_password: str) -> tuple[User, str, str]:
        record = self._users.get_auth_record_by_username(user_name)
        if record is None or not self._passwords.verify(plain_password, record.password_hash):
            raise AuthenticationError("invalid_credentials", "Invalid username or password.")
        user_id = UUID(record.user.id)
        access = self._tokens.issue(
            user_id=record.user.id,
            user_name=record.user.user_name,
            role=record.user.role.value,
        )
        refresh_raw = secrets.token_urlsafe(48)
        token_hash = hash_refresh_token(refresh_raw, self._refresh_pepper)
        expires_at = self._refresh_expires_at()
        self._refresh_tokens.create(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        return record.user, access, refresh_raw

    def exchange_refresh(self, *, refresh_raw: str) -> tuple[User, str, str]:
        token_hash = hash_refresh_token(refresh_raw, self._refresh_pepper)
        found = self._refresh_tokens.find_active_by_token_hash(token_hash)
        if found is None:
            raise AuthenticationError("invalid_refresh", "Invalid or expired refresh session.")
        token_id, user_id = found
        user = self._users.get_by_id(user_id)
        if user is None:
            raise AuthenticationError("invalid_refresh", "User not found.")
        self._refresh_tokens.revoke_by_id(token_id)
        new_raw = secrets.token_urlsafe(48)
        new_hash = hash_refresh_token(new_raw, self._refresh_pepper)
        self._refresh_tokens.create(user_id=user_id, token_hash=new_hash, expires_at=self._refresh_expires_at())
        access = self._tokens.issue(
            user_id=user.id,
            user_name=user.user_name,
            role=user.role.value,
        )
        return user, access, new_raw

    def logout(self, *, access_token: str | None, refresh_raw: str | None) -> None:
        if refresh_raw:
            h = hash_refresh_token(refresh_raw, self._refresh_pepper)
            self._refresh_tokens.revoke_unrevoked_by_token_hash(h)
        if access_token:
            try:
                user = self.resolve_user_from_token(access_token)
                self._refresh_tokens.revoke_all_for_user(UUID(user.id))
            except AuthenticationError:
                pass

    def resolve_user_from_token(self, token: str) -> User:
        claims = self._tokens.verify(token)
        user = self._users.get_by_id(UUID(claims.sub))
        if user is None:
            raise AuthenticationError("invalid_token", "User not found.")
        return user

    def _refresh_expires_at(self) -> datetime:
        return datetime.now(timezone.utc) + timedelta(days=self._refresh_expires_days)
