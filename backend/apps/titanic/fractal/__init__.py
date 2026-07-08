"""Titanic 12인물 프랙탈 레지스트리 — 그룹(crew/passenger) → 캐릭터(slug) → CharacterNode."""

from titanic.fractal._node import CharacterNode
from titanic.fractal.catalog import (
    ALL_CHARACTERS,
    ALL_ROUTERS,
    CHARACTER_BY_SLUG,
    CREW_CHARACTERS,
    PASSENGER_CHARACTERS,
)

__all__ = [
    "CharacterNode",
    "ALL_CHARACTERS",
    "ALL_ROUTERS",
    "CHARACTER_BY_SLUG",
    "CREW_CHARACTERS",
    "PASSENGER_CHARACTERS",
]
