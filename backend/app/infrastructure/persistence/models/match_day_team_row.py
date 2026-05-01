import uuid

from sqlalchemy import ForeignKey, SmallInteger
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class MatchDayTeamRow(Base):
    __tablename__ = "match_day_teams"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("match_day_sessions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    slot: Mapped[int] = mapped_column(SmallInteger(), primary_key=True)
    player_ids: Mapped[list] = mapped_column(JSONB, nullable=False)
