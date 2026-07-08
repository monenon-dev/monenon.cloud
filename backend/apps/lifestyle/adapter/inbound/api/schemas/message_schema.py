"""메시지 API 스키마."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from lifestyle.adapter.outbound.orm.chat_orm import Message


class MessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime


class AddMessageBody(BaseModel):
    user_id: int
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


def message_out(row: Message) -> MessageOut:
    return MessageOut(
        id=row.id,
        session_id=row.session_id,
        role=row.role.value if hasattr(row.role, "value") else str(row.role),
        content=row.content,
        created_at=row.created_at,
    )
