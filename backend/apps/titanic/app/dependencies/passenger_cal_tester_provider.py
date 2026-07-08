from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from titanic.adapter.outbound.pg.passenger_cal_tester_pg_repository import CalTesterPgRepository
from titanic.app.ports.input.passenger_cal_tester_use_case import CalTesterUseCase
from titanic.app.ports.output.passenger_cal_tester_repository import CalTesterRepository
from titanic.app.use_cases.passenger_cal_tester_interactor import CalTesterInteractor


def get_cal_tester_repository(
    db: AsyncSession = Depends(get_db),
) -> CalTesterRepository:
    return CalTesterPgRepository(session=db)


def get_cal_tester_use_case(
    repository: CalTesterRepository = Depends(get_cal_tester_repository),
) -> CalTesterUseCase:
    return CalTesterInteractor(repository=repository)


get_cal_test_use_case = get_cal_tester_use_case
