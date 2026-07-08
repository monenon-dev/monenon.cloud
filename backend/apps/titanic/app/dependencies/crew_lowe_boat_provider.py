from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from titanic.adapter.outbound.pg.crew_lowe_boat_pg_repository import LoweBoatPgRepository
from titanic.app.ports.input.crew_lowe_boat_use_case import LoweBoatUseCase
from titanic.app.ports.output.crew_lowe_boat_repository import LoweBoatRepository
from titanic.app.use_cases.crew_lowe_boat_interactor import LoweBoatInteractor


def get_lowe_boat_repository(
    db: AsyncSession = Depends(get_db),
) -> LoweBoatRepository:
    return LoweBoatPgRepository(session=db)


def get_lowe_boat_use_case(
    repository: LoweBoatRepository = Depends(get_lowe_boat_repository),
) -> LoweBoatUseCase:
    return LoweBoatInteractor(repository=repository)
