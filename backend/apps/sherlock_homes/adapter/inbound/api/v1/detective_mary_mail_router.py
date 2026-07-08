from fastapi import APIRouter, Depends

from sherlock_homes.adapter.inbound.api.schemas.detective_mary_mail_schema import (
    MailIngestSchema,
    MailIngestResponse,
    MaryMailSchema,
    MaryMailReceiveSchema,
)
from sherlock_homes.app.dtos.detective_mary_mail_dto import MaryMailResponse, MaryMailReceiveResponse
from sherlock_homes.app.ports.input.detective_mary_mail_use_case import MaryMailUseCase
from sherlock_homes.dependencies.detective_mary_mail_provider import get_mary_mail_use_case

'''
메리 왓슨 (Mary)
역할 (keyword): mail (메일/알림)
EXAONE 임베딩 후 pgvector(mary_mails)에 저장합니다.
'''

mary_mail_router = APIRouter(prefix="/mary", tags=["mary"])


@mary_mail_router.get("/myself")
async def introduce_myself(
    mary: MaryMailUseCase = Depends(get_mary_mail_use_case),
) -> MaryMailResponse:
    return await mary.introduce_myself(
        MaryMailSchema(
            id=12,
            name="메리 왓슨 (Mary)",
        )
    )


@mary_mail_router.post("/receive")
async def receive_mail(
    schema: MaryMailReceiveSchema,
    mary: MaryMailUseCase = Depends(get_mary_mail_use_case),
) -> MaryMailReceiveResponse:
    return await mary.receive_mail(schema)


@mary_mail_router.post("/mail", response_model=MailIngestResponse, summary="메일 수신 → EXAONE 임베딩 → pgvector")
async def ingest_mail(
    schema: MailIngestSchema,
    mary: MaryMailUseCase = Depends(get_mary_mail_use_case),
) -> MailIngestResponse:
    result = await mary.ingest_mail(schema)
    return MailIngestResponse(
        ok=result.ok,
        mail_id=result.mail_id,
        embedded=result.embedded,
        message=result.message,
    )


@mary_mail_router.post("/mail/webhook", response_model=MailIngestResponse, summary="n8n Gmail Trigger 전용 alias")
async def ingest_mail_webhook(
    schema: MailIngestSchema,
    mary: MaryMailUseCase = Depends(get_mary_mail_use_case),
) -> MailIngestResponse:
    result = await mary.ingest_mail(schema)
    return MailIngestResponse(
        ok=result.ok,
        mail_id=result.mail_id,
        embedded=result.embedded,
        message=result.message,
    )
