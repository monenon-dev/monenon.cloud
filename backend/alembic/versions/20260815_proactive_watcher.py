"""proactive_alerts · user_notification_settings 테이블

Revision ID: 20260815_proactive_watcher
Revises: 20260814_daily_briefings_notify
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260815_proactive_watcher"
down_revision: Union[str, Sequence[str], None] = "20260814_daily_briefings_notify"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "proactive_alerts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("alert_type", sa.String(length=32), nullable=False),
        sa.Column("trigger_key", sa.String(length=255), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_proactive_alerts_user_id", "proactive_alerts", ["user_id"])
    op.create_index("ix_proactive_alerts_alert_type", "proactive_alerts", ["alert_type"])
    op.create_index(
        "ix_proactive_alerts_user_trigger",
        "proactive_alerts",
        ["user_id", "trigger_key"],
    )

    op.create_table(
        "user_notification_settings",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "alert_calendar_density",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "alert_urgent_messages",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_notification_settings")
    op.drop_index("ix_proactive_alerts_user_trigger", table_name="proactive_alerts")
    op.drop_index("ix_proactive_alerts_alert_type", table_name="proactive_alerts")
    op.drop_index("ix_proactive_alerts_user_id", table_name="proactive_alerts")
    op.drop_table("proactive_alerts")
