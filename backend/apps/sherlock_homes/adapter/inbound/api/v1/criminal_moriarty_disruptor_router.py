from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.criminal_moriarty_disruptor_schema import MoriartyDisruptorSchema
from sherlock_homes.app.dtos.criminal_moriarty_disruptor_dto import MoriartyDisruptorResponse
from sherlock_homes.app.ports.input.criminal_moriarty_disruptor_use_case import MoriartyDisruptorUseCase
from sherlock_homes.dependencies.criminal_moriarty_disruptor_provider import get_moriarty_disruptor_use_case

'''
모리어티 (Moriarty)
역할 (keyword): disruptor (시뮬레이터/레드팀)
셜록의 숙적이자 자문 범죄자.
시스템의 취약점을 파고드는 카오스 엔지니어링이나 스트레스 테스트용 비정상 변수 데이터를 생성하여 방어력을 측정합니다.
'''

moriarty_disruptor_router = APIRouter(prefix="/moriarty", tags=["moriarty"])


@moriarty_disruptor_router.get("/myself")
async def introduce_myself(
    moriarty: MoriartyDisruptorUseCase = Depends(get_moriarty_disruptor_use_case)
) -> MoriartyDisruptorResponse:
    return await moriarty.introduce_myself(
        MoriartyDisruptorSchema(
            id=5,
            name="모리어티 (Moriarty)"
        )
    )
