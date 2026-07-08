"""사용자 저장/변경 전용 DB 어댑터."""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from secretary.adapter.outbound.orm.user_model import User

logger = logging.getLogger(__name__)


class UserCommandPgRepository:
    """James 역할: 사용자 저장/변경 전용 어댑터."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, user: User) -> User:
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        logger.info("[UserPgRepository] save 레이어 완료 — userId=%s", user.id)
        return user
