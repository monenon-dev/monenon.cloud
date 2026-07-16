"""라이프스타일 테이블 — 사용자 설정."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
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
