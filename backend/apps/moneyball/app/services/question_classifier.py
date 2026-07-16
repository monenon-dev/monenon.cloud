"""Moneyball 의사 분류기 — EXAONE/휴리스틱 JSON 파서 (답변 생성 금지)."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from moneyball.app.ontology.star import SPOKE_IDS, SpokeId
from moneyball.app.ports.output.question_classifier_port import QuestionClassifierPort
from moneyball.app.services.chat_journey import ChatJourney
from moneyball.app.services.heuristic import heuristic_route
from moneyball.app.services.llm_exaone import (
    chat_exaone,
    extract_json_object,
    fast_path_enabled,
    llm_enabled,
)
from moneyball.app.services.star_craft_hub import hub_route_moneyball
from moneyball.domain.question_classification import (
    INTENT_ALLOWLIST,
    QuestionClassification,
    SpokeSubquery,
)
from star_craft.app.use_cases import hub_model_name

logger = logging.getLogger(__name__)

CLASSIFY_PROMPT = """당신은 K리그 Moneyball 의사 분류기(파서)입니다.
사용자 질문을 분석하되, 절대 답변하지 마세요. 설명·문장 금지.

허용 intent: home_stadium | team_info | player_info | schedule | general
허용 스포크 id: stadium | team | player | schedule
(또는 moneyball.stadium 형태)

반드시 아래 JSON만 출력:
{"entities":["전북"],"intent":"home_stadium","spokes":[{"id":"stadium","subquery":"전북 홈구장"},{"id":"team","subquery":"전북"}],"reason":"홈구장 조회"}
"""


def _normalize_spoke_id(raw: str) -> SpokeId | None:
    name = raw.strip().lower()
    if name.startswith("moneyball."):
        name = name.split(".", 1)[1]
    if name in SPOKE_IDS:
        return name  # type: ignore[return-value]
    return None


def parse_classification_payload(
    data: dict[str, Any],
    question: str,
    *,
    mode: str,
) -> QuestionClassification | None:
    """하네스: allowlist·스키마 검증. 실패 시 None."""
    intent = str(data.get("intent") or "general").strip().lower()
    if intent not in INTENT_ALLOWLIST:
        intent = "general"

    entities_raw = data.get("entities") or []
    entities: list[str] = []
    if isinstance(entities_raw, list):
        for e in entities_raw:
            text = str(e).strip()
            if text and text not in entities:
                entities.append(text)

    spokes_out: list[SpokeSubquery] = []
    for item in data.get("spokes") or []:
        if not isinstance(item, dict):
            continue
        sid = _normalize_spoke_id(str(item.get("id") or item.get("spoke") or ""))
        if sid is None:
            continue
        subquery = str(item.get("subquery") or question).strip() or question
        spokes_out.append(SpokeSubquery(id=sid, subquery=subquery))

    if not spokes_out:
        return None

    # 스포크 순서 고정·id 중복 제거
    order = {s: i for i, s in enumerate(SPOKE_IDS)}
    seen: set[SpokeId] = set()
    ordered: list[SpokeSubquery] = []
    for spoke in sorted(spokes_out, key=lambda s: order[s.id]):
        if spoke.id in seen:
            continue
        seen.add(spoke.id)
        ordered.append(spoke)
    spokes_out = ordered

    return QuestionClassification(
        entities=entities,
        intent=intent,
        spokes=spokes_out,
        reason=str(data.get("reason") or "").strip(),
        mode=mode,
    )


def classification_from_route(
    route: list[dict[str, str]],
    *,
    mode: str,
    entities: list[str] | None = None,
    intent: str = "general",
    reason: str = "",
) -> QuestionClassification:
    spokes = [
        SpokeSubquery(id=item["id"], subquery=item.get("subquery") or "")  # type: ignore[arg-type]
        for item in route
        if item.get("id") in SPOKE_IDS
    ]
    return QuestionClassification(
        entities=entities or [],
        intent=intent if intent in INTENT_ALLOWLIST else "general",
        spokes=spokes,
        reason=reason,
        mode=mode,
    )


def heuristic_classify(question: str) -> QuestionClassification:
    from moneyball.app.services.heuristic import pick_keyword

    route = heuristic_route(question)
    kw = pick_keyword(question)
    entities: list[str] = []
    if kw:
        entities = [kw]
    intent = "general"
    text = question
    if any(k in text for k in ("홈구장", "경기장", "구장", "스타디움")):
        intent = "home_stadium"
    elif any(k in text for k in ("선수", "포지션", "등번호", "백넘버")):
        intent = "player_info"
    elif any(k in text for k in ("일정", "스코어", "경기")):
        intent = "schedule"
    elif any(k in text for k in ("팀", "구단", "연고")):
        intent = "team_info"
    return classification_from_route(
        route, mode="heuristic", entities=entities, intent=intent, reason="heuristic"
    )


class ExaoneQuestionClassifier(QuestionClassifierPort):
    """EXAONE JSON 파서 → 실패 시 star_craft → heuristic."""

    def __init__(
        self,
        session: AsyncSession | None = None,
        journey: ChatJourney | None = None,
    ) -> None:
        self._session = session
        self._journey = journey

    def _log(self, stage: str, **fields: Any) -> None:
        if self._journey:
            self._journey.log(stage, **fields)

    async def classify(self, question: str) -> QuestionClassification:
        q = question.strip()
        if not q:
            return QuestionClassification(mode="empty")

        if not llm_enabled() or fast_path_enabled():
            result = heuristic_classify(q)
            self._log(
                "classifier.heuristic",
                intent=result.intent,
                entities=result.entities,
                spokes=result.as_route(),
            )
            return result

        # 1) EXAONE 파서 (답변 금지 프롬프트)
        try:
            raw = chat_exaone(
                [
                    {"role": "system", "content": CLASSIFY_PROMPT},
                    {"role": "user", "content": q},
                ],
                model=hub_model_name(),
                temperature=0.0,
                num_predict=160,
            )
            data = extract_json_object(raw)
            parsed = parse_classification_payload(data, q, mode="exaone-classifier")
            if parsed is not None:
                self._log(
                    "classifier.exaone",
                    intent=parsed.intent,
                    entities=parsed.entities,
                    spokes=parsed.as_route(),
                    reason=parsed.reason,
                )
                return parsed
            self._log("classifier.exaone_invalid", raw_keys=list(data.keys()))
        except Exception as exc:
            logger.warning("[moneyball] classifier exaone failed: %s", exc)
            self._log("classifier.exaone_failed", error=str(exc))

        # 2) star_craft 허브 라우팅 (토폴로지 유지)
        if self._session is not None and self._journey is not None:
            route, mode, meta = await hub_route_moneyball(self._session, q, self._journey)
            if route:
                result = classification_from_route(
                    route,
                    mode=mode,
                    intent="general",
                    reason=str(meta.get("reason") or ""),
                )
                self._log(
                    "classifier.star_craft",
                    intent=result.intent,
                    spokes=result.as_route(),
                )
                return result

        # 3) heuristic
        result = heuristic_classify(q)
        self._log(
            "classifier.fallback_heuristic",
            intent=result.intent,
            spokes=result.as_route(),
        )
        return result
