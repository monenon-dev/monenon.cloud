---
type: prompt
app: moneyball
audience: claude-code
os: Ubuntu 24.04
db: PostgreSQL + pgvector (Docker `pgvector` 서비스)
orm_migration: Alembic
source_erd: backend/apps/resources/DB.png
links:
  - star_craft
  - silicon_valley
  - titanic
  - dumb_and_dumber
---

# Moneyball — 앱 문서 · Claude Code 프롬프트

머니볼(세이버메트릭스) 교육 도메인. `dumb_and_dumber`와 동일한 헥사고날 스캐폴드.  
**단일 문서:** 예전 `_docs/CLAUDE.md`는 제거하고 본 파일(`moneyball.casting.md`)만 유지한다.

## 캐릭터

| 캐릭터 | 역할 |
|--------|------|
| `beane` (Billy Beane) | GM 스카우트 — 세이버메트릭스 기반 선수·전략 의사결정 |
| `brand` (Peter Brand) | 애널리스트 — 데이터 모델·OPS/가치 지표 분석 |

**의존성 방향:** `adapter` → `app` → `domain`

---

# Claude Code 프롬프트 — Moneyball ERD → Alembic (pgvector)

> **용도:** Claude Code에 그대로 붙여 넣어 실행하는 **작업 지시 프롬프트**.  
> **원칙:** 저장소 루트 `.cursorrules` 카파시 하네스 (Think → Simplicity → Surgical → Goal-driven).  
> **이 파일은 프롬프트 본문이다.** 구현 전에 아래를 끝까지 읽고, 가정을 숨기지 말 것.

---

## 0. 역할

당신은 Monenon 백엔드에서 **Moneyball** 도메인 테이블을 **Ubuntu 24 + pgvector PostgreSQL**에 **Alembic 마이그레이션**으로 생성하는 구현 에이전트다.

성공 기준은 “코드가 많아 보이는 것”이 아니라 **검증 가능한 DB 스키마**다.

---

## 1. 구현 전 사고 (Think Before Coding)

작업을 시작하기 **전에** 채팅에 짧게 적는다.

1. **가정** — ERD 소스, DB URL, Alembic 리비전 체인, PK 규칙 충돌 처리 방식을 명시한다.
2. **대안** — 문자열 PK 그대로 vs 프로젝트 `ENTITY_RULE`의 `id int` 서러게이트. **선택을 고르고 이유를 쓴다.**
3. **비범위** — 시드 데이터 INSERT, FastAPI 라우터, 프론트, 벡터 컬럼 추측 추가는 **이번 작업에서 하지 않는다** (요청 시만).
4. **더 단순한 해법** — 가능하면 autogenerate보다 **명시적 `op.create_table`** (기존 titanic 마이그레이션 스타일)을 우선한다.

불확실하면 **코드 전에** 질문한다. 추측으로 스키마를 확장하지 않는다.

---

## 2. 반드시 읽을 문서·파일 (순서)

1. `.cursorrules`
2. `vault/backend/BACKEND_RULES.md` (또는 `docs/DevOps/backend/BACKEND_RULES.md`가 있으면 그것)
3. `vault/backend/ENTITY_RULE.md` — **신규 테이블 PK = `id` int 자동증감**
4. `backend/apps/moneyball/_docs/moneyball.casting.md` — 본 프롬프트(단일 문서)
5. `backend/apps/resources/DB.png` — ERD 원본
6. `backend/alembic/env.py`, `backend/alembic/versions/*.py` — 기존 리비전·import 패턴
7. `docker-compose.yaml`의 `pgvector` 서비스·루트/백엔드 `.env`의 `DATABASE_URL`

충돌 시 우선순위: **`ENTITY_RULE` → 기존 Alembic/ORM 스타일 → ERD 비즈니스 컬럼 보존**.

---

## 3. ERD 스펙 (DB.png)

네 테이블. 관계: `stadium 1—* team` (`team.stadium_id`), `stadium 1—* schedule` (`schedule.stadium_id`), `team 1—* player` (`player.team_id`).

### 3.1 stadium

| 컬럼 (ERD) | 타입 |
|------------|------|
| stadium_id | VARCHAR(10) — 업무 키 |
| stadium_name | VARCHAR(40) |
| hometeam_id | VARCHAR(10) |
| seat_count | INTEGER |
| address | VARCHAR(60) |
| ddd | VARCHAR(10) |
| tel | VARCHAR(10) |

