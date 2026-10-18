// Fetches a public http(s) URL on behalf of the user, refusing anything that resolves to a
// private/internal address (so the scanner can't be used to probe the server's own network).
// The address check runs inside the socket's DNS lookup, so it holds for every redirect hop too.
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";
import zlib from "node:zlib";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 12000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
// Send the headers a real Chrome sends, so sites with light bot filtering treat us like a browser.
const BROWSER_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Ch-Ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};
const DEST_HEADERS = {
  document: { "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Site": "none", "Sec-Fetch-User": "?1", "Upgrade-Insecure-Requests": "1" },
  style: { "Sec-Fetch-Dest": "style", "Sec-Fetch-Mode": "no-cors", "Sec-Fetch-Site": "same-origin" },
  image: { "Sec-Fetch-Dest": "image", "Sec-Fetch-Mode": "no-cors", "Sec-Fetch-Site": "cross-site" },
};

// Status codes sites use when bot protection turns a request away.
export const BLOCKED_STATUSES = new Set([401, 403, 406, 429, 503]);

export class FetchError extends Error {}

function isPrivateIPv4(ip) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("ff")
  );
}

// Only for local testing against a fixture server; never set this in production.
const ALLOW_PRIVATE = process.env.IMAGE_FINDER_ALLOW_PRIVATE === "1";
const PRIVATE_MESSAGE = "That address points to a private network and can't be scanned.";

function guardedLookup(hostname, options, callback) {
  if (ALLOW_PRIVATE) return dns.lookup(hostname, options, callback);
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const blocked = addresses.find((a) => isPrivateAddress(a.address));
    if (blocked) return callback(new FetchError(PRIVATE_MESSAGE));
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

function decode(res, buffer) {
  const enc = (res.headers["content-encoding"] || "").toLowerCase();
  if (enc === "gzip" || enc === "x-gzip") return zlib.gunzipSync(buffer);
  if (enc === "deflate") return zlib.inflateSync(buffer);
  if (enc === "br") return zlib.brotliDecompressSync(buffer);
  return buffer;
}

function requestOnce(url, maxBytes, accept, dest, referer) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      {
        lookup: guardedLookup,
        headers: {
          ...BROWSER_HEADERS,
          ...DEST_HEADERS[dest],
          Accept: accept,
          ...(referer ? { Referer: referer } : {}),
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        let size = 0;
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new FetchError("The response is too large."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          try {
            resolve({ res, body: decode(res, Buffer.concat(chunks)) });
          } catch {
            reject(new FetchError("The page's response couldn't be decoded."));
          }
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new FetchError("The site took too long to respond.")));
    req.on("error", reject);
  });
}

/** Returns { url (final, after redirects), status, contentType, body (Buffer), text }. */
export async function safeFetch(
  input,
  {
    maxBytes = 5 * 1024 * 1024,
    accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    dest = "document",
    referer,
  } = {},
) {
  let url = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new FetchError("Only http and https URLs can be scanned.");
    }
    if (url.username || url.password) throw new FetchError("URLs with credentials aren't allowed.");
    // IP-literal hosts never go through the DNS lookup, so check them here.
    const literal = url.hostname.replace(/^\[|\]$/g, "");
    if (!ALLOW_PRIVATE && net.isIP(literal) && isPrivateAddress(literal)) throw new FetchError(PRIVATE_MESSAGE);

    let result;
    try {
      result = await requestOnce(url, maxBytes, accept, dest, referer);
    } catch (err) {
      if (err instanceof FetchError) throw err;
      if (err.code === "ENOTFOUND") throw new FetchError(`Couldn't find a site at ${url.hostname}.`);
      throw new FetchError(`Couldn't connect to ${url.hostname} (${err.code || err.message}).`);
    }

    const { res, body } = result;
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      url = new URL(res.headers.location, url);
      continue;
    }
    return {
      url: url.href,
      status: res.statusCode,
      contentType: res.headers["content-type"] || "",
      body,
      get text() {
        return body.toString("utf8");
      },
    };
  }
  throw new FetchError("Too many redirects.");
}
