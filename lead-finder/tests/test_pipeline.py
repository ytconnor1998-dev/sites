"""End-to-end run with Google, PageSpeed and the business websites all mocked."""

import json

import httpx
import openpyxl
import pytest
import respx
from conftest import fixture

from leadfinder.db import Database
from leadfinder.export import export_leads
from leadfinder.pipeline import Pipeline, RunOptions
from leadfinder.sources.google_places import SEARCH_URL
from leadfinder.audit.pagespeed import PSI_URL

IN_ZONE = {"latitude": 41.8885, "longitude": 12.4695}  # Trastevere centre


def place(pid, name, phone="", website="", location=IN_ZONE, **extra):
    p = {"id": pid, "displayName": {"text": name}, "formattedAddress": f"Via {name}, Roma", "location": location,
         "googleMapsUri": f"https://maps.google.com/?cid={pid}", "rating": 4.5, "userRatingCount": 120}
    if phone:
        p["nationalPhoneNumber"] = phone
    if website:
        p["websiteUri"] = website
    p.update(extra)
    return p


PAGE_1 = {
    "places": [
        place("p1", "Da Mario", phone="06 1234567", website="http://damario.it/"),
        place("p2", "Bella Pizza", phone="06 7654321", website="https://bellapizza.it/"),
        place("p3", "Bar Senza Sito", phone="333 1112223"),
        place("p4", "Mid Site", phone="06 5555555", website="https://midsite.it/"),
        place("p5", "Solo Facebook", website="https://www.facebook.com/solofb"),
        place("p6", "Far Away", phone="06 9999999", location={"latitude": 41.95, "longitude": 12.40}),
        place("p7", "Da Mario (dup)", phone="+39 06 1234567"),
        place("p8", "Chiuso", phone="06 8888888", businessStatus="CLOSED_PERMANENTLY"),
    ],
    "nextPageToken": "tok2",
}
PAGE_2 = {"places": [place("p9", "Second Page Bar", phone="06 4444444")]}

MID_HTML = """<html><head><title>Mid</title><meta name="description" content="x">
<link rel="alternate" hreflang="en" href="/en/"></head>
<body><p>Trattoria Mid Site, cucina tipica romana. Tel 06 5555555. Aperto tutti i giorni a pranzo e cena.</p>
<footer>© 2019 Mid Site</footer></body></html>"""


def mock_world(router: respx.Router, psi_score=0.3):
    def google(request):
        body = json.loads(request.content)
        return httpx.Response(200, json=PAGE_2 if body.get("pageToken") == "tok2" else PAGE_1)

    router.post(SEARCH_URL).mock(side_effect=google)
    router.get(url__startswith=PSI_URL).mock(return_value=httpx.Response(200, json={
        "lighthouseResult": {"categories": {"performance": {"score": psi_score}}, "audits": {"viewport": {"score": 1}}}}))
    # Da Mario: no HTTPS, old site, email on contact page
    router.get("https://damario.it/").mock(side_effect=httpx.ConnectError("Connection refused"))
    router.get("http://damario.it/robots.txt").mock(return_value=httpx.Response(404))
    router.get("http://damario.it/").mock(return_value=httpx.Response(200, html=fixture("old_site.html")))
    router.get("http://damario.it/contatti.html").mock(return_value=httpx.Response(200, html=fixture("old_site_contatti.html")))
    # Bella Pizza: modern
    router.get("https://bellapizza.it/robots.txt").mock(return_value=httpx.Response(200, text="User-agent: *\nDisallow: /admin\n"))
    router.get("https://bellapizza.it/").mock(return_value=httpx.Response(200, html=fixture("modern_site.html")))
    router.get(url__regex=r"https://bellapizza\.it/(contatti|contact)").mock(return_value=httpx.Response(404))
    # Mid Site: borderline → PageSpeed decides
    router.get("https://midsite.it/robots.txt").mock(return_value=httpx.Response(404))
    router.get("https://midsite.it/").mock(return_value=httpx.Response(200, html=MID_HTML))
    router.get(url__regex=r"https://midsite\.it/(contatti|contact)").mock(return_value=httpx.Response(404))


def run(cfg, db, **kw):
    opts = RunOptions(categories=["trattorie"], areas=["trastevere"], target=kw.pop("target", 100), source="google", **kw)
    return Pipeline(cfg, db).run(opts)


@pytest.fixture
def db(cfg):
    d = Database(cfg.db_path)
    yield d
    d.close()


