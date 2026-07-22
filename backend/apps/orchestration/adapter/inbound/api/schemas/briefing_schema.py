"""브리핑 API 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field


class BriefingRequest(BaseModel):
    query: str = Field(..., min_length=1, description="브리핑 요청 문장")
    user_id: int | None = Field(default=None, ge=1)
    speech_tone: str | None = Field(default=None, description="friendly | formal | humorous")
    user_type: str | None = Field(default=None, description="직장인 | 학생 | 프리랜서_창업자")
    industry: str | None = Field(default=None)


class BriefingResponse(BaseModel):
    answer: str
    trace: list[dict]
    agent_results: dict
