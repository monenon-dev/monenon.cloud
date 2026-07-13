from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.matrix.grid_oracle_database_manager import Base
from models.int_id_mixin import IntIdPrimaryKeyMixin


class MoneyballPlayerOrm(IntIdPrimaryKeyMixin, Base):
    __tablename__ = "moneyball_player"

    player_id: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    player_name: Mapped[str | None] = mapped_column(String(20), nullable=True)
    e_player_name: Mapped[str | None] = mapped_column(String(40), nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(30), nullable=True)
    join_yyyy: Mapped[str | None] = mapped_column(String(10), nullable=True)
    position: Mapped[str | None] = mapped_column(String(10), nullable=True)
    back_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nation: Mapped[str | None] = mapped_column(String(20), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    solar: Mapped[str | None] = mapped_column(String(10), nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_id: Mapped[str | None] = mapped_column(
        String(10),
        ForeignKey("moneyball_team.team_id"),
        nullable=True,
    )
