"""저그 Zerling/Hydralisk 웹 수집 API."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from star_craft.zerg.web.dependencies.providers import (
    get_hydralisk_scrape_use_case,
    get_zerling_crawl_use_case,
    get_zerg_job_config,
)

logger = logging.getLogger(__name__)

zerg_web_router = APIRouter(prefix="/star-craft/zerg", tags=["star-craft-zerg-web"])

_CRAWLED_DIR = Path(__file__).resolve().parents[7] / "resources" / "crawled"


def _extract_keywords(command: str) -> list[str]:
    """자연어 명령어에서 의미 있는 키워드 추출."""
    stop = {
        "이", "가", "을", "를", "은", "는", "에서", "에", "의", "로", "으로",
        "과", "와", "도", "만", "부터", "까지", "한테", "께서", "에게",
        "모든", "모두", "다", "해줘", "가져와줘", "가져와", "줘", "해주세요",
        "추출해줘", "수집해줘", "찾아줘", "보여줘", "알려줘", "정리해줘",
        "표", "형식", "이", "페이지", "사이트", "웹",
    }
    return [
        w for w in command.split()
        if len(w) >= 2 and w not in stop
    ][:10]


def _save_crawled(mode: str, url: str, keywords: list[str], payload: dict) -> str:
    """결과를 resources/crawled/<timestamp>_<mode>.json 으로 저장."""
    _CRAWLED_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"{ts}_{mode}.json"
    data = {"mode": mode, "url": url, "keywords": keywords, "result": payload}
    (_CRAWLED_DIR / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("[zerg] 크롤링 결과 저장: %s", filename)
    return filename


class SeedJobRequest(BaseModel):
    sites: list[str] = Field(..., min_length=1)
    keywords: list[str] = Field(default_factory=list)


class CrawlRequest(BaseModel):
    sites: list[str] | None = None
    keywords: list[str] | None = None
    max_pages: int = Field(default=20, ge=1, le=100)
    max_depth: int = Field(default=1, ge=0, le=3)


class ScrapeRequest(BaseModel):
    sites: list[str] | None = None
    keywords: list[str] | None = None
    max_pages: int = Field(default=20, ge=1, le=100)


@zerg_web_router.post("/zerling/seed")
async def seed_zerling(body: SeedJobRequest) -> dict:
    """Redis에 Zerling(크롤) 시드·키워드 적재."""
    await get_zerg_job_config().seed_zerling_job(body.sites, body.keywords)
    return {"ok": True, "role": "zerling", "sites": len(body.sites), "keywords": len(body.keywords)}


@zerg_web_router.post("/hydralisk/seed")
async def seed_hydralisk(body: SeedJobRequest) -> dict:
    """Redis에 Hydralisk(스크랩) 대상·키워드 적재."""
    await get_zerg_job_config().seed_hydralisk_job(body.sites, body.keywords)
    return {
        "ok": True,
        "role": "hydralisk",
        "sites": len(body.sites),
        "keywords": len(body.keywords),
    }


@zerg_web_router.post("/zerling/crawl")
async def run_zerling_crawl(body: CrawlRequest) -> dict | JSONResponse:
    """Redis(또는 body override) 시드로 링크 크롤."""
    result = await get_zerling_crawl_use_case().crawl(
        sites=body.sites,
        keywords=body.keywords,
        max_pages=body.max_pages,
        max_depth=body.max_depth,
    )
    payload = {
        "ok": result.ok,
        "role": "zerling",
        "seeds": result.seeds,
        "keywords": result.keywords,
        "pages": [
            {
                "url": p.url,
                "matched_keywords": list(p.matched_keywords),
                "depth": p.depth,
            }
            for p in result.pages
        ],
        "detail": result.detail,
    }
    if not result.ok:
        return JSONResponse(payload, status_code=400)
    return payload


@zerg_web_router.post("/hydralisk/scrape")
async def run_hydralisk_scrape(body: ScrapeRequest) -> dict | JSONResponse:
    """Redis(또는 body override) URL에서 키워드 스니펫 스크랩."""
    result = await get_hydralisk_scrape_use_case().scrape(
        sites=body.sites,
        keywords=body.keywords,
        max_pages=body.max_pages,
    )
    payload = {
        "ok": result.ok,
        "role": "hydralisk",
        "sites": result.sites,
        "keywords": result.keywords,
        "snippets": [
            {"url": s.url, "keyword": s.keyword, "excerpt": s.excerpt}
            for s in result.snippets
        ],
        "detail": result.detail,
    }
    if not result.ok:
        return JSONResponse(payload, status_code=400)
    return payload


# ── 레슨 크롤링 화면 전용 통합 엔드포인트 ──────────────────────────────────────

class LessonRunRequest(BaseModel):
    mode: str = Field(default="crawler", pattern="^(crawler|scraper)$")
    url: str = Field(..., min_length=1)
    command: str = Field(default="")


@zerg_web_router.post("/lesson/run")
async def lesson_run(body: LessonRunRequest) -> dict | JSONResponse:
    """레슨 크롤링 화면: URL+자연어 명령어 → 실행 → JSON 저장 (Redis 불필요)."""
    keywords = _extract_keywords(body.command) if body.command.strip() else []

    try:
        if body.mode == "crawler":
            result = await get_zerling_crawl_use_case().crawl(
                sites=[body.url],
                keywords=keywords,
                max_pages=10,
                max_depth=1,
            )
            payload = {
                "ok": result.ok,
                "mode": "crawler",
                "url": body.url,
                "keywords": keywords,
                "pages": [
                    {
                        "url": p.url,
                        "matched_keywords": list(p.matched_keywords),
                        "depth": p.depth,
                    }
                    for p in result.pages
                ],
                "detail": result.detail,
            }
        else:
            result = await get_hydralisk_scrape_use_case().scrape(
                sites=[body.url],
                keywords=keywords,
                max_pages=5,
            )
            payload = {
                "ok": result.ok,
                "mode": "scraper",
                "url": body.url,
                "keywords": keywords,
                "snippets": [
                    {"url": s.url, "keyword": s.keyword, "excerpt": s.excerpt}
                    for s in result.snippets
                ],
                "detail": result.detail,
            }
    except Exception as exc:
        logger.exception("[lesson/run] 실행 오류")
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)

    # resources/crawled/ 에 JSON 저장 (실패해도 결과는 반환)
    try:
        filename = _save_crawled(body.mode, body.url, keywords, payload)
        payload["saved_file"] = filename
    except Exception:
        logger.warning("[lesson/run] 파일 저장 실패 — 결과는 반환")

    if not result.ok:
        return JSONResponse(payload, status_code=400)
    return payload
