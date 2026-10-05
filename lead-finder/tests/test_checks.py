from conftest import fixture

from leadfinder.audit import checks as c


def soup_text(html):
    s = c.parse(html)
    return s, c.visible_text(s)


def test_old_site_checks(cfg):
    html = fixture("old_site.html")
    soup, text = soup_text(html)
    assert not c.has_viewport(soup)
    assert c.copyright_year(soup, text) == 2015
    tech = c.outdated_tech(soup, html, cfg.audit["checks"]["outdated_tech"])
    assert "table layout" in tech and "jQuery 1.11" in tech and "WordPress 4.2.1" in tech
    assert c.missing_meta(soup) == ["meta description"]
    assert not c.has_contact_info(soup, text)
    assert not c.has_english(soup, "http://damario.it/")
    assert c.find_contact_link(soup, "http://damario.it/") == "http://damario.it/contatti.html"


def test_modern_site_passes(cfg):
    html = fixture("modern_site.html")
    soup, text = soup_text(html)
    assert c.has_viewport(soup)
    assert c.copyright_year(soup, text) == 2025
    assert c.outdated_tech(soup, html, cfg.audit["checks"]["outdated_tech"]) == []
    assert c.missing_meta(soup) == []
    assert c.has_contact_info(soup, text)
    assert c.has_english(soup, "https://bellapizza.it/")
    assert c.extract_emails(soup, text) == ["ciao@bellapizza.it"]


def test_obfuscated_and_junk_emails():
    soup, text = soup_text(fixture("old_site_contatti.html"))
    assert c.extract_emails(soup, text) == ["info@damario.it"]
    # Cloudflare-protected address
    key = 0x2A
    encoded = bytes([key]).hex() + bytes(b ^ key for b in b"info@damario.it").hex()
    soup, text = soup_text(f'<a class="__cf_email__" data-cfemail="{encoded}">[email protected]</a>')
    assert c.extract_emails(soup, text) == ["info@damario.it"]
    assert c.clean_emails(["logo@2x.png", "user@example.com", "x@sentry.wixpress.com", "OK@Bar.IT"]) == ["ok@bar.it"]


def test_vat_number_is_not_a_phone():
    soup, text = soup_text("<footer>P.IVA 01234567890</footer>")
    assert not c.has_contact_info(soup, text)
    for phone in ["Tel. 06 1234567", "chiamaci al 333 123 4567", "+39 0612345678"]:
        soup, text = soup_text(f"<p>{phone}</p>")
        assert c.has_contact_info(soup, text), phone


def test_parked_and_social(cfg):
    html = fixture("parked.html")
    soup, text = soup_text(html)
    assert c.parked_reason("http://damario.com/", html, text, cfg.audit).startswith("placeholder page")
    assert c.parked_reason("https://sedoparking.com/x", "<p>x</p>", "x", cfg.audit) == "parked domain"
    assert c.social_link("https://m.facebook.com/damario", cfg.audit["social_domains"]) == "facebook.com"
    assert c.social_link("https://damario.it", cfg.audit["social_domains"]) is None


def test_long_page_mentioning_coming_soon_is_not_parked(cfg):
    html = fixture("modern_site.html").replace("</main>", "<p>" + "Nuovo menu coming soon! " * 100 + "</p></main>")
    soup, text = soup_text(html)
    assert c.parked_reason("https://bellapizza.it/", html, text, cfg.audit) is None


def test_free_builder(cfg):
    domains = cfg.audit["checks"]["free_builder"]["domains"]
    assert c.free_builder("https://damario.wixsite.com/home", domains) == "wixsite.com"
    assert c.free_builder("https://sites.google.com/view/damario", domains) == "sites.google.com"
    assert c.free_builder("https://www.wix.com/", domains) is None
    assert c.free_builder("https://damario.it/", domains) is None


def test_english_detection_variants():
    for html in [
        '<html lang="en"><body></body></html>',
        '<a href="/index_en.html">x</a>',
        '<a href="?lang=en">x</a>',
        '<a href="/en">English</a>',
        '<li class="lang-item lang-item-en"><a href="/x">x</a></li>',
    ]:
        soup = c.parse(html)
        assert c.has_english(soup, "https://site.it/"), html
    soup = c.parse('<a href="/menu">Menu</a><a href="https://other.com/en/">x</a>')
    assert not c.has_english(soup, "https://site.it/")


def test_copyright_variants():
    for html, year in [
        ("<footer>© 2012 - 2019 Foo</footer>", 2019),
        ("<footer>Tutti i diritti riservati 2016 ©</footer>", 2016),
        ("<footer>Copyright Foo srl</footer>", None),
    ]:
        soup, text = soup_text(html)
        assert c.copyright_year(soup, text) == year
