"""브리핑 validator 평가용 고정 케이스.

각 케이스:
  - id / category / description
  - input_context: BriefingState에 넣을 도구 결과
  - generated_sentence: synthesizer가 만든 것으로 가정한 본문
  - expected_verdict: "pass" | "fail"
"""

from __future__ import annotations

from typing import Any, Literal, TypedDict

Verdict = Literal["pass", "fail"]
Category = Literal["grounded", "hallucination", "borderline"]


class ValidatorEvalCase(TypedDict):
    id: str
    category: Category
    description: str
    input_context: dict[str, Any]
    generated_sentence: str
    expected_verdict: Verdict


def _calendar(*items: dict[str, str], status: str = "success") -> dict[str, Any]:
    return {
        "source": "calendar",
        "status": status,
        "tool": "calendar.list",
        "items": list(items),
        "summary": f"오늘 일정 {len(items)}건" if items else "일정 없음",
    }


def _docs(*items: dict[str, str], status: str = "success") -> dict[str, Any]:
    return {
        "source": "docs",
        "status": status,
        "tool": "docs.search",
        "items": list(items),
        "summary": f"문서 {len(items)}건" if items else "문서 없음",
    }


def _history(*items: dict[str, str], status: str = "success") -> dict[str, Any]:
    return {
        "source": "history",
        "status": status,
        "tool": "history.digest",
        "items": list(items),
        "summary": f"최근 대화 {len(items)}건" if items else "대화 없음",
    }


def _slack(*items: dict[str, str], status: str = "success") -> dict[str, Any]:
    return {
        "source": "slack",
        "status": status,
        "tool": "slack.digest",
        "items": list(items),
        "summary": f"Slack 요약 {len(items)}건" if items else "Slack 없음",
    }


def _gmail(*items: dict[str, str], status: str = "success") -> dict[str, Any]:
    return {
        "source": "gmail",
        "status": status,
        "tool": "gmail.digest",
        "items": list(items),
        "summary": f"미읽음 메일 {len(items)}건" if items else "메일 없음",
    }


def _skipped(source: str, tool: str) -> dict[str, Any]:
    return {
        "source": source,
        "status": "skipped",
        "tool": tool,
        "items": [],
        "reason": "not_connected",
        "summary": f"{source} 연동 안 됨",
    }


