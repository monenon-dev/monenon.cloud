from __future__ import annotations


class PassengerRuthValidationMapper:
    """Maps passenger_ruth_validation entity ↔ ORM. Define when passenger_ruth_validation_orm is ready."""

    @staticmethod
    def to_entity(orm: object) -> object:
        raise NotImplementedError("passenger_ruth_validation_orm is not defined yet")

    @staticmethod
    def to_orm(entity: object, *, orm: object | None = None) -> object:
        raise NotImplementedError("passenger_ruth_validation_orm is not defined yet")
