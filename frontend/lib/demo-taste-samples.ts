import type { DemoDocSummaryResult } from "@/lib/demo-doc-summary-api";

/** 로그인 전 랜딩 위젯 — API 없이 보여주는 고정 맛보기 (게스트 채팅 캐시와 동일 톤) */
export const DEMO_DOC_SUMMARY_TASTE: DemoDocSummaryResult = {
  summary_lines: [
    "월요일 스프린트 킥오프와 결제 API 스펙 초안 작성이 핵심이었어요.",
    "화~수요일엔 PR 머지와 QA 버그 수정, 문서 업데이트가 이어졌어요.",
    "목요일 디자인 싱크·투자자 덱 초안까지 진행됐지만, 고객사 A 회신은 아직이에요.",
  ],
  next_action: "다음 할 일: 고객사 A 일정 조율 메일 발송하기",
  truncated: false,
  notice: null,
};

export const DEMO_DOC_SUMMARY_TASTE_INPUT =
  "월: 스프린트 킥오프, 결제 API 스펙 초안 완료\n화: PR #412 머지, QA 버그 2건\n목: 디자인 싱크 — 고객사 A 회신 메일 미발송";

export const DEMO_WEEKLY_REPORT_TASTE_NARRATIVE =
  "이번 주는 개발·배포 쪽 비중이 가장 컸어요. 화요일엔 결제 모듈 리팩터링 PR을 머지했고, 목요일엔 디자인팀 싱크 미팅과 투자자 덱 초안까지 마무리했어요. 아직 고객사 A 회신과 Slack 긴급 스레드 1건이 남아 있으니, 다음 주 초반에 확인해 보시는 게 좋겠어요.";
