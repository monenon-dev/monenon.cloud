"""연동 OAuth · 상태 API 스키마."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class IntegrationStatusOut(BaseModel):
    provider: str
    connected: bool
    enabled: bool
    connected_at: datetime | None = None
    last_sync_hint: str | None = None
    briefing_notify: bool = False


class IntegrationsListResponse(BaseModel):
    user_id: int
    integrations: list[IntegrationStatusOut]
    briefing_notify: bool = Field(
        default=False,
        description="Slack/Gmail 중 하나라도 매일 브리핑 알림이 켜져 있으면 true",
    )


class PatchIntegrationBody(BaseModel):
    user_id: int = Field(..., ge=1)
    provider: str = Field(..., min_length=2, max_length=32)
    enabled: bool


class ConnectIntegrationBody(BaseModel):
    user_id: int = Field(..., ge=1)
    code: str = Field(..., min_length=4)
    redirect_uri: str = Field(..., min_length=10)


class PatchBriefingNotifyBody(BaseModel):
    user_id: int = Field(..., ge=1)
    enabled: bool
