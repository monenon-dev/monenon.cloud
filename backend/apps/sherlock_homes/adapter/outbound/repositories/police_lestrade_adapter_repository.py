from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.app.dtos.police_lestrade_adapter_dto import LestradeAdapterQuery, LestradeAdapterResponse
from sherlock_homes.app.ports.output.police_lestrade_adapter_port import LestradeAdapterPort

logger = logging.getLogger(__name__)


class LestradeAdapterRepository(LestradeAdapterPort):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: LestradeAdapterQuery) -> LestradeAdapterResponse:
        '''레스트레이드의 자기소개'''
        logger.info(f"[LestradeAdapterRepository] introduce_myself | id={query.id} name={query.name}")
        return LestradeAdapterResponse(
            id=query.id,
            name=query.name,
        )
