from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.police_mycroft_libraraian_schema import MycroftContactSchema, ContactSchema
from sherlock_homes.app.dtos.police_mycroft_contact_dto import MycroftContactResponse, ContactUploadResult


class MycroftContactUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: MycroftContactSchema) -> MycroftContactResponse:
        '''마이크로프트 홈즈의 자기소개 메소드'''
        pass

    @abstractmethod
    async def upload_contacts(self, contacts: list[ContactSchema]) -> ContactUploadResult:
        '''Google 주소록 CSV 파일을 파싱하여 DB에 저장'''
        pass
