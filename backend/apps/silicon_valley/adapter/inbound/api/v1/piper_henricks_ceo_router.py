from fastapi import APIRouter, Depends

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_henricks_ceo_schema import HenricksCeoSchema
from tailor.apps.silicon_valley.app.dtos.piper_henricks_ceo_dto import HenricksCeoResponse
from tailor.apps.silicon_valley.app.ports.input.piper_henricks_ceo_use_case import HenricksCeoUseCase
from tailor.apps.silicon_valley.dependencies.piper_henricks_ceo_provider import get_henricks_ceo_use_case

'''
리차드 헨드릭스 (Richard Hendricks)
피드 파이퍼의 창업자 겸 CEO. 중간 아웃(Middle-Out) 압축 알고리즘 발명자.
뛰어난 기술력과 반비례하는 사회성, 끊임없는 의사결정 실수로 회사를 위기에 몰아넣지만 결국 해결해냄.
'''
henricks_ceo_router = APIRouter(prefix="/henricks", tags=["henricks"])


@henricks_ceo_router.get("/myself")
async def introduce_myself(
    henricks: HenricksCeoUseCase = Depends(get_henricks_ceo_use_case)
) -> HenricksCeoResponse:

    return await henricks.introduce_myself(
        HenricksCeoSchema(
            id=5,
            name="리차드 헨드릭스 (Richard Hendricks)",
        )
    )
