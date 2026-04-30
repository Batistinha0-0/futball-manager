from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.player import Player, PlayerProfile
from app.infrastructure.persistence.models.player_row import PlayerRow


def _to_domain(row: PlayerRow) -> Player:
    return Player(
        id=str(row.id),
        display_name=row.display_name,
        skill_stars=float(row.skill_stars),
        profile=PlayerProfile(row.profile),
        position=row.position,
        active=row.active,
        created_by_user_id=str(row.created_by_user_id) if row.created_by_user_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class SqlAlchemyPlayerRepository:
    """PostgreSQL-backed player list (implements PlayerRepository port)."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_players(self, *, active_only: bool = True) -> list[Player]:
        stmt = select(PlayerRow).order_by(PlayerRow.display_name)
        if active_only:
            stmt = stmt.where(PlayerRow.active.is_(True))
        rows = self._session.scalars(stmt).all()
        return [_to_domain(r) for r in rows]
