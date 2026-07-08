from __future__ import annotations

from sherlock_homes.adapter.inbound.api.schemas.detective_holmes_judge_schema import HolmesJudgeSchema
from sherlock_homes.app.dtos.detective_holmes_judge_dto import HolmesJudgeQuery, HolmesJudgeResponse
from sherlock_homes.app.ports.input.detective_holmes_judge_use_case import HolmesJudgeUseCase
from sherlock_homes.app.ports.output.detective_holmes_judge_port import HolmesJudgePort


class HolmesJudgeInteractor(HolmesJudgeUseCase):

    def __init__(self, repository: HolmesJudgePort):
        self.repository = repository

    async def introduce_myself(self, schema: HolmesJudgeSchema) -> HolmesJudgeResponse:
        '''셜록 홈즈의 자기소개 인터렉트'''
        return await self.repository.introduce_myself(HolmesJudgeQuery(
            id=schema.id,
            name=schema.name
        ))
