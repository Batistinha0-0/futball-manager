from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID


class RefreshTokenRepository(ABC):
    """Opaque refresh tokens persisted as peppered hashes."""

    @abstractmethod
    def create(self, *, user_id: UUID, token_hash: str, expires_at: datetime) -> UUID:
        """Insert a new refresh row; returns its id."""

    @abstractmethod
    def find_active_by_token_hash(self, token_hash: str) -> tuple[UUID, UUID] | None:
        """Return (refresh_token_id, user_id) if hash matches a non-revoked, non-expired row."""

    @abstractmethod
    def revoke_by_id(self, token_id: UUID) -> None:
        """Mark a single row revoked if not already."""

    @abstractmethod
    def revoke_all_for_user(self, user_id: UUID) -> None:
        """Revoke every active refresh row for the user."""

    @abstractmethod
    def revoke_unrevoked_by_token_hash(self, token_hash: str) -> None:
        """Revoke any still-active row with this hash (logout with refresh cookie only)."""
