from __future__ import annotations

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.matrix.grid_oracle_database_manager import Base


class ContactOrm(Base):

    __tablename__ = "mycroft_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    name_prefix: Mapped[str | None] = mapped_column(String(20), nullable=True)
    name_suffix: Mapped[str | None] = mapped_column(String(20), nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(100), nullable=True)
    organization_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    organization_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    organization_department: Mapped[str | None] = mapped_column(String(200), nullable=True)
    birthday: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    labels: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email_1: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email_2: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone_1: Mapped[str | None] = mapped_column(String(200), nullable=True)
