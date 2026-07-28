"""silicon_valley LangChain 엔진용 시맨틱 인텐트 allowlist."""

from __future__ import annotations

from enum import StrEnum


class LangchainSpokeIntent(StrEnum):
    NCL_TRIP = "ncl_trip"
    MORNINGSTAR = "morningstar"
    ELASTIC = "elastic"
    CLARIFY = "clarify"
    OUT_OF_SCOPE = "out_of_scope"


INTENT_HANDLERS: dict[LangchainSpokeIntent, str] = {
    LangchainSpokeIntent.NCL_TRIP: "ncl_trip_planner",
    LangchainSpokeIntent.MORNINGSTAR: "morningstar_insight",
    LangchainSpokeIntent.ELASTIC: "elastic_security_assistant",
    LangchainSpokeIntent.CLARIFY: "ask_user",
    LangchainSpokeIntent.OUT_OF_SCOPE: "reject",
}

# 키워드 시맨틱 프로토타입 (임베딩 없이도 의도 판별)
INTENT_KEYWORDS: dict[LangchainSpokeIntent, tuple[str, ...]] = {
    LangchainSpokeIntent.NCL_TRIP: (
        "크루즈",
        "cruise",
        "ncl",
        "선실",
        "항로",
        "여행",
        "여행 계획",
        "알래스카",
        "지중해",
        "캐리비안",
        "발코니",
    ),
    LangchainSpokeIntent.MORNINGSTAR: (
        "재무",
        "보고서",
        "주식",
        "인사이트",
        "morningstar",
        "실적",
        "펀드",
    ),
    LangchainSpokeIntent.ELASTIC: (
        "보안",
        "알럿",
        "alert",
        "elastic",
        "침해",
        "eql",
        "위협",
    ),
}
