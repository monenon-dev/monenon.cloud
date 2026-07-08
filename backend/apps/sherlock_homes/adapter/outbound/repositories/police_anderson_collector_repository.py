from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.app.dtos.police_anderson_collector_dto import AndersonCollectorQuery, AndersonCollectorResponse
from sherlock_homes.app.ports.output.police_anderson_collector_port import AndersonCollectorPort

logger = logging.getLogger(__name__)


class AndersonCollectorRepository(AndersonCollectorPort):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: AndersonCollectorQuery) -> AndersonCollectorResponse:
        '''앤더슨의 자기소개'''
        logger.info(f"[AndersonCollectorRepository] introduce_myself | id={query.id} name={query.name}")
        return AndersonCollectorResponse(
            id=query.id,
            name=query.name,
        )
