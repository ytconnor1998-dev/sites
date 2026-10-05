"""SQLite storage: runs (with their filters), every business seen, and API usage."""

from __future__ import annotations

import datetime as dt
import json
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at    TEXT NOT NULL,
    finished_at   TEXT,
    filters       TEXT NOT NULL,     -- JSON of the selection
    filters_label TEXT NOT NULL,     -- human-readable version for the spreadsheet
    source        TEXT,
    target        INTEGER,
    dry_run       INTEGER DEFAULT 0,
    status        TEXT DEFAULT 'running',
    scanned       INTEGER DEFAULT 0,
    new_leads     INTEGER DEFAULT 0,
    api_calls     TEXT DEFAULT '{}',
    error         TEXT
);

CREATE TABLE IF NOT EXISTS businesses (
    uid             TEXT PRIMARY KEY,   -- "google:<place id>" or "osm:node/123"
    source          TEXT,
    name            TEXT,
    category_key    TEXT,
    category        TEXT,
    group_name      TEXT,
    area            TEXT,
    address         TEXT,
    lat             REAL,
    lon             REAL,
    phone           TEXT,
    phone_norm      TEXT,
    email           TEXT,
    email_source    TEXT,
    website         TEXT,
    domain_key      TEXT,
    rating          REAL,
    review_count    INTEGER,
    maps_url        TEXT,
    status          TEXT,               -- lead / excluded / no_contact / skipped
    tier            TEXT,
    score           INTEGER,
    failed_checks   TEXT,
    pagespeed       INTEGER,
    audit_note      TEXT,
    run_id          INTEGER REFERENCES runs(id),
    run_filters     TEXT,
    found_at        TEXT,               -- when it became a lead
    last_checked_at TEXT,
    outreach_status TEXT DEFAULT '',
    notes           TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_biz_phone  ON businesses(phone_norm);
CREATE INDEX IF NOT EXISTS idx_biz_domain ON businesses(domain_key);
CREATE INDEX IF NOT EXISTS idx_biz_status ON businesses(status);

CREATE TABLE IF NOT EXISTS api_usage (
    day   TEXT NOT NULL,
    api   TEXT NOT NULL,
    calls INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, api)
);
"""

LEAD_COLUMNS = [
    "uid", "tier", "name", "category", "group_name", "area", "address", "phone", "email", "website", "score",
    "failed_checks", "rating", "review_count", "maps_url", "run_filters", "found_at", "outreach_status", "notes",
    "source", "email_source", "pagespeed", "run_id",
]


def now() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")


class Database:
    def __init__(self, path: Path | str):
        self.path = Path(path)
        if str(path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path), check_same_thread=False, timeout=30)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.executescript(SCHEMA)

    def close(self) -> None:
        self.conn.close()

    # ── runs ────────────────────────────────────────────────────────
    def start_run(self, filters: dict, label: str, source: str, target: int, dry_run: bool) -> int:
        cur = self.conn.execute(
            "INSERT INTO runs (started_at, filters, filters_label, source, target, dry_run) VALUES (?,?,?,?,?,?)",
            (now(), json.dumps(filters), label, source, target, int(dry_run)),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def finish_run(self, run_id: int, status: str, scanned: int, new_leads: int, api_calls: dict, error: str | None = None) -> None:
        self.conn.execute(
            "UPDATE runs SET finished_at=?, status=?, scanned=?, new_leads=?, api_calls=?, error=? WHERE id=?",
            (now(), status, scanned, new_leads, json.dumps(api_calls), error, run_id),
        )
        self.conn.commit()

    def runs(self, limit: int = 50) -> list[dict]:
        rows = self.conn.execute("SELECT * FROM runs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    # ── businesses ──────────────────────────────────────────────────
    def find_existing(self, uid: str, phone_norm: str, domain_key: str) -> dict | None:
        """Same place ID, or same phone, or same website domain."""
        row = self.conn.execute("SELECT * FROM businesses WHERE uid=?", (uid,)).fetchone()
        if not row and phone_norm:
            row = self.conn.execute("SELECT * FROM businesses WHERE phone_norm=? LIMIT 1", (phone_norm,)).fetchone()
        if not row and domain_key:
            row = self.conn.execute("SELECT * FROM businesses WHERE domain_key=? LIMIT 1", (domain_key,)).fetchone()
        return dict(row) if row else None

    def should_skip(self, existing: dict | None, recheck_days: int) -> bool:
        """Leads are never re-processed. Non-qualifying businesses are re-checked after `recheck_days`."""
        if not existing:
            return False
        if existing["status"] == "lead":
            return True
        checked = existing.get("last_checked_at")
        if not checked:
            return False
        age = dt.datetime.now() - dt.datetime.fromisoformat(checked)
        return age.days < recheck_days

    def save_business(self, row: dict, existing_uid: str | None = None) -> None:
        """Insert, or update the previously stored row (matched by uid/phone/domain).
        Outreach status and notes are never overwritten."""
        row = dict(row)
        row["last_checked_at"] = now()
        if existing_uid:
            row.pop("uid", None)
            cols = ", ".join(f"{k}=?" for k in row)
            self.conn.execute(f"UPDATE businesses SET {cols} WHERE uid=?", (*row.values(), existing_uid))
        else:
            cols = ", ".join(row)
            marks = ", ".join("?" for _ in row)
            self.conn.execute(f"INSERT OR REPLACE INTO businesses ({cols}) VALUES ({marks})", tuple(row.values()))
        self.conn.commit()

    def leads(self) -> list[dict]:
        cols = ", ".join(LEAD_COLUMNS)
        rows = self.conn.execute(
            f"SELECT {cols} FROM businesses WHERE status='lead' "
            "ORDER BY tier, CASE WHEN score IS NULL THEN -1 ELSE score END, name"
        ).fetchall()
        return [dict(r) for r in rows]

    def count_leads(self) -> int:
        return self.conn.execute("SELECT COUNT(*) FROM businesses WHERE status='lead'").fetchone()[0]

    def update_outreach(self, uid: str, status: str, notes: str) -> None:
        self.conn.execute("UPDATE businesses SET outreach_status=?, notes=? WHERE uid=?", (status or "", notes or "", uid))
        self.conn.commit()

    def status_counts(self) -> dict[str, int]:
        rows = self.conn.execute("SELECT status, COUNT(*) FROM businesses GROUP BY status").fetchall()
        return {r[0]: r[1] for r in rows}

    # ── API usage ───────────────────────────────────────────────────
    def record_call(self, api: str, n: int = 1) -> None:
        day = dt.date.today().isoformat()
        self.conn.execute(
            "INSERT INTO api_usage (day, api, calls) VALUES (?,?,?) "
            "ON CONFLICT(day, api) DO UPDATE SET calls = calls + excluded.calls",
            (day, api, n),
        )
        self.conn.commit()

    def usage_this_month(self, api: str) -> int:
        month = dt.date.today().strftime("%Y-%m")
        row = self.conn.execute("SELECT COALESCE(SUM(calls),0) FROM api_usage WHERE api=? AND day LIKE ?", (api, month + "%")).fetchone()
        return int(row[0])

    def usage_today(self, api: str) -> int:
        row = self.conn.execute("SELECT COALESCE(SUM(calls),0) FROM api_usage WHERE api=? AND day=?", (api, dt.date.today().isoformat())).fetchone()
        return int(row[0])
