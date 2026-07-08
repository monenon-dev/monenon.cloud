from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.app.dtos.criminal_magnussen_archivist_dto import MagnussenArchivistQuery, MagnussenArchivistResponse
from sherlock_homes.app.ports.output.criminal_magnussen_archivist_port import MagnussenArchivistPort

logger = logging.getLogger(__name__)


class MagnussenArchivistRepository(MagnussenArchivistPort):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: MagnussenArchivistQuery) -> MagnussenArchivistResponse:
        '''마그누센의 자기소개'''
        logger.info(f"[MagnussenArchivistRepository] introduce_myself | id={query.id} name={query.name}")
        return MagnussenArchivistResponse(
            id=query.id,
            name=query.name,
        )
