from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from titanic.domain.value_objects.passenger_jack_trainer_vo import Age, FamilyRelations, Gender


@dataclass(frozen=True)
class PassengerName:
    value: str

    def __post_init__(self) -> None:
        if not self.value or len(self.value.strip()) < 2:
            raise ValueError("이름은 최소 2글자 이상이어야 합니다.")


@dataclass
class Passenger:
    id: Optional[int]
    passenger_id: str
    name: Optional[PassengerName]
    gender: Gender
    age: Age
    family_relations: FamilyRelations
    is_survived: bool
    domain_events: List[object] = field(default_factory=list, init=False, repr=False)

    def __post_init__(self) -> None:
        if not self.passenger_id or self.passenger_id.strip() == "":
            raise ValueError("비즈니스 식별자인 Passenger ID는 필수값입니다.")

    @classmethod
    def create(
        cls,
        db_id: Optional[int],
        passenger_id: Optional[str],
        name_str: Optional[str],
        gender_str: Optional[str],
        age_str: Optional[str],
        sib_sp_str: Optional[str],
        parch_str: Optional[str],
        survived_str: Optional[str],
    ) -> Passenger:
        pid = (passenger_id or "").strip()
        return cls(
            id=db_id,
            passenger_id=pid,
            name=PassengerName(name_str.strip()) if name_str and name_str.strip() else None,
            gender=Gender.from_str(gender_str),
            age=Age.from_str(age_str),
            family_relations=FamilyRelations.from_strs(sib_sp_str, parch_str),
            is_survived=(survived_str or "").strip() == "1",
        )

    def change_name(self, new_name_str: str) -> None:
        self.name = PassengerName(new_name_str)

    def clear_events(self) -> None:
        self.domain_events.clear()
