from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.app.dtos.detective_mrshudson_scheduler_dto import MrshudsonSchedulerQuery, MrshudsonSchedulerResponse
from sherlock_homes.app.ports.output.detective_mrshudson_scheduler_port import MrshudsonSchedulerPort

logger = logging.getLogger(__name__)


class MrshudsonSchedulerRepository(MrshudsonSchedulerPort):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: MrshudsonSchedulerQuery) -> MrshudsonSchedulerResponse:
        '''허드슨 부인의 자기소개'''
        logger.info(f"[MrshudsonSchedulerRepository] introduce_myself | id={query.id} name={query.name}")
        return MrshudsonSchedulerResponse(
            id=query.id,
            name=query.name,
        )
