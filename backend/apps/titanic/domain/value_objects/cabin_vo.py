from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class DeckType(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"
    UNKNOWN = "Unknown"


@dataclass(frozen=True)
class Cabin:
    value: Optional[str]

    @classmethod
    def from_raw(cls, raw: Optional[str]) -> "Cabin":
        if raw is None or raw.strip() == "":
            return cls(value=None)
        return cls(value=raw.strip())

    @property
    def deck(self) -> DeckType:
        if self.value is None:
            return DeckType.UNKNOWN
        letter = self.value[0].upper()
        try:
            return DeckType(letter)
        except ValueError:
            return DeckType.UNKNOWN

    @property
    def is_unknown(self) -> bool:
        return self.value is None

    def __str__(self) -> str:
        return self.value if self.value else "Unknown"
