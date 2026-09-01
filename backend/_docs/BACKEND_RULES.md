# Backend 코딩 규칙 (FastAPI)

> **적용 범위:** `backend/apps/` 및 하위 Python 코드  
> **상위 하네스:** `backend/.cursorrules`, `backend/CLAUDE.md`

## 구현 전 필수

1. 이 파일과 동일 폴더의 ERD·ENTITY 문서를 확인한다.
2. DB 테이블·ORM 추가·수정 시 [`ENTITY_RULE.md`](ENTITY_RULE.md)를 따른다.
3. Docker·DB·백엔드 **컨테이너/스택 생성** 시 [`docker-rules.md`](docker-rules.md)를 따른다 (기존 있으면 승인 전 생성 금지).
4. 수정 대상 모듈의 **기존 패턴**(라우터·서비스·모델 분리)을 먼저 읽는다.
5. 문서·코드가 충돌하면 **이 디렉터리 규칙 → 기존 코드 스타일** 순으로 따른다.

---

## 프로젝트 구조

```
backend/apps/
  main.py              # FastAPI 앱·라우트 등록
  database.py          # AsyncSession, Base
  lifestyle/           # 라이프스타일 API
    controllers/
      closet/            # closet + closet_items
      refrigerator/      # refrigerator + refrigerator_items
      music/             # music + music_items
      settings_controller.py
      deps.py, schemas.py
  chat/                # 채팅 세션·메시지 API
    controllers/
      chat_sessions/   # chat_sessions
      messages/        # messages
  secom/               # 사용자 인증·프로필 (/auth)
  admin/               # 관리자 API (/admin/users)
  gemini_caller.py     # Gemini 호출
  weather_chat.py      # 날씨·채팅 라우팅
  matrix/app/keymaker.py  # 환경 변수·API 키
```

- 새 도메인 API는 `*/controllers/` + `*/models/` 로 분리한다.
- `main.py`에는 얇은 라우트만 두고, 비즈니스 로직은 서비스/컨트롤러로 뺀다.

---

## FastAPI · Python

- **비동기 DB**는 `AsyncSession`, `Depends(get_db)` 패턴을 유지한다.
- 요청/응답은 **Pydantic `BaseModel`** 로 스키마를 명시한다.
- HTTP 오류는 `HTTPException` 또는 `JSONResponse(status_code=...)` 로 일관되게 반환한다.
- 사용자-facing `detail` 메시지는 **한국어**로 작성한다.
- 환경 변수·API 키는 **`get_keymaker()`** 경유. 코드에 비밀값을 하드코딩하지 않는다.

```python
# ✅ 라우트 예시
@router.get("/items", response_model=list[ItemOut])
async def list_items(session: AsyncSession = Depends(get_db)) -> list[ItemOut]:
    ...
```

---

## 단순성 · 수정 범위

- 요청 범위 밖 엔드포인트·리팩터를 하지 않는다.
- 날씨·채팅 등 기존 모듈(`weather_chat`, `gemini_caller`)이 있으면 **재사용**한다.
- 불필요한 추상화·팩토리·미사용 예외 처리를 추가하지 않는다.

---

## 검증

| 작업 | 명령 ( `backend/apps` 기준 ) |
|------|------------------------------|
| 로컬 서버 | `uvicorn main:app --reload` |
| API 문서 | http://127.0.0.1:8000/docs |

가능하면 변경 후 해당 엔드포인트를 호출해 응답 형식을 확인한다.

---

## Cursor 고정 명령어

```text
@backend/.cursorrules @backend/_docs/BACKEND_RULES.md @backend/_docs/docker-rules.md

backend/_docs 규칙과 backend/apps 기존 패턴을 따르세요. 요청 범위만 수정하세요.
Docker·DB·백엔드 생성 요청은 기존 스택을 먼저 확인하고, 있으면 승인 전에 만들지 마세요.
```
