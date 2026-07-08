from __future__ import annotations


class CrewSmithCaptainMapper:
    """Maps crew_smith_captain entity ↔ ORM. Define when crew_smith_captain_orm is ready."""

    @staticmethod
    def to_entity(orm: object) -> object:
        raise NotImplementedError("crew_smith_captain_orm is not defined yet")

    @staticmethod
    def to_orm(entity: object, *, orm: object | None = None) -> object:
        raise NotImplementedError("crew_smith_captain_orm is not defined yet")
