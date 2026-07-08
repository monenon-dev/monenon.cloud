from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.app.dtos.criminal_eurus_prophet_dto import EurusProphetQuery, EurusProphetResponse
from sherlock_homes.app.ports.output.criminal_eurus_prophet_port import EurusProphetPort

logger = logging.getLogger(__name__)


class EurusProphetRepository(EurusProphetPort):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: EurusProphetQuery) -> EurusProphetResponse:
        '''유라루스의 자기소개'''
        logger.info(f"[EurusProphetRepository] introduce_myself | id={query.id} name={query.name}")
        return EurusProphetResponse(
            id=query.id,
            name=query.name,
        )
