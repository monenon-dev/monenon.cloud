from fastapi import APIRouter, Depends

from titanic.adapter.inbound.api.schemas.passenger_cal_tester_schema import CalTesterSchema
from titanic.app.dto.passenger_cal_tester_dto import CalTesterResponse
from titanic.app.ports.input.passenger_cal_tester_use_case import CalTesterUseCase
from titanic.app.dependencies.passenger_cal_tester_provider import get_cal_tester_use_case

cal_tester_router = APIRouter(prefix="/titanic/cal", tags=["cal"])


@cal_tester_router.get("/myself")
async def introduce_myself(
    cal: CalTesterUseCase = Depends(get_cal_tester_use_case),
) -> CalTesterResponse:
    return await cal.introduce_myself(
        CalTesterSchema(
            id=11,
            name="캘레돈 Hockley (Caledon Hockley)",
        )
    )
