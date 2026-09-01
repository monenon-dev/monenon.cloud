"""Zerling 크롤 유스케이스 입력 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.zerg.web.domain import CrawlResult


class ZerlingCrawlUseCase(ABC):
    @abstractmethod
    async def crawl(
        self,
        *,
        sites: list[str] | None = None,
        keywords: list[str] | None = None,
        max_pages: int = 20,
        max_depth: int = 1,
    ) -> CrawlResult:
        """
        Redis(기본) 또는 override로 시드·키워드를 받아 링크를 탐색한다.
        키워드가 있으면 URL/앵커 텍스트에 매칭되는 페이지만 결과에 남긴다.
        """
