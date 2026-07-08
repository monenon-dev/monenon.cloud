"""메일 수신함 API 스키마."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from mail.domain import MailEntity, SenderEntity


# ── 허용 발신자 ────────────────────────────────────────────────────────────────

class AllowedSenderBody(BaseModel):
    user_id: int
    email: str = Field(..., max_length=255)
    label: str | None = Field(default=None, max_length=64)


class AllowedSenderOut(BaseModel):
    id: int
    user_id: int
    email: str
    label: str | None = None
    created_at: datetime


def allowed_sender_out(entity: SenderEntity) -> AllowedSenderOut:
    return AllowedSenderOut(
        id=entity.id,
        user_id=entity.user_id,
        email=entity.email,
        label=entity.label,
        created_at=entity.created_at,
    )


# ── Webhook (n8n → 백엔드) ────────────────────────────────────────────────────

class WebhookMailBody(BaseModel):
    """n8n이 보내는 메일 페이로드."""

    user_id: int
    from_email: str = Field(..., max_length=255)
    from_name: str | None = Field(default=None, max_length=128)
    subject: str = Field(default="(제목 없음)", max_length=512)
    body_text: str | None = None
    received_at: datetime | None = None


# ── 발신 ──────────────────────────────────────────────────────────────────────

class MailSendRequest(BaseModel):
    """프론트엔드 → 백엔드 발송 요청."""
    user_id: int
    to_email: str = Field(..., max_length=255)
    instruction: str = Field(..., min_length=1, description="EXAONE에게 전달할 메일 작성 지시")


class MailSendResult(BaseModel):
    ok: bool
    to_email: str
    subject: str
    body: str


# ── 수신함 ─────────────────────────────────────────────────────────────────────

class InboxMailOut(BaseModel):
    id: int
    user_id: int
    from_email: str
    from_name: str | None = None
    subject: str
    body_text: str | None = None
    gemini_summary: str | None = None
    is_read: bool
    received_at: datetime
    created_at: datetime


def inbox_mail_out(entity: MailEntity) -> InboxMailOut:
    return InboxMailOut(
        id=entity.id,
        user_id=entity.user_id,
        from_email=entity.from_email,
        from_name=entity.from_name,
        subject=entity.subject,
        body_text=entity.body_text,
        gemini_summary=entity.gemini_summary,
        is_read=entity.is_read,
        received_at=entity.received_at,
        created_at=entity.created_at,
    )
