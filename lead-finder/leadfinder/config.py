"""Loads the YAML config files and resolves the user's category/area selection."""

from __future__ import annotations

import math
import os
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT / "config"


class ConfigError(ValueError):
    pass


@dataclass(frozen=True)
class Group:
    key: str
    name: str
    needs_english: bool = False


@dataclass(frozen=True)
class Category:
    key: str
    name: str
    group: Group
    google_types: tuple[str, ...]
    terms_it: tuple[str, ...]
    terms_en: tuple[str, ...]
    osm_tags: tuple[dict, ...]
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True)
class Tile:
    """One location restriction: a circle or polygon plus its bounding box."""

    lat: float
    lon: float
    radius_m: float | None = None
    polygon: tuple[tuple[float, float], ...] | None = None

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        """(south, west, north, east)."""
        if self.polygon:
            lats = [p[0] for p in self.polygon]
            lons = [p[1] for p in self.polygon]
            return min(lats), min(lons), max(lats), max(lons)
        dlat = self.radius_m / 111_320
        dlon = self.radius_m / (111_320 * math.cos(math.radians(self.lat)))
        return self.lat - dlat, self.lon - dlon, self.lat + dlat, self.lon + dlon

    def contains(self, lat: float, lon: float) -> bool:
        if self.polygon:
            return point_in_polygon(lat, lon, self.polygon)
        return haversine_m(self.lat, self.lon, lat, lon) <= self.radius_m


@dataclass(frozen=True)
class Area:
    key: str
    name: str
    shape: Tile
    tiles: tuple[Tile, ...]
    aliases: tuple[str, ...] = ()

    def contains(self, lat: float, lon: float) -> bool:
        return self.shape.contains(lat, lon)


@dataclass
class Config:
    groups: dict[str, Group]
    categories: dict[str, Category]
    areas: dict[str, Area]
    audit: dict
    settings: dict
    google_api_key: str | None = None
    pagespeed_api_key: str | None = None
    root: Path = field(default=ROOT)

    @property
    def db_path(self) -> Path:
        return _resolve(self.root, os.getenv("LEADFINDER_DB") or self.settings.get("database", "data/leads.db"))

    @property
    def export_dir(self) -> Path:
        return _resolve(self.root, self.settings.get("export_dir", "exports"))

    # ── selection ───────────────────────────────────────────────────
    def select_categories(self, categories: list[str] | None = None, groups: list[str] | None = None) -> list[Category]:
        """Union of the named categories and every category in the named groups."""
        chosen: dict[str, Category] = {}
        for raw in groups or []:
            group = self._match(raw, {g.key: (g.name,) for g in self.groups.values()}, "group")
            for cat in self.categories.values():
                if cat.group.key == group:
                    chosen[cat.key] = cat
        lookup = {c.key: (c.name, *c.aliases) for c in self.categories.values()}
        for raw in categories or []:
            key = self._match(raw, lookup, "category")
            chosen[key] = self.categories[key]
        # keep config order so runs are predictable
        return [c for k, c in self.categories.items() if k in chosen]

    def select_areas(self, areas: list[str] | None) -> list[Area]:
        lookup = {a.key: (a.name, *a.aliases) for a in self.areas.values()}
        keys = {self._match(raw, lookup, "area") for raw in areas or []}
        if "all" in keys:
            return [self.areas["all"]]
        return [a for k, a in self.areas.items() if k in keys]

    @staticmethod
    def _match(raw: str, lookup: dict[str, tuple[str, ...]], kind: str) -> str:
        want = _norm(raw)
        for key, names in lookup.items():
            if want in {_norm(key), *(_norm(n) for n in names)}:
                return key
        options = ", ".join(lookup)
        raise ConfigError(f"Unknown {kind} '{raw}'. Options: {options}")


def split_list(value: str | list[str] | None) -> list[str]:
    """'a, b,c' → ['a', 'b', 'c']."""
    if not value:
        return []
    if isinstance(value, str):
        value = value.split(",")
    return [v.strip() for v in value if v and v.strip()]


