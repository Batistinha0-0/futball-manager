from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class JwtClaims:
    """Validated access-token payload."""

    sub: str
    user_name: str
    role: str


class JwtAccessTokenService(Protocol):
    """Issue and verify short-lived JWT access tokens."""

    def issue(self, *, user_id: str, user_name: str, role: str) -> str:
        ...

    def verify(self, token: str) -> JwtClaims:
        ...
