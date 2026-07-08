# sherlock_homes — 셜록 홈즈 앱

Titanic 앱 구조를 참조하여 구현한 셜록 홈즈 도메인 앱.

## 캐릭터

| 캐릭터 | 역할 | 엔드포인트 |
|--------|------|-----------|
| `detective_holmes_genius` | 셜록 홈즈 — 자문 탐정 | `/api/sherlock/holmes/` |
| `detective_mary_mail` | 메리 왓슨 — 메일 수신 | `/api/sherlock/mary/` |
| `police_mycroft_juso` | 마이크로프트 — 주소록 | `/api/sherlock/mycroft/` |

## 주요 엔드포인트

- `GET /api/sherlock/holmes/myself` — 자기소개
- `POST /api/sherlock/holmes/chat` — 채팅
- `POST /api/sherlock/mary/mail/webhook` — n8n Gmail → pgvector 저장

## 구조 (Titanic 동일 패턴)

```
sherlock_homes/
├── adapter/inbound/api/v1/   → 라우터
├── adapter/outbound/pg/      → PG 레포지토리
├── adapter/outbound/orm/     → ORM 모델
├── adapter/outbound/mappers/ → 매퍼
├── app/ports/input/          → 유스케이스 인터페이스
├── app/ports/output/         → 레포지토리 인터페이스
├── app/use_cases/            → 인터렉터
├── app/assemblers/           → 어셈블러
├── app/dtos/                 → DTO
├── app/dependencies/         → DI 프로바이더
├── domain/entities/          → 엔티티
├── domain/value_objects/     → 값 객체
├── domain/constants/         → 상수
├── fractal/                  → 캐릭터 노드 등록
└── docs/                     → 정책·런북 문서
```
