from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.criminal_eurus_prophet_schema import EurusProphetSchema
from sherlock_homes.app.dtos.criminal_eurus_prophet_dto import EurusProphetResponse
from sherlock_homes.app.ports.input.criminal_eurus_prophet_use_case import EurusProphetUseCase
from sherlock_homes.dependencies.criminal_eurus_prophet_provider import get_eurus_prophet_use_case

'''
유라루스 홈즈 (Eurus)
역할 (keyword): prophet (예측/예언가)
섬에 격리된 최강 지능의 범죄자.
인간의 행동을 완벽히 읽고 프로그래밍하듯 미래를 통제하며, 타겟 모델의 트렌드 예측 및 비선형적 시나리오를 모델링합니다.
'''

eurus_prophet_router = APIRouter(prefix="/eurus", tags=["eurus"])


@eurus_prophet_router.get("/myself")
async def introduce_myself(
    eurus: EurusProphetUseCase = Depends(get_eurus_prophet_use_case)
) -> EurusProphetResponse:
    return await eurus.introduce_myself(
        EurusProphetSchema(
            id=6,
            name="유라루스 홈즈 (Eurus)"
        )
    )
