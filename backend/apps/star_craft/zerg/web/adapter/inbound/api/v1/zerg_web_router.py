"""저그 Zerling/Hydralisk 웹 수집 API."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from star_craft.zerg.web.dependencies.providers import (
    get_hydralisk_scrape_use_case,
    get_zerling_crawl_use_case,
    get_zerg_job_config,
)

zerg_web_router = APIRouter(prefix="/star-craft/zerg", tags=["star-craft-zerg-web"])


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
