"""능동 알림 설정 API 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field


class NotificationSettingsOut(BaseModel):
    user_id: int
    alert_calendar_density: bool = False
    alert_urgent_messages: bool = False
    briefing_validator_mode: str = "auto"
    briefing_hour: int = 7
    briefing_minute: int = 0
    density_threshold: int = 3
    active_hours_start: int = 8
    active_hours_end: int = 20


class PatchNotificationSettingsBody(BaseModel):
    user_id: int = Field(..., ge=1)
    alert_calendar_density: bool | None = None
    alert_urgent_messages: bool | None = None
    briefing_validator_mode: str | None = Field(
        default=None,
        description="auto | review — 검증 실패 시 자동 재시도 또는 사용자 검토",
    )
    briefing_hour: int | None = Field(default=None, ge=0, le=23)
    briefing_minute: int | None = Field(default=None, ge=0, le=59)
    density_threshold: int | None = Field(default=None, ge=2, le=4)
    active_hours_start: int | None = Field(default=None, ge=0, le=23)
    active_hours_end: int | None = Field(default=None, ge=1, le=24)
