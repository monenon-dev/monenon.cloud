---
type: harness
app: auth
title: AUTH-GATEWAY-HARNESS
links:
  - ../../../_docs/BACKEND_RULES.md
  - ../../../_docs/docker-rules.md
  - ../../secretary/
  - ../../gateway/
---

# AUTH-GATEWAY-HARNESS

> Claude Code / Cursor 작업 지시서 — 인증 게이트웨이(`auth.monenon.cloud`) 분리 배포  
> **대상 저장소:** `monenon.cloud` · `backend/` 모노레포 (`apps/` 시블링 앱)  
> **원칙:** 기존 구조 **무변경 우선**, **추가만 허용**. **발급은 auth 컨테이너에서만**, 백엔드(api)는 **검증만**.

---

## 0. 컨텍스트 (Monenon)

| 항목 | 현황 |
|------|------|
| 배포 | `backend/main.py` 단일 Uvicorn → Cloudflare Tunnel **`api.monenon.cloud`** |
| 앱 | `backend/apps/` 시블링 (secretary, lifestyle, gateway, star_craft, titanic …) |
| 기존 로그인 | **`secretary`** — `/auth/login`, Google/Naver/Kakao, opaque `access_token` (서버 미검증) |
| AI gateway | **`gateway`** — 인텐트 라우터 (`/api/gateway/*`). OAuth/JWT 엣지 **아님** |
| 네트워크 | Compose 프로젝트 `monenoncloud` + `cloudflared` profile. 프론트는 Vercel |
| Redis | 서비스명 **`redis`** (템플릿의 totem 해당) |

### 목표

같은 코드베이스에서 **엔트리포인트만 분리**:

| 호스트 | 컨테이너 | 역할 |
|--------|----------|------|
| `auth.monenon.cloud` | `auth` → `auth_main:app` :9000 | OAuth·로그인·JWT 발급·refresh·JWKS·logout |
| `api.monenon.cloud` | `backend` → `main:app` :8000 | 비즈니스 API. **공개키로 JWT 검증만** |

- 키 체계: **RS256** 비대칭. **개인키는 auth 컨테이너에만** 존재.
- `apps/auth` = 발급 전용 앱. `secretary`의 “회원 ORM·프로필”과 **중복 로그인 UI를 장기적으로 이관**할 수 있으나, **이번 하네스는 auth 발급 경로 신설**이 범위.
- 영화/수업 예제의 `auth.ragtailor.com` / `dreamscape` / `totem` 이름은 위 Monenon 표로 치환한다.

---

## 1. 절대 규칙 (위반 시 작업 중단 후 보고)

1. `apps/` 하위 **기존 시블링 앱**(`secretary`, `lifestyle`, `gateway`, `star_craft`, `titanic`, `moneyball`, `admin`, …) 코드는 **한 줄도 수정하지 않는다.**  
   - 예외: **사용자에게 물어본 뒤** 예시 1개 앱에만 `RoleChecker` 패턴 적용 (섹션 2.5).
2. `docker-compose*.yaml`에 **호스트 `ports:` 매핑을 추가하지 않는다.** (Tunnel만 진입 — [`docker-rules.md`](../../../_docs/docker-rules.md))
3. JWT 검증 허용 알고리즘은 **`algorithms=["RS256"]` 리터럴 하드코딩**. env/설정으로 빼지 않는다.
4. **`JWT_PRIVATE_KEY`를 읽는 코드는 발급 함수에만** 존재. 검증 경로에서 개인키 참조 발견 시 즉시 수정.
5. 비밀키·개인키를 저장소에 **커밋하지 않는다.** `.env.auth`, `.env.backend`, `*.pem` 은 gitignore.
6. 시블링 앱이 **`apps.auth`를 import하지 않는다.** 백엔드가 쓸 수 있는 것은 **`core.dependencies` / `core.security`의 검증부뿐**.
7. AI **`gateway` 폴더를 인증 게이트웨이로 개조하지 않는다.**
8. 새 DB·compose 서비스를 만들 때 기존 `redis` / `backend` / `cloudflared`가 있으면 **재사용·승인 게이트** (`docker-rules`).

---

## 2. 작업 목록

### 2.1 `backend/apps/auth/` 신규 생성

```text
backend/apps/auth/
├── __init__.py
├── _docs/
│   └── auth-gateway-harness.md   # 본 문서
├── router.py       # POST /login, POST /logout, POST /refresh,
│                   # GET /callback/{provider}, GET /.well-known/jwks.json
├── services.py     # OAuth(Google, Kakao, …) · 토큰 발급 오케스트레이션
├── schemas.py      # TokenResponse, LoginRequest, RefreshRequest …
└── rbac.py         # Role(str, Enum), Permission, role→permission 매핑
```

