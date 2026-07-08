from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from lifestyle.adapter.outbound.pg.chat_pg_repository import ChatPgRepository
from lifestyle.adapter.outbound.pg.lifestyle_pg_repository import LifestylePgRepository


def get_lifestyle_pg_repository(
    session: AsyncSession = Depends(get_db),
) -> LifestylePgRepository:
    return LifestylePgRepository(session)


def get_chat_pg_repository(
    session: AsyncSession = Depends(get_db),
) -> ChatPgRepository:
    return ChatPgRepository(session)
