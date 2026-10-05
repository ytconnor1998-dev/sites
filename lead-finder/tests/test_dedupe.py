from leadfinder.dedupe import domain_key, format_phone, normalise_phone


def test_phone_normalisation():
    assert normalise_phone("06 1234 5678") == normalise_phone("+39 06 12345678") == "+390612345678"
    assert normalise_phone("333 123 4567") == "+393331234567"
    assert normalise_phone("") == normalise_phone("abc") == ""
    assert format_phone("0612345678") == "+39 06 1234 5678"


def test_domain_key():
    assert domain_key("https://www.damario.it/menu", []) == "damario.it"
    assert domain_key("http://shop.damario.it", []) == "damario.it"
    shared = ["facebook.com", "wixsite.com"]
    assert domain_key("https://www.facebook.com/DaMario/", shared) == "facebook.com/damario"
    assert domain_key("https://damario.wixsite.com/home", shared) != domain_key("https://other.wixsite.com/home", shared)
