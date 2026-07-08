from __future__ import annotations

import asyncio
import logging

from sherlock_homes.adapter.inbound.api.schemas.detective_mary_mail_schema import MailIngestSchema
from sherlock_homes.adapter.inbound.api.schemas.detective_watson_watcher_schema import WatsonWatcherSchema
from sherlock_homes.adapter.outbound.ml.kcelectra_mail_filter import KcElectraMailFilter
from sherlock_homes.app.dtos.detective_watson_watcher_dto import (
    WatsonMailTriageResult,
    WatsonWatcherQuery,
    WatsonWatcherResponse,
)
from sherlock_homes.app.ports.input.detective_mary_mail_use_case import MaryMailUseCase
from sherlock_homes.app.ports.input.detective_watson_watcher_use_case import WatsonWatcherUseCase
from sherlock_homes.app.ports.output.detective_watson_watcher_port import WatsonWatcherPort

logger = logging.getLogger(__name__)


class WatsonWatcherInteractor(WatsonWatcherUseCase):

    def __init__(
        self,
        repository: WatsonWatcherPort,
        mary_mail: MaryMailUseCase,
        mail_filter: KcElectraMailFilter | None = None,
    ) -> None:
        self.repository = repository
        self.mary_mail = mary_mail
        self._mail_filter = mail_filter

    @property
    def mail_filter(self) -> KcElectraMailFilter:
        if self._mail_filter is None:
            from sherlock_homes.adapter.outbound.ml.kcelectra_mail_filter import get_kcelectra_mail_filter
            self._mail_filter = get_kcelectra_mail_filter()
        return self._mail_filter

    async def introduce_myself(self, schema: WatsonWatcherSchema) -> WatsonWatcherResponse:
        return await self.repository.introduce_myself(WatsonWatcherQuery(
            id=schema.id,
            name=schema.name,
        ))

    async def triage_mail(self, schema: MailIngestSchema) -> WatsonMailTriageResult:
        text = f"{schema.subject}\n{schema.body_text}".strip()
        verdict = await asyncio.to_thread(self.mail_filter.classify, text)

        logger.info(
            "[WatsonWatcher] triage | from=%s label=%s score=%.3f normal=%s",
            schema.from_email,
            verdict.label,
            verdict.score,
            verdict.is_normal,
        )

        if not verdict.is_normal:
            return WatsonMailTriageResult(
                ok=True,
                accepted=False,
                label=verdict.label,
                score=verdict.score,
                mail_id=None,
                embedded=False,
                message="스팸·피싱으로 분류되어 저장하지 않습니다.",
            )

        result = await self.mary_mail.ingest_mail(schema)
        return WatsonMailTriageResult(
            ok=result.ok,
            accepted=True,
            label=verdict.label,
            score=verdict.score,
            mail_id=result.mail_id,
            embedded=result.embedded,
            message=result.message,
        )
