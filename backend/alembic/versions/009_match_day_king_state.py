"""Sessão: estado JSON da fila de times (modo >2 times).

Revision ID: 009
Revises: 008
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "match_day_sessions",
        sa.Column("king_state_json", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("match_day_sessions", "king_state_json")
