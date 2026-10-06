"""Lead finder dashboard.

Online: deployed on Streamlit Community Cloud (see README), keys in the app's Secrets.
Locally: streamlit run dashboard.py  (keys in .env)
"""

from __future__ import annotations

import hmac
import io
import os
import time

import pandas as pd
import streamlit as st

from leadfinder.config import ROOT, load_config
from leadfinder.db import Database, DatabaseUnavailable
from leadfinder.estimate import estimate, resolve_source
from leadfinder.export import STATUS_OPTIONS, default_export_path, export_leads
from leadfinder.logs import setup_logging
from leadfinder.pipeline import RunOptions
from leadfinder.runner import manager

st.set_page_config(page_title="Lead finder · CPD Web Design", page_icon="🔎", layout="wide")
ss = st.session_state
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def secrets_to_env() -> None:
    """Streamlit Cloud keeps keys in st.secrets; the rest of the code reads environment variables."""
    try:
        items = dict(st.secrets)
    except Exception:  # no secrets file (running locally with .env)
        return
    for key, value in items.items():
        if isinstance(value, (str, int, float)) and not os.getenv(key):
            os.environ[key] = str(value)


secrets_to_env()
setup_logging(console=False)


@st.cache_resource
def get_config():
    return load_config()


@st.cache_resource
def get_db(url: str):
    return Database(url)


cfg = get_config()  # also loads .env when running locally


# ── Login ───────────────────────────────────────────────────────────


def require_password() -> None:
    expected = os.getenv("APP_PASSWORD", "")
    if not expected:
        st.error("No password is set, so the dashboard is locked. Add APP_PASSWORD to the app's Secrets "
                 "(or to .env when running on your own computer).")
        st.stop()
    if ss.get("authed"):
        return
    st.title("Rome lead finder")
    with st.form("login"):
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Log in", type="primary")
    if submitted:
        if hmac.compare_digest(password.encode(), expected.encode()):
            ss.authed = True
            st.rerun()
        time.sleep(1.5)  # slows down password guessing
        st.error("Wrong password.")
    st.stop()


require_password()
try:
    db = get_db(cfg.db_url)
except DatabaseUnavailable as e:
    st.error(f"Can't connect to the database: {e}. Check DATABASE_URL in the app's Secrets, then reload the page.")
    st.stop()

head, logout = st.columns([6, 1])
head.title("Rome lead finder")
head.caption("Businesses in Rome with no website or a weak one, plus a phone number or email.")
if logout.button("Log out"):
    ss.authed = False
    st.rerun()

# ── 1. Selection ────────────────────────────────────────────────────


def toggle_group(group_key: str) -> None:
    on = ss[f"grp_{group_key}"]
    for c in cfg.categories.values():
        if c.group.key == group_key:
            ss[f"cat_{c.key}"] = on


left, right = st.columns([3, 2], gap="large")

with left:
    st.subheader("Business types")
    for g in cfg.groups.values():
        members = [c for c in cfg.categories.values() if c.group.key == g.key]
        chosen = sum(ss.get(f"cat_{c.key}", False) for c in members)
        with st.expander(f"{g.name}  ·  {chosen}/{len(members)} selected"):
            st.checkbox(f"All {g.name.lower()}", key=f"grp_{g.key}", on_change=toggle_group, args=(g.key,))
            cols = st.columns(3)
            for i, c in enumerate(members):
                cols[i % 3].checkbox(c.name, key=f"cat_{c.key}")

with right:
    st.subheader("Areas")
    all_rome = st.checkbox("All of Rome (many more API calls)", key="area_all")
    cols = st.columns(2)
    zone_keys = [k for k in cfg.areas if k != "all"]
    for i, k in enumerate(zone_keys):
        cols[i % 2].checkbox(cfg.areas[k].name, key=f"area_{k}", disabled=all_rome)

    st.subheader("Run")
    c1, c2 = st.columns(2)
    target = c1.number_input("Target leads", min_value=1, max_value=5000, value=int(cfg.settings.get("default_target", 100)), step=10)
    source = c2.selectbox("Source", ["auto", "google", "osm", "both"], help="auto = Google if a key is set, otherwise OpenStreetMap")
    dry_run = st.checkbox(f"Dry run ({cfg.settings.get('dry_run_limit', 10)} businesses)")

