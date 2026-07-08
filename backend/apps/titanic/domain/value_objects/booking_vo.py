from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class PClassType(int, Enum):
    FIRST = 1
    SECOND = 2
    THIRD = 3


@dataclass(frozen=True)
class PClass:
    value: PClassType

    @classmethod
    def from_raw(cls, raw: Optional[str]) -> "PClass":
        if raw is None or raw.strip() == "":
            raise ValueError("PClass는 필수 값입니다.")
        try:
            return cls(value=PClassType(int(raw.strip())))
        except (ValueError, KeyError):
            raise ValueError(f"PClass 유효하지 않은 값: '{raw}'")

    @property
    def is_first_class(self) -> bool:
        return self.value == PClassType.FIRST

    def __str__(self) -> str:
        return str(self.value.value)


@dataclass(frozen=True)
class Fare:
    value: Optional[float]

    def __post_init__(self) -> None:
        if self.value is not None and self.value < 0:
            raise ValueError(f"Fare는 0 이상이어야 합니다: {self.value}")

    @classmethod
    def from_raw(cls, raw: Optional[str]) -> "Fare":
        if raw is None or raw.strip() == "":
            return cls(value=None)
        try:
            return cls(value=float(raw))
        except ValueError:
            raise ValueError(f"Fare 파싱 실패: '{raw}'")

    @property
    def is_unknown(self) -> bool:
        return self.value is None

    def __str__(self) -> str:
        return str(self.value) if self.value is not None else "Unknown"


@dataclass(frozen=True)
class Ticket:
    value: str

    def __post_init__(self) -> None:
        if not self.value or not self.value.strip():
            raise ValueError("Ticket은 빈 값일 수 없습니다.")

    @classmethod
    def from_raw(cls, raw: Optional[str]) -> "Ticket":
        if raw is None or raw.strip() == "":
            raise ValueError("Ticket은 빈 값일 수 없습니다.")
        return cls(value=raw.strip())

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class BookingInfo:
    pclass: PClass
    fare: Fare
    ticket: Ticket

    @classmethod
    def from_raw(cls, pclass: Optional[str], fare: Optional[str], ticket: Optional[str]) -> "BookingInfo":
        return cls(
            pclass=PClass.from_raw(pclass),
            fare=Fare.from_raw(fare),
            ticket=Ticket.from_raw(ticket),
        )

    @property
    def is_premium(self) -> bool:
        return self.pclass.is_first_class

    def __str__(self) -> str:
        return f"Class={self.pclass}, Fare={self.fare}, Ticket={self.ticket}"
