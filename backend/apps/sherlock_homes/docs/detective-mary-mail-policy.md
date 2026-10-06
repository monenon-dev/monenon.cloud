# Gmail → n8n → 백엔드 실시간 전송 하네스

> Gmail로 들어온 메일을 실시간(Push) 또는 주기적(Polling)으로 감지해 n8n을 거쳐 자체 백엔드(FastAPI)로 전달하는 시스템 구축 절차. 두 번의 실제 구축 세션을 통합·정리한 재사용 가능한 런북(runbook).

**Monenon 저장소 연결**

| 구분 | 경로·주소 |
|------|-----------|
| 정책 문서 | `backend/apps/sherlock_homes/docs/detective-mary-mail-policy.md` (본 문서) |
| 구현 앱 | `backend/apps/sherlock_homes/` — **메리 왓슨(Mary)** 메일 수신·pgvector 저장 |
| 왓슨 게이트웨이 정책 | [[detective-watson-watcher-policy]] |
| n8n (Docker) | `docker-compose.yaml` → `https://n8n.choseohee.com/` |
| 프론트 수신함 UI | `/mail` → **수신함** 탭 (`POST /api/mail/inbox/webhook`) |

---

## 0. 아키텍처 개요

```
Gmail 새 메일
   │
   ├─ (폴링) Gmail Trigger — On message received
   └─ (Push)  Google Cloud Pub/Sub → 공개 HTTPS Webhook
   │
   ▼
n8n (https://n8n.choseohee.com)
   │  Gmail 조회 노드 (Push 시 historyId → 본문 조회)
   ▼
n8n: HTTP Request → 백엔드 POST
   │
   ├─ (권장) FastAPI  POST /api/sherlock/mary/mail/webhook
   │              → EXAONE 임베딩 → pgvector(mary_mails)
   │
   └─ (선택) Next.js POST /api/mail/inbox/webhook
                  → Gemini 허용 발신자 필터 → /mail 수신함 UI
```

**두 가지 감지 방식 비교**

| 방식 | 지연 | 난이도 | 비용 | 비고 |
|---|---|---|---|---|
| 폴링 (Gmail Trigger, Poll) | 최대 1분 | 낮음 | 무료 | n8n 기본 노드만으로 완결. **Monenon 개발·운영 1차 권장** |
| Push (Pub/Sub) | 거의 실시간 | 높음 | 무료(소량) | 공개 HTTPS 필수, watch 7일 만료. `n8n.choseohee.com` 사용 시 Named Tunnel 전제 |

실시간성이 꼭 필요하지 않다면 **폴링으로 끝내는 것을 권장**. Push는 4~9단계를 모두 거쳐야 완성됨.

---

## 1. 사전 조건 확인

- [ ] n8n 실행 위치 → **Monenon `docker compose` 셀프호스팅** (`n8n` 서비스, 커뮤니티 에디션 무료)
- [ ] `WEBHOOK_URL=https://n8n.choseohee.com/` 설정 여부 (`docker-compose.yaml` n8n 환경 변수)
- [ ] n8n 컨테이너 → 백엔드 컨테이너 통신: `http://backend:8000/api/sherlock/mary/mail/webhook`
- [ ] 로컬 n8n UI: `http://localhost:5678`
- [ ] 수신 목적: (a) **Mary + pgvector 저장** / (b) 프론트 수신함 표시 / (c) 둘 다 (HTTP Request 2갈래 또는 순차 호출)
- [ ] Push 방식 시: Cloudflare Named Tunnel(`n8n.choseohee.com`) 또는 Quick Tunnel URL 확보

---

## 2. n8n 셀프호스팅 (Monenon Docker)

저장소 루트에서:

```bash
docker compose up -d n8n
```

`docker-compose.yaml` n8n 서비스 (요약):

```yaml
n8n:
  image: docker.n8n.io/n8nio/n8n:latest
  ports:
    - "5678:5678"
  environment:
    N8N_HOST: n8n.choseohee.com
    N8N_PORT: 5678
    N8N_PROTOCOL: https
    WEBHOOK_URL: https://n8n.choseohee.com/
    GENERIC_TIMEZONE: Asia/Seoul
    TZ: Asia/Seoul
  volumes:
    - n8n_data:/home/node/.n8n
```

