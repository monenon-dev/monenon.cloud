---
type: spoke
app: moneyball
links:
  - star_craft
  - silicon_valley
  - titanic
  - dumb_and_dumber
---

# Moneyball 앱 — Spoke

머니볼(세이버메트릭스) 교육 도메인. `dumb_and_dumber`와 **동일한 헥사고날 스캐폴드**를 사용한다.

---

## 캐릭터 체계

머니볼 캐릭터를 bounded context 식별자로 사용한다.

| 캐릭터 | 역할 |
|--------|------|
| `beane` (Billy Beane) | GM 스카우트 — 세이버메트릭스 기반 선수·전략 의사결정 |
| `brand` (Peter Brand) | 애널리스트 — 데이터 모델·OPS/가치 지표 분석 |

---

## 헥사고날 레이어

```
apps/moneyball/
├── domain/
│   ├── player_value.py         # PlayerValue 엔티티, MetricStatus
│   └── scouting_context.py     # ScoutingContext 값 객체
├── app/
│   ├── dtos/
│   │   ├── beane_gm_scout_dto.py       # ScoutCommand / Response
│   │   └── brand_analyst_dto.py        # AnalyzeQuery / AnalyzeResponse
│   ├── ports/input/
│   │   ├── beane_gm_scout_use_case.py
│   │   └── brand_analyst_use_case.py
│   ├── ports/output/
│   │   ├── beane_gm_scout_port.py
│   │   └── brand_analyst_port.py
│   └── use_cases/
│       ├── beane_gm_scout_interactor.py
│       └── brand_analyst_interactor.py
├── adapter/
│   ├── inbound/
│   │   ├── api/
│   │   │   ├── __init__.py          # moneyball_router 노출
│   │   │   ├── schemas/             # Pydantic 요청·응답 모델
│   │   │   └── v1/                  # FastAPI 라우터
│   │   └── mcp/                     # MCP 툴
│   └── outbound/
│       ├── beane_gm_scout_repository.py    # placeholder
│       └── brand_analyst_repository.py     # placeholder
├── dependencies/
│   └── providers.py
└── tests/
    ├── domain/
    │   └── test_player_value_domain.py
    └── app/use_cases/
        ├── test_beane_gm_scout_interactor.py
        └── test_brand_analyst_interactor.py
```

**의존성 방향:** `adapter` → `app` → `domain`

---

## API 엔드포인트 (예정)

| Method | Path | 캐릭터 | 설명 |
|--------|------|--------|------|
| `POST` | `/api/moneyball/scout` | beane | 스카우트·영입 의사결정 |
| `GET` | `/api/moneyball/analyze` | brand | 지표·가치 분석 |

---

## Spoke 확장 규칙

새 캐릭터/기능이 추가되면:

1. `domain/` 엔티티·값 객체 추가
2. `app/ports` · `use_cases` · `dtos`에 캐릭터 prefix로 파일 추가
3. `adapter/inbound/api/v1/` 라우터 추가 후 `moneyball_router`에 include
4. 필요 시 `star_craft` `DEFAULT_SPOKES` / `POST /hub/spokes`에 스포크 등록
5. 이 문서의 frontmatter `links` 유지·갱신

---

## TDD

```bash
cd backend
python -m pytest apps/moneyball/tests/ -v
```
