"""nomic-embed 프로토타입 유사도 인텐트 라우터 — EXAONE을 busy하지 않음."""

from __future__ import annotations

import logging
import math
import os
from typing import Iterable

from gateway.app.ports.output.intent_router_port import IntentRouterPort
from gateway.domain.intents import INTENT_HANDLERS, IngressIntent
from gateway.domain.prototypes import INTENT_PROTOTYPES
from gateway.domain.route_result import IntentRouteResult

logger = logging.getLogger(__name__)


def _min_confidence() -> float:
    try:
        return float(os.getenv("GATEWAY_INTENT_MIN_CONFIDENCE", "0.42"))
    except ValueError:
        return 0.42


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


def pick_intent(
    scores: dict[IngressIntent, float],
    *,
    min_confidence: float,
) -> tuple[IngressIntent, float, str]:
    """하네스: 최고 점수 + 임계값. 미달이면 clarify."""
    if not scores:
        return IngressIntent.CLARIFY, 0.0, "no_scores"
    best_intent, best_score = max(scores.items(), key=lambda kv: kv[1])
    if best_score < min_confidence:
        return IngressIntent.CLARIFY, best_score, "below_threshold"
    if best_intent not in INTENT_HANDLERS:
        return IngressIntent.OUT_OF_SCOPE, best_score, "not_allowlisted"
    return best_intent, best_score, "prototype_match"


class NomicPrototypeIntentRouter(IntentRouterPort):
    """
    Ollama nomic-embed-text로 질문·프로토타입 임베딩 후 코사인 유사도 라우팅.
    생성 모델(EXAONE)을 호출하지 않는다.
    """

    def __init__(self) -> None:
        self._proto_vectors: dict[IngressIntent, list[list[float]]] | None = None

    async def _embed(self, text: str) -> list[float]:
        from lol.ollama.faker_orchestrator import faker_orchestrator

        return await faker_orchestrator.embed(text)

    async def _ensure_prototypes(self) -> dict[IngressIntent, list[list[float]]]:
        if self._proto_vectors is not None:
            return self._proto_vectors
        vectors: dict[IngressIntent, list[list[float]]] = {}
        for intent, phrases in INTENT_PROTOTYPES.items():
            vectors[intent] = [await self._embed(p) for p in phrases]
        self._proto_vectors = vectors
        logger.info("[gateway] prototype embeddings ready intents=%s", list(vectors))
        return vectors

    @staticmethod
    def _max_sim(query_vec: list[float], prototypes: Iterable[list[float]]) -> float:
        best = 0.0
        for proto in prototypes:
            best = max(best, cosine_similarity(query_vec, proto))
        return best

    async def route(self, query: str) -> IntentRouteResult:
        text = query.strip()
        min_conf = _min_confidence()
        if not text:
            return IntentRouteResult(
                intent=IngressIntent.CLARIFY,
                confidence=0.0,
                handler=INTENT_HANDLERS[IngressIntent.CLARIFY],
                scores={},
                reason="empty_query",
            )

        try:
            q_vec = await self._embed(text)
            proto = await self._ensure_prototypes()
            scores: dict[IngressIntent, float] = {
                intent: self._max_sim(q_vec, vecs) for intent, vecs in proto.items()
            }
        except Exception as exc:
            logger.warning("[gateway] embed failed, clarify: %s", exc)
            return IntentRouteResult(
                intent=IngressIntent.CLARIFY,
                confidence=0.0,
                handler=INTENT_HANDLERS[IngressIntent.CLARIFY],
                scores={},
                reason=f"embed_failed:{exc}",
            )

        intent, confidence, reason = pick_intent(scores, min_confidence=min_conf)
        return IntentRouteResult(
            intent=intent,
            confidence=round(confidence, 4),
            handler=INTENT_HANDLERS[intent],
            scores={k.value: round(v, 4) for k, v in scores.items()},
            reason=reason,
        )


# 프로세스 내 싱글톤 (프로토타입 임베딩 캐시)
intent_router = NomicPrototypeIntentRouter()
