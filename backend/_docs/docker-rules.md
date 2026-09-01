# Docker · DB · Backend 생성 규칙 (하네스)

> **적용 범위:** Docker Compose, PostgreSQL/pgvector/Neo4j 등 DB, FastAPI 백엔드 컨테이너·서비스 생성  
> **상위 하네스:** `.cursorrules`, `backend/CLAUDE.md`, [`BACKEND_RULES.md`](BACKEND_RULES.md)

사용자가 “DB 만들어”, “백엔드 올려”, “compose 새로”라고 해도 **이미 있으면 재사용이 기본**이다.  
없으면 그때만 만들고, **있으면 체크 → 보고 → 승인 후에만** 새로 만들거나 덮어쓴다.

---

## 1. 핵심 원칙

| 원칙 | 내용 |
|------|------|
| **존재 우선** | 동일 목적의 DB·백엔드·compose 서비스가 있으면 **새로 만들지 않는다.** |
| **승인 게이트** | 기존 것을 대체·복제·추가 인스턴스로 만들려면 **사용자 명시 승인**이 필요하다. |
| **파괴 금지** | `down -v`, volume 삭제, DB drop, 포트 충돌 강제 kill은 **승인 없이 하지 않는다.** |
| **한 스택** | Monenon은 루트 `docker-compose.yaml` / `docker-compose.sigma.yaml` 을 기본으로 한다. 평행 compose를 임의로 추가하지 않는다. |

---

## 2. “만들기” 요청이 오면 — 필수 체크리스트

코드를 쓰거나 `docker compose up` / DB 프로비저닝을 **실행하기 전에** 아래를 확인한다.

### 2.1 파일·정의

- [ ] `docker-compose.yaml`, `docker-compose.sigma.yaml` 에 이미 해당 서비스가 있는가?
- [ ] `backend/` FastAPI 앱·라우터가 이미 있는가? (새 “백엔드 프로젝트” 스캐폴드 금지 — 기존 `backend/apps` 확장)
- [ ] `DATABASE_URL` / Keymaker 경로의 DB가 이미 설정되어 있는가?

### 2.2 런타임

- [ ] `docker compose ps` (또는 동등)로 **실행 중·중지된** 동일 서비스가 있는가?
- [ ] 컨테이너 이름·이미지·포트(예: `8000`, `5432`, `5050`, `7687`)가 이미 쓰이는가?
- [ ] Volume / 네트워크가 이미 있는가? (데이터 유실 위험)

### 2.3 보고 형식 (승인 요청)

기존이 발견되면 **생성·재생성 전에 멈추고** 사용자에게 짧게 보고한다.

```text
이미 있음:
- 서비스/컨테이너: …
- 포트·볼륨: …
- compose 파일: …

선택지:
1) 기존 것 재사용 / 기동만
2) 기존 것 재빌드·재기동 (데이터 유지)
3) 새로 만들기 / 교체 (데이터·볼륨 영향 명시) — 승인 필요
```

사용자가 **3번(또는 동등한 명시 승인)** 하기 전에는 새 DB·새 백엔드 스택을 만들지 않는다.

---

## 3. 허용 / 금지

### 허용 (승인 불필요 — 기존 스택 유지)

- 기존 compose로 `up` / `up --build` (요청이 “기동·재기동”일 때)
- 기존 백엔드 코드 수정·라우터 추가
- 기존 DB에 마이그레이션·테이블 추가 ([`ENTITY_RULE.md`](ENTITY_RULE.md) 준수)
- health 확인, 로그 확인

### 금지 (승인 없이)

- 두 번째 PostgreSQL / pgvector / Neo4j “새로” 띄우기
- 두 번째 FastAPI 백엔드 컨테이너·별도 compose 프로젝트 생성
- 포트·컨테이너명을 바꿔 평행 스택 구성
- `docker compose down -v`, volume/prune으로 DB 초기화
- Neon/`DATABASE_URL`을 바꾸어 **새 클라우드 DB** 를 프로비저닝하는 행위 (사용자가 새 URL을 주지 않은 경우)

---

## 4. 백엔드 “생성” 해석

| 사용자 말 | 기본 해석 |
|-----------|-----------|
| 백엔드 만들어 / 서버 세워 | **기존** `backend/` + compose `backend` 서비스 사용·기동 |
| FastAPI 프로젝트 새로 | **거부 후 확인** — Monenon은 단일 `backend/apps` |
| DB 만들어 | **기존** `DATABASE_URL` 또는 compose DB 재사용; 없으면 보고 후 승인 |

---

## 5. Cursor 멘션 (권장)

Docker·DB·백엔드 기동/생성 요청 시:

```text
@backend/_docs/docker-rules.md @backend/_docs/BACKEND_RULES.md
```

기존 스택을 확인한 뒤, 없으면 생성안을 제시하고, 있으면 **승인 전에는 만들지 마세요.**
