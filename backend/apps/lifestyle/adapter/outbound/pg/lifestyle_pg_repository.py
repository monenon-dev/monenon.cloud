"""라이프스타일 DB 어댑터."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lifestyle.adapter.inbound.api.schemas.settings_schema import (
    FashionPrefs,
    FoodPrefs,
    LifestyleProfile,
    MusicPrefs,
    UserSettingOut,
)
from lifestyle.adapter.outbound.orm.lifestyle_orm import Closet, Music, Refrigerator, UserSetting
from secretary.adapter.outbound.orm.user_model import User

logger = logging.getLogger(__name__)


class LifestylePgRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def verify_user(self, user_id: int) -> None:
        result = await self._session.execute(select(User).where(User.id == user_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    async def get_or_create_closet(self, user_id: int) -> Closet:
        result = await self._session.execute(select(Closet).where(Closet.user_id == user_id))
        row = result.scalar_one_or_none()
        if row:
            return row
        row = Closet(user_id=user_id)
        self._session.add(row)
        await self._session.flush()
        return row

    async def get_or_create_refrigerator(self, user_id: int) -> Refrigerator:
        result = await self._session.execute(select(Refrigerator).where(Refrigerator.user_id == user_id))
        row = result.scalar_one_or_none()
        if row:
            return row
        row = Refrigerator(user_id=user_id)
        self._session.add(row)
        await self._session.flush()
        return row

    async def get_or_create_music(self, user_id: int) -> Music:
        result = await self._session.execute(select(Music).where(Music.user_id == user_id))
        row = result.scalar_one_or_none()
        if row:
            return row
        row = Music(user_id=user_id, genre_tags=[], mood_tags=[])
        self._session.add(row)
        await self._session.flush()
        return row

    @staticmethod
    def lifestyle_from_tables(closet: Closet, refrigerator: Refrigerator, music: Music) -> LifestyleProfile:
        return LifestyleProfile(
            fashion=FashionPrefs(
                gender_preset=closet.gender_preset,  # type: ignore[arg-type]
                style_tags=list(closet.style_tags or []),
                temperature_sensitivity=closet.temperature_sensitivity,  # type: ignore[arg-type]
            ),
            food=FoodPrefs(
                avoided_ingredients=list(refrigerator.avoided_ingredients or []),
                cooking_preference_tags=list(refrigerator.cooking_preference_tags or []),
            ),
            music=MusicPrefs(
                genre_tags=list(music.genre_tags or []),
                mood_tags=list(music.mood_tags or []),
            ),
        )

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
        await self.get_or_create_closet(user_id)
        await self.get_or_create_refrigerator(user_id)
        await self.get_or_create_music(user_id)
        await self._session.flush()
        await self._session.refresh(row)
        logger.info("[LifestylePgRepository] user_settings 생성 — user_id=%s", user_id)
        return row

    def setting_to_out(
        self, row: UserSetting, closet: Closet, refrigerator: Refrigerator, music: Music
    ) -> UserSettingOut:
        return UserSettingOut(
            id=row.id,
            user_id=row.user_id,
            language=row.language,
            preferred_model=row.preferred_model,
            lifestyle=self.lifestyle_from_tables(closet, refrigerator, music),
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
