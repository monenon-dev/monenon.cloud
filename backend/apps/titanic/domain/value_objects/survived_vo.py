from __future__ import annotations
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SurvivalStatus:
    survived: Optional[bool]

    @classmethod
    def from_raw(cls, raw: Optional[str]) -> "SurvivalStatus":
        if raw is None or raw.strip() == "":
            return cls(survived=None)
        if raw.strip() == "1":
            return cls(survived=True)
        if raw.strip() == "0":
            return cls(survived=False)
        raise ValueError(f"SurvivalStatus 파싱 실패: '{raw}'")

    @property
    def is_unknown(self) -> bool:
        return self.survived is None

    def __str__(self) -> str:
        if self.survived is None:
            return "Unknown"
        return "Survived" if self.survived else "Did not survive"