CASES: list[ValidatorEvalCase] = [
    # ── grounded (pass) ─────────────────────────────────────────────────────
    {
        "id": "G1",
        "category": "grounded",
        "description": "캘린더 일정 제목·시간을 그대로 인용",
        "input_context": {
            "calendar_result": _calendar(
                {"title": "Standup · Core", "meta": "09:30"},
                {"title": "Design sync", "meta": "10:15"},
            ),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## 오늘 일정\n\n"
            "- 09:30 Standup · Core\n"
            "- 10:15 Design sync\n\n"
            "오전 스탠드업과 디자인 싱크가 있습니다."
        ),
        "expected_verdict": "pass",
    },
    {
        "id": "G2",
        "category": "grounded",
        "description": "문서 검색 결과 제목·프리뷰를 근거로 요약",
        "input_context": {
            "calendar_result": _calendar(status="empty"),
            "docs_result": _docs(
                {
                    "title": "onboarding-checklist.md",
                    "preview": "신규 입사자 계정 발급과 VPN 설정을 1일차에 완료한다.",
                    "meta": "score 0.91",
                }
            ),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## 문서\n\n"
            "onboarding-checklist.md에 따르면 신규 입사자 계정 발급과 "
            "VPN 설정을 1일차에 완료해야 합니다."
        ),
        "expected_verdict": "pass",
    },
    {
        "id": "G3",
        "category": "grounded",
        "description": "Slack 멘션·채널 메타를 정확히 반영",
        "input_context": {
            "calendar_result": _calendar(status="empty"),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _slack(
                {
                    "title": "PR 리뷰 부탁드려요",
                    "meta": "#engineering · 멘션",
                    "preview": "@me PR 리뷰 부탁드려요 — deadline tomorrow",
                }
            ),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## Slack\n\n"
            "#engineering 채널에서 PR 리뷰 부탁드려요라는 멘션이 있습니다. "
            "deadline tomorrow 관련 확인이 필요합니다."
        ),
        "expected_verdict": "pass",
    },
    {
        "id": "G4",
        "category": "grounded",
        "description": "Gmail 미읽음 제목·발신자를 근거로 정리",
        "input_context": {
            "calendar_result": _calendar(status="empty"),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _gmail(
                {
                    "title": "계약서 회신 요청",
                    "meta": "legal@acme.com · 회신 필요",
                    "preview": "첨부 계약서 검토 후 회신 부탁드립니다.",
                }
            ),
        },
        "generated_sentence": (
            "## Gmail\n\n"
            "legal@acme.com에서 계약서 회신 요청 메일이 있습니다. "
            "첨부 계약서 검토 후 회신이 필요합니다."
        ),
        "expected_verdict": "pass",
    },
    {
        "id": "G5",
        "category": "grounded",
        "description": "캘린더+히스토리 복합 근거",
        "input_context": {
            "calendar_result": _calendar(
                {"title": "Investor prep", "meta": "11:00"},
            ),
            "docs_result": _docs(status="empty"),
            "history_result": _history(
                {
                    "title": "나",
                    "preview": "투자자 미팅 자료 초안 내일까지 올려줘",
                    "meta": "user",
                }
            ),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## 우선순위\n\n"
            "11:00 Investor prep 일정이 있고, "
            "최근 대화에서 투자자 미팅 자료 초안을 내일까지 올리라는 요청이 있었습니다."
        ),
        "expected_verdict": "pass",
    },
    # ── hallucination (fail) ────────────────────────────────────────────────
    {
        "id": "H1",
        "category": "hallucination",
        "description": "문서 소스 비어 있는데 Q3 로드맵·North-star KPI 환각",
        "input_context": {
            "calendar_result": _calendar(
                {"title": "Standup · Core", "meta": "09:30"},
            ),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## 오늘 일정\n\n- 09:30 Standup · Core\n\n"
            "문서 저장소의 Q3 로드맵(q3-roadmap.md)에 따르면 "
            "North-star KPI는 브리핑 목표 시간 45초 미만이라고 명시되어 있습니다."
        ),
        "expected_verdict": "fail",
    },
    {
        "id": "H2",
        "category": "hallucination",
        "description": "Slack 미연동인데 #channel·슬랙 멘션을 날조",
        "input_context": {
            "calendar_result": _calendar(
                {"title": "Design sync", "meta": "10:15"},
            ),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## 오늘\n\n10:15 Design sync가 있습니다.\n\n"
            "또한 Slack #ops 채널에서 긴급 장애 알림이 왔습니다."
        ),
        "expected_verdict": "fail",
    },
    {
        "id": "H3",
        "category": "hallucination",
        "description": "Gmail 미연동인데 inbox·메일함 서술",
        "input_context": {
            "calendar_result": _calendar(
                {"title": "Lunch / buffer", "meta": "12:30"},
            ),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## 일정\n\n12:30 Lunch / buffer\n\n"
            "Gmail inbox에 고객사 클레임 메일이 3통 쌓여 있습니다."
        ),
        "expected_verdict": "fail",
    },
    {
        "id": "H4",
        "category": "hallucination",
        "description": "도구 결과와 무관한 고유명사·사실만 나열 (근거 비율 낮음)",
        "input_context": {
            "calendar_result": _calendar(
                {"title": "Standup · Core", "meta": "09:30"},
            ),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## 브리핑\n\n"
            "오늘은 제주도 출장과 유럽 파트너십 협상, "
            "그리고 신규 IPO 준비 미팅이 핵심입니다. "
            "재무팀은 분기 실적을 이미 확정했다고 합니다."
        ),
        "expected_verdict": "fail",
    },
    {
        "id": "H5",
        "category": "hallucination",
        "description": "문서 마커(문서 저장소)만으로도 환각 판정",
        "input_context": {
            "calendar_result": _calendar(status="empty"),
            "docs_result": _docs(status="empty"),
            "history_result": _history(
                {"title": "에이전트", "preview": "오늘 일정 정리해줘", "meta": "assistant"}
            ),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "최근 대화에서 오늘 일정 정리를 요청했습니다. "
            "문서 저장소에 따르면 이번 스프린트 목표는 이미 확정되었습니다."
        ),
        "expected_verdict": "fail",
    },
    # ── borderline ─────────────────────────────────────────────────────────
    {
        "id": "B1",
        "category": "borderline",
        "description": "일정은 맞지만 근거에 없는 '중요도 높음' 해석을 덧붙임 — 토큰 겹침은 충분해 통과 기대",
        "input_context": {
            "calendar_result": _calendar(
                {"title": "Investor prep", "meta": "11:00"},
                {"title": "Design sync", "meta": "10:15"},
            ),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## 오늘 일정\n\n"
            "- 10:15 Design sync\n"
            "- 11:00 Investor prep\n\n"
            "Investor prep은 오늘 가장 중요한 미팅으로 보입니다."
        ),
        "expected_verdict": "pass",
    },
    {
        "id": "B2",
        "category": "borderline",
        "description": "Slack 근거는 있으나 없는 채널(#random)을 함께 언급 — Slack 소스 비어있지 않아 통과 가능",
        "input_context": {
            "calendar_result": _calendar(status="empty"),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _slack(
                {
                    "title": "배포 승인 부탁",
                    "meta": "#release · 멘션",
                    "preview": "오늘 배포 승인 부탁합니다",
                }
            ),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## Slack\n\n"
            "#release에서 배포 승인 부탁 멘션이 있고, "
            "#random에서도 비슷한 이야기가 있었습니다."
        ),
        "expected_verdict": "pass",
    },
    {
        "id": "B3",
        "category": "borderline",
        "description": "약한 근거 비율 — 일정 한 단어만 남고 대부분 지어냄 → fail 기대",
        "input_context": {
            "calendar_result": _calendar(
                {"title": "Standup", "meta": "09:00"},
            ),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "Standup 이후에는 경쟁사 인수 실사와 해외법인 설립 검토, "
            "그리고 신제품 런칭 캠페인 기획이 기다리고 있습니다."
        ),
        "expected_verdict": "fail",
    },
    {
        "id": "B4",
        "category": "borderline",
        "description": "문서 연동은 됐지만 다른 문서명을 인용 — 마커 없으면 ratio로만 판단",
        "input_context": {
            "calendar_result": _calendar(status="empty"),
            "docs_result": _docs(
                {
                    "title": "hiring-plan.md",
                    "preview": "Q4까지 백엔드 엔지니어 2명을 채용한다.",
                }
            ),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "security-audit.md에 따르면 외부 침투 테스트가 이번 주에 예정되어 있습니다. "
            "또한 규정 준수 체크리스트가 업데이트되었습니다."
        ),
        "expected_verdict": "fail",
    },
    {
        "id": "B5",
        "category": "borderline",
        "description": "빈 소스가 많은데 일반적인 인사말만 — items 없으면 ratio 체크 스킵 → pass",
        "input_context": {
            "calendar_result": _calendar(status="empty"),
            "docs_result": _docs(status="empty"),
            "history_result": _history(status="empty"),
            "slack_summary": _skipped("slack", "slack.digest"),
            "gmail_summary": _skipped("gmail", "gmail.digest"),
        },
        "generated_sentence": (
            "## 오늘의 브리핑\n\n"
            "연동된 일정·문서·메시지가 거의 없습니다. "
            "필요한 도구를 연결하면 더 구체적인 브리핑을 드릴 수 있어요."
        ),
        "expected_verdict": "pass",
    },
]
