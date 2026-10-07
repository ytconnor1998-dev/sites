"""Orchestrates a run: query sources → dedupe → audit → tier → save, stopping at the target."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
from collections import Counter, deque
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field

from .audit import Auditor, tier_for
from .audit.checks import social_profile
from .config import Area, Category, Config, split_list
from .db import Database, now
from .dedupe import domain_key, format_phone, normalise_phone
from .estimate import resolve_source
from .fetch import PoliteClient
from .models import AuditResult, Business, Evaluated
from .audit.pagespeed import PageSpeed
from .sources.google_places import GoogleError, GooglePlaces
from .sources.overpass import Overpass, OverpassError

log = logging.getLogger(__name__)


@dataclass
class RunOptions:
    categories: list[str] = field(default_factory=list)
    groups: list[str] = field(default_factory=list)
    areas: list[str] = field(default_factory=list)
    target: int = 100
    source: str = "auto"         # auto | google | osm | both
    dry_run: bool = False


@dataclass
class Progress:
    message: str = ""
    scanned: int = 0             # businesses audited/evaluated this run
    skipped_known: int = 0       # already in the database
    leads: int = 0
    target: int = 0
    tiers: Counter = field(default_factory=Counter)
    queries_done: int = 0
    queries_total: int = 0
    search_errors: int = 0
    last_search_error: str = ""
    api_calls: Counter = field(default_factory=Counter)
    last: Evaluated | None = None
    done: bool = False


@dataclass
class RunSummary:
    run_id: int
    status: str
    progress: Progress
    error: str | None = None


MAX_CONSECUTIVE_FAILURES = 3
HEARTBEAT_SECONDS = 10


def social_url(url: str, network: str) -> str | None:
    hit = social_profile(url)
    return hit[1] if hit and hit[0] == network else None


class FatalRunError(Exception):
    pass


def filters_label(cats: list[Category], areas: list[Area], opts: RunOptions, cfg: Config) -> str:
    groups_full = []
    rest = list(cats)
    for g in cfg.groups.values():
        members = [c for c in cfg.categories.values() if c.group.key == g.key]
        if members and all(c in cats for c in members):
            groups_full.append(g.name)
            rest = [c for c in rest if c.group.key != g.key]
    parts = []
    if groups_full:
        parts.append("Groups: " + ", ".join(groups_full))
    if rest:
        parts.append("Categories: " + ", ".join(c.name for c in rest))
    parts.append("Areas: " + ", ".join(a.name for a in areas))
    parts.append(f"Target {opts.target}")
    if opts.dry_run:
        parts.append("dry run")
    return " | ".join(parts)


class Pipeline:
    def __init__(
        self, cfg: Config, db: Database,
        on_progress: Callable[[Progress], None] | None = None,
        should_stop: Callable[[], bool] | None = None,
    ):
        self.cfg = cfg
        self.db = db
        self.on_progress = on_progress or (lambda p: None)
        self.should_stop = should_stop or (lambda: False)
        self.progress = Progress()
        self.run_id: int | None = None
        self._last_heartbeat = 0.0
        audit_cfg = cfg.audit
        self.shared_hosts = [*audit_cfg.get("social_domains", []), *audit_cfg.get("checks", {}).get("free_builder", {}).get("domains", [])]

    def _count_call(self, api: str) -> None:
        self.progress.api_calls[api] += 1
        self.db.record_call(api)

    def _emit(self, message: str | None = None) -> None:
        if message:
            self.progress.message = message
        if self.run_id and time.monotonic() - self._last_heartbeat > HEARTBEAT_SECONDS:
            self._last_heartbeat = time.monotonic()
            try:
                self.db.heartbeat(self.run_id, self.progress.scanned, self.progress.leads)
            except Exception:
                log.warning("Couldn't save run progress", exc_info=True)
        try:
            self.on_progress(self.progress)
        except Exception:  # a UI callback must never break the run
            log.debug("progress callback failed", exc_info=True)

    def run(self, opts: RunOptions) -> RunSummary:
        return asyncio.run(self.run_async(opts))

    async def run_async(self, opts: RunOptions) -> RunSummary:
        cfg = self.cfg
        cats = cfg.select_categories(split_list(opts.categories), split_list(opts.groups))
        areas = cfg.select_areas(split_list(opts.areas))
        if not cats:
            raise FatalRunError("Select at least one category or group.")
        if not areas:
            raise FatalRunError("Select at least one area.")
        source, warning = resolve_source(opts.source, cfg)
        if warning:
            log.warning(warning)

        target = max(int(opts.target), 1)
        limit = int(cfg.settings.get("dry_run_limit", 10)) if opts.dry_run else None
        filters = {
            "categories": [c.key for c in cats], "groups": split_list(opts.groups),
            "requested_categories": split_list(opts.categories), "areas": [a.key for a in areas],
            "target": target, "source": source, "dry_run": opts.dry_run,
        }
        label = filters_label(cats, areas, opts, cfg)
        run_id = self.db.start_run(filters, label, source, target, opts.dry_run)
        self.run_id = run_id
        self.progress = Progress(target=target)
        log.info("Run %s started: %s (source: %s)", run_id, label, source)

        http = PoliteClient(cfg.settings)
        psi = PageSpeed(cfg.pagespeed_api_key, cfg.settings, on_call=self._count_call)
        auditor = Auditor(cfg.audit, cfg.settings, http, psi)
        google = GooglePlaces(cfg.google_api_key, cfg.settings, on_call=self._count_call) if source in ("google", "both") else None
        osm = Overpass(cfg.settings, http.user_agent, on_call=self._count_call) if source in ("osm", "both") else None

        status, error = "stopped", None  # stays "stopped" if interrupted (Ctrl+C, dashboard rerun)
        try:
            await self._loop(cats, areas, google, osm, auditor, run_id, label, target, limit)
            status = "stopped" if self.should_stop() else "completed"
        except FatalRunError as e:
            status, error = "failed", str(e)
            log.error("Run %s failed: %s", run_id, e)
        except Exception as e:
            status, error = "failed", f"{type(e).__name__}: {e}"
            log.exception("Run %s crashed", run_id)
        finally:
            for closer in (http.aclose(), psi.aclose(), google.aclose() if google else None, osm.aclose() if osm else None):
                if closer:
                    with contextlib.suppress(Exception):
                        await closer
            self.db.finish_run(run_id, status, self.progress.scanned, self.progress.leads, dict(self.progress.api_calls), error)
            self.progress.done = True
            self._emit(f"Run {status}: {self.progress.leads} new leads")
        return RunSummary(run_id=run_id, status=status, progress=self.progress, error=error)

    async def _loop(self, cats, areas, google, osm, auditor, run_id, label, target, limit) -> None:
        # One page-producing generator per query; take pages round-robin so a run spreads
        # across every selected category and area instead of exhausting the first one.
        queue: deque[tuple[str, str, AsyncIterator[list[Business]]]] = deque()
        for cat in cats:
            for area in areas:
                if google:
                    for tile in area.tiles:
                        queue.append(("google", f"{cat.name} · {area.name}", self._google_pages(google, cat, area, tile)))
                if osm:
                    queue.append(("osm", f"{cat.name} · {area.name} (OSM)", self._osm_pages(osm, cat, area)))
        self.progress.queries_total = len(queue)

        concurrency = int(self.cfg.settings.get("http", {}).get("audit_concurrency", 8))
        recheck_days = int(self.cfg.settings.get("recheck_excluded_after_days", 90))
        sem = asyncio.Semaphore(concurrency)
        pending: set[asyncio.Task] = set()
        seen_uid: set[str] = set()
        seen_phone: set[str] = set()
        seen_domain: set[str] = set()
        started = 0
        failures: Counter = Counter()  # consecutive search failures per source

        def enough() -> bool:
            return self.progress.leads >= target or (limit is not None and started >= limit) or self.should_stop()

        async def drain(wait_all: bool = False) -> None:
            nonlocal pending
            if not pending:
                return
            done, pending = await asyncio.wait(pending, return_when=asyncio.ALL_COMPLETED if wait_all else asyncio.FIRST_COMPLETED)
            for t in done:
                t.result()  # _evaluate never raises

        try:
            while queue and not enough():
                src, label_q, gen = queue.popleft()
                self._emit(f"Searching {label_q}")
                try:
                    page = await gen.__anext__()
                except StopAsyncIteration:
                    self.progress.queries_done += 1
                    continue
                except (GoogleError, OverpassError) as e:
                    msg = str(e)
                    if "HTTP 401" in msg or "HTTP 403" in msg or "API key" in msg or "PERMISSION_DENIED" in msg:
                        raise FatalRunError(f"Google refused the request — check the API key and that Places API (New) is enabled. {msg}") from e
                    log.error("Search failed for %s: %s", label_q, msg)
                    self.progress.queries_done += 1
                    self.progress.search_errors += 1
                    self.progress.last_search_error = msg
                    await gen.aclose()
                    failures[src] += 1
                    if failures[src] >= MAX_CONSECUTIVE_FAILURES:
                        # the source is down: stop using it rather than retrying every query
                        dropped = [q for q in queue if q[0] == src]
                        for q in dropped:
                            queue.remove(q)
                            await q[2].aclose()
                        if not queue and self.progress.scanned == 0:
                            raise FatalRunError(f"{src} searches keep failing ({msg}). Try again later or use another --source.") from e
                        log.error("%s searches keep failing; skipping the remaining %d %s queries", src, len(dropped), src)
                    continue
                failures[src] = 0
                queue.append((src, label_q, gen))

                for biz in page:
                    if enough():
                        break
                    phone_norm = normalise_phone(biz.phone)
                    dkey = domain_key(biz.website, self.shared_hosts)
                    if biz.uid in seen_uid or (phone_norm and phone_norm in seen_phone) or (dkey and dkey in seen_domain):
                        continue
                    seen_uid.add(biz.uid)
                    if phone_norm:
                        seen_phone.add(phone_norm)
                    if dkey:
                        seen_domain.add(dkey)
                    existing = self.db.find_existing(biz.uid, phone_norm, dkey)
                    if self.db.should_skip(existing, recheck_days):
                        self.progress.skipped_known += 1
                        continue
                    started += 1
                    task = asyncio.create_task(self._limited(
                        sem, self._evaluate(biz, auditor, run_id, label, phone_norm, dkey, existing["uid"] if existing else None)
                    ))
                    pending.add(task)
                    while len(pending) >= concurrency * 3:  # don't queue up too far ahead
                        await drain()
                # Before paying for another page: if the audits still running could reach the
                # target, wait for them to finish first.
                if pending and self.progress.leads + len(pending) >= target:
                    await drain(wait_all=True)
            await drain(wait_all=True)
            if self.progress.search_errors and self.progress.search_errors >= self.progress.queries_total:
                raise FatalRunError(f"Every search failed ({self.progress.last_search_error}). Try again later or use another --source.")
        finally:
            for t in pending:
                t.cancel()
            for _, _, gen in queue:
                with contextlib.suppress(Exception):
                    await gen.aclose()

    @staticmethod
    async def _limited(sem: asyncio.Semaphore, coro) -> None:
        async with sem:
            await coro

    async def _google_pages(self, google: GooglePlaces, cat, area, tile) -> AsyncIterator[list[Business]]:
        async for page in google.search_pages(cat, area, tile):
            yield page

    async def _osm_pages(self, osm: Overpass, cat, area) -> AsyncIterator[list[Business]]:
        yield [b async for b in osm.search(cat, area)]

    async def _evaluate(self, biz: Business, auditor: Auditor, run_id: int, label: str,
                        phone_norm: str, dkey: str, existing_uid: str | None) -> None:
        try:
            if biz.website:
                audit = await auditor.audit(biz)
            else:
                audit = AuditResult(has_website=False, no_real_website=True, reason="no website")
            emails = list(dict.fromkeys([*biz.emails, *audit.emails]))[:3]
            email_source = biz.email_source or ("website" if audit.emails else "")
            if audit.skipped:
                tier, status = None, "skipped"
            elif not (biz.phone or emails):
                tier, status = None, "no_contact"
            else:
                tier = tier_for(audit, self.cfg.audit)
                status = "lead" if tier else "excluded"
            ev = Evaluated(business=biz, audit=audit, tier=tier, status=status)
            self.db.save_business(self._row(ev, emails, email_source, run_id, label, phone_norm, dkey), existing_uid)
        except Exception:
            log.exception("Failed to process %s", biz.name)
            return
        self.progress.scanned += 1
        if status == "lead":
            self.progress.leads += 1
            self.progress.tiers[tier] += 1
        self.progress.last = ev
        log.info("[%s] %s — %s%s", tier or status, biz.name, audit.failed_text or "ok",
                 f" (score {audit.score})" if audit.score is not None else "")
        self._emit(f"{biz.name}: {'Tier ' + tier if tier else status}")

    @staticmethod
    def _row(ev: Evaluated, emails, email_source, run_id, label, phone_norm, dkey) -> dict:
        b, a = ev.business, ev.audit
        row = {
            "uid": b.uid, "source": b.source, "name": b.name, "category_key": b.category.key,
            "category": b.category.name, "group_name": b.category.group.name, "area": b.area_name,
            "address": b.address, "lat": b.lat, "lon": b.lon,
            "phone": format_phone(b.phone) if b.phone else "", "phone_norm": phone_norm,
            "email": "; ".join(emails), "email_source": email_source,
            "website": b.website, "domain_key": dkey, "rating": b.rating, "review_count": b.review_count,
            "maps_url": b.maps_url, "status": ev.status, "tier": ev.tier, "score": a.score,
            "failed_checks": a.failed_text, "pagespeed": a.pagespeed, "audit_note": a.reason,
            "failed_keys": json.dumps(a.failed_keys) if a.failed_keys else None,
            "instagram": social_url(b.website, "instagram") or a.social.get("instagram"),
            "facebook": social_url(b.website, "facebook") or a.social.get("facebook"),
        }
        if ev.status == "lead":
            row.update(run_id=run_id, run_filters=label, found_at=now())
        return row
