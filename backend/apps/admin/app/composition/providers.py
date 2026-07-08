from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from admin.adapter.outbound.pg.admin_pg_repository import AdminPgRepository
from admin.app.ports.input.admin_use_case import AdminUseCasePort
from admin.app.use_cases.admin_use_case import AdminUseCase


def build_admin_use_case(session: AsyncSession) -> AdminUseCasePort:
    return AdminUseCase(AdminPgRepository(session))


def get_admin_use_case(
    session: AsyncSession = Depends(get_db),
) -> AdminUseCasePort:
    return build_admin_use_case(session)
