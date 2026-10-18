# Image Finder

Paste a URL; it reads the page's HTML (what you'd see in Inspect Element) plus its linked
stylesheets and lists every image the page references. From the results you can open or copy
each link, copy/save all links as a `.txt`, or download everything as one `.zip`.

No dependencies — plain Node (18+) and a single HTML page.

## Run it locally

```bash
cd image-finder
npm start          # http://localhost:3000
npm test
```

You can also link straight to a scan: `http://localhost:3000/?url=example.com`.

## Deploy (Vercel)

Import the repo in Vercel and set **Root Directory** to `image-finder` (framework preset: Other).
`index.html` is served as the page and `api/scan.js` / `api/image.js` become serverless functions.
`server.js` is only for local use.

## Where images are found

`<img>` `src`/`srcset`, `<picture>`/`<source>`, lazy-load attributes (`data-src`, `data-bg`, …),
inline `style` and `<style>` backgrounds, linked and `@import`ed stylesheets, favicons and
touch icons, Open Graph / Twitter meta images, `<link rel=preload as=image>`, video posters,
SVG `<image>`, links to image files, and image URLs inside scripts/JSON (e.g. Next.js data).

Images a site only injects later with JavaScript, or that sit behind a login, won't be found
by a URL scan — use the paste option below for those.

## When a site blocks the scanner

Many sites (especially behind Cloudflare or similar) refuse requests from servers, which shows
up as "blocked the scanner (HTTP 403)". The scanner already sends the same headers a real Chrome
does, but strict bot protection still says no. Then use **"Paste the page's code instead"**:
in your browser, Inspect → right-click `<html>` → Copy → Copy outerHTML, paste it in, and press
the button. The URL box is still used to complete relative image links.

## How the zip works

The zip is built in the browser. Each image is fetched through `/api/image` (which relays only
`image/*` responses) so other sites' cross-origin rules don't block it; images that can't be
fetched are listed in `_failed.txt` inside the zip, and all links are in `_links.txt`.
On Vercel each relayed image is limited to ~4.4 MB (the platform's response cap); larger ones
fall back to a direct browser download when the host allows it.

## Safety

The server refuses URLs that resolve to private or loopback addresses (checked at connect time
and on every redirect), so it can't be used to probe the network it runs on. Responses are
size- and time-limited. `IMAGE_FINDER_ALLOW_PRIVATE=1` disables that check — for local testing
against a fixture server only.
