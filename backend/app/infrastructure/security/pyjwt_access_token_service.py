import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.domain.exceptions import AuthenticationError
from app.ports.jwt_access_token import JwtAccessTokenService, JwtClaims


class PyJwtAccessTokenService:
    """HS256 access tokens (JwtAccessTokenService port)."""

    def __init__(self, *, secret: str, algorithm: str, expires_minutes: int) -> None:
        self._secret = secret
        self._algorithm = algorithm
        self._expires_minutes = expires_minutes

    def issue(self, *, user_id: str, user_name: str, role: str) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": user_id,
            "un": user_name,
            "role": role,
            "iat": int(now.timestamp()),
            "exp": now + timedelta(minutes=self._expires_minutes),
            "jti": secrets.token_urlsafe(12),
        }
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)

    def verify(self, token: str) -> JwtClaims:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=[self._algorithm],
                options={"require": ["exp", "sub", "un", "role"]},
            )
        except jwt.PyJWTError as exc:
            raise AuthenticationError("invalid_token", str(exc)) from exc
        return JwtClaims(
            sub=str(payload["sub"]),
            user_name=str(payload["un"]),
            role=str(payload["role"]),
        )
