"""mail 의존성 주입 — 포트 ↔ 어댑터 바인딩."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from mail.adapter.outbound.mail_pg_repository import MailPgRepository
from mail.app.ports.input import MailUseCasePort
from mail.app.use_cases import MailUseCase


def get_mail_use_case(
    session: AsyncSession = Depends(get_db),
) -> MailUseCasePort:
    repo = MailPgRepository(session)
    return MailUseCase(repo)