def load_config(config_dir: Path | None = None, env_file: Path | None = None) -> Config:
    config_dir = config_dir or CONFIG_DIR
    load_dotenv(env_file or (ROOT / ".env"))

    cats_raw = _load_yaml(config_dir / "categories.yaml")
    groups = {
        key: Group(key=key, name=g.get("name", key), needs_english=bool(g.get("needs_english", False)))
        for key, g in (cats_raw.get("groups") or {}).items()
    }
    categories: dict[str, Category] = {}
    for key, c in (cats_raw.get("categories") or {}).items():
        if c.get("group") not in groups:
            raise ConfigError(f"Category '{key}' has unknown group '{c.get('group')}'")
        terms_it = tuple(c.get("terms_it") or ())
        terms_en = tuple(c.get("terms_en") or ())
        if not terms_it and not terms_en:
            raise ConfigError(f"Category '{key}' needs at least one search term")
        categories[key] = Category(
            key=key,
            name=c.get("name", key),
            group=groups[c["group"]],
            google_types=tuple(c.get("google_types") or ()),
            terms_it=terms_it,
            terms_en=terms_en,
            osm_tags=tuple(dict(t) for t in c.get("osm_tags") or ()),
            aliases=tuple(str(a) for a in c.get("aliases") or ()),
        )

    areas = {key: _parse_area(key, a) for key, a in (_load_yaml(config_dir / "areas.yaml").get("areas") or {}).items()}

    return Config(
        groups=groups,
        categories=categories,
        areas=areas,
        audit=_load_yaml(config_dir / "audit.yaml"),
        settings=_load_yaml(config_dir / "settings.yaml"),
        google_api_key=os.getenv("GOOGLE_PLACES_API_KEY") or None,
        pagespeed_api_key=os.getenv("PAGESPEED_API_KEY") or os.getenv("GOOGLE_PLACES_API_KEY") or None,
        root=config_dir.parent,
    )


def _parse_area(key: str, a: dict) -> Area:
    if "polygon" in a:
        poly = tuple((float(p[0]), float(p[1])) for p in a["polygon"])
        lat = sum(p[0] for p in poly) / len(poly)
        lon = sum(p[1] for p in poly) / len(poly)
        shape = Tile(lat=lat, lon=lon, polygon=poly)
    elif "center" in a and "radius_m" in a:
        shape = Tile(lat=float(a["center"][0]), lon=float(a["center"][1]), radius_m=float(a["radius_m"]))
    else:
        raise ConfigError(f"Area '{key}' needs either center + radius_m or polygon")

    tiles: tuple[Tile, ...] = (shape,)
    if a.get("type") == "grid":
        tiles = tuple(grid_tiles(shape, float(a.get("tile_m", 3000))))
    return Area(key=key, name=a.get("name", key), shape=shape, tiles=tiles, aliases=tuple(a.get("aliases") or ()))


def grid_tiles(shape: Tile, tile_m: float) -> list[Tile]:
    """Non-overlapping square tiles (as polygons) covering the shape."""
    south, west, north, east = shape.bbox
    dlat = tile_m / 111_320
    dlon = tile_m / (111_320 * math.cos(math.radians(shape.lat)))
    half_diag = tile_m / math.sqrt(2)
    tiles = []
    lat = south + dlat / 2
    while lat < north:
        lon = west + dlon / 2
        while lon < east:
            # keep tiles that overlap the shape (centre within shape + half diagonal)
            if shape.polygon:
                keep = shape.contains(lat, lon)
            else:
                keep = haversine_m(shape.lat, shape.lon, lat, lon) <= shape.radius_m + half_diag * 0.5
            if keep:
                s, w, n, e = lat - dlat / 2, lon - dlon / 2, lat + dlat / 2, lon + dlon / 2
                square = tuple((round(a, 6), round(b, 6)) for a, b in ((s, w), (s, e), (n, e), (n, w)))
                tiles.append(Tile(lat=round(lat, 6), lon=round(lon, 6), polygon=square))
            lon += dlon
        lat += dlat
    return tiles


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def point_in_polygon(lat: float, lon: float, poly: tuple[tuple[float, float], ...]) -> bool:
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        yi, xi = poly[i]
        yj, xj = poly[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


def _load_yaml(path: Path) -> dict:
    if not path.exists():
        raise ConfigError(f"Missing config file: {path}")
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _resolve(root: Path, p: str) -> Path:
    path = Path(p)
    return path if path.is_absolute() else root / path
