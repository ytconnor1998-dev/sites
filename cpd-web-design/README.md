# CPD Web Design

Marketing site for CPD Web Design (Rome): *your website, built free; you just pay to keep it running.*
Next.js (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion. English/Italian.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production build
npm run lint
```

## Where to edit things

| What | File |
| --- | --- |
| **Plans (€14 One page, €49 Business), what each includes, minimum term, buy-out fee, agency comparison** | `src/config/site.ts` → `pricing.plans` |
| Contact details (email, WhatsApp, phone, VAT no., your name/photo) | `src/config/site.ts` → `site`, `contact` |
| **Example sites / client work section** | `src/config/site.ts` → `portfolio` |
| Contact form endpoint (Formspree) | `src/config/site.ts` → `contactForm` or env `NEXT_PUBLIC_FORM_ENDPOINT` |
| **All page copy, EN + IT** (headlines, FAQ, about text…) | `src/content/translations.ts` |
| Example sites' content (menus, rooms, prices, timetables, images, which plan each is on) | `src/content/examples/*.ts` (restaurant, hotel, tours, salon, yoga, portfolio) |
| Example screenshots used in the hero and Work section | `public/images/work/*.jpg` (retake them after changing a demo) |
| Feature list shown in each demo's overlay and on the home page | `features` in each demo file above |
| **Industry landing pages** (/websites/restaurants etc., EN + IT) | `src/content/industries.ts` |
| **Legal details** (legal name, address, PEC, REA, notice period, court) | `src/config/site.ts` → `legal` |
| **Privacy policy, cookie policy, terms, legal notice** (EN + IT) | `src/content/legal.ts` |
| Cookie banner and consent categories | `src/lib/consent.tsx`, `src/components/ui/CookieBanner.tsx` |
| Security headers (CSP etc.) | `vercel.json` |
| Design tokens (colours, fonts) | `src/app/globals.css` (`@theme`) and `src/app/layout.tsx` |

Placeholders to replace before launch are marked `PLACEHOLDER` in the code (prices, phone, VAT number, name, postal code, legal details).

**Your photo / screenshots:** put files in `public/images/` and reference them as `/images/me.jpg` (e.g. `site.owner.photo`, `portfolio[].image`).

**Demo images** are Unsplash photos referenced by URL in the demo data files. If any fails to load, a styled placeholder is shown instead. Swap any of them for your own `/images/...` files.

## Contact form and WhatsApp

**The form is a free mockup request**: visitors leave their business, current website (optional) and what they need, and you send them a homepage mockup within 2 working days (the promise is in `translations.ts` → `contact`; change it there if you need longer). It emails you.

Enquiries go through [FormSubmit](https://formsubmit.co) (free, no account) to `contact.email.en` (hello@cpdwebdesign.com), with the subject "Free mockup request: …" (tagged `[IT]` from the Italian site). Replying to the email replies to the visitor.

**One-time activation:** after the site is live, fill in the form yourself once. FormSubmit emails hello@ a link: click **Activate form**. Until then, sending shows an error with a "Send it on WhatsApp instead" link, so no enquiry is lost.

To use Formspree or another service instead, set `NEXT_PUBLIC_FORM_ENDPOINT` on Vercel (same JSON: `name, business, email, message`) and add its domain to `connect-src` in `vercel.json`. A hidden `_gotcha` honeypot catches bots.

**WhatsApp buttons** (contact section, About card, footer, and the bar fixed to the bottom of the screen on phones) open a chat with `contact.whatsapp` and a greeting already typed: "Hi Connor! I'm interested in a website for my business." (Italian on the Italian pages). Edit it in `translations.ts` → `contact.waPreset`.

## Adding another example site (gym, shop, B&B…)

1. Copy `src/content/examples/salon.ts` → `gym.ts`; edit the content, `gymMeta.features` and `gymMeta.plan`.
2. Copy `src/components/examples/salon/` → `gym/` and adjust the layout/branding.
3. Copy `src/app/examples/salon/page.tsx` → `src/app/examples/gym/page.tsx` (pick new fonts there).
4. Add `gymMeta` to `src/content/examples/index.ts`. It then appears on `/examples` and in the "What each example includes" section.
5. Save a 1440×900 screenshot as `public/images/work/gym.jpg`, and add it to `ORDER` in `src/components/site/Hero.tsx` if it should appear in the hero.

Each demo wraps its page in `<ExampleChrome>` (floating "Example site by CPD" badge + **Features** overlay) and marks sections with `<FeatureZone id="…">` matching the `features` ids.

## Before going public

**Legal** (a solid draft, not legal advice: have a lawyer or your commercialista read the four pages):

- [ ] Fill in `site`, `contact` and `legal` in `src/config/site.ts`: real name, address, Partita IVA, email, phone, and PEC/REA if you have them. The legal pages pick these up automatically.
- [ ] Read `/privacy`, `/cookies`, `/terms` and `/legal` in both languages and adjust anything that doesn't match how you work (payment method, domain renewal, response times).
- [ ] If you're in the *regime forfettario* you don't charge VAT: the terms already say "plus VAT where due", but check the wording with your commercialista.
- [ ] Clients sign a written proposal that includes the terms. Have the clauses listed in section 15 of the terms signed separately (art. 1341–1342 c.c.), and sign a data processing agreement (art. 28 GDPR) with clients whose sites collect visitor data.
- [ ] Turn on two-factor authentication for your email, GitHub and Vercel accounts (the privacy policy says you do).
- [ ] Added analytics, a chat widget or a newsletter? Add a consent category in `src/lib/consent.tsx`, load the tool only after consent, and list it in the privacy and cookie policies.

**Security** (already set up):

- Strict security headers on every page via `vercel.json`: Content-Security-Policy, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy. After deploying, check your domain at [securityheaders.com](https://securityheaders.com).
- The CSP only allows this site, `images.unsplash.com`, `formsubmit.co`, `formspree.io` and Google Maps. If you add another service (e.g. a different form provider or your own images host), add its domain to `vercel.json`, or the browser will block it.
- `/.well-known/security.txt` tells people how to report a problem. Update the `Expires` date every year.
- Dependabot (`.github/dependabot.yml`) opens weekly pull requests for dependency updates. Run `npm audit` before big changes.
- The contact form has a spam honeypot and length limits.
- In GitHub, protect your default branch and don't commit secrets (the site needs none).

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo. If the repo contains other folders, set **Root Directory** to `cpd-web-design`.
3. Optional env vars: `NEXT_PUBLIC_SITE_URL` (only to override the main address, `https://cpdwebdesign.com`, set in `src/config/site.ts`), `NEXT_PUBLIC_FORM_ENDPOINT` (only to replace FormSubmit, above), `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (below).
4. Deploy, then under **Settings → Domains** add `cpdwebdesign.com` as the production domain. (Optional: also add `www.cpdwebdesign.com`, set to redirect to `cpdwebdesign.com`, with a `www` CNAME record at your registrar.)

## SEO

- **English and Italian pages each have their own URL** (`/`, `/it`, `/privacy`, `/it/privacy`…), rendered on the server in that language, so Google indexes both and shows Italian results to Italian searchers. `hreflang` links (in each page and in `sitemap.xml`) tie the pairs together. Visitors who prefer Italian are sent from `/` to `/it` automatically; the language switch moves between the two.
- **Industry pages** (`/websites/restaurants`, `/hotels`, `/tours`, `/salons`, `/studios`, `/portfolios`, and `/it/websites/…`) target searches like "restaurant website Rome" / "sito web ristorante Roma". Each has its own title, intro, FAQ (with FAQ structured data) and links its example site. Edit or add them in `src/content/industries.ts`; they appear in the footer, on `/examples` and in the sitemap automatically.
- Titles and descriptions per page and language: `meta` in `src/content/translations.ts` (home and examples) and `src/content/legal.ts`. They include "web designer in Rome / a Roma" and your prices, filled from the config.
- Structured data (JSON-LD): `WebSite` + `ProfessionalService` (address, area served, languages, contact point, plans with prices) in `src/app/layout.tsx`, and `FAQPage` from your FAQ on the home pages. Helps Google and AI assistants describe you accurately.
- Share image for WhatsApp, Facebook, LinkedIn etc.: `public/og-image.png` (1200×630).
- Example sites are `noindex` so fictional businesses never appear in Google.

**After launch:**

1. Add your site to [Google Search Console](https://search.google.com/search-console): choose "URL prefix", pick the HTML tag method, copy the `content="…"` value into the Vercel env var `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, redeploy, then verify. Submit `sitemap.xml`.
2. Create a free [Google Business Profile](https://www.google.com/business/) for CPD Web Design (service-area business, Rome) and link it to the site. For "web designer near me" searches this matters more than anything on the site itself.
3. Ask your first clients for Google reviews. If you make a CPD Web Design Instagram, put it in `contact.instagram` and set `instagramIsBusiness: true` so Google links it to the business.
4. Add each client site to `portfolio` in `src/config/site.ts` with a "Website by CPD Web Design" link in their footer.

## Notes

- Language: main pages live at `/…` (English) and `/it/…` (Italian). The choice is remembered (localStorage) and shared with the demo sites, which switch language in place.
- SEO: see the SEO section above.
- Cookies: a bilingual banner asks once (Accept / Reject / Choose, X = reject) and remembers the choice for 6 months. "Cookie settings" in the footer reopens it. Google Maps embeds load only after consent or a click on the map.
- Accessibility: semantic landmarks, skip links, keyboard-operable tabs/accordions/lightbox (`<dialog>`), visible focus, AA contrast, and `prefers-reduced-motion` respected.
