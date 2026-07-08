from __future__ import annotations

from titanic.adapter.inbound.api.schemas.crew_james_director_schema import (
    FileUploadSchema,
    JamesDirectorSchema,
)
from titanic.app.dto.crew_james_director_dto import (
    BookingCommand,
    JamesDirectorQuery,
    JamesDirectorResponse,
    PersonCommand,
)
from titanic.app.ports.output.crew_james_director_repository import JamesDirectorRepository


def _str_or_empty(value: str | None) -> str:
    return "" if value is None else str(value)


class JamesDirectorInteractor:
    def __init__(self, repository: JamesDirectorRepository):
        self.repository = repository

    async def introduce_myself(self, schema: JamesDirectorSchema) -> JamesDirectorResponse:
        return await self.repository.introduce_myself(
            JamesDirectorQuery(id=schema.id, name=schema.name)
        )

    async def upload_titanic_file(self, records: list[FileUploadSchema]) -> dict[str, int]:
        person_commands = [
            PersonCommand(
                passenger_id=_str_or_empty(record.passenger_id),
                survived=_str_or_empty(record.survived),
                name=_str_or_empty(record.name),
                gender=_str_or_empty(record.gender),
                age=_str_or_empty(record.age),
                sib_sp=_str_or_empty(record.sib_sp),
                parch=_str_or_empty(record.parch),
            )
            for record in records
        ]
        booking_commands = [
            BookingCommand(
                pclass=_str_or_empty(record.pclass),
                ticket=_str_or_empty(record.ticket),
                fare=_str_or_empty(record.fare),
                cabin=_str_or_empty(record.cabin),
                embarked=_str_or_empty(record.embarked),
            )
            for record in records
        ]
        saved = await self.repository.receive_uploaded_records(person_commands, booking_commands)
        return {"saved": saved}
