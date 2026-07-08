from fastapi import APIRouter, Depends

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_bighetti_hr_schema import BighettiHrSchema
from tailor.apps.silicon_valley.app.dtos.piper_bighetti_hr_dto import BighettiHrResponse
from tailor.apps.silicon_valley.app.ports.input.piper_bighetti_hr_use_case import BighettiHrUseCase
from tailor.apps.silicon_valley.dependencies.piper_bighetti_hr_provider import get_bighetti_hr_use_case

'''
넬슨 비게티 (Nelson Bighetti / Big Head)
리차드의 어린 시절 친구. 피드 파이퍼를 떠나 Hooli에 입사했다가 우연히 Hooli XYZ 사장까지 됨.
특별히 노력하지 않아도 좋은 자리에 앉게 되는 기이한 행운의 소유자.
'''
bighetti_hr_router = APIRouter(prefix="/bighetti", tags=["bighetti"])


@bighetti_hr_router.get("/myself")
async def introduce_myself(
    bighetti: BighettiHrUseCase = Depends(get_bighetti_hr_use_case)
) -> BighettiHrResponse:

    return await bighetti.introduce_myself(
        BighettiHrSchema(
            id=1,
            name="넬슨 비게티 (Nelson Bighetti)",
        )
    )
