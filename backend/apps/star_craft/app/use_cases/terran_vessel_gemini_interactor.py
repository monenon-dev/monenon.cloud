"""테란 Vessel — Gemini API로 일반 대화·추천 응답 생성.

Gateway intent=gemini 일 때 호출된다.
EXAONE/RAG와 역할을 섞지 않는다 (GEMINI_API_KEY + Keymaker만).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

_VESSEL_SYSTEM = (
    "[역할: terran_vessel / Gemini]\n"
    "당신은 Monenon의 가벼운 대화·추천 응답기입니다.\n"
    "DB 조회·SQL·사실 근거가 필요한 질문은 다루하지 말고, "
    "\"사실 데이터는 Moneyball/RAG 경로로 물어보세요\"라고 안내하세요.\n"
    "로그인·비밀번호·계정 보안 질문은 다루지 마세요.\n"
    "한국어로 짧고 명확하게 답하세요. 이모지 남용 금지.\n"
)


@dataclass(frozen=True)
class TerranVesselResult:
    ok: bool
    reply: str
    model: str
    handler: str = "gemini"
    detail: str | None = None


class TerranVesselGeminiInteractor:
    """GEMINI_API_KEY → call_gemini → 화면용 텍스트."""

    def answer(self, query: str, *, system_hint: str | None = None) -> TerranVesselResult:
        text = (query or "").strip()
        if not text:
            return TerranVesselResult(
                ok=False,
                reply="",
                model="",
                detail="질문이 비어 있습니다.",
            )

        from core.matrix.vault_keymaker_secret_manager import get_keymaker
        from gemini_caller import GeminiQuotaError, call_gemini

        km = get_keymaker()
        model = km.gemini_chat_model_id()
        preamble = _VESSEL_SYSTEM
        if system_hint:
            preamble = preamble + "\n" + system_hint.strip() + "\n"
        prompt = f"{preamble}\n[사용자]\n{text}"

        try:
            reply = call_gemini(prompt, model=model)
            logger.info(
                "[star_craft/terran_vessel] gemini ok model=%s chars=%s",
                model,
                len(reply),
            )
            return TerranVesselResult(ok=True, reply=reply, model=model)
        except GeminiQuotaError as exc:
            logger.warning("[star_craft/terran_vessel] quota: %s", exc)
            return TerranVesselResult(
                ok=False,
                reply="",
                model=model,
                detail=str(exc),
            )
        except Exception as exc:
            logger.exception("[star_craft/terran_vessel] gemini failed")
            return TerranVesselResult(
                ok=False,
                reply="",
                model=model,
                detail=str(exc),
            )


terran_vessel_gemini = TerranVesselGeminiInteractor()
