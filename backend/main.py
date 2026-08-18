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

from fastapi import Depends, FastAPI, Request
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
    import orchestration.adapter.outbound.orm.chat_orm  # noqa: F401 — 채팅 테이블 metadata
except ModuleNotFoundError:
    pass
try:
    import orchestration.adapter.outbound.orm.orchestration_orm  # noqa: F401 — 오케스트레이션 테이블 metadata
    import orchestration.adapter.outbound.orm.daily_briefing_orm  # noqa: F401 — daily_briefings
    import orchestration.adapter.outbound.orm.user_integration_orm  # noqa: F401 — user_integrations
    import orchestration.adapter.outbound.orm.proactive_alert_orm  # noqa: F401
    import orchestration.adapter.outbound.orm.user_notification_settings_orm  # noqa: F401
except ModuleNotFoundError:
    pass
try:
    from orchestration.adapter.inbound.api.v1 import orchestration_router
    from orchestration.adapter.inbound.api.schemas.briefing_schema import (
        BriefingNotesRequest,
        BriefingReviewRequest,
    )
    from orchestration.adapter.inbound.api.schemas.weekly_report_schema import (
        WeeklyReportRequest,
    )
except ModuleNotFoundError:
    orchestration_router = None
    WeeklyReportRequest = None  # type: ignore[misc, assignment]
    BriefingReviewRequest = None  # type: ignore[misc, assignment]
    BriefingNotesRequest = None  # type: ignore[misc, assignment]
try:
    from secretary.adapter.inbound.api.v1 import secretary_router
except Exception as e:
    logging.getLogger(__name__).exception(
        "secretary_router import failed — /auth/login 등 비활성: %s", e
    )
    secretary_router = None
else:
    # ORM 메타데이터 등록 (실패해도 로그인 라우터는 유지)
    try:
        from secretary.adapter.outbound.orm.user_model import User  # noqa: F401
        from secretary.adapter.outbound.orm.kakao_account import KakaoAccount  # noqa: F401
    except Exception as e:
        logging.getLogger(__name__).warning(
            "secretary ORM import skipped: %s", e
        )
try:
    from admin.adapter.inbound.api.v1 import admin_router
    from admin.adapter.outbound.orm.admin_account import AdminAccount  # noqa: F401
    from admin.adapter.outbound.orm.warning import Warning  # noqa: F401
    from admin.app.composition.providers import build_admin_use_case
except ModuleNotFoundError:
    admin_router = None
    build_admin_use_case = None
try:
    from orchestration.adapter.inbound.api.v1 import chat_router
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
try:
    from gateway.adapter.inbound.api import gateway_api_router
except ModuleNotFoundError as exc:
    gateway_api_router = None
    logging.getLogger(__name__).warning(
        "gateway router disabled (ModuleNotFoundError): %s", exc
    )
try:
    from silicon_valley.adapter.inbound.api import silicon_valley_api_router
