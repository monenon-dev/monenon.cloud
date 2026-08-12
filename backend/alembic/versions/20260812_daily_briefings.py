"""daily_briefings 테이블 생성

Revision ID: 20260812_daily_briefings
Revises: 20260713_moneyball
Create Date: 2026-08-12
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260812_daily_briefings"
down_revision: Union[str, Sequence[str], None] = "20260713_moneyball"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_briefings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("briefing_date", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "tool_logs",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "briefing_date", name="uq_daily_briefings_user_date"),
    )
    op.create_index(
        "ix_daily_briefings_user_id",
        "daily_briefings",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_daily_briefings_briefing_date",
        "daily_briefings",
        ["briefing_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_daily_briefings_briefing_date", table_name="daily_briefings")
    op.drop_index("ix_daily_briefings_user_id", table_name="daily_briefings")
    op.drop_table("daily_briefings")
