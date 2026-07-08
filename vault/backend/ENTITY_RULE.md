# 엔티티(테이블) 규칙

> **적용 범위:** `backend/apps/**/models/` 및 DB 테이블을 정의하는 모든 ORM 코드  
> **상위 문서:** [`BACKEND_RULES.md`](BACKEND_RULES.md)

---

## 기본 원칙

이 프로젝트의 **모든 테이블**은 아래를 **반드시** 따른다.

| 항목 | 규칙 |
|------|------|
| 기본 키(PK) 타입 | `int` (정수) |
| 기본 키 컬럼명 | **`id`** (다른 이름 사용 금지: `user_id`, `pk`, `uuid` 등을 PK 이름으로 쓰지 않음) |
| 값 생성 | DB **자동 증감** (`autoincrement` / `SERIAL` / `IDENTITY`) |
| 애플리케이션 입력 | 생성 시 `id`는 **넣지 않음** (`None` / 미지정 → DB가 부여) |

- **외래 키**는 `user_id`, `session_id`처럼 **참조 대상을 드러내는 이름**을 쓴다. PK 이름과 혼동하지 않는다.
- 복합 기본 키·UUID PK·문자열 PK는 **신규 테이블에 도입하지 않는다.**

---

## 1. 시스템 내부용 자동 증감 고유 번호 (기본 키)

신규 엔티티 작성 시 아래 패턴을 **표준**으로 사용한다.

### SQLModel (`Field`) — 참조 패턴

```python
from typing import Optional

from sqlmodel import Field, SQLModel


class Example(SQLModel, table=True):
    __tablename__ = "examples"

    # 시스템 내부용 자동 증감 고유 번호 (기본 키)
    id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_kwargs={"name": "id"},  # DB 컬럼명: id
    )
```

| 속성 | 의미 |
|------|------|
| `Optional[int]` | INSERT 전에는 `None`, 저장 후 DB가 정수 ID 부여 |
| `default=None` | 클라이언트/서비스에서 id를 채우지 않음 |
| `primary_key=True` | 기본 키 |
| `sa_column_kwargs={"name": "id"}` | 물리 컬럼명을 **`id`** 로 고정 |

### SQLAlchemy 2.0 (`Mapped`) — 현재 코드베이스

`secom` 등 기존 모듈은 SQLAlchemy `Mapped` 패턴을 쓴다. **DB 규칙은 동일**하다 (`int` PK, 컬럼명 `id`).

```python
from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Example(Base):
    __tablename__ = "examples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
```

**참고:** 공통 믹스인 `backend/apps/models/int_id_mixin.py` 의 `IntIdPrimaryKeyMixin` 을 상속한다.  
예: `class User(IntIdPrimaryKeyMixin, Base)` (`user_model.py`, `core_tables.py`).

---

## 금지 · 주의

```python
# ❌ PK 이름이 id가 아님
user_id: Mapped[int] = mapped_column(Integer, primary_key=True, ...)

# ❌ UUID·문자열 PK
id: Mapped[str] = mapped_column(String(36), primary_key=True, ...)

# ❌ 애플리케이션이 id를 직접 할당해 INSERT (시퀀스/자동 증감과 충돌)
user = User(id=999, email="...", ...)
```

```python
# ✅ 다른 테이블 참조 — FK는 대상을 나타내는 이름
session_id: Mapped[int] = mapped_column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
```

---

## 새 테이블 체크리스트

1. `__tablename__` 을 복수형·스네이크 케이스로 정했는가 (`users`, `chat_sessions` 등)
2. PK는 **`id: int`** 하나뿐인가
3. `autoincrement` / `default=None` 으로 DB가 ID를 부여하는가
4. API 응답·스키마에서도 식별자 필드명을 **`id`** 로 통일했는가 (별칭 `userId` 는 JSON 변환 레이어에서만 허용, DB 컬럼명은 `id`)

---

## Cursor 고정 명령어

```text
@docs/DevOps/backend/ENTITY_RULE.md @docs/DevOps/backend/BACKEND_RULES.md

모든 테이블 PK는 int 타입, 컬럼명 id, 자동 증감. ENTITY_RULE.md를 따르세요.
```
