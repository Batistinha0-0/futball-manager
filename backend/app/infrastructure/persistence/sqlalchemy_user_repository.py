from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.user import User, UserAuthRecord, UserRole
from app.infrastructure.persistence.models.user_row import UserRow


def _to_domain(row: UserRow) -> User:
    return User(
        id=str(row.id),
        user_name=row.user_name,
        phone=row.phone,
        role=UserRole(row.role),
    )


class SqlAlchemyUserRepository:
    """PostgreSQL-backed users."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_auth_record_by_username(self, user_name: str) -> UserAuthRecord | None:
        row = self._session.scalar(select(UserRow).where(UserRow.user_name == user_name))
        if row is None:
            return None
        user = _to_domain(row)
        return UserAuthRecord(user=user, password_hash=row.password_hash)

    def get_by_id(self, user_id: UUID) -> User | None:
        row = self._session.get(UserRow, user_id)
        return _to_domain(row) if row else None

    def create(
        self,
        *,
        user_name: str,
        phone: str,
        role: UserRole,
        password_hash: str,
    ) -> User:
        now = datetime.now(timezone.utc)
        row = UserRow(
            user_name=user_name,
            phone=phone,
            role=role.value,
            password_hash=password_hash,
            created_at=now,
            updated_at=now,
        )
        self._session.add(row)
        self._session.flush()
        return _to_domain(row)

    def list_all(self) -> list[User]:
        rows = self._session.scalars(select(UserRow).order_by(UserRow.user_name.asc())).all()
        return [_to_domain(r) for r in rows]

    def update(
        self,
        user_id: UUID,
        *,
        user_name: str | None = None,
        phone: str | None = None,
        role: UserRole | None = None,
        password_hash: str | None = None,
    ) -> User | None:
        row = self._session.get(UserRow, user_id)
        if row is None:
            return None
        now = datetime.now(timezone.utc)
        if user_name is not None:
            row.user_name = user_name
        if phone is not None:
            row.phone = phone
        if role is not None:
            row.role = role.value
        if password_hash is not None:
            row.password_hash = password_hash
        row.updated_at = now
        self._session.flush()
        return _to_domain(row)

    def delete_by_id(self, user_id: UUID) -> bool:
        row = self._session.get(UserRow, user_id)
        if row is None:
            return False
        self._session.delete(row)
        self._session.flush()
        return True
