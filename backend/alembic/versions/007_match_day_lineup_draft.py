"""Sessão: rascunho dos times + confirmação ao iniciar a partida.

Revision ID: 007
Revises: 006
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("match_day_sessions", sa.Column("draft_teams_json", sa.Text(), nullable=True))
    op.add_column(
        "match_day_sessions",
        sa.Column("lineup_committed_at", sa.DateTime(timezone=True), nullable=True),
    )
    bind = op.get_bind()
    if bind is not None and bind.dialect.name == "postgresql":
        op.execute(
            sa.text("""
                UPDATE match_day_sessions AS m
                SET lineup_committed_at = m.updated_at
                WHERE EXISTS (
                    SELECT 1 FROM match_day_teams t
                    WHERE t.session_id = m.id
                      AND jsonb_array_length(COALESCE(t.player_ids, '[]'::jsonb)) > 0
                )
            """)
        )


def downgrade() -> None:
    op.drop_column("match_day_sessions", "lineup_committed_at")
    op.drop_column("match_day_sessions", "draft_teams_json")
