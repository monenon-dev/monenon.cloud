# CLAUDE.md (Silicon Valley 앱)

`backend/apps/silicon_valley/` — HBO *Silicon Valley* · Pied Piper 팀 교육 도메인.

## Pied Piper 5인 페르소나

| slug | 브랜치 | 역할 |
|------|--------|------|
| `richard` | `founder_richard_hendricks` | CEO · 중대형 손실리스 압축 |
| `erlich` | `incubator_erlich_bachman` | 인큐베이터 · Aviato |
| `jared` | `partner_jared_dunn` | COO · 오퍼레이션 |
| `dinesh` | `engineer_dinesh_chugtai` | 엔지니어 · ML |
| `gilfoyle` | `architect_bertram_gilfoyle` | 시스템 아키텍트 |

단일 정의: `domain/personas.py`

## 클린 아키텍처

```
Router → UseCase(Interactor) → Port → Repository
         ↑ schemas/dto    ↑ domain/personas
```

## HTTP API

- prefix: `/api/v1`
- 자기소개: `GET /api/v1/{slug}/myself` → **plain text**
- 통합: `adapter/inbound/api/v1/__init__.py` → `silicon_valley_router`

## 프론트

| 경로 | 설명 |
|------|------|
| http://localhost:3000 | Pied Piper 홈 |
| http://localhost:3000/silicon-valley/admin | 관리자 (로그인 없음) |

## Docker · 검증

```bash
docker compose up --build -d
curl http://localhost:8000/api/v1/richard/myself
curl http://localhost:8000/api/v1/erlich/myself
curl http://localhost:8000/api/v1/jared/myself
curl http://localhost:8000/api/v1/dinesh/myself
curl http://localhost:8000/api/v1/gilfoyle/myself
```

```bash
cd backend && python -m pytest apps/silicon_valley/tests -v
```
