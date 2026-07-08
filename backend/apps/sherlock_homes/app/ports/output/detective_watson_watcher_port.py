from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.app.dtos.detective_watson_watcher_dto import WatsonWatcherQuery, WatsonWatcherResponse


class WatsonWatcherPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: WatsonWatcherQuery) -> WatsonWatcherResponse:
        '''존 왓슨의 자기 소개 레포지토리 추상 메소드'''
        pass
