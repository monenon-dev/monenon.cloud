from __future__ import annotations


class CrewJamesDirectorMapper:
    """Maps crew_james_director entity ↔ ORM. Define when crew_james_director_orm is ready."""

    @staticmethod
    def to_entity(orm: object) -> object:
        raise NotImplementedError("crew_james_director_orm is not defined yet")

    @staticmethod
    def to_orm(entity: object, *, orm: object | None = None) -> object:
        raise NotImplementedError("crew_james_director_orm is not defined yet")
