from __future__ import annotations


class PassengerCalTesterMapper:
    """Maps passenger_cal_tester entity ↔ ORM. Define when passenger_cal_tester_orm is ready."""

    @staticmethod
    def to_entity(orm: object) -> object:
        raise NotImplementedError("passenger_cal_tester_orm is not defined yet")

    @staticmethod
    def to_orm(entity: object, *, orm: object | None = None) -> object:
        raise NotImplementedError("passenger_cal_tester_orm is not defined yet")
