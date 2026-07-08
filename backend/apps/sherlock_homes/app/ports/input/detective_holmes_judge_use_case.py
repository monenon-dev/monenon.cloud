from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.detective_holmes_judge_schema import HolmesJudgeSchema
from sherlock_homes.app.dtos.detective_holmes_judge_dto import HolmesJudgeResponse


class HolmesJudgeUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: HolmesJudgeSchema) -> HolmesJudgeResponse:
        '''셜록 홈즈의 자기소개 메소드'''
        pass
