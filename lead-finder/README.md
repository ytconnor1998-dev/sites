# Rome lead finder

A private website for CPD Web Design. It finds businesses in Rome that have **no website or a weak one** and a public **phone number or email**, scores their sites, and exports the leads to Excel.

- **Sources:** Google Places API (New), with OpenStreetMap (Overpass) as the free fallback.
- **Website audit:** HTTPS, mobile-friendliness, PageSpeed, copyright year, outdated tech, free-builder subdomains, title/description, contact info, English version.
- **Hosting:** runs free on Streamlit Community Cloud, password-protected, with leads stored in a free Neon database. Searches keep running if you close the tab.
- **Also:** a command line (`cli.py`) for running it on your own computer.

---

## Put it online (one-time setup, about 20 minutes)

You'll create three free accounts: Google Cloud (for the API key), Neon (the database) and Streamlit Community Cloud (the hosting). Nothing needs installing on your computer.

### 1. Google API key

You can skip this step to start with: without a key the site uses OpenStreetMap, which is free but lists fewer Rome businesses.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project, e.g. "lead-finder".
2. **APIs & Services → Library**: enable **Places API (New)** and **PageSpeed Insights API**.
3. **Billing**: link a billing account. Places requires one, even when you stay inside the free usage.
4. **APIs & Services → Credentials → Create credentials → API key**. Under *API restrictions*, restrict the key to those two APIs. Leave *Application restrictions* on "None": the hosting has no fixed IP address.
5. **Safety net (recommended):** in **APIs & Services → Places API (New) → Quotas**, set a daily cap on Text Search requests (e.g. 30/day ≈ 900/month), and add a budget alert under **Billing → Budgets & alerts**. Then a mistake can't run up a bill.
6. Copy the key somewhere safe. You'll paste it in step 3.

### 2. Database (Neon)

