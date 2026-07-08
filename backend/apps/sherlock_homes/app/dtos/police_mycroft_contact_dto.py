from dataclasses import dataclass

'''
캐릭터: 마이크로프트 홈즈 (Mycroft)
역할 (keyword): libraraian (지식/정보 창고)
드라마 설정 및 시스템 기능: 영국 정부의 핵심 관료이자 최고 국가 정보망을 통제하는 인물.
정부 기관 레벨의 거대 글로벌 컨텍스트 및 마스터 지식 베이스를 관리합니다.
'''

@dataclass(frozen=True)
class MycroftContactQuery:
    id: int
    name: str


@dataclass(frozen=True)
class MycroftContactResponse:
    id: int
    name: str


@dataclass(frozen=True)
class ContactCommand:
    first_name: str | None
    middle_name: str | None
    last_name: str | None
    name_prefix: str | None
    name_suffix: str | None
    nickname: str | None
    organization_name: str | None
    organization_title: str | None
    organization_department: str | None
    birthday: str | None
    notes: str | None
    labels: str | None
    email_1: str | None
    email_2: str | None
    phone_1: str | None


@dataclass(frozen=True)
class ContactUploadResult:
    count: int
    message: str