### 3.2 team

| 컬럼 (ERD) | 타입 |
|------------|------|
| team_id | VARCHAR(10) — 업무 키 |
| region_name | VARCHAR(10) |
| team_name | VARCHAR(40) |
| e_team_name | VARCHAR(50) |
| orig_yyyy | VARCHAR(10) |
| zip_code1 | VARCHAR(10) |
| zip_code2 | VARCHAR(10) |
| address | VARCHAR(80) |
| ddd | VARCHAR(10) |
| tel | VARCHAR(10) |
| fax | VARCHAR(10) |
| homepage | VARCHAR(50) |
| owner | VARCHAR(10) |
| stadium_id | VARCHAR(10) — FK → stadium 업무 키 |

### 3.3 player

| 컬럼 (ERD) | 타입 |
|------------|------|
| player_id | VARCHAR(10) — 업무 키 |
| player_name | VARCHAR(20) |
| e_player_name | VARCHAR(40) |
| nickname | VARCHAR(30) |
| join_yyyy | VARCHAR(10) |
| position | VARCHAR(10) |
| back_no | INTEGER |
| nation | VARCHAR(20) |
| birth_date | DATE |
| solar | VARCHAR(10) |
| height | INTEGER |
| weight | INTEGER |
| team_id | VARCHAR(10) — FK → team 업무 키 |

### 3.4 schedule

| 컬럼 (ERD) | 타입 |
|------------|------|
| sche_date | VARCHAR(10) — 업무 복합키 일부 |
| stadium_id | VARCHAR(10) — 업무 복합키 + FK → stadium |
| gubun | VARCHAR(10) |
| hometeam_id | VARCHAR(10) |
| awayteam_id | VARCHAR(10) |
| home_score | INTEGER |
| away_score | INTEGER |

---

## 4. 스키마 매핑 규칙 (필수 — 하네스 결정)

ERD는 문자열/복합 PK를 쓰지만, 이 저장소 `ENTITY_RULE`은 **신규 테이블에 문자열·복합 PK 금지**, **`id` int PK만** 허용한다.

**채택 매핑 (임의 변경 금지):**

| 물리 테이블명 | PK | 업무 키 | FK |
|---------------|----|---------|----|
| `moneyball_stadium` | `id` INTEGER PK AI | `stadium_id` VARCHAR(10) **UNIQUE NOT NULL** | — |
| `moneyball_team` | `id` INTEGER PK AI | `team_id` VARCHAR(10) **UNIQUE NOT NULL** | `stadium_id` → `moneyball_stadium.stadium_id` |
| `moneyball_player` | `id` INTEGER PK AI | `player_id` VARCHAR(10) **UNIQUE NOT NULL** | `team_id` → `moneyball_team.team_id` |
| `moneyball_schedule` | `id` INTEGER PK AI | `(sche_date, stadium_id)` **UNIQUE** | `stadium_id` → `moneyball_stadium.stadium_id` |

- 테이블 prefix: `moneyball_` (라이프스타일·타이타닉과 충돌 방지).
- ERD에 없는 컬럼·인덱스·벡터 차원을 **추측으로 추가하지 않는다.**
- `CREATE EXTENSION IF NOT EXISTS vector` 는 **마이그레이션 최상단에서 1회** (이미 있으면 no-op). **벡터 컬럼은 이번 범위 밖.**
- nullable: ERD에 NOT NULL 표시가 없으면, 업무 키·필수 식별만 NOT NULL, 나머지는 nullable 허용. 불확실하면 **업무 키만 NOT NULL**로 단순화하고 채팅에 적는다.

---

## 5. 구현 범위 (Surgical)

### 할 일

1. Moneyball ORM 모델 (SQLAlchemy 2 `Mapped`) — `moneyball/adapter/outbound/` 아래, 기존 앱 ORM 패턴 준수.
2. `backend/alembic/env.py`에 모델 import 추가 (metadata 인식).
3. Alembic revision 1개 작성:
   - `upgrade`: extension + 4 테이블 + UNIQUE + FK + 필요 인덱스
   - `downgrade`: 역순 drop
   - `down_revision`은 **현재 head**에 연결 (`alembic heads`로 확인)
4. Ubuntu 24 환경에서 마이그레이션 적용·검증.

### 하지 말 것

