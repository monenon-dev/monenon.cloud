from __future__ import annotations


class CrewWalterRoasterMapper:
    """Maps crew_walter_roaster entity ↔ ORM. Define when crew_walter_roaster_orm is ready."""

    @staticmethod
    def to_entity(orm: object) -> object:
        raise NotImplementedError("crew_walter_roaster_orm is not defined yet")

    @staticmethod
    def to_orm(entity: object, *, orm: object | None = None) -> object:
        raise NotImplementedError("crew_walter_roaster_orm is not defined yet")
