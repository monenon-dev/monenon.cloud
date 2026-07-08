from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.adapter.outbound.repositories.criminal_moriarty_disruptor_repository import MoriartyDisruptorRepository
from sherlock_homes.app.ports.output.criminal_moriarty_disruptor_port import MoriartyDisruptorPort
from core.matrix.grid_oracle_database_manager import get_db
from sherlock_homes.app.ports.input.criminal_moriarty_disruptor_use_case import MoriartyDisruptorUseCase
from sherlock_homes.app.use_cases.criminal_moriarty_disruptor_interactor import MoriartyDisruptorInteractor

'''
캐릭터: 모리어티 (Moriarty)
역할 (keyword): disruptor (시뮬레이터/레드팀)
드라마 설정 및 시스템 기능: 셜록의 숙적이자 자문 범죄자.
시스템의 취약점을 파고드는 카오스 엔지니어링이나 스트레스 테스트용 비정상 변수 데이터를 생성하여 방어력을 측정합니다.
'''

def get_moriarty_disruptor_use_case(
        db: AsyncSession = Depends(get_db)
) -> MoriartyDisruptorUseCase:
    repository: MoriartyDisruptorPort = MoriartyDisruptorRepository(session=db)
    return MoriartyDisruptorInteractor(repository=repository)