- UI: `http://localhost:5678` → 최초 1회 계정 생성
- Production Webhook 예: `https://n8n.choseohee.com/webhook/<path>`
- 워크플로·실행 횟수 제한 없음 (커뮤니티 에디션)

---

## 3. (폴링 방식) Gmail Trigger 노드 설정 — **1차 권장**

> 실시간이 필요 없다면 여기서 끝내고 4~7단계는 건너뛰어도 됨.

1. 새 워크플로우 생성 (기존 send-mail·calendar 워크플로와 **섞지 말 것**)
2. `+` → **Gmail** → 하단 **Triggers** → **On message received**
   - ⚠️ Gmail(send) 노드와 다름. Triggers 섹션에서 찾을 것
3. Credential: 기존 Gmail OAuth 재사용 가능
4. 설정: `Poll Times = Every Minute`, `Event = Message Received`, `Simplify = ON`
5. **Fetch Test Event** / **Test this trigger**로 실제 메일 수신 확인
6. 출력 필드: `Subject`, `From`, `To`, `snippet`, `id` 등

이후 **HTTP Request** 노드를 붙여 백엔드로 전송 (8단계 필드 매핑 참고).

---

## 4. (Push 방식) 공개 HTTPS — Monenon 운영

**운영(권장): Named Tunnel + 고정 도메인**

- Webhook 공개 URL: `https://n8n.choseohee.com/webhook/gmail-push`
- `docker-compose`의 `WEBHOOK_URL`과 일치해야 n8n이 Production URL을 올바르게 생성함

**로컬·임시 테스트: Quick Tunnel**

```bash
brew install cloudflared          # 최초 1회
cloudflared tunnel --url http://localhost:5678 &
```

| 종류 | URL | Monenon |
|---|---|---|
| Named Tunnel | `https://n8n.choseohee.com` | **운영 기본** |
| Quick Tunnel | `https://xxxxx.trycloudflare.com` | 재시작마다 URL 변경 → Pub/Sub 구독 URL 수동 갱신 필요 |

⚠️ Quick Tunnel은 터미널 종료 시 끊김. 상시 Push는 Named Tunnel 유지.

---

## 5. n8n Webhook 노드 (Push 수신구)

1. `+` → **Webhook** ("On webhook call") — 독립 워크플로에 배치
2. 설정:
   - Method: `POST`
   - Path: `gmail-push`
   - Authentication: `None` (초기 테스트; 운영 시 강화)
   - Respond: `Immediately`
3. Production URL: `https://n8n.choseohee.com/webhook/gmail-push`
4. `⌘S` 저장 후 **Publish** (Publish 전에는 Production Webhook 비활성)

---

## 6. Google Cloud Pub/Sub 설정

### 6-1. 토픽 생성
- Cloud Console → Pub/Sub → API 활성화 → **Topics** → **CREATE TOPIC**
- Topic ID: 예) `gmail-push-topic`
- "기본 구독 추가" 체크 해제

### 6-2. Gmail 발행 권한 (필수)
- 토픽 → **Permissions** → **ADD PRINCIPAL**
- 주 구성원: `gmail-api-push@system.gserviceaccount.com`
- 역할: **Pub/Sub Publisher**

### 6-3. Push 구독 생성
- Subscription ID: 예) `gmail-push-sub`
- 전송 유형: **Push**
- 엔드포인트 URL: `https://n8n.choseohee.com/webhook/gmail-push`
- 인증·페이로드 래핑: 끔 (초기)

### 6-4. 비용
- Pub/Sub 월 10GiB 무료 — Gmail 알림은 사실상 $0

---

## 7. Gmail watch 등록 (Push 스위치 ON)

n8n **HTTP Request** 노드 1회 호출 (독립 워크플로):

| 항목 | 값 |
|---|---|
| Method | POST |
| URL | `https://gmail.googleapis.com/gmail/v1/users/me/watch` |
| Authentication | Gmail OAuth2 API → 기존 Gmail credential |
| Body (JSON) | 아래 참고 |

