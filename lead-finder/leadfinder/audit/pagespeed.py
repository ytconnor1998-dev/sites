"""Google PageSpeed Insights (mobile)."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)

PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


@dataclass
class PageSpeedResult:
    performance: int | None          # 0–100
    viewport_ok: bool | None         # Lighthouse "viewport" audit, if reported


class PageSpeed:
    def __init__(self, api_key: str | None, settings: dict, on_call=None, client: httpx.AsyncClient | None = None):
        p = settings.get("pagespeed", {})
        self.api_key = api_key
        self.enabled = bool(p.get("enabled", True)) and bool(api_key)
        self.strategy = p.get("strategy", "mobile")
        self.sem = asyncio.Semaphore(int(p.get("concurrency", 3)))
        self.on_call = on_call or (lambda api: None)
        self.client = client or httpx.AsyncClient(timeout=float(p.get("timeout_s", 90)))

    async def aclose(self) -> None:
        await self.client.aclose()

    async def run(self, url: str) -> PageSpeedResult | None:
        """None when PageSpeed is off or the call failed (the check is then not counted)."""
        if not self.enabled:
            return None
        params = {"url": url, "strategy": self.strategy, "category": "performance", "key": self.api_key}
        async with self.sem:
            for attempt in range(2):
                self.on_call("pagespeed")
                try:
                    resp = await self.client.get(PSI_URL, params=params)
                except httpx.HTTPError as e:
                    log.warning("PageSpeed failed for %s: %s", url, type(e).__name__)
                    resp = None
                if resp is not None and resp.status_code == 200:
                    return parse_result(resp.json())
                if resp is not None and resp.status_code not in (429, 500, 503):
                    log.warning("PageSpeed HTTP %s for %s: %s", resp.status_code, url, resp.text[:200])
                    return None
                await asyncio.sleep(5 * (attempt + 1))
        return None


def parse_result(data: dict) -> PageSpeedResult:
    lh = data.get("lighthouseResult") or {}
    score = ((lh.get("categories") or {}).get("performance") or {}).get("score")
    viewport = (lh.get("audits") or {}).get("viewport") or {}
    vp_score = viewport.get("score")
    return PageSpeedResult(
        performance=round(score * 100) if isinstance(score, (int, float)) else None,
        viewport_ok=None if vp_score is None else bool(vp_score >= 1),
    )
