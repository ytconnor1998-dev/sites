"""Storage for runs (with their filters), every business seen, and API usage.

Works with a local SQLite file, or a hosted Postgres database (e.g. Neon) when
DATABASE_URL is set — that's what the online dashboard uses, because hosted
apps lose their local files whenever they restart.
"""

from __future__ import annotations

import datetime as dt
import json
import sqlite3
import threading
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id            {serial_pk},
    started_at    TEXT NOT NULL,
    finished_at   TEXT,
    heartbeat_at  TEXT,              -- updated while the run is alive
    filters       TEXT NOT NULL,     -- JSON of the selection
    filters_label TEXT NOT NULL,     -- human-readable version for the spreadsheet
    source        TEXT,
    target        INTEGER,
    dry_run       INTEGER DEFAULT 0,
    status        TEXT DEFAULT 'running',
    scanned       INTEGER DEFAULT 0,
    new_leads     INTEGER DEFAULT 0,
    api_calls     TEXT DEFAULT '{{}}',
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
    run_id          INTEGER,
    run_filters     TEXT,
    found_at        TEXT,               -- when it became a lead
    last_checked_at TEXT,
    outreach_status TEXT DEFAULT '',
    notes           TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_biz_phone  ON businesses(phone_norm);
CREATE INDEX IF NOT EXISTS idx_biz_domain ON businesses(domain_key);
CREATE INDEX IF NOT EXISTS idx_biz_status ON businesses(status);

CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS api_usage (
    day   TEXT NOT NULL,
    api   TEXT NOT NULL,
    calls INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, api)
);
"""

# Columns added after the first release: (table, column, type)
MIGRATIONS = [
    ("runs", "heartbeat_at", "TEXT"),
    ("businesses", "failed_keys", "TEXT"),      # JSON {check key: detail}, used for outreach messages
    ("businesses", "instagram", "TEXT"),
    ("businesses", "facebook", "TEXT"),
    ("businesses", "contacted_at", "TEXT"),
    ("businesses", "contact_channel", "TEXT"),
]

LEAD_COLUMNS = [
    "uid", "tier", "name", "category", "group_name", "area", "address", "phone", "email", "website", "score",
    "failed_checks", "rating", "review_count", "maps_url", "run_filters", "found_at", "outreach_status", "notes",
    "source", "email_source", "pagespeed", "run_id",
    "failed_keys", "instagram", "facebook", "contacted_at", "contact_channel",
]

# A run whose heartbeat is older than this is treated as dead (app restarted mid-run).
STALE_RUN_MINUTES = 5


class DatabaseUnavailable(Exception):
    """The configured database can't be reached."""


def _describe_pg_error(e: Exception) -> str:
    msg = str(e).strip().splitlines()[0] if str(e).strip() else type(e).__name__
    # never echo the URL (it contains the password)
    if "password authentication failed" in msg:
        return "the database rejected the username/password in DATABASE_URL"
    if "could not translate host name" in msg or "Name or service not known" in msg:
        return "the database host in DATABASE_URL doesn't exist (check for a typo)"
    if "timeout" in msg.lower():
        return "the database didn't respond in time (it may be waking up: try again in a minute)"
    return msg.split("postgresql://")[0][:200]


def now() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")


def is_postgres_url(url: str) -> bool:
    return str(url).startswith(("postgres://", "postgresql://"))


