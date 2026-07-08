# CLAUDE.md (Titanic 앱)

`backend/apps/titanic/` 도메인 전용 지침이다.  
다른 시블링 앱(`secretary`, `admin`, `lifestyle` …)이 늘어나도 **이 파일과 같은 위치**(`<앱>/_docs/CLAUDE.md`)에 두는 패턴을 따른다.

## 상위 문서 (중복하지 않음)

| 문서 | 내용 |
|------|------|
| [../../../../CLAUDE.md](../../../../CLAUDE.md) | 공통 행동 원칙 |
| [../../../CLAUDE.md](../../../CLAUDE.md) | 백엔드·시블링 앱 구조 |
| [../../../../docs/DevOps/backend/BACKEND_RULES.md](../../../../docs/DevOps/backend/BACKEND_RULES.md) | FastAPI 규칙 |
| [../../../../frontend/CLAUDE.md](../../../../frontend/CLAUDE.md) | Titanic 프론트 경로·`getTitanicApiBaseUrl` |

---

## 패키지 구조 (헥사고날 + 프랙탈)

```
titanic/
├── fractal/                  # 12인물 프랙탈 레지스트리
│   ├── catalog.py            # ALL_CHARACTERS, ALL_ROUTERS
│   ├── crew/{slug}/          # 승무원 6 — 각 NODE (router·provider·prefix)
│   └── passenger/{slug}/     # 승객 6 — 동일 패턴 반복
├── adapter/
│   ├── inbound/api/          # 라우터, Pydantic 스키마
│   │   └── v1/               # crew_*_router, passenger_*_router
│   └── outbound/
│       ├── orm/              # passengers, bookings
│       └── pg/               # *PgRepository
├── app/
│   ├── dependencies/         # FastAPI Depends → repository · use case
│   ├── dto/
│   ├── ports/input|output/   # use case · repository 인터페이스
│   └── use_cases/            # *Interactor
├── domain/
│   ├── entities/             # passenger_jack_trainer_entity 등
│   └── value_objects/        # passenger_jack_trainer_vo 등
├── tests/                    # pytest — 헥사고날 레이어별 (아래 §테스트)
└── _docs/CLAUDE.md           ← 본 문서
```

**프랙탈:** 앱 전체(헥사고날) 안에 `crew`·`passenger` 그룹이 있고, 각 `slug`마다 동일한 `CharacterNode`(router + get_repository + get_use_case)가 반복된다.  
라우터 통합은 `fractal/catalog.py` → `adapter/inbound/api/v1/__init__.py`.

흐름: **Router → UseCase(Interactor) → PgRepository → ORM / Neon**

---

## 테스트 (`tests/`)

`backend/apps/titanic/tests/` 는 **헥사고날 레이어와 동일한 폴더 구조**로 둔다. DB·HTTP 없이 **도메인 → 앱 → 어댑터** 순으로 단위 검증한다.

### 디렉터리

```
tests/
├── conftest.py
├── test_korean_ai.py         # Kiwi 전처리 + Ollama(qwen2.5:3b) — 단독 실행용
├── domain/
│   ├── entities/test_passenger_jack_trainer_entity.py
│   └── value_objects/test_passenger_jack_trainer_vo.py
├── app/
│   └── use_cases/
│       ├── test_passenger_jack_trainer_interactor.py
│       └── test_crew_james_director_interactor.py
└── adapter/
    └── outbound/
        └── mappers/test_passenger_jack_trainer_mapper.py
```

### `conftest.py`

- `backend/apps` 를 `sys.path` 에 넣어 `titanic.*` 임포트를 활성화한다.
- 저장소 루트를 추가해 `tailor.apps.titanic.*` 경로(제임스 스키마 등)를 쓸 수 있게 한다.

### 파일별 검증 범위

| 파일 | 대상 | 내용 |
|------|------|------|
| `domain/value_objects/test_passenger_jack_trainer_vo.py` | `PassengerId`, `PassengerName`, `Gender`, `Age`, `FamilyRelation`, `SurvivalStatus` | 유효성·경계값·`from_raw` 파싱·한국어 오류 메시지 |
| `domain/entities/test_passenger_jack_trainer_entity.py` | `PassengerEntity` | `is_high_risk()`, `has_family()`, `record_survival()`, 동등성·해시, `from_orm()` 필드 매핑 |
| `app/use_cases/test_passenger_jack_trainer_interactor.py` | `JackTrainerInteractor` | `introduce_myself` — 스키마→DTO 변환, repository mock 호출·응답 |
| `app/use_cases/test_crew_james_director_interactor.py` | `JamesDirectorInteractor` | `introduce_myself`, `upload_titanic_file` — 승객·예약 커맨드 생성, `None`→`""`, 저장 건수 반환 |
| `adapter/outbound/mappers/test_passenger_jack_trainer_mapper.py` | `JackTrainerMapper` | ORM→엔티티 `to_entity` 필드 매핑; `to_orm` 은 **Red** (PK·`id` 불일치로 `TypeError` 기대) |
| `test_korean_ai.py` | Kiwi + Ollama | `preprocess_korean` 단위 테스트; `run_korean_ai` 는 `@pytest.mark.ollama` (미설치 시 skip) |

