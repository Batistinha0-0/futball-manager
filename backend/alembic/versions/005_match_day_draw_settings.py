"""match day session draw settings and fixed goalkeepers

Revision ID: 005
Revises: 004
Create Date: 2026-05-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "match_day_sessions",
        sa.Column("team_count", sa.Integer(), nullable=False, server_default=sa.text("2")),
    )
    op.add_column(
        "match_day_sessions",
        sa.Column("players_per_team", sa.Integer(), nullable=False, server_default=sa.text("5")),
    )
    op.add_column(
        "match_day_sessions",
        sa.Column("fixed_goalkeepers_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "match_day_sessions",
        sa.Column(
            "fixed_goalkeeper_player_id_1",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("players.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "match_day_sessions",
        sa.Column(
            "fixed_goalkeeper_player_id_2",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("players.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("match_day_sessions", "fixed_goalkeeper_player_id_2")
    op.drop_column("match_day_sessions", "fixed_goalkeeper_player_id_1")
    op.drop_column("match_day_sessions", "fixed_goalkeepers_enabled")
    op.drop_column("match_day_sessions", "players_per_team")
    op.drop_column("match_day_sessions", "team_count")
