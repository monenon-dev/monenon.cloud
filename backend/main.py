import asyncio
import os
from contextlib import asynccontextmanager
import logging
from pathlib import Path

if os.name == "nt":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

from core.matrix.vault_keymaker_secret_manager import get_keymaker

# 전역 환경·키는 Keymaker 한곳에서 로드 (DB·Gemini 공통)
get_keymaker().load_environment()

from fastapi import Depends, FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix import grid_oracle_database_manager as db
from core.matrix.grid_oracle_database_manager import Base, dispose_engine, get_db
from db_health_adapter import check_db_connection
from gemini_caller import GeminiQuotaError, call_gemini
from weather_caller import fetch_current_weather
from weather_chat import augment_message_with_weather, try_weather_chat_reply
try:
    import lifestyle.adapter.outbound.orm.chat_orm  # noqa: F401 — 채팅 테이블 metadata
except ModuleNotFoundError:
    pass
try:
    import lifestyle.adapter.outbound.orm.lifestyle_orm  # noqa: F401 — 라이프스타일 테이블 metadata
except ModuleNotFoundError:
    pass
try:
    from lifestyle.adapter.inbound.api.v1 import lifestyle_router
except ModuleNotFoundError:
    lifestyle_router = None
try:
    from secretary.adapter.inbound.api.v1 import secretary_router
    from secretary.adapter.outbound.orm.user_model import User  # noqa: F401
except ModuleNotFoundError:
    secretary_router = None
try:
    from admin.adapter.inbound.api.v1 import admin_router
    from admin.adapter.outbound.orm.admin_account import AdminAccount  # noqa: F401
    from admin.adapter.outbound.orm.warning import Warning  # noqa: F401
    from admin.app.composition.providers import build_admin_use_case
except ModuleNotFoundError:
    admin_router = None
    build_admin_use_case = None
try:
    from lifestyle.adapter.inbound.api.v1 import chat_router
except ModuleNotFoundError:
    chat_router = None
try:
    import mail.adapter.outbound.orm.mail_orm  # noqa: F401 — 메일 테이블 metadata
    from mail.adapter.inbound.api import mail_api_router
except ModuleNotFoundError:
    mail_api_router = None
try:
    from mail.calendar_app.router import calendar_router
except ModuleNotFoundError:
    calendar_router = None
try:
    from mail.contacts.router import contacts_router
except ModuleNotFoundError:
    contacts_router = None
try:
    import mail.addressbook.models  # noqa: F401 — contacts 테이블 metadata
    from mail.addressbook.router import addressbook_router
except ModuleNotFoundError:
    addressbook_router = None
try:
    import sherlock_homes.adapter.outbound.orm.police_mycroft_contact_orm  # noqa: F401 — mycroft_contacts 테이블
    import sherlock_homes.adapter.outbound.orm.detective_mary_mail_orm  # noqa: F401 — mary_mails 테이블
    from sherlock_homes.adapter.inbound.api import sherlock_router
except ModuleNotFoundError:
    sherlock_router = None
try:
    from star_craft.adapter.inbound.api import star_craft_router
    import star_craft.adapter.outbound.pgvector_vector_repository  # noqa: F401 — spoke_contexts 테이블
except ModuleNotFoundError:
    star_craft_router = None
try:
    from faker.adapter.inbound.api import faker_api_router
except ModuleNotFoundError:
    faker_api_router = None
import titanic.adapter.outbound.orm.passenger_jack_trainer_orm  # noqa: F401 — 승객 metadata
import titanic.adapter.outbound.orm.passenger_rose_model_orm  # noqa: F401 — 부킹 metadata
from titanic.adapter.inbound.api.v1 import titanic_router
try:
    import moneyball.adapter.outbound.orm  # noqa: F401 — moneyball 테이블 metadata
    from moneyball.adapter.inbound.api import moneyball_router
except ModuleNotFoundError as exc:
    moneyball_router = None
    logging.getLogger(__name__).warning(
        "moneyball router disabled (ModuleNotFoundError): %s", exc
    )
