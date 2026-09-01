"""Zerling — Redis 시드·키워드로 링크 크롤 (저그 정찰)."""

from __future__ import annotations

import logging
from collections import deque
from urllib.parse import urlparse

from star_craft.zerg.web.app.ports.input.zerling_crawl_use_case import ZerlingCrawlUseCase
from star_craft.zerg.web.app.ports.output.html_extract_port import HtmlExtractPort
from star_craft.zerg.web.app.ports.output.page_fetch_port import PageFetchPort
from star_craft.zerg.web.app.ports.output.zerg_job_config_port import ZergJobConfigPort
from star_craft.zerg.web.domain import CrawlResult, DiscoveredPage

logger = logging.getLogger(__name__)


def _same_host(a: str, b: str) -> bool:
    try:
        return urlparse(a).netloc == urlparse(b).netloc
    except Exception:
        return False


def _keyword_hits(text: str, keywords: list[str]) -> tuple[str, ...]:
    lower = text.lower()
    return tuple(k for k in keywords if k.lower() in lower)


class ZergZerlingCrawlerInteractor(ZerlingCrawlUseCase):
    """시드 URL BFS → 링크 수집. 키워드가 있으면 매칭 URL만 결과에 포함."""

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

    async def crawl(
        self,
        *,
        sites: list[str] | None = None,
        keywords: list[str] | None = None,
        max_pages: int = 20,
        max_depth: int = 1,
    ) -> CrawlResult:
        if sites is None or keywords is None:
            spec = await self._jobs.load_zerling_job()
            seeds = list(sites) if sites is not None else list(spec.sites)
            kws = list(keywords) if keywords is not None else list(spec.keywords)
        else:
            seeds = list(sites)
            kws = list(keywords)

        seeds = [s.strip() for s in seeds if s and s.strip()]
        kws = [k.strip() for k in kws if k and k.strip()]
        if not seeds:
            return CrawlResult(
                ok=False,
                seeds=[],
                keywords=kws,
                detail="시드 사이트가 비어 있습니다. Redis 키 "
                "star_craft:zerg:zerling:sites 를 채우거나 sites를 전달하세요.",
            )

        max_pages = max(1, min(max_pages, 100))
        max_depth = max(0, min(max_depth, 3))

        visited: set[str] = set()
        queue: deque[tuple[str, int]] = deque((u, 0) for u in seeds)
        found: list[DiscoveredPage] = []

        while queue and len(visited) < max_pages:
            url, depth = queue.popleft()
            if url in visited:
                continue
            visited.add(url)

            try:
                html = await self._fetcher.fetch_html(url)
            except Exception as exc:
                logger.warning("[zerling] fetch failed url=%s err=%s", url, exc)
                continue

            hits = _keyword_hits(url, kws) if kws else ()
            if not kws or hits:
                found.append(DiscoveredPage(url=url, matched_keywords=hits, depth=depth))

            if depth >= max_depth:
                continue

            try:
                links = self._extractor.extract_links(html, base_url=url)
            except Exception as exc:
                logger.warning("[zerling] extract failed url=%s err=%s", url, exc)
                continue

            for link in links:
                if link in visited:
                    continue
                if not _same_host(url, link):
                    continue
                if kws:
                    link_hits = _keyword_hits(link, kws)
                    # 키워드가 있으면 URL에 키워드가 있거나 일단 큐에 넣어 본문 전 단계 탐색
                    if not link_hits and depth + 1 > 0:
                        # 동일 호스트 1-hop 은 허용 (시드 확장)
                        pass
                queue.append((link, depth + 1))

        result = CrawlResult(
            ok=True,
            seeds=seeds,
            keywords=kws,
            pages=found,
            detail=f"visited={len(visited)} matched={len(found)}",
        )
        try:
            await self._jobs.save_crawl_result(result)
        except Exception as exc:
            logger.warning("[zerling] save result failed: %s", exc)
            result.detail = f"{result.detail}; save_failed:{exc}"
        return result
