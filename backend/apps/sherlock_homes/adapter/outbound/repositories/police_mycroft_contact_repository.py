from __future__ import annotations

import logging

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from sherlock_homes.adapter.outbound.orm.police_mycroft_contact_orm import ContactOrm
from sherlock_homes.app.dtos.police_mycroft_contact_dto import (
    MycroftContactQuery, MycroftContactResponse,
    ContactCommand, ContactUploadResult,
)
from sherlock_homes.app.ports.output.police_mycroft_contact_port import MycroftContactPort

logger = logging.getLogger(__name__)


class MycroftContactPgRepository(MycroftContactPort):

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def introduce_myself(self, query: MycroftContactQuery) -> MycroftContactResponse:
        '''마이크로프트의 자기소개'''
        logger.info(f"[MycroftContactPgRepository] introduce_myself | id={query.id} name={query.name}")
        return MycroftContactResponse(
            id=query.id,
            name=query.name,
        )

    async def upload_contacts(self, commands: list[ContactCommand]) -> ContactUploadResult:
        '''기존 연락처를 모두 삭제하고 새 데이터로 교체 (Google 주소록 전체 동기화)'''
        logger.info(f"[MycroftContactPgRepository] upload_contacts | count={len(commands)}")
        await self.session.execute(delete(ContactOrm))
        rows = [
            ContactOrm(
                first_name=cmd.first_name,
                middle_name=cmd.middle_name,
                last_name=cmd.last_name,
                name_prefix=cmd.name_prefix,
                name_suffix=cmd.name_suffix,
                nickname=cmd.nickname,
                organization_name=cmd.organization_name,
                organization_title=cmd.organization_title,
                organization_department=cmd.organization_department,
                birthday=cmd.birthday,
                notes=cmd.notes,
                labels=cmd.labels,
                email_1=cmd.email_1,
                email_2=cmd.email_2,
                phone_1=cmd.phone_1,
            )
            for cmd in commands
        ]
        self.session.add_all(rows)
        await self.session.flush()
        await self.session.commit()
        return ContactUploadResult(
            count=len(rows),
            message=f"{len(rows)}개 연락처가 저장되었습니다.",
        )
