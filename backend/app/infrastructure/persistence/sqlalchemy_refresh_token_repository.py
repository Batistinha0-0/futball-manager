from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.refresh_token_row import RefreshTokenRow
from app.ports.refresh_token_repository import RefreshTokenRepository


class SqlAlchemyRefreshTokenRepository(RefreshTokenRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, *, user_id: UUID, token_hash: str, expires_at: datetime) -> UUID:
        now = datetime.now(timezone.utc)
        row = RefreshTokenRow(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            revoked_at=None,
            created_at=now,
        )
        self._session.add(row)
        self._session.flush()
        return row.id

    def find_active_by_token_hash(self, token_hash: str) -> tuple[UUID, UUID] | None:
        now = datetime.now(timezone.utc)
        row = self._session.scalar(
            select(RefreshTokenRow).where(
                RefreshTokenRow.token_hash == token_hash,
                RefreshTokenRow.revoked_at.is_(None),
                RefreshTokenRow.expires_at > now,
            )
        )
        if row is None:
            return None
        return (row.id, row.user_id)

    def revoke_by_id(self, token_id: UUID) -> None:
        now = datetime.now(timezone.utc)
        row = self._session.get(RefreshTokenRow, token_id)
        if row is None or row.revoked_at is not None:
            return
        row.revoked_at = now

    def revoke_all_for_user(self, user_id: UUID) -> None:
        now = datetime.now(timezone.utc)
        self._session.execute(
            update(RefreshTokenRow)
            .where(
                RefreshTokenRow.user_id == user_id,
                RefreshTokenRow.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )

    def revoke_unrevoked_by_token_hash(self, token_hash: str) -> None:
        now = datetime.now(timezone.utc)
        self._session.execute(
            update(RefreshTokenRow)
            .where(
                RefreshTokenRow.token_hash == token_hash,
                RefreshTokenRow.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
