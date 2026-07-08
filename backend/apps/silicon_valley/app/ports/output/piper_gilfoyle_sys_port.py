from __future__ import annotations

from abc import ABC, abstractmethod

from tailor.apps.silicon_valley.app.dtos.piper_gilfoyle_sys_dto import GilfoyleSysQuery, GilfoyleSysResponse


class GilfoyleSysPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: GilfoyleSysQuery) -> GilfoyleSysResponse:
        '''길포일 시스템 레포지터리 추상 메소드'''
        pass
