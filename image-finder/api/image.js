// GET /api/image?url=https://example.com/photo.jpg
// Relays one image so the browser can put it in a zip even when the image's own server
// doesn't allow cross-origin downloads. Only image responses are passed through.
import { safeFetch, FetchError } from "../lib/safe-fetch.js";

// Serverless hosts cap response size (Vercel: 4.5 MB), so stay just under it.
const MAX_BYTES = 4.4 * 1024 * 1024;

export default async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  try {
    const target = params.get("url");
    if (!target) throw new FetchError("Missing url.");
    const image = await safeFetch(target, {
      maxBytes: MAX_BYTES,
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    });
    if (image.status >= 400) throw new FetchError(`HTTP ${image.status}`);

    const type = image.contentType.split(";")[0].trim().toLowerCase();
    const looksLikeImage =
      type.startsWith("image/") ||
      ((type === "application/octet-stream" || type === "") &&
        /\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?)(?:$|[?#])/i.test(image.url));
    if (!looksLikeImage) throw new FetchError(`Not an image (${type || "unknown type"}).`);

    res.statusCode = 200;
    res.setHeader("Content-Type", type || "application/octet-stream");
    res.setHeader("Content-Length", image.body.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    // Served as a download, never rendered on this origin (SVGs can contain scripts).
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Final-Url", encodeURI(image.url));
    res.end(image.body);
  } catch (err) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(err instanceof FetchError ? err.message : "Couldn't fetch that image.");
  }
}
