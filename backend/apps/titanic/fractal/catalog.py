from __future__ import annotations

from titanic.fractal._node import CharacterNode
from titanic.fractal.crew.andrews import NODE as ANDREWS
from titanic.fractal.crew.hartley import NODE as HARTLEY
from titanic.fractal.crew.james import NODE as JAMES
from titanic.fractal.crew.lowe import NODE as LOWE
from titanic.fractal.crew.smith import NODE as SMITH
from titanic.fractal.crew.walter import NODE as WALTER
from titanic.fractal.passenger.cal import NODE as CAL
from titanic.fractal.passenger.isidor import NODE as ISIDOR
from titanic.fractal.passenger.jack import NODE as JACK
from titanic.fractal.passenger.molly import NODE as MOLLY
from titanic.fractal.passenger.rose import NODE as ROSE
from titanic.fractal.passenger.ruth import NODE as RUTH

# 라우터 등록 순서 유지
ALL_CHARACTERS: tuple[CharacterNode, ...] = (
    JAMES,
    WALTER,
    RUTH,
    ROSE,
    JACK,
    CAL,
    SMITH,
    ISIDOR,
    HARTLEY,
    ANDREWS,
    LOWE,
    MOLLY,
)

CREW_CHARACTERS: tuple[CharacterNode, ...] = tuple(c for c in ALL_CHARACTERS if c.group == "crew")
PASSENGER_CHARACTERS: tuple[CharacterNode, ...] = tuple(
    c for c in ALL_CHARACTERS if c.group == "passenger"
)

ALL_ROUTERS = [character.router for character in ALL_CHARACTERS]

CHARACTER_BY_SLUG: dict[str, CharacterNode] = {character.slug: character for character in ALL_CHARACTERS}

__all__ = [
    "ALL_CHARACTERS",
    "ALL_ROUTERS",
    "CHARACTER_BY_SLUG",
    "CREW_CHARACTERS",
    "PASSENGER_CHARACTERS",
    "CharacterNode",
]
