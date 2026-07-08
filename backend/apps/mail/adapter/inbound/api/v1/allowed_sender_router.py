"""허용 발신자 CRUD (얇은 컨트롤러)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from mail.adapter.inbound.api.schemas.mail_schema import (
    AllowedSenderBody,
    AllowedSenderOut,
    allowed_sender_out,
)
from mail.app.ports.input import MailUseCasePort
from mail.dependencies import get_mail_use_case

allowed_sender_router = APIRouter(prefix="/mail", tags=["mail-allowed-senders"])


@allowed_sender_router.get("/allowed-senders", response_model=list[AllowedSenderOut])
async def list_allowed_senders(
    user_id: int,
    use_case: MailUseCasePort = Depends(get_mail_use_case),
) -> list[AllowedSenderOut]:
    senders = await use_case.get_allowed_senders(user_id)
    return [allowed_sender_out(s) for s in senders]


@allowed_sender_router.post("/allowed-senders", response_model=AllowedSenderOut, status_code=201)
async def add_allowed_sender(
    body: AllowedSenderBody,
    use_case: MailUseCasePort = Depends(get_mail_use_case),
) -> AllowedSenderOut:
    sender = await use_case.add_allowed_sender(body.user_id, body.email, body.label)
    return allowed_sender_out(sender)


@allowed_sender_router.delete("/allowed-senders/{sender_id}")
async def delete_allowed_sender(
    sender_id: int,
    user_id: int,
    use_case: MailUseCasePort = Depends(get_mail_use_case),
) -> dict:
    await use_case.delete_allowed_sender(user_id, sender_id)
    return {"ok": True, "deleted_id": sender_id}
