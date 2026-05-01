"""match day session, teams, fixtures, events

Revision ID: 004
Revises: 003
Create Date: 2026-05-01

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "match_day_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("phase", sa.String(length=32), nullable=False, server_default=sa.text("'pre_match'")),
        sa.Column("default_match_duration_seconds", sa.Integer(), nullable=False, server_default=sa.text("420")),
        sa.Column("default_max_goals_per_team", sa.Integer(), nullable=False, server_default=sa.text("2")),
        sa.Column("reference_start_time", sa.Time(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_date", name="uq_match_day_sessions_session_date"),
    )
    op.create_table(
        "match_day_teams",
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("match_day_sessions.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("slot", sa.SmallInteger(), primary_key=True, nullable=False),
        sa.Column("player_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    )
    op.create_table(
        "match_day_fixtures",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("match_day_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("home_team_slot", sa.SmallInteger(), nullable=False),
        sa.Column("away_team_slot", sa.SmallInteger(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("home_goals", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("away_goals", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("max_goals_per_team", sa.Integer(), nullable=False),
        sa.UniqueConstraint("session_id", "order_index", name="uq_match_day_fixtures_session_order"),
    )
    op.create_table(
        "match_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "fixture_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("match_day_fixtures.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column(
            "player_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("players.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("team_slot", sa.SmallInteger(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("elapsed_seconds", sa.Integer(), nullable=True),
    )
    op.create_index("ix_match_events_fixture_id", "match_events", ["fixture_id"])


def downgrade() -> None:
    op.drop_index("ix_match_events_fixture_id", table_name="match_events")
    op.drop_table("match_events")
    op.drop_table("match_day_fixtures")
    op.drop_table("match_day_teams")
    op.drop_table("match_day_sessions")
