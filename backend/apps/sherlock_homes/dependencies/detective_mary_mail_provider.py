from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.adapter.outbound.repositories.detective_mary_mail_repository import MaryMailRepository
from sherlock_homes.app.ports.output.detective_mary_mail_port import MaryMailPort
from core.matrix.grid_oracle_database_manager import get_db
from sherlock_homes.app.ports.input.detective_mary_mail_use_case import MaryMailUseCase
from sherlock_homes.app.use_cases.detective_mary_mail_interactor import MaryMailInteractor

'''
캐릭터: 메리 왓슨 (Mary)
역할 (keyword): mail (메일/알림)
드라마 설정 및 시스템 기능: 사설 탐정단에 합류한 전직 비밀 요원.
베이커가 팀의 소식을 전하듯, 시스템 내부의 이메일 발송, 알림 전달 및 메시지 처리를 수행합니다.
'''

def get_mary_mail_use_case(
        db: AsyncSession = Depends(get_db)
) -> MaryMailUseCase:
    repository: MaryMailPort = MaryMailRepository(session=db)
    return MaryMailInteractor(repository=repository)
