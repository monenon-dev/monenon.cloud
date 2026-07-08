from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from silicon_valley.adapter.outbound.repositories.piper_henricks_ceo_repository import HenricksCeoRepository
from silicon_valley.app.ports.output.piper_henricks_ceo_port import HenricksCeoPort
from silicon_valley.app.ports.input.piper_henricks_ceo_use_case import HenricksCeoUseCase
from silicon_valley.app.use_cases.piper_henricks_ceo_interactor import HenricksCeoInteractor
from tailor.core.matrix.grid_oracle_database_manager import get_db


def get_henricks_ceo_repository(
        db: AsyncSession = Depends(get_db)
) -> HenricksCeoPort:

    return HenricksCeoRepository(session=db)


def get_henricks_ceo_use_case(
        repository: HenricksCeoPort = Depends(get_henricks_ceo_repository)
) -> HenricksCeoUseCase:

    return HenricksCeoInteractor(repository=repository)
