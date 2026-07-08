from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.criminal_magnussen_archivist_schema import MagnussenArchivistSchema
from sherlock_homes.app.dtos.criminal_magnussen_archivist_dto import MagnussenArchivistResponse
from sherlock_homes.app.ports.input.criminal_magnussen_archivist_use_case import MagnussenArchivistUseCase
from sherlock_homes.dependencies.criminal_magnussen_archivist_provider import get_magnussen_archivist_use_case

'''
마그누센 (Magnussen)
역할 (keyword): archivist (전략 데이터 아카이브)
모든 유력 인사의 약점을 뇌 속 마인드 팰리스에 담아두고 협박하는 미디어 거물.
전략적 대립에 필요한 거대 규모의 장기 아카이브 데이터를 구조화하고 보관합니다.
'''

magnussen_archivist_router = APIRouter(prefix="/magnussen", tags=["magnussen"])


@magnussen_archivist_router.get("/myself")
async def introduce_myself(
    magnussen: MagnussenArchivistUseCase = Depends(get_magnussen_archivist_use_case)
) -> MagnussenArchivistResponse:
    return await magnussen.introduce_myself(
        MagnussenArchivistSchema(
            id=8,
            name="마그누센 (Magnussen)"
        )
    )
