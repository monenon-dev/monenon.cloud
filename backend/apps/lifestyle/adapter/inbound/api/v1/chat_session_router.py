"""채팅 세션(chat_sessions) API."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from lifestyle.adapter.inbound.api.schemas.chat_session_schema import (
    BulkDeleteChatSessionsBody,
    ChatSessionOut,
    CreateChatSessionBody,
    UpdateChatSessionBody,
)
from lifestyle.adapter.outbound.orm.chat_orm import ChatSession, Message
from core.matrix.grid_oracle_database_manager import get_db
from lifestyle.app.composition.providers import get_chat_pg_repository
from lifestyle.adapter.outbound.pg.chat_pg_repository import ChatPgRepository
from secretary.adapter.outbound.orm.user_model import User

logger = logging.getLogger(__name__)

chat_session_router = APIRouter(prefix="/platform", tags=["chat-sessions"])


@chat_session_router.get("/chat-sessions", response_model=list[ChatSessionOut])
async def list_chat_sessions(
    user_id: int | None = None,
    session: AsyncSession = Depends(get_db),
    chat_repo: ChatPgRepository = Depends(get_chat_pg_repository),
) -> list[ChatSessionOut]:
    """채팅 세션 목록 (메시지 수 포함). user_id 미지정 시 전체."""
    stmt = (
        select(
            ChatSession,
            func.count(Message.id).label("message_count"),
        )
        .outerjoin(Message, Message.session_id == ChatSession.id)
        .group_by(ChatSession.id)
        .order_by(ChatSession.updated_at.desc())
    )
    if user_id is not None:
        stmt = stmt.where(ChatSession.user_id == user_id)

    rows = (await session.execute(stmt)).all()
    return [
        ChatSessionOut(
            id=chat.id,
            user_id=chat.user_id,
            title=chat.title,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            message_count=int(message_count or 0),
        )
        for chat, message_count in rows
    ]


@chat_session_router.post("/chat-sessions", response_model=ChatSessionOut)
async def create_chat_session(
    body: CreateChatSessionBody,
    session: AsyncSession = Depends(get_db),
    chat_repo: ChatPgRepository = Depends(get_chat_pg_repository),
) -> ChatSessionOut:
    user_result = await session.execute(select(User).where(User.id == body.user_id))
    if not user_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    chat = ChatSession(user_id=body.user_id, title=body.title.strip() or "새 채팅")
    session.add(chat)
    await session.flush()
    await session.refresh(chat)
    return ChatSessionOut(
        id=chat.id,
        user_id=chat.user_id,
        title=chat.title,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        message_count=0,
    )


@chat_session_router.delete("/chat-sessions/{session_id}")
async def delete_chat_session(
    session_id: int,
    user_id: int,
    session: AsyncSession = Depends(get_db),
    chat_repo: ChatPgRepository = Depends(get_chat_pg_repository),
) -> dict:
    chat = await chat_repo.get_owned_session(session_id, user_id)
    await session.delete(chat)
    logger.info("[ChatSessionController] delete id=%s user_id=%s", session_id, user_id)
    return {"ok": True, "deleted_id": session_id}


@chat_session_router.post("/chat-sessions/bulk-delete")
async def bulk_delete_chat_sessions(
    body: BulkDeleteChatSessionsBody,
    session: AsyncSession = Depends(get_db),
    chat_repo: ChatPgRepository = Depends(get_chat_pg_repository),
) -> dict:
    ids = list(dict.fromkeys(body.session_ids))
    result = await session.execute(
        select(ChatSession).where(
            ChatSession.user_id == body.user_id,
            ChatSession.id.in_(ids),
        )
    )
    chats = list(result.scalars().all())
    if not chats:
        raise HTTPException(status_code=404, detail="삭제할 채팅 세션이 없습니다.")
    for chat in chats:
        await session.delete(chat)
    deleted_ids = [c.id for c in chats]
    logger.info(
        "[ChatSessionController] bulk delete ids=%s user_id=%s",
        deleted_ids,
        body.user_id,
    )
    return {"ok": True, "deleted_ids": deleted_ids}


@chat_session_router.patch("/chat-sessions/{session_id}", response_model=ChatSessionOut)
async def update_chat_session(
    session_id: int,
    body: UpdateChatSessionBody,
    session: AsyncSession = Depends(get_db),
    chat_repo: ChatPgRepository = Depends(get_chat_pg_repository),
) -> ChatSessionOut:
    chat = await chat_repo.get_owned_session(session_id, body.user_id)
    chat.title = body.title.strip() or "새 채팅"
    chat.updated_at = datetime.now(timezone.utc)
    await session.flush()
    await session.refresh(chat)
    count_result = await session.execute(
        select(func.count()).select_from(Message).where(Message.session_id == chat.id)
    )
    return ChatSessionOut(
        id=chat.id,
        user_id=chat.user_id,
        title=chat.title,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        message_count=int(count_result.scalar_one()),
    )