- 엔드포인트는 위 **5종**으로 시작. 회원가입·프로필은 이번 범위 밖 (`secretary` 유지).
- `/.well-known/jwks.json` — 공개키 JWK (`kid` 포함). api/외부 검증자용.
- 리프레시 토큰: **Redis** 저장, **로테이션**. 재사용 감지 시 해당 사용자 세션 **전체 폐기**.
- Redis 키 접두사(제안): `monenon:auth:refresh:{jti}` / `monenon:auth:user_sessions:{sub}` — 확정 전 기존 키와 충돌 여부 확인 후 질문.

### 2.2 `backend/core/security.py` (신규 또는 기존 확장)

현재 레포에 동등 파일이 없으면 **신규 생성**. HS256 등이 생기면 **삭제하지 말고 deprecated 주석** 후 보고.

```python
# 발급부 — auth 컨테이너 전용 (JWT_PRIVATE_KEY 필요, 호출 시점에만 로드)
def create_access_token(sub: str, roles: list[str], aud: str, expires_min: int = 10) -> str: ...
def create_refresh_token(sub: str) -> str: ...

# 검증부 — 모든 컨테이너 공용 (JWT_PUBLIC_KEY만)
def verify_token(token: str, aud: str) -> TokenPayload: ...
    # jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"], audience=aud)

COOKIE_KWARGS = dict(
    domain=".monenon.cloud",
    secure=True,
    httponly=True,
    samesite="lax",
)

# 해싱 — auth 전용 (secretary password 해시와 중복 시 한쪽을 점진 이관 — 추측 금지, 질문)
def hash_password(raw: str) -> str: ...
def verify_password(raw: str, hashed: str) -> bool: ...
```

- 발급 함수는 **모듈 import 시점**에 개인키를 읽지 않는다. backend가 `import core.security`만 해도 키 부재로 죽으면 안 된다.
- access 클레임: `sub`, `roles`, `aud`, `exp`, `iat`, `jti` + 헤더 `kid`.
- `aud` 예: `monenon-api` (서비스별 상이, 교차 사용 불가). 추가 audience는 사용자 확인.

### 2.3 `backend/core/dependencies.py` (신규)

```python
async def get_current_user(request: Request) -> TokenPayload: ...
    # 쿠키 또는 Authorization: Bearer → verify_token(aud=settings.SERVICE_AUD)

class RoleChecker:
    def __init__(self, *allowed: Role): ...
    def __call__(self, user: TokenPayload = Depends(get_current_user)): ...
        # roles 미충족 시 403
```

- Redis **jti 블랙리스트** 조회를 `get_current_user`에 포함 (즉시 차단·logout).

### 2.4 `backend/auth_main.py` 신규 (`backend/main.py` 옆)

```python
from fastapi import FastAPI
from auth.router import router as auth_router  # PYTHONPATH=/app/apps 기준 패키명 확인

app = FastAPI(
    title="Monenon Auth",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,  # 실서비스: 문서 비노출
)
app.include_router(auth_router, prefix="/auth")

@app.get("/healthz")
async def healthz():
    return {"ok": True}
```

- `secretary`의 `login_router`는 **삭제하지 않는다.** auth 동작 검증 후 이관·폐기 여부는 **별도 커밋·사용자 확인**.
- Dockerfile `WORKDIR`이 `/app/apps`이면 import 경로·`auth_main` 위치를 Dockerfile/command와 맞출 것 (추측 금지 — 읽고 보고).

### 2.5 `backend/main.py` (수정 최소화)

- 시블링 라우터 include **유지**.
- **`apps.auth` / `auth.router` include가 없는지 확인만** (api 컨테이너는 발급 라우터를 올리지 않음).
- 보호 예시: **한 앱만** `dependencies=[Depends(RoleChecker(...))]` — **대상 앱은 구현 전 사용자에게 질문**.

### 2.6 Docker Compose — `auth` 서비스 추가

```yaml
  auth:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: ${AUTH_IMAGE:-whtjgml2002/monenon-auth:latest}  # 또는 backend와 동일 이미지·다른 command
    command: ["uvicorn", "auth_main:app", "--host", "0.0.0.0", "--port", "9000"]
    env_file:
      - ./backend/.env.auth   # JWT_PRIVATE_KEY, OAuth secrets
    environment:
      REDIS_URL: redis://redis:6379/0
      # DATABASE_URL — 로그인 시 users 조회 필요하면 pgvector 공유 (승인·문서화)
    depends_on:
      - redis
    networks: [default]       # monenoncloud 기본 네트워크 — 새 네트워크 남발 금지
    restart: unless-stopped
    # ports: 없음
```

