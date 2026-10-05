# Rome lead finder

Finds businesses in Rome that have **no website or a weak one** and a public **phone number or email**, scores their sites, and exports the leads to Excel. Internal tool for CPD Web Design.

- **Sources:** Google Places API (New), with OpenStreetMap (Overpass) as the free fallback.
- **Website audit:** HTTPS, mobile-friendliness, PageSpeed, copyright year, outdated tech, free-builder subdomains, title/description, contact info, English version.
- **Output:** a colour-coded Excel file plus a SQLite database, so reruns skip businesses already found.
- **Interfaces:** a command line (`cli.py`) and a local dashboard (`dashboard.py`).

---

## Setup (Windows, PowerShell)

You need **Python 3.10 or newer**. Check with `py --version`; if it's missing, install it from [python.org](https://www.python.org/downloads/) and tick "Add python.exe to PATH".

```powershell
cd path\to\sites\lead-finder
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
notepad .env
```

If PowerShell refuses to run `Activate.ps1`, run this once, then try again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Run `.venv\Scripts\Activate.ps1` every time you open a new PowerShell window. `(.venv)` appears at the start of the prompt when it's active.

### Google API keys

You can skip this step: the tool then uses OpenStreetMap, which is free but lists fewer Rome businesses.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project, e.g. "lead-finder".
2. **APIs & Services → Library**: enable **Places API (New)** and **PageSpeed Insights API**.
3. **Billing**: link a billing account. Places requires one, even when you stay inside the free usage.
4. **APIs & Services → Credentials → Create credentials → API key**. Under *API restrictions*, restrict the key to those two APIs.
5. Paste the key into `.env` as `GOOGLE_PLACES_API_KEY=...`. PageSpeed reuses the same key unless you set `PAGESPEED_API_KEY`.
6. **Recommended safety net:** in **APIs & Services → Places API (New) → Quotas**, set a daily cap on Text Search requests (e.g. 30/day ≈ 900/month). Also add a budget alert under **Billing → Budgets & alerts**. Then a mistake can't run up a bill.

#### What it costs

