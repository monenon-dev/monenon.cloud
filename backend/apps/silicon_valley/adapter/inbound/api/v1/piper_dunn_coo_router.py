from fastapi import APIRouter, Depends

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_dunn_coo_schema import DunnCooSchema
from tailor.apps.silicon_valley.app.dtos.piper_dunn_coo_dto import DunnCooResponse
from tailor.apps.silicon_valley.app.ports.input.piper_dunn_coo_use_case import DunnCooUseCase
from tailor.apps.silicon_valley.dependencies.piper_dunn_coo_provider import get_dunn_coo_use_case

'''
재러드 던 (Jared Dunn)
피드 파이퍼의 COO. 원래 Hooli에서 개빈 벨슨의 비서로 근무했으나 방치된 컨테이너 배에서 발견됨.
기묘한 이력과 달리 회사 운영에 대한 열정은 최상급. 팀의 정서적 지주 역할.
'''
dunn_coo_router = APIRouter(prefix="/dunn", tags=["dunn"])


@dunn_coo_router.get("/myself")
async def introduce_myself(
    dunn: DunnCooUseCase = Depends(get_dunn_coo_use_case)
) -> DunnCooResponse:

    return await dunn.introduce_myself(
        DunnCooSchema(
            id=3,
            name="재러드 던 (Jared Dunn)",
        )
    )
