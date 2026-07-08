from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from secretary.adapter.outbound.pg.user_command_pg_repository import UserCommandPgRepository
from secretary.adapter.outbound.pg.user_query_pg_repository import UserQueryPgRepository
from secretary.app.ports.input.user_use_case import UserUseCasePort
from secretary.app.use_cases.user_use_case import UserUseCase


def get_user_use_case(
    session: AsyncSession = Depends(get_db),
) -> UserUseCasePort:
    return UserUseCase(UserQueryPgRepository(session), UserCommandPgRepository(session))
