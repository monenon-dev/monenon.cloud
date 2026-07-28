---
type: harness
app: silicon_valley
title: LANGCHAIN-HARNESS
links:
  - star_craft
  - ../../../_docs/BACKEND_RULES.md
  - langchain-morningstar-strategy.md
  - langchain-ncl-strategy.md
  - langchain-elastic-strategy.md
  - neo4j-harness.md
---

# LANGCHAIN-HARNESS

> Claude / Cursor 작업 지시서 — `silicon_valley` 에서 LangChain 관련 구현·수정 시 **반드시** 따른다.  
> 막연한 소개가 아니다. **작업 전 → 작업 중 → 완료 보고 전**에 실제로 확인할 항목이다.  
> 위반 가능성이 보이면 **코드를 더 쓰지 말고** 사용자에게 보고한다.

---

## 0. 컨텍스트 (Monenon)

| 항목 | 현황 |
|------|------|
| 앱 | `backend/apps/silicon_valley/` (spoke) · 허브 링크 `star_craft` |
| 전략 문서 | Morningstar / NCL / Elastic — 아래 §5 |
| 패키지 | `langchain`, `langchain-community`, `langsmith`, `langgraph`, `neo4j`, `neo4j-graphrag` (`backend/requirements.txt`) |
| LLM 기본 경로 | 로컬 **Ollama**. `OLLAMA_BASE_URL` / `OLLAMA_MODEL` — `lol/ollama/faker_orchestrator.py` 와 동일 관례 |
| Provider 패키지 | `langchain-google-genai` 등 **없음**. 기본은 adapter의 `ChatOllama` |
| 아키텍처 | 헥사고날: Router → Interactor → Port → Repository/Client |

### 허용되는 LangChain 위치

| 계층 | LangChain import | 비고 |
|------|------------------|------|
| `adapter/outbound/client/*` | ✅ | `ChatOllama`, `ChatPromptTemplate`, LCEL 등 |
| `app/use_cases/*`, `domain/*`, `adapter/inbound/*` | ❌ | 포트 인터페이스만 |
| `dependencies/*` | △ | 포트 구현체 조립만. 체인 본문 금지 |

---

## 1. 절대 규칙 (위반 시 작업 중단 후 보고)

1. **LLM 프로바이더는 포트 뒤에 숨긴다.**  
   인터랙터·도메인이 `ChatOllama`, `ChatGoogleGenerativeAI`, `llm.invoke` 등을 **직접 참조하지 않는다.**
2. **프롬프트는 `ChatPromptTemplate` / `PromptTemplate` 로 모듈 상단 상수.**  
   함수 본문에 f-string 프롬프트를 흩뿌리지 않는다.
3. **외부 데이터(DB·API·파일·그래프)는 매 요청마다 output port 로 조회한다.**  
   요청 전 캐시·모듈 전역에 박아 둔 컨텍스트를 재사용하지 않는다.
4. **모델명·base_url 은 환경 변수.**  
   코드에 모델 ID를 하드코딩하지 않는다. (`OLLAMA_MODEL`, `OLLAMA_BASE_URL`)
5. **기존 Pied Piper(`piper_*`) 슬라이스를 LangChain으로 “교체”하지 않는다.**  
   Morningstar / NCL / Elastic 등 **전략 문서에 적힌 신규 슬라이스**로만 추가한다. 범위 밖 리팩터 금지.
6. **Agents · Tools · Memory · LangGraph 멀티에이전트는 기본 금지.**  
   `prompt | llm | StrOutputParser()` LCEL 로 충분한지 먼저 확인한다. 필요하면 **구현 전** 사용자에게 확인.
7. **새 Docker 서비스·DB 스택을 마음대로 추가하지 않는다.**  
   [`docker-rules.md`](../../../_docs/docker-rules.md) · 기존 `neo4j` / `pgvector` / `redis` 재사용. Elasticsearch 등 신규 의존성은 승인 후.
8. **비밀·키를 커밋하지 않는다.** `.env` 실값은 gitignore. 예시는 `.env.example` 만.

---

## 2. 작업 전 (Think)

구현을 시작하기 전에 답한다. 불명확하면 **질문하고 멈춘다.**

1. 어떤 전략 문서를 구현하는가? (Morningstar / NCL / Elastic / 기타)
2. 단일 LLM 호출로 충분한가? → 충분하면 LangChain 체인이 아니라 `httpx` / `faker_orchestrator` 패턴을 검토한다.
3. 실시간 컨텍스트 소스는 무엇인가? (보고서 / 고객 프로필 / 보안 알럿 …) 조회 포트 이름은?
4. 응답 API 경로·스키마는 전략 문서의 목표 경로와 일치하는가?
5. `neo4j-graphrag` 가 정말 필요한가? 벡터·그래프 검색이 없으면 넣지 않는다.

