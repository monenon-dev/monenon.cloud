"""메시지(messages) API."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from admin.app.message_moderation import scan_user_message
from lifestyle.adapter.inbound.api.schemas.message_schema import AddMessageBody, MessageOut, message_out
from lifestyle.adapter.outbound.orm.chat_orm import Message, MessageRole
from core.matrix.grid_oracle_database_manager import get_db
from lifestyle.app.composition.providers import get_chat_pg_repository
from lifestyle.adapter.outbound.pg.chat_pg_repository import ChatPgRepository

logger = logging.getLogger(__name__)

message_router = APIRouter(prefix="/platform", tags=["messages"])


@message_router.get("/chat-sessions/{session_id}/messages", response_model=list[MessageOut])
async def list_session_messages(
    session_id: int,
    user_id: int,
    session: AsyncSession = Depends(get_db),
    chat_repo: ChatPgRepository = Depends(get_chat_pg_repository),
) -> list[MessageOut]:
    await chat_repo.get_owned_session(session_id, user_id)
    result = await session.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    )
    return [message_out(m) for m in result.scalars().all()]


@message_router.post("/chat-sessions/{session_id}/messages", response_model=MessageOut)
async def add_session_message(
    session_id: int,
    body: AddMessageBody,
    session: AsyncSession = Depends(get_db),
    chat_repo: ChatPgRepository = Depends(get_chat_pg_repository),
) -> MessageOut:
    chat = await chat_repo.get_owned_session(session_id, body.user_id)
    try:
        role = MessageRole(body.role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="role은 user, assistant, system 중 하나여야 합니다.") from exc

    msg = Message(session_id=chat.id, role=role, content=body.content)
    chat.updated_at = datetime.now(timezone.utc)
    session.add(msg)
    await session.flush()
    if role == MessageRole.USER:
        await scan_user_message(session, body.user_id, body.content)
    await session.refresh(msg)
    return message_out(msg)
