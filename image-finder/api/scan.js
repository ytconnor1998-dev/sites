// GET  /api/scan?url=https://example.com[&css=0]   fetches the page and scans it
// POST /api/scan  {"html": "...", "url": "https://example.com", "css": true}
//      scans page code the user pasted (for sites that block server requests)
// Returns every image the page references as JSON.
import { safeFetch, FetchError, BLOCKED_STATUSES } from "../lib/safe-fetch.js";
import { extractFromHtml, extractFromCss } from "../lib/extract.js";

const MAX_STYLESHEETS = 15;
const MAX_PASTE_BYTES = 4 * 1024 * 1024;

class BlockedError extends FetchError {}

export function normalizeUrl(input) {
  let value = String(input || "").trim();
  if (!value) throw new FetchError("Enter a URL to scan.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
  try {
    return new URL(value).href;
  } catch {
    throw new FetchError("That doesn't look like a valid URL.");
  }
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  // Vercel parses JSON bodies already; the local server hands over the raw stream.
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_PASTE_BYTES) throw new FetchError("The pasted code is too large (max 4 MB).");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new FetchError("Couldn't read the pasted code.");
  }
}

async function scanStylesheets(stylesheets, images, pageUrl) {
  const queue = [...stylesheets];
  const seen = new Set(queue);
  let scanned = 0;
  const scanOne = async (url) => {
    try {
      const css = await safeFetch(url, {
        maxBytes: 2 * 1024 * 1024,
        accept: "text/css,*/*;q=0.1",
        dest: "style",
        referer: pageUrl,
      });
      if (css.status >= 400) return;
      scanned++;
      for (const imported of extractFromCss(css.text, css.url, images)) {
        if (!seen.has(imported) && seen.size < MAX_STYLESHEETS) {
          seen.add(imported);
          queue.push(imported);
        }
      }
    } catch {
      // A stylesheet that won't load just contributes no images.
    }
  };
  while (queue.length && scanned < MAX_STYLESHEETS) {
    await Promise.all(queue.splice(0, 5).map(scanOne));
  }
  return scanned;
}

async function scanHtml(html, pageUrl, scanCss) {
  const { images, stylesheets, title } = extractFromHtml(html, pageUrl);
  const scanned = scanCss ? await scanStylesheets(stylesheets, images, pageUrl) : 0;
  return {
    url: pageUrl,
    title,
    stylesheets: { found: stylesheets.length, scanned },
    images: images.list(),
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const html = String(body.html || "");
      if (!html.trim()) throw new FetchError("Paste the page's code first.");
      if (html.length > MAX_PASTE_BYTES) throw new FetchError("The pasted code is too large (max 4 MB).");
      // Without the page's address, relative image paths can't be turned into links.
      const pageUrl = normalizeUrl(body.url);
      return send(res, 200, { ...(await scanHtml(html, pageUrl, body.css !== false)), pasted: true });
    }

    const params = new URL(req.url, "http://localhost").searchParams;
    const target = normalizeUrl(params.get("url"));
    const page = await safeFetch(target);
    if (BLOCKED_STATUSES.has(page.status)) {
      throw new BlockedError(
        `${new URL(page.url).hostname} blocked the scanner (HTTP ${page.status}). ` +
          "Many sites block requests that don't come from a real browser.",
      );
    }
    if (page.status >= 400) throw new FetchError(`The site responded with HTTP ${page.status}.`);
    if (page.contentType.startsWith("image/")) {
      // The URL itself is an image.
      return send(res, 200, {
        url: page.url,
        title: "",
        stylesheets: { found: 0, scanned: 0 },
        images: [{ url: page.url, sources: ["Direct link"], alt: "", width: null, height: null }],
      });
    }
    if (!/html|xml|text\/plain/i.test(page.contentType) && page.contentType) {
      throw new FetchError(`That URL isn't a web page (it's ${page.contentType.split(";")[0]}).`);
    }
    send(res, 200, await scanHtml(page.text, page.url, params.get("css") !== "0"));
  } catch (err) {
    const message = err instanceof FetchError ? err.message : "Something went wrong while scanning that page.";
    if (!(err instanceof FetchError)) console.error(err);
    send(res, 400, { error: message, blocked: err instanceof BlockedError });
  }
}
