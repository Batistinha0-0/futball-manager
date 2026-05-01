"""Sessão: histórico de assinaturas de sorteio (evitar repetir a mesma escalação).

Revision ID: 008
Revises: 007
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("match_day_sessions", sa.Column("draw_signatures_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("match_day_sessions", "draw_signatures_json")