selected_cats = [k for k in cfg.categories if ss.get(f"cat_{k}")]
selected_areas = ["all"] if all_rome else [k for k in zone_keys if ss.get(f"area_{k}")]

# ── 2. Estimate + run ──────────────────────────────────────────────

st.divider()
if not selected_cats or not selected_areas:
    st.info("Pick at least one business type and one area to see the API-call estimate.")
else:
    cats = cfg.select_categories(selected_cats)
    areas = cfg.select_areas(selected_areas)
    src, warning = resolve_source(source, cfg)
    est = estimate(cfg, cats, areas, src, int(target), dry_run, db.usage_this_month("google_text_search"))
    box = st.warning if est.warnings or warning else st.info
    box("  \n".join(([warning] if warning else []) + est.lines()))

active = manager.current
busy = bool(active and active.running)
if st.button("Run search", type="primary", disabled=busy or not (selected_cats and selected_areas),
             help="A search is already running" if busy else None):
    try:
        manager.start(cfg, RunOptions(categories=selected_cats, areas=selected_areas, target=int(target),
                                      source=source, dry_run=dry_run))
    except RuntimeError as e:
        st.error(str(e))
    st.rerun()


def run_panel() -> None:
    run = manager.current
    if run is None:
        return
    p = run.progress
    if run.running:
        with st.container(border=True):
            st.markdown(f"**Searching…** {p.leads}/{p.target} leads "
                        f"(A {p.tiers['A']} · B {p.tiers['B']} · C {p.tiers['C']}) · "
                        f"{p.scanned} checked · {p.skipped_known} already known")
            st.progress(min(p.leads / max(p.target, 1), 1.0))
            st.caption(p.message or "Starting…")
            st.caption("You can close this page: the search keeps running and saves leads as it goes.")
            if st.button("Stop search"):
                run.stop()
                st.toast("Stopping after the current businesses…")
        return
    # finished: refresh the whole page once so the leads table includes the new leads
    if ss.get("refreshed_after") != id(run):
        ss.refreshed_after = id(run)
        st.rerun()
    calls = ", ".join(f"{k}: {v}" for k, v in p.api_calls.items()) or "no API calls"
    status = run.summary.status if run.summary else "failed"
    if run.error or status == "failed":
        st.error(f"Last search failed: {run.error}")
    else:
        errs = f" · {p.search_errors} searches failed (see the log below)" if p.search_errors else ""
        st.success(f"Last search {status}: {p.leads} new leads ({calls}){errs}")


# Poll every 2 seconds only while a search is running.
st.fragment(run_every=2 if busy else None)(run_panel)()

# ── 3. Results ─────────────────────────────────────────────────────

st.divider()
st.subheader("Leads")


def xlsx_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    export_leads(df.where(df.notna(), None).to_dict("records"), buf)
    return buf.getvalue()


