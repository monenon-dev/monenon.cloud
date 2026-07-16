"""Redis 잡 설정 어댑터 — sites/keywords LIST."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict

from redis.asyncio import Redis

from star_craft.zerg.web.app.ports.output.zerg_job_config_port import ZergJobConfigPort
from star_craft.zerg.web.domain import (
    REDIS_KEY_CRAWL_RESULTS,
    REDIS_KEY_HYDRALISK_KEYWORDS,
    REDIS_KEY_HYDRALISK_SITES,
    REDIS_KEY_SCRAPE_RESULTS,
    REDIS_KEY_ZERLING_KEYWORDS,
    REDIS_KEY_ZERLING_SITES,
    CrawlResult,
    ScrapeResult,
    WebJobSpec,
)

logger = logging.getLogger(__name__)


class RedisZergJobConfigAdapter(ZergJobConfigPort):
    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    async def _load_list(self, key: str) -> list[str]:
        raw = await self._redis.lrange(key, 0, -1)
        out: list[str] = []
        for item in raw:
            text = item.decode("utf-8") if isinstance(item, (bytes, bytearray)) else str(item)
            text = text.strip()
            if text:
                out.append(text)
        return out

    async def _replace_list(self, key: str, values: list[str]) -> None:
        pipe = self._redis.pipeline()
        pipe.delete(key)
        if values:
            pipe.rpush(key, *values)
        await pipe.execute()

    async def load_zerling_job(self) -> WebJobSpec:
        sites = await self._load_list(REDIS_KEY_ZERLING_SITES)
        keywords = await self._load_list(REDIS_KEY_ZERLING_KEYWORDS)
        return WebJobSpec(sites=tuple(sites), keywords=tuple(keywords))

    async def load_hydralisk_job(self) -> WebJobSpec:
        sites = await self._load_list(REDIS_KEY_HYDRALISK_SITES)
        keywords = await self._load_list(REDIS_KEY_HYDRALISK_KEYWORDS)
        return WebJobSpec(sites=tuple(sites), keywords=tuple(keywords))

    async def save_crawl_result(self, result: CrawlResult) -> None:
        payload = {
            "ok": result.ok,
            "seeds": result.seeds,
            "keywords": result.keywords,
            "pages": [asdict(p) for p in result.pages],
            "detail": result.detail,
        }
        await self._redis.lpush(REDIS_KEY_CRAWL_RESULTS, json.dumps(payload, ensure_ascii=False))
        await self._redis.ltrim(REDIS_KEY_CRAWL_RESULTS, 0, 49)
        logger.info("[zerg/redis] crawl result saved pages=%s", len(result.pages))

    async def save_scrape_result(self, result: ScrapeResult) -> None:
        payload = {
            "ok": result.ok,
            "sites": result.sites,
            "keywords": result.keywords,
            "snippets": [asdict(s) for s in result.snippets],
            "detail": result.detail,
        }
        await self._redis.lpush(REDIS_KEY_SCRAPE_RESULTS, json.dumps(payload, ensure_ascii=False))
        await self._redis.ltrim(REDIS_KEY_SCRAPE_RESULTS, 0, 49)
        logger.info("[zerg/redis] scrape result saved snippets=%s", len(result.snippets))

    async def seed_zerling_job(self, sites: list[str], keywords: list[str]) -> None:
        await self._replace_list(REDIS_KEY_ZERLING_SITES, sites)
        await self._replace_list(REDIS_KEY_ZERLING_KEYWORDS, keywords)

    async def seed_hydralisk_job(self, sites: list[str], keywords: list[str]) -> None:
        await self._replace_list(REDIS_KEY_HYDRALISK_SITES, sites)
        await self._replace_list(REDIS_KEY_HYDRALISK_KEYWORDS, keywords)
