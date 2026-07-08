from io import StringIO
import csv

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from sherlock_homes.adapter.inbound.api.schemas.police_mycroft_libraraian_schema import (
    MycroftContactSchema, ContactSchema, ContactUploadResultSchema,
)
from sherlock_homes.app.dtos.police_mycroft_contact_dto import MycroftContactResponse
from sherlock_homes.app.ports.input.police_mycroft_contact_use_case import MycroftContactUseCase
from sherlock_homes.dependencies.police_mycroft_contact_provider import get_mycroft_contact_use_case

'''
마이크로프트 홈즈 (Mycroft)
역할 (keyword): libraraian (지식/정보 창고)
영국 정부의 핵심 관료이자 최고 국가 정보망을 통제하는 인물.
정부 기관 레벨의 거대 글로벌 컨텍스트 및 마스터 지식 베이스를 관리합니다.
'''

mycroft_juso_router = APIRouter(prefix="/mycroft", tags=["mycroft"])


@mycroft_juso_router.get("/myself")
async def introduce_myself(
    mycroft: MycroftContactUseCase = Depends(get_mycroft_contact_use_case)
) -> MycroftContactResponse:
    return await mycroft.introduce_myself(
        MycroftContactSchema(
            id=3,
            name="마이크로프트 홈즈 (Mycroft)"
        )
    )


@mycroft_juso_router.post("/upload", response_model=ContactUploadResultSchema, summary="Google 주소록 CSV 업로드")
async def upload_contacts(
    file: UploadFile = File(...),
    mycroft: MycroftContactUseCase = Depends(get_mycroft_contact_use_case),
):
    contacts = _parse_csv((await file.read()).decode("utf-8", errors="replace"))
    result = await mycroft.upload_contacts(contacts)
    return ContactUploadResultSchema(count=result.count, message=result.message)


# ── CSV 파싱 ─────────────────────────────────────────────────────────────────

def _parse_csv(text: str) -> list[ContactSchema]:
    if not text.strip():
        raise HTTPException(status_code=400, detail="빈 CSV 파일입니다.")
    reader = csv.DictReader(StringIO(text))
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV 헤더를 읽을 수 없습니다.")
    return [ContactSchema(**_normalize_contact_row(row)) for row in reader]


def _normalize_contact_row(row: dict) -> dict:
    """Google 주소록 CSV 컬럼명 → ContactSchema 필드명 변환."""
    mapping = {
        "first name":                "first_name",
        "middle name":               "middle_name",
        "last name":                 "last_name",
        "name prefix":               "name_prefix",
        "name suffix":               "name_suffix",
        "nickname":                  "nickname",
        "organization name":         "organization_name",
        "organization title":        "organization_title",
        "organization department":   "organization_department",
        "birthday":                  "birthday",
        "notes":                     "notes",
        "labels":                    "labels",
        "e-mail 1 - value":          "email_1",
        "e-mail 2 - value":          "email_2",
        "phone 1 - value":           "phone_1",
    }
    normalized: dict = {}
    for raw_key, value in row.items():
        if raw_key is None:
            continue
        field = mapping.get(raw_key.strip().lower())
        if field:
            normalized[field] = value.strip() or None
    return normalized
