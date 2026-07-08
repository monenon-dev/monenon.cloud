from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.detective_mary_mail_schema import MailIngestSchema
from sherlock_homes.adapter.inbound.api.schemas.detective_watson_watcher_schema import (
    WatsonMailTriageResponse,
    WatsonWatcherSchema,
)
from sherlock_homes.app.dtos.detective_watson_watcher_dto import WatsonWatcherResponse
from sherlock_homes.app.ports.input.detective_watson_watcher_use_case import WatsonWatcherUseCase
from sherlock_homes.dependencies.detective_watson_watcher_provider import get_watson_watcher_use_case

'''
존 왓슨 (John)
역할 (keyword): watcher (관찰/기록자)
셜록의 파트너인 사설 탐정 조력자.
KcELECTRA로 메일을 1차 분류한 뒤 정상 메일만 Mary pgvector 파이프라인으로 전달합니다.
'''

watson_watcher_router = APIRouter(prefix="/watson", tags=["watson"])


@watson_watcher_router.get("/myself")
async def introduce_myself(
    watson: WatsonWatcherUseCase = Depends(get_watson_watcher_use_case),
) -> WatsonWatcherResponse:
    return await watson.introduce_myself(
        WatsonWatcherSchema(
            id=10,
            name="존 왓슨 (John)",
        )
    )


@watson_watcher_router.post("/mail", response_model=WatsonMailTriageResponse, summary="메일 Triage (KcELECTRA → Mary pgvector)")
async def triage_mail(
    schema: MailIngestSchema,
    watson: WatsonWatcherUseCase = Depends(get_watson_watcher_use_case),
) -> WatsonMailTriageResponse:
    result = await watson.triage_mail(schema)
    return WatsonMailTriageResponse(
        ok=result.ok,
        accepted=result.accepted,
        label=result.label,
        score=result.score,
        mail_id=result.mail_id,
        embedded=result.embedded,
        message=result.message,
    )
