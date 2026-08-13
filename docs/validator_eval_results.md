# Briefing Validator 평가 결과

- 실행 시각: `2026-08-13 10:52:19 KST`
- 케이스 수: **15**
- Accuracy: **100.0%** (15/15)
- False positive rate (정상 문장을 잘못 거름): **0.0%** (0/8)
- False negative rate (지어낸 문장을 못 거름): **0.0%** (0/7)

## Confusion

| | Predicted pass | Predicted fail |
|---|---:|---:|
| Expected pass | 8 | 0 |
| Expected fail | 0 | 7 |

## 케이스 상세

| ID | Category | Expected | Actual | Match | Ratio | Description |
|----|----------|----------|--------|-------|-------|-------------|
| G1 | grounded | pass | pass | ✓ | 0.667 | 캘린더 일정 제목·시간을 그대로 인용 |
| G2 | grounded | pass | pass | ✓ | 0.714 | 문서 검색 결과 제목·프리뷰를 근거로 요약 |
| G3 | grounded | pass | pass | ✓ | 0.462 | Slack 멘션·채널 메타를 정확히 반영 |
| G4 | grounded | pass | pass | ✓ | 0.571 | Gmail 미읽음 제목·발신자를 근거로 정리 |
| G5 | grounded | pass | pass | ✓ | 0.529 | 캘린더+히스토리 복합 근거 |
| H1 | hallucination | fail | fail | ✓ | 0.292 | 문서 소스 비어 있는데 Q3 로드맵·North-star KPI 환각 |
| H2 | hallucination | fail | fail | ✓ | 0.357 | Slack 미연동인데 #channel·슬랙 멘션을 날조 |
| H3 | hallucination | fail | fail | ✓ | 0.462 | Gmail 미연동인데 inbox·메일함 서술 |
| H4 | hallucination | fail | fail | ✓ | 0.000 | 도구 결과와 무관한 고유명사·사실만 나열 (근거 비율 낮음) |
| H5 | hallucination | fail | fail | ✓ | 0.286 | 문서 마커(문서 저장소)만으로도 환각 판정 |
| B1 | borderline | pass | pass | ✓ | 0.706 | 일정은 맞지만 근거에 없는 '중요도 높음' 해석을 덧붙임 — 토큰 겹침은 충분해 통과 기대 |
| B2 | borderline | pass | pass | ✓ | 0.364 | Slack 근거는 있으나 없는 채널(#random)을 함께 언급 — Slack 소스 비어있지 않아 통과 가능 |
| B3 | borderline | fail | fail | ✓ | 0.067 | 약한 근거 비율 — 일정 한 단어만 남고 대부분 지어냄 → fail 기대 |
| B4 | borderline | fail | fail | ✓ | 0.000 | 문서 연동은 됐지만 다른 문서명을 인용 — 마커 없으면 ratio로만 판단 |
| B5 | borderline | pass | pass | ✓ | 1.000 | 빈 소스가 많은데 일반적인 인사말만 — items 없으면 ratio 체크 스킵 → pass |

## 오판 / 메모

오판 없음.
## 평가 방법

- 대상: `orchestration.app.briefing.nodes.validator_node` (프로덕션 코드 직접 호출)
- 모드: `validator_mode=auto`, `synth_retries=0` (강제 승인·리뷰 우회 없음)
- pass = `validation_ok=True` 이고 review pending 아님
- fail = `validation_ok=False` (또는 review pending)
- 케이스 정의: `backend/apps/orchestration/tests/eval/validator_cases.py`
