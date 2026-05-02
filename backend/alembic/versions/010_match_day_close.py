"""Encerramento do dia: sessão fechada + stats agregadas por jogador.

Revision ID: 010
Revises: 009
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "match_day_sessions",
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "match_day_sessions",
        sa.Column("day_summary_json", sa.Text(), nullable=True),
    )
    op.create_table(
        "player_match_day_stats",
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
        sa.Column(
            "player_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("players.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("goals", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("assists", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("goalkeeper_saves", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("yellow_cards", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("red_cards", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("fixtures_played", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.UniqueConstraint("session_id", "player_id", name="uq_player_match_day_stats_session_player"),
    )
    op.create_index(
        "ix_player_match_day_stats_player_id",
        "player_match_day_stats",
        ["player_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_player_match_day_stats_player_id", table_name="player_match_day_stats")
    op.drop_table("player_match_day_stats")
    op.drop_column("match_day_sessions", "day_summary_json")
    op.drop_column("match_day_sessions", "closed_at")
