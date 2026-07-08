"""채팅 DB 어댑터."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lifestyle.adapter.outbound.orm.chat_orm import ChatSession


class ChatPgRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_owned_session(self, session_id: int, user_id: int) -> ChatSession:
        result = await self._session.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
        chat = result.scalar_one_or_none()
        if not chat:
            raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
        return chat
