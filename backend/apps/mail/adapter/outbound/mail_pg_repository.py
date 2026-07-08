"""mail PostgreSQL 레포지토리 — MailRepositoryPort 구현체."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from mail.adapter.outbound.orm.mail_orm import AllowedSender, InboxMail
from mail.app.ports.output import MailRepositoryPort
from mail.domain import MailEntity, SenderEntity


def _to_sender(row: AllowedSender) -> SenderEntity:
    return SenderEntity(
        id=row.id,
        user_id=row.user_id,
        email=row.email,
        label=row.label,
        created_at=row.created_at,
    )


def _to_mail(row: InboxMail) -> MailEntity:
    return MailEntity(
        id=row.id,
        user_id=row.user_id,
        from_email=row.from_email,
        from_name=row.from_name,
        subject=row.subject,
        body_text=row.body_text,
        gemini_summary=row.gemini_summary,
        is_read=row.is_read,
        received_at=row.received_at,
        created_at=row.created_at,
    )


class MailPgRepository(MailRepositoryPort):

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def is_sender_allowed(self, user_id: int, email: str) -> bool:
        result = await self._session.execute(
            select(AllowedSender).where(
                AllowedSender.user_id == user_id,
                AllowedSender.email == email,
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_allowed_senders(self, user_id: int) -> list[SenderEntity]:
        result = await self._session.execute(
            select(AllowedSender)
            .where(AllowedSender.user_id == user_id)
            .order_by(AllowedSender.created_at.asc())
        )
        return [_to_sender(row) for row in result.scalars().all()]

    async def add_allowed_sender(self, user_id: int, email: str, label: str | None) -> SenderEntity:
        existing = await self._session.execute(
            select(AllowedSender).where(
                AllowedSender.user_id == user_id,
                AllowedSender.email == email,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="이미 허용된 이메일 주소입니다.")
        row = AllowedSender(user_id=user_id, email=email, label=label)
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return _to_sender(row)

    async def delete_allowed_sender(self, user_id: int, sender_id: int) -> None:
        result = await self._session.execute(
            select(AllowedSender).where(
                AllowedSender.id == sender_id,
                AllowedSender.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="허용 발신자를 찾을 수 없습니다.")
        await self._session.delete(row)

    async def save_mail(
        self,
        user_id: int,
        from_email: str,
        from_name: str | None,
        subject: str,
        body_text: str | None,
        gemini_summary: str | None,
        received_at: datetime,
    ) -> MailEntity:
        row = InboxMail(
            user_id=user_id,
            from_email=from_email,
            from_name=from_name,
            subject=subject,
            body_text=body_text,
            gemini_summary=gemini_summary,
            is_read=False,
            received_at=received_at,
        )
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return _to_mail(row)

    async def get_inbox(self, user_id: int) -> list[MailEntity]:
        result = await self._session.execute(
            select(InboxMail)
            .where(InboxMail.user_id == user_id)
            .order_by(InboxMail.received_at.desc())
        )
        return [_to_mail(row) for row in result.scalars().all()]

    async def mark_as_read(self, user_id: int, mail_id: int) -> MailEntity:
        result = await self._session.execute(
            select(InboxMail).where(
                InboxMail.id == mail_id,
                InboxMail.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="메일을 찾을 수 없습니다.")
        row.is_read = True
        await self._session.flush()
        await self._session.refresh(row)
        return _to_mail(row)

    async def delete_mail(self, user_id: int, mail_id: int) -> None:
        result = await self._session.execute(
            select(InboxMail).where(
                InboxMail.id == mail_id,
                InboxMail.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="메일을 찾을 수 없습니다.")
        await self._session.delete(row)
