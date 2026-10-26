# DART: next step, the real build

Read this first in a new session. Everything so far is in this folder on branch `claude/beautiful-newton-k2nqr4`.

## Where things are

- `apps.html` is the working test platform, built from `app-src/` with `python3 dart/app-src/build.py`. It has the website (`#web`), customer app (`#customer`), courier app (`#courier`) and admin portal (`#admin`). Published as a claude.ai artifact: https://claude.ai/artifact/NThNkemPptZWhNwAZVqrXj
- `SPEC.md` is the product spec; `README.md` explains the files.
- `dart-logo.svg` is the logo. Brand purple is `#452B94`.
- All rules, prices and flows in `app-src/` are the reference for the real build: classification and vehicle fit, pricing, courier offers one at a time (45 s), multi-stop routes with deadlines, set-time jobs booked ahead, proof (photos, 4-digit code, signature), tips and reviews, credit, discount and referral codes, late-fee review, 3-hour delivery promise, Italian and English.

## What the owner set up

- Network access for: registry.npmjs.org, expo.dev, api.expo.dev, storage.googleapis.com, supabase.co, supabase.com
- Environment variables: `EXPO_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

Check them first: `npm view expo version` should print a version, and the three variables should be set. Never ask the owner to paste keys into the chat.

npm note: this container's settings tell npm to skip the proxy for registry.npmjs.org, which then fails. Run npm with the proxy forced on:
`env -u npm_config_noproxy -u NO_PROXY -u no_proxy npm <command> --https-proxy="$HTTPS_PROXY" --proxy="$HTTPS_PROXY" --noproxy="localhost,127.0.0.1"`

Supabase note: the project's own address (`<project>.supabase.co`) must be allowed in Network access, e.g. `*.supabase.co`; plain `supabase.co` is not enough.

## The plan, in order

1. **Database.** Create the Supabase tables for accounts, couriers, orders (with messages), invoices, tickets, plans and config, with row-level security: customers see their own data, couriers see their own jobs and open offers, admin sees everything. Move the dispatch (offers, multi-stop routing, referral rewards) into a database function or Edge Function so it runs on the server, not on phones.
2. **Website and admin on the real database.** Swap the `Store` layer in `core.js` for Supabase (it already has the same set/update/claim/onSnapshot shape), then host the website and admin.
3. **Test Android apps.** An Expo app for customers and one for couriers. Build APKs with EAS (`eas build -p android --profile preview`) and send the owner the install links.
4. **Then:** Apple and Google sign-in, Stripe (cards, Apple Pay, Google Pay, tips), Google address search and maps, live GPS for couriers, push notifications and email, electronic invoices (SDI).
5. **Then:** iPhone builds and store submission (needs the owner's Apple Developer and Google Play accounts).

## Owner preferences

- Plain, specific wording; no AI-looking layouts (no grids of four boxes, no pricing tables on the website).
- Website must stay usable without an account; only businesses get plans.
- Couriers: no auto-assigning, accept or decline each offer; late fees are decided by admin, never automatic.
- Explain things simply; the owner often works from a phone.
