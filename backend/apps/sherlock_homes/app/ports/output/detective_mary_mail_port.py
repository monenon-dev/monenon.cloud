from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.app.dtos.detective_mary_mail_dto import (
    MailIngestQuery,
    MailIngestResult,
    MaryMailQuery,
    MaryMailResponse,
    MaryMailReceiveQuery,
    MaryMailReceiveResponse,
)


class MaryMailPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: MaryMailQuery) -> MaryMailResponse:
        '''메리 왓슨의 자기 소개 레포지토리 추상 메소드'''
        pass

    @abstractmethod
    async def receive_mail(self, query: MaryMailReceiveQuery) -> MaryMailReceiveResponse:
        '''수신 메일 저장/처리 레포지토리 추상 메소드'''
        pass

    @abstractmethod
    async def ingest_mail(self, query: MailIngestQuery) -> MailIngestResult:
        '''임베딩 생성 후 pgvector(mary_mails) 저장'''
        pass
