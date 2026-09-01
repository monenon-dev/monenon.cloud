"""moneyball stadium·team·player·schedule 테이블 생성

Revision ID: 20260713_moneyball
Revises: 20260610_titanic
Create Date: 2026-07-13
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260713_moneyball"
down_revision: Union[str, Sequence[str], None] = "20260610_titanic"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "moneyball_stadium",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("stadium_id", sa.String(length=10), nullable=False),
        sa.Column("stadium_name", sa.String(length=40), nullable=True),
        sa.Column("hometeam_id", sa.String(length=10), nullable=True),
        sa.Column("seat_count", sa.Integer(), nullable=True),
        sa.Column("address", sa.String(length=60), nullable=True),
        sa.Column("ddd", sa.String(length=10), nullable=True),
        sa.Column("tel", sa.String(length=10), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stadium_id"),
    )

    op.create_table(
        "moneyball_team",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("team_id", sa.String(length=10), nullable=False),
        sa.Column("region_name", sa.String(length=10), nullable=True),
        sa.Column("team_name", sa.String(length=40), nullable=True),
        sa.Column("e_team_name", sa.String(length=50), nullable=True),
        sa.Column("orig_yyyy", sa.String(length=10), nullable=True),
        sa.Column("zip_code1", sa.String(length=10), nullable=True),
        sa.Column("zip_code2", sa.String(length=10), nullable=True),
        sa.Column("address", sa.String(length=80), nullable=True),
        sa.Column("ddd", sa.String(length=10), nullable=True),
        sa.Column("tel", sa.String(length=10), nullable=True),
        sa.Column("fax", sa.String(length=10), nullable=True),
        sa.Column("homepage", sa.String(length=50), nullable=True),
        sa.Column("owner", sa.String(length=10), nullable=True),
        sa.Column("stadium_id", sa.String(length=10), nullable=True),
        sa.ForeignKeyConstraint(["stadium_id"], ["moneyball_stadium.stadium_id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_id"),
    )

    op.create_table(
        "moneyball_player",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("player_id", sa.String(length=10), nullable=False),
        sa.Column("player_name", sa.String(length=20), nullable=True),
        sa.Column("e_player_name", sa.String(length=40), nullable=True),
        sa.Column("nickname", sa.String(length=30), nullable=True),
        sa.Column("join_yyyy", sa.String(length=10), nullable=True),
        sa.Column("position", sa.String(length=10), nullable=True),
        sa.Column("back_no", sa.Integer(), nullable=True),
        sa.Column("nation", sa.String(length=20), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("solar", sa.String(length=10), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("weight", sa.Integer(), nullable=True),
        sa.Column("team_id", sa.String(length=10), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["moneyball_team.team_id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("player_id"),
    )

    op.create_table(
        "moneyball_schedule",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sche_date", sa.String(length=10), nullable=False),
        sa.Column("stadium_id", sa.String(length=10), nullable=False),
        sa.Column("gubun", sa.String(length=10), nullable=True),
        sa.Column("hometeam_id", sa.String(length=10), nullable=True),
        sa.Column("awayteam_id", sa.String(length=10), nullable=True),
        sa.Column("home_score", sa.Integer(), nullable=True),
        sa.Column("away_score", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["stadium_id"], ["moneyball_stadium.stadium_id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sche_date", "stadium_id", name="uq_moneyball_schedule_sche_stadium"),
    )


def downgrade() -> None:
    op.drop_table("moneyball_schedule")
    op.drop_table("moneyball_player")
    op.drop_table("moneyball_team")
    op.drop_table("moneyball_stadium")
