"""Individual website checks. Pure functions over parsed HTML, so they're easy to test."""

from __future__ import annotations

import datetime as dt
import re
from urllib.parse import unquote, urljoin, urlsplit

from bs4 import BeautifulSoup

# ── helpers ──────────────────────────────────────────────────────────


def parse(html: str) -> BeautifulSoup:
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:  # pragma: no cover - lxml missing or choking
        return BeautifulSoup(html, "html.parser")


def visible_text(soup: BeautifulSoup) -> str:
    soup = BeautifulSoup(str(soup), "lxml")  # don't mutate the caller's tree
    for tag in soup(["script", "style", "noscript", "template", "svg"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ")).strip()


def host_of(url: str) -> str:
    host = urlsplit(url).hostname or ""
    return host.lower().removeprefix("www.")


def host_matches(url: str, domains: list[str]) -> str | None:
    """Return the matching entry if the URL's host is (a subdomain of) one of `domains`.
    Entries with a path (e.g. sites.google.com) match on host only."""
    host = host_of(url)
    for d in domains:
        d = d.lower().removeprefix("www.")
        if host == d or host.endswith("." + d):
            return d
    return None


# ── 1. no real website ───────────────────────────────────────────────


def social_link(url: str, social_domains: list[str]) -> str | None:
    return host_matches(url, social_domains)


def parked_reason(final_url: str, html: str, text: str, cfg: dict) -> str | None:
    if host_matches(final_url, cfg.get("parking_hosts", [])):
        return "parked domain"
    lower = text.lower()
    if len(text) < 1500:
        for phrase in cfg.get("parking_phrases", []):
            if phrase.lower() in lower:
                return f'placeholder page ("{phrase}")'
    # Tiny page with almost no text. Big HTML with little text is probably a JS app, so leave it.
    if len(text) < int(cfg.get("min_text_chars", 80)) and len(html) < 5000:
        return "empty placeholder page"
    return None


# ── 3. mobile ────────────────────────────────────────────────────────


def has_viewport(soup: BeautifulSoup) -> bool:
    for meta in soup.find_all("meta", attrs={"name": re.compile(r"^viewport$", re.I)}):
        if "width" in (meta.get("content") or "").lower():
            return True
    return False


# ── 5. copyright year ────────────────────────────────────────────────

_YEAR = re.compile(r"\b((?:19|20)\d{2})\b")
_COPY = re.compile(r"©|&copy;|\(c\)|copyright", re.I)


def copyright_year(soup: BeautifulSoup, text: str) -> int | None:
    """Latest year next to a © mark, preferring the footer. None if not found."""
    regions = [visible_text(f) for f in soup.find_all(["footer"])]
    regions += [visible_text(el) for el in soup.find_all(attrs={"id": re.compile("footer|copyright", re.I)})]
    regions += [visible_text(el) for el in soup.find_all(attrs={"class": re.compile("footer|copyright", re.I)})]
    regions.append(text[-3000:])
    this_year = dt.date.today().year
    for region in regions:
        years = []
        for m in _COPY.finditer(region):
            window = region[max(0, m.start() - 30): m.end() + 60]
            years += [int(y) for y in _YEAR.findall(window) if 1995 <= int(y) <= this_year]
        if years:
            return max(years)
    return None


# ── 6. outdated tech ─────────────────────────────────────────────────

_JQ_PATTERNS = [
    re.compile(r"jquery[-.](\d+)\.(\d+)(?:\.\d+)?(?:\.slim)?(?:\.min)?\.js", re.I),
    re.compile(r"/jquery(?:\.min)?\.js\?ver=(\d+)\.(\d+)", re.I),
    re.compile(r"/jquery/(\d+)\.(\d+)\.\d+/", re.I),
    re.compile(r"jquery v(\d+)\.(\d+)", re.I),
]


def jquery_version(soup: BeautifulSoup, html: str) -> tuple[int, int] | None:
    found = []
    sources = [s.get("src", "") for s in soup.find_all("script") if s.get("src")]
    for src in sources:
        if "migrate" in src.lower() or "jquery-ui" in src.lower() or "jquery.ui" in src.lower():
            continue
        for pat in _JQ_PATTERNS[:3]:
            m = pat.search(src)
            if m:
                found.append((int(m.group(1)), int(m.group(2))))
                break
    m = _JQ_PATTERNS[3].search(html)
    if m:
        found.append((int(m.group(1)), int(m.group(2))))
    return min(found) if found else None


def generator(soup: BeautifulSoup) -> tuple[str, str] | None:
    meta = soup.find("meta", attrs={"name": re.compile(r"^generator$", re.I)})
    if not meta:
        return None
    m = re.match(r"\s*([A-Za-z][A-Za-z .-]*?)\s+v?(\d+(?:\.\d+)*)", meta.get("content") or "")
    return (m.group(1).strip(), m.group(2)) if m else None


def uses_flash(soup: BeautifulSoup, html: str) -> bool:
    lower = html.lower()
    if "application/x-shockwave-flash" in lower or "swfobject" in lower:
        return True
    for tag in soup.find_all(["object", "embed", "param"]):
        for attr in ("src", "data", "value"):
            if str(tag.get(attr, "")).lower().split("?")[0].endswith(".swf"):
                return True
    return False


def table_layout(soup: BeautifulSoup) -> bool:
    tables = soup.find_all("table")
    if not tables:
        return False
    if any(t.find_parent("table") for t in tables):
        return True  # nested tables
    layout_attrs = ("cellpadding", "cellspacing", "bgcolor", "background")
    styled = [t for t in tables if any(t.has_attr(a) for a in layout_attrs) or str(t.get("width", "")) in ("100%", "800", "760", "780", "900", "960", "1000")]
    if len(styled) >= 2:
        return True
    # one table holding most of the page
    body_text = len(visible_text(soup.body or soup))
    biggest = max(len(visible_text(t)) for t in tables)
    return body_text > 300 and biggest > 0.7 * body_text and not any(t.find("th") for t in tables)


def outdated_tech(soup: BeautifulSoup, html: str, cfg: dict) -> list[str]:
    issues = []
    if uses_flash(soup, html):
        issues.append("Flash")
    if table_layout(soup):
        issues.append("table layout")
    jq = jquery_version(soup, html)
    if jq and jq[0] < int(cfg.get("jquery_min_major", 2)):
        issues.append(f"jQuery {jq[0]}.{jq[1]}")
    gen = generator(soup)
    if gen:
        name, version = gen
        for cms, min_v in (cfg.get("generator_min_versions") or {}).items():
            if name.lower() == cms.lower() and _vtuple(version) < _vtuple(str(min_v)):
                issues.append(f"{cms} {version}")
    return issues


def _vtuple(v: str) -> tuple[int, ...]:
    return tuple(int(x) for x in re.findall(r"\d+", v)[:3])


# ── 7. free builder ──────────────────────────────────────────────────


def free_builder(url: str, domains: list[str]) -> str | None:
    host = host_of(url)
    for d in domains:
        d = d.lower()
        if "/" in d or d == "sites.google.com":
            if host == "sites.google.com" and d.startswith("sites.google.com"):
                return d
            continue
        # a subdomain of the builder (mybar.wixsite.com), not the builder's own site
        if host.endswith("." + d):
            return d
    return None


# ── 8. title / meta description ──────────────────────────────────────


def missing_meta(soup: BeautifulSoup) -> list[str]:
    missing = []
    title = soup.find("title")
    if not title or not title.get_text(strip=True):
        missing.append("title")
    desc = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    if not desc or not (desc.get("content") or "").strip():
        missing.append("meta description")
    return missing


# ── 9. contact info ──────────────────────────────────────────────────

PHONE_RE = re.compile(r"(?<!\d)(?:\+39[\s.]?)?(?:0\d{1,3}|3\d{2})[\s./-]?\d{3,4}[\s./-]?\d{2,4}(?!\d)")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def has_contact_info(soup: BeautifulSoup, text: str) -> bool:
    for a in soup.find_all("a", href=True):
        href = a["href"].strip().lower()
        if href.startswith(("tel:", "mailto:", "callto:")) or "wa.me/" in href or "api.whatsapp.com" in href:
            return True
    if any(_looks_like_phone(m, text) for m in PHONE_RE.finditer(text)):
        return True
    return bool(extract_emails(soup, text))


def _looks_like_phone(m: re.Match, text: str) -> bool:
    """Rule out Partita IVA / codice fiscale numbers (11 digits, usually labelled)."""
    digits = re.sub(r"\D", "", m.group())
    before = text[max(0, m.start() - 25): m.start()].lower()
    if re.search(r"p\.?\s*iva|partita|c\.?\s*f\.|codice fiscale|vat|rea", before):
        return False
    return not (len(digits) == 11 and not m.group().startswith("+"))


# ── 10. English version ──────────────────────────────────────────────

_EN_HREF = re.compile(r"(?:^|/)en(?:[/._-]|$)|[_-]en\.(?:html?|php)$|[?&](?:lang|language|lng|locale|hl)=en\b", re.I)
_EN_TEXT = {"en", "eng", "english", "inglese", "english version", "🇬🇧", "🇺🇸"}


def has_english(soup: BeautifulSoup, base_url: str) -> bool:
    html_tag = soup.find("html")
    if html_tag and str(html_tag.get("lang", "")).lower().startswith("en"):
        return True
    if soup.find(["link", "a"], attrs={"hreflang": re.compile(r"^en", re.I)}):
        return True
    lower = str(soup).lower()
    if any(k in lower for k in ("gtranslate", "translate.google", "weglot", "lang-item-en", "wpml-ls-item-en")):
        return True
    base_host = host_of(base_url)
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        label = (a.get_text(" ", strip=True) or a.get("title") or a.get("aria-label") or "").strip().lower()
        img = a.find("img")
        if img:
            label = label or (img.get("alt") or img.get("title") or "").lower()
        if label in _EN_TEXT:
            return True
        full = urljoin(base_url, href)
        parts = urlsplit(full)
        if host_of(full) not in (base_host, f"en.{base_host}") and not host_of(full).startswith("en."):
            continue
        if host_of(full).startswith("en.") or _EN_HREF.search(parts.path) or _EN_HREF.search("?" + parts.query):
            return True
    return False


# ── emails ───────────────────────────────────────────────────────────

_EMAIL_BLOCK_DOMAINS = (
    "example.com", "example.it", "domain.com", "dominio.it", "email.com", "yourdomain.com", "tuodominio.it",
    "sentry.io", "wixpress.com", "sentry-next.wixpress.com", "sentry.wixpress.com", "godaddy.com", "w3.org",
    "schema.org", "jquery.com", "wordpress.org", "mysite.com", "latofu.com",
)
_EMAIL_BLOCK_SUFFIX = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js")


def extract_emails(soup: BeautifulSoup, text: str) -> list[str]:
    found: list[str] = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("mailto:"):
            addr = unquote(href[7:]).split("?")[0]
            found += [x.strip() for x in addr.split(",")]
    for el in soup.find_all(attrs={"data-cfemail": True}):  # Cloudflare email obfuscation
        decoded = _cf_decode(el["data-cfemail"])
        if decoded:
            found.append(decoded)
    for a in soup.find_all("a", href=re.compile(r"/cdn-cgi/l/email-protection#")):
        decoded = _cf_decode(a["href"].split("#", 1)[1])
        if decoded:
            found.append(decoded)
    deobf = re.sub(r"\s*[\[(]\s*(?:at|chiocciola)\s*[\])]\s*", "@", text, flags=re.I)
    deobf = re.sub(r"\s*[\[(]\s*(?:dot|punto)\s*[\])]\s*", ".", deobf, flags=re.I)
    found += EMAIL_RE.findall(deobf)
    return clean_emails(found)


def clean_emails(emails: list[str]) -> list[str]:
    out: list[str] = []
    for e in emails:
        e = e.strip().strip(".,;:()<>[]\"'").lower()
        if not EMAIL_RE.fullmatch(e):
            continue
        domain = e.split("@", 1)[1]
        if e.endswith(_EMAIL_BLOCK_SUFFIX) or domain in _EMAIL_BLOCK_DOMAINS or domain.endswith(".wixpress.com"):
            continue
        if re.search(r"@\d+x\.", e):  # image@2x.png leftovers
            continue
        if e not in out:
            out.append(e)
    return out


def rank_emails(emails: list[str], website: str) -> list[str]:
    """Emails on the business's own domain first, then the rest."""
    site = host_of(website)
    own = [e for e in emails if site and (e.split("@")[1] == site or site.endswith("." + e.split("@")[1]))]
    return own + [e for e in emails if e not in own]


def _cf_decode(hexstr: str) -> str | None:
    try:
        data = bytes.fromhex(hexstr)
        key = data[0]
        return bytes(b ^ key for b in data[1:]).decode("utf-8")
    except (ValueError, IndexError, UnicodeDecodeError):
        return None


def find_contact_link(soup: BeautifulSoup, base_url: str) -> str | None:
    """A same-site link that looks like the contact page."""
    base_host = host_of(base_url)
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        label = a.get_text(" ", strip=True).lower()
        if href.startswith(("mailto:", "tel:", "#", "javascript:")):
            continue
        full = urljoin(base_url, href)
        if host_of(full) != base_host:
            continue
        path = urlsplit(full).path.lower()
        if re.search(r"contatt|contact", path) or label in ("contatti", "contattaci", "contact", "contacts", "contact us"):
            return full.split("#")[0]
    return None


# ── social profiles (for outreach) ───────────────────────────────────

_SOCIAL_PATTERNS = {
    "instagram": re.compile(r"^https?://(?:www\.)?instagram\.com/([A-Za-z0-9_.]{2,30})/?(?:\?.*)?$", re.I),
    "facebook": re.compile(r"^https?://(?:www\.|m\.|it-it\.)?facebook\.com/([A-Za-z0-9.\-]{3,80})/?(?:\?.*)?$", re.I),
}
_SOCIAL_SKIP = {"p", "reel", "reels", "explore", "stories", "sharer", "sharer.php", "share", "tr", "plugins", "dialog", "groups", "events", "watch"}


def social_profile(url: str) -> tuple[str, str] | None:
    """('instagram', 'https://www.instagram.com/name/') for a profile link, else None."""
    for network, pat in _SOCIAL_PATTERNS.items():
        m = pat.match((url or "").strip())
        if m and m.group(1).lower() not in _SOCIAL_SKIP:
            return network, f"https://www.{network}.com/{m.group(1)}/"
    return None


def social_profiles(soup: BeautifulSoup, base_url: str) -> dict[str, str]:
    found: dict[str, str] = {}
    for a in soup.find_all("a", href=True):
        hit = social_profile(urljoin(base_url, a["href"]))
        if hit and hit[0] not in found:
            found[hit[0]] = hit[1]
    return found
