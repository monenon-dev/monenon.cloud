"""daily_briefings 알림 발송 기록 컬럼 추가

Revision ID: 20260814_daily_briefings_notify
Revises: 20260813_user_integrations
Create Date: 2026-08-14
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260814_daily_briefings_notify"
down_revision: Union[str, Sequence[str], None] = "20260813_user_integrations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "daily_briefings",
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "daily_briefings",
        sa.Column("notification_channel", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("daily_briefings", "notification_channel")
    op.drop_column("daily_briefings", "notified_at")
