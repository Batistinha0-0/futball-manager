import uuid

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class PlayerMatchDayStatRow(Base):
    __tablename__ = "player_match_day_stats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("match_day_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="CASCADE"),
        nullable=False,
    )
    goals: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    assists: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    goalkeeper_saves: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    yellow_cards: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    red_cards: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    fixtures_played: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
