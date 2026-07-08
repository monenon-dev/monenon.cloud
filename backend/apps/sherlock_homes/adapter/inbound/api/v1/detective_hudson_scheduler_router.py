from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.detective_mrshudson_scheduler_schema import MrshudsonSchedulerSchema
from sherlock_homes.app.dtos.detective_mrshudson_scheduler_dto import MrshudsonSchedulerResponse
from sherlock_homes.app.ports.input.detective_mrshudson_scheduler_use_case import MrshudsonSchedulerUseCase
from sherlock_homes.dependencies.detective_mrshudson_scheduler_provider import get_mrshudson_scheduler_use_case

'''
허드슨 부인 (Mrs. Hudson)
역할 (keyword): scheduler (스케줄/일정 관리)
사설 탐정들의 아지트인 베이커가 221B의 집주인.
베이커가의 일상을 꼼꼼히 관리하듯, 시스템의 작업 스케줄링, 배치 작업 및 태스크 큐 관리를 수행합니다.
'''

mrshudson_scheduler_router = APIRouter(prefix="/mrshudson", tags=["mrshudson"])


@mrshudson_scheduler_router.get("/myself")
async def introduce_myself(
    mrshudson: MrshudsonSchedulerUseCase = Depends(get_mrshudson_scheduler_use_case)
) -> MrshudsonSchedulerResponse:
    return await mrshudson.introduce_myself(
        MrshudsonSchedulerSchema(
            id=11,
            name="허드슨 부인 (Mrs. Hudson)"
        )
    )
