from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class EmbarkedType(str, Enum):
    CHERBOURG = "C"
    QUEENSTOWN = "Q"
    SOUTHAMPTON = "S"
    UNKNOWN = "Unknown"


@dataclass(frozen=True)
class Embarked:
    value: EmbarkedType

    @classmethod
    def from_raw(cls, raw: Optional[str]) -> "Embarked":
        if raw is None or raw.strip() == "":
            return cls(value=EmbarkedType.UNKNOWN)
        mapping = {
            "C": EmbarkedType.CHERBOURG,
            "Q": EmbarkedType.QUEENSTOWN,
            "S": EmbarkedType.SOUTHAMPTON,
        }
        embarked_type = mapping.get(raw.strip().upper(), EmbarkedType.UNKNOWN)
        return cls(value=embarked_type)

    def __str__(self) -> str:
        return self.value.value
