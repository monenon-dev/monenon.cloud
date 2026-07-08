"""사용자 조회 전용 DB 어댑터."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from secretary.adapter.outbound.orm.user_model import User


class UserQueryPgRepository:
    """Walter 역할: 사용자 조회 전용 어댑터."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def count(self) -> int:
        result = await self._session.execute(select(func.count()).select_from(User))
        return int(result.scalar_one())

    async def find_by_id(self, user_id: int) -> User | None:
        return await self._session.get(User, user_id)

    async def find_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def list_all(self) -> list[User]:
        result = await self._session.execute(select(User).order_by(User.id))
        return list(result.scalars().all())
