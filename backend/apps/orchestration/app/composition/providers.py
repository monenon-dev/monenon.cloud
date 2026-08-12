from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from orchestration.adapter.outbound.pg.chat_pg_repository import ChatPgRepository
from orchestration.adapter.outbound.pg.integration_pg_repository import IntegrationPgRepository
from orchestration.adapter.outbound.pg.orchestration_pg_repository import OrchestrationPgRepository


def get_orchestration_pg_repository(
    session: AsyncSession = Depends(get_db),
) -> OrchestrationPgRepository:
    return OrchestrationPgRepository(session)


def get_chat_pg_repository(
    session: AsyncSession = Depends(get_db),
) -> ChatPgRepository:
    return ChatPgRepository(session)


def get_integration_pg_repository(
    session: AsyncSession = Depends(get_db),
) -> IntegrationPgRepository:
    return IntegrationPgRepository(session)
