"""크롤/스크랩 잡 설정 포트 — Redis 등에서 sites·keywords 로드."""

from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.zerg.web.domain import CrawlResult, ScrapeResult, WebJobSpec


class ZergJobConfigPort(ABC):
    @abstractmethod
    async def load_zerling_job(self) -> WebJobSpec:
        """크롤러용 시드 URL + 키워드."""

    @abstractmethod
    async def load_hydralisk_job(self) -> WebJobSpec:
        """스크래퍼용 대상 URL + 키워드."""

    @abstractmethod
    async def save_crawl_result(self, result: CrawlResult) -> None:
        """크롤 결과를 저장 (Redis 등)."""

    @abstractmethod
    async def save_scrape_result(self, result: ScrapeResult) -> None:
        """스크랩 결과를 저장 (Redis 등)."""

    @abstractmethod
    async def seed_zerling_job(self, sites: list[str], keywords: list[str]) -> None:
        """PoC용 Redis 시드."""

    @abstractmethod
    async def seed_hydralisk_job(self, sites: list[str], keywords: list[str]) -> None:
        """PoC용 Redis 시드."""