except Exception as exc:
    silicon_valley_api_router = None
    logging.getLogger(__name__).warning(
        "silicon_valley router disabled: %s", exc
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
            await conn.execute(
                text(
                    "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS "
                    "kakao_calendar_sync BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE user_notification_settings "
                    "ADD COLUMN IF NOT EXISTS briefing_hour INTEGER NOT NULL DEFAULT 7"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE user_notification_settings "
                    "ADD COLUMN IF NOT EXISTS briefing_minute INTEGER NOT NULL DEFAULT 0"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE user_notification_settings "
                    "ADD COLUMN IF NOT EXISTS density_threshold INTEGER NOT NULL DEFAULT 3"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE user_notification_settings "
                    "ADD COLUMN IF NOT EXISTS active_hours_start INTEGER NOT NULL DEFAULT 8"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE user_notification_settings "
                    "ADD COLUMN IF NOT EXISTS active_hours_end INTEGER NOT NULL DEFAULT 20"
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
    try:
        from orchestration.app.briefing.scheduler import start_briefing_scheduler

        start_briefing_scheduler()
    except Exception as e:
        logger.warning("Briefing scheduler start skipped: %s", e)
    try:
        from orchestration.app.watcher.scheduler import start_watcher_scheduler

        start_watcher_scheduler()
    except Exception as e:
        logger.warning("Watcher scheduler start skipped: %s", e)
    yield
    try:
        from orchestration.app.watcher.scheduler import stop_watcher_scheduler

        stop_watcher_scheduler()
    except Exception as e:
        logger.warning("Watcher scheduler shutdown skipped: %s", e)
    try:
        from orchestration.app.briefing.scheduler import stop_briefing_scheduler

        stop_briefing_scheduler()
    except Exception as e:
        logger.warning("Briefing scheduler shutdown skipped: %s", e)
    try:
        from lol.neo4j import close_driver

        await close_driver()
    except Exception as e:
        logger.warning("Neo4j driver shutdown skipped: %s", e)
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
if orchestration_router is not None:
    app.include_router(orchestration_router)
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
if gateway_api_router is not None:
    app.include_router(gateway_api_router)
if silicon_valley_api_router is not None:
    app.include_router(silicon_valley_api_router)


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
    force_refresh: bool = Field(
        default=False,
        description="브리핑 다시 생성 시 오늘자 캐시를 무시하고 재실행",
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


def _basic_chat_reply(message: str) -> dict:
    weather = try_weather_chat_reply(message)
    if weather is not None:
        model_id, reply = weather
        return {"model": model_id, "reply": reply}
    km = get_keymaker()
    chat_model = km.gemini_chat_model_id()
    prompt = augment_message_with_weather(message)
    reply = call_gemini(prompt, model=chat_model)
    return {"model": chat_model, "reply": reply}


@app.post("/chat/guest")
def chat_guest(body: ChatMessageBody, request: Request):
    """
    비로그인 게스트용 기본 채팅 — Moneo 에이전트 프롬프트·DB 저장 없음.
    IP 기준 일일 호출 한도 적용.
    """
    from guest_chat_limit import GUEST_DAILY_LIMIT, check_guest_quota, increment_guest_quota

    client_ip = request.client.host if request.client else "unknown"
    allowed, used, limit = check_guest_quota(client_ip)
    if not allowed:
        return JSONResponse(
            {
                "detail": f"게스트 일일 이용 한도({limit}회)를 모두 사용했습니다. 로그인 후 이용해 주세요.",
                "guest_used": used,
                "guest_limit": limit,
                "guest_remaining": 0,
            },
            status_code=429,
        )
    try:
        payload = _basic_chat_reply(body.message)
        used_after, limit, remaining = increment_guest_quota(client_ip)
        return {
            **payload,
            "guest_used": used_after,
            "guest_limit": limit,
            "guest_remaining": remaining,
        }
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
    """프론트 Monenon 채팅 — 의도 분류 후 브리핑·리포트 그래프 또는 Gemini."""
    from orchestration.app.use_cases.run_agent_chat import run_agent_chat

    if body.user_id is not None:
        logger.info(
            "[agent_chat] user_id=%s speech_tone=%s user_type=%s industry=%s prompt_chars=%s",
            body.user_id,
            body.speech_tone,
            body.user_type,
            body.industry,
            len(body.prompt),
        )
    try:
        return await run_agent_chat(
            session,
            prompt=body.prompt,
            user_id=body.user_id,
            speech_tone=body.speech_tone,
            user_type=body.user_type,
            industry=body.industry,
            force_refresh=bool(body.force_refresh),
        )
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=400)
    except GeminiQuotaError as e:
        return JSONResponse({"detail": str(e)}, status_code=429)
    except RuntimeError as e:
        return JSONResponse({"detail": str(e)}, status_code=503)
    except Exception as e:
        logger.exception("[agent_chat] failed: %s", e)
        return JSONResponse({"detail": str(e)}, status_code=502)


@app.get("/agent/briefing/today")
async def agent_briefing_today(
    user_id: int,
    speech_tone: str | None = None,
    user_type: str | None = None,
    industry: str | None = None,
    force_refresh: bool = False,
    session: AsyncSession = Depends(get_db),
):
    """오늘자 능동적 브리핑 — 없으면 LangGraph로 동기 생성 후 반환."""
    from orchestration.app.use_cases.get_or_create_today_briefing import (
        get_or_create_today_briefing,
    )
    from secretary.adapter.outbound.orm.user_model import User
    from sqlalchemy import select

    if user_id < 1:
        return JSONResponse({"detail": "user_id가 필요합니다."}, status_code=400)
    user_row = await session.execute(select(User).where(User.id == user_id))
    if user_row.scalar_one_or_none() is None:
        return JSONResponse({"detail": "사용자를 찾을 수 없습니다."}, status_code=404)
    try:
        payload = await get_or_create_today_briefing(
            session,
            user_id=user_id,
            speech_tone=speech_tone,
            user_type=user_type,
            industry=industry,
            force_refresh=force_refresh,
        )
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=400)
    except GeminiQuotaError as e:
        return JSONResponse({"detail": str(e)}, status_code=429)
    except RuntimeError as e:
        return JSONResponse({"detail": str(e)}, status_code=503)
    except Exception as e:
        logger.exception("[agent_briefing_today] failed: %s", e)
        return JSONResponse({"detail": "오늘의 브리핑을 불러오지 못했습니다."}, status_code=502)
    return payload


@app.post("/agent/briefing/{briefing_id}/review")
async def agent_briefing_review(
    briefing_id: int,
    body: BriefingReviewRequest,
    session: AsyncSession = Depends(get_db),
):
    """검토 대기 브리핑 문장에 대해 포함/제외 결정."""
    from orchestration.app.use_cases.resolve_briefing_review import resolve_briefing_review
    from secretary.adapter.outbound.orm.user_model import User
    from sqlalchemy import select

    user_row = await session.execute(select(User).where(User.id == body.user_id))
    if user_row.scalar_one_or_none() is None:
        return JSONResponse({"detail": "사용자를 찾을 수 없습니다."}, status_code=404)
    try:
        payload = await resolve_briefing_review(
            session,
            briefing_id=briefing_id,
            user_id=body.user_id,
            decision=body.decision,
        )
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=400)
    except Exception as e:
        logger.exception("[agent_briefing_review] failed: %s", e)
        return JSONResponse({"detail": "브리핑 검토 결과를 저장하지 못했습니다."}, status_code=502)
    return payload


@app.patch("/agent/briefing/today/notes")
async def agent_briefing_today_notes(
    body: BriefingNotesRequest,
    session: AsyncSession = Depends(get_db),
):
    """오늘 브리핑에 사용자 메모를 저장한다."""
    from orchestration.app.use_cases.update_briefing_notes import update_today_briefing_notes
    from secretary.adapter.outbound.orm.user_model import User
    from sqlalchemy import select

    user_row = await session.execute(select(User).where(User.id == body.user_id))
    if user_row.scalar_one_or_none() is None:
        return JSONResponse({"detail": "사용자를 찾을 수 없습니다."}, status_code=404)
    try:
        payload = await update_today_briefing_notes(
            session,
            user_id=body.user_id,
            notes=body.notes,
        )
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=400)
    except Exception as e:
        logger.exception("[agent_briefing_notes] failed: %s", e)
        return JSONResponse({"detail": "브리핑 메모를 저장하지 못했습니다."}, status_code=502)
    return payload


