from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.police_anderson_collector_schema import AndersonCollectorSchema
from sherlock_homes.app.dtos.police_anderson_collector_dto import AndersonCollectorResponse
from sherlock_homes.app.ports.input.police_anderson_collector_use_case import AndersonCollectorUseCase
from sherlock_homes.dependencies.police_anderson_collector_provider import get_anderson_collector_use_case

'''
앤더슨 (Anderson)
역할 (keyword): collector (로그/수집가)
런던 경시청의 감식반원(이후 셜록의 팬클럽 결성).
사건 현장의 모든 기초 단서를 수집하듯 시스템 전체의 로우(Raw) 데이터와 원시 로그를 수집·정제합니다.
'''

anderson_collector_router = APIRouter(prefix="/anderson", tags=["anderson"])


@anderson_collector_router.get("/myself")
async def introduce_myself(
    anderson: AndersonCollectorUseCase = Depends(get_anderson_collector_use_case)
) -> AndersonCollectorResponse:
    return await anderson.introduce_myself(
        AndersonCollectorSchema(
            id=2,
            name="앤더슨 (Anderson)"
        )
    )
