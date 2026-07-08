# CLAUDE.md (Frontend)

`frontend/` · Next.js UI 작업 시 이 문서를 따른다.

## 상위 문서 (중복하지 않음)

| 문서 | 내용 |
|------|------|
| [../CLAUDE.md](../CLAUDE.md) | 구현 전 사고, 단순성, 정밀한 수정, 목표 중심 실행 |
| [../.cursorrules](../.cursorrules) | Cursor 하네스, 산출물 제한 |
| [../docs/DevOps/README.md](../docs/DevOps/README.md) | 규칙 색인 |
| [../docs/DevOps/frontend/REACT_RULES.md](../docs/DevOps/frontend/REACT_RULES.md) | React·Next.js 코딩 규칙 **(구현 전 필수)** |

백엔드 API·도메인은 [../backend/CLAUDE.md](../backend/CLAUDE.md)를 따른다.  
Titanic 화면·경로는 [../backend/apps/titanic/_docs/CLAUDE.md](../backend/apps/titanic/_docs/CLAUDE.md) API 규약과 맞춘다.

---

## 런타임 · 실행

| 항목 | 값 |
|------|-----|
| 런타임 | Node 24.x, Next.js App Router |
| 작업 디렉터리 | `frontend/` |
| 로컬 dev | `npm run dev` → http://localhost:3000 |
| Docker | `docker compose up --build` (루트) |
| 환경 변수 | `frontend/.env` — `NEXT_PUBLIC_*`는 **빌드 타임** 반영 |
| API 베이스 | `lib/api-base.ts` → `getApiBaseUrl()` |

---

## API 호출 규칙

| 용도 | 함수·경로 |
|------|-----------|
| 일반 API (`/auth`, `/agent/chat` 등) | `getApiBaseUrl()` |
| Titanic API (`/api/titanic/...`) | `getTitanicApiBaseUrl()` (= `getApiBaseUrl() + '/api'`) |

예:

- CSV 업로드: `POST {getTitanicApiBaseUrl()}/titanic/james/upload`
- 승객 목록: `GET {getTitanicApiBaseUrl()}/titanic/walter/passengers`
- 스미스 채팅: `POST {getTitanicApiBaseUrl()}/titanic/smith/chat`

`/api` 없이 `/titanic/...`만 호출하면 404가 난다. 백엔드 prefix와 반드시 맞출 것.

---

## 주요 화면

| 경로 | 설명 |
|------|------|
| `/` | 메인·채팅 진입 |
| `/titanic-home` | CSV 업로드 |
| `/titanic-home/passengers` | 월터 승객 목록 |
| `/titanic-home/smith` | 스미스 선장 채팅 |

12인물 자기소개는 **프론트 일괄 페이지 없음**. Swagger 또는 `GET /api/titanic/{이름}/myself` 개별 호출.

---

## 프론트 구현 체크리스트

1. [REACT_RULES.md](../docs/DevOps/frontend/REACT_RULES.md) 확인 (`useState` 객체 묶기, `FormData` 패턴)
2. 기존 컴포넌트·`lib/*` 스타일 따르기
3. `NEXT_PUBLIC_API_BASE_URL` 미설정 시 `api-base.ts` 로컬 폴백 동작 확인
4. Docker 프론트 빌드 시 `docker-compose.yaml` `build.args` 전달 확인

### Cursor 멘션 (권장)

```text
@CLAUDE.md @frontend/CLAUDE.md @docs/DevOps/frontend/REACT_RULES.md
```

Titanic UI 작업 시 추가:

```text
@backend/apps/titanic/_docs/CLAUDE.md
```
