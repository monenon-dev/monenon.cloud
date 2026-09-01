"""Hydralisk 스크랩 유스케이스 입력 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.zerg.web.domain import ScrapeResult


class HydraliskScrapeUseCase(ABC):
    @abstractmethod
    async def scrape(
        self,
        *,
        sites: list[str] | None = None,
        keywords: list[str] | None = None,
        max_pages: int = 20,
    ) -> ScrapeResult:
        """
        Redis(기본) 또는 override 대상 URL을 가져와
        키워드 주변 텍스트 스니펫을 추출한다.
        """