---

## 3. 작업 중 (Do)

### 3.1 표준 슬라이스 순서

전략 문서의 레이어 구성을 따르되, 네이밍은 기존 `silicon_valley` 관례를 지킨다.

```text
domain/…                          # 필요 시 엔티티
app/dto/…_dto.py                  # 단수 dto
app/ports/input/…_use_case.py
app/ports/output/…_repository_port.py
app/ports/output/…_generator_port.py
app/use_cases/…_interactor.py     # 조회 → generator 포트만 호출
adapter/outbound/repository/…
adapter/outbound/client/…         # 여기만 LangChain
adapter/inbound/api/schemas/…
adapter/inbound/api/v1/…_router.py
dependencies/…_provider.py
```

### 3.2 체인 기본형 (outbound client)

```text
ChatPromptTemplate (모듈 상수)
        │
        ▼
ChatOllama(base_url=OLLAMA_BASE_URL, model=OLLAMA_MODEL)
        │
        ▼
StrOutputParser
```

- 인터랙터: `repository_port` 조회 → `generator_port.generate(...)` → DTO 반환.
- 라우터: 스키마 검증·HTTP 만. 비즈니스·프롬프트 없음.

### 3.3 하지 말 것

- `langchain` 을 `app/` · `domain/` 에 import
- 전략에 없는 “범용 에이전트 프레임워크” 신설
- `star_craft` / `lol/neo4j` 계약(`get_driver`)을 우회한 별도 드라이버
- 요청 범위 밖 파일 포맷·리네임·데드코드 삭제

---

## 4. 완료 전 체크리스트

보고하기 전에 전부 확인한다.

- [ ] **성능:** 다단계 체인(검색→프롬프트→생성)이 실제로 필요한가? 단일이면 체인 축소 또는 `httpx`/`faker_orchestrator`.
- [ ] **러닝 커브:** LCEL `prompt | llm | StrOutputParser()` 로 표현 가능한가? Agents/Tools/Memory/LangGraph 를 넣었다면 사용자 승인 근거가 있는가?
- [ ] **적합성:** LangChain 없이 더 단순하지 않은가?
- [ ] **포트 경계:** LangChain 심볼이 outbound client 밖에 없는가? (`rg "ChatOllama|ChatPromptTemplate|langchain" apps/silicon_valley`)
- [ ] **실시간 조회:** 컨텍스트가 매 요청 repository/port 경유인가?
- [ ] **환경 변수:** 모델·URL 하드코딩 없는가?
- [ ] **헥사고날 경로:** `app/dto/` 단수, provider 조립, 라우터 얇음 — 기존 `piper_*` 와 같은가?
- [ ] **문서:** 전략 MD 와 구현 경로가 어긋나면 문서 또는 코드를 맞췄는가? (임의로 다른 구조 금지)

---

## 5. 전략 문서 (구현 대상)

| 문서 | 컨텍스트 | 목표 엔드포인트(초안) |
|------|----------|------------------------|
| [langchain-morningstar-strategy.md](langchain-morningstar-strategy.md) | 재무 보고서·인사이트 | `…/morningstar/insight` |
| [langchain-ncl-strategy.md](langchain-ncl-strategy.md) | 고객 선호도·여행 계획 | `…/ncl/plan` |
| [langchain-elastic-strategy.md](langchain-elastic-strategy.md) | 보안 알럿·요약·쿼리 | `…/elastic/assist` |

그래프 개념: [neo4j-harness.md](neo4j-harness.md)  
드라이버·Aura/Sandbox: `backend/apps/lol/neo4j/README.md`

---

## 6. 환경 · 검증

```text
OLLAMA_BASE_URL=http://172.17.0.1:11434   # 또는 localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b-instruct
NEO4J_URI=…   # bolt:// 또는 neo4j+s:// — 그래프 연동 시
```

```bash
# 그래프 연결 (해당 시)
cd backend && source .venv/bin/activate
PYTHONPATH=.:apps python3 -m lol.scripts.check_neo4j

# LangChain import 경계 (구현 후)
rg "from langchain|import langchain|ChatOllama|ChatPromptTemplate" apps/silicon_valley
# → adapter/outbound/client 및 테스트 외 히트면 수정
```

---

## 7. Claude 응답 형식 (이 하네스로 작업할 때)

1. **가정·범위** 한 줄 (어떤 전략 MD 인지)
2. **절대 규칙 위반 여부** 자가 점검
3. 구현 또는 “질문/중단” (불명확하면 코드보다 질문)
4. 완료 시 §4 체크리스트 결과

이 하네스가 먹히면: LangChain이 헥사고날을 뚫지 않고, 불필요한 에이전트 추상화가 줄며, Morningstar/NCL/Elastic 슬라이스가 같은 패턴으로 쌓인다.
