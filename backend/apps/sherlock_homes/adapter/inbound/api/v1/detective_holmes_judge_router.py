from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.detective_holmes_judge_schema import HolmesJudgeSchema
from sherlock_homes.app.dtos.detective_holmes_judge_dto import HolmesJudgeResponse
from sherlock_homes.app.ports.input.detective_holmes_judge_use_case import HolmesJudgeUseCase
from sherlock_homes.dependencies.detective_holmes_judge_provider import get_holmes_judge_use_case

'''
셜록 홈즈 (Sherlock)
역할 (keyword): judge (판단/추론)
경찰이 해결하지 못하는 미궁의 사건을 해결하는 사설 자문 탐정.
모든 단서를 종합하여 최종 판단을 내리듯, 시스템의 핵심 추론 알고리즘을 수행하며 결론을 도출합니다.
'''

holmes_judge_router = APIRouter(prefix="/holmes", tags=["holmes"])


@holmes_judge_router.get("/myself")
async def introduce_myself(
    holmes: HolmesJudgeUseCase = Depends(get_holmes_judge_use_case)
) -> HolmesJudgeResponse:
    return await holmes.introduce_myself(
        HolmesJudgeSchema(
            id=9,
            name="셜록 홈즈 (Sherlock)"
        )
    )