def results() -> None:
    leads = pd.DataFrame(db.leads())
    if leads.empty:
        st.write("No leads yet. Run a search above.")
        return

    f1, f2, f3, f4, f5 = st.columns([1.3, 2, 2, 2, 2])
    tiers = f1.multiselect("Tier", ["A", "B", "C"], default=[])
    cat_f = f2.multiselect("Category", sorted(leads["category"].dropna().unique()))
    area_f = f3.multiselect("Area", sorted(leads["area"].dropna().unique()))
    stat_f = f4.multiselect("Status", ["(none)", *STATUS_OPTIONS])
    text_f = f5.text_input("Search", placeholder="name, address, email…")

    view = leads
    if tiers:
        view = view[view["tier"].isin(tiers)]
    if cat_f:
        view = view[view["category"].isin(cat_f)]
    if area_f:
        view = view[view["area"].isin(area_f)]
    if stat_f:
        want = set(stat_f)
        view = view[view["outreach_status"].fillna("").map(lambda s: (s or "(none)") in want)]
    if text_f:
        blob = view[["name", "address", "email", "website", "phone", "failed_checks"]].fillna("").agg(" ".join, axis=1)
        view = view[blob.str.contains(text_f, case=False, regex=False)]

    shown = ["tier", "name", "category", "area", "phone", "email", "website", "score", "failed_checks",
             "rating", "review_count", "maps_url", "found_at", "outreach_status", "notes"]
    edited = st.data_editor(
        view[["uid", *shown]],
        hide_index=True,
        use_container_width=True,
        height=min(560, 38 + 35 * max(len(view), 1)),
        disabled=[c for c in ["uid", *shown] if c not in ("outreach_status", "notes")],
        column_config={
            "uid": None,
            "tier": st.column_config.TextColumn("Tier", width="small"),
            "name": "Business",
            "category": "Category",
            "area": "Area",
            "phone": "Phone",
            "email": "Email",
            "website": st.column_config.LinkColumn("Website"),
            "score": st.column_config.NumberColumn("Score", width="small"),
            "failed_checks": st.column_config.TextColumn("Failed checks", width="large"),
            "rating": st.column_config.NumberColumn("Rating", format="%.1f", width="small"),
            "review_count": st.column_config.NumberColumn("Reviews", width="small"),
            "maps_url": st.column_config.LinkColumn("Maps", display_text="open"),
            "found_at": st.column_config.TextColumn("Found"),
            "outreach_status": st.column_config.SelectboxColumn("Status", options=["", *STATUS_OPTIONS]),
            "notes": st.column_config.TextColumn("Notes", width="medium"),
        },
        key="leads_editor",
    )
    st.caption(f"Showing {len(view)} of {len(leads)} leads. Status and Notes are editable: press Save after changing them.")

    changes = ss.get("leads_editor", {}).get("edited_rows", {})
    b1, b2, b3, _ = st.columns([1.3, 1.3, 1.6, 3])
    if b1.button("Save status/notes", disabled=not changes):
        for idx, row in edited.iterrows():
            orig = view.loc[idx]
            if (row["outreach_status"] or "") != (orig["outreach_status"] or "") or (row["notes"] or "") != (orig["notes"] or ""):
                db.update_outreach(row["uid"], row["outreach_status"], row["notes"])
        st.success("Saved.")
        st.rerun()

    b2.download_button("Export all to Excel", data=lambda: xlsx_bytes(leads),
                       file_name=default_export_path(cfg.export_dir).name, mime=XLSX)
    b3.download_button(f"Export filtered view ({len(view)})", data=lambda: xlsx_bytes(view),
                       file_name=default_export_path(cfg.export_dir, "filtered").name, mime=XLSX,
                       disabled=view.empty)


results()

# ── 4. History, usage and log ──────────────────────────────────────

st.divider()
h1, h2 = st.columns(2)
with h1.expander("Recent searches"):
    if not busy:
        db.mark_stale_runs()
    runs = pd.DataFrame(db.runs(20))
    if runs.empty:
        st.write("None yet.")
    else:
        st.dataframe(runs[["id", "started_at", "status", "filters_label", "scanned", "new_leads", "api_calls", "error"]],
                     hide_index=True, use_container_width=True)
    free = int(cfg.settings.get("google", {}).get("free_calls_per_month", 1000))
    st.caption(f"Google calls this month: {db.usage_this_month('google_text_search')} of ~{free} free · "
               f"PageSpeed calls today: {db.usage_today('pagespeed')}")
with h2.expander("Log (latest 200 lines)"):
    log_file = ROOT / "logs" / "leadfinder.log"
    if log_file.exists():
        lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()[-200:]
        st.code("\n".join(reversed(lines)) or "(empty)", language=None)
        st.caption("Newest first. The log resets when the app restarts.")
    else:
        st.write("Nothing logged yet.")
