"""메일 발신 — EXAONE이 작성 후 n8n을 통해 Gmail 발송."""

from __future__ import annotations

import logging
import os

import httpx
from fastapi import APIRouter, HTTPException

from mail.adapter.inbound.api.schemas.mail_schema import MailSendRequest, MailSendResult

logger = logging.getLogger(__name__)

mail_send_router = APIRouter(prefix="/mail", tags=["mail-send"])

_COMPOSE_PROMPT = """당신은 이메일 작성 전문가입니다.
아래 지시사항을 바탕으로 이메일 제목과 본문을 작성하세요.

지시사항: {instruction}
수신자: {to_email}

반드시 아래 형식으로만 응답하세요:
제목: (이메일 제목)
본문:
(이메일 본문)"""


def _parse_email_content(raw: str) -> tuple[str, str]:
    """EXAONE 응답에서 제목과 본문 추출."""
    subject = ""
    body = ""
    lines = raw.strip().splitlines()
    body_start = False
    body_lines = []

    for line in lines:
        if line.startswith("제목:"):
            subject = line.replace("제목:", "").strip()
        elif line.startswith("본문:"):
            body_start = True
        elif body_start:
            body_lines.append(line)

    body = "\n".join(body_lines).strip()

    if not subject:
        subject = "Monenon AI가 작성한 메일"
    if not body:
        body = raw.strip()

    return subject, body


@mail_send_router.post("/send", response_model=MailSendResult)
async def send_mail(body: MailSendRequest) -> MailSendResult:
    """
    EXAONE이 지시사항 기반으로 메일 작성 → n8n Send 워크플로우 호출 → Gmail 발송.
    """
    # Step 1 — Gemini에게 메일 작성 요청
    try:
        from gemini_caller import call_gemini
        prompt = _COMPOSE_PROMPT.format(
            instruction=body.instruction,
            to_email=body.to_email,
        )
        raw = call_gemini(prompt)
        subject, mail_body = _parse_email_content(raw)
    except Exception as exc:
        logger.error("[mail/send] Gemini 메일 작성 실패: %s", exc)
        raise HTTPException(status_code=503, detail=f"Gemini 메일 작성 실패: {exc}")

    # Step 2 — n8n Send 웹훅 호출
    n8n_send_url = os.getenv("N8N_SEND_WEBHOOK_URL", "").strip()
    if n8n_send_url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(n8n_send_url, json={
                    "to": body.to_email,
                    "subject": subject,
                    "body": mail_body,
                })
        except Exception as exc:
            logger.warning("[mail/send] n8n 호출 실패: %s", exc)
            raise HTTPException(status_code=502, detail=f"n8n 발송 실패: {exc}")
    else:
        logger.warning("[mail/send] N8N_SEND_WEBHOOK_URL 미설정 — 발송 생략")

    logger.info("[mail/send] 발송 완료: to=%s subject=%s", body.to_email, subject)

    # Step 3 — EXAONE 텔레그램 업무 보고
    try:
        from telegram_reporter.reporter import report_mail_sent
        to_name = body.to_email.split("@")[0]
        await report_mail_sent(
            to_name=to_name,
            to_email=body.to_email,
            subject=subject,
        )
    except Exception as exc:
        logger.warning("[mail/send] 텔레그램 보고 실패 (무시): %s", exc)

    return MailSendResult(
        ok=True,
        to_email=body.to_email,
        subject=subject,
        body=mail_body,
    )
