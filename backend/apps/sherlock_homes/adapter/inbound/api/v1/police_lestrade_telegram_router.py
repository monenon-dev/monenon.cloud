from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.police_lestrade_adapter_schema import LestradeAdapterSchema
from sherlock_homes.app.dtos.police_lestrade_adapter_dto import LestradeAdapterResponse
from sherlock_homes.app.ports.input.police_lestrade_adapter_use_case import LestradeAdapterUseCase
from sherlock_homes.dependencies.police_lestrade_adapter_provider import get_lestrade_adapter_use_case

'''
레스트레이드 경감 (Lestrade)
역할 (keyword): adapter (외부 연동)
런던 경시청(New Scotland Yard)의 경감.
공식 조직과 에이전트 시스템을 연결해 주는 브릿지 역할로, 외부 API 및 공공 데이터 소스 연동을 담당합니다.
'''

lestrade_adapter_router = APIRouter(prefix="/lestrade", tags=["lestrade"])


@lestrade_adapter_router.get("/myself")
async def introduce_myself(
    lestrade: LestradeAdapterUseCase = Depends(get_lestrade_adapter_use_case)
) -> LestradeAdapterResponse:
    return await lestrade.introduce_myself(
        LestradeAdapterSchema(
            id=1,
            name="레스트레이드 경감 (Lestrade)"
        )
    )
