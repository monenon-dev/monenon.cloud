"""브리핑용 최근 대화 요약 소스."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.chat_orm import ChatSession, Message, MessageRole

logger = logging.getLogger(__name__)

_BRIEFING_ERROR_MARKERS = (
    "브리핑 생성 중 오류가 발생했습니다",
    "오늘의 브리핑을 생성하지 못했습니다",
)


def _is_noise_history_content(content: str) -> bool:
    """이전 실패 브리핑·오류 스텁은 히스토리 근거에서 제외."""
    text = (content or "").strip()
    if not text:
        return True
    return any(marker in text for marker in _BRIEFING_ERROR_MARKERS)


async def fetch_recent_history(session: AsyncSession, user_id: int, *, limit: int = 12) -> dict[str, Any]:
    """최근 세션 메시지를 모아 history.digest용 아이템으로 반환."""
    try:
        session_ids = (
            await session.execute(
                select(ChatSession.id)
                .where(ChatSession.user_id == user_id)
                .order_by(ChatSession.updated_at.desc())
                .limit(5)
            )
        ).scalars().all()
        if not session_ids:
            return {
                "source": "history",
                "status": "empty",
                "tool": "history.digest",
                "params": {"limit": limit},
                "items": [],
                "summary": "최근 대화가 없습니다.",
            }

        rows = (
            await session.execute(
                select(Message)
                .where(Message.session_id.in_(session_ids))
                .order_by(Message.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()

        items: list[dict[str, str]] = []
        for msg in reversed(list(rows)):
            raw = (msg.content or "").strip()
            if _is_noise_history_content(raw):
                continue
            role = msg.role.value if hasattr(msg.role, "value") else str(msg.role)
            preview = raw.replace("\n", " ")
            if len(preview) > 120:
                preview = preview[:117] + "…"
            items.append(
                {
                    "title": "나" if role == MessageRole.USER.value or role == "user" else "에이전트",
                    "meta": role,
                    "preview": preview or "(빈 메시지)",
                }
            )

        if not items:
            return {
                "source": "history",
                "status": "empty",
                "tool": "history.digest",
                "params": {"limit": limit},
                "items": [],
                "summary": "최근 대화가 없습니다.",
            }

        return {
            "source": "history",
            "status": "success",
            "tool": "history.digest",
            "params": {"limit": limit, "count": len(items)},
            "items": items,
            "summary": f"최근 메시지 {len(items)}건",
        }
    except Exception as exc:
        logger.warning("[briefing_history] failed user_id=%s: %s", user_id, exc)
        return {
            "source": "history",
            "status": "error",
            "tool": "history.digest",
            "reason": str(exc),
            "items": [],
        }