class Database:
    def __init__(self, url_or_path: Path | str):
        target = str(url_or_path)
        self.postgres = is_postgres_url(target)
        self._lock = threading.RLock()
        if self.postgres:
            import psycopg
            from psycopg.rows import dict_row
            from psycopg_pool import ConnectionPool

            # Fail fast with a clear error if the URL is wrong or the server is unreachable,
            # instead of the pool retrying in the background.
            try:
                psycopg.connect(target, connect_timeout=15).close()
            except psycopg.Error as e:
                raise DatabaseUnavailable(_describe_pg_error(e)) from e

            # prepare_threshold=None: works through connection poolers such as Neon's "-pooler" host
            self.pool = ConnectionPool(
                target, min_size=0, max_size=4, open=True, timeout=30, check=ConnectionPool.check_connection,
                kwargs={"row_factory": dict_row, "autocommit": True, "prepare_threshold": None},
            )
            self.label = "online database"
        else:
            if target != ":memory:":
                Path(target).parent.mkdir(parents=True, exist_ok=True)
            self.conn = sqlite3.connect(target, check_same_thread=False, timeout=30)
            self.conn.row_factory = sqlite3.Row
            self.conn.execute("PRAGMA journal_mode=WAL")
            self.label = target
        self._init_schema()

    def close(self) -> None:
        if self.postgres:
            self.pool.close()
        else:
            self.conn.close()

    # ── low-level ───────────────────────────────────────────────────
    def _run(self, sql: str, params: tuple = (), fetch: str | None = None):
        """Execute one statement. `?` placeholders work for both databases."""
        if self.postgres:
            with self.pool.connection() as conn:
                cur = conn.execute(sql.replace("?", "%s"), params)
                if fetch == "one":
                    return cur.fetchone()
                if fetch == "all":
                    return cur.fetchall()
                return None
        with self._lock:
            cur = self.conn.execute(sql, params)
            result = None
            if fetch == "one":
                row = cur.fetchone()
                result = dict(row) if row else None
            elif fetch == "all":
                result = [dict(r) for r in cur.fetchall()]
            self.conn.commit()
            return result

    def _init_schema(self) -> None:
        schema = SCHEMA.format(serial_pk="SERIAL PRIMARY KEY" if self.postgres else "INTEGER PRIMARY KEY AUTOINCREMENT")
        for stmt in (s.strip() for s in schema.split(";")):
            if stmt:
                self._run(stmt)
        for table, column, col_type in MIGRATIONS:
            if self.postgres:
                self._run(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}")
            else:
                cols = {r["name"] for r in self._run(f"PRAGMA table_info({table})", fetch="all")}
                if column not in cols:
                    self._run(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

    # ── runs ────────────────────────────────────────────────────────
    def start_run(self, filters: dict, label: str, source: str, target: int, dry_run: bool) -> int:
        row = self._run(
            "INSERT INTO runs (started_at, heartbeat_at, filters, filters_label, source, target, dry_run) "
            "VALUES (?,?,?,?,?,?,?) RETURNING id",
            (now(), now(), json.dumps(filters), label, source, target, int(dry_run)),
            fetch="one",
        )
        return int(row["id"])

    def heartbeat(self, run_id: int, scanned: int, new_leads: int) -> None:
        self._run("UPDATE runs SET heartbeat_at=?, scanned=?, new_leads=? WHERE id=?", (now(), scanned, new_leads, run_id))

    def finish_run(self, run_id: int, status: str, scanned: int, new_leads: int, api_calls: dict, error: str | None = None) -> None:
        self._run(
            "UPDATE runs SET finished_at=?, heartbeat_at=?, status=?, scanned=?, new_leads=?, api_calls=?, error=? WHERE id=?",
            (now(), now(), status, scanned, new_leads, json.dumps(api_calls), error, run_id),
        )

    def mark_stale_runs(self) -> None:
        """Runs still 'running' with no recent heartbeat died with the app: mark them."""
        cutoff = (dt.datetime.now() - dt.timedelta(minutes=STALE_RUN_MINUTES)).isoformat(timespec="seconds")
        self._run(
            "UPDATE runs SET status='interrupted', finished_at=heartbeat_at, "
            "error='The app restarted during this run. Leads found before that are saved.' "
            "WHERE status='running' AND (heartbeat_at IS NULL OR heartbeat_at < ?)",
            (cutoff,),
        )

    def runs(self, limit: int = 50) -> list[dict]:
        return self._run("SELECT * FROM runs ORDER BY id DESC LIMIT ?", (limit,), fetch="all")

    # ── businesses ──────────────────────────────────────────────────
    def find_existing(self, uid: str, phone_norm: str, domain_key: str) -> dict | None:
        """Same place ID, or same phone, or same website domain."""
        row = self._run("SELECT * FROM businesses WHERE uid=?", (uid,), fetch="one")
        if not row and phone_norm:
            row = self._run("SELECT * FROM businesses WHERE phone_norm=? LIMIT 1", (phone_norm,), fetch="one")
        if not row and domain_key:
            row = self._run("SELECT * FROM businesses WHERE domain_key=? LIMIT 1", (domain_key,), fetch="one")
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
            self._run(f"UPDATE businesses SET {cols} WHERE uid=?", (*row.values(), existing_uid))
        else:
            cols = ", ".join(row)
            marks = ", ".join("?" for _ in row)
            updates = ", ".join(f"{k}=excluded.{k}" for k in row if k != "uid")
            self._run(
                f"INSERT INTO businesses ({cols}) VALUES ({marks}) ON CONFLICT (uid) DO UPDATE SET {updates}",
                tuple(row.values()),
            )

    def leads(self) -> list[dict]:
        cols = ", ".join(LEAD_COLUMNS)
        return self._run(
            f"SELECT {cols} FROM businesses WHERE status='lead' "
            "ORDER BY tier, CASE WHEN score IS NULL THEN -1 ELSE score END, name",
            fetch="all",
        )

    def count_leads(self) -> int:
        return int(self._run("SELECT COUNT(*) AS n FROM businesses WHERE status='lead'", fetch="one")["n"])

    def update_outreach(self, uid: str, status: str, notes: str) -> None:
        self._run("UPDATE businesses SET outreach_status=?, notes=? WHERE uid=?", (status or "", notes or "", uid))

    def mark_contacted(self, uid: str, channel: str) -> None:
        """Outreach sent: status Contacted, date and channel, and a line in the notes."""
        row = self._run("SELECT notes FROM businesses WHERE uid=?", (uid,), fetch="one") or {}
        stamp = now()
        line = f"Contacted by {channel} on {stamp[:10]}"
        notes = "\n".join(x for x in ((row.get("notes") or "").strip(), line) if x)
        self._run(
            "UPDATE businesses SET outreach_status='Contacted', contacted_at=?, contact_channel=?, notes=? WHERE uid=?",
            (stamp, channel, notes, uid),
        )

    def contacted_today(self) -> int:
        row = self._run("SELECT COUNT(*) AS n FROM businesses WHERE contacted_at LIKE ?", (dt.date.today().isoformat() + "%",), fetch="one")
        return int(row["n"])

    # ── settings edited on the page ─────────────────────────────────
    def get_setting(self, key: str) -> str | None:
        row = self._run("SELECT value FROM app_settings WHERE key=?", (key,), fetch="one")
        return row["value"] if row else None

    def set_setting(self, key: str, value: str) -> None:
        self._run(
            "INSERT INTO app_settings (key, value) VALUES (?,?) ON CONFLICT (key) DO UPDATE SET value=excluded.value",
            (key, value),
        )

    def delete_setting(self, key: str) -> None:
        self._run("DELETE FROM app_settings WHERE key=?", (key,))

    def status_counts(self) -> dict[str, int]:
        rows = self._run("SELECT status, COUNT(*) AS n FROM businesses GROUP BY status", fetch="all")
        return {r["status"]: int(r["n"]) for r in rows}

    def business_names(self) -> set[str]:
        return {r["name"] for r in self._run("SELECT name FROM businesses", fetch="all")}

    # ── API usage ───────────────────────────────────────────────────
    def record_call(self, api: str, n: int = 1) -> None:
        self._run(
            "INSERT INTO api_usage (day, api, calls) VALUES (?,?,?) "
            "ON CONFLICT (day, api) DO UPDATE SET calls = api_usage.calls + excluded.calls",
            (dt.date.today().isoformat(), api, n),
        )

    def usage_this_month(self, api: str) -> int:
        month = dt.date.today().strftime("%Y-%m")
        row = self._run("SELECT COALESCE(SUM(calls),0) AS n FROM api_usage WHERE api=? AND day LIKE ?", (api, month + "%"), fetch="one")
        return int(row["n"])

    def usage_today(self, api: str) -> int:
        row = self._run("SELECT COALESCE(SUM(calls),0) AS n FROM api_usage WHERE api=? AND day=?", (api, dt.date.today().isoformat()), fetch="one")
        return int(row["n"])
