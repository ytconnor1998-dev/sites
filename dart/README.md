# DART

Local delivery for Rome: letters, parcels and furniture, for people and businesses. See `SPEC.md` for the full product spec.

## What's here

- `index.html` is the public website.
- `apps.html` is the working test platform, built from `app-src/`. It has four views on one live database:
  - `#customer`: the customer app, in a phone frame.
  - `#web`: the same customer account and features, laid out as a website dashboard.
  - `#courier`: the courier app.
  - `#admin`: the admin portal.

## Editing the apps

Edit the files in `app-src/`, then rebuild:

```
python3 dart/app-src/build.py
```

| File | What it holds |
|---|---|
| `app-src/shell.html` | Page skeleton, styles and icons |
| `app-src/core.js` | Data store, rules, item classification, vehicle eligibility, pricing, subscriptions, invoices, map, messenger |
| `app-src/customer.js` | Customer app and website dashboard |
| `app-src/courier.js` | Courier app |
| `app-src/admin.js` | Admin portal |
| `app-src/boot.js` | Router, rendering, events, startup |

## Test build limits

These are deliberate shortcuts for the test build. The production apps replace them.

- **Logins:** passwords aren't checked or stored, and Google sign-in is simulated. Production uses real authentication.
- **Addresses:** a fixed list of Rome areas plus a typed street. Distances are estimated from the area centres. Production uses address search and road routing.
- **Payments:** none are taken. Production uses Stripe.
- **Courier position:** simulated from the delivery status. Production uses live GPS.
- **Privacy:** the shared test database is readable by everyone the page is shared with, including messages and courier documents. Production restricts them.
- **Automation:** subscription renewals and invoices are created by the app on the user's device. Production does this on the server.
