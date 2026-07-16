"""동일 EXAONE 가중치 · 논리 역할 분리 (디스크 절약용).

물리 모델은 Ollama `exaone3.5:7.8b` 하나.
역할은 포트·시스템 프롬프트·하네스 출력 제약으로만 구분한다.
한 번의 호출에 Hub+Spoke+답변을 섞지 않는다.
"""

from __future__ import annotations

from enum import StrEnum


class ExaoneLogicalRole(StrEnum):
    """카파시 하네스: 한 호출 = 한 역할."""

    INGRESS_CLASSIFIER = "ingress_classifier"  # 라벨 JSON만
    HUB_ROUTER = "hub_router"  # 스포크 선택 JSON만
    SPOKE_WORKER = "spoke_worker"  # SQL/도메인 JSON만
    HUB_SYNTH = "hub_synth"  # grounded 근거로만 문장 생성


ROLE_OUTPUT_CONTRACT: dict[ExaoneLogicalRole, str] = {
    ExaoneLogicalRole.INGRESS_CLASSIFIER: "intent JSON only; no user-facing answer",
    ExaoneLogicalRole.HUB_ROUTER: "spokes JSON only; no answer",
    ExaoneLogicalRole.SPOKE_WORKER: "sql/tool JSON only; no answer",
    ExaoneLogicalRole.HUB_SYNTH: "answer text only after grounding gate",
}
