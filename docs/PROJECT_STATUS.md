# Moneo 프로젝트 현황 (PROJECT_STATUS)

> 작성 기준: 코드·커밋 검증 (`HEAD` `c479bf4`, 2026-08-13)  
> 참고: `docs/ARCHITECTURE.md` · 사용자 요청 목록은 **검증용 체크리스트**로만 사용하고, 실제와 다르면 코드 기준으로 수정함.

---

## 1. 시스템 개요

**Moneo**는 일정·문서·채팅·외부 메신저/메일 맥락을 모아 **일일 업무 브리핑**, **주간 리포트**, **상황 감지형 능동 알림**을 제공하는 AI 업무 오케스트레이션 웹앱이다.  
제품 방향 문서(`.cursorrules`)에는 냉장고·날씨·취향 축도 있으나, **현재 오케스트레이션 코어**는 브리핑·Watcher·채팅 의도 라우팅에 집중되어 있다.

| 영역 | 스택 (코드 기준) |
|------|------------------|
| 프론트 | Next.js 16 (App Router), React 19, TypeScript, Tailwind — `frontend/` |
| 백엔드 | Python 3.13+, FastAPI, Uvicorn — `backend/apps/main.py` |
| DB | PostgreSQL (SQLAlchemy 2 async, Alembic, pgvector 서비스) |
| 에이전트 | LangGraph + Gemini (`orchestration/app/briefing`, `weekly_report`) |
| 스케줄 | APScheduler (`briefing/scheduler.py`, `watcher/scheduler.py`) |
| 배포 | **프론트: Vercel** (`www.monenon.cloud`) · **API/auth: Docker Compose + Cloudflare Tunnel** (`api.monenon.cloud`, `auth.monenon.cloud`) |

**검증 메모:** 요청안에 있던 “Railway 배포”는 **이 저장소에 설정·문서가 없다.** (과거 커밋 메시지에 Railway URL 정규화 언급만 있음 — `277615c`. 현재 compose/터널 구조가 기준.)

관련: `docker-compose.yaml`, `frontend/`, `backend/apps/main.py`, `.cursorrules`

---

## 2. 브리핑 오케스트레이션 (핵심)

**상태:** 구현 완료  
**구현 위치:**

| 구분 | 경로 |
|------|------|
| 그래프 | `backend/apps/orchestration/app/briefing/graph.py` |
| 노드 | `backend/apps/orchestration/app/briefing/nodes.py` |
| 상태 | `backend/apps/orchestration/app/briefing/state.py` |
| Tool 이벤트 | `backend/apps/orchestration/app/briefing/tool_logs.py` |
| 실행 UC | `backend/apps/orchestration/app/use_cases/run_briefing.py`, `get_or_create_today_briefing.py` |
| 아침 cron | `backend/apps/orchestration/app/briefing/scheduler.py` |
| 프론트 Stream | `frontend/components/home/tool-stream.tsx` |

### 그래프 구조

```
START → router → calendar → docs → history → slack → gmail
      → synthesizer → validator ⇄ synthesizer (조건부)
      → END
```

`build_briefing_graph()` 주석·엣지와 동일 (`graph.py`).

### Validator 재시도

- `_after_validator`: `validation_ok` 또는 `validation_review_pending`이면 END.
- 그 외 `synth_retries >= 2`이면 END, 아니면 `synthesizer`로 루프.
- **최대 재합성 2회** (auto 모드). 상한 도달 시 validator가 강제 승인 + 경고 이벤트.

### Tool Stream 노출

- 노드마다 `make_node_event(..., attempt=..., status=...)`로 `tool_logs`에 append.
- synthesizer 재시도 시 `status="retrying"`, validator 실패 시 `status="failed"` / `VALIDATION_FAILED`.
- 프론트: `AttemptBadge`(N차 시도), `AutoRecheckBadge`(검증 실패·자동 재검증), `computeSuperseded()`로 이전 실패 시도 흐리게 처리.

### Slack / Gmail 미연동 skip

세 층:

1. router가 도구를 고르지 않음 → `not_selected`
2. `user_id` / 세션 없음 → `not_connected`
3. `IntegrationPgRepository` 미연결 → `slack_source` / `gmail_source`의 `_skipped()` (`status: "skipped"`)

스킵은 그래프를 멈추지 않음. synthesizer는 skipped 소스를 프롬프트에서 제외하고, validator는 근거 없는 Slack/Gmail 서술을 걸러낸다.