유스케이스 테스트는 **`AsyncMock` / `MagicMock` 으로 repository 를 대체**한다.  
`test_korean_ai.py` 만 별도 실행할 때는 [`pytest-korean-ai.ini`](../../../../pytest-korean-ai.ini) 를 쓴다.

### 실행

설정은 [`backend/pytest.ini`](../../../../pytest.ini) — `testpaths = apps/titanic/tests`, `asyncio_mode = auto`.  
의존성은 [`backend/requirements-test.txt`](../../../../requirements-test.txt).

작업 디렉터리 **`backend/`**:

```bash
pip install -r requirements-test.txt
python -m pytest -v
```

비동기(use case)만:

```bash
python -m pytest apps/titanic/tests/app -v
```

Kiwi·Ollama만 (기존 `backend/test.py` → `test_korean_ai.py`):

```bash
python -m pytest -c pytest-korean-ai.ini -v
```

수동 스크립트 실행: `python apps/titanic/tests/test_korean_ai.py`

IDE 타입 체크는 [`backend/pyrightconfig.json`](../../../../pyrightconfig.json) (`extraPaths: ["apps"]`)를 따른다.

### 테스트 추가 시 규칙

1. **레이어에 맞는 폴더**에 `test_<모듈명>.py` 를 둔다 (`domain` / `app/use_cases` / `adapter/...`).
2. 외부 I/O(DB, HTTP, Gemini)는 mock; 도메인·VO 는 순수 단위 테스트로 유지한다.
3. 버그·미구현을 문서화할 때는 **Red 테스트 + 주석**으로 의도를 남긴다 (`JackTrainerMapper.to_orm` 참고).
4. 새 캐릭터·유스케이스를 추가하면 대응 interactor·entity·mapper 테스트를 같은 패턴으로 확장한다.

---

## HTTP API 규약

- Titanic 라우터 통합: `adapter/inbound/api/v1/__init__.py` → `titanic_router` (`prefix="/api"`)
- `backend/main.py`: `app.include_router(titanic_router)` — **`/api` 중복 prefix 금지**

### 12인물 자기소개 (개별만)

일괄 `GET /api/titanic/james`(12명 한 번에)는 **사용하지 않는다**.  
캐릭터마다 **`GET /api/titanic/{slug}/myself`** 를 따로 호출한다.

| slug | URL |
|------|-----|
| `james` | `/api/titanic/james/myself` |
| `walter` | `/api/titanic/walter/myself` |
| `ruth` | `/api/titanic/ruth/myself` |
| `rose` | `/api/titanic/rose/myself` |
| `jack` | `/api/titanic/jack/myself` |
| `cal` | `/api/titanic/cal/myself` |
| `smith` | `/api/titanic/smith/myself` |
| `isidor` | `/api/titanic/isidor/myself` |
| `hartley` | `/api/titanic/hartley/myself` |
| `andrews` | `/api/titanic/andrews/myself` |
| `lowe` | `/api/titanic/lowe/myself` |
| `molly` | `/api/titanic/molly/myself` |

### 기타 주요 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/titanic/james/upload` | Titanic CSV → Neon `passengers`·`bookings` |
| GET | `/api/titanic/walter/passengers` | 승객 목록 (페이지네이션) |
| POST | `/api/titanic/smith/chat` | 스미스 선장 채팅 (`ChatSchema.message`) |

---

## DB · ORM

| 테이블 | ORM | 용도 |
|--------|-----|------|
| `passengers` | `passenger_jack_trainer_orm` | 승객 인적 사항 |
| `bookings` | `passenger_rose_model_orm` | 티켓·요금·객실 등 |

CSV 업로드: `crew_james_director_pg_repository`  
승객 조회: `crew_walter_roaster_pg_repository`  
스미스 채팅·통계: `crew_smith_captain_pg_repository`

---

## Titanic 작업 체크리스트

1. [BACKEND_RULES.md](../../../../docs/DevOps/backend/BACKEND_RULES.md) + 기존 `crew_*` / `passenger_*` 파일 패턴 읽기
2. 라우터는 얇게, 로직은 `use_cases` · `pg`
3. API 경로는 **`/api/titanic/...`** 기준으로 Swagger·프론트와 맞출 것
4. Docker 반영: `docker compose up --build -d backend`
5. 단위 테스트: `cd backend && pip install -r requirements-test.txt && python -m pytest -v`
6. API 검증 예: `curl http://localhost:8000/api/titanic/jack/myself`

### Cursor 멘션 (권장)

```text
@CLAUDE.md @backend/CLAUDE.md @backend/apps/titanic/_docs/CLAUDE.md @docs/DevOps/backend/BACKEND_RULES.md
```
