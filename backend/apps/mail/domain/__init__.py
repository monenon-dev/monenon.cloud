"""mail 도메인 — 허용 발신자, 수신 메일 엔티티."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class SenderEntity:
    id: int
    user_id: int
    email: str
    label: str | None
    created_at: datetime


@dataclass
class MailEntity:
    id: int
    user_id: int
    from_email: str
    from_name: str | None
    subject: str
    body_text: str | None
    gemini_summary: str | None
    is_read: bool
    received_at: datetime
    created_at: datetime
