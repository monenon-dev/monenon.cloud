"""저그 웹 수집 DI."""

from __future__ import annotations

from functools import lru_cache

from redis.asyncio import Redis

from core.matrix.vault_keymaker_secret_manager import get_keymaker
from star_craft.zerg.web.adapter.outbound.httpx_page_fetch_adapter import HttpxPageFetchAdapter
from star_craft.zerg.web.adapter.outbound.redis_zerg_job_config_adapter import (
    RedisZergJobConfigAdapter,
)
from star_craft.zerg.web.adapter.outbound.stdlib_html_extract_adapter import (
    StdlibHtmlExtractAdapter,
)
from star_craft.zerg.web.app.ports.input.hydralisk_scrape_use_case import HydraliskScrapeUseCase
from star_craft.zerg.web.app.ports.input.zerling_crawl_use_case import ZerlingCrawlUseCase
from star_craft.zerg.web.app.ports.output.zerg_job_config_port import ZergJobConfigPort
from star_craft.zerg.web.app.use_cases.zerg_hydralisk_scraper_interactor import (
    ZergHydraliskScraperInteractor,
)
from star_craft.zerg.web.app.use_cases.zerg_zerling_crawler_interactor import (
    ZergZerlingCrawlerInteractor,
)


@lru_cache(maxsize=1)
def _redis_client() -> Redis:
    return Redis.from_url(get_keymaker().redis_url(), decode_responses=False)


def get_zerg_job_config() -> ZergJobConfigPort:
    return RedisZergJobConfigAdapter(_redis_client())


def get_zerling_crawl_use_case() -> ZerlingCrawlUseCase:
    jobs = get_zerg_job_config()
    return ZergZerlingCrawlerInteractor(
        jobs=jobs,
        fetcher=HttpxPageFetchAdapter(),
        extractor=StdlibHtmlExtractAdapter(),
    )


def get_hydralisk_scrape_use_case() -> HydraliskScrapeUseCase:
    jobs = get_zerg_job_config()
    return ZergHydraliskScraperInteractor(
        jobs=jobs,
        fetcher=HttpxPageFetchAdapter(),
        extractor=StdlibHtmlExtractAdapter(),
    )
