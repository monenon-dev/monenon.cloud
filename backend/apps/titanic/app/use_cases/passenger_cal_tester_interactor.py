from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from titanic.adapter.inbound.api.schemas.passenger_cal_tester_schema import CalTesterSchema
from titanic.app.dto.passenger_cal_tester_dto import CalTesterQuery, CalTesterResponse
from titanic.app.ports.input.passenger_cal_tester_use_case import CalTesterUseCase
from titanic.app.ports.output.passenger_cal_tester_repository import CalTesterRepository


class CaledonValidation(BaseModel):
    Pclass: int = Field(..., ge=1, le=3, description="티켓 클래스 (1 = 1등석, 2 = 2등석, 3 = 3등석)")
    Sex: Literal["male", "female"] = Field(..., description="성별 (male 또는 female)")
    Age: float = Field(..., ge=0.0, description="나이")
    SibSp: int = Field(..., ge=0, description="함께 탑승한 형제자매 / 배우자의 수")
    Parch: int = Field(..., ge=0, description="함께 탑승한 부모님 / 아이들의 수")
    Fare: float = Field(..., ge=0.0, description="탑승 요금")


class CalTesterInteractor(CalTesterUseCase):
    def __init__(self, repository: CalTesterRepository) -> None:
        self.repository = repository

    async def introduce_myself(self, schema: CalTesterSchema) -> CalTesterResponse:
        return await self.repository.introduce_myself(
            CalTesterQuery(id=schema.id, name=schema.name)
        )
