"""주간 업무 리포트 API 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field


class WeeklyReportRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    speech_tone: str | None = Field(default=None, description="friendly | formal | humorous")
    user_type: str | None = Field(default=None, description="직장인 | 학생 | 프리랜서_창업자")
    industry: str | None = Field(default=None)


class WeeklyRiskOut(BaseModel):
    title: str
    severity: str = "medium"
    detail: str = ""
    evidence_days: list[str] = Field(default_factory=list)


class WeeklyActionOut(BaseModel):
    title: str
    priority: str = "medium"
    detail: str = ""


class WeeklyReportResponse(BaseModel):
    summary: str
    risks: list[WeeklyRiskOut] = Field(default_factory=list)
    next_actions: list[WeeklyActionOut] = Field(default_factory=list)
    tool_logs: list[dict] = Field(default_factory=list)