```json
{
  "topicName": "projects/<PROJECT_ID>/topics/gmail-push-topic",
  "labelIds": ["INBOX"]
}
```

- 성공 응답: `{ "historyId": "...", "expiration": "..." }` (expiration ≈ 7일)
- 403 시: credential에 `gmail.readonly` 스코프 추가 후 재인증

### Pub/Sub 페이로드 (메일 본문 없음)

```json
{
  "message": {
    "data": "<base64: {\"emailAddress\":\"...\",\"historyId\":숫자}>",
    "messageId": "...",
    "publishTime": "..."
  }
}
```

→ `message.data` 디코딩 시 `historyId`만 있음. **Gmail 조회 노드로 본문 재조회 필수**.

---

## 8. 메일 조회 → 백엔드 전송 노드

Webhook 또는 Gmail Trigger 뒤에 연결:

1. **(Push만)** Gmail **Get many messages** — historyId/최신 1건
2. **HTTP Request** → 백엔드

### 8-1. Mary 백엔드 (권장 — pgvector 저장)

| 항목 | 값 |
|---|---|
| Method | `POST` |
| URL (Docker) | `http://backend:8000/api/sherlock/mary/mail/webhook` |
| URL (로컬 n8n → 호스트 백엔드) | `http://host.docker.internal:8000/api/sherlock/mary/mail/webhook` |
| Content-Type | `application/json` |

Body (표현식 예):

```
{{ JSON.stringify({
  from_email: ($json.From || '').match(/<([^>]+)>/)?.[1] || $json.From,
  from_name: ($json.From || '').replace(/<[^>]+>/, '').trim() || null,
  subject: $json.Subject || '(제목 없음)',
  body_text: $json.snippet || '',
  received_at: new Date().toISOString()
}) }}
```

동일 스키마로 `POST /api/sherlock/mary/mail` 도 사용 가능.

### 8-2. 프론트 수신함 (선택 — UI + Gemini 허용 발신자 필터)

| 항목 | 값 |
|---|---|
| URL (Docker) | `http://frontend:3000/api/mail/inbox/webhook` |
| Body 필드 | `from`, `subject`, `snippet`, `id`, `receivedAt` |

```
{{ JSON.stringify({
  from: $json.From,
  subject: $json.Subject,
  snippet: $json.snippet,
  id: $json.id,
  receivedAt: new Date().toISOString()
}) }}
```

`/mail` → **수신함** 탭에서 허용 발신자 등록 후 **새로고침** 시 Gemini 필터 적용.

### n8n 표현식 주의
- `{{ }}` 두 겹만 사용, 바깥에 추가 `{ }` 금지
- 노드 X 닫기 ≠ 저장 — 캔버스 **Save / ⌘S** 필수

---

## 9. watch 갱신 자동화 (7일 만료, Push 전용)

별도 워크플로:

```
Schedule Trigger (매일 1회) → HTTP Request (7단계 watch와 동일)
```

- watch 재호출은 안전 — 만료 타이머만 리셋
- **Publish** 후 방치 가능

---

## 10. 백엔드(FastAPI) 연동 — **구현 완료 기준**

구현 위치: `backend/apps/sherlock_homes/adapter/inbound/api/v1/detective_mary_mail_router.py`

| 메서드 | 경로 | 용도 |
|--------|------|------|
| `GET` | `/api/sherlock/mary/myself` | 메리 왓슨 자기소개 |
| `POST` | `/api/sherlock/mary/mail` | n8n 메일 수신 → EXAONE 임베딩 → `mary_mails` INSERT |
| `POST` | `/api/sherlock/mary/mail/webhook` | Gmail Trigger 전용 alias (동일 처리) |

**요청 스키마** (`MailIngestSchema`):

```python
{
  "from_email": "sender@example.com",   # 필수
  "from_name": "홍길동",                 # 선택
  "subject": "제목",                     # 기본 "(제목 없음)"
  "body_text": "본문 또는 snippet",      # 선택
  "received_at": "2026-07-03T10:00:00Z" # 선택, ISO 8601
}
```

