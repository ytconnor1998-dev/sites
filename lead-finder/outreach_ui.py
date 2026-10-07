"""The Outreach tab: one lead at a time, a message written from its problems, and
buttons that open the message ready to send. You press Send yourself."""

from __future__ import annotations

import streamlit as st

from leadfinder.outreach import (
    LANGUAGES, SETTING_KEY, TemplateError, channels, compose, default_templates_text, gmail_url,
    load_templates, mailto_url, ready_to_contact, validate_templates, whatsapp_url,
)

CHANNEL_LABELS = {"email": "Email", "whatsapp": "WhatsApp", "instagram": "Instagram", "facebook": "Facebook"}


def outreach_tab(db, cfg) -> None:
    ss = st.session_state
    st.caption(
        "Each message is written from that business's actual problems. Nothing is sent automatically: "
        "the buttons open the message ready to send, you check it and press Send. "
        "Then mark it as contacted and move on to the next lead."
    )

    try:
        templates = load_templates(db.get_setting(SETTING_KEY))
    except TemplateError as e:
        st.error(f"The saved message templates have a problem ({e}), so the defaults are used. Fix them below.")
        templates = load_templates()

    f1, f2, f3 = st.columns([1.2, 2, 1.5])
    lang = f1.radio("Language", list(LANGUAGES), format_func=LANGUAGES.get, horizontal=True, key="out_lang")
    want_channels = f2.multiselect("Reachable by", list(CHANNEL_LABELS.values()), key="out_channels",
                                   help="Only show leads you can reach this way")
    want_tiers = f3.multiselect("Tier", ["A", "B", "C"], key="out_tiers")

    queue = ready_to_contact(db.leads())
    if want_tiers:
        queue = [r for r in queue if r.get("tier") in want_tiers]
    if want_channels:
        wanted = {k for k, v in CHANNEL_LABELS.items() if v in want_channels}
        queue = [r for r in queue if wanted & set(channels(r))]

    m1, m2, _ = st.columns([1, 1, 3])
    m1.metric("Ready to contact", len(queue))
    m2.metric("Contacted today", db.contacted_today())

    if not queue:
        st.success("Nobody left to contact with these filters. Run a new search, or change the filters.")
        _template_editor(db)
        return

    i = ss.get("out_idx", 0) % len(queue)
    lead = queue[i]
    try:
        msg = compose(lead, templates, lang)
    except TemplateError as e:
        st.error(f"Couldn't write the message: {e}")
        _template_editor(db)
        return
    reach = channels(lead)
    key = f"{lead['uid']}_{lang}"

    with st.container(border=True):
        st.markdown(f"### {lead['name']}")
        score = f" · score {lead['score']}" if lead.get("score") is not None else ""
        st.caption(f"Tier {lead.get('tier')}{score} · {lead.get('category')} · {lead.get('area')} · lead {i + 1} of {len(queue)}")
        facts = []
        if lead.get("website"):
            facts.append(f"[Website]({lead['website']})")
        if lead.get("maps_url"):
            facts.append(f"[Google Maps]({lead['maps_url']})")
        if lead.get("phone"):
            facts.append(f"📞 {lead['phone']}")
        if reach.get("email"):
            facts.append(f"✉️ {reach['email']}")
        st.markdown(" · ".join(facts))
        st.caption(f"Problems found: {lead.get('failed_checks') or '—'}")

        left, right = st.columns([3, 2], gap="large")
        with left:
            subject = st.text_input("Email subject", value=msg.subject, key=f"subj_{key}")
            body = st.text_area("Email", value=msg.email, height=380, key=f"body_{key}")
        with right:
            chat = st.text_area("Short message (WhatsApp, Instagram, Facebook)", value=msg.chat, height=200, key=f"chat_{key}")
            st.markdown("**Send it**")
            if "email" in reach:
                st.link_button("Open in Gmail", gmail_url(reach["email"], subject, body), use_container_width=True)
                st.link_button("Open in my email app", mailto_url(reach["email"], subject, body), use_container_width=True)
            if "whatsapp" in reach:
                st.link_button("Open in WhatsApp", whatsapp_url(reach["whatsapp"], chat), use_container_width=True)
            for net in ("instagram", "facebook"):
                if net in reach:
                    st.link_button(f"Open their {CHANNEL_LABELS[net]}", reach[net], use_container_width=True)
            if "instagram" in reach or "facebook" in reach:
                st.caption("For Instagram/Facebook: copy the message with the button on the box below, then paste it into a DM.")
                st.code(chat, language=None, wrap_lines=True)

        st.divider()
        a, b, c, d = st.columns([1.6, 2, 1, 1.4])
        via = a.selectbox("Sent by", [CHANNEL_LABELS[k] for k in reach], key=f"via_{lead['uid']}", label_visibility="collapsed")
        if b.button("✓ Sent: mark as contacted", type="primary", use_container_width=True):
            db.mark_contacted(lead["uid"], via)
            ss.out_idx = i  # the next lead moves into this position
            st.toast(f"{lead['name']} marked as contacted")
            st.rerun()
        if c.button("Skip →", use_container_width=True):
            ss.out_idx = i + 1
            st.rerun()
        if d.button("Do not contact", use_container_width=True):
            db.update_outreach(lead["uid"], "Do not contact", lead.get("notes") or "")
            ss.out_idx = i
            st.rerun()

    _template_editor(db)


def _template_editor(db) -> None:
    ss = st.session_state
    with st.expander("Edit message templates"):
        st.caption(
            "The wording of every message, in Italian and English. Placeholders like {name} are filled in "
            "automatically (they're explained at the top). Saved in the database, so changes survive restarts."
        )
        saved = db.get_setting(SETTING_KEY)
        text = st.text_area("Templates", value=saved or default_templates_text(), height=520, key="tpl_text",
                            label_visibility="collapsed")
        s1, s2, _ = st.columns([1, 1.6, 3])
        if s1.button("Save templates", type="primary"):
            try:
                validate_templates(text)
            except TemplateError as e:
                st.error(f"Not saved: {e}")
            else:
                db.set_setting(SETTING_KEY, text)
                st.success("Saved. New messages use these templates.")
        if s2.button("Reset to the original templates", disabled=not saved):
            db.delete_setting(SETTING_KEY)
            ss.pop("tpl_text", None)
            st.rerun()