### 아침 사전생성

- APScheduler `CronTrigger`, job id `daily_briefing_morning`, 기본 07:00 KST (`BRIEFING_CRON_HOUR` / `_MINUTE`).

---

## 3. 데이터 소스 연동

### Slack · Gmail

**상태:** 구현 완료  
**구현 위치:**

| 구분 | 경로 |
|------|------|
| ORM | `backend/apps/orchestration/adapter/outbound/orm/user_integration_orm.py` (`user_integrations`) |
| OAuth (BE) | `.../integrations/slack_oauth.py`, `gmail_oauth.py` |
| API | `.../api/v1/integrations_router.py` |
| OAuth (FE) | `frontend/lib/integration-oauth-*.ts`, `frontend/app/api/auth/{start,callback}/integration/[provider]/` |
| 브리핑 소스 | `briefing/slack_source.py`, `gmail_source.py` |

- provider: `slack` | `gmail`
- 컬럼: `access_token`, `refresh_token`, `expires_at`, `enabled`, `metadata`(JSONB)
- Gmail redirect: `{origin}/api/auth/callback/integration/gmail` (www 고정 로직: `frontend/lib/oauth-redirect-uri.ts`)

### Calendar

**상태:** 구현 완료 (카카오 톡캘린더)  
**구현 위치:** `backend/apps/orchestration/app/briefing/calendar_source.py`  
→ `mail.calendar_app.kakao_talk_calendar` (`get_valid_access_token`, `list_events_in_range`)

- 연동 off / 동의 없음 → `skipped`
- 브리핑 calendar 노드 + Watcher 밀도/겹침 감지 **공용**

### Docs

**상태:** 부분 구현 (스텁) — §10 참고  
**구현 위치:** `briefing/docs_source.py` — 항상 `docs_store_not_connected` skip

---

## 4. 상황 감지형 능동 알림 (Proactive Watcher)

**상태:** 구현 완료 (설계 갭 1건 — §10)  
**구현 위치:**

| 구분 | 경로 |
|------|------|
| 스케줄 | `orchestration/app/watcher/scheduler.py` |
| 사이클 | `watcher/runner.py` |
| 감지 | `watcher/checks.py` + calendar/slack/gmail source 내 체크 |
| 발송 | `watcher/notify.py` |
| 이력 | `proactive_alerts` ORM/repo · 마이그레이션 `20260815_proactive_watcher`, `20260817_proactive_alerts_read_message` |
| 인앱 API | `api/v1/proactive_alerts_router.py` |
| 인앱 UI | `frontend/components/home/alert-bell-button.tsx` |

### APScheduler

- `AsyncIOScheduler` + `IntervalTrigger`, job id `proactive_watcher`
- 기본 간격 30분 (`WATCHER_INTERVAL_MINUTES`, 최소 5)
- 활성 시간 기본 08–20 KST (`WATCHER_ACTIVE_HOURS_*`)
- `WATCHER_ENABLED`로 on/off
- FastAPI lifespan에서 start/stop (`backend/main.py`)

### 감지 항목 (`alert_type` — 코드 값)

| alert_type | 설명 | trigger_key 예 |
|------------|------|----------------|
| `calendar_density` | 짧은 구간에 일정 밀집 | `density:{date}:{id}` |
| `calendar_conflict` | 일정 겹침 | `conflict:{a}:{b}` |
| `slack_urgent` | Slack 긴급/멘션류 | `slack:{channel}:{ts}` |
| `gmail_deadline` | Gmail 데드라인/긴급 | `gmail:{message_id}` |

요청안의 `*_check` 접미사는 함수명 관례일 뿐, **DB·이벤트에 저장되는 타입은 위 문자열**.

### 24시간 억제

- `filter_unsent_issues` → `ProactiveAlertPgRepository.was_sent_within(..., hours=24)`
- 동일 `user_id` + `trigger_key` + `sent_at` 최근 24h면 재발송 안 함

### 발송 채널

1. **인앱:** `record_sent`로 DB 저장 (`message`, `read_at`) → `GET /orchestration/alerts`, 헤더 벨 45초 폴링·토스트  
2. **Slack DM** / **Gmail 이메일** — 연동되어 있으면 `briefing_notify` 경유 추가 발송  

`channels` 응답 라벨: `in_app`, `slack_dm`, `email`

### 설정

