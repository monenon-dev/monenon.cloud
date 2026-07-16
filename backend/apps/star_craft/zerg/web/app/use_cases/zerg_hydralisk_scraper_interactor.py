"""Hydralisk — Redis 대상 URL·키워드로 본문 스크랩 (저그 추출)."""

from __future__ import annotations

import logging

from star_craft.zerg.web.app.ports.input.hydralisk_scrape_use_case import HydraliskScrapeUseCase
from star_craft.zerg.web.app.ports.output.html_extract_port import HtmlExtractPort
from star_craft.zerg.web.app.ports.output.page_fetch_port import PageFetchPort
from star_craft.zerg.web.app.ports.output.zerg_job_config_port import ZergJobConfigPort
from star_craft.zerg.web.domain import ScrapeResult, ScrapedSnippet

logger = logging.getLogger(__name__)


class ZergHydraliskScraperInteractor(HydraliskScrapeUseCase):
    """페이지 HTML에서 키워드 주변 스니펫을 뽑는다. 크롤(링크 확장)과 역할을 섞지 않는다."""

    def __init__(
        self,
        *,
        jobs: ZergJobConfigPort,
        fetcher: PageFetchPort,
        extractor: HtmlExtractPort,
    ) -> None:
        self._jobs = jobs
        self._fetcher = fetcher
        self._extractor = extractor

    async def scrape(
        self,
        *,
        sites: list[str] | None = None,
        keywords: list[str] | None = None,
        max_pages: int = 20,
    ) -> ScrapeResult:
        if sites is None or keywords is None:
            spec = await self._jobs.load_hydralisk_job()
            urls = list(sites) if sites is not None else list(spec.sites)
            kws = list(keywords) if keywords is not None else list(spec.keywords)
        else:
            urls = list(sites)
            kws = list(keywords)

        urls = [u.strip() for u in urls if u and u.strip()]
        kws = [k.strip() for k in kws if k and k.strip()]
        if not urls:
            return ScrapeResult(
                ok=False,
                sites=[],
                keywords=kws,
                detail="대상 사이트가 비어 있습니다. Redis 키 "
                "star_craft:zerg:hydralisk:sites 를 채우거나 sites를 전달하세요.",
            )
        if not kws:
            return ScrapeResult(
                ok=False,
                sites=urls,
                keywords=[],
                detail="키워드가 비어 있습니다. Redis 키 "
                "star_craft:zerg:hydralisk:keywords 를 채우거나 keywords를 전달하세요.",
            )

        max_pages = max(1, min(max_pages, 100))
        snippets: list[ScrapedSnippet] = []

        for url in urls[:max_pages]:
            try:
                html = await self._fetcher.fetch_html(url)
            except Exception as exc:
                logger.warning("[hydralisk] fetch failed url=%s err=%s", url, exc)
                continue
            try:
                pairs = self._extractor.extract_snippets(html, kws)
            except Exception as exc:
                logger.warning("[hydralisk] extract failed url=%s err=%s", url, exc)
                continue
            for keyword, excerpt in pairs:
                snippets.append(
                    ScrapedSnippet(url=url, keyword=keyword, excerpt=excerpt)
                )

        result = ScrapeResult(
            ok=True,
            sites=urls[:max_pages],
            keywords=kws,
            snippets=snippets,
            detail=f"pages={min(len(urls), max_pages)} snippets={len(snippets)}",
        )
        try:
            await self._jobs.save_scrape_result(result)
        except Exception as exc:
            logger.warning("[hydralisk] save result failed: %s", exc)
            result.detail = f"{result.detail}; save_failed:{exc}"
        return result
