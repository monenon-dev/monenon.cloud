"""채팅 세션 API 스키마."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ChatSessionOut(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int


class CreateChatSessionBody(BaseModel):
    user_id: int
    title: str = Field(default="새 대화", max_length=128)


class UpdateChatSessionBody(BaseModel):
    user_id: int
    title: str = Field(..., min_length=1, max_length=128)


class BulkDeleteChatSessionsBody(BaseModel):
    user_id: int
    session_ids: list[int] = Field(..., min_length=1)
