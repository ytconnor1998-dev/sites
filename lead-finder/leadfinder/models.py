"""Plain data objects passed between the pipeline stages."""

from __future__ import annotations

from dataclasses import dataclass, field

from .config import Category


@dataclass
class Business:
    source: str                  # "google" or "osm"
    source_id: str               # Google place ID or "node/123"
    name: str
    category: Category
    area_key: str
    area_name: str
    address: str = ""
    lat: float | None = None
    lon: float | None = None
    phone: str = ""
    emails: list[str] = field(default_factory=list)
    email_source: str = ""       # "osm", "website" or ""
    website: str = ""
    rating: float | None = None
    review_count: int | None = None
    maps_url: str = ""

    @property
    def uid(self) -> str:
        return f"{self.source}:{self.source_id}"


@dataclass
class AuditResult:
    has_website: bool
    no_real_website: bool = False
    reason: str = ""               # why it's not a real website, or why the audit was skipped
    final_url: str = ""
    score: int | None = None
    failed: list[str] = field(default_factory=list)
    failed_keys: dict[str, str] = field(default_factory=dict)  # check key -> detail, for outreach messages
    social: dict[str, str] = field(default_factory=dict)       # e.g. {"instagram": url} found on the homepage
    emails: list[str] = field(default_factory=list)
    pagespeed: int | None = None
    skipped: bool = False          # e.g. robots.txt disallows us

    @property
    def failed_text(self) -> str:
        if self.no_real_website:
            return f"No real website: {self.reason}" if self.has_website else "No website"
        return "; ".join(self.failed)


@dataclass
class Evaluated:
    business: Business
    audit: AuditResult
    tier: str | None               # "A", "B", "C" or None (excluded)
    status: str                    # "lead", "excluded", "no_contact", "skipped"
