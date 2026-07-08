"""라이프스타일 테이블 — 선호도, 옷장, 냉장고, 음악."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from core.matrix.grid_oracle_database_manager import Base
from models.int_id_mixin import IntIdPrimaryKeyMixin


class UserSetting(IntIdPrimaryKeyMixin, Base):
    """사용자 설정 — 언어, 선호 AI 모델."""

    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    language: Mapped[str] = mapped_column(String(16), default="ko", nullable=False)
    preferred_model: Mapped[str] = mapped_column(String(64), default="gemini-2.5-flash-lite")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Closet(IntIdPrimaryKeyMixin, Base):
    __tablename__ = "closet"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    gender_preset: Mapped[str] = mapped_column(String(16), default="unisex", nullable=False)
    style_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    temperature_sensitivity: Mapped[str] = mapped_column(String(16), default="normal", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Refrigerator(IntIdPrimaryKeyMixin, Base):
    __tablename__ = "refrigerator"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    avoided_ingredients: Mapped[list | None] = mapped_column(JSON, nullable=True)
    cooking_preference_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ClosetItem(IntIdPrimaryKeyMixin, Base):
    __tablename__ = "closet_items"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(32), default="top")
    warmth: Mapped[str] = mapped_column(String(16), default="mid")
    color: Mapped[str | None] = mapped_column(String(32))
    note: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Music(IntIdPrimaryKeyMixin, Base):
    __tablename__ = "music"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    genre_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    mood_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MusicItem(IntIdPrimaryKeyMixin, Base):
    __tablename__ = "music_items"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    artist: Mapped[str | None] = mapped_column(String(64))
    scene: Mapped[str] = mapped_column(String(16), default="commute", index=True)
    note: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RefrigeratorItem(IntIdPrimaryKeyMixin, Base):
    __tablename__ = "refrigerator_items"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    quantity: Mapped[str | None] = mapped_column(String(32))
    expiry_date: Mapped[date | None] = mapped_column(Date, index=True)
    category: Mapped[str | None] = mapped_column(String(32))
    note: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
