from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.detective_mary_mail_schema import (
    MailIngestSchema,
    MaryMailSchema,
    MaryMailReceiveSchema,
)
from sherlock_homes.app.dtos.detective_mary_mail_dto import MailIngestResult, MaryMailResponse, MaryMailReceiveResponse


class MaryMailUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: MaryMailSchema) -> MaryMailResponse:
        '''메리 왓슨의 자기소개 메소드'''
        pass

    @abstractmethod
    async def receive_mail(self, schema: MaryMailReceiveSchema) -> MaryMailReceiveResponse:
        '''n8n으로부터 수신한 Gmail 메일을 처리하는 메소드'''
        pass

    @abstractmethod
    async def ingest_mail(self, schema: MailIngestSchema) -> MailIngestResult:
        '''EXAONE 임베딩 후 pgvector(mary_mails) 저장'''
        pass