@app.post("/agent/report/weekly")
async def agent_weekly_report(
    body: WeeklyReportRequest,
    session: AsyncSession = Depends(get_db),
):
    """최근 7일 daily_briefings를 종합한 주간 업무 리포트 (동기 생성)."""
    from orchestration.app.use_cases.run_weekly_report import run_weekly_report
    from secretary.adapter.outbound.orm.user_model import User
    from sqlalchemy import select

    user_row = await session.execute(select(User).where(User.id == body.user_id))
    if user_row.scalar_one_or_none() is None:
        return JSONResponse({"detail": "사용자를 찾을 수 없습니다."}, status_code=404)

    speech_tone = body.speech_tone
    user_type = body.user_type
    industry = body.industry

    try:
        payload = await run_weekly_report(
            session=session,
            user_id=body.user_id,
            speech_tone=speech_tone,
            user_type=user_type,
            industry=industry,
        )
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=400)
    except GeminiQuotaError as e:
        return JSONResponse({"detail": str(e)}, status_code=429)
    except RuntimeError as e:
        return JSONResponse({"detail": str(e)}, status_code=503)
    except Exception as e:
        logger.exception("[agent_weekly_report] failed: %s", e)
        return JSONResponse({"detail": "주간 리포트 생성에 실패했습니다."}, status_code=502)
    return payload


@app.get("/agent/logs")
def agent_logs():
    """프론트 Execution Logs 탭용. 추후 도구 실행 로그를 채울 수 있음."""
    return []


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
