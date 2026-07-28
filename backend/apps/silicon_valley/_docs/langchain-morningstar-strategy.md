---
type: spoke
app: silicon_valley
links:
  - star_craft
---

# LangChain 전략 — Morningstar: 맞춤형 금융 인사이트

LangChain은 고객의 요구에 맞춘 맞춤형 솔루션을 제공할 수 있어, 고객 경험을 크게
개선할 수 있습니다. 금융 서비스 제공업체 Morningstar는 LangChain을 사용해 방대한
재무 보고서와 시장 데이터를 분석하고, 이를 바탕으로 사용자 맞춤형 금융 인사이트를
제공하는 인텔리전스 엔진을 개발했습니다. 이 시스템은 금융 전문가들이 복잡한 질문에
대해 정확한 답변을 얻을 수 있도록 도와주며, LangChain의 실시간 데이터 통합과
맞춤형 프롬프팅 기능을 효과적으로 활용하고 있습니다.

작업 규칙: [langchain-harness.md](langchain-harness.md)  
그래프 기본 개념: [neo4j-harness.md](neo4j-harness.md)  
드라이버·Aura/Sandbox: `lol/neo4j` (`star_craft` 허브와 동일 `get_driver()` 계약)

## 구현 매핑 (이 저장소 목표 구조)

이 전략을 `silicon_valley`의 `morningstar_insight` 유스케이스로 옮길 때의 매핑이다.
(파일·엔드포인트는 헥사고날·기존 `piper_*` 네이밍 관례에 맞춘 **목표 경로**다.)

| 전략 요소 | 구현 |
| --------- | ---- |
| 방대한 재무 보고서 분석 | [neo4j-harness.md](neo4j-harness.md) + `lol/neo4j`·`neo4j-graphrag` 로 적재한 보고서/그래프를, 필요 시 pgvector 쪽 문서 테이블과 함께 조회 |
| 실시간 데이터 통합 | `MorningstarReportRepository`가 **요청 시점마다** 최신 보고서를 DB/그래프에서 조회 (캐시 재사용 금지 — harness §1.3) |
| 맞춤형 프롬프팅 | `MorningstarInsightGeneratorClient`의 LangChain `ChatPromptTemplate`이 최신 보고서 컨텍스트 + 사용자 질문을 결합 |
| 인텔리전스 엔진 | `MorningstarInsightInteractor` — 보고서 조회 → LangChain 체인(`prompt \| llm \| parser`) 호출 → 인사이트 반환 |

### 레이어 구성

기존 Pied Piper 모듈과 동일하게 `app/dto/`(단수), `adapter/inbound/api/v1/`, `dependencies/` 아래에 둔다.

```text
# silicon_valley/
domain/…                                                      # 엔티티(필요 시 문서·인사이트 VO)
app/dto/morningstar_insight_dto.py
app/ports/input/morningstar_insight_use_case.py
app/ports/output/morningstar_report_repository_port.py
app/ports/output/morningstar_insight_generator_port.py
app/use_cases/morningstar_insight_interactor.py
adapter/outbound/repository/morningstar_report_repository.py    # 최신 보고서 조회 (실시간)
adapter/outbound/client/morningstar_insight_generator_client.py # LangChain + ChatOllama (adapter만)
adapter/inbound/api/schemas/morningstar_insight_schema.py
adapter/inbound/api/v1/morningstar_insight_router.py            # POST …/morningstar/insight
dependencies/morningstar_insight_provider.py
```

절대 규칙 ([langchain-harness.md](langchain-harness.md)):

- `ChatOllama` / LCEL 은 **`adapter/outbound/client/*` 에서만** import
- 인터랙터는 `morningstar_insight_generator_port` 만 호출

### 환경 변수

로컬 Ollama는 `lol/ollama/faker_orchestrator.py` 와 같은 `OLLAMA_*` 관례를 따른다.
(`backend/.env` / `.env.example`)

```text
OLLAMA_BASE_URL=http://172.17.0.1:11434   # Docker→호스트; 로컬만이면 http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b-instruct       # 또는 exaone3.5:7.8b 등 — 코드 하드코딩 금지

# 그래프(보고서·엔티티) — Sandbox bolt:// 또는 Aura neo4j+s://
NEO4J_URI=
NEO4J_USER=neo4j
NEO4J_PASSWORD=
```

### 패키지

`backend/requirements.txt`: `langchain`, `langchain-community`, `langsmith`, `langgraph`, `neo4j`, `neo4j-graphrag`.

### 검증

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=.:apps python3 -m lol.scripts.check_neo4j   # 그래프 연결
# Morningstar API 구현 후:
# curl -X POST http://127.0.0.1:8000/.../morningstar/insight -H 'Content-Type: application/json' -d '{"question":"..."}'
```
