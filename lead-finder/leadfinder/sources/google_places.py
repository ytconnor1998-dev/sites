"""Google Places API (New) Text Search.

The field mask asks for phone, website, rating and Maps link directly, so
no separate Place Details call is needed (one call per 20 businesses).
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator

import httpx

from ..config import Area, Category, Tile
from ..fetch import RateLimiter
from ..models import Business

log = logging.getLogger(__name__)

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.businessStatus",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.googleMapsUri",
        "nextPageToken",
    ]
)


class GoogleError(Exception):
    pass


def search_terms(category: Category, term_mode: str) -> list[str]:
    if term_mode == "all":
        return list(dict.fromkeys([*category.terms_it, *category.terms_en]))
    return [(category.terms_it or category.terms_en)[0]]


class GooglePlaces:
    def __init__(self, api_key: str, settings: dict, on_call=None, client: httpx.AsyncClient | None = None):
        g = settings.get("google", {})
        self.api_key = api_key
        self.term_mode = g.get("term_mode", "primary")
        self.max_pages = int(g.get("max_pages_per_query", 3))
        self.limiter = RateLimiter(float(g.get("requests_per_second", 5)))
        self.on_call = on_call or (lambda api: None)
        self.client = client or httpx.AsyncClient(timeout=30)
        self._bad_types: set[str] = set()

    async def aclose(self) -> None:
        await self.client.aclose()

    async def search_pages(self, category: Category, area: Area, tile: Tile) -> AsyncIterator[list[Business]]:
        """Yield one list of businesses per API call. The next page is only requested
        when the caller asks for it, so a run that hits its target stops paying."""
        for term in search_terms(category, self.term_mode):
            page_token = None
            for _page in range(self.max_pages):
                data = await self._search_page(term, category, tile, page_token)
                places = [self._to_business(p, category, area, tile) for p in data.get("places", [])]
                yield [b for b in places if b]
                page_token = data.get("nextPageToken")
                if not page_token:
                    break

    async def _search_page(self, term: str, category: Category, tile: Tile, page_token: str | None) -> dict:
        south, west, north, east = tile.bbox
        body: dict = {
            "textQuery": term,
            "languageCode": "it",
            "regionCode": "IT",
            "pageSize": 20,
            "locationRestriction": {
                "rectangle": {
                    "low": {"latitude": south, "longitude": west},
                    "high": {"latitude": north, "longitude": east},
                }
            },
        }
        included = next((t for t in category.google_types if t not in self._bad_types), None)
        if included:
            body["includedType"] = included
        if page_token:
            body["pageToken"] = page_token

        resp = await self._post(body)
        if resp.status_code == 400 and included and "includedType" in resp.text:
            # A type Google doesn't support for filtering: drop it and rely on the text query.
            log.warning("Google rejected type '%s' for %s; searching by text only", included, category.key)
            self._bad_types.add(included)
            body.pop("includedType")
            resp = await self._post(body)
        if resp.status_code != 200:
            raise GoogleError(f"Places API HTTP {resp.status_code}: {resp.text[:300]}")
        return resp.json()

    async def _post(self, body: dict) -> httpx.Response:
        headers = {"X-Goog-Api-Key": self.api_key, "X-Goog-FieldMask": FIELD_MASK}
        delay = 2.0
        for attempt in range(3):
            await self.limiter.wait()
            self.on_call("google_text_search")
            try:
                resp = await self.client.post(SEARCH_URL, json=body, headers=headers)
            except httpx.HTTPError as e:
                if attempt == 2:
                    raise GoogleError(f"Places API request failed: {e}") from e
            else:
                if resp.status_code not in (429, 500, 503) or attempt == 2:
                    return resp
            await asyncio.sleep(delay)
            delay *= 2
        raise GoogleError("unreachable")  # pragma: no cover

    @staticmethod
    def _to_business(place: dict, category: Category, area: Area, tile: Tile) -> Business | None:
        if place.get("businessStatus") == "CLOSED_PERMANENTLY":
            return None
        loc = place.get("location") or {}
        lat, lon = loc.get("latitude"), loc.get("longitude")
        # the rectangle is wider than a circular zone: drop results outside the zone itself
        if lat is not None and lon is not None and not (tile.contains(lat, lon) and area.contains(lat, lon)):
            return None
        return Business(
            source="google",
            source_id=place["id"],
            name=(place.get("displayName") or {}).get("text", ""),
            category=category,
            area_key=area.key,
            area_name=area.name,
            address=place.get("formattedAddress", ""),
            lat=lat,
            lon=lon,
            phone=place.get("internationalPhoneNumber") or place.get("nationalPhoneNumber") or "",
            website=place.get("websiteUri", ""),
            rating=place.get("rating"),
            review_count=place.get("userRatingCount"),
            maps_url=place.get("googleMapsUri", ""),
        )
