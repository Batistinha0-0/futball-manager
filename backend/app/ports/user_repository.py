from typing import Protocol
from uuid import UUID

from app.domain.user import User, UserAuthRecord, UserRole


class UserRepository(Protocol):
    """Persistence port for organizer accounts."""

    def get_auth_record_by_username(self, user_name: str) -> UserAuthRecord | None:
        """Return user plus password hash for credential verification, or None if unknown."""
        ...

    def get_by_id(self, user_id: UUID) -> User | None:
        ...

    def create(
        self,
        *,
        user_name: str,
        phone: str,
        role: UserRole,
        password_hash: str,
    ) -> User:
        """Persist a new user (password must already be hashed)."""
        ...

    def list_all(self) -> list[User]:
        """All users ordered by user_name (no password material)."""
        ...

    def update(
        self,
        user_id: UUID,
        *,
        user_name: str | None = None,
        phone: str | None = None,
        role: UserRole | None = None,
        password_hash: str | None = None,
    ) -> User | None:
        """Apply non-None fields; returns domain user or None if id missing."""
        ...

    def delete_by_id(self, user_id: UUID) -> bool:
        """Remove user row; returns False if not found."""
        ...
