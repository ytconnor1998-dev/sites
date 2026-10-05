"""API-call estimate shown before every run (CLI and dashboard)."""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from .config import Area, Category, Config
from .sources.google_places import search_terms


@dataclass
class Estimate:
    source: str
    combos: int                      # category × area pairs
    google_queries: int = 0          # category terms × area tiles
    google_max_calls: int = 0        # every query paged to the end
    overpass_queries: int = 0
    max_businesses: int = 0          # most businesses Google could return
    pagespeed_note: str = ""
    google_used_this_month: int = 0
    google_free_per_month: int = 0
    warnings: list[str] = field(default_factory=list)

    @property
    def google_free_left(self) -> int:
        return max(self.google_free_per_month - self.google_used_this_month, 0)

    def lines(self) -> list[str]:
        out = [f"Source: {self.source}   ·   {self.combos} category × area combinations"]
        if self.google_queries:
            out.append(
                f"Google Text Search: {self.google_queries} queries, up to {self.google_max_calls} calls "
                f"(≤3 pages each; stops early once the target is reached)"
            )
            out.append(
                f"Google usage this month: {self.google_used_this_month} of ~{self.google_free_per_month} free calls "
                f"({self.google_free_left} left)"
            )
        if self.overpass_queries:
            out.append(f"Overpass (OpenStreetMap, free): {self.overpass_queries} queries")
        if self.pagespeed_note:
            out.append(self.pagespeed_note)
        out += [f"⚠ {w}" for w in self.warnings]
        return out


def resolve_source(requested: str, cfg: Config) -> tuple[str, str | None]:
    """'auto' → google when a key is set, otherwise osm. Returns (source, warning)."""
    requested = (requested or "auto").lower()
    if requested in ("auto", "google", "both") and not cfg.google_api_key:
        if requested == "auto":
            return "osm", "No GOOGLE_PLACES_API_KEY in .env, so OpenStreetMap is used instead."
        return "osm", f"--source {requested} needs GOOGLE_PLACES_API_KEY in .env; falling back to OpenStreetMap."
    return ("google" if requested == "auto" else requested), None


def estimate(
    cfg: Config, categories: list[Category], areas: list[Area], source: str, target: int,
    dry_run: bool = False, google_used_this_month: int = 0,
) -> Estimate:
    term_mode = cfg.settings.get("google", {}).get("term_mode", "primary")
    max_pages = int(cfg.settings.get("google", {}).get("max_pages_per_query", 3))
    est = Estimate(source=source, combos=len(categories) * len(areas))

    if source in ("google", "both"):
        tiles = sum(len(a.tiles) for a in areas)
        terms = sum(len(search_terms(c, term_mode)) for c in categories)
        est.google_queries = tiles * terms
        est.google_max_calls = est.google_queries * max_pages
        est.max_businesses = est.google_max_calls * 20
        if dry_run:
            # 10 businesses fit in the first page or two
            est.google_max_calls = min(est.google_max_calls, max(2, math.ceil(cfg.settings.get("dry_run_limit", 10) / 20) + 1))
        est.google_free_per_month = int(cfg.settings.get("google", {}).get("free_calls_per_month", 1000))
        est.google_used_this_month = google_used_this_month
        if est.google_max_calls > est.google_free_left:
            est.warnings.append(
                f"The worst case ({est.google_max_calls} calls) is more than the free calls left this month "
                f"({est.google_free_left}). Narrow the areas/categories or lower the target."
            )
    if source in ("osm", "both"):
        est.overpass_queries = len(categories) * len(areas)
        if dry_run:
            est.overpass_queries = min(est.overpass_queries, 2)

    if cfg.settings.get("pagespeed", {}).get("enabled", True):
        if cfg.pagespeed_api_key:
            tiers = cfg.audit.get("tiers", {})
            low = int(tiers.get("B", {}).get("max_score", 49)) + 1
            high = int(tiers.get("C", {}).get("max_score", 70)) + int(cfg.audit.get("checks", {}).get("slow_pagespeed", {}).get("weight", 15))
            est.pagespeed_note = (
                f"PageSpeed Insights: only for borderline sites (score {low}–{high} before the speed check); "
                f"free quota {cfg.settings.get('pagespeed', {}).get('free_calls_per_day', 25000):,}/day"
            )
        else:
            est.pagespeed_note = "PageSpeed Insights: off (no PAGESPEED_API_KEY or GOOGLE_PLACES_API_KEY), speed check skipped"
    if any(a.key == "all" for a in areas) and source in ("google", "both"):
        est.warnings.append(f"'All of Rome' is split into {len(areas[0].tiles)} tiles, each a separate query.")
    return est
