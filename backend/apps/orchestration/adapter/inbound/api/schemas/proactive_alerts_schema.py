"""인앱 proactive_alerts API 스키마."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ProactiveAlertOut(BaseModel):
    id: int
    alert_type: str
    trigger_key: str
    message: str
    sent_at: datetime
    read_at: datetime | None = None
    is_read: bool = False


class ProactiveAlertListOut(BaseModel):
    items: list[ProactiveAlertOut] = Field(default_factory=list)
    unread_count: int = 0


class RecentAlertOut(BaseModel):
    id: int
    sent_at: datetime
    alert_type: str
    label: str
    summary: str


class RecentAlertListOut(BaseModel):
    items: list[RecentAlertOut] = Field(default_factory=list)
