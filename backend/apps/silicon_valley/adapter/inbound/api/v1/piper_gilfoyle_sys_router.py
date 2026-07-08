from fastapi import APIRouter, Depends

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_gilfoyle_sys_schema import GilfoyleSysSchema
from tailor.apps.silicon_valley.app.dtos.piper_gilfoyle_sys_dto import GilfoyleSysResponse
from tailor.apps.silicon_valley.app.ports.input.piper_gilfoyle_sys_use_case import GilfoyleSysUseCase
from tailor.apps.silicon_valley.dependencies.piper_gilfoyle_sys_provider import get_gilfoyle_sys_use_case

'''
버트람 길포일 (Bertram Gilfoyle)
피드 파이퍼의 시스템 아키텍트. 자칭 사타니스트. 딘에쉬를 만성으로 무시하지만 실력은 팀 최정상급.
서버 인프라 전반을 홀로 관리하며 냉소적인 한마디로 회의 분위기를 압도함.
'''
gilfoyle_sys_router = APIRouter(prefix="/gilfoyle", tags=["gilfoyle"])


@gilfoyle_sys_router.get("/myself")
async def introduce_myself(
    gilfoyle: GilfoyleSysUseCase = Depends(get_gilfoyle_sys_use_case)
) -> GilfoyleSysResponse:

    return await gilfoyle.introduce_myself(
        GilfoyleSysSchema(
            id=4,
            name="버트람 길포일 (Bertram Gilfoyle)",
        )
    )
