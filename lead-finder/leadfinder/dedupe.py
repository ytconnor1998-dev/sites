"""Normalised keys used to spot the same business across sources and runs."""

from __future__ import annotations

from urllib.parse import urlsplit

import phonenumbers
import tldextract

# Offline: use the public suffix list bundled with tldextract, never download it.
_extract = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None)


def normalise_phone(raw: str) -> str:
    """'06 1234 5678' / '+39 06 12345678' → '+390612345678'. '' if it isn't a valid number."""
    if not raw:
        return ""
    try:
        num = phonenumbers.parse(raw, "IT")
    except phonenumbers.NumberParseException:
        return ""
    if not phonenumbers.is_possible_number(num):
        return ""
    return phonenumbers.format_number(num, phonenumbers.PhoneNumberFormat.E164)


def format_phone(raw: str) -> str:
    """Readable international format for the spreadsheet: '+39 06 1234 5678'."""
    try:
        num = phonenumbers.parse(raw, "IT")
        if phonenumbers.is_possible_number(num):
            return phonenumbers.format_number(num, phonenumbers.PhoneNumberFormat.INTERNATIONAL)
    except phonenumbers.NumberParseException:
        pass
    return raw.strip()


def domain_key(url: str, shared_hosts: list[str]) -> str:
    """Registrable domain ('ristorante.it'). For shared hosts (Facebook, wixsite, …) the
    full host + path, so two different pages on the same platform aren't merged."""
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = "http://" + url
    parts = urlsplit(url)
    host = (parts.hostname or "").lower().removeprefix("www.")
    if not host:
        return ""
    for shared in shared_hosts:
        shared = shared.lower()
        if host == shared or host.endswith("." + shared):
            path = parts.path.rstrip("/").lower()
            return f"{host}{path}"
    ext = _extract(host)
    return ext.top_domain_under_public_suffix if hasattr(ext, "top_domain_under_public_suffix") else ext.registered_domain or host
