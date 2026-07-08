from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from titanic.adapter.outbound.orm.passenger_jack_trainer_orm import PassengerJackTrainerOrm as PersonOrm
from titanic.adapter.outbound.orm.passenger_rose_model_orm import PassengerRoseModelOrm as BookingOrm
from titanic.app.dto.crew_james_director_dto import (
    BookingCommand,
    JamesDirectorQuery,
    JamesDirectorResponse,
    PersonCommand,
)
from titanic.app.ports.output.crew_james_director_repository import JamesDirectorRepository

logger = logging.getLogger(__name__)


class JamesDirectorPgRepository(JamesDirectorRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: JamesDirectorQuery) -> JamesDirectorResponse:
        logger.info("[JamesDirectorPgRepository] introduce_myself | request_data=%s", query)
        return JamesDirectorResponse(
            id=query.id * 10000,
            name=f"{query.name}가 레포지토리에 다녀옴",
        )

    async def receive_uploaded_records(
        self,
        person_commands: list[PersonCommand],
        booking_commands: list[BookingCommand],
    ) -> int:
        person_orms = [
            PersonOrm(
                passenger_id=cmd.passenger_id,
                name=cmd.name,
                gender=cmd.gender,
                age=cmd.age,
                sib_sp=cmd.sib_sp,
                parch=cmd.parch,
                survived=cmd.survived,
            )
            for cmd in person_commands
        ]
        self.session.add_all(person_orms)
        await self.session.flush()

        booking_orms = [
            BookingOrm(
                passenger_id=person_orm.passenger_id,
                survived=person_orm.survived,
                pclass=cmd.pclass,
                ticket=cmd.ticket,
                fare=cmd.fare,
                cabin=cmd.cabin,
                embarked=cmd.embarked,
            )
            for person_orm, cmd in zip(person_orms, booking_commands, strict=True)
        ]
        self.session.add_all(booking_orms)
        await self.session.flush()
        return len(person_orms)
