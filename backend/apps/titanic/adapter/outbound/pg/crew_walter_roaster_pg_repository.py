from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from titanic.adapter.outbound.orm.passenger_jack_trainer_orm import PassengerJackTrainerOrm as PersonOrm
from titanic.adapter.outbound.orm.passenger_rose_model_orm import PassengerRoseModelOrm as BookingOrm
from titanic.app.dto.crew_walter_roaster_dto import WalterRoasterQuery, WalterRoasterResponse
from titanic.app.ports.output.crew_walter_roaster_repository import WalterRoasterRepository

logger = logging.getLogger(__name__)


def _row_to_dict(person: PersonOrm, booking: BookingOrm | None) -> dict[str, Any]:
    return {
        "id": person.id,
        "passenger_id": person.passenger_id,
        "survived": person.survived,
        "pclass": booking.pclass if booking else None,
        "name": person.name,
        "gender": person.gender,
        "age": person.age,
        "sib_sp": person.sib_sp,
        "parch": person.parch,
        "ticket": booking.ticket if booking else None,
        "fare": booking.fare if booking else None,
        "cabin": booking.cabin if booking else None,
        "embarked": booking.embarked if booking else None,
    }


class WalterRoasterPgRepository(WalterRoasterRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: WalterRoasterQuery) -> WalterRoasterResponse:
        logger.info("[WalterRoasterPgRepository] introduce_myself | request_data=%s", query)
        return WalterRoasterResponse(
            id=query.id * 10000,
            name=f"{query.name}가 레포지토리에 다녀옴",
            memo="Neon PostgreSQL passengers·bookings 테이블 승객 명단 조회",
        )

    async def list_passengers(self, skip: int = 0, limit: int = 50) -> list[dict[str, Any]]:
        rows = await self.session.execute(
            select(PersonOrm, BookingOrm)
            .outerjoin(BookingOrm, BookingOrm.passenger_id == PersonOrm.passenger_id)
            .order_by(PersonOrm.id)
            .offset(skip)
            .limit(limit)
        )
        return [_row_to_dict(person, booking) for person, booking in rows.all()]

    async def get_count(self) -> int:
        total = await self.session.execute(select(func.count()).select_from(PersonOrm))
        return int(total.scalar_one())
