"""입구 시맨틱 인텐트 라벨 — EXAONE 호출 전 라우팅 전용."""

from __future__ import annotations

from enum import StrEnum


class IngressIntent(StrEnum):
    """하네스 allowlist. 모델이 이 밖을 내면 out_of_scope로 강등."""

    CRUD = "crud"  # 단순 조회·생성·수정·삭제 API
    GEMINI = "gemini"  # 일반 대화·가벼운 생성 (Gemini 수준)
    SECURITY = "security"  # 로그인·인증·권한·개인정보
    EXAONE_RAG = "exaone_rag"  # DB/RAG 근거 필요 (Moneyball 등)
    OUT_OF_SCOPE = "out_of_scope"  # 거부·미지원
    CLARIFY = "clarify"  # confidence 부족 → 재질문


# 핸들러 힌트 (프론트/오케스트레이터가 사용)
INTENT_HANDLERS: dict[IngressIntent, str] = {
    IngressIntent.CRUD: "repository",
    IngressIntent.GEMINI: "gemini",
    IngressIntent.SECURITY: "secretary_auth",
    IngressIntent.EXAONE_RAG: "star_craft_moneyball",
    IngressIntent.OUT_OF_SCOPE: "reject",
    IngressIntent.CLARIFY: "ask_user",
}
