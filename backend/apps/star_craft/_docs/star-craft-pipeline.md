---
type: hub
app: star_craft
project: cloud.monenon
---

# star_craft 허브 파이프라인 전략

## 개요

`star_craft`는 **스타 토폴로지의 허브**다.  
모든 스포크 앱(`mail`, `closet`, `music`, `refrigerator` 등)은 이 허브를 경유해 라우팅된다.

허브의 두 핵심 책임을 두 개의 DB가 각각 담당한다.

| 책임 | DB | Docker 서비스 | 역할 |
|------|-----|--------------|------|
| 전역 온톨로지 인덱스 | **Neo4j** | `neo4j` (7474/7687) | 스포크 노드·관계 저장, Cypher 탐색 |
| 컨텍스트 라우팅 | **pgvector** | `pgvector` (5432) | 질문 임베딩 유사도 검색 → 타겟 스포크 식별 |

---

## Docker 서비스 구성

`docker-compose.yaml`에 이미 추가된 서비스:

```yaml
neo4j:
  image: neo4j:5
  ports:
    - "7474:7474"   # Browser UI: http://localhost:7474
    - "7687:7687"   # Bolt 드라이버
  environment:
    NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:-monenon2026}
    NEO4J_PLUGINS: '["apoc"]'
  volumes:
    - neo4j_data:/data

pgvector:
  image: pgvector/pgvector:pg17
  ports:
    - "5432:5432"
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-monenon2026}
    POSTGRES_DB: monenon
  volumes:
    - pgvector_data:/var/lib/postgresql/data
```

`.env` 필수 항목:

```env
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=monenon2026
DATABASE_URL=postgresql+psycopg://postgres:monenon2026@pgvector:5432/monenon
```

---

## 헥사고날 아키텍처 내 위치

```
star_craft/
├── domain/
│   └── __init__.py              # SpokeNode, RouteResult 엔티티
├── app/
│   └── ports/output/
│       └── __init__.py          # GraphRepositoryPort (Neo4j 인터페이스)
│                                # VectorRepositoryPort (pgvector 인터페이스)
│   └── use_cases/
│       └── __init__.py          # ContextRoutingUseCase (3단계 라우팅)
├── adapter/
│   └── outbound/
│       ├── neo4j_graph_repository.py   # Neo4j 어댑터 구현체
│       └── pgvector_vector_repository.py  # pgvector 어댑터 구현체
└── dependencies/
    └── __init__.py              # DI: 포트 ↔ 어댑터 바인딩
```

의존성 방향: `adapter/outbound` → `app/ports/output` → `app/use_cases`

---

## 파이프라인 흐름

```
[POST /hub/route {"query": "오늘 비 오는데 뭐 입을까?"}]
        │
        ▼
[ContextRoutingUseCase.route()]
        │
        ├─ Step 1. VectorRepositoryPort.search_similar_spokes(embedding)
        │          └─ pgvector <=> 코사인 유사도 Top-3 스포크 후보 반환
        │             예: [("closet", 0.94), ("music", 0.71), ("mail", 0.43)]
        │
        ├─ Step 2. GraphRepositoryPort.get_spoke_path(candidates)
        │          └─ Neo4j Cypher → 허브↔스포크 관계 확인, 활성 경로만 반환
        │             예: [SpokeNode("closet", active), SpokeNode("music", active)]
        │
        └─ Step 3. FakerOrchestrator(EXAONE).chat(messages)
                   └─ EXAONE이 최종 스포크 결정
                   반환: {"spoke": "closet", "confidence": 0.95, "reason": "날씨 기반 옷 추천"}
```

### 단계별 설명

**Step 1 — 벡터 유사도 검색 (pgvector)**
- 사용자 질문을 Ollama `nomic-embed-text` 모델로 임베딩 (1024차원)
- `spoke_contexts` 테이블에서 `<=>` 코사인 거리 연산으로 Top-K 후보 반환
- 결과: 유사한 역할을 가진 스포크 이름 + 유사도 점수

**Step 2 — 그래프 경로 확인 (Neo4j)**
- 후보 스포크가 실제 허브와 연결된 활성 노드인지 Cypher로 검증
- 비활성(`status: inactive`) 스포크, 고립 노드 필터링
- 결과: 유효한 스포크 목록만 통과

**Step 3 — EXAONE 최종 결정 (Ollama)**
- Step 1+2 결과를 프롬프트로 구성
- `FakerOrchestrator` → Ollama → EXAONE에게 최적 스포크 선택 요청
- JSON으로 반환: `{spoke, confidence, reason}`

