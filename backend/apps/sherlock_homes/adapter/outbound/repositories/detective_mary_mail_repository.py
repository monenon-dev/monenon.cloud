from __future__ import annotations

import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession

from lol.ollama.faker_orchestrator import faker_orchestrator
from sherlock_homes.adapter.outbound.orm.detective_mary_mail_orm import MaryMailOrm
from sherlock_homes.app.dtos.detective_mary_mail_dto import (
    MailIngestQuery,
    MailIngestResult,
    MaryMailQuery,
    MaryMailResponse,
    MaryMailReceiveQuery,
    MaryMailReceiveResponse,
)
from sherlock_homes.app.ports.output.detective_mary_mail_port import MaryMailPort

logger = logging.getLogger(__name__)


def _parse_email(raw: str) -> str:
    match = re.search(r"<([^>]+)>", raw)
    return (match.group(1) if match else raw).strip()


class MaryMailRepository(MaryMailPort):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: MaryMailQuery) -> MaryMailResponse:
        logger.info("[MaryMailRepository] introduce_myself | id=%s name=%s", query.id, query.name)
        return MaryMailResponse(id=query.id, name=query.name)

    async def receive_mail(self, query: MaryMailReceiveQuery) -> MaryMailReceiveResponse:
        result = await self.ingest_mail(
            MailIngestQuery(
                from_email=_parse_email(query.from_) or "unknown@local",
                from_name=None,
                subject=query.subject or "(제목 없음)",
                body_text=query.preview,
                received_at=None,
                message_id=query.message_id or None,
            )
        )
        return MaryMailReceiveResponse(
            message_id=query.message_id,
            status="stored" if result.ok else "failed",
        )

    async def ingest_mail(self, query: MailIngestQuery) -> MailIngestResult:
        embed_text = f"{query.subject}\n{query.body_text}".strip()
        embedding: list[float] | None = None
        embedded = False

        if embed_text:
            try:
                embedding = await faker_orchestrator.embed(embed_text)
                embedded = True
            except Exception:
                logger.exception("[MaryMailRepository] embedding failed | from=%s", query.from_email)

        row = MaryMailOrm(
            from_email=query.from_email,
            from_name=query.from_name,
            subject=query.subject,
            body_text=query.body_text,
            message_id=query.message_id,
            received_at=query.received_at,
            embedding=embedding,
        )
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)

        logger.info(
            "[MaryMailRepository] ingest_mail | id=%s from=%s embedded=%s",
            row.id,
            query.from_email,
            embedded,
        )
        return MailIngestResult(
            ok=True,
            mail_id=row.id,
            embedded=embedded,
            message="메일이 저장되었습니다." if embedded else "메일이 저장되었으나 임베딩은 생략되었습니다.",
        )