# Titanic CSV 자동 시드는 사용자가 업로드할 때만 실행
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "profiles").mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작 시 users 테이블 생성."""
    db.init_engine()
    try:
        if db.engine is None:
            raise RuntimeError("DATABASE_URL이 없어 DB 부트스트랩을 건너뜁니다.")
        async with db.engine.begin() as conn:
            # pgvector 확장 활성화 (spoke_contexts 테이블의 VECTOR 타입 사용)
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.execute(
                text(
                    """
                    DO $$
                    BEGIN
                      IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'wardrobes')
                         AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'closet') THEN
                        ALTER TABLE wardrobes RENAME TO closet;
                      END IF;
                      IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'fridges')
                         AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'refrigerator') THEN
                        ALTER TABLE fridges RENAME TO refrigerator;
                      END IF;
                      IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_warnings')
                         AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'warnings') THEN
                        ALTER TABLE user_warnings RENAME TO warnings;
                      END IF;
                    END $$;
                    """
                )
            )
            await conn.execute(text("DROP TABLE IF EXISTS wardrobes CASCADE"))
            await conn.execute(text("DROP TABLE IF EXISTS fridges CASCADE"))
            for drop_sql in (
                "DROP TABLE IF EXISTS people CASCADE",
                "DROP TABLE IF EXISTS tickets CASCADE",
                "DROP TABLE IF EXISTS cabins CASCADE",
                "DROP TABLE IF EXISTS embarked_ports CASCADE",
                "DROP TABLE IF EXISTS \"Passenger\" CASCADE",
                "DROP TABLE IF EXISTS titanic_passengers CASCADE",
            ):
                await conn.execute(text(drop_sql))
            await conn.run_sync(Base.metadata.create_all)
            for alter_sql in (
                "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS passenger_id VARCHAR",
                "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS name VARCHAR",
                "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS gender VARCHAR",
                "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS age VARCHAR",
                "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS sib_sp VARCHAR",
                "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS parch VARCHAR",
                "ALTER TABLE passengers ADD COLUMN IF NOT EXISTS survived VARCHAR",
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passenger_id VARCHAR",
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS survived VARCHAR",
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pclass VARCHAR",
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket VARCHAR",
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fare VARCHAR",
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cabin VARCHAR",
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS embarked VARCHAR",
            ):
                await conn.execute(text(alter_sql))
            await conn.execute(
                text(
                    "ALTER TABLE warnings ADD COLUMN IF NOT EXISTS "
                    "admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE"
                )
            )
            await conn.execute(
                text(
                    """
                    UPDATE warnings w
                    SET admin_id = a.id
                    FROM (SELECT id FROM admins ORDER BY id LIMIT 1) a
                    WHERE w.admin_id IS NULL AND a.id IS NOT NULL
                    """
                )
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_warnings_admin_id ON warnings (admin_id)")
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_warnings_user_id ON warnings (user_id)")
            )
            await conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                    "created_at TIMESTAMPTZ DEFAULT NOW()"
                )
            )
            await conn.execute(
                text("UPDATE users SET created_at = NOW() WHERE created_at IS NULL")
            )
            await conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                    "profile_image_url VARCHAR(512)"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                    "suspended_until TIMESTAMPTZ"
                )
            )
            for drop_sql in (
                "DROP TABLE IF EXISTS playing_with_neon CASCADE",
                "DROP TABLE IF EXISTS tool_usage_history CASCADE",
                "DROP TABLE IF EXISTS agent_logs CASCADE",
                "DROP TABLE IF EXISTS usage_stats CASCADE",
                "DROP TABLE IF EXISTS documents CASCADE",
                "DROP TABLE IF EXISTS agent_configs CASCADE",
                "DROP TABLE IF EXISTS tool_definitions CASCADE",
            ):
                await conn.execute(text(drop_sql))
            await conn.execute(
                text("ALTER TABLE user_settings DROP COLUMN IF EXISTS lifestyle_json")
            )
            await conn.execute(
                text(
                    "ALTER TABLE warnings ADD COLUMN IF NOT EXISTS "
                    "source VARCHAR(16) NOT NULL DEFAULT 'manual'"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE warnings ADD COLUMN IF NOT EXISTS "
                    "processed_at TIMESTAMPTZ"
                )
            )
        if build_admin_use_case is not None and db.async_session_factory is not None:
            async with db.async_session_factory() as session:
                await build_admin_use_case(session).seed_defaults_if_empty()
    except Exception as e:
        logger.warning("Startup DB bootstrap skipped: %s", e)
    yield
    await dispose_engine()


app = FastAPI(title="TJ Watson Main Page", lifespan=lifespan)

_DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# 로컬 LAN + Vercel 배포(프로덕션·프리뷰). 추가 도메인은 CORS_ORIGINS(쉼표 구분)
_CORS_ORIGIN_REGEX = (
    r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?"
    r"|https://[a-z0-9-]+\.vercel\.app"
    r"|https://(.*\.)?monenon\.cloud"
)


def _cors_allow_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if not raw:
        return list(_DEFAULT_CORS_ORIGINS)
    return [o.strip() for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_origin_regex=_CORS_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

if secretary_router is not None:
    app.include_router(secretary_router)
if admin_router is not None:
    app.include_router(admin_router)
if lifestyle_router is not None:
    app.include_router(lifestyle_router)
if chat_router is not None:
    app.include_router(chat_router)
if mail_api_router is not None:
    app.include_router(mail_api_router)
if sherlock_router is not None:
    app.include_router(sherlock_router)
if calendar_router is not None:
    app.include_router(calendar_router)
if contacts_router is not None:
    app.include_router(contacts_router)
if addressbook_router is not None:
    app.include_router(addressbook_router)
if star_craft_router is not None:
    app.include_router(star_craft_router)
if faker_api_router is not None:
    app.include_router(faker_api_router)
app.include_router(titanic_router)
if moneyball_router is not None:
    app.include_router(moneyball_router)


@app.get("/")
def read_root():
    return {"message": "FAST API 메인 페이지 ", "docs": "/docs"}


@app.get("/db-check")
async def db_check(session: AsyncSession = Depends(get_db)):
    return await check_db_connection(session)


@app.get("/weather")
def read_weather(city: str | None = None):
    """
    OpenWeather 현재 날씨. 쿼리 `city` 생략 시 .env `OPENWEATHER_CITY`(기본 Seoul).
    """
    try:
        return fetch_current_weather(city)
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=400)
    except RuntimeError as e:
        return JSONResponse({"detail": str(e)}, status_code=503)
    except Exception as e:
        return JSONResponse({"detail": str(e)}, status_code=502)


# =============================================================================
# Gemini — HTTP 스키마·라우트 (모델·키는 Keymaker, 호출은 gemini_caller)
# =============================================================================


class AgentChatBody(BaseModel):
    prompt: str = Field(..., min_length=1)
    user_id: int | None = Field(default=None, ge=1)
    speech_tone: str | None = Field(
        default=None,
        description="마이페이지 말투: friendly | formal | humorous",
    )
    user_type: str | None = Field(
        default=None,
        description="온보딩 업종/역할: 직장인 | 학생 | 프리랜서_창업자",
    )
    industry: str | None = Field(
        default=None,
        description="직장인 업종: IT개발 | 마케팅 | 영업 | 인사 | 재무회계 | 기획전략 | 기타",
    )


class ChatMessageBody(BaseModel):
    """POST /chat 요청 본문."""

    message: str = Field(..., min_length=1, description="사용자 메시지")


@app.post("/chat")
def chat(body: ChatMessageBody):
    """
    JSON `{"message": "..."}` → 응답 JSON.
    날씨 질문이면 OpenWeather, 그 외 Gemini (Keymaker 기본 모델).
    """
    try:
        weather = try_weather_chat_reply(body.message)
        if weather is not None:
            model_id, reply = weather
            return {"model": model_id, "reply": reply}

        km = get_keymaker()
        chat_model = km.gemini_chat_model_id()
        prompt = augment_message_with_weather(body.message)
        reply = call_gemini(prompt, model=chat_model)
        return {"model": chat_model, "reply": reply}
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=400)
    except GeminiQuotaError as e:
        return JSONResponse({"detail": str(e)}, status_code=429)
    except RuntimeError as e:
        return JSONResponse({"detail": str(e)}, status_code=503)
    except Exception as e:
        return JSONResponse({"detail": str(e)}, status_code=502)


@app.post("/agent/chat")
async def agent_chat(body: AgentChatBody, session: AsyncSession = Depends(get_db)):
    """프론트 Monenon 채팅 — 응답 우선 모델로 Gemini 호출."""
    from lifestyle.app.agent_system_prompt import with_agent_system_prompt
    from lifestyle.app.chat_context import augment_prompt_with_user_context

    prompt = body.prompt
    if body.user_id is not None:
        prompt = await augment_prompt_with_user_context(session, body.user_id, prompt)
        logger.info(
            "[agent_chat] user_id=%s speech_tone=%s user_type=%s industry=%s prompt_chars=%s",
            body.user_id,
            body.speech_tone,
            body.user_type,
            body.industry,
            len(prompt),
        )
    prompt = with_agent_system_prompt(
        prompt,
        speech_tone=body.speech_tone,
        user_type=body.user_type,
        industry=body.industry,
    )
    try:
        km = get_keymaker()
        chat_model = km.gemini_chat_model_id()
        answer = call_gemini(prompt, model=chat_model)
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=400)
    except GeminiQuotaError as e:
        return JSONResponse({"detail": str(e)}, status_code=429)
    except RuntimeError as e:
        return JSONResponse({"detail": str(e)}, status_code=503)
    except Exception as e:
        return JSONResponse({"detail": str(e)}, status_code=502)
    return {"answer": answer, "confidence": 0.0, "sources": []}


@app.get("/agent/logs")
def agent_logs():
    """프론트 Execution Logs 탭용. 추후 도구 실행 로그를 채울 수 있음."""
    return []


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
