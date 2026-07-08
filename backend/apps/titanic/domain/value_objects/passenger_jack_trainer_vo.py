from dataclasses import dataclass
from enum import Enum
from typing import Optional

class Gender(Enum):
    MALE = "male"
    FEMALE = "female"
    UNKNOWN = "unknown"

    @classmethod
    def from_str(cls, value: Optional[str]) -> "Gender":
        if not value:
            return cls.UNKNOWN
        clean_value = value.strip().lower()
        if clean_value == "male":
            return cls.MALE
        elif clean_value == "female":
            return cls.FEMALE
        return cls.UNKNOWN


@dataclass(frozen=True)
class Age:
    value: Optional[float]

    def __post_init__(self):
        # 도메인 규칙 검증
        if self.value is not None and self.value < 0:
            raise ValueError("나이는 음수일 수 없습니다.")

    @classmethod
    def from_str(cls, value: Optional[str]) -> "Age":
        if not value or value.strip() == "" or value.lower() == "nan":
            return cls(None)
        try:
            return cls(float(value))
        except ValueError:
            raise ValueError(f"유효하지 않은 나이 형식입니다: {value}")


@dataclass(frozen=True)
class FamilyRelations:
    sib_sp: int  # 동반한 형제자매/배우자 수
    parch: int   # 동반한 부모/자식 수

    def __post_init__(self):
        if self.sib_sp < 0 or self.parch < 0:
            raise ValueError("가족 구성원 수는 음수일 수 없습니다.")

    @classmethod
    def from_strs(cls, sib_sp_str: Optional[str], parch_str: Optional[str]) -> "FamilyRelations":
        try:
            # 빈 값이거나 누락된 경우 기본값 0 처리
            sib_sp = int(float(sib_sp_str)) if (sib_sp_str and sib_sp_str.strip()) else 0
            parch = int(float(parch_str)) if (parch_str and parch_str.strip()) else 0
            return cls(sib_sp=sib_sp, parch=parch)
        except ValueError:
            raise ValueError(f"가족 관계 수치는 정수여야 합니다. (입력값: sib_sp={sib_sp_str}, parch={parch_str})")

    @property
    def total_family_size(self) -> int:
        """비즈니스 로직 예시: 동반한 총 가족 수"""
        return self.sib_sp + self.parch