from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.app.dtos.detective_holmes_judge_dto import HolmesJudgeQuery, HolmesJudgeResponse
from sherlock_homes.app.ports.output.detective_holmes_judge_port import HolmesJudgePort

logger = logging.getLogger(__name__)


class HolmesJudgeRepository(HolmesJudgePort):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: HolmesJudgeQuery) -> HolmesJudgeResponse:
        '''셜록 홈즈의 자기소개'''
        logger.info(f"[HolmesJudgeRepository] introduce_myself | id={query.id} name={query.name}")
        return HolmesJudgeResponse(
            id=query.id,
            name=query.name,
        )
