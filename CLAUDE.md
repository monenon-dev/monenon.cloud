# CLAUDE.md (Monenon · 저장소 루트)

> **Monenon**은 사용자의 **냉장고 데이터**, **날씨 환경**, **취향 정보**를 통합 분석하여 일상의 결정을 **능동적으로 큐레이션**하는 개인 맞춤형 AI 라이프 어시스턴트 플랫폼입니다.

이 문서는 LLM·개발자가 **프로젝트 방향성**과 **공통 행동 원칙**을 함께 이해하도록 작성되었습니다.  
스택·도메인별 실행 규칙은 하위 문서로 분리합니다.

| 문서 | 범위 |
|------|------|
| [backend/CLAUDE.md](./backend/CLAUDE.md) | FastAPI, `backend/apps` 시블링 앱 |
| [frontend/CLAUDE.md](./frontend/CLAUDE.md) | Next.js, UI·API 호출 |
| [backend/apps/titanic/_docs/CLAUDE.md](./backend/apps/titanic/_docs/CLAUDE.md) | Titanic 교육 도메인 (헥사고날) |

Cursor 실행 하네스(멘션, 검증 고리, 산출물 제한)는 [.cursorrules](./.cursorrules) · [CURSOR.md](./CURSOR.md)를 따릅니다.  
코딩 규칙 본문은 [backend/_docs/BACKEND_RULES.md](./backend/_docs/BACKEND_RULES.md) · [frontend/_docs/REACT_RULES.md](./frontend/_docs/REACT_RULES.md)를 따른다.

**트레이드오프:** 신중함을 속도보다 우선합니다. 사소한 작업은 상황에 맞게 판단합니다.

---

## 1. 프로젝트 목적

Monenon은 “검색·질의응답”을 넘어, **사용자의 생활 맥락을 이해하고 다음 행동을 제안**하는 비서형 플랫form을 지향합니다.

| 축 | 역할 |
|----|------|
| **냉장고** | 보유 재료·소비 패턴을 바탕으로 요리·장보기 결정 지원 |
| **날씨** | 기온·강수·시간대를 반영한 코디·외출·일정 큐레이션 |
| **취향** | 음악·스타일·대화 톤 등 개인 선호를 누적·반영 |

핵심 가치는 **데이터 통합 → 맥락 이해 → 능동적 제안**입니다.  
기능을 추가할 때 “이 변경이 사용자의 일상 결정을 더 잘 돕는가?”를 기준으로 삼습니다.

---

## 2. 핵심 기능

### 2.1 라이프 어시스턴트 (제품 중심)

| 기능 | 설명 | 주요 경로 |
|------|------|-----------|
| **AI 비서 대화** | 날씨·맥락을 반영한 Gemini 기반 대화 | `/`, `/chats`, `/api/agent/chat` |
| **날씨 연동** | OpenWeather 기반 현재 날씨·대화 보강 | `/weather`, `WeatherWidget` |
| **옷장·코디** | 날씨에 맞는 착장 추천 | `/closet`, `lifestyle` closet API |
| **냉장고** | 재료 관리, 요리·장보기 리스트 제안 | refrigerator API, 홈 추천 태그 |
| **음악 큐레이션** | 날씨·상황·취향 기반 플레이리스트 | `/music`, `lifestyle` music API |
| **채팅 세션** | 대화 이력 저장·재개 | `chat` API |

### 2.2 계정·운영

| 기능 | 설명 |
|------|------|
| **사용자 인증** | 회원가입·로그인·Google OAuth (`secretary`) |
| **관리자** | 사용자 관리, 경고·정지·해제 (`admin`) |

### 2.3 교육·실습 모듈 (부가 도메인)

수업·데모용으로 **Titanic·크롤링·삼성전자 분석** 등 별도 학습 흐름을 제공합니다.  
제품 정체성과 직접 연결되지 않는 실습 코드는 `titanic`, `/lesson/*` 경계 안에서 유지합니다.

| 모듈 | 설명 |
|------|------|
| **Titanic** | CSV 업로드, Smith AI 채팅, 데이터 분석 실습 |
| **Lesson** | 크롤링·삼성 분석·PDF Blob 업로드 등 |

---

## 3. 기술 스택

### 3.1 백엔드

| 계층 | 기술 |
|------|------|
| 런타임 | Python 3.13+, FastAPI, Uvicorn |
| DB | PostgreSQL, SQLAlchemy 2 (async), Alembic |
| AI | Google Gemini, Ollama (선택), KiwiPiePy (한국어) |
| 데이터 | Pandas, scikit-learn |
| 인증 | bcrypt, Google OAuth |
| 설정 | `backend/.env`, Keymaker (`core.matrix.vault_keymaker_secret_manager`) |

### 3.2 프론트엔드

| 계층 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, Radix UI, Lucide |
| 배포·스토리지 | Vercel, Vercel Blob (Private + OIDC) |
| 환경 변수 | `frontend/.env.local` (`NEXT_PUBLIC_*`는 빌드 타임) |

### 3.3 인프라·로컬 개발

```bash
# Docker (권장)
docker compose up --build

# 또는 개별 실행
cd backend/apps && uvicorn main:app --reload   # :8000
cd frontend && npm run dev                      # :3000
```

