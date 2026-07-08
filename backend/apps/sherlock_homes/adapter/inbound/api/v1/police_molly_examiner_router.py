from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.police_molly_examiner_schema import MollyExaminerSchema
from sherlock_homes.app.dtos.police_molly_examiner_dto import MollyExaminerResponse
from sherlock_homes.app.ports.input.police_molly_examiner_use_case import MollyExaminerUseCase
from sherlock_homes.dependencies.police_molly_examiner_provider import get_molly_examiner_use_case

'''
몰리 후퍼 (Molly)
역할 (keyword): examiner (검증/조사관)
세인트 바톨로뮤 병원의 부검의.
공식적인 과학 수사 데이터와 증거를 제공하듯, 시스템에 유입되는 데이터의 유효성 검증(Validation) 및 팩트 체크를 수행합니다.
'''

molly_examiner_router = APIRouter(prefix="/molly", tags=["molly"])


@molly_examiner_router.get("/myself")
async def introduce_myself(
    molly: MollyExaminerUseCase = Depends(get_molly_examiner_use_case)
) -> MollyExaminerResponse:
    return await molly.introduce_myself(
        MollyExaminerSchema(
            id=4,
            name="몰리 후퍼 (Molly)"
        )
    )
