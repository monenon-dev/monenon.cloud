from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.app.dtos.detective_watson_watcher_dto import WatsonWatcherQuery, WatsonWatcherResponse
from sherlock_homes.app.ports.output.detective_watson_watcher_port import WatsonWatcherPort

logger = logging.getLogger(__name__)


class WatsonWatcherRepository(WatsonWatcherPort):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: WatsonWatcherQuery) -> WatsonWatcherResponse:
        '''존 왓슨의 자기소개'''
        logger.info(f"[WatsonWatcherRepository] introduce_myself | id={query.id} name={query.name}")
        return WatsonWatcherResponse(
            id=query.id,
            name=query.name,
        )
