"""Writes a personal outreach message for each lead from its audit results, and builds
links that open it ready to send (Gmail, email app, WhatsApp). Nothing is sent
automatically: you review each message and press Send yourself."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from urllib.parse import quote

import phonenumbers
import yaml

from .config import CONFIG_DIR

SETTING_KEY = "outreach_templates"  # page-edited templates, stored in the database
CHANNELS = ("email", "whatsapp", "instagram", "facebook")
LANGUAGES = {"it": "Italiano", "en": "English"}

# Most important first (same order as the audit weights).
ISSUE_ORDER = [
    "no_https", "not_mobile_friendly", "slow_pagespeed", "old_copyright", "outdated_tech",
    "free_builder", "missing_meta", "no_contact_info", "no_english",
]

# For leads saved before failed_keys existed: recognise the default English labels.
_LABEL_PATTERNS = [
    ("no_https", re.compile(r"^Invalid SSL", re.I), lambda m: "invalid_ssl"),
    ("no_https", re.compile(r"^No HTTPS", re.I), lambda m: ""),
    ("not_mobile_friendly", re.compile(r"^Not mobile", re.I), lambda m: ""),
    ("slow_pagespeed", re.compile(r"PageSpeed (\d+)", re.I), lambda m: m.group(1)),
    ("old_copyright", re.compile(r"^©\s*(\d{4})"), lambda m: m.group(1)),
    ("outdated_tech", re.compile(r"^Outdated tech:?\s*(.*)", re.I), lambda m: m.group(1)),
    ("free_builder", re.compile(r"^Free builder subdomain \(([^)]+)\)", re.I), lambda m: m.group(1)),
    ("missing_meta", re.compile(r"^Missing (.*)", re.I), lambda m: m.group(1)),
    ("no_contact_info", re.compile(r"^No contact info", re.I), lambda m: ""),
    ("no_english", re.compile(r"^No English", re.I), lambda m: ""),
]


class TemplateError(ValueError):
    pass


@dataclass
class Message:
    case: str                      # no_website / social_only / broken_website / weak_website
    subject: str
    email: str
    chat: str
    issues: list[str] = field(default_factory=list)


# ── templates ───────────────────────────────────────────────────────


def default_templates_text() -> str:
    return (CONFIG_DIR / "outreach.yaml").read_text(encoding="utf-8")


def load_templates(override_text: str | None = None) -> dict:
    text = override_text or default_templates_text()
    try:
        data = yaml.safe_load(text) or {}
    except yaml.YAMLError as e:
        raise TemplateError(f"The templates aren't valid YAML: {e}") from e
    for lang in LANGUAGES:
        if lang not in data:
            raise TemplateError(f"The templates need an '{lang}:' section.")
        for part in ("subject", "email", "chat", "opening", "chat_opening", "offer", "issues"):
            if part not in data[lang]:
                raise TemplateError(f"'{lang}:' is missing '{part}:'.")
    return data


def validate_templates(text: str) -> dict:
    """Load and try every case in both languages, so a typo is caught before saving."""
    data = load_templates(text)
    samples = [
        {"name": "Test", "tier": "A", "failed_checks": "No website"},
        {"name": "Test", "tier": "A", "failed_checks": "No real website: social media only (facebook.com)", "website": "https://facebook.com/x"},
        {"name": "Test", "tier": "A", "failed_checks": "No real website: unreachable (timed out)", "website": "http://x.it"},
        {"name": "Test", "tier": "B", "failed_checks": "No HTTPS; ©2015; Slow on mobile (PageSpeed 30)", "website": "http://x.it"},
    ]
    for lang in LANGUAGES:
        for lead in samples:
            compose(lead, data, lang)
    return data


# ── what's wrong with this lead ─────────────────────────────────────


def lead_case(lead: dict) -> tuple[str, str]:
    """(case, extra): extra is the platform domain or the problem kind."""
    failed = (lead.get("failed_checks") or "").strip()
    if lead.get("tier") != "A":
        return "weak_website", ""
    low = failed.lower()
    if not failed or low.startswith("no website"):
        return "no_website", ""
    if "social media only" in low:
        m = re.search(r"\(([^)]+)\)", failed)
        return "social_only", (m.group(1) if m else "")
    if "parked" in low or "placeholder" in low:
        return "broken_website", "placeholder"
    return "broken_website", "offline"


def lead_issues(lead: dict) -> list[tuple[str, str]]:
    """[(check key, detail)] in order of importance."""
    found: dict[str, str] = {}
    raw = lead.get("failed_keys")
    if raw:
        try:
            found = {str(k): str(v) for k, v in json.loads(raw).items()}
        except (ValueError, AttributeError):
            found = {}
    if not found:
        for part in (lead.get("failed_checks") or "").split(";"):
            part = part.strip()
            for key, pat, detail in _LABEL_PATTERNS:
                m = pat.search(part)
                if m and key not in found:
                    found[key] = detail(m)
                    break
    return sorted(found.items(), key=lambda kv: ISSUE_ORDER.index(kv[0]) if kv[0] in ISSUE_ORDER else 99)


def _issue_text(key: str, detail: str, lang_t: dict, section: str = "issues") -> str | None:
    phrases = lang_t.get(section) or lang_t.get("issues", {})
    if key == "no_https" and detail == "invalid_ssl":
        key = "invalid_ssl"
    template = phrases.get(key)
    return template.format(detail=detail) if template else None


def _join(items: list[str], lang: str) -> str:
    word = " e " if lang == "it" else " and "
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + word + items[-1]


# ── composing ───────────────────────────────────────────────────────


def compose(lead: dict, templates: dict, lang: str = "it") -> Message:
    t = templates[lang]
    sender = templates.get("sender", {})
    case, extra = lead_case(lead)
    max_issues = int(templates.get("max_issues", 4))

    found = lead_issues(lead)
    issues = [x for x in (_issue_text(k, d, t) for k, d in found) if x][:max_issues]
    short = [x for x in (_issue_text(k, d, t, "issues_short") for k, d in found) if x][:3]
    if case == "weak_website" and not issues:
        issues = [t["issues"].get("generic", "")]
        short = [(t.get("issues_short") or t["issues"]).get("generic", "")]
    platforms = t.get("platforms", {})
    values = {
        "name": (lead.get("name") or "").strip(),
        "website": (lead.get("website") or "").strip(),
        "platform": platforms.get(extra, platforms.get("default", extra)) if case == "social_only" else "",
        "problem": t.get("problems", {}).get(extra, "") if case == "broken_website" else "",
        "issues": "\n".join(f"- {i}" for i in issues),
        "issues_inline": _join(short, lang),
        "sender_name": sender.get("name", ""),
        "business": sender.get("business", ""),
        "link": sender.get("link", ""),
        "price": " ".join(str(t.get("price", "")).split()),
        "price_short": t.get("price_short", ""),
    }
    try:
        values["opening"] = t["opening"][case].format(**values)
        values["chat_opening"] = t["chat_opening"][case].format(**values)
        values["offer"] = t["offer"][case].format(**values)
        subject = t["subject"][case].format(**values)
        email = t["email"].format(**values)
        chat = t["chat"].format(**values)
    except KeyError as e:
        raise TemplateError(f"Unknown placeholder or missing case {e} in the '{lang}' templates.") from e
    except (IndexError, ValueError) as e:
        raise TemplateError(f"A '{{' or '}}' in the '{lang}' templates isn't a valid placeholder: {e}") from e
    return Message(case=case, subject=subject.strip(), email=_tidy(email), chat=_tidy(chat), issues=issues)


def _tidy(text: str) -> str:
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return re.sub(r"  +", " ", text).strip()


# ── channels and links ──────────────────────────────────────────────


def first_email(lead: dict) -> str:
    return next((e.strip() for e in (lead.get("email") or "").split(";") if "@" in e), "")


def whatsapp_number(lead: dict) -> str:
    """Digits for wa.me, only for mobile numbers (landlines rarely have WhatsApp)."""
    raw = lead.get("phone") or ""
    try:
        num = phonenumbers.parse(raw, "IT")
    except phonenumbers.NumberParseException:
        return ""
    if phonenumbers.number_type(num) not in (phonenumbers.PhoneNumberType.MOBILE, phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE):
        return ""
    return phonenumbers.format_number(num, phonenumbers.PhoneNumberFormat.E164).lstrip("+")


def channels(lead: dict) -> dict[str, str]:
    """Available channels: {'email': address, 'whatsapp': digits, 'instagram': url, 'facebook': url}."""
    out = {}
    if first_email(lead):
        out["email"] = first_email(lead)
    if whatsapp_number(lead):
        out["whatsapp"] = whatsapp_number(lead)
    for net in ("instagram", "facebook"):
        if lead.get(net):
            out[net] = lead[net]
    return out


def gmail_url(to: str, subject: str, body: str) -> str:
    return (f"https://mail.google.com/mail/?view=cm&fs=1&to={quote(to)}"
            f"&su={quote(subject)}&body={quote(body)}")


def mailto_url(to: str, subject: str, body: str) -> str:
    return f"mailto:{quote(to, safe='@')}?subject={quote(subject)}&body={quote(body)}"


def whatsapp_url(number: str, text: str) -> str:
    return f"https://wa.me/{number}?text={quote(text)}"


def ready_to_contact(leads: list[dict]) -> list[dict]:
    """Leads not yet contacted (and not marked Do not contact) that have at least one channel."""
    todo = [
        lead for lead in leads
        if (lead.get("outreach_status") or "New") == "New" and channels(lead)
    ]
    order = {"A": 0, "B": 1, "C": 2}
    return sorted(todo, key=lambda r: (order.get(r.get("tier"), 9), r.get("score") if r.get("score") is not None else -1, r.get("name") or ""))
