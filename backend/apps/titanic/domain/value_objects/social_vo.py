from __future__ import annotations
import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class GenderType(str, Enum):
    MALE = "male"
    FEMALE = "female"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class Gender:
    value: GenderType

    @classmethod
    def from_raw(cls, raw: Optional[str]) -> "Gender":
        if raw is None:
            return cls(value=GenderType.UNKNOWN)
        mapping = {"male": GenderType.MALE, "female": GenderType.FEMALE}
        return cls(value=mapping.get(raw.strip().lower(), GenderType.UNKNOWN))

    def is_female(self) -> bool:
        return self.value == GenderType.FEMALE

    def is_male(self) -> bool:
        return self.value == GenderType.MALE

    def __str__(self) -> str:
        return self.value.value


class TitleType(str, Enum):
    MR = "Mr"
    MISS = "Miss"
    MRS = "Mrs"
    MASTER = "Master"
    ROYAL = "Royal"
    RARE = "Rare"
    UNKNOWN = "Unknown"


_RARE  = {"Capt", "Col", "Don", "Dr", "Major", "Rev", "Jonkheer", "Dona", "Mme"}
_ROYAL = {"Countess", "Lady", "Sir"}
_ALIAS = {"Mlle": "Mr", "Ms": "Miss"}
_CODE  = {
    TitleType.MR: 1, TitleType.MISS: 2, TitleType.MRS: 3,
    TitleType.MASTER: 4, TitleType.ROYAL: 5, TitleType.RARE: 6,
    TitleType.UNKNOWN: 0,
}


@dataclass(frozen=True)
class Title:
    value: TitleType

    @classmethod
    def from_name(cls, name: Optional[str]) -> "Title":
        if not name or not name.strip():
            return cls(value=TitleType.UNKNOWN)
        match = re.search(r"([A-Za-z]+)\.", name)
        if not match:
            return cls(value=TitleType.UNKNOWN)
        raw = _ALIAS.get(match.group(1), match.group(1))
        if raw in _RARE:
            return cls(value=TitleType.RARE)
        if raw in _ROYAL:
            return cls(value=TitleType.ROYAL)
        try:
            return cls(value=TitleType(raw))
        except ValueError:
            return cls(value=TitleType.UNKNOWN)

    @property
    def code(self) -> int:
        return _CODE[self.value]

    @property
    def is_rare(self) -> bool:
        return self.value == TitleType.RARE

    @property
    def is_royal(self) -> bool:
        return self.value == TitleType.ROYAL

    def __str__(self) -> str:
        return self.value.value


@dataclass(frozen=True)
class SocialStatus:
    gender: Gender
    title: Title

    @classmethod
    def from_raw(cls, sex: Optional[str], name: Optional[str]) -> "SocialStatus":
        return cls(
            gender=Gender.from_raw(sex),
            title=Title.from_name(name),
        )

    @property
    def is_high_priority(self) -> bool:
        return self.gender.is_female() or self.title.value == TitleType.MASTER

    def __str__(self) -> str:
        return f"{self.gender}/{self.title}"