**응답** (`MailIngestResult`):

```python
{ "ok": true, "mail_id": 1, "embedded": true, "message": "..." }
```

**더 이상 사용하지 않는 패턴** (레거시):

```python
# ❌ GET /receive + 하드코딩 id/content — 제거·대체됨
@mary_mail_router.get("/receive")
async def receive_mail(...) -> MaryMailResponse:
    return await mary.receive_mail(MaryMailSchema(id=12, content="..."))
```

**n8n → 백엔드 주소 정리**

| n8n 실행 환경 | Mary API URL |
|---------------|--------------|
| `docker compose` (n8n + backend 동일 compose) | `http://backend:8000/api/sherlock/mary/mail/webhook` |
| n8n만 Docker, 백엔드 호스트 | `http://host.docker.internal:8000/api/sherlock/mary/mail/webhook` |
| 공개 배포 API | `https://<api-domain>/api/sherlock/mary/mail/webhook` |

저장 후 조회·검색 API는 별도 설계(현재 ingest + pgvector 저장까지 구현).

---

## 11. 비용 정리

| 구성요소 | 비용 | 근거 |
|---|---|---|
| n8n 셀프호스팅 (Monenon Docker) | 무료 | 커뮤니티 에디션 |
| Gmail API (watch/조회) | 무료 | 개인 사용량 한도 내 |
| Pub/Sub | 무료 | 월 10GiB 무료 |
| Cloudflare Named Tunnel (`n8n.choseohee.com`) | 무료 | 운영 도메인 |
| Schedule Trigger (watch 갱신) | 무료 | n8n 내부 |

---

## 12. 알아둘 함정 (Troubleshooting)

- **Gmail(send) vs Gmail Trigger**: Triggers 섹션의 **On message received** 사용
- **다음 노드 추천 패널**에서 트리거 안 보임 → Esc 후 캔버스 빈 곳에서 `+` 재검색
- **Publish 전 Production Webhook 비활성** — 트리거만 Publish하면 데이터가 어디로도 안 감
- **WEBHOOK_URL 불일치** — `localhost`로 남아 있으면 외부 Pub/Sub가 잘못된 URL로 호출
- **Docker 서비스명** — 백엔드 URL에 `localhost:8000` 쓰면 n8n 컨테이너 내부 자신을 가리킴 → `backend` 호스트명 사용
- **필드명 불일치** — Mary API는 `from_email` / `body_text` (n8n Gmail `From` / `snippet`과 다름)
- **Pub/Sub 알림에 본문 없음** — 반드시 Gmail 조회 단계 추가

---

## 13. 단계별 완료 체크리스트

- [ ] `docker compose up -d n8n` + `WEBHOOK_URL=https://n8n.choseohee.com/` 확인
- [ ] **(폴링)** Gmail Trigger → HTTP Request → `POST /api/sherlock/mary/mail/webhook` 종단 테스트
- [ ] **(선택)** 동일 체인에서 `POST /api/mail/inbox/webhook` → `/mail` 수신함 표시 확인
- [ ] **(Push)** n8n Webhook `gmail-push` 생성 및 Publish
- [ ] Pub/Sub 토픽 + Gmail Publisher 권한 + Push 구독 (`https://n8n.choseohee.com/webhook/gmail-push`)
- [ ] `users.watch()` 등록 (historyId / expiration 확인)
- [ ] Push 체인: Webhook → Gmail 조회 → Mary API 실메일 테스트
- [ ] watch 갱신 Schedule Trigger 등록·Publish
- [ ] `mary_mails` 테이블·임베딩 저장 확인 (pgvector)
- [ ] Named Tunnel 상시 운영 여부 확인 (Quick Tunnel 임시 사용 시 URL 갱신 절차 문서화)

---

## 관련 문서

- [[detective-watson-watcher-policy]] — 왓슨 Triage·라우팅 정책
- `frontend/app/mail/page.tsx` — 메일관리·수신함 UI
- `backend/apps/sherlock_homes/adapter/inbound/api/v1/detective_mary_mail_router.py` — Mary API 구현
