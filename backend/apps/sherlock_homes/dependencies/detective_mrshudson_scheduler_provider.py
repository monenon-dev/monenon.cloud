from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.adapter.outbound.repositories.detective_mrshudson_scheduler_repository import MrshudsonSchedulerRepository
from sherlock_homes.app.ports.output.detective_mrshudson_scheduler_port import MrshudsonSchedulerPort
from core.matrix.grid_oracle_database_manager import get_db
from sherlock_homes.app.ports.input.detective_mrshudson_scheduler_use_case import MrshudsonSchedulerUseCase
from sherlock_homes.app.use_cases.detective_mrshudson_scheduler_interactor import MrshudsonSchedulerInteractor

'''
캐릭터: 허드슨 부인 (Mrs. Hudson)
역할 (keyword): scheduler (스케줄/일정 관리)
드라마 설정 및 시스템 기능: 사설 탐정들의 아지트인 베이커가 221B의 집주인.
베이커가의 일상을 꼼꼼히 관리하듯, 시스템의 작업 스케줄링, 배치 작업 및 태스크 큐 관리를 수행합니다.
'''

def get_mrshudson_scheduler_use_case(
        db: AsyncSession = Depends(get_db)
) -> MrshudsonSchedulerUseCase:
    repository: MrshudsonSchedulerPort = MrshudsonSchedulerRepository(session=db)
    return MrshudsonSchedulerInteractor(repository=repository)
