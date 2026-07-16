"""로컬 Hub LLM = 입구 시맨틱 분류기 역할만 (PoC: Qwen2.5-1.5B, QLoRA 불필요).

시맨틱 라우터는 프롬프트+allowlist 하네스로 충분하다.
QLoRA는 라벨 정확도가 부족할 때만 선택적으로 추가한다.
"""

from __future__ import annotations

import logging
import os
import re

from gateway.app.ports.output.intent_router_port import IntentRouterPort
from gateway.domain.exaone_roles import ExaoneLogicalRole
from gateway.domain.intents import INTENT_HANDLERS, IngressIntent
from gateway.domain.route_result import IntentRouteResult

logger = logging.getLogger(__name__)

_JSON = re.compile(r"\{[\s\S]*\}")

_INGRESS_SYSTEM = f"""당신은 Monenon 입구 시맨틱 인텐트 분류기입니다.
논리 역할: {ExaoneLogicalRole.INGRESS_CLASSIFIER.value}
Hub 라우팅·Spoke SQL·최종 답변을 절대 하지 마세요. 설명 문장 금지.

허용 intent (이 중 하나만):
- crud: 목록/추가/수정/삭제 등 API성 요청
- gemini: 가벼운 추천·대화·번역·문장 다듬기
- security: 로그인·회원가입·비밀번호·계정·인증
- exaone_rag: DB/사실 근거가 필요한 질의 (K리그·moneyball 등)
- out_of_scope: 불법·유해·지원 밖
- clarify: 질문이 너무 모호함

반드시 JSON만:
{{"intent":"exaone_rag","confidence":0.86,"reason":"홈구장 사실 조회"}}
"""


def _hub_model() -> str:
    from lol.config import get_poc_hub_model

    return os.getenv(
        "GATEWAY_HUB_MODEL",
        os.getenv("GATEWAY_EXAONE_MODEL", get_poc_hub_model()),
    )


def _min_confidence() -> float:
    try:
        return float(os.getenv("GATEWAY_INTENT_MIN_CONFIDENCE", "0.42"))
    except ValueError:
        return 0.42


def _parse_intent_payload(raw: str) -> tuple[IngressIntent, float, str] | None:
    import json

    match = _JSON.search(raw)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    name = str(data.get("intent") or "").strip().lower()
    try:
        intent = IngressIntent(name)
    except ValueError:
        return None
    try:
        conf = float(data.get("confidence", 0.5))
    except (TypeError, ValueError):
        conf = 0.5
    conf = max(0.0, min(1.0, conf))
    reason = str(data.get("reason") or "exaone_classify").strip()
    return intent, conf, reason


def _keyword_fallback(query: str) -> IntentRouteResult:
    """로컬 LLM 실패 시 최소 키워드 가드 (추가 모델 없음)."""
    text = query
    if any(k in text for k in ("로그인", "회원가입", "비밀번호", "로그아웃", "인증", "구글 로그인")):
        intent = IngressIntent.SECURITY
    elif any(k in text for k in ("해킹", "불법", "비밀번호 알려줘")):
        intent = IngressIntent.OUT_OF_SCOPE
    elif any(k in text for k in ("홈구장", "K리그", "선수", "경기 일정", "moneyball", "전북", "울산")):
        intent = IngressIntent.EXAONE_RAG
    elif any(k in text for k in ("추가해", "삭제해", "목록", "수정해", "조회해")):
        intent = IngressIntent.CRUD
    elif len(text) <= 2 or text in {"?", "응", "그거", "음"}:
        intent = IngressIntent.CLARIFY
    else:
        intent = IngressIntent.GEMINI
    return IntentRouteResult(
        intent=intent,
        confidence=0.35,
        handler=INTENT_HANDLERS[intent],
        scores={intent.value: 0.35},
        reason="keyword_fallback",
    )


class ExaoneIngressIntentRouter(IntentRouterPort):
    """
    동일 PoC Hub 가중치(Qwen2.5-1.5B) + INGRESS_CLASSIFIER 역할만.
    QLoRA 없이 프롬프트·allowlist·confidence 하네스로 역할 혼합을 막는다.
    """

    async def route(self, query: str) -> IntentRouteResult:
        text = query.strip()
        if not text:
            return IntentRouteResult(
                intent=IngressIntent.CLARIFY,
                confidence=0.0,
                handler=INTENT_HANDLERS[IngressIntent.CLARIFY],
                scores={},
                reason="empty_query",
            )

        model = _hub_model()
        try:
            from lol.ollama import chat as ollama_chat

            raw = ollama_chat(
                [
                    {"role": "system", "content": _INGRESS_SYSTEM},
                    {"role": "user", "content": text},
                ],
                model=model,
                temperature=0.0,
                num_predict=96,
            )
        except Exception as exc:
            logger.warning("[gateway] exaone ingress classify failed: %s", exc)
            fb = _keyword_fallback(text)
            return IntentRouteResult(
                intent=fb.intent,
                confidence=fb.confidence,
                handler=fb.handler,
                scores=fb.scores,
                reason=f"exaone_failed:{exc};{fb.reason}",
            )

        parsed = _parse_intent_payload(raw)
        if parsed is None:
            fb = _keyword_fallback(text)
            return IntentRouteResult(
                intent=fb.intent,
                confidence=fb.confidence,
                handler=fb.handler,
                scores=fb.scores,
                reason=f"parse_failed;{fb.reason}",
            )

        intent, conf, reason = parsed
        min_conf = _min_confidence()
        if conf < min_conf:
            intent = IngressIntent.CLARIFY
            reason = f"below_threshold:{reason}"
        return IntentRouteResult(
            intent=intent,
            confidence=round(conf, 4),
            handler=INTENT_HANDLERS[intent],
            scores={intent.value: round(conf, 4)},
            reason=f"role={ExaoneLogicalRole.INGRESS_CLASSIFIER.value};{reason}",
        )