- `user_notification_settings`: `alert_calendar_density`, `alert_urgent_messages`
- UI: 마이페이지 브리핑 알림 섹션 (최근 커밋에서 **아침 알림 UI는 Gmail 중심**, Slack 채널 옵션 제거 — Watcher용 Slack 연동 코드는 유지)

---

## 5. 채팅 오케스트레이션

**상태:** 구현 완료  
**구현 위치:**

| 구분 | 경로 |
|------|------|
| HTTP | `POST /agent/chat` — `backend/main.py` |
| UC | `orchestration/app/use_cases/run_agent_chat.py` |
| 의도 | `orchestration/app/chat_intent_router.py` |
| 프론트 | `frontend/lib/agent-chat-api.ts`, `lifestyle/chats` 등 |

### 의도 분류

`ChatIntent = briefing_request | report_request | general_chat`

1. 키워드 가중 점수 (`_BRIEFING_RULES`, `_REPORT_RULES`)
2. 애매하면 Gemini JSON 분류 (`CHAT_INTENT_LLM_ENABLED`, 기본 on)

### 서브에이전트 호출

| intent | 동작 |
|--------|------|
| `briefing_request` + user | `get_or_create_today_briefing` → 브리핑 그래프 · `type: "briefing"` |
| `report_request` + user | `run_weekly_report` → 주간 그래프 · `type: "report"` |
| `general_chat` | 사용자 맥락 보강 후 Gemini 직접 호출 |
| user 없음 | 그래프 intent도 general로 강등 |

부가: 오늘 일정 없을 때 데모 일정 seed 제안 (`demo_schedule.py`).

---

## 6. Human-in-the-loop

**상태:** 구현 완료 (브리핑만)  
**구현 위치:**

| 구분 | 경로 |
|------|------|
| 모드 | `briefing/validator_mode.py` (`auto` \| `review`) |
| 페이로드 | `briefing/validator_review.py` |
| 저장 | `daily_briefings.pending_review` (JSONB) |
| 결정 UC | `use_cases/resolve_briefing_review.py` |
| API | `POST /agent/briefing/{id}/review`, `POST /orchestration/briefing/{id}/review` |
| UI | `frontend/components/chat/briefing-pending-review.tsx` |

### 플로우

1. validator 실패 + (`validator_mode == "review"` **또는** docs 환각) → `pending_review` 생성, 검증된 본문만 `answer`, 재시도 없이 END  
2. 사용자 **포함하기 / 제외하기** → `resolve_briefing_review` (`include` \| `exclude`)  
3. Tool Stream에 인간 결정 로그 append 후 DB 반영  

설정 UI: `agent-settings-form.tsx` ↔ `PATCH /orchestration/notification-settings`

**주간 리포트:** HITL 없음 (auto 재시도만).

---

## 7. 주간 리포트 생성

**상태:** 구현 완료  
**구현 위치:** `orchestration/app/weekly_report/{graph,nodes,state,format,tool_logs}.py`, `use_cases/run_weekly_report.py`

```
weekly_router → aggregate_briefings → risk_analyzer
  → next_action_recommender → report_synthesizer → validator
       ↑_________________________________________| (최대 1회 재시도)
```

- 최근 7일 `daily_briefings` 집계
- risk: 휴리스틱 키워드 + LLM
- validator 재시도 상한 **1회** (`synth_retries >= 1`)
- API: `POST /agent/report/weekly` 등 · 홈 카드 UI 연동

---

## 8. 검증 / 평가

**상태:** 스크립트·결과 문서 존재  
**구현 위치:**

| 구분 | 경로 |
|------|------|
| 러너 | `scripts/eval_validator.py` |
| 케이스 | `backend/apps/orchestration/tests/eval/validator_cases.py` (15건) |
| 결과 | `docs/validator_eval_results.md` |

### 최근 기록 (`2026-08-13 11:45:12 KST`)

| 지표 | 값 |
|------|-----|
| Accuracy | **100.0%** (15/15) |
| False positive | **0.0%** (0/8) |
| False negative | **0.0%** (0/7) |

프로덕션 `validator_node`를 모드 `auto`로 직접 호출. 기본 pytest 경로(`apps/titanic/tests`)에는 orchestration 그래프 단위 테스트가 **포함되지 않음**.

---

## 9. 인프라