| 항목 | URL |
|------|-----|
| API 문서 | http://127.0.0.1:8000/docs |
| 프론트 | http://localhost:3000 |

---

## 4. 아키텍처 개요

```
cloud.monenon/
├── backend/
│   ├── main.py              # FastAPI 진입·라우터 조립
│   └── apps/                # 시블링 도메인 앱
│       ├── lifestyle/       # 옷장·냉장고·음악·채팅
│       ├── secretary/       # 사용자 인증
│       ├── admin/           # 관리자
│       ├── titanic/         # 교육·데이터 실습
│       └── core/            # DB·Keymaker 등 공통
├── frontend/                # Next.js App Router
├── backend/_docs/           # 백엔드 코딩 규칙·ERD
├── frontend/_docs/          # 프론트 코딩 규칙
├── docker-compose.yaml
├── CLAUDE.md                ← 본 문서
├── .cursorrules
└── CURSOR.md
```

- 백엔드 도메인은 `backend/apps/` 아래 **시블링 앱**으로 분리합니다.
- `lifestyle`, `secretary`, `admin` 등은 **헥사고날(ports/adapters)** 패턴을 따릅니다.
- 새 기능은 **제품 축(냉장고·날씨·취향)** 에 맞는 앱·모듈에 두고, 교육 전용 로직은 `titanic`·`/lesson`에 격리합니다.

---

## 5. 개발 방향성 (의사결정 가이드)

구현·리뷰 시 아래 우선순위를 참고합니다.

1. **맥락 통합** — 단일 API보다 “날씨 + 냉장고 + 취향”을 엮는 흐름을 우선합니다.
2. **능동적 제안** — 사용자가 묻기 전에도 홈·위젯·추천 태그로 다음 행동을 제시합니다.
3. **개인화** — 사용자별 설정·이력·선호를 DB에 남기고 대화에 반영합니다.
4. **교육 모듈 분리** — Titanic·Lesson 코드가 라이프스타일 코어를 오염시키지 않도록 경계를 유지합니다.
5. **비밀·환경** — API 키·토큰은 `.env` + Keymaker만 사용합니다. 코드·커밋에 하드코딩하지 않습니다.

---

## 6. 구현 전 사고 (Think Before Coding)

**가정하지 않는다. 혼란을 숨기지 않는다. 트레이드오프를 드러낸다.**

구현에 들어가기 전에:

- 가정은 명시한다. 불확실하면 질문한다.
- 해석이 여러 가지면 골라 치우지 말고 대안을 제시한다.
- 더 단순한 방법이 있으면 말한다. 타당하면 사용자 요청에 반대 의견을 낸다.
- 불명확하면 멈춘다. 무엇이 헷갈리는지 짚고 질문한다.

## 7. 단순성 우선 (Simplicity First)

**문제를 푸는 데 필요한 최소한의 코드만. 추측성 작업은 없다.**

- 요청받지 않은 기능은 넣지 않는다.
- 일회성 코드를 위한 추상화는 만들지 않는다.
- 요청받지 않은 “유연성”이나 “설정 가능성”은 고려하지 않는다.
- 불가능한 시나리오를 위한 예외 처리는 하지 않는다.
- 200줄로 썼는데 50줄이면 되면 다시 쓴다.

스스로에게 묻는다: “시니어 엔지니어가 이걸 과하게 복잡하다고 할까?” 그렇다면 단순화한다.

## 8. 정밀한 수정 (Surgical Changes)

**꼭 필요한 곳만 건드린다. 본인이 만든 정리만 한다.**

- 인접한 코드·주석·포맷을 “개선”하지 않는다.
- 망가지지 않은 것은 리팩터링하지 않는다.
- 본인 스타일과 달라도 기존 스타일을 맞춘다.
- 작업과 무관한 데드 코드를 보면 알려만 주고 지우지 않는다.
- **본인 변경**으로 쓰이지 않게 된 임포트·변수·함수만 제거한다.

검증: 바뀐 모든 줄이 사용자 요청과 직접적으로 연결되어야 한다.

## 9. 목표 중심 실행 (Goal-Driven Execution)

**성공 기준을 정의한다. 검증될 때까지 반복한다.**

- “유효성 검사 추가” → “잘못된 입력에 대한 테스트를 쓰고, 통과시킨다”
- “버그 수정” → “재현 테스트를 쓰고, 통과시킨다”
- “X 리팩터링” → “전후로 테스트가 통과하는지 확인한다”

다단계 작업이면 짧은 계획과 각 단계의 검증 방법을 밝힙니다.

---

## 10. 도메인별 CLAUDE.md

| 앱 (시블링) | CLAUDE.md |
|-------------|-----------|
| `titanic/` | [backend/apps/titanic/_docs/CLAUDE.md](./backend/apps/titanic/_docs/CLAUDE.md) |
| `secretary/`, `admin/`, `lifestyle/` 등 | [backend/CLAUDE.md](./backend/CLAUDE.md) + 해당 모듈 패턴 |

---

**이 지침이 먹히고 있으면:** diff에 불필요한 변경이 줄고, 과한 복잡도로 인한 재작성이 줄며, 실수 **뒤**가 아니라 구현 **전**에 질문이 나옵니다.

## 출처

- 행동 가이드의 근간: Andrej Karpathy의 관찰 — [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (`CLAUDE.md`)
