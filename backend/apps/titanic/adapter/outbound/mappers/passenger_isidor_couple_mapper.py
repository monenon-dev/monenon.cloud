from __future__ import annotations


class PassengerIsidorCoupleMapper:
    """Maps passenger_isidor_couple entity ↔ ORM. Define when passenger_isidor_couple_orm is ready."""

    @staticmethod
    def to_entity(orm: object) -> object:
        raise NotImplementedError("passenger_isidor_couple_orm is not defined yet")

    @staticmethod
    def to_orm(entity: object, *, orm: object | None = None) -> object:
        raise NotImplementedError("passenger_isidor_couple_orm is not defined yet")
