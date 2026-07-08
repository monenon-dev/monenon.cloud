from dataclasses import dataclass
from typing import Optional

# 위에서 작성한 VO가 같은 패키지 내에 있다고 가정합니다.
# from .value_objects import Gender, Age, FamilyRelations

@dataclass
class PassengerRose:
    id: Optional[int]              # DB 인프라 식별자 (PK)
    passenger_id: str              # 도메인 비즈니스 식별자 (UUID나 고유 번호)
    name: Optional[str]
    gender: Gender
    age: Age
    family_relations: FamilyRelations
    is_survived: bool

    def __post_init__(self):
        # 엔티티 생성 시점의 식별자 정밀 검증
        if not self.passenger_id or self.passenger_id.strip() == "":
            raise ValueError("비즈니스 고유 식별자인 Passenger ID는 필수값입니다.")

    @classmethod
    def create(
        cls,
        db_id: Optional[int],
        passenger_id: Optional[str],
        name: Optional[str],
        gender_str: Optional[str],
        age_str: Optional[str],
        sib_sp_str: Optional[str],
        parch_str: Optional[str],
        survived_str: Optional[str]
    ) -> "PassengerRose":
        """
        인프라(Raw 데이터) 경계에서 들어오는 거친 문자열 데이터를 
        안전하고 완전한 도메인 객체로 정제하여 조립하는 팩토리 메서드입니다.
        """
        if not passenger_id or passenger_id.strip() == "":
            raise ValueError("passenger_id가 유효하지 않아 도메인 엔티티를 생성할 수 없습니다.")

        # 생존 여부 도메인 표현 방식(bool)으로 엄격하게 캐스팅
        is_survived = False
        if survived_str:
            clean_survived = survived_str.strip().lower()
            is_survived = clean_survived in ("1", "true", "yes")

        return cls(
            id=db_id,
            passenger_id=passenger_id.strip(),
            name=name.strip() if name else None,
            gender=Gender.from_str(gender_str),
            age=Age.from_str(age_str),
            family_relations=FamilyRelations.from_strs(sib_sp_str, parch_str),
            is_survived=is_survived
        )

    # 외부에서 setter로 무분별하게 수정하는 것을 제한하는 비즈니스 메서드
    def change_name(self, new_name: str) -> None:
        if not new_name or new_name.strip() == "":
            raise ValueError("변경할 이름은 빈 값일 수 없습니다.")
        self.name = new_name.strip()
        
    def update_survival_status(self, survived: bool) -> None:
        """생존 상태 업데이트 유스케이스 구현"""
        self.is_survived = survived