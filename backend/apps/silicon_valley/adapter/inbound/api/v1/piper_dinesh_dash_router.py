from fastapi import APIRouter, Depends

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_dinesh_dash_schema import DineshDashSchema
from tailor.apps.silicon_valley.app.dtos.piper_dinesh_dash_dto import DineshDashResponse
from tailor.apps.silicon_valley.app.ports.input.piper_dinesh_dash_use_case import DineshDashUseCase
from tailor.apps.silicon_valley.dependencies.piper_dinesh_dash_provider import get_dinesh_dash_use_case

'''
딘에쉬 추그타이 (Dinesh Chugtai)
피드 파이퍼의 백엔드 개발자. 길포일과 끊임없이 티격태격하지만 실력은 충분함.
잠깐 CEO 자리에 앉기도 했으나 처참한 결과로 끝남. 대시보드 개발 담당.
'''
dinesh_dash_router = APIRouter(prefix="/dinesh", tags=["dinesh"])


@dinesh_dash_router.get("/myself")
async def introduce_myself(
    dinesh: DineshDashUseCase = Depends(get_dinesh_dash_use_case)
) -> DineshDashResponse:

    return await dinesh.introduce_myself(
        DineshDashSchema(
            id=2,
            name="딘에쉬 추그타이 (Dinesh Chugtai)",
        )
    )
