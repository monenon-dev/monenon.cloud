from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.adapter.outbound.repositories.police_mycroft_contact_repository import MycroftContactPgRepository
from sherlock_homes.app.ports.output.police_mycroft_contact_port import MycroftContactPort
from core.matrix.grid_oracle_database_manager import get_db
from sherlock_homes.app.ports.input.police_mycroft_contact_use_case import MycroftContactUseCase
from sherlock_homes.app.use_cases.police_mycroft_contact_interactor import MycroftContactInteractor

'''
캐릭터: 마이크로프트 홈즈 (Mycroft)
역할 (keyword): libraraian (지식/정보 창고)
드라마 설정 및 시스템 기능: 영국 정부의 핵심 관료이자 최고 국가 정보망을 통제하는 인물.
정부 기관 레벨의 거대 글로벌 컨텍스트 및 마스터 지식 베이스를 관리합니다.
'''

def get_mycroft_contact_use_case(
        db: AsyncSession = Depends(get_db)
) -> MycroftContactUseCase:
    repository: MycroftContactPort = MycroftContactPgRepository(session=db)
    return MycroftContactInteractor(repository=repository)