1. Sign up at [neon.tech](https://neon.tech) (free plan; signing in with GitHub is easiest).
2. Create a project: name it "lead-finder" and pick the region **AWS Europe Central (Frankfurt)**, the closest to Rome.
3. On the project dashboard, click **Connect** and copy the connection string. It starts with `postgresql://` and ends with `?sslmode=require`. Keep "Connection pooling" switched on.

The tables are created automatically the first time the site starts.

### 3. Hosting (Streamlit Community Cloud)

1. Go to [share.streamlit.io](https://share.streamlit.io) and choose **Continue with GitHub**. Allow it to access your repositories.
2. Click **Create app** → **Deploy a public app from GitHub** and fill in:
   - **Repository:** `ytconnor1998-dev/sites`
   - **Branch:** `claude/rome-lead-gen-architecture-3tn9oi` (or your main branch, once this is merged)
   - **Main file path:** `lead-finder/dashboard.py`
   - **App URL:** something like `cpd-leads`. The site will be at `https://cpd-leads.streamlit.app`.
3. Open **Advanced settings**. Choose Python **3.12** and paste this into **Secrets**, filling in your values:

   ```toml
   APP_PASSWORD = "a long password only you know"
   DATABASE_URL = "postgresql://...the Neon connection string..."
   GOOGLE_PLACES_API_KEY = "...your Google key..."
   ```

4. Click **Deploy**. The first start takes a few minutes while it installs everything.

"Public app" means anyone with the link can reach the page, but they only see a password box. The data is in your Neon database, not in GitHub. For an extra layer, you can limit who can open the app at all under the app's **Settings → Sharing**.

You can change the secrets later under **⋮ → Settings → Secrets**. Changes take effect the next time you load or click on the page. The bottom of the page shows whether a Google key was found (last 4 characters only).

### 4. First test

Log in, tick **Trattorie** and **Monti**, tick **Dry run**, and press **Run search**. It processes 10 businesses using 1–2 Google calls. Check the results look right in the table, then do a real search.

---

## Using the website

- **Search:** tick business types (a group's *All* box selects the whole group) and areas, set the target, and watch the API estimate update. Then press **Run search**. Progress updates live.
- **Background searches:** you can close the tab during a search; it keeps running on the server and saves each lead as it goes. Only one search runs at a time, and **Stop search** ends it early.
- **Browse leads:** filter and sort every lead in the database. Click a column header to sort.
- **Track outreach:** edit **Status** and **Notes** in the table, then press **Save status/notes**. These are included in every export, so re-exporting never loses your tracking.
- **Export:** **Export all** or **Export filtered view** downloads the Excel file.
- **Bottom of the page:** recent searches, API usage this month, and the log (useful if something goes wrong).

Good to know about the free hosting:

- **It sleeps.** If nobody opens the site for a while, it goes to sleep. The next visit shows a "wake up" button and takes about a minute.
- **Updates restart it.** Every new commit to the deployed branch restarts the app, which ends any search in progress. That search is marked *interrupted*; leads it already found are kept.

## What it costs

- **Hosting (Streamlit Community Cloud) and database (Neon):** free plans. Neon's free storage is far more than this needs.
- **Google Text Search:** the tool asks Text Search for the phone, website, rating and Maps link directly. That's **1 call per 20 businesses**, with no separate Place Details calls. Requesting those fields puts each call in Google's "Text Search Enterprise" price tier. The free allowance is set in `config/settings.yaml` (`free_calls_per_month: 1000`); check it against [Google's pricing page](https://developers.google.com/maps/billing-and-pricing/pricing) because Google changes it.
- **Usage tracking:** the site counts its own Google calls and shows *"used this month"* with every estimate.
- **PageSpeed Insights:** free (25,000 calls a day). It only runs on borderline sites, where the speed check can change the tier.

---

## Running on your own computer (optional)

You don't need this for the website. It's for using the command line, or testing changes before they go online.

You need **Python 3.10 or newer**. Check with `py --version`; if it's missing, install it from [python.org](https://www.python.org/downloads/) and tick "Add python.exe to PATH". Then, in PowerShell:

```powershell
cd path\to\sites\lead-finder
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
notepad .env
```

If PowerShell refuses to run `Activate.ps1`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then try again. Run `.venv\Scripts\Activate.ps1` every time you open a new PowerShell window.

In `.env`, set `APP_PASSWORD` and your Google key. To work with the **same leads as the website**, also set `DATABASE_URL` to the Neon connection string; otherwise a separate local file (`data\leads.db`) is used.

- **Dashboard:** `streamlit run dashboard.py` opens the same site at http://localhost:8501.
- **Command line:**

```powershell
# Show every category, group and area key
python cli.py list

# Cheap test: processes 10 businesses only
python cli.py run --categories "restaurants,b&bs" --areas monti --dry-run

# Free test (OpenStreetMap only, no Google calls)
python cli.py run --groups tourist-facing --areas trastevere --source osm --dry-run

# A real run
python cli.py run --groups "tourist-facing" --categories "barbers" --areas "trastevere,monti" --target 100

# Export every lead in the database to Excel (in exports\)
python cli.py export
```

Before searching, the command line prints the estimated API calls and asks you to confirm. Add `--yes` to skip the question.

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

The tool only queries the category × area combinations you select. It takes Google result pages in turn across all of them, so a search that hits its target early still covers every selection, and it stops paying as soon as the target is reached.

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

Edit these files; no code changes needed. Online, commit the change to the deployed branch and the app picks it up after restarting (searches in progress are interrupted).

| File | What's in it |
|---|---|
| `config/categories.yaml` | Business types and groups. Copy an entry to add a category: display name, group, Google type, Italian/English search terms and OSM tags. |
| `config/areas.yaml` | Rome zones as centre + radius, or a polygon. "All of Rome" is split into 3 km tiles because Google returns at most 60 results per query. |
| `config/audit.yaml` | The checklist: weights, labels, tier cut-offs, free-builder domains, social/parking domains. |
| `config/settings.yaml` | User agent, concurrency, timeouts, rate limits, free-tier numbers, recheck interval. `google.term_mode: all` also searches the English terms: better coverage, more calls. |

## Where the data lives

- **Online:** every business checked, every search's filters and results, and API usage are in the Neon database. Excel files are downloaded straight to your computer. The log is visible at the bottom of the page and resets when the app restarts.
- **On your computer:** `data\leads.db` (unless `DATABASE_URL` is set), `exports\*.xlsx` and `logs\leadfinder.log`.

None of this goes into GitHub: keys, the database, exports and logs are all git-ignored, because they contain business contact data.

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

The tests run fully offline: Google, PageSpeed and business websites are mocked with saved HTML pages. Database tests run against SQLite and against a real temporary Postgres server (via `pgserver`).
