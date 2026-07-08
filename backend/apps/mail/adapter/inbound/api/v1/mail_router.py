"""Gmail 수신함 — n8n Webhook 수신 + 수신함 조회 (얇은 컨트롤러)."""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException

from mail.adapter.inbound.api.schemas.mail_schema import (
    InboxMailOut,
    WebhookMailBody,
    inbox_mail_out,
)
from mail.app.ports.input import MailUseCasePort
from mail.dependencies import get_mail_use_case

logger = logging.getLogger(__name__)

mail_router = APIRouter(prefix="/mail", tags=["mail-inbox"])


def _extract_email(raw: str) -> str:
    """'홍길동 <hong@gmail.com>' 또는 'hong@gmail.com' → 'hong@gmail.com'."""
    match = re.search(r"<([^>]+)>", raw)
    return match.group(1).strip().lower() if match else raw.strip().lower()


def _verify_webhook_secret(x_webhook_secret: str | None) -> None:
    expected = os.getenv("N8N_WEBHOOK_SECRET", "").strip()
    if not expected:
        return
    if x_webhook_secret != expected:
        raise HTTPException(status_code=403, detail="Webhook 시크릿이 올바르지 않습니다.")


@mail_router.post("/webhook", status_code=201)
async def receive_mail_from_n8n(
    body: WebhookMailBody,
    x_webhook_secret: str | None = Header(default=None),
    use_case: MailUseCasePort = Depends(get_mail_use_case),
) -> dict:
    _verify_webhook_secret(x_webhook_secret)
    # Gmail이 "홍길동 <hong@gmail.com>" 형식으로 보낼 수 있어서 이메일만 추출
    from_email = _extract_email(str(body.from_email))
    from_name = body.from_name or (str(body.from_email).split("<")[0].strip() or None)
    return await use_case.receive_webhook(
        user_id=body.user_id,
        from_email=from_email,
        from_name=from_name,
        subject=body.subject,
        body_text=body.body_text,
        received_at=body.received_at,  # None이면 백엔드에서 현재 시각 사용
    )


@mail_router.get("/inbox", response_model=list[InboxMailOut])
async def list_inbox(
    user_id: int,
    use_case: MailUseCasePort = Depends(get_mail_use_case),
) -> list[InboxMailOut]:
    mails = await use_case.get_inbox(user_id)
    return [inbox_mail_out(m) for m in mails]


@mail_router.patch("/inbox/{mail_id}/read", response_model=InboxMailOut)
async def mark_as_read(
    mail_id: int,
    user_id: int,
    use_case: MailUseCasePort = Depends(get_mail_use_case),
) -> InboxMailOut:
    mail = await use_case.mark_as_read(user_id, mail_id)
    return inbox_mail_out(mail)


@mail_router.delete("/inbox/{mail_id}")
async def delete_mail(
    mail_id: int,
    user_id: int,
    use_case: MailUseCasePort = Depends(get_mail_use_case),
) -> dict:
    await use_case.delete_mail(user_id, mail_id)
    return {"ok": True, "deleted_id": mail_id}
