"""일일 브리핑 테이블 — 능동적 브리핑 사전 생성 결과."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.matrix.grid_oracle_database_manager import Base
from models.int_id_mixin import IntIdPrimaryKeyMixin


class DailyBriefing(IntIdPrimaryKeyMixin, Base):
    """사용자·날짜별 브리핑 1건 (idempotent)."""

    __tablename__ = "daily_briefings"
    __table_args__ = (
        UniqueConstraint("user_id", "briefing_date", name="uq_daily_briefings_user_date"),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    briefing_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tool_logs: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
