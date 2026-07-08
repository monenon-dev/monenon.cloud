# app/assemblers/james_director_assembler.py
from titanic.app.dtos.crew_james_director_dto import PassengerCommand
from titanic.domain.entities.crew_james_director_entity import PassengerEntity


class JamesDirectorAssembler:

    @staticmethod
    def to_entity(cmd: PassengerCommand) -> PassengerEntity:
        return PassengerEntity(
            id=cmd.id,
            name=cmd.name.strip(),
        )