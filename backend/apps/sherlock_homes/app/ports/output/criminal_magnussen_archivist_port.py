from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.app.dtos.criminal_magnussen_archivist_dto import MagnussenArchivistQuery, MagnussenArchivistResponse


class MagnussenArchivistPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: MagnussenArchivistQuery) -> MagnussenArchivistResponse:
        '''마그누센의 자기 소개 레포지토리 추상 메소드'''
        pass
