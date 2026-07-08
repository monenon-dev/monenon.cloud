from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def check_db_connection(db: AsyncSession) -> dict:
    """Neon/Postgres 연결 여부를 SELECT NOW()로 확인. 실패 시에도 예외 대신 dict로 반환."""
    try:
        result = await db.execute(text("SELECT NOW();"))
        now = result.scalar()
        return {"status": "success", "neon_time": now}
    except Exception as e:
        return {"status": "error", "message": str(e)}
