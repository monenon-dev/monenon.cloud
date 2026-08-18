"""user_notification_settings: 브리핑 시각·밀집 민감도·활성 시간대

Revision ID: 20260819_notification_prefs
Revises: 20260818_briefing_user_notes
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260819_notification_prefs"
down_revision: Union[str, Sequence[str], None] = "20260818_briefing_user_notes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_notification_settings",
        sa.Column("briefing_hour", sa.Integer(), nullable=False, server_default="7"),
    )
    op.add_column(
        "user_notification_settings",
        sa.Column("briefing_minute", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "user_notification_settings",
        sa.Column("density_threshold", sa.Integer(), nullable=False, server_default="3"),
    )
    op.add_column(
        "user_notification_settings",
        sa.Column("active_hours_start", sa.Integer(), nullable=False, server_default="8"),
    )
    op.add_column(
        "user_notification_settings",
        sa.Column("active_hours_end", sa.Integer(), nullable=False, server_default="20"),
    )


def downgrade() -> None:
    op.drop_column("user_notification_settings", "active_hours_end")
    op.drop_column("user_notification_settings", "active_hours_start")
    op.drop_column("user_notification_settings", "density_threshold")
    op.drop_column("user_notification_settings", "briefing_minute")
    op.drop_column("user_notification_settings", "briefing_hour")
