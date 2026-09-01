"""랜딩 데모 — 주간 업무 흐름 구어체 리포트 (stateless)."""

from __future__ import annotations

import logging
import random

from gemini_caller import GeminiQuotaError, call_gemini

logger = logging.getLogger(__name__)

FIELD_MAX_CHARS = 1500

SAMPLE_WEEK_ACTIVITY_LOG = """
월요일
- 스프린트 킥오프 (09:30)
- 결제 API 스펙 문서 초안 작성 완료
- 코드 리뷰 2건 처리

화요일
- 결제 모듈 리팩터링 PR #412 머지
- QA에서 발견된 버그 2건 수정·배포
- Slack #product에서 신규 요구사항 스레드 확인

수요일
- 팀 스탠드업, 주간 목표 재정렬
- 온보딩 가이드 3페이지 업데이트
- 오후 집중 개발 (알림 설정 화면)

목요일
- 디자인팀 싱크 미팅 (14:00)
- 투자자용 업데이트 덱 1차 초안 작성
- 고객사 A 일정 조율 메일 초안 작성 (미발송)

금요일
- 스프린트 레트로
- v0.9.2 배포 및 모니터링
- 다음 주 우선순위 정리

미완료·주의
- 고객사 A 회신 메일 (목요일까지로 약속했으나 아직 발송 전)
- Slack #ops 긴급 스레드 1건 미확인
"""

_SAMPLE_PROMPT = """아래는 가상의 한 주 업무 활동 로그입니다. Moneo AI 비서가 사용자에게 말하듯,
자연스러운 구어체 한국어로 3~5문장 이내로 "이번 주 흐름"을 정리해 주세요.

규칙:
- 1인칭("저는") 대신 "~했어요", "~좋겠어요" 같은 친근한 존댓말
- 요일·업무 내용을 구체적으로 1~2곳 언급
- 미완료 항목이 있으면 마지막 문장에서 부드럽게 한 번만 언급
- JSON·마크다운·목록 기호 없이 본문 텍스트만 출력
- 매번 표현을 조금씩 다르게 (문장 순서·어휘 변주)

활동 로그:
{log}
"""

_CUSTOM_PROMPT = """사용자가 입력한 이번 주 정보를 바탕으로, Moneo AI 비서가 말하듯
구어체 한국어 3~5문장 이내로 주간 흐름을 정리해 주세요.

규칙:
- 친근한 존댓말, JSON·마크다운 없이 본문만
- 입력에 없는 사실은 만들지 마세요
- 비어 있는 항목은 언급하지 마세요

완료한 일:
{completed}

주요 미팅·일정:
{meetings}

아직 처리 안 된 항목:
{pending}
"""

_VARIATION_HINTS = (
    "이번에는 '개발·배포' 쪽 비중을 조금 더 강조해 주세요.",
    "이번에는 '미팅·협업' 쪽을 조금 더 강조해 주세요.",
    "이번에는 '문서·정리' 쪽을 조금 더 강조해 주세요.",
    "이번에는 마무리 문장 톤을 조금 더 다정하게 써 주세요.",
)


def _normalize_narrative(raw: str) -> str:
    text = (raw or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 2:
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:]).strip()
    return text


def run_demo_report_sample() -> dict[str, object]:
    """샘플 주간 활동 로그 → 구어체 narrative."""
    hint = random.choice(_VARIATION_HINTS)
    prompt = f"{_SAMPLE_PROMPT.format(log=SAMPLE_WEEK_ACTIVITY_LOG.strip())}\n\n추가 힌트: {hint}"
    try:
        reply = call_gemini(prompt, temperature=1.05)
    except GeminiQuotaError:
        raise
    except Exception as exc:
        logger.exception("[demo.report-preview.sample] gemini failed")
        raise RuntimeError(f"주간 흐름 미리보기에 실패했습니다: {exc}") from exc

    narrative = _normalize_narrative(reply)
    if len(narrative) < 20:
        raise RuntimeError("리포트 결과가 너무 짧습니다.")

    logger.info("[demo.report-preview.sample] chars=%s", len(narrative))
    return {"narrative": narrative, "sample": True}


def run_demo_report_custom(
    *,
    completed_work: str,
    meetings: str,
    pending_items: str,
) -> dict[str, object]:
    """사용자 입력 3필드 → 구어체 narrative."""
    completed = (completed_work or "").strip()[:FIELD_MAX_CHARS]
    meeting_text = (meetings or "").strip()[:FIELD_MAX_CHARS]
    pending = (pending_items or "").strip()[:FIELD_MAX_CHARS]

    if not completed and not meeting_text and not pending:
        raise ValueError("완료한 일, 미팅, 미완료 항목 중 하나 이상을 입력해 주세요.")

    prompt = _CUSTOM_PROMPT.format(
        completed=completed or "(없음)",
        meetings=meeting_text or "(없음)",
        pending=pending or "(없음)",
    )
    try:
        reply = call_gemini(prompt, temperature=0.85)
    except GeminiQuotaError:
        raise
    except Exception as exc:
        logger.exception("[demo.report-preview] gemini failed")
        raise RuntimeError(f"주간 흐름 생성에 실패했습니다: {exc}") from exc

    narrative = _normalize_narrative(reply)
    if len(narrative) < 15:
        raise RuntimeError("리포트 결과를 만들지 못했습니다.")

    logger.info(
        "[demo.report-preview] completed=%s meetings=%s pending=%s chars=%s",
        bool(completed),
        bool(meeting_text),
        bool(pending),
        len(narrative),
    )
    return {"narrative": narrative, "sample": False}
