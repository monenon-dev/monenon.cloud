"""Gateway 디스패치 — 시맨틱 인텐트 → RAG | CRUD | Gemini 3경로."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from gateway.app.services.intent_router import get_intent_router
from gateway.domain.intents import IngressIntent

logger = logging.getLogger(__name__)


@dataclass
class DispatchResult:
    ok: bool
    intent: str
    handler: str
    confidence: float
    reply: str
    channel: str  # rag | crud | gemini | other
    model: str = ""
    detail: str | None = None
    extras: dict[str, Any] = field(default_factory=dict)


async def dispatch_gateway_chat(
    session: AsyncSession,
    query: str,
) -> DispatchResult:
    """
    1) 인텐트 분류
    2) gemini → Terran Vessel (Gemini API)
    3) exaone_rag → Moneyball RAG 채팅
    4) crud → 저장소 힌트 (아직 도메인별 CRUD 위임은 스텁)
    """
    router = get_intent_router()
    routed = await router.route(query)
    intent = routed.intent
    conf = routed.confidence

    if intent == IngressIntent.GEMINI:
        from star_craft.app.use_cases.terran_vessel_gemini_interactor import (
            terran_vessel_gemini,
        )

        result = terran_vessel_gemini.answer(query)
        return DispatchResult(
            ok=result.ok,
            intent=intent.value,
            handler=routed.handler,
            confidence=conf,
            reply=result.reply,
            channel="gemini",
            model=result.model,
            detail=result.detail,
            extras={"reason": routed.reason},
        )

    if intent == IngressIntent.EXAONE_RAG:
        from moneyball.app.use_cases.star_chat_interactor import run_star_chat

        mb = await run_star_chat(session, query)
        return DispatchResult(
            ok=bool(mb.get("ok")),
            intent=intent.value,
            handler=routed.handler,
            confidence=conf,
            reply=str(mb.get("reply") or ""),
            channel="rag",
            model=str(mb.get("hub_model") or ""),
            detail=mb.get("detail"),
            extras={
                "reason": routed.reason,
                "grounded": mb.get("grounded"),
                "mode": mb.get("mode"),
                "journey": mb.get("journey"),
                "route": mb.get("route"),
            },
        )

    if intent == IngressIntent.CRUD:
        # 하네스: LLM으로 CRUD 흉내 내지 않음 — 저장소 API로 안내
        reply = (
            "이 요청은 CRUD(목록·추가·수정·삭제)로 분류되었습니다. "
            "Gemini/EXAONE이 아닌 플랫폼 API로 처리하세요. "
            "예: /platform/closet, /platform/refrigerator, /platform/music"
        )
        return DispatchResult(
            ok=True,
            intent=intent.value,
            handler=routed.handler,
            confidence=conf,
            reply=reply,
            channel="crud",
            model="",
            extras={"reason": routed.reason, "suggested_apis": [
                "/platform/closet/items",
                "/platform/refrigerator/items",
                "/platform/music/items",
            ]},
        )

    if intent == IngressIntent.SECURITY:
        return DispatchResult(
            ok=True,
            intent=intent.value,
            handler=routed.handler,
            confidence=conf,
            reply="계정·로그인 관련 요청입니다. /auth/login, /auth/register, /oauth 경로를 이용해 주세요.",
            channel="other",
            extras={"reason": routed.reason},
        )

    if intent == IngressIntent.OUT_OF_SCOPE:
        return DispatchResult(
            ok=True,
            intent=intent.value,
            handler=routed.handler,
            confidence=conf,
            reply="지원하지 않거나 처리할 수 없는 요청입니다.",
            channel="other",
            extras={"reason": routed.reason},
        )

    # clarify
    return DispatchResult(
        ok=True,
        intent=intent.value,
        handler=routed.handler,
        confidence=conf,
        reply="질문이 모호합니다. 무엇을 하고 싶은지 조금 더 구체적으로 적어 주세요. "
        "(예: 전북 홈구장 / 냉장고 목록 / 옷 추천)",
        channel="other",
        extras={"reason": routed.reason},
    )