- **Google Text Search:** the tool asks Text Search for the phone, website, rating and Maps link directly. That's **1 call per 20 businesses**, with no separate Place Details calls. Requesting those fields puts each call in Google's "Text Search Enterprise" price tier. The free allowance is set in `config/settings.yaml` (`free_calls_per_month: 1000`); check it against [Google's pricing page](https://developers.google.com/maps/billing-and-pricing/pricing) because Google changes it.
- **Usage tracking:** the tool counts its own calls in the database and shows *"used this month"* before every run.
- **PageSpeed Insights:** free (25,000 calls a day). It only runs on borderline sites, where the speed check can change the tier.

---

## Using the command line

```powershell
# Show every category, group and area key
python cli.py list

# Cheap test: processes 10 businesses only
python cli.py run --categories "restaurants,b&bs" --areas monti --dry-run

# Free test (OpenStreetMap only, no Google calls)
python cli.py run --groups tourist-facing --areas trastevere --source osm --dry-run

# A real run
python cli.py run --groups "tourist-facing" --categories "barbers" --areas "trastevere,monti" --target 100

# Re-export every lead in the database to Excel
python cli.py export
```

Before searching, the tool prints the estimated API calls and asks you to confirm. Add `--yes` to skip the question.

| Option | Meaning |
|---|---|
| `--categories` / `-c` | Comma-separated categories. Accepts the key (`bnbs`), the name (`B&Bs`) or an alias (`parrucchiere`). |
| `--groups` / `-g` | Comma-separated groups, e.g. `tourist-facing,trades`. Can be combined with `--categories`. |
| `--areas` / `-a` | Comma-separated zones, or `all` for all of Rome. |
| `--target` / `-t` | Stop once this many **new** qualifying leads are found (default 100). |
| `--source` | `auto` (Google if a key is set, otherwise OSM), `google`, `osm` or `both`. |
| `--dry-run` | Process only 10 businesses. |
| `--no-export` | Don't write the Excel file at the end. |
| `--verbose` / `-v` | Print every business as it's checked. |

The tool only queries the category × area combinations you select. It takes Google result pages in turn across all of them, so a run that hits its target early still covers every selection, and it stops paying as soon as the target is reached.

## Using the dashboard

```powershell
streamlit run dashboard.py
```

It opens at http://localhost:8501. From there you can:

- **Search:** tick business types (a group's *All* box selects the whole group) and areas, set the target, and watch the API estimate update. Then press **Run search**.
- **Browse leads:** filter and sort every lead in the database. Click a column header to sort.
- **Track outreach:** edit **Status** and **Notes** in the table, then press **Save status/notes**. These are stored in the database and included in every export, so re-exporting never loses your outreach tracking.
- **Export:** download **Export all** or **Export filtered view**. A copy is also saved in `exports\`.

Don't change selections while a run is in progress: Streamlit restarts the page and the run stops. Leads found up to that point are already saved.

---

## How leads are scored

| Tier | Meaning |
|---|---|
| **A** | No website, or no *real* website: only a social media/booking profile, unreachable, parked, or a placeholder page. |
| **B** | Website scores **below 50**. |
| **C** | Website scores **50–70**. |
| — | Above 70: excluded. |

Every site starts at 100. Weights are in `config/audit.yaml`:

| Check | Weight |
|---|---|
| No HTTPS, or invalid SSL certificate | −20 |
| Not mobile-friendly (no viewport meta, or Lighthouse viewport audit fails) | −20 |
| PageSpeed mobile performance below 50 | −15 |
| Footer © year older than 2022 | −10 |
| Outdated tech: Flash, table layout, jQuery < 2, old WordPress/Joomla/Drupal | −10 |
| Hosted on a free builder subdomain (wixsite.com, altervista.org, …) | −10 |
| Missing `<title>` or meta description | −5 |
| No `tel:`/`mailto:` link and no visible phone/email on the homepage | −5 |
| No English version (only for groups with `needs_english: true`) | −5 |

The **Failed checks** column lists the failures in plain words, e.g. `No HTTPS; Not mobile-friendly; ©2017`.

A few rules worth knowing:

- **No contact, no lead.** Only businesses with at least a phone or an email are kept. Emails come from OpenStreetMap tags, or from the business's homepage plus one contact page (`/contatti` or `/contact`). The tool never crawls further than that.
- **Blocked sites are skipped.** If a site blocks automated visitors (HTTP 403/429), or its robots.txt disallows us, the business is marked *skipped*. It isn't treated as having no website.
- **Duplicates are merged.** Within a run, the same business is detected by Google place ID, then normalised phone number, then website domain.
- **Reruns skip known businesses.** Leads are never processed again. Businesses that didn't qualify are re-checked after 90 days (`recheck_excluded_after_days`).

## Changing the configuration

Edit these files; no code changes needed.

| File | What's in it |
|---|---|
| `config/categories.yaml` | Business types and groups. Copy an entry to add a category: display name, group, Google type, Italian/English search terms and OSM tags. |
| `config/areas.yaml` | Rome zones as centre + radius, or a polygon. "All of Rome" is split into 3 km tiles because Google returns at most 60 results per query. |
| `config/audit.yaml` | The checklist: weights, labels, tier cut-offs, free-builder domains, social/parking domains. |
| `config/settings.yaml` | User agent, concurrency, timeouts, rate limits, free-tier numbers, recheck interval. `google.term_mode: all` also searches the English terms: better coverage, more calls. |

## Files it creates

- `data\leads.db`: SQLite database with every business checked, every run's filters and results, and API usage.
- `exports\rome_leads_YYYY-MM-DD_HHMM.xlsx`: the Excel exports.
- `logs\leadfinder.log`: full log of every business and every error.

All three are git-ignored: they contain business contact data.

## Being a polite visitor

- Every request sends a clear user agent: `CPDLeadFinder/1.0 (+https://www.cpdwebdesign.com; ...)`.
- robots.txt is respected.
- At most 3 pages are fetched per business (robots.txt, homepage, one contact page), with a 1-second gap between requests to the same site.
- Audits run 8 at a time, with timeouts and retries.
- A site that errors is logged and skipped; it never stops the run.
- If a data source keeps failing, the run stops using it instead of retrying forever.

## Before you contact anyone

This list is for your own prospecting. In Italy, unsolicited marketing emails generally need prior consent, including to businesses, and the Garante has fined companies for it. Marketing calls are subject to the **Registro Pubblico delle Opposizioni**. Check what's allowed before cold outreach. The **Status** column has a *Do not contact* option for anyone who opts out. This isn't legal advice.

## Development

```powershell
pip install -r requirements-dev.txt
python -m pytest
```

The tests run fully offline: Google, PageSpeed and business websites are mocked with saved HTML pages.
