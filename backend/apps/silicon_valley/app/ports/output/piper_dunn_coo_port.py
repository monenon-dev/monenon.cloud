from __future__ import annotations

from abc import ABC, abstractmethod

from tailor.apps.silicon_valley.app.dtos.piper_dunn_coo_dto import DunnCooQuery, DunnCooResponse


class DunnCooPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: DunnCooQuery) -> DunnCooResponse:
        '''재러드 던 COO 레포지터리 추상 메소드'''
        pass
