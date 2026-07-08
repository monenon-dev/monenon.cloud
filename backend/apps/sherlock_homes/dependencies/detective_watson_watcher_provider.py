from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from sherlock_homes.adapter.outbound.repositories.detective_mary_mail_repository import MaryMailRepository
from sherlock_homes.adapter.outbound.repositories.detective_watson_watcher_repository import WatsonWatcherRepository
from sherlock_homes.app.ports.input.detective_mary_mail_use_case import MaryMailUseCase
from sherlock_homes.app.ports.input.detective_watson_watcher_use_case import WatsonWatcherUseCase
from sherlock_homes.app.ports.output.detective_mary_mail_port import MaryMailPort
from sherlock_homes.app.ports.output.detective_watson_watcher_port import WatsonWatcherPort
from sherlock_homes.app.use_cases.detective_mary_mail_interactor import MaryMailInteractor
from sherlock_homes.app.use_cases.detective_watson_watcher_interactor import WatsonWatcherInteractor

'''
캐릭터: 존 왓슨 (John)
역할 (keyword): watcher (관찰/기록자)
KcELECTRA 필터 + Mary pgvector 파이프라인을 조립합니다.
'''


def get_watson_watcher_use_case(
    db: AsyncSession = Depends(get_db),
) -> WatsonWatcherUseCase:
    watson_repository: WatsonWatcherPort = WatsonWatcherRepository(session=db)
    mary_repository: MaryMailPort = MaryMailRepository(session=db)
    mary_mail: MaryMailUseCase = MaryMailInteractor(repository=mary_repository)
    return WatsonWatcherInteractor(
        repository=watson_repository,
        mary_mail=mary_mail,
    )
