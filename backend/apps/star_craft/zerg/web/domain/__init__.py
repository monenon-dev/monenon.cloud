"""저그 웹 수집 도메인 — Zerling(크롤) / Hydralisk(스크랩)."""

from __future__ import annotations

from dataclasses import dataclass, field


# Redis 키 (기본). 어댑터에서 override 가능.
REDIS_KEY_ZERLING_SITES = "star_craft:zerg:zerling:sites"
REDIS_KEY_ZERLING_KEYWORDS = "star_craft:zerg:zerling:keywords"
REDIS_KEY_HYDRALISK_SITES = "star_craft:zerg:hydralisk:sites"
REDIS_KEY_HYDRALISK_KEYWORDS = "star_craft:zerg:hydralisk:keywords"
REDIS_KEY_CRAWL_RESULTS = "star_craft:zerg:zerling:results"
REDIS_KEY_SCRAPE_RESULTS = "star_craft:zerg:hydralisk:results"


@dataclass(frozen=True)
class WebJobSpec:
    """Redis(또는 요청 override)에서 온 사이트·키워드."""

    sites: tuple[str, ...]
    keywords: tuple[str, ...]


@dataclass(frozen=True)
class DiscoveredPage:
    url: str
    matched_keywords: tuple[str, ...] = ()
    depth: int = 0


@dataclass
class CrawlResult:
    ok: bool
    seeds: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    pages: list[DiscoveredPage] = field(default_factory=list)
    detail: str | None = None


@dataclass(frozen=True)
class ScrapedSnippet:
    url: str
    keyword: str
    excerpt: str


@dataclass
class ScrapeResult:
    ok: bool
    sites: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    snippets: list[ScrapedSnippet] = field(default_factory=list)
    detail: str | None = None
