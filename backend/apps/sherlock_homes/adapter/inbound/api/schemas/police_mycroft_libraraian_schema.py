from pydantic import BaseModel, Field

'''
캐릭터: 마이크로프트 홈즈 (Mycroft)
역할 (keyword): libraraian (지식/정보 창고)
드라마 설정 및 시스템 기능: 영국 정부의 핵심 관료이자 최고 국가 정보망을 통제하는 인물.
정부 기관 레벨의 거대 글로벌 컨텍스트 및 마스터 지식 베이스를 관리합니다.
'''

class MycroftContactSchema(BaseModel):

    id: int = Field(0, description="마이크로프트 ID")
    name: str = Field("마이크로프트 홈즈 (Mycroft)", description="영국 정부의 핵심 관료, 국가 정보망 통제자")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 3,
                "name": "Mycroft libraraian",
            }
        }
    }


class ContactSchema(BaseModel):
    first_name: str | None = None
    middle_name: str | None = None
    last_name: str | None = None
    name_prefix: str | None = None
    name_suffix: str | None = None
    nickname: str | None = None
    organization_name: str | None = None
    organization_title: str | None = None
    organization_department: str | None = None
    birthday: str | None = None
    notes: str | None = None
    labels: str | None = None
    email_1: str | None = None
    email_2: str | None = None
    phone_1: str | None = None


class ContactUploadResultSchema(BaseModel):
    count: int
    message: str