---

## DB 스키마

### Neo4j 온톨로지 스키마

```cypher
// 허브 노드
CREATE (:Hub {name: 'star_craft', status: 'active'})

// 스포크 노드
CREATE (:Spoke {name: 'mail',         description: 'Gmail 수신함 관리, 이메일 필터링·요약',    endpoint: '/mail/webhook',          status: 'active'})
CREATE (:Spoke {name: 'closet',       description: '날씨 기반 옷 추천, 코디 큐레이션',          endpoint: '/platform/closet',       status: 'active'})
CREATE (:Spoke {name: 'music',        description: '상황·무드 기반 음악 플레이리스트 추천',      endpoint: '/platform/music',        status: 'active'})
CREATE (:Spoke {name: 'refrigerator', description: '냉장고 재료 관리, 요리·장보기 추천',         endpoint: '/platform/refrigerator', status: 'active'})
CREATE (:Spoke {name: 'vision',       description: '저그(비전) — 레나 vision UI + Face YOLO',   endpoint: '/star-craft/zerg/vision', status: 'active', race: 'zerg'})

// 관계: Hub → Spoke (허브가 스포크 조율)
MATCH (h:Hub {name: 'star_craft'}), (s:Spoke)
CREATE (h)-[:ORCHESTRATES]->(s)

// 관계: Spoke → Hub (스포크가 허브에 연결)
MATCH (h:Hub {name: 'star_craft'}), (s:Spoke)
CREATE (s)-[:CONNECTS_TO]->(h)
```

### pgvector 테이블 스키마

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE spoke_contexts (
    id          SERIAL PRIMARY KEY,
    spoke       VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    embedding   vector(1024)   -- nomic-embed-text 임베딩 차원
);

-- 코사인 유사도 인덱스
CREATE INDEX ix_spoke_contexts_embedding_cosine
    ON spoke_contexts
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/hub/route` | 쿼리 → 최적 스포크 반환 (3단계 파이프라인) |
| `POST` | `/hub/seed` | 기본 스포크 초기 등록 (최초 1회) |
| `GET` | `/hub/spokes` | Neo4j 등록 스포크 목록 조회 |
| `POST` | `/hub/spokes` | 새 스포크 등록 (Neo4j + pgvector 동시) |
| `GET` | `/hub/races` | 종족 온톨로지(저그=비전·프로토스=LLM·테란=시계열) + 소속 툴 |

종족 메타포·비전 툴 편입: [race-ontology.md](./race-ontology.md)

---

## 초기화 순서

```
1. docker compose up pgvector neo4j -d       → 검증: 두 컨테이너 healthy
2. docker compose up --build backend -d      → 검증: /hub/ping 200 OK
3. POST /hub/seed                            → 검증: Neo4j + pgvector에 스포크 4개 등록
4. POST /hub/route {"query": "테스트 쿼리"}   → 검증: spoke 반환 확인
```

### 검증 명령

```powershell
# 허브 초기화
Invoke-RestMethod -Method POST -Uri "http://localhost:8000/hub/seed"

# 라우팅 테스트
Invoke-RestMethod -Method POST -Uri "http://localhost:8000/hub/route" `
  -ContentType "application/json" `
  -Body '{"query": "오늘 비 오는데 뭐 입을까?"}'

# 스포크 목록 확인
Invoke-RestMethod -Method GET -Uri "http://localhost:8000/hub/spokes"
```

---

## n8n 연동 위치

`star_craft` 허브는 `faker` 오케스트레이터를 통해 n8n과 연결된다.

```
n8n (Gmail/Slack 트리거)
        ↓
POST /faker/dispatch {"query": "..."}
        ↓
faker → star_craft 허브 (/hub/route)
        ↓
최적 스포크 결정 → 스포크 실행
```

---

## 구현 현황

| 컴포넌트 | 상태 |
|----------|------|
| Neo4j 어댑터 (`neo4j_graph_repository.py`) | ✅ 구현 완료 |
| pgvector 어댑터 (`pgvector_vector_repository.py`) | ✅ 구현 완료 |
| ContextRoutingUseCase | ✅ 구현 완료 |
| DI 바인딩 (`dependencies/`) | ✅ 구현 완료 |
| Kerrigan 라우터 (`/hub/route`, `/hub/seed`) | ✅ 구현 완료 |
| Raynor 라우터 (`/hub/spokes`) | ✅ 구현 완료 |
| Qdrant 연동 | 🔲 미구현 (추후 확장) |
