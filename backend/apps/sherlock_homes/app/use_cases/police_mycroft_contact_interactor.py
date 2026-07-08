from __future__ import annotations

from sherlock_homes.adapter.inbound.api.schemas.police_mycroft_libraraian_schema import MycroftContactSchema, ContactSchema
from sherlock_homes.app.dtos.police_mycroft_contact_dto import MycroftContactQuery, MycroftContactResponse, ContactCommand, ContactUploadResult
from sherlock_homes.app.ports.input.police_mycroft_contact_use_case import MycroftContactUseCase
from sherlock_homes.app.ports.output.police_mycroft_contact_port import MycroftContactPort


class MycroftContactInteractor(MycroftContactUseCase):

    def __init__(self, repository: MycroftContactPort):
        self.repository = repository

    async def introduce_myself(self, schema: MycroftContactSchema) -> MycroftContactResponse:
        '''마이크로프트 홈즈의 자기소개 인터렉트'''
        return await self.repository.introduce_myself(MycroftContactQuery(
            id=schema.id,
            name=schema.name
        ))

    async def upload_contacts(self, contacts: list[ContactSchema]) -> ContactUploadResult:
        '''ContactSchema 리스트를 ContactCommand로 변환 후 레포지토리에 위임'''
        commands = [
            ContactCommand(
                first_name=c.first_name,
                middle_name=c.middle_name,
                last_name=c.last_name,
                name_prefix=c.name_prefix,
                name_suffix=c.name_suffix,
                nickname=c.nickname,
                organization_name=c.organization_name,
                organization_title=c.organization_title,
                organization_department=c.organization_department,
                birthday=c.birthday,
                notes=c.notes,
                labels=c.labels,
                email_1=c.email_1,
                email_2=c.email_2,
                phone_1=c.phone_1,
            )
            for c in contacts
        ]
        return await self.repository.upload_contacts(commands)