| 항목 | 실제 상태 |
|------|-----------|
| 프론트 도메인 | `https://www.monenon.cloud` (apex → www 307), **Vercel** |
| API | `https://api.monenon.cloud` → Docker `backend:8000` (Cloudflare Tunnel) |
| Auth | `https://auth.monenon.cloud` → Docker `auth:9000` |
| n8n | `https://n8n.monenon.cloud` (compose에 포함) |
| PostgreSQL | compose `pgvector` (+ 운영 DB URL은 `.env` / Keymaker) |
| Neo4j | compose `neo4j:5` 기동 · **오케스트레이션 미사용**. `star_craft` / `lol/neo4j` 교육·허브용. Aura Free “예정” 전용 설정은 문서화만 (`lol/neo4j/README.md`) |
| Redis / Qdrant / Ollama | compose에 존재 |
| Railway | **미사용 (저장소에 배포 설정 없음)** |

### 인증

요청안의 “카카오만”과 다름. **카카오 · 네이버 · Google** 모두 구현.

- BE: `secretary` OAuth use cases · `login` 라우트  
- FE: `api/auth/start|callback/{kakao,naver}`, Google GIS 로그인  
- 톡캘린더는 카카오 계정/동의와 연동

---

## 10. 아직 안 된 것 / TODO · 갭

코드·연동을 기준으로 한 미완·부분·불일치.

| 항목 | 상태 | 설명 |
|------|------|------|
| Docs 소스 | **미구현(스텁)** | `docs_source.py` 항상 skip. synthesizer의 문서 환각 주입·validator docs 환각 → HITL 경로와 맞물림 |
| Watcher `no_channel` 게이트 | **설계 갭** | `runner.py`가 Slack/Gmail **둘 다 없으면 감지 자체를 skip**. `notify.py`는 인앱 선저장인데, 게이트 때문에 **인앱만 쓰는 사용자는 Watcher 알림을 못 받음** |
| Agent settings 대부분 | **부분** | `frontend/lib/agent-settings-store.ts` — localStorage mock, `TODO: GET/PATCH /api/agent/settings`. 서버 연동은 알림·validator 모드 일부만 |
| 주간 리포트 HITL | **미구현** | pending_review 없음 |
| 아침 알림 UI Slack | **의도적 축소** | 설정 UI에서 Slack 채널 제거·Gmail 중심. Watcher/브리핑 Slack **코드는 잔존** |
| API 이중 경로 | 동작함 · 정리 여지 | `/agent/briefing/*` 와 `/orchestration/briefing/*` 중복 |
| orchestration 자동 테스트 | **약함** | eval 스크립트만. pytest 기본 path 밖 |
| Railway | **해당 없음** | Vercel + Tunnel + Compose가 실제 구조 |
| Neo4j → 브리핑 | **미연결** | 제품 브리핑 파이프라인 비의존 |

---

## 부록 A. 최근 관련 커밋 (발췌)

| 커밋 | 요약 |
|------|------|
| `9a943a8` | 인앱 알림 API·헤더 벨·폴링 토스트 |
| `4f79330` / `f4dc573` | Gmail OAuth redirect www/로컬 수정 |
| `6f6a4a9` / `4a128c7` | 브리핑 알림 UI Slack 축소 |
| `989ee87` / `ced6029` | 브리핑 합성 폴백·히스토리 오류 제외 |
| `53c78e9` | validator eval 15케이스 |
| `0eb007b` | pending_review · 설정 · 채팅 UI |
| `1667636` | 채팅 의도 라우터 → 브리핑/주간 그래프 |
| `2f7be51` | Proactive Watcher |
| `b2dec1f` | Slack/Gmail 노드 · user_integrations |
| `00a0363` | Tool Stream 재시도/검증 이벤트 |
| `e7b8a07` | LangGraph 능동 브리핑 |

---

## 부록 B. 한눈에 보는 완성도

| 기능 | 완성도 |
|------|--------|
| 브리핑 LangGraph + Tool Stream | ✅ |
| Slack/Gmail/톡캘린더 연동 | ✅ |
| Docs 스토어 | ❌ 스텁 |
| Watcher + 24h 억제 + Slack/메일 | ✅ |
| 인앱 알림 벨 | ✅ (단, Watcher 게이트 갭) |
| 채팅 의도 라우팅 | ✅ |
| HITL (브리핑) | ✅ |
| 주간 리포트 | ✅ |
| Validator eval | ✅ 15/15 |
| 배포 (Vercel + Tunnel) | ✅ |
| Railway | ❌ 해당 없음 |

이 문서는 구현 스냅샷이다. 구조 설명용 다이어그램은 `docs/ARCHITECTURE.md`를 함께 보면 된다.
