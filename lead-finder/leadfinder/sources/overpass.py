"""OpenStreetMap Overpass API: free fallback source."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from urllib.parse import quote_plus

import httpx

from ..config import Area, Category, Tile
from ..models import Business

log = logging.getLogger(__name__)


class OverpassError(Exception):
    pass


def area_filter(tile: Tile) -> str:
    if tile.polygon:
        coords = " ".join(f"{lat} {lon}" for lat, lon in tile.polygon)
        return f'(poly:"{coords}")'
    return f"(around:{int(tile.radius_m)},{tile.lat},{tile.lon})"


def build_query(category: Category, area: Area, timeout: int = 120) -> str:
    """One query per category × area. Grid areas use their outer shape (Overpass has no 60-result cap)."""
    where = area_filter(area.shape)
    parts = []
    for tags in category.osm_tags:
        selector = "".join(_tag_selector(k, v) for k, v in tags.items())
        parts.append(f"  nwr{selector}{where};")
    body = "\n".join(parts)
    return f"[out:json][timeout:{timeout}];\n(\n{body}\n);\nout center tags;"


def _tag_selector(key: str, value) -> str:
    if value in ("*", None, True):
        return f'["{key}"]'
    return f'["{key}"="{value}"]'


class Overpass:
    def __init__(self, settings: dict, user_agent: str, on_call=None, client: httpx.AsyncClient | None = None):
        o = settings.get("overpass", {})
        self.urls = list(o.get("urls") or [o.get("url", "https://overpass-api.de/api/interpreter")])
        self.timeout = int(o.get("timeout_s", 120))
        self.delay = float(o.get("delay_between_queries_s", 2))
        self.on_call = on_call or (lambda api: None)
        self.client = client or httpx.AsyncClient(timeout=self.timeout + 30, headers={"User-Agent": user_agent})
        self._lock = asyncio.Lock()  # Overpass asks for one query at a time

    async def aclose(self) -> None:
        await self.client.aclose()

    async def search(self, category: Category, area: Area) -> AsyncIterator[Business]:
        if not category.osm_tags:
            return
        data = await self._query(build_query(category, area, self.timeout))
        for el in data.get("elements", []):
            biz = self._to_business(el, category, area)
            if biz:
                yield biz

    async def _query(self, query: str) -> dict:
        async with self._lock:
            delay = 5.0
            attempts = max(3, len(self.urls))
            for attempt in range(attempts):
                url = self.urls[attempt % len(self.urls)]  # rotate through mirrors
                self.on_call("overpass")
                try:
                    resp = await self.client.post(url, data={"data": query})
                except httpx.HTTPError as e:
                    err: str = str(e) or type(e).__name__
                else:
                    if resp.status_code == 200:
                        await asyncio.sleep(self.delay)
                        return resp.json()
                    err = f"HTTP {resp.status_code}"
                    if resp.status_code not in (429, 502, 503, 504):
                        raise OverpassError(f"Overpass {err}: {resp.text[:200]}")
                if attempt < attempts - 1:
                    log.warning("Overpass %s (%s), retrying in %.0fs", err, url, delay)
                    await asyncio.sleep(delay)
                    delay *= 2
            raise OverpassError(f"Overpass failed after retries ({err})")

    @staticmethod
    def _to_business(el: dict, category: Category, area: Area) -> Business | None:
        tags = el.get("tags") or {}
        name = tags.get("name")
        if not name:
            return None
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        phone = tags.get("phone") or tags.get("contact:phone") or tags.get("contact:mobile") or tags.get("mobile") or ""
        phone = phone.split(";")[0].strip()
        email = tags.get("email") or tags.get("contact:email") or ""
        emails = [e.strip() for e in email.split(";") if "@" in e]
        website = (
            tags.get("website") or tags.get("contact:website") or tags.get("url")
            or tags.get("contact:facebook") or tags.get("facebook") or tags.get("contact:instagram") or ""
        )
        website = website.split(";")[0].strip()
        if website and not website.startswith(("http://", "https://")):
            website = "http://" + website
        addr = _address(tags)
        osm_id = f"{el['type']}/{el['id']}"
        return Business(
            source="osm",
            source_id=osm_id,
            name=name,
            category=category,
            area_key=area.key,
            area_name=area.name,
            address=addr,
            lat=lat,
            lon=lon,
            phone=phone,
            emails=emails,
            email_source="osm" if emails else "",
            website=website,
            maps_url=google_maps_search_url(name, addr, lat, lon),
        )


def google_maps_search_url(name: str, address: str, lat, lon) -> str:
    query = f"{name}, {address or 'Roma'}"
    return "https://www.google.com/maps/search/?api=1&query=" + quote_plus(query)


def _address(tags: dict) -> str:
    street = " ".join(x for x in (tags.get("addr:street"), tags.get("addr:housenumber")) if x)
    city = " ".join(x for x in (tags.get("addr:postcode"), tags.get("addr:city") or "Roma") if x)
    return ", ".join(x for x in (street, city) if x) if street else ""
