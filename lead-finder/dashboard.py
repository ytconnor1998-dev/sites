"""Local dashboard:  streamlit run dashboard.py"""

from __future__ import annotations

import io

import pandas as pd
import streamlit as st

from leadfinder.config import ConfigError, load_config
from leadfinder.db import Database
from leadfinder.estimate import estimate, resolve_source
from leadfinder.export import STATUS_OPTIONS, default_export_path, export_leads
from leadfinder.logs import setup_logging
from leadfinder.pipeline import FatalRunError, Pipeline, RunOptions

st.set_page_config(page_title="Lead finder · CPD Web Design", page_icon="🔎", layout="wide")
setup_logging(console=False)


@st.cache_resource
def get_config():
    return load_config()


@st.cache_resource
def get_db(path: str):
    return Database(path)


cfg = get_config()
db = get_db(str(cfg.db_path))
ss = st.session_state

st.title("Rome lead finder")
st.caption("Businesses in Rome with no website or a weak one, plus a phone number or email.")

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

run_clicked = st.button("Run search", type="primary", disabled=not (selected_cats and selected_areas))

if run_clicked:
    status = st.status("Running…", expanded=True)
    bar = status.progress(0.0)
    line = status.empty()

    def on_progress(p):
        bar.progress(min(p.leads / max(p.target, 1), 1.0))
        line.markdown(
            f"**{p.leads}/{p.target} leads** (A {p.tiers['A']} · B {p.tiers['B']} · C {p.tiers['C']}) · "
            f"{p.scanned} checked · {p.skipped_known} already known  \n{p.message}"
        )

    try:
        summary = Pipeline(cfg, db, on_progress=on_progress).run(
            RunOptions(categories=selected_cats, areas=selected_areas, target=int(target), source=source, dry_run=dry_run)
        )
    except (FatalRunError, ConfigError) as e:
        status.update(label=str(e), state="error")
    else:
        p = summary.progress
        calls = ", ".join(f"{k}: {v}" for k, v in p.api_calls.items()) or "no API calls"
        if summary.status == "failed":
            status.update(label=f"Run failed: {summary.error}", state="error")
        else:
            errs = f" · {p.search_errors} searches failed, see logs/leadfinder.log" if p.search_errors else ""
            status.update(label=f"Run {summary.status}: {p.leads} new leads ({calls}){errs}",
                          state="complete", expanded=bool(errs))

# ── 3. Results ─────────────────────────────────────────────────────

st.divider()
st.subheader("Leads in the database")
leads = pd.DataFrame(db.leads())
if leads.empty:
    st.write("No leads yet.")
    st.stop()

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
st.caption(f"Showing {len(view)} of {len(leads)} leads. Status and Notes are editable and saved to the database.")

changes = ss.get("leads_editor", {}).get("edited_rows", {})
b1, b2, b3, _ = st.columns([1.3, 1.3, 1.6, 3])
if b1.button("Save status/notes", disabled=not changes):
    for idx, row in edited.iterrows():
        orig = view.loc[idx]
        if (row["outreach_status"] or "") != (orig["outreach_status"] or "") or (row["notes"] or "") != (orig["notes"] or ""):
            db.update_outreach(row["uid"], row["outreach_status"], row["notes"])
    st.success("Saved.")
    st.rerun()


def xlsx_bytes(df: pd.DataFrame, suffix: str) -> bytes:
    rows = df.where(df.notna(), None).to_dict("records")
    export_leads(rows, default_export_path(cfg.export_dir, suffix))  # keep a copy in exports/
    buf = io.BytesIO()
    export_leads(rows, buf)
    return buf.getvalue()


b2.download_button("Export all to Excel", data=lambda: xlsx_bytes(leads, "all"),
                   file_name=default_export_path(cfg.export_dir).name,
                   mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
b3.download_button(f"Export filtered view ({len(view)})", data=lambda: xlsx_bytes(view, "filtered"),
                   file_name=default_export_path(cfg.export_dir, "filtered").name,
                   mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                   disabled=view.empty)

with st.expander("Recent runs"):
    runs = pd.DataFrame(db.runs(20))
    if not runs.empty:
        st.dataframe(runs[["id", "started_at", "status", "filters_label", "scanned", "new_leads", "api_calls", "error"]],
                     hide_index=True, use_container_width=True)