def test_full_run_tiers_contacts_and_rerun(cfg, db):
    with respx.mock(assert_all_called=False) as router:
        mock_world(router)
        summary = run(cfg, db)

        assert summary.status == "completed"
        leads = {r["name"]: r for r in db.leads()}
        assert set(leads) == {"Da Mario", "Bar Senza Sito", "Mid Site", "Second Page Bar"}

        mario = leads["Da Mario"]
        assert mario["tier"] == "B" and mario["score"] == 25
        assert mario["failed_checks"] == (
            "No HTTPS; Not mobile-friendly; ©2015; Outdated tech: table layout, jQuery 1.11, WordPress 4.2.1; "
            "Missing meta description; No contact info on homepage; No English version"
        )
        assert mario["email"] == "info@damario.it" and mario["email_source"] == "website"
        assert mario["phone"] == "+39 06 123 4567"

        assert leads["Bar Senza Sito"]["tier"] == "A"
        assert leads["Bar Senza Sito"]["failed_checks"] == "No website"

        mid = leads["Mid Site"]
        assert mid["tier"] == "C" and mid["score"] == 55
        assert "Slow on mobile (PageSpeed 30)" in mid["failed_checks"]

        counts = db.status_counts()
        assert counts.get("excluded") == 1      # Bella Pizza
        assert counts.get("no_contact") == 1    # Solo Facebook
        # outside the zone, permanently closed and duplicate phone never stored
        names = {r[0] for r in db.conn.execute("SELECT name FROM businesses")}
        assert not names & {"Far Away", "Chiuso", "Da Mario (dup)"}

        # PageSpeed only ran for the borderline site
        psi_route = [r for r in router.routes if r.pattern and PSI_URL in repr(r.pattern)][0]
        assert psi_route.call_count == 1

        run_row = db.runs()[0]
        assert "Categories: Trattorie" in run_row["filters_label"] and "Areas: Trastevere" in run_row["filters_label"]
        assert json.loads(run_row["filters"])["areas"] == ["trastevere"]

        # Rerun: everything already known is skipped, nothing new is saved
        second = run(cfg, db)
        assert second.progress.leads == 0
        assert second.progress.skipped_known >= 6
        assert len(db.leads()) == 4


def test_target_stops_before_next_page(cfg, db):
    with respx.mock(assert_all_called=False) as router:
        mock_world(router)
        summary = run(cfg, db, target=2)
        assert summary.progress.leads >= 2
        google_calls = [json.loads(c.request.content) for c in router.calls if c.request.url == SEARCH_URL]
        assert all("pageToken" not in b for b in google_calls)
        assert google_calls[0]["locationRestriction"]["rectangle"]["low"]["latitude"] < 41.8885
        assert google_calls[0]["includedType"] == "italian_restaurant"


def test_dry_run_processes_at_most_10(cfg, db):
    cfg.settings["dry_run_limit"] = 3
    with respx.mock(assert_all_called=False) as router:
        mock_world(router)
        summary = run(cfg, db, dry_run=True)
        assert summary.progress.scanned <= 3
        assert json.loads(db.runs()[0]["filters"])["dry_run"] is True


def test_broken_site_does_not_crash(cfg, db, monkeypatch):
    from leadfinder.audit import checks

    def boom(*a, **k):
        raise RuntimeError("parser exploded")

    monkeypatch.setattr(checks, "outdated_tech", boom)
    with respx.mock(assert_all_called=False) as router:
        mock_world(router)
        summary = run(cfg, db)
        assert summary.status == "completed"
        assert db.status_counts().get("skipped", 0) >= 1
        assert "Bar Senza Sito" in {r["name"] for r in db.leads()}


def test_bad_api_key_fails_cleanly(cfg, db):
    with respx.mock(assert_all_called=False) as router:
        router.post(SEARCH_URL).mock(return_value=httpx.Response(403, json={"error": {"status": "PERMISSION_DENIED"}}))
        summary = run(cfg, db)
        assert summary.status == "failed"
        assert "API key" in summary.error


def test_excel_export(cfg, db, tmp_path):
    with respx.mock(assert_all_called=False) as router:
        mock_world(router)
        run(cfg, db)
    path = export_leads(db.leads(), tmp_path / "out.xlsx")
    wb = openpyxl.load_workbook(path)
    ws = wb["Leads"]
    headers = [c.value for c in ws[1]]
    assert headers[:4] == ["Tier", "Business name", "Category", "Group"]
    assert headers[-2:] == ["Status", "Notes"]
    assert ws.freeze_panes == "C2"
    assert ws.auto_filter.ref.startswith("A1:")
    tiers = [ws.cell(row=r, column=1).value for r in range(2, ws.max_row + 1)]
    assert tiers == sorted(tiers)
    scores = [ws.cell(row=r, column=10).value for r in range(2, ws.max_row + 1) if ws.cell(row=r, column=1).value != "A"]
    assert scores == sorted(scores)
    assert ws.cell(row=2, column=1).fill.fgColor.rgb.endswith("E57373")


def test_all_searches_failing_is_a_failed_run(cfg, db):
    with respx.mock(assert_all_called=False) as router:
        router.post(SEARCH_URL).mock(return_value=httpx.Response(500, text="backend error"))
        summary = run(cfg, db)
        assert summary.status == "failed"
        assert "Every search failed" in summary.error
        assert db.runs()[0]["status"] == "failed"
