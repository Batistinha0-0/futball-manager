from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.player import Player, PlayerProfile
from app.infrastructure.persistence.models.player_row import PlayerRow


def _to_domain(row: PlayerRow) -> Player:
    return Player(
        id=str(row.id),
        display_name=row.display_name,
        skill_stars=float(row.skill_stars) if row.skill_stars is not None else None,
        profile=PlayerProfile(row.profile),
        position=row.position,
        active=row.active,
        created_by_user_id=str(row.created_by_user_id) if row.created_by_user_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class SqlAlchemyPlayerRepository:
    """PostgreSQL-backed players (implements PlayerRepository port)."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_players(self, *, active_only: bool = True) -> list[Player]:
        stmt = select(PlayerRow).order_by(PlayerRow.display_name)
        if active_only:
            stmt = stmt.where(PlayerRow.active.is_(True))
        rows = self._session.scalars(stmt).all()
        return [_to_domain(r) for r in rows]

    def get_by_id(self, player_id: str) -> Player | None:
        try:
            key = UUID(player_id)
        except ValueError:
            return None
        row = self._session.get(PlayerRow, key)
        return _to_domain(row) if row else None

    def create(self, player: Player) -> Player:
        now = datetime.now(timezone.utc)
        created_at = player.created_at or now
        updated_at = player.updated_at or now
        uid = UUID(player.id)
        created_by = UUID(player.created_by_user_id) if player.created_by_user_id else None
        row = PlayerRow(
            id=uid,
            display_name=player.display_name,
            skill_stars=player.skill_stars,
            profile=player.profile.value,
            position=player.position,
            active=player.active,
            created_by_user_id=created_by,
            created_at=created_at,
            updated_at=updated_at,
        )
        self._session.add(row)
        self._session.flush()
        return _to_domain(row)

    def update(self, player: Player) -> None:
        try:
            key = UUID(player.id)
        except ValueError:
            return
        row = self._session.get(PlayerRow, key)
        if row is None:
            return
        now = datetime.now(timezone.utc)
        row.display_name = player.display_name
        row.skill_stars = player.skill_stars
        row.profile = player.profile.value
        row.position = player.position
        row.active = player.active
        row.updated_at = now

    def delete(self, player_id: str) -> bool:
        try:
            key = UUID(player_id)
        except ValueError:
            return False
        row = self._session.get(PlayerRow, key)
        if row is None:
            return False
        self._session.delete(row)
        return True
