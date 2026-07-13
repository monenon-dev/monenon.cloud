from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.matrix.grid_oracle_database_manager import Base
from models.int_id_mixin import IntIdPrimaryKeyMixin


class MoneyballScheduleOrm(IntIdPrimaryKeyMixin, Base):
    __tablename__ = "moneyball_schedule"
    __table_args__ = (UniqueConstraint("sche_date", "stadium_id", name="uq_moneyball_schedule_sche_stadium"),)

    sche_date: Mapped[str] = mapped_column(String(10), nullable=False)
    stadium_id: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("moneyball_stadium.stadium_id"),
        nullable=False,
    )
    gubun: Mapped[str | None] = mapped_column(String(10), nullable=True)
    hometeam_id: Mapped[str | None] = mapped_column(String(10), nullable=True)
    awayteam_id: Mapped[str | None] = mapped_column(String(10), nullable=True)
    home_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
