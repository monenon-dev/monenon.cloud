---
type: hub
app: star_craft
links: []
---

# star_craft 허브 파이프라인 전략

> Monenon (`choseohee.com`) — 냉장고·날씨·취향을 잇는 라이프 어시스턴트 위의 **교육·오케스트레이션 허브**.  
> 구현 위치: `backend/apps/star_craft/` · API prefix: `/star-craft` (허브: `/star-craft/hub/...`)

## 개요

`star_craft`는 스타 토폴로지의 **허브**다.  
시블링 앱(`lifestyle`, `titanic`, `moneyball`, `silicon_valley`, `sherlock_homes`, `secretary` 등)과 허브 내부 종족 툴(저그·프로토스·테란)은 **이 허브를 경유**해 라우팅·오케스트레이션된다.

허브의 두 핵심 책임을 두 개의 DB가 각각 담당한다.

| 책임 | DB | 역할 |
|------|-----|------|
| 전역 온톨로지 인덱스 | **Neo4j** (Graph DB) | Hub/Spoke 노드·관계 저장, Cypher 탐색 |
| 컨텍스트 라우팅 | **pgvector** (PostgreSQL + pgvector) | 질문 임베딩 유사도 검색 → 타겟 스포크 식별 |

동일 Postgres 인스턴스(`pgvector` 서비스, DB명 `monenon`)는 Monenon 전체 ORM·관계형 데이터와 공유한다.  
`spoke_contexts`만 벡터 라우팅용이다. (Docker에 `qdrant`도 있으나, **star_craft 라우팅 코드는 pgvector**를 쓴다.)

---

## DB 선택 근거

### Graph DB — Neo4j

- 스포크 앱을 **노드**, 허브↔스포크를 **엣지**로 표현 (`:Hub`, `:Spoke`, `:ORCHESTRATES`, `:CONNECTS_TO`)
- Cypher로 활성 스포크·후보 경로만 필터링
- 어댑터: `adapter/outbound/neo4j_graph_repository.py` → `lol.neo4j.get_driver()`

### Vector DB — pgvector (PostgreSQL + pgvector)

- 별도 벡터 전용 DB 없이 **기존 Postgres에서 벡터 검색** — 인프라 단순화
- 이미지: `pgvector/pgvector:pg17` (루트 `docker-compose.yaml`에 **이미 존재**)
- SQLAlchemy async + `pgvector` 패키지, 코사인 거리로 Top-K 스포크 후보
- 어댑터: `adapter/outbound/pgvector_vector_repository.py` · 테이블 `spoke_contexts`

---

## Docker · 환경 변수 (Monenon 현황)

`docker-rules.md` 기준: **neo4j / pgvector는 이미 compose에 있다.** 새로 만들지 말고 기존 서비스를 사용한다.

### 관련 서비스 (발췌)

```yaml
# docker-compose.yaml — 이미 등록됨
pgvector:
  image: pgvector/pgvector:pg17
  ports: ["5432:5432"]
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-monenon2026}
    POSTGRES_DB: monenon

neo4j:
  image: neo4j:5
  ports: ["7474:7474", "7687:7687"]
  environment:
    NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:-monenon2026}
```

backend 컨테이너 환경 (compose `environment`):

```text
DATABASE_URL=postgresql+psycopg://postgres:…@pgvector:5432/monenon
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=…   # 기본 monenon2026
```

로컬(`backend/.env`) 예시:

```env
# Postgres (pgvector 확장 포함) — Neon 또는 로컬 compose
DATABASE_URL=postgresql+psycopg://postgres:monenon2026@localhost:5432/monenon

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=monenon2026

# 허브 LLM / 임베딩 (Ollama 등)
OLLAMA_BASE_URL=http://172.17.0.1:11434
STAR_CRAFT_HUB_MODEL=qwen2.5:1.5b-instruct
GATEWAY_HUB_MODEL=qwen2.5:1.5b-instruct
```

검증:

```bash
# pgvector
docker compose exec pgvector pg_isready -U postgres

# Neo4j Browser
# http://localhost:7474  (neo4j / monenon2026)

# API
curl -s http://127.0.0.1:8000/star-craft/hub/spokes
```

