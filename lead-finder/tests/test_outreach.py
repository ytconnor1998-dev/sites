from urllib.parse import parse_qs, unquote, urlsplit

import pytest

from leadfinder.audit import checks as c
from leadfinder.db import Database
from leadfinder.outreach import (
    TemplateError, channels, compose, default_templates_text, gmail_url, lead_case, lead_issues, load_templates,
    mailto_url, ready_to_contact, validate_templates, whatsapp_url,
)

T = load_templates()
WEAK = {
    "uid": "google:1", "name": "Da Mario", "tier": "B", "score": 25, "website": "http://damario.it/",
    "email": "info@damario.it; other@x.it", "phone": "+39 333 123 4567",
    "failed_checks": "No HTTPS; Not mobile-friendly; ©2015; Outdated tech: table layout; No English version",
}


def test_cases_from_audit_results():
    assert lead_case({"tier": "A", "failed_checks": "No website"}) == ("no_website", "")
    assert lead_case({"tier": "A", "failed_checks": "No real website: social media only (instagram.com)"}) == ("social_only", "instagram.com")
    assert lead_case({"tier": "A", "failed_checks": "No real website: unreachable (timed out)"}) == ("broken_website", "offline")
    assert lead_case({"tier": "A", "failed_checks": "No real website: parked domain"}) == ("broken_website", "placeholder")
    assert lead_case(WEAK) == ("weak_website", "")


def test_issues_prefer_structured_keys_and_fall_back_to_labels():
    keys = [k for k, _ in lead_issues(WEAK)]
    assert keys[:3] == ["no_https", "not_mobile_friendly", "old_copyright"]
    structured = dict(WEAK, failed_keys='{"slow_pagespeed": "31", "no_https": "invalid_ssl"}')
    assert lead_issues(structured) == [("no_https", "invalid_ssl"), ("slow_pagespeed", "31")]


def test_italian_email_names_the_real_problems_and_price():
    m = compose(WEAK, T, "it")
    assert m.subject == "Qualche idea per il sito di Da Mario"
    assert "Connor Davies" in m.email and "https://ui-ux-skill-cpd-web-design.vercel.app/" in m.email
    assert "49 € al mese" in m.email
    assert "© 2015" in m.email and "manca HTTPS" in m.email
    assert "rispondete pure \"no\"" in m.email  # opt-out line
    assert len(m.issues) == 4  # max_issues
    assert "{" not in m.email and "{" not in m.chat


def test_every_case_in_both_languages():
    leads = [
        {"name": "A", "tier": "A", "failed_checks": "No website"},
        {"name": "B", "tier": "A", "failed_checks": "No real website: social media only (facebook.com)", "website": "https://facebook.com/b"},
        {"name": "C", "tier": "A", "failed_checks": "No real website: placeholder page (\"coming soon\")", "website": "http://c.it"},
        {"name": "D", "tier": "C", "failed_checks": "", "website": "https://d.it"},  # no parsable issues → generic
        WEAK,
    ]
    for lang in ("it", "en"):
        for lead in leads:
            m = compose(lead, T, lang)
            assert lead["name"] in m.email and lead["name"] in m.chat
            assert "{" not in m.email and "  " not in m.chat
    assert "Facebook" in compose(leads[1], T, "en").email
    assert "placeholder page" in compose(leads[2], T, "en").email


def test_channels_and_links():
    ch = channels(dict(WEAK, instagram="https://www.instagram.com/damario/"))
    assert ch == {"email": "info@damario.it", "whatsapp": "393331234567", "instagram": "https://www.instagram.com/damario/"}
    assert "whatsapp" not in channels({"phone": "06 1234 5678"})  # landline
    g = urlsplit(gmail_url("info@damario.it", "Ciao è", "riga 1\nriga 2"))
    q = parse_qs(g.query)
    assert q["to"] == ["info@damario.it"] and q["su"] == ["Ciao è"] and q["body"] == ["riga 1\nriga 2"]
    assert mailto_url("a@b.it", "S", "x y").startswith("mailto:a@b.it?subject=S&body=x%20y")
    assert unquote(whatsapp_url("39333", "ciao 🙂").split("text=")[1]) == "ciao 🙂"


def test_queue_skips_contacted_and_do_not_contact():
    leads = [
        dict(WEAK, uid="1", outreach_status=""),
        dict(WEAK, uid="2", outreach_status="Contacted"),
        dict(WEAK, uid="3", outreach_status="Do not contact"),
        {"uid": "4", "tier": "A", "name": "No channel", "phone": "06 1234 5678", "outreach_status": None},
        {"uid": "5", "tier": "A", "name": "Insta only", "instagram": "https://www.instagram.com/x/", "outreach_status": "New"},
    ]
    assert [r["uid"] for r in ready_to_contact(leads)] == ["5", "1"]


def test_template_validation_catches_mistakes():
    validate_templates(default_templates_text())
    with pytest.raises(TemplateError):
        validate_templates(default_templates_text().replace('"Un sito web per {name}"', '"Un sito web per {nmae}"', 1))
    with pytest.raises(TemplateError):
        validate_templates("it: [unclosed")


def test_social_profile_links_found_on_homepage():
    soup = c.parse('<a href="https://www.instagram.com/p/abc/">post</a><a href="https://instagram.com/bar_roma">ig</a>'
                   '<a href="https://www.facebook.com/sharer.php?u=x">share</a><a href="https://m.facebook.com/BarRoma/">fb</a>')
    assert c.social_profiles(soup, "https://bar.it/") == {
        "instagram": "https://www.instagram.com/bar_roma/", "facebook": "https://www.facebook.com/BarRoma/"}


def test_mark_contacted_and_settings(db_url):
    db = Database(db_url)
    db.save_business({"uid": "x:1", "name": "Bar", "status": "lead", "tier": "A", "notes": "met owner"})
    db.mark_contacted("x:1", "WhatsApp")
    row = db.leads()[0]
    assert row["outreach_status"] == "Contacted" and row["contact_channel"] == "WhatsApp"
    assert row["notes"].startswith("met owner\nContacted by WhatsApp on ")
    assert db.contacted_today() == 1
    db.set_setting("outreach_templates", "a")
    db.set_setting("outreach_templates", "b")
    assert db.get_setting("outreach_templates") == "b"
    db.delete_setting("outreach_templates")
    assert db.get_setting("outreach_templates") is None
    db.close()
