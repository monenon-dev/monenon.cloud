from __future__ import annotations

from titanic.adapter.outbound.orm.passenger_jack_trainer_orm import PassengerJackTrainerOrm
from titanic.domain.entities.passenger_jack_trainer_entity import Passenger


class PassengerJackTrainerMapper:
    """Passenger domain entity ↔ PassengerJackTrainerOrm."""

    @staticmethod
    def to_entity(orm: PassengerJackTrainerOrm) -> Passenger:
        return Passenger.create(
            db_id=orm.id,
            passenger_id=orm.passenger_id,
            name_str=orm.name,
            gender_str=orm.gender,
            age_str=orm.age,
            sib_sp_str=orm.sib_sp,
            parch_str=orm.parch,
            survived_str=orm.survived,
        )

    @staticmethod
    def to_orm(
        entity: Passenger,
        *,
        orm: PassengerJackTrainerOrm | None = None,
    ) -> PassengerJackTrainerOrm:
        row = orm or PassengerJackTrainerOrm()
        if entity.id is not None:
            row.id = entity.id
        row.passenger_id = entity.passenger_id
        row.name = entity.name.value if entity.name else None
        row.gender = entity.gender.value if entity.gender.value != "unknown" else None
        row.age = str(entity.age.value) if entity.age.value is not None else None
        row.sib_sp = str(entity.family_relations.sib_sp)
        row.parch = str(entity.family_relations.parch)
        row.survived = "1" if entity.is_survived else "0"
        return row
