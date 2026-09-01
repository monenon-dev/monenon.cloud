---
type: spoke
app: silicon_valley
links:
  - star_craft
---

# LangChain 전략 — NCL: 최적화된 여행 계획 제공

> Claude / Cursor 가 **이 문서를 구현 명세**로 삼아 `silicon_valley` 에 NCL 여행 계획 슬라이스를
> 추가한다. 작업 규칙은 [langchain-harness.md](langchain-harness.md) 를 **먼저** 따른다.

---

## 0. 비즈니스 목표

LangChain은 사용자 맞춤형 프롬프팅 및 파인튜닝 기능을 통해 특정 산업의 요구에 맞춘 솔루션을
제공합니다. NCL(노르웨이 크루즈 라인)은 LangChain을 이용해 고객들이 이상적인 크루즈 여행을
계획할 수 있도록 돕는 AI 어시스턴트를 개발했습니다. 이 시스템은 고객의 선호도와 탐색 기록을
기반으로 맞춤형 추천을 제공하며, LangChain을 통해 실시간으로 변화하는 고객 요구에 대응할 수
있습니다.

**이 저장소에서의 성공 기준:** 고객 ID(또는 세션)와 자연어 질문을 받아, **요청 시점의** 선호도·탐색
이력을 조회한 뒤, LangChain LCEL 체인으로 **맞춤형 크루즈 여행 추천 문장**을 반환한다.

---

## 1. 패턴 재사용

[langchain-morningstar-strategy.md](langchain-morningstar-strategy.md) 와 동일:

`실시간 조회 → ChatPromptTemplate → ChatOllama → StrOutputParser`

다른 점: 컨텍스트가 "재무 보고서"가 아니라 **"고객 선호도·탐색 기록"** 이다.

| 전략 요소 | 구현 방향 | 하네스 |
| --------- | --------- | ------ |
| 맞춤형 추천 | `CustomerProfile`(선호 목적지, 선실 등급, 예산, 탐색·예약 이력)을 프롬프트 컨텍스트로 | §1.2 프롬프트 상수 |
| 실시간 요구 대응 | `NclCustomerProfileRepository` 가 **매 요청** DB 조회 (캐시 금지) | §1.3 |
| 맞춤형 프롬프팅 | outbound `ChatPromptTemplate` 에 프로필 + 이력 + 이번 질문 | §1.2 |
| 파인튜닝 대체 | `OLLAMA_MODEL` / `OLLAMA_BASE_URL` 만 교체 | §1.4 |
| LLM 추상화 | 인터랙터 → `NclTripPlannerGeneratorPort` 만 | §1.1 |

Agents / Tools / Memory / LangGraph 는 **사용하지 않는다** (harness §1.6).

---

## 2. 도메인

`CustomerProfile` (제안 필드 — 구현 시 필요 최소만):

| 필드 | 설명 |
|------|------|
| `customer_id` | 조회 키 |
| `preferred_destinations` | 선호 항로·기항지 |
| `cabin_class` | 선실 등급 |
| `budget_range` | 예산 구간 |
| `recent_browsing` | 최근 탐색 기록 (항로·일자·선박 등) |
| `past_bookings` | 과거 예약 요약 (없으면 빈 목록) |

저장소: 우선 **자체 테이블 또는 인메모리 stub** 로 포트를 만족시킨다. NCL 외부 API 연동은
포트 뒤에서 나중에 교체. 새 Docker DB 스택을 만들지 말고 기존 `pgvector` 를 재사용한다
([docker-rules](../../../_docs/docker-rules.md)).

---

## 3. 레이어 구성 (구현 대상 경로)

기존 `piper_*` 관례: `app/dto/`(단수), `dependencies/`.

```text
# backend/apps/silicon_valley/
domain/customer_profile.py
app/dto/ncl_trip_planner_dto.py
app/ports/input/ncl_trip_planner_use_case.py
app/ports/output/ncl_customer_profile_repository_port.py
app/ports/output/ncl_trip_planner_generator_port.py
app/use_cases/ncl_trip_planner_interactor.py
adapter/outbound/repository/ncl_customer_profile_repository.py
adapter/outbound/client/ncl_trip_planner_generator_client.py   # LangChain only here
adapter/inbound/api/schemas/ncl_trip_planner_schema.py
adapter/inbound/api/v1/ncl_trip_planner_router.py
dependencies/ncl_trip_planner_provider.py
```

