# DART

Local delivery for Rome: letters, parcels and furniture, for people and businesses. See `SPEC.md` for the full product spec.

## What's here

- `index.html` is the earlier design concept for the website. The working website is the `#web` view of `apps.html`.
- `apps.html` is the working test platform, built from `app-src/`. It has four views on one live database:
  - `#customer`: the customer app, in a phone frame.
  - `#web`: the public DART website (home, how it works, pricing, business, couriers, help, terms, privacy), with booking, tracking, login and the customer dashboard built in.
  - `#courier`: the courier app.

Everything is in Italian and English. The IT/EN switch is in each header, and the first visit follows the browser's language.
  - `#admin`: the admin portal.

## Editing the apps

Edit the files in `app-src/`, then rebuild:

```
python3 dart/app-src/build.py
```

| File | What it holds |
|---|---|
| `app-src/shell.html` | Page skeleton, styles and icons |
| `app-src/i18n.js` | Language switch and the translation layer (screens are written in English and translated after each render) |
| `app-src/it.js` | Italian dictionary and patterns for text with numbers or names |
| `app-src/core.js` | Data store, rules, item classification, vehicle eligibility, pricing, subscriptions, invoices, map, messenger |
| `app-src/customer.js` | Customer app and website dashboard |
| `app-src/site.js` | Public website pages |
| `app-src/courier.js` | Courier app |
| `app-src/admin.js` | Admin portal |
| `app-src/boot.js` | Router, rendering, events, startup |

## Test build limits

These are deliberate shortcuts for the test build. The production apps replace them.

- **Guests:** anyone can book and track without an account. Tracking needs the code and the email used to book. If a guest signs up later with the same email, their earlier deliveries move into the new account.
- **Logins:** passwords aren't checked or stored, and Google sign-in is simulated. Production uses real authentication.
- **Addresses:** a fixed list of Rome areas plus a typed street. Distances are estimated from the area centres. Production uses address search and road routing.
- **Payments:** none are taken. Production uses Stripe.
- **Courier position:** simulated from the delivery status. Production uses live GPS.
- **Privacy:** the shared test database is readable by everyone the page is shared with, including messages and courier documents. Production restricts them.
- **Automation:** subscription renewals and invoices are created by the app on the user's device. Production does this on the server.
