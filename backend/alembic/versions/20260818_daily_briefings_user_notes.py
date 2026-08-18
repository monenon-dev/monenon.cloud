"""daily_briefings.user_notes — 브리핑 추가 메모

Revision ID: 20260818_briefing_user_notes
Revises: 20260817_proactive_alerts_read
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260818_briefing_user_notes"
down_revision: Union[str, Sequence[str], None] = "20260817_proactive_alerts_read"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "daily_briefings",
        sa.Column(
            "user_notes",
            sa.Text(),
            nullable=False,
            server_default="",
        ),
    )


def downgrade() -> None:
    op.drop_column("daily_briefings", "user_notes")
