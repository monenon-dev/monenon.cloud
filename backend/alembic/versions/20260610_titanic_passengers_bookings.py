"""titanic passengers·bookings 테이블 및 컬럼

Revision ID: 20260610_titanic
Revises:
Create Date: 2026-06-10
"""

from __future__ import annotations

from alembic import op

revision = "20260610_titanic"
down_revision = "20260604_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS passengers (
            id SERIAL PRIMARY KEY,
            passenger_id VARCHAR,
            name VARCHAR,
            gender VARCHAR,
            age VARCHAR,
            sib_sp VARCHAR,
            parch VARCHAR,
            survived VARCHAR
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            passenger_id VARCHAR,
            survived VARCHAR,
            pclass VARCHAR,
            ticket VARCHAR,
            fare VARCHAR,
            cabin VARCHAR,
            embarked VARCHAR
        )
        """
    )
    for stmt in (
        "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS passenger_id VARCHAR",
        "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS name VARCHAR",
        "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS gender VARCHAR",
        "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS age VARCHAR",
        "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS sib_sp VARCHAR",
        "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS parch VARCHAR",
        "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS survived VARCHAR",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passenger_id VARCHAR",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS survived VARCHAR",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pclass VARCHAR",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket VARCHAR",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fare VARCHAR",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cabin VARCHAR",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS embarked VARCHAR",
    ):
        op.execute(stmt)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS bookings CASCADE")
    op.execute("DROP TABLE IF EXISTS passengers CASCADE")
