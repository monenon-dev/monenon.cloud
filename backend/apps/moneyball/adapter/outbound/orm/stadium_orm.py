from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.matrix.grid_oracle_database_manager import Base
from models.int_id_mixin import IntIdPrimaryKeyMixin


class MoneyballStadiumOrm(IntIdPrimaryKeyMixin, Base):
    __tablename__ = "moneyball_stadium"

    stadium_id: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    stadium_name: Mapped[str | None] = mapped_column(String(40), nullable=True)
    hometeam_id: Mapped[str | None] = mapped_column(String(10), nullable=True)
    seat_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    address: Mapped[str | None] = mapped_column(String(60), nullable=True)
    ddd: Mapped[str | None] = mapped_column(String(10), nullable=True)
    tel: Mapped[str | None] = mapped_column(String(10), nullable=True)
