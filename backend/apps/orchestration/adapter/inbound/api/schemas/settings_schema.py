"""라이프스타일 API 공용 스키마."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class UserSettingOut(BaseModel):
    id: int
    user_id: int
    language: str
    preferred_model: str
    kakao_calendar_sync: bool = False
    created_at: datetime
    updated_at: datetime


class PatchUserSettingsBody(BaseModel):
    user_id: int = Field(..., description="소유자 검증용")
    language: str | None = Field(default=None, max_length=16)
    preferred_model: str | None = Field(default=None, max_length=64)
    kakao_calendar_sync: bool | None = None
