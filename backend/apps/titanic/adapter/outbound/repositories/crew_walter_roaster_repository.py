from __future__ import annotations

import logging

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession

import core.matrix.grid_oracle_database_manager as _db_manager
from titanic.app.dtos.crew_walter_roaster_dto import WalterRoasterQuery, WalterRoasterResponse
from titanic.app.ports.output.crew_walter_roaster_port import WalterRoasterPort

logger = logging.getLogger(__name__)


def _to_sync_url(async_url: str) -> str:
    """asyncpg URL → psycopg2 URL 변환 (grid_oracle_database_manager 역방향)"""
    url = str(async_url)
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    url = url.replace("postgres://", "postgresql+psycopg2://")
    return url


class WalterRoasterRepository(WalterRoasterPort):
    '''PostgreSQL을 이용한 월터의 승객 명단 관리 저장소'''

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    _JOIN_SQL = """
        SELECT p.passenger_id, p.name, p.gender, p.age, p.sib_sp, p.parch, p.survived,
               b.pclass, b.ticket, b.fare, b.cabin, b.embarked
        FROM passengers p
        LEFT JOIN bookings b ON b.passenger_id = p.passenger_id
    """

    def _sync_engine(self):
        sync_url = _to_sync_url(_db_manager.engine.url.render_as_string(hide_password=False))
        return create_engine(sync_url)

    def get_train_set(self) -> pd.DataFrame:
        '''survived IS NOT NULL 인 승객 + 예약 정보를 데이터프레임으로 반환'''
        sql = self._JOIN_SQL + "WHERE p.survived IS NOT NULL"
        return pd.read_sql(sql, self._sync_engine())

    def get_test_set(self) -> pd.DataFrame:
        '''survived IS NULL 인 승객 + 예약 정보를 데이터프레임으로 반환'''
        sql = self._JOIN_SQL + "WHERE p.survived IS NULL"
        return pd.read_sql(sql, self._sync_engine())

    async def introduce_myself(self, query: WalterRoasterQuery) -> WalterRoasterResponse:

        '''앤드류 설계자의 자기 소개 레포지토리 구현 메소드'''

        logger.info(f"[WalterRoasterRepository] introduce_myself 진입 | request_data={query}")

        response: WalterRoasterResponse = WalterRoasterResponse(
            id= query.id * 10000,
            name= query.name + "가 레포지토리에 다녀옴"
        )
        return response
