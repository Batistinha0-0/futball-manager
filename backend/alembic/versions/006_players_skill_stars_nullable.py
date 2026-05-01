"""players.skill_stars nullable (nível opcional no elenco).

Revision ID: 006
Revises: 005
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "players",
        "skill_stars",
        existing_type=sa.Numeric(3, 1),
        nullable=True,
    )


def downgrade() -> None:
    op.execute(sa.text("UPDATE players SET skill_stars = 0 WHERE skill_stars IS NULL"))
    op.alter_column(
        "players",
        "skill_stars",
        existing_type=sa.Numeric(3, 1),
        nullable=False,
    )
