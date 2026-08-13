"""능동 알림 설정 API 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field


class NotificationSettingsOut(BaseModel):
    user_id: int
    alert_calendar_density: bool = False
    alert_urgent_messages: bool = False
    briefing_validator_mode: str = "auto"


class PatchNotificationSettingsBody(BaseModel):
    user_id: int = Field(..., ge=1)
    alert_calendar_density: bool | None = None
    alert_urgent_messages: bool | None = None
    briefing_validator_mode: str | None = Field(
        default=None,
        description="auto | review — 검증 실패 시 자동 재시도 또는 사용자 검토",
    )
