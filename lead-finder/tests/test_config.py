import pytest

from leadfinder.config import ConfigError, split_list


def test_select_groups_and_categories_union(cfg):
    cats = cfg.select_categories(["b&bs", "Plumbers"], ["health"])
    keys = [c.key for c in cats]
    assert "bnbs" in keys and "plumbers" in keys
    assert {"dentists", "physiotherapists", "private-clinics", "vets"} <= set(keys)
    assert len(keys) == len(set(keys))


def test_aliases_and_names_match(cfg):
    assert [c.key for c in cfg.select_categories(["parrucchiere"])] == ["hair-salons"]
    assert [a.key for a in cfg.select_areas(["Prati / Vatican", "termini"])] == ["prati-vatican", "esquilino-termini"]


def test_all_of_rome_wins_and_is_tiled(cfg):
    areas = cfg.select_areas(["monti", "all"])
    assert [a.key for a in areas] == ["all"]
    assert len(areas[0].tiles) > 20
    # tiles are squares that don't overlap
    t0, t1 = areas[0].tiles[0], areas[0].tiles[1]
    assert t0.bbox[3] <= t1.bbox[1] + 1e-6 or t0.bbox[2] <= t1.bbox[0] + 1e-6


def test_unknown_names_are_reported(cfg):
    with pytest.raises(ConfigError, match="Unknown category"):
        cfg.select_categories(["spaceships"])
    with pytest.raises(ConfigError, match="Unknown area"):
        cfg.select_areas(["milano"])


def test_zone_contains(cfg):
    monti = cfg.areas["monti"]
    assert monti.contains(41.8953, 12.4913)
    assert not monti.contains(41.9067, 12.4610)  # Prati


def test_split_list():
    assert split_list(" a, b ,,c ") == ["a", "b", "c"]
    assert split_list(None) == []


def test_keys_are_reread_and_cleaned(cfg, monkeypatch):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", '  "AIzaKey123" \n')
    monkeypatch.delenv("PAGESPEED_API_KEY", raising=False)
    cfg.refresh_keys()
    assert cfg.google_api_key == "AIzaKey123"
    assert cfg.pagespeed_api_key == "AIzaKey123"
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "")
    cfg.refresh_keys()
    assert cfg.google_api_key is None
