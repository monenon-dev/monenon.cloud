from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.app.dtos.police_mycroft_contact_dto import MycroftContactQuery, MycroftContactResponse, ContactCommand, ContactUploadResult


class MycroftContactPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: MycroftContactQuery) -> MycroftContactResponse:
        '''마이크로프트 홈즈의 자기 소개 레포지토리 추상 메소드'''
        pass

    @abstractmethod
    async def upload_contacts(self, commands: list[ContactCommand]) -> ContactUploadResult:
        '''주소록 데이터를 DB에 저장하는 추상 메소드'''
        pass
