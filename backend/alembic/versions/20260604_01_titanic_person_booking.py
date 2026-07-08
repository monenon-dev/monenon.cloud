"""titanic_person, titanic_booking 테이블 생성

Revision ID: 20260604_01
Revises:
Create Date: 2026-06-04
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260604_01"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "titanic_person",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("passenger_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("gender", sa.String(length=16), nullable=False),
        sa.Column("age", sa.Float(), nullable=True),
        sa.Column("sib_sp", sa.Integer(), nullable=False),
        sa.Column("parch", sa.Integer(), nullable=False),
        sa.Column("survived", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("passenger_id"),
    )
    op.create_index("ix_titanic_person_passenger_id", "titanic_person", ["passenger_id"])

    op.create_table(
        "titanic_booking",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("pclass", sa.Integer(), nullable=False),
        sa.Column("ticket", sa.String(length=64), nullable=False),
        sa.Column("fare", sa.Float(), nullable=False),
        sa.Column("cabin", sa.String(length=32), nullable=True),
        sa.Column("embarked", sa.String(length=16), nullable=True),
        sa.ForeignKeyConstraint(["person_id"], ["titanic_person.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("person_id"),
    )
    op.create_index("ix_titanic_booking_person_id", "titanic_booking", ["person_id"])


def downgrade() -> None:
    op.drop_index("ix_titanic_booking_person_id", table_name="titanic_booking")
    op.drop_table("titanic_booking")
    op.drop_index("ix_titanic_person_passenger_id", table_name="titanic_person")
    op.drop_table("titanic_person")
