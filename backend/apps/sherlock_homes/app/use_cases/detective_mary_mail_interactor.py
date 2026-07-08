from __future__ import annotations

from sherlock_homes.adapter.inbound.api.schemas.detective_mary_mail_schema import (
    MailIngestSchema,
    MaryMailSchema,
    MaryMailReceiveSchema,
)
from sherlock_homes.app.dtos.detective_mary_mail_dto import (
    MailIngestQuery,
    MailIngestResult,
    MaryMailQuery,
    MaryMailResponse,
    MaryMailReceiveQuery,
    MaryMailReceiveResponse,
)
from sherlock_homes.app.ports.input.detective_mary_mail_use_case import MaryMailUseCase
from sherlock_homes.app.ports.output.detective_mary_mail_port import MaryMailPort


class MaryMailInteractor(MaryMailUseCase):

    def __init__(self, repository: MaryMailPort):
        self.repository = repository

    async def introduce_myself(self, schema: MaryMailSchema) -> MaryMailResponse:
        return await self.repository.introduce_myself(MaryMailQuery(
            id=schema.id,
            name=schema.name,
        ))

    async def receive_mail(self, schema: MaryMailReceiveSchema) -> MaryMailReceiveResponse:
        return await self.repository.receive_mail(MaryMailReceiveQuery(
            subject=schema.subject,
            from_=schema.from_,
            to=schema.to,
            preview=schema.preview,
            message_id=schema.message_id,
        ))

    async def ingest_mail(self, schema: MailIngestSchema) -> MailIngestResult:
        return await self.repository.ingest_mail(MailIngestQuery(
            from_email=str(schema.from_email),
            from_name=schema.from_name,
            subject=schema.subject,
            body_text=schema.body_text,
            received_at=schema.received_at,
            message_id=schema.message_id,
        ))
