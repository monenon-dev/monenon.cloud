from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.detective_mary_mail_schema import MailIngestSchema
from sherlock_homes.adapter.inbound.api.schemas.detective_watson_watcher_schema import WatsonWatcherSchema
from sherlock_homes.app.dtos.detective_watson_watcher_dto import WatsonMailTriageResult, WatsonWatcherResponse


class WatsonWatcherUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: WatsonWatcherSchema) -> WatsonWatcherResponse:
        '''존 왓슨의 자기소개 메소드'''
        pass

    @abstractmethod
    async def triage_mail(self, schema: MailIngestSchema) -> WatsonMailTriageResult:
        '''KcELECTRA 필터링 후 정상 메일만 Mary pgvector 파이프라인으로 전달'''
        pass
