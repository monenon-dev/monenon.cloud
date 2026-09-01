"""daily_briefings.pending_review · user_notification_settings.briefing_validator_mode

Revision ID: 20260816_briefing_val_review
Revises: 20260815_proactive_watcher
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "20260816_briefing_val_review"
down_revision: Union[str, Sequence[str], None] = "20260815_proactive_watcher"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "daily_briefings",
        sa.Column("pending_review", JSONB, nullable=True),
    )
    op.add_column(
        "user_notification_settings",
        sa.Column(
            "briefing_validator_mode",
            sa.String(length=16),
            nullable=False,
            server_default="auto",
        ),
    )


def downgrade() -> None:
    op.drop_column("user_notification_settings", "briefing_validator_mode")
    op.drop_column("daily_briefings", "pending_review")
