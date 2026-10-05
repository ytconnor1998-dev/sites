"""Shared HTTP client: clear user agent, timeouts, retries, robots.txt, per-host rate limit."""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import httpx

log = logging.getLogger(__name__)

RETRY_STATUS = {429, 500, 502, 503, 504}
MAX_HTML_BYTES = 3_000_000


@dataclass
class Page:
    url: str              # final URL after redirects
    status: int
    text: str
    content_type: str = ""


class FetchError(Exception):
    """Site couldn't be fetched (DNS, connection, TLS, timeout, HTTP error)."""

    def __init__(self, message: str, *, ssl: bool = False):
        super().__init__(message)
        self.ssl = ssl


class PoliteClient:
    def __init__(self, settings: dict):
        http = settings.get("http", {})
        self.user_agent = settings.get("user_agent", "CPDLeadFinder/1.0")
        self.timeout = float(http.get("timeout_s", 15))
        self.retries = int(http.get("retries", 2))
        self.backoff = float(http.get("backoff_s", 1.5))
        self.per_host_delay = float(http.get("per_host_delay_s", 1.0))
        self._robots: dict[str, RobotFileParser | None] = {}
        self._robots_locks: dict[str, asyncio.Lock] = {}
        self._host_locks: dict[str, asyncio.Lock] = {}
        self._host_last: dict[str, float] = {}
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
            "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
        }
        limits = httpx.Limits(max_connections=50, max_keepalive_connections=10)
        self.client = httpx.AsyncClient(headers=headers, timeout=self.timeout, follow_redirects=True, limits=limits)
        self._insecure: httpx.AsyncClient | None = None

    async def aclose(self) -> None:
        await self.client.aclose()
        if self._insecure:
            await self._insecure.aclose()

    async def __aenter__(self) -> "PoliteClient":
        return self

    async def __aexit__(self, *exc) -> None:
        await self.aclose()

    # ── robots.txt ──────────────────────────────────────────────────
    async def allowed(self, url: str) -> bool:
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        lock = self._robots_locks.setdefault(origin, asyncio.Lock())
        async with lock:
            if origin not in self._robots:
                self._robots[origin] = await self._load_robots(origin)
        rp = self._robots[origin]
        return True if rp is None else rp.can_fetch(self.user_agent, url)

    async def _load_robots(self, origin: str) -> RobotFileParser | None:
        try:
            resp = await self._request("GET", f"{origin}/robots.txt", retries=0)
        except FetchError:
            return None  # no robots.txt reachable → allowed
        if resp.status_code >= 400 or "html" in resp.headers.get("content-type", ""):
            return None
        rp = RobotFileParser()
        rp.parse(resp.text.splitlines())
        return rp

    # ── page fetches ────────────────────────────────────────────────
    async def get_page(self, url: str, *, verify: bool = True, retries: int | None = None) -> Page:
        """GET an HTML page, respecting the per-host delay. Raises FetchError."""
        resp = await self._request("GET", url, verify=verify, retries=retries)
        if resp.status_code >= 400:
            raise FetchError(f"HTTP {resp.status_code}")
        ctype = resp.headers.get("content-type", "")
        text = resp.content[:MAX_HTML_BYTES].decode(resp.encoding or "utf-8", errors="replace")
        return Page(url=str(resp.url), status=resp.status_code, text=text, content_type=ctype)

    async def _request(self, method: str, url: str, *, retries: int | None = None, verify: bool = True, **kw) -> httpx.Response:
        retries = self.retries if retries is None else retries
        client = self.client if verify else self._insecure_client()
        delay = self.backoff
        last: Exception | None = None
        for attempt in range(retries + 1):
            await self._wait_for_host(url)
            try:
                resp = await client.request(method, url, **kw)
            except httpx.ConnectError as e:
                if _is_ssl_error(e):
                    raise FetchError(f"SSL error: {e}", ssl=True) from e
                last = e
            except (httpx.TimeoutException, httpx.RemoteProtocolError, httpx.ReadError) as e:
                last = e
            except httpx.HTTPError as e:  # invalid URL, too many redirects, …
                raise FetchError(f"{type(e).__name__}: {e}") from e
            else:
                if resp.status_code not in RETRY_STATUS or attempt == retries:
                    return resp
                last = FetchError(f"HTTP {resp.status_code}")
            if attempt < retries:
                await asyncio.sleep(delay)
                delay *= 2
        raise FetchError(_describe(last))

    def _insecure_client(self) -> httpx.AsyncClient:
        # Only used to read a page whose certificate is invalid, so the audit can still score it.
        if self._insecure is None:
            self._insecure = httpx.AsyncClient(
                headers=self.client.headers, timeout=self.timeout, follow_redirects=True, verify=False
            )
        return self._insecure

    async def _wait_for_host(self, url: str) -> None:
        host = urlsplit(url).netloc.lower()
        lock = self._host_locks.setdefault(host, asyncio.Lock())
        async with lock:
            wait = self._host_last.get(host, 0) + self.per_host_delay - time.monotonic()
            if wait > 0:
                await asyncio.sleep(wait)
            self._host_last[host] = time.monotonic()


def _is_ssl_error(e: Exception) -> bool:
    text = f"{e!r} {e.__cause__!r}".lower()
    return any(s in text for s in ("ssl", "certificate", "tls"))


def _describe(e: Exception | None) -> str:
    if e is None:
        return "unknown error"
    if isinstance(e, httpx.TimeoutException):
        return "timed out"
    if isinstance(e, httpx.ConnectError):
        msg = str(e).lower()
        if "name or service not known" in msg or "nodename nor servname" in msg or "getaddrinfo" in msg or "no address" in msg:
            return "domain doesn't resolve"
        return "connection failed"
    return str(e) or type(e).__name__


class RateLimiter:
    """Simple async limiter: at most `per_second` calls per second."""

    def __init__(self, per_second: float):
        self.interval = 1.0 / per_second if per_second > 0 else 0
        self._lock = asyncio.Lock()
        self._last = 0.0

    async def wait(self) -> None:
        async with self._lock:
            delay = self._last + self.interval - time.monotonic()
            if delay > 0:
                await asyncio.sleep(delay)
            self._last = time.monotonic()
