from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.adapter.outbound.repositories.police_lestrade_adapter_repository import LestradeAdapterRepository
from sherlock_homes.app.ports.output.police_lestrade_adapter_port import LestradeAdapterPort
from core.matrix.grid_oracle_database_manager import get_db
from sherlock_homes.app.ports.input.police_lestrade_adapter_use_case import LestradeAdapterUseCase
from sherlock_homes.app.use_cases.police_lestrade_adapter_interactor import LestradeAdapterInteractor

'''
캐릭터: 레스트레이드 경감 (Lestrade)
역할 (keyword): adapter (외부 연동)
드라마 설정 및 시스템 기능: 런던 경시청(New Scotland Yard)의 경감.
공식 조직과 에이전트 시스템을 연결해 주는 브릿지 역할로, 외부 API 및 공공 데이터 소스 연동을 담당합니다.
'''

def get_lestrade_adapter_use_case(
        db: AsyncSession = Depends(get_db)
) -> LestradeAdapterUseCase:
    repository: LestradeAdapterPort = LestradeAdapterRepository(session=db)
    return LestradeAdapterInteractor(repository=repository)
