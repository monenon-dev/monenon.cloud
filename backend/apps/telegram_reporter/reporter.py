"""EXAONE 텔레그램 업무 보고 — 개발자에게 실시간 알림 전송."""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

_TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


def _get_token() -> str:
    return os.getenv("TELEGRAM_BOT_TOKEN", "").strip()


def _get_chat_id() -> str:
    return os.getenv("TELEGRAM_CHAT_ID", "").strip()


async def send_report(message: str) -> bool:
    """
    EXAONE이 개발자 텔레그램으로 업무 보고를 전송합니다.

    Args:
        message: 보고 내용 (예: "홍길동에게 메일을 정상적으로 발송했습니다")

    Returns:
        성공 여부
    """
    token = _get_token()
    chat_id = _get_chat_id()

    if not token or not chat_id:
        logger.warning("[telegram] TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 미설정 — 보고 생략")
        return False

    url = _TELEGRAM_API.format(token=token)
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload)
            if res.is_success:
                logger.info("[telegram] 보고 전송 완료: %s", message[:50])
                return True
            else:
                logger.warning("[telegram] 전송 실패: %s", res.text)
                return False
    except Exception as exc:
        logger.error("[telegram] 전송 오류: %s", exc)
        return False


async def report_mail_sent(to_name: str, to_email: str, subject: str) -> None:
    """메일 발송 완료 보고."""
    message = (
        f"📧 <b>메일 발송 완료</b>\n\n"
        f"👤 수신자: {to_name} ({to_email})\n"
        f"📌 제목: {subject}\n\n"
        f"✅ EXAONE이 {to_name}에게 메일을 정상적으로 발송했습니다."
    )
    await send_report(message)


async def report_calendar_added(title: str, date: str, start_time: str) -> None:
    """캘린더 일정 등록 보고."""
    message = (
        f"📅 <b>일정 등록 완료</b>\n\n"
        f"📌 제목: {title}\n"
        f"🕐 일시: {date} {start_time}\n\n"
        f"✅ Google Calendar에 일정이 정상적으로 등록되었습니다."
    )
    await send_report(message)


async def report_mail_received(from_email: str, subject: str) -> None:
    """메일 수신 보고."""
    message = (
        f"📬 <b>새 메일 수신</b>\n\n"
        f"👤 발신자: {from_email}\n"
        f"📌 제목: {subject}\n\n"
        f"✅ 허용된 발신자의 메일이 수신함에 저장되었습니다."
    )
    await send_report(message)
