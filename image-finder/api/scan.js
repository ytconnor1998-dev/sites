// GET /api/scan?url=https://example.com[&css=0]
// Fetches the page, finds every image it references, and returns them as JSON.
import { safeFetch, FetchError } from "../lib/safe-fetch.js";
import { extractFromHtml, extractFromCss } from "../lib/extract.js";

const MAX_STYLESHEETS = 15;

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

export default async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  try {
    const target = normalizeUrl(params.get("url"));
    const scanCss = params.get("css") !== "0";

    const page = await safeFetch(target);
    if (page.status >= 400) {
      throw new FetchError(`The site responded with HTTP ${page.status}.`);
    }
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

    const { images, stylesheets, title } = extractFromHtml(page.text, page.url);

    let scanned = 0;
    if (scanCss) {
      const queue = [...stylesheets];
      const seen = new Set(queue);
      const batch = async (url) => {
        try {
          const css = await safeFetch(url, { maxBytes: 2 * 1024 * 1024, accept: "text/css,*/*;q=0.1" });
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
        await Promise.all(queue.splice(0, 5).map(batch));
      }
    }

    send(res, 200, {
      url: page.url,
      title,
      stylesheets: { found: stylesheets.length, scanned },
      images: images.list(),
    });
  } catch (err) {
    const message = err instanceof FetchError ? err.message : "Something went wrong while scanning that page.";
    if (!(err instanceof FetchError)) console.error(err);
    send(res, 400, { error: message });
  }
}
