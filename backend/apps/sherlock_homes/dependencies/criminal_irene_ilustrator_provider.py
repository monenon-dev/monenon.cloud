from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.adapter.outbound.repositories.criminal_irene_ilustrator_repository import IreneIlustratorRepository
from sherlock_homes.app.ports.output.criminal_irene_ilustrator_port import IreneIlustratorPort
from core.matrix.grid_oracle_database_manager import get_db
from sherlock_homes.app.ports.input.criminal_irene_ilustrator_use_case import IreneIlustratorUseCase
from sherlock_homes.app.use_cases.criminal_irene_ilustrator_interactor import IreneIlustratorInteractor

'''
캐릭터: 아이린 애들러 (Irene)
역할 (keyword): ilustrator (시각화 및 변수 창출)
드라마 설정 및 시스템 기능: 국가 기밀을 손에 쥐고 셜록을 농락한 범죄자 (The Woman).
정형화되지 않은 방식으로 매력적인 변수(비정형 인사이트 보고서 컨셉, 독창적인 UI/UX 대안)를 도출합니다.
'''

def get_irene_ilustrator_use_case(
        db: AsyncSession = Depends(get_db)
) -> IreneIlustratorUseCase:
    repository: IreneIlustratorPort = IreneIlustratorRepository(session=db)
    return IreneIlustratorInteractor(repository=repository)