라우터를 `silicon_valley` 기존 API 조립 지점(있는 경우 `v1` 라우터 include)에 등록한다.
없으면 provider·라우터 등록 위치를 **구현 전** 코드에서 찾아 보고한다.

### API 계약 (초안)

```http
POST /api/v1/silicon-valley/semantic/chat
Content-Type: application/json

{
  "customer_id": "c-001",
  "message": "7월 알래스카 크루즈, 발코니 선실, 가족 4명으로 추천해줘"
}
```

시맨틱 라우터가 의도를 `ncl_trip` 등으로 분류한 뒤, NCL이면 프로필 repository 조회 → generator 포트로 이어진다.
(`adapter/inbound/api/v1/semantic_router.py`)

응답 예:

```json
{
  "customer_id": "c-001",
  "recommendation": "…맞춤형 여행 계획 텍스트…"
}
```

실제 prefix 가 앱 전체와 다르면 **기존 silicon_valley 라우터 prefix 에 맞춘다.**

---

## 4. 체인 흐름 (outbound client)

```text
NclCustomerProfileRepository.get_by_customer_id(customer_id)   # 매 요청
        │
        ▼
ChatPromptTemplate (
  system: NCL 크루즈 여행 큐레이터 페르소나
          + preferred_destinations / cabin_class / budget / browsing / bookings
  human: {question}
)   ← 모듈 상단 상수. f-string 본문 금지
        │
        ▼
ChatOllama(base_url=OLLAMA_BASE_URL, model=OLLAMA_MODEL)
        │
        ▼
StrOutputParser → recommendation 문자열
```

인터랙터:

1. `profile = await profile_repo.get(...)` (없으면 404/빈 프로필 정책을 스키마에 명시)
2. `text = await generator.plan(profile=..., question=...)`
3. DTO 반환

구현 위치:

- client: `adapter/outbound/client/ncl_trip_planner_generator_client.py`
- DI: `dependencies/semantic_chat_provider.py` → `get_ncl_trip_planner_generator()`
- 입구: `POST /api/v1/silicon-valley/semantic/chat`

---

## 5. 환경 변수

`lol/ollama/faker_orchestrator.py` 와 동일:

```text
OLLAMA_BASE_URL=http://172.17.0.1:11434
OLLAMA_MODEL=qwen2.5:1.5b-instruct
```

코드에 모델명 하드코딩 금지.

---

## 6. 구현 순서 (Claude 체크리스트)

1. [ ] harness §2 작업 전 질문에 답함 (이 문서 = NCL)
2. [ ] domain + ports + dto + schemas
3. [ ] repository (stub 허용) — **매 요청 조회**
4. [ ] generator client — LCEL only, 프롬프트 상수
5. [ ] interactor + provider + router 등록
6. [ ] `rg` 로 LangChain import 가 `adapter/outbound/client` 밖인지 확인
7. [ ] harness §4 완료 체크리스트 통과 후 보고

---

## 7. 검증

```bash
cd backend && source .venv/bin/activate
# Ollama 기동·모델 pull 후
curl -s -X POST "http://127.0.0.1:8000/api/v1/silicon-valley/ncl/plan" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"c-001","question":"지중해 7박, 예산 중간, 커플 여행 추천"}'
```

프로필 stub 이 비어 있어도 **체인 호출까지 도달**하고, 추천 문자열이 비어 있지 않으면 1차 통과.

---

## 8. 범위 밖

- 실제 NCL 예약·결제 API
- 파인튜닝·LoRA
- Elasticsearch / 신규 compose 서비스
- Pied Piper `piper_*` 기존 엔드포인트 변경

이 전략이 먹히면: Morningstar 와 같은 슬라이스 모양으로, **선호도 기반 실시간 여행 추천**만
추가되고 헥사고날·하네스를 깨지 않는다.
