from __future__ import annotations


class CrewLoweBoatMapper:
    """Maps crew_lowe_boat entity ↔ ORM. Define when crew_lowe_boat_orm is ready."""

    @staticmethod
    def to_entity(orm: object) -> object:
        raise NotImplementedError("crew_lowe_boat_orm is not defined yet")

    @staticmethod
    def to_orm(entity: object, *, orm: object | None = None) -> object:
        raise NotImplementedError("crew_lowe_boat_orm is not defined yet")
