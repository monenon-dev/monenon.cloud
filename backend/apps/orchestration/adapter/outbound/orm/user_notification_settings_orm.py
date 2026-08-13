"""능동 알림 사용자 설정."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from core.matrix.grid_oracle_database_manager import Base


class UserNotificationSettings(Base):
    __tablename__ = "user_notification_settings"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    alert_calendar_density: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    alert_urgent_messages: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    briefing_validator_mode: Mapped[str] = mapped_column(
        String(16), nullable=False, default="auto", server_default="auto"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
