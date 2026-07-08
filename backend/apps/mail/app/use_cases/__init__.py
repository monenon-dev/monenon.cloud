"""mail 유스케이스 — Gmail 수신 필터링, 수신함 관리."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from mail.app.ports.input import MailUseCasePort
from mail.app.ports.output import MailRepositoryPort
from mail.domain import MailEntity, SenderEntity

logger = logging.getLogger(__name__)

_SUMMARY_PROMPT = (
    "아래 이메일 본문을 한국어로 2~3문장으로 요약해 줘. "
    "핵심 내용과 행동 항목(있다면)만 간결하게.\n\n"
    "--- 이메일 본문 ---\n{body}"
)


class MailUseCase(MailUseCasePort):

    def __init__(self, repo: MailRepositoryPort) -> None:
        self._repo = repo

    async def receive_webhook(
        self,
        user_id: int,
        from_email: str,
        from_name: str | None,
        subject: str,
        body_text: str | None,
        received_at: datetime | None,
    ) -> dict:
        email = from_email.lower().strip()

        if not await self._repo.is_sender_allowed(user_id, email):
            logger.info("[mail] 허용 목록에 없는 발신자 차단: user_id=%s from=%s", user_id, email)
            return {"ok": False, "reason": "sender_not_allowed"}

        gemini_summary: str | None = None
        if body_text and body_text.strip():
            try:
                from gemini_caller import call_gemini
                gemini_summary = call_gemini(_SUMMARY_PROMPT.format(body=body_text[:4000]))
            except Exception as exc:
                logger.warning("[mail] Gemini 요약 실패: %s", exc)

        mail = await self._repo.save_mail(
            user_id=user_id,
            from_email=email,
            from_name=from_name,
            subject=subject or "(제목 없음)",
            body_text=body_text,
            gemini_summary=gemini_summary,
            received_at=received_at or datetime.now(timezone.utc),
        )
        logger.info("[mail] 메일 저장: id=%s user_id=%s", mail.id, user_id)

        # 텔레그램 수신 보고
        try:
            from telegram_reporter.reporter import report_mail_received
            await report_mail_received(from_email=email, subject=subject or "(제목 없음)")
        except Exception as exc:
            logger.warning("[mail] 텔레그램 보고 실패 (무시): %s", exc)

        return {"ok": True, "mail_id": mail.id}

    async def get_inbox(self, user_id: int) -> list[MailEntity]:
        return await self._repo.get_inbox(user_id)

    async def mark_as_read(self, user_id: int, mail_id: int) -> MailEntity:
        return await self._repo.mark_as_read(user_id, mail_id)

    async def delete_mail(self, user_id: int, mail_id: int) -> None:
        await self._repo.delete_mail(user_id, mail_id)

    async def get_allowed_senders(self, user_id: int) -> list[SenderEntity]:
        return await self._repo.get_allowed_senders(user_id)

    async def add_allowed_sender(self, user_id: int, email: str, label: str | None) -> SenderEntity:
        return await self._repo.add_allowed_sender(user_id, email.lower().strip(), label)

    async def delete_allowed_sender(self, user_id: int, sender_id: int) -> None:
        await self._repo.delete_allowed_sender(user_id, sender_id)
