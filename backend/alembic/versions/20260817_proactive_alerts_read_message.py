"""proactive_alerts.read_at · message 컬럼

Revision ID: 20260817_proactive_alerts_read
Revises: 20260816_briefing_val_review
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260817_proactive_alerts_read"
down_revision: Union[str, Sequence[str], None] = "20260816_briefing_val_review"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "proactive_alerts",
        sa.Column("message", sa.Text(), nullable=True),
    )
    op.add_column(
        "proactive_alerts",
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("proactive_alerts", "read_at")
    op.drop_column("proactive_alerts", "message")
