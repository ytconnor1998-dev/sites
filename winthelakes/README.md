# Win the Lakes

Prize competition site for the Lake District: lodge breaks, cash, cars and tech, with instant wins, ticket bundles, live draws and safer-play tools.
Next.js (App Router), TypeScript, Tailwind CSS v4.

**Design:** every competition is printed on a paper raffle ticket in a classic roll colour (pink, lemon, mint, sky, lilac, peach), with a perforated stub holding the price and the Enter button. The rest of the palette comes from an Ordnance Survey Explorer map: map-paper white, slate ink, Explorer orange for buttons, lake blue. One typeface, Archivo, used condensed for headlines and ticket numbers and at normal width for text.

> **Status: front end complete, running in demo mode.** Everything works end to end in the browser, but no money is taken and the basket, tickets and account are stored in the visitor's own browser. See [Going live](#going-live) for what's needed to take real entries.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in /out
npm run lint
```

## What's in it

| Page | What it does |
| --- | --- |
| `/` | Lead prize with a big ticket over its photo (countdown, price, % sold), competitions grid with category tabs (All, Ending soon, Lakes breaks, Cash, Cars & bikes, Tech, Instant wins), how it works, recent winners, who we are, FAQ |
| `/competitions` | All competitions, filterable (`?c=cash` etc. can be linked to) |
| `/competitions/[slug]` | Prize details, live countdown, progress bar, **ticket bundles** (buy 10 get 3 free), quantity stepper/slider, max per person, **skill question**, add to basket, **instant-win numbers with found/unfound status**, cash alternative, related prizes |
| `/basket` | Edit quantities, wrong-answer warning, **site credit** applied automatically, details + 18+ date-of-birth check, **monthly spend limit and self-exclusion enforced** |
| `/order` | After checkout: **scratch card** to reveal instant wins, then your ticket numbers drop in as little tickets, winners in orange |
| `/account` | My tickets (grouped by competition, with countdowns), wallet & order history, **safer play**: monthly limit and take-a-break |
| `/winners` | Winners gallery with ticket numbers and quotes |
| `/draws` | Draw results with winning ticket and link to the live-draw recording, plus **entry lists** |
| `/how-it-works`, `/faq`, `/free-entry`, `/safer-play`, `/terms`, `/privacy` | Help and legal (legal pages are drafts) |

## Where to edit things

| What | File |
| --- | --- |
| **Competitions**: prizes, prices, ticket limits, draw dates, bundles, sale prices, instant-win numbers, questions | `src/config/competitions.ts` |
| Winners and draw results | `src/config/competitions.ts` → `winners`, `drawResults` |
| Business name, email, company details, postal entry address, socials, stats | `src/config/site.ts` |
| FAQ | `src/config/faq.ts` |
| Colours, ticket colours and fonts | `src/app/globals.css` (`@theme`) and `src/app/layout.tsx` |
| Ticket shape (notches, perforation) | `src/app/globals.css` (`.ticket`) and `src/components/Ticket.tsx` |
| Logo | `src/components/Logo.tsx`, `src/app/icon.svg` |

Anything to replace before launch is marked `PLACEHOLDER`.

**Prize photos** live in `public/images/prizes/` and are set with `image:` on each competition. The ones there now are stand-ins from [Unsplash](https://unsplash.com/license) (free to use): **replace each with a photo of the actual prize** before launch, since a prize photo should show exactly what's being won. A competition without a photo shows a small Ordnance Survey-style map tile instead. Pick a ticket colour per competition with `paper:`.

**Draw dates:** the demo sets them a few days after each build so the countdowns are always running. For real competitions write the date, e.g. `drawAt: "2026-11-20T20:00:00+00:00"`.

## Going live

The demo is the complete customer-facing site. To take real entries it needs a back end. That's the next stage:

1. **Payments.** Many mainstream card processors restrict prize competitions, so check before you build. Use a provider that explicitly accepts UK prize competitions and confirm in writing. Card details must only ever be entered on the provider's page or fields.
2. **Accounts and database.** Real sign-up and login, plus orders, tickets, site credit and safer-play limits stored on the server.
3. **Ticket allocation and instant wins on the server**, after payment succeeds, so two people can never get the same number and instant-win numbers can't be seen in the browser. Right now `src/lib/entries.ts` does this in the browser for the demo.
4. **Draws.** A certified random number generator (or a recorded live draw), with results saved and published automatically.
5. **Admin panel** to create competitions, upload photos, see sales, run draws, export entry lists, process postal entries and pay winners.
6. **Emails:** order confirmation with ticket numbers, and winner notifications.
7. **Legal.** Prize competitions in Great Britain must stay outside the Gambling Act 2005: a genuine skill question **or** a free entry route (this site has both), plus clear terms. Have a solicitor who knows prize competitions check the terms, privacy policy and free-entry wording. Register with the ICO (data protection fee).

The browser-only code is kept in `src/lib/basket.ts`, `src/lib/entries.ts` and `src/lib/account.ts`, so the back end can replace those three files without changing the pages.

## Deploy

`npm run build` produces a static site in `out/` that can go on Vercel, Netlify or Cloudflare Pages as it is. If you deploy from this repo on Vercel, set **Root Directory** to `winthelakes`. Set `NEXT_PUBLIC_SITE_URL` to your domain.
