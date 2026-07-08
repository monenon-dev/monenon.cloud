"""mail 출력 포트 — DB 레포지토리 인터페이스."""

from __future__ import annotations

from abc import ABC, abstractmethod

from mail.domain import MailEntity, SenderEntity


class MailRepositoryPort(ABC):

    @abstractmethod
    async def is_sender_allowed(self, user_id: int, email: str) -> bool: ...

    @abstractmethod
    async def get_allowed_senders(self, user_id: int) -> list[SenderEntity]: ...

    @abstractmethod
    async def add_allowed_sender(self, user_id: int, email: str, label: str | None) -> SenderEntity: ...

    @abstractmethod
    async def delete_allowed_sender(self, user_id: int, sender_id: int) -> None: ...

    @abstractmethod
    async def save_mail(
        self,
        user_id: int,
        from_email: str,
        from_name: str | None,
        subject: str,
        body_text: str | None,
        gemini_summary: str | None,
        received_at: "datetime",
    ) -> MailEntity: ...

    @abstractmethod
    async def get_inbox(self, user_id: int) -> list[MailEntity]: ...

    @abstractmethod
    async def mark_as_read(self, user_id: int, mail_id: int) -> MailEntity: ...

    @abstractmethod
    async def delete_mail(self, user_id: int, mail_id: int) -> None: ...