---

## 헥사고날 아키텍처 내 위치

```
backend/apps/star_craft/
├── domain/
│   ├── __init__.py              # SpokeNode, RouteResult
│   └── race_ontology.py         # 저그/프로토스/테란 메타포·툴 카탈로그
├── app/
│   ├── ports/output/
│   │   └── __init__.py          # GraphRepositoryPort, VectorRepositoryPort
│   └── use_cases/
│       └── __init__.py          # ContextRoutingUseCase (Kerrigan)
├── adapter/
│   ├── inbound/api/v1/
│   │   └── __init__.py          # hub_router — /hub/route, /seed, /spokes, /races
│   └── outbound/
│       ├── neo4j_graph_repository.py
│       └── pgvector_vector_repository.py
├── dependencies/
│   └── __init__.py              # get_routing_use_case DI
└── zerg/                        # 저그 스포크 툴 (face YOLO, web crawl/scrape …)
```

의존성 방향: `adapter/outbound` → `app/ports/output` → `app/use_cases`  
DI: `Neo4jGraphRepository` + `PgvectorVectorRepository(session)` → `ContextRoutingUseCase`

---

## 종족 온톨로지 (허브 내부 메타포)

| 종족 | 능력 | 한줄 | 예시 툴 |
|------|------|------|---------|
| **저그** (`zerg`) | vision | 눈 (본다) | Face YOLO, Zerling crawl, Hydralisk scrape, 레나 vision UI |
| **프로토스** (`protoss`) | llm_report | 입/지성 | (추후 LLM 보고서) |
| **테란** (`terran`) | timeseries | 시계/공장 | Vessel Gemini (`GATEWAY` gemini 인텐트) |

API: `GET /star-craft/hub/races` → `races_as_dict()`

시블링 **제품/교육 앱**은 Neo4j `:Spoke`로 등록되며, `race` 필드로 종족을 묶을 수 있다.

---

## 파이프라인 흐름

```
[POST /star-craft/hub/route { query }]
        │
        ▼
[ContextRoutingUseCase.route]
        │
        ├─ (1) VectorRepositoryPort.search_similar_spokes(query_embedding)
        │         └─ pgvector cosine_distance → Top-K 스포크 후보
        │
        ├─ (2) GraphRepositoryPort.get_spoke_path(candidates)
        │         └─ Neo4j: Hub-[:ORCHESTRATES]->Spoke (status=active) 필터
        │
        └─ (3) RouteResult (spoke, confidence, reason, candidates)
                  └─ 필요 시 해당 스포크 엔드포인트·유스케이스 디스패치
                     (Gateway intent / 시블링 API 연동)
```

### 단계별 설명

**Step 1 — 벡터 유사도 검색**

- 사용자 `query`를 임베딩 (Ollama / Gemini 등 — 모델은 `STAR_CRAFT_HUB_MODEL`·Keymaker)
- `spoke_contexts.embedding` 에 대해 코사인 거리 정렬, Top-K 반환  
  (`PgvectorVectorRepository.search_similar_spokes`)

**Step 2 — 그래프 경로 확인**

- 후보 이름에 대해 Neo4j에서 Hub가 `ORCHESTRATES` 하는 **active** Spoke만 통과
- spoke↔spoke 직접 연결은 온톨로지상 쓰지 않음 (항상 hub 경유)

**Step 3 — 결과·디스패치**

- `RouteResult`로 프론트·Gateway에 타겟 스포크 전달
- 허브 API: `POST /star-craft/hub/route`, 시드 `POST /star-craft/hub/seed`, 등록 `POST /star-craft/hub/spokes`

---

## 의존성

`backend/requirements.txt` (이미 포함):

```text
neo4j==5.28.1
pgvector==0.3.6
```

---

## Neo4j 온톨로지 스키마

코드(`Neo4jGraphRepository`)와 동일한 패턴:

