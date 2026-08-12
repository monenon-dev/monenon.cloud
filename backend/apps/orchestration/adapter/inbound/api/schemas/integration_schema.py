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


class IntegrationsListResponse(BaseModel):
    user_id: int
    integrations: list[IntegrationStatusOut]


class PatchIntegrationBody(BaseModel):
    user_id: int = Field(..., ge=1)
    provider: str = Field(..., min_length=2, max_length=32)
    enabled: bool


class ConnectIntegrationBody(BaseModel):
    user_id: int = Field(..., ge=1)
    code: str = Field(..., min_length=4)
    redirect_uri: str = Field(..., min_length=10)
