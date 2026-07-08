from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class AgeGroup(str, Enum):
    BABY = "baby"            # 0 ~ 1세
    CHILD = "child"          # 2 ~ 12세
    TEENAGER = "teenager"    # 13 ~ 17세
    ADULT = "adult"          # 18 ~ 59세
    SENIOR = "senior"        # 60세 이상
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class Age:
    value: Optional[float]

    def __post_init__(self) -> None:
        if self.value is not None:
            if self.value < 0 or self.value > 120:
                raise ValueError(f"Age 유효 범위 초과: {self.value}")

    @classmethod
    def from_raw(cls, raw: Optional[str]) -> "Age":
        if raw is None or raw.strip() == "":
            return cls(value=None)
        try:
            return cls(value=float(raw))
        except ValueError:
            raise ValueError(f"Age 파싱 실패: '{raw}'")

    @property
    def is_unknown(self) -> bool:
        return self.value is None

    @property
    def is_minor(self) -> bool:
        return self.value is not None and self.value < 18

    @property
    def age_group(self) -> AgeGroup:
        if self.value is None:
            return AgeGroup.UNKNOWN
        if self.value < 2:
            return AgeGroup.BABY
        if self.value < 13:
            return AgeGroup.CHILD
        if self.value < 18:
            return AgeGroup.TEENAGER
        if self.value < 60:
            return AgeGroup.ADULT
        return AgeGroup.SENIOR

    def __str__(self) -> str:
        return str(self.value) if self.value is not None else "Unknown"
