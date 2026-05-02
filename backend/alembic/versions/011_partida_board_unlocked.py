"""Sessão: desbloquear UI da aba Partida só após apito (segurar) na Início.

Revision ID: 011
Revises: 010
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "match_day_sessions",
        sa.Column(
            "partida_board_unlocked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # Sessões já em jogo ou encerradas: manter acesso à Partida como antes da funcionalidade.
    op.execute(
        """
        UPDATE match_day_sessions s
        SET partida_board_unlocked = true
        WHERE s.phase IN ('live', 'closed')
           OR EXISTS (
               SELECT 1 FROM match_day_fixtures f
               WHERE f.session_id = s.id AND f.status IN ('live', 'finished')
           )
        """
    )


def downgrade() -> None:
    op.drop_column("match_day_sessions", "partida_board_unlocked")