```cypher
// 허브
MERGE (h:Hub {name: 'star_craft'}) SET h.status = 'active'

// 스포크 예시 (시블링 / 종족 툴)
MERGE (s:Spoke {name: 'lifestyle'})
SET s.description = '옷장·냉장고·음악·채팅',
    s.endpoint    = '/lifestyle',
    s.status      = 'active',
    s.race        = null

MERGE (z:Spoke {name: 'zerg_vision'})
SET z.description = '저그 비전 — YOLO·크롤·스크랩',
    z.endpoint    = '/star-craft/zerg',
    z.status      = 'active',
    z.race        = 'zerg'

// 관계: hub → spoke, spoke → hub
MATCH (h:Hub {name: 'star_craft'}), (s:Spoke {name: 'lifestyle'})
MERGE (h)-[:ORCHESTRATES]->(s)
MERGE (s)-[:CONNECTS_TO]->(h)
```

`register_spoke` / `seed` API가 위 MERGE를 수행한다.

---

## pgvector 테이블 스키마

ORM: `SpokeContext` (`pgvector_vector_repository.py`)  
앱 기동 시 `Base.metadata.create_all` + `CREATE EXTENSION IF NOT EXISTS vector` (`main.py` lifespan).

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS spoke_contexts (
    id          SERIAL PRIMARY KEY,
    spoke       VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    embedding   vector(1024)   -- 임베딩 차원 (현재 어댑터와 동일)
);

CREATE INDEX IF NOT EXISTS ix_spoke_contexts_embedding_cosine
    ON spoke_contexts
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
```

> 참고: 템플릿의 `keywords TEXT[]`는 도메인 `SpokeNode.keywords`로 쓰이며,  
> 현재 벡터 테이블 컬럼에는 없고 Neo4j/등록 API 쪽에 가깝다. 스키마 확장 시 `ENTITY_RULE.md`를 따른다.

---

## API 요약 (허브)

| Method | Path | 역할 |
|--------|------|------|
| `POST` | `/star-craft/hub/route` | Kerrigan — 질의 → 스포크 라우팅 |
| `POST` | `/star-craft/hub/seed` | Hub + 기본 Spoke 시드 |
| `GET` | `/star-craft/hub/spokes` | Raynor — 활성 스포크 목록 |
| `POST` | `/star-craft/hub/spokes` | 스포크 등록 |
| `GET` | `/star-craft/hub/races` | 종족 온톨로지 카탈로그 |

---

## 구현 순서 (Monenon 체크리스트)

템플릿 단계를 **이미 있는 것 / 남은 것**으로 정리한다.

```
1. docker-compose neo4j, pgvector          ✅ 존재 (DB명 monenon)
2. .env / compose NEO4J_* · DATABASE_URL   ✅ compose environment 반영
3. requirements neo4j, pgvector            ✅ requirements.txt
4. 출력 포트 Graph/Vector                  ✅ app/ports/output/__init__.py
5. 어댑터 Neo4j · Pgvector                 ✅ adapter/outbound/
6. DI get_routing_use_case                 ✅ dependencies/
7. ContextRoutingUseCase + hub API         ✅ use_cases + /star-craft/hub/*
8. 임베딩 모델·시드 데이터 운영 검증       ⬜ 시그마/로컬에서 seed + route E2E
9. Gateway ↔ hub 디스패치 연동 강화        ⬜ intent별 spoke 호출 정리
```

검증 예:

```bash
# 시드
curl -s -X POST http://127.0.0.1:8000/star-craft/hub/seed

# 라우팅
curl -s -X POST http://127.0.0.1:8000/star-craft/hub/route \
  -H 'Content-Type: application/json' \
  -d '{"query":"냉장고에 뭐 남았어?"}'
```

---

## 관련 규칙

| 문서 | 용도 |
|------|------|
| `backend/_docs/BACKEND_RULES.md` | FastAPI·Keymaker·비동기 세션 |
| `backend/_docs/docker-rules.md` | DB/컨테이너 **생성 전** 존재 체크·승인 |
| `backend/_docs/ENTITY_RULE.md` | 테이블·ORM 변경 시 |
| `.cursorrules` (루트) | Monenon 제품·시블링 앱 경계 |

교육·실습 코드는 `star_craft` / `/lesson` / `/star-craft` 경계 안에 두고, `lifestyle` 코어를 오염시키지 않는다.
