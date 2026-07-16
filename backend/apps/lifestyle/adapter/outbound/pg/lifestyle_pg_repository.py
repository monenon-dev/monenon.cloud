"""라이프스타일 DB 어댑터."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lifestyle.adapter.outbound.orm.lifestyle_orm import UserSetting
from secretary.adapter.outbound.orm.user_model import User

logger = logging.getLogger(__name__)


class LifestylePgRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def verify_user(self, user_id: int) -> None:
        result = await self._session.execute(select(User).where(User.id == user_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    async def get_or_create_user_setting(self, user_id: int) -> UserSetting:
        user_row = await self._session.execute(select(User).where(User.id == user_id))
        if not user_row.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

        result = await self._session.execute(select(UserSetting).where(UserSetting.user_id == user_id))
        row = result.scalar_one_or_none()
        if row:
            return row
        row = UserSetting(
            user_id=user_id,
            language="ko",
            preferred_model="gemini-2.5-flash-lite",
        )
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        logger.info("[LifestylePgRepository] user_settings 생성 — user_id=%s", user_id)
        return row
