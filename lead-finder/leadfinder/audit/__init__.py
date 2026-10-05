"""Runs the configured checks against one business's website and scores it."""

from __future__ import annotations

import logging
import re
from urllib.parse import urljoin, urlsplit, urlunsplit

from ..fetch import FetchError, Page, PoliteClient
from ..models import AuditResult, Business
from . import checks as c
from .pagespeed import PageSpeed

log = logging.getLogger(__name__)

BLOCKED_RE = re.compile(r"HTTP (401|403|429|999)")


def tier_for(audit: AuditResult, audit_cfg: dict) -> str | None:
    if audit.no_real_website:
        return "A"
    if audit.score is None:
        return None
    tiers = audit_cfg.get("tiers", {})
    if audit.score <= int(tiers.get("B", {}).get("max_score", 49)):
        return "B"
    if audit.score <= int(tiers.get("C", {}).get("max_score", 70)):
        return "C"
    return None


class Auditor:
    def __init__(self, audit_cfg: dict, settings: dict, http: PoliteClient, pagespeed: PageSpeed):
        self.cfg = audit_cfg
        self.checks = audit_cfg.get("checks", {})
        self.settings = settings
        self.http = http
        self.pagespeed = pagespeed

    def _on(self, key: str) -> bool:
        return bool(self.checks.get(key, {}).get("enabled", True))

    def _weight(self, key: str) -> int:
        return int(self.checks.get(key, {}).get("weight", 0)) if self._on(key) else 0

    def _label(self, key: str, **kw) -> str:
        return str(self.checks.get(key, {}).get("label", key)).format(**kw)

    async def audit(self, biz: Business) -> AuditResult:
        """Never raises: anything unexpected is logged and the site is marked as skipped."""
        try:
            return await self._audit(biz)
        except Exception as e:  # one broken site must not crash the run
            log.exception("Audit crashed for %s (%s)", biz.name, biz.website)
            return AuditResult(has_website=True, skipped=True, reason=f"audit error: {type(e).__name__}")

    async def _audit(self, biz: Business) -> AuditResult:
        url = normalise_url(biz.website)
        if not url:
            return AuditResult(has_website=False, no_real_website=True, reason="no website")

        social = c.social_link(url, self.cfg.get("social_domains", []))
        if social:
            return AuditResult(has_website=True, no_real_website=True, reason=f"social media only ({social})", final_url=url)

        if not await self.http.allowed(url):
            log.info("robots.txt disallows %s, skipping audit", url)
            return AuditResult(has_website=True, skipped=True, reason="robots.txt disallows audit", final_url=url)

        page, ssl_state, error = await self._fetch_home(url)
        if page is None and BLOCKED_RE.search(error):
            # The site exists but refuses bots (e.g. Cloudflare): don't call it "no website".
            return AuditResult(has_website=True, skipped=True, reason=f"site blocked the audit ({error})", final_url=url)
        if page is None:
            return AuditResult(has_website=True, no_real_website=True, reason=f"unreachable ({error})", final_url=url)

        result = AuditResult(has_website=True, final_url=page.url)
        if "html" not in page.content_type and page.content_type:
            result.no_real_website, result.reason = True, f"not a web page ({page.content_type.split(';')[0]})"
            return result

        # redirected to a social profile or a parking service
        social = c.social_link(page.url, self.cfg.get("social_domains", []))
        if social:
            result.no_real_website, result.reason = True, f"social media only ({social})"
            return result
        soup = c.parse(page.text)
        text = c.visible_text(soup)
        parked = c.parked_reason(page.url, page.text, text, self.cfg)
        if parked:
            result.no_real_website, result.reason = True, parked
            result.emails = c.extract_emails(soup, text)
            return result

        score = int(self.cfg.get("start_score", 100))
        failed: list[str] = []

        def fail(key: str, label: str) -> None:
            nonlocal score
            if self._on(key):
                score -= self._weight(key)
                failed.append(label)

        # 2. HTTPS / SSL
        if ssl_state == "invalid":
            fail("no_https", self.checks.get("no_https", {}).get("invalid_ssl_label", "Invalid SSL certificate"))
        elif urlsplit(page.url).scheme != "https":
            fail("no_https", self._label("no_https"))
        # 3. mobile
        viewport_ok = c.has_viewport(soup)
        if not viewport_ok:
            fail("not_mobile_friendly", self._label("not_mobile_friendly"))
        # 5. copyright
        year = c.copyright_year(soup, text)
        min_year = int(self.checks.get("old_copyright", {}).get("min_year", 2022))
        if year and year < min_year:
            fail("old_copyright", self._label("old_copyright", year=year))
        # 6. outdated tech
        tech = c.outdated_tech(soup, page.text, self.checks.get("outdated_tech", {}))
        if tech:
            fail("outdated_tech", self._label("outdated_tech", details=", ".join(tech)))
        # 7. free builder
        builder = c.free_builder(page.url, self.checks.get("free_builder", {}).get("domains", [])) or c.free_builder(
            url, self.checks.get("free_builder", {}).get("domains", [])
        )
        if builder:
            fail("free_builder", self._label("free_builder", host=builder))
        # 8. title / description
        missing = c.missing_meta(soup)
        if missing:
            fail("missing_meta", self._label("missing_meta", what=" and ".join(missing)))
        # 9. contact info
        if not c.has_contact_info(soup, text):
            fail("no_contact_info", self._label("no_contact_info"))
        # 10. English (tourist-facing only)
        if biz.category.group.needs_english and not c.has_english(soup, page.url):
            fail("no_english", self._label("no_english"))

        # contacts: homepage + one contact page
        emails = c.extract_emails(soup, text)
        emails += await self._contact_page_emails(soup, page.url)
        result.emails = c.rank_emails(c.clean_emails(emails), page.url)

        # 4. PageSpeed — only when it could change the outcome, and only for reachable leads
        has_contact = bool(biz.phone or biz.emails or result.emails)
        if self._on("slow_pagespeed") and has_contact and self._pagespeed_matters(score):
            psi = await self.pagespeed.run(page.url)
            if psi:
                result.pagespeed = psi.performance
                threshold = int(self.checks["slow_pagespeed"].get("threshold", 50))
                if psi.performance is not None and psi.performance < threshold:
                    fail("slow_pagespeed", self._label("slow_pagespeed", score=psi.performance))
                if psi.viewport_ok is False and viewport_ok:
                    fail("not_mobile_friendly", self._label("not_mobile_friendly"))

        result.score = max(score, 0)
        result.failed = failed
        return result

    def _pagespeed_matters(self, score: int) -> bool:
        tiers = self.cfg.get("tiers", {})
        b_max = int(tiers.get("B", {}).get("max_score", 49))
        c_max = int(tiers.get("C", {}).get("max_score", 70))
        worst_case = score - self._weight("slow_pagespeed")
        if score <= b_max:
            return False  # already Tier B, PageSpeed can only confirm it
        if worst_case > c_max:
            return False  # excluded even if it's slow
        return True

    async def _fetch_home(self, url: str) -> tuple[Page | None, str, str]:
        """Try HTTPS first, then HTTP. Returns (page, ssl_state, error) where ssl_state is
        "ok", "invalid" or "none"."""
        https_url = _with_scheme(url, "https")
        http_url = _with_scheme(url, "http")
        try:
            return await self.http.get_page(https_url, retries=1), "ok", ""
        except FetchError as e:
            https_err = e
        if https_err.ssl:
            try:
                return await self.http.get_page(https_url, verify=False, retries=0), "invalid", ""
            except FetchError as e:
                https_err = e
        if "doesn't resolve" in str(https_err):
            return None, "none", str(https_err)
        try:
            page = await self.http.get_page(http_url, retries=1)
            return page, "ok" if urlsplit(page.url).scheme == "https" else "none", ""
        except FetchError as e:
            if e.ssl:  # http → https redirect onto a bad certificate
                try:
                    return await self.http.get_page(http_url, verify=False, retries=0), "invalid", ""
                except FetchError:
                    pass
            errors = [str(e), str(https_err)]
            blocked = next((x for x in errors if BLOCKED_RE.search(x)), None)
            return None, "none", blocked or next((x for x in errors if x.startswith("HTTP")), str(https_err))

    async def _contact_page_emails(self, soup, base_url: str) -> list[str]:
        candidates = []
        link = c.find_contact_link(soup, base_url)
        if link and link.rstrip("/") != base_url.rstrip("/"):
            candidates.append(link)
        for path in self.settings.get("contact_pages", ["/contatti", "/contact"]):
            candidates.append(urljoin(base_url, path))
        for cand in dict.fromkeys(candidates):
            if not await self.http.allowed(cand):
                continue
            try:
                page = await self.http.get_page(cand, retries=0)
            except FetchError:
                continue
            sub = c.parse(page.text)
            return c.extract_emails(sub, c.visible_text(sub))  # stop at the first contact page that exists
        return []


def normalise_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = "http://" + url.lstrip("/")
    parts = urlsplit(url)
    if not parts.hostname:
        return ""
    return urlunsplit((parts.scheme, parts.netloc, parts.path or "/", parts.query, ""))


def _with_scheme(url: str, scheme: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((scheme, parts.netloc, parts.path or "/", parts.query, ""))
