"""키워드 기반 시맨틱 인텐트 라우터 (outbound).

임베딩/LLM 분류기로 교체할 때는 동일 포트만 바꾸면 된다.
"""

from __future__ import annotations

import re

from silicon_valley.app.ports.output.semantic_intent_router_port import (
    SemanticIntentRouterPort,
)
from silicon_valley.domain.langchain_intent import (
    INTENT_HANDLERS,
    INTENT_KEYWORDS,
    LangchainSpokeIntent,
)
from silicon_valley.domain.semantic_route_result import SemanticRouteResult

_MIN_CONFIDENCE = 0.2


class KeywordSemanticIntentRouter(SemanticIntentRouterPort):
    async def route(self, message: str) -> SemanticRouteResult:
        text = (message or "").strip().lower()
        if not text:
            return SemanticRouteResult(
                intent=LangchainSpokeIntent.CLARIFY,
                confidence=0.0,
                handler=INTENT_HANDLERS[LangchainSpokeIntent.CLARIFY],
                scores={},
                reason="empty_message",
            )

        scores: dict[str, float] = {}
        for intent, keywords in INTENT_KEYWORDS.items():
            hits = sum(1 for kw in keywords if kw.lower() in text)
            if hits:
                scores[intent.value] = min(1.0, hits / 3.0)

        if not scores:
            if re.search(r"추천|계획|어디|휴가", text):
                intent = LangchainSpokeIntent.NCL_TRIP
                return SemanticRouteResult(
                    intent=intent,
                    confidence=0.45,
                    handler=INTENT_HANDLERS[intent],
                    scores={intent.value: 0.45},
                    reason="weak_travel_hint",
                )
            intent = LangchainSpokeIntent.CLARIFY
            return SemanticRouteResult(
                intent=intent,
                confidence=0.0,
                handler=INTENT_HANDLERS[intent],
                scores={},
                reason="no_keyword_match",
            )

        best_name, best_score = max(scores.items(), key=lambda kv: kv[1])
        best_intent = LangchainSpokeIntent(best_name)
        if best_score < _MIN_CONFIDENCE:
            return SemanticRouteResult(
                intent=LangchainSpokeIntent.CLARIFY,
                confidence=best_score,
                handler=INTENT_HANDLERS[LangchainSpokeIntent.CLARIFY],
                scores=scores,
                reason="below_threshold",
            )
        return SemanticRouteResult(
            intent=best_intent,
            confidence=best_score,
            handler=INTENT_HANDLERS[best_intent],
            scores=scores,
            reason="keyword_match",
        )
