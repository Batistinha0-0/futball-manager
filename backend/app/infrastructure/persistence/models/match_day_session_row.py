import uuid
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.database import Base


class MatchDaySessionRow(Base):
    __tablename__ = "match_day_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_date: Mapped[date] = mapped_column(Date(), nullable=False, unique=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False)
    phase: Mapped[str] = mapped_column(String(32), nullable=False)
    default_match_duration_seconds: Mapped[int] = mapped_column(Integer(), nullable=False)
    default_max_goals_per_team: Mapped[int] = mapped_column(Integer(), nullable=False)
    reference_start_time: Mapped[time | None] = mapped_column(Time(), nullable=True)
    team_count: Mapped[int] = mapped_column(Integer(), nullable=False, default=2)
    players_per_team: Mapped[int] = mapped_column(Integer(), nullable=False, default=5)
    fixed_goalkeepers_enabled: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    fixed_goalkeeper_player_id_1: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="SET NULL"),
        nullable=True,
    )
    fixed_goalkeeper_player_id_2: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    draft_teams_json: Mapped[str | None] = mapped_column(Text(), nullable=True)
    lineup_committed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    draw_signatures_json: Mapped[str | None] = mapped_column(Text(), nullable=True)
    king_state_json: Mapped[str | None] = mapped_column(Text(), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    day_summary_json: Mapped[str | None] = mapped_column(Text(), nullable=True)
    partida_board_unlocked: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