- 요청 없는 시드 CSV INSERT, API, UI, 리팩터, 포맷-only 변경
- `dumb_and_dumber` / 다른 앱 무관 수정
- ERD에 없는 `embedding vector(...)` 컬럼 추가
- 새 MD 문서 남발 (이 프롬프트 파일 수정은 사용자가 요청할 때만)

---

## 6. 목표 중심 실행 · 검증 (Goal-Driven)

각 단계 끝에 **검증**을 통과해야 다음으로 간다.

| 단계 | 작업 | 검증 |
|------|------|------|
| A | DB 연결·`vector` 확장 | `psql` 또는 Python으로 `SHOW server_version;`, `SELECT extname FROM pg_extension WHERE extname='vector';` |
| B | ORM + revision 작성 | `alembic heads` / `alembic history`에 새 revision, `down_revision` 연결 확인 |
| C | `alembic upgrade head` | exit 0 |
| D | 테이블 존재 | `\dt moneyball_*` 또는 `information_schema.tables`에 4개 |
| E | 제약 | PK=`id`, 업무 키 UNIQUE, FK 존재 (`information_schema.table_constraints`) |
| F | downgrade smoke (선택) | `alembic downgrade -1` 후 다시 `upgrade head` — 가능하면 수행 |

실패 시 추측으로 우회하지 말고 **원인 한 가지**를 좁혀 수정한다.

### 권장 명령 (Ubuntu 24 / 프로젝트 루트 기준)

```bash
# Docker pgvector가 떠 있는지
docker compose ps pgvector

# 백엔드에서
cd backend
alembic heads
alembic revision -m "moneyball_stadium_team_player_schedule"
# → versions/ 파일에 명시적 create_table 작성 (titanic 마이그레이션 스타일)
alembic upgrade head
```

`DATABASE_URL`은 코드에 하드코딩하지 않는다. `.env` + 기존 Keymaker/`resolved_database_url()` 경로만 사용.

---

## 7. 산출물 체크리스트

완료 시 채팅에만 보고 (불필요한 새 MD 금지):

- [ ] 변경 파일 목록
- [ ] revision id / down_revision
- [ ] 생성 테이블 4개 이름
- [ ] 검증 명령과 결과 요약
- [ ] 가정·트레이드오프 한 줄 (ENTITY_RULE vs ERD PK)

---

## 8. Claude Code에 붙여 넣을 한 블록

아래 블록만 복사해 Claude Code에 전달해도 된다.

```text
 monenon.cloud Moneyball: Ubuntu 24 + Docker pgvector PostgreSQL에 Alembic으로 ERD 테이블을 생성하라.

필수 선행 읽기: .cursorrules, vault/backend/ENTITY_RULE.md, vault/backend/BACKEND_RULES.md,
backend/apps/moneyball/_docs/moneyball.casting.md, backend/apps/resources/DB.png, backend/alembic/env.py,
backend/alembic/versions/*, docker-compose.yaml pgvector, DATABASE_URL (.env / resolved_database_url).

ERD 테이블: stadium, team, player, schedule (컬럼·관계는 DB.png 및 moneyball.casting.md §3).

PK 규칙 충돌 해결(고정): 물리 테이블 moneyball_stadium|team|player|schedule.
각 테이블 PK는 id INTEGER 자동증감. ERD 업무 키는 UNIQUE NOT NULL (schedule은 sche_date+stadium_id UNIQUE).
FK는 업무 키 컬럼으로 stadium←team/schedule, team←player.

범위: ORM(Mapped) + alembic env import + revision 1개(upgrade/downgrade) + upgrade head 검증.
비범위: 시드 데이터, API, UI, vector 컬럼 추측 추가, 무관 리팩터.

스타일: 기존 titanic alembic의 명시적 op.create_table 패턴. 비밀 하드코딩 금지.
성공 기준: alembic upgrade head 성공, moneyball_* 4테이블·UNIQUE·FK 확인.
시작 전 가정·대안·검증 계획을 짧게 쓰고, 단계마다 검증하라. 불확실하면 코드 전에 질문하라.
```

---

## 출처 · 하네스

- 행동 원칙·Cursor 실행: 저장소 `.cursorrules` (Karpathy / forrestchang 정리)
- DB 엔티티: `vault/backend/ENTITY_RULE.md`
- ERD 이미지: `backend/apps/resources/DB.png`