- 기존 `backend` 서비스 env를 **`.env.backend` 개념으로 분리** (최소 `JWT_PUBLIC_KEY`, `SERVICE_AUD=monenon-api`). 실제 파일명은 gitignore된 `backend/.env`와 병행 가능 — **커밋되는 것은 `.env.example`만**.
- **호스트 `ports:` 추가 금지.**
- compose 변경 전 [`docker-rules.md`](../../../_docs/docker-rules.md) 체크리스트 보고·승인.

### 2.7 `scripts/generate_jwt_keys.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
openssl genrsa -out jwt_private.pem 2048
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
echo "jwt_private.pem → backend/.env.auth 의 JWT_PRIVATE_KEY"
echo "jwt_public.pem  → backend/.env.backend(또는 .env) 의 JWT_PUBLIC_KEY"
```

- `*.pem` gitignore. 멀티라인 PEM은 base64 인코딩 후 런타임 디코드 권장 (Keymaker/config).

### 2.8 Cloudflare Tunnel ingress (코드 밖 — 지시만)

```yaml
ingress:
  - hostname: auth.monenon.cloud
    service: http://auth:9000
  - hostname: api.monenon.cloud
    service: http://backend:8000
  - service: http_status:404
```

```bash
cloudflared tunnel route dns <터널이름> auth.monenon.cloud
```

- 작업 완료 보고서에 **「수동 적용 필요」** 섹션으로 출력.

### 2.9 import-linter contract (선택·권장)

```ini
[importlinter:contract:auth-isolation]
name = apps.auth is only imported by auth_main
type = forbidden
source_modules =
    secretary
    lifestyle
    gateway
    star_craft
    titanic
    moneyball
    admin
    sherlock_homes
    silicon_valley
    mail
    faker
    dumb_and_dumber
    telegram_reporter
forbidden_modules =
    auth
```

- 실제 모듈 경로는 `apps/`·PYTHONPATH에 맞게 조정. `apps/`를 읽어 목록을 **정확히** 반영.

---

## 3. 완료 기준 (Acceptance Criteria)

- [ ] `uvicorn auth_main:app` 단독 기동, `GET /healthz` → 200
- [ ] `uvicorn main:app` 기동 시 **JWT_PRIVATE_KEY 없이** 정상 (import 에러 없음)
- [ ] auth 발급 토큰을 backend `verify_token`이 **공개키만으로** 검증 통과
- [ ] `aud` 불일치 토큰 → 검증 실패 테스트
- [ ] 만료 / 서명 변조 / `alg=none`·HS256 강제 → 각각 거부 테스트
- [ ] 리프레시 재사용 → 세션 전체 폐기 테스트
- [ ] import-linter(auth-isolation) 통과 (도입 시)
- [ ] pytest 회귀 없음 (기존 secretary·gateway 테스트 포함)

---

## 4. 진행 방식

1. 작업 전 `apps/`, `backend/core/`, `backend/main.py`, `secretary` 로그인 라우터, `docker-compose.yaml` 상태를 **읽고 요약 보고** 후 시작.
2. 커밋 단위(한글 메시지): `2.1` → `2.2` → `2.3` → `(2.4+2.5)` → `(2.6+2.7)` → `2.9` 순으로 기능별 분리 커밋 + 푸시·neo/main/sigma 동기화.
3. 기존 비밀번호 해시·User 모델은 **추측하지 말고 질문** (secretary ORM 스키마, Redis 네임스페이스, OAuth provider 우선순위, RoleChecker 예시 앱).
4. `secretary` `/auth/*` 와 신규 `auth_main` `/auth/*` 경로 충돌·프론트 전환 시점은 **사용자 확인**.

---

## 5. Monenon 치환표 (템플릿 → 본 레포)

| 템플릿 (RAG Tailor) | Monenon |
|---------------------|---------|
| `auth.ragtailor.com` | `auth.monenon.cloud` |
| `api.ragtailor.com` | `api.monenon.cloud` |
| `dreamscape` 네트워크 | compose 기본 네트워크 (`monenoncloud`) |
| `totem` (Redis) | `redis` 서비스 |
| `.ragtailor.com` 쿠키 | `.monenon.cloud` |
| `login_gate.py` | 없음 → `secretary` login_router 유지 |
| 영화 앱만 | secretary, lifestyle, gateway, star_craft, … 전부 시블링 |
| `ports` 노출 | **금지** (Tunnel only) |

---

## 6. 관련 문서

| 문서 | 용도 |
|------|------|
| [`BACKEND_RULES.md`](../../../_docs/BACKEND_RULES.md) | FastAPI·Keymaker |
| [`docker-rules.md`](../../../_docs/docker-rules.md) | 서비스 생성 전 존재 체크 |
| `apps/gateway/` | AI 인텐트 — 본 하네스와 역할 분리 |
| `apps/secretary/` | 기존 회원·소셜 로그인 — 점진 이관 대상 |
