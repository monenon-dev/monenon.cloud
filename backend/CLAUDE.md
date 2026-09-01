# CLAUDE.md (Backend)

`backend/` · `backend/apps/` 작업 시 이 문서를 따른다.

## 상위 문서 (중복하지 않음)

| 문서 | 내용 |
|------|------|
| [../.cursorrules](../.cursorrules) | 제품 방향·행동 원칙·Cursor 하네스, `_docs/` 필수 읽기, 산출물 제한 |
| [./_docs/BACKEND_RULES.md](./_docs/BACKEND_RULES.md) | FastAPI·Python 코딩 규칙 **(구현 전 필수)** |
| [./_docs/ENTITY_RULE.md](./_docs/ENTITY_RULE.md) | ORM·테이블 추가·수정 시 |
| [./_docs/docker-rules.md](./_docs/docker-rules.md) | Docker·DB·백엔드 생성 전 존재 체크·승인 |

프론트 작업은 [../frontend/.cursorrules](../frontend/.cursorrules)를 따른다.

---

## 런타임 · 실행

| 항목 | 값 |
|------|-----|
| 런타임 | Python 3.13+, FastAPI, Uvicorn |
| 작업 디렉터리 | `backend/apps` |
| 앱 진입점 | `backend/main.py` → `backend/apps/main.py` re-export |
| 로컬 서버 | `uvicorn main:app --reload` (`backend/apps`에서) |
| API 문서 | http://127.0.0.1:8000/docs |
| Docker | `docker compose up --build` (루트 `docker-compose.yaml`) |
| 비밀·키 | `backend/.env` + `core.matrix.vault_keymaker_secret_manager.get_keymaker()` (하드코딩 금지) |

### 개발 도구 (`backend/` 루트)

| 파일 | 용도 |
|------|------|
| [`pyrightconfig.json`](./pyrightconfig.json) | Pyright/Pylance — `extraPaths: ["apps"]` 로 `titanic.*` 등 `apps/` 패키지 임포트 해석 |
| [`pytest.ini`](./pytest.ini) | `testpaths = apps/titanic/tests`, `asyncio_mode = auto` |
| [`pytest-korean-ai.ini`](./pytest-korean-ai.ini) | Kiwi·Ollama 테스트 **이 파일만** (`test_korean_ai.py`) |
| [`requirements-test.txt`](./requirements-test.txt) | 테스트 전용 의존성 (`pytest`, `pytest-asyncio`) |

테스트 의존성 설치·실행 (`backend/` 에서):

```bash
pip install -r requirements-test.txt
python -m pytest -v
```

Kiwi·Ollama 테스트만 (`apps/titanic/tests/test_korean_ai.py`):

```bash
python -m pytest -c pytest-korean-ai.ini -v
```

Ollama 통합 테스트 제외(전처리만):

```bash
python -m pytest -c pytest-korean-ai.ini -v -m "not ollama"
```

---

## `backend/apps` 시블링 구조

도메인은 `backend/apps/<앱명>/` 아래 **형제(sibling)** 로 둔다. 앱마다 `_docs/CLAUDE.md`를 둘 수 있다.

```
backend/apps/
├── main.py              # backend/main.py 로드
├── database.py
├── secretary/           # 인증·프로필 (/auth)
├── admin/               # 관리자 API
├── lifestyle/           # 라이프스타일·채팅
├── titanic/             # Titanic CSV·승객·12인물 API → _docs/CLAUDE.md
├── agora/, doro/        # 기타 스켈레톤
└── …                    # 새 앱도 동일 레벨에 추가
```

| 앱 | API prefix (예) | 전용 CLAUDE.md |
|----|-----------------|----------------|
| `secretary` | `/auth` | — |
| `admin` | `/admin` | — |
| `lifestyle` | `/lifestyle`, 채팅 | — |
| **`titanic`** | **`/api/titanic`** | [**titanic/_docs/CLAUDE.md**](./apps/titanic/_docs/CLAUDE.md) |

새 시블링 앱 추가 시:

1. `backend/apps/<앱>/` 패키지 생성
2. `backend/main.py`에 라우터·ORM metadata 등록
3. 필요하면 `<앱>/_docs/CLAUDE.md` 작성 (Titanic 패턴 참고)
4. [BACKEND_RULES.md](./_docs/BACKEND_RULES.md)와 기존 앱 패턴을 먼저 읽는다

---

## 백엔드 구현 체크리스트

1. [BACKEND_RULES.md](./_docs/BACKEND_RULES.md) 확인
2. 수정 대상 앱의 **기존** 라우터·use case·pg repository 패턴 읽기
3. `AsyncSession` + `Depends(get_db)` 유지
4. 요청/응답 Pydantic 스키마, `detail` 한국어
5. 변경 후 해당 엔드포인트 호출 또는 `uvicorn` 기동 확인
6. Titanic·도메인 변경 시: `cd backend && python -m pytest -v`

### Cursor 멘션 (권장)

```text
@backend/.cursorrules @backend/CLAUDE.md @backend/_docs/BACKEND_RULES.md
```

Titanic 작업 시 추가:

```text
@backend/apps/titanic/_docs/CLAUDE.md
```
