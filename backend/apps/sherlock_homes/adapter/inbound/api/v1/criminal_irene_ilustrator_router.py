from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.criminal_irene_ilustrator_schema import IreneIlustratorSchema
from sherlock_homes.app.dtos.criminal_irene_ilustrator_dto import IreneIlustratorResponse
from sherlock_homes.app.ports.input.criminal_irene_ilustrator_use_case import IreneIlustratorUseCase
from sherlock_homes.dependencies.criminal_irene_ilustrator_provider import get_irene_ilustrator_use_case

'''
아이린 애들러 (Irene)
역할 (keyword): ilustrator (시각화 및 변수 창출)
국가 기밀을 손에 쥐고 셜록을 농락한 범죄자 (The Woman).
정형화되지 않은 방식으로 매력적인 변수(비정형 인사이트 보고서 컨셉, 독창적인 UI/UX 대안)를 도출합니다.
'''

irene_ilustrator_router = APIRouter(prefix="/irene", tags=["irene"])


@irene_ilustrator_router.get("/myself")
async def introduce_myself(
    irene: IreneIlustratorUseCase = Depends(get_irene_ilustrator_use_case)
) -> IreneIlustratorResponse:
    return await irene.introduce_myself(
        IreneIlustratorSchema(
            id=7,
            name="아이린 애들러 (Irene)"
        )
    )
