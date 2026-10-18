// Pulls every image reference out of a page's HTML (and its CSS), the same places you'd find
// them by digging through "Inspect element": <img>, srcset, <picture>, lazy-load data-*
// attributes, inline and <style> backgrounds, icons, social-share meta tags, video posters,
// SVG <image>, and image URLs embedded in scripts/JSON.

const IMAGE_EXT = /\.(?:png|jpe?g|jfif|pjpeg|gif|webp|avif|svg|ico|bmp|tiff?|apng|heic|heif)(?:$|[?#])/i;
const TAG_RE =
  /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const CSS_URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi;
const CSS_IMPORT_RE = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/gi;
const SCRIPT_URL_RE =
  /(?:https?:)?(?:\\?\/\\?\/[^\s"'<>()\\]+?|\\?\/[^\s"'<>()\\]+?|[\w./-]+?)\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp)(?:\?[^\s"'<>()\\]*)?(?=["'\s)\\,<]|$)/gi;

const SRCSET_ATTRS = new Set(["srcset", "data-srcset", "imagesrcset", "data-lazy-srcset"]);
// Attributes that hold an image URL no matter what the extension looks like.
const DIRECT_ATTRS = {
  img: ["src", "data-src", "data-lazy-src", "data-original", "data-lazy", "data-url", "data-fallback-src"],
  source: ["src"],
  video: ["poster"],
  image: ["href", "xlink:href"],
};
const META_IMAGE = /^(?:og:image(?::url|:secure_url)?|twitter:image(?::src)?|image|thumbnail|msapplication-tileimage|msapplication-square\d+x\d+logo)$/i;
const ICON_RELS = /(?:^|\s)(?:icon|shortcut|apple-touch-icon(?:-precomposed)?|mask-icon|image_src|fluid-icon)(?:\s|$)/i;

const LABELS = {
  img: "<img>",
  srcset: "srcset",
  picture: "<picture>",
  lazy: "Lazy-load attr",
  css: "CSS background",
  stylesheet: "Linked stylesheet",
  meta: "Social / meta tag",
  icon: "Icon",
  preload: "Preload",
  poster: "Video poster",
  svg: "SVG <image>",
  script: "Script / JSON",
  attr: "Other attribute",
};

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

function parseAttrs(raw) {
  const attrs = {};
  for (const m of (raw || "").matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase();
    if (!(name in attrs)) attrs[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

function parseSrcset(value) {
  // Candidates are "url [descriptor]" separated by commas; URLs themselves may contain commas
  // (e.g. Cloudinary), so split on commas that follow a descriptor or whitespace.
  return value
    .split(/,(?=\s)|,(?=[^,\s]*(?:\s|$))/)
    .map((c) => c.trim().split(/\s+/)[0])
    .filter(Boolean);
}

export class ImageCollector {
  constructor(pageUrl) {
    this.base = pageUrl;
    this.map = new Map();
  }

  add(raw, kind, { base = this.base, alt, width, height } = {}) {
    if (!raw) return;
    let value = raw.trim();
    if (!value || value.startsWith("#") || /^(?:javascript|about|mailto|tel):/i.test(value)) return;
    if (/^data:/i.test(value) && !/^data:image\//i.test(value)) return;

    let url;
    try {
      url = /^data:/i.test(value) ? value : new URL(value, base).href;
    } catch {
      return;
    }
    if (!/^(?:https?:|data:)/i.test(url)) return;

    let entry = this.map.get(url);
    if (!entry) {
      entry = { url, sources: [], alt: "", width: null, height: null };
      this.map.set(url, entry);
    }
    const label = LABELS[kind] || kind;
    if (!entry.sources.includes(label)) entry.sources.push(label);
    if (alt && !entry.alt) entry.alt = alt.trim().slice(0, 200);
    if (width && !entry.width) entry.width = width;
    if (height && !entry.height) entry.height = height;
  }

  addCss(css, kind, base = this.base) {
    for (const m of css.matchAll(CSS_URL_RE)) {
      const value = m[1] ?? m[2] ?? m[3];
      // Fonts and other url() assets aren't images; skip them by extension.
      if (/\.(?:woff2?|ttf|otf|eot|css|js)(?:$|[?#])/i.test(value)) continue;
      if (/^data:/i.test(value) && !/^data:image\//i.test(value)) continue;
      this.add(value, kind, { base });
    }
  }

  list() {
    return [...this.map.values()];
  }
}

/**
 * Scans HTML and returns { images: ImageCollector, stylesheets: string[], title }.
 * Stylesheet URLs are returned so the caller can fetch and scan them too.
 */
export function extractFromHtml(html, pageUrl) {
  // Comments aren't part of the live DOM.
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, "");

  let base = pageUrl;
  const baseTag = cleaned.match(/<base\s[^>]*href\s*=\s*["']?([^"'\s>]+)/i);
  if (baseTag) {
    try {
      base = new URL(decodeEntities(baseTag[1]), pageUrl).href;
    } catch {}
  }

  const images = new ImageCollector(base);
  const stylesheets = new Set();

  // <style> blocks and <script> bodies are scanned separately, then removed so their
  // contents aren't mistaken for tags.
  const withoutBlocks = cleaned
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
      images.addCss(css, "css");
      for (const m of css.matchAll(CSS_IMPORT_RE)) stylesheets.add(resolve(m[1], base));
      return "";
    })
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, js) => {
      scanScript(js, images);
      return "";
    });

  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim().slice(0, 200) : "";

  let inPicture = false;
  for (const m of withoutBlocks.matchAll(TAG_RE)) {
    const tag = m[2].toLowerCase();
    if (tag === "picture") inPicture = m[1] !== "/";
    if (m[1] === "/") continue;
    const attrs = parseAttrs(m[3]);

    if (attrs.style) images.addCss(attrs.style, "css");

    if (tag === "meta") {
      const key = attrs.property || attrs.name || attrs.itemprop || "";
      if (META_IMAGE.test(key) && attrs.content) images.add(attrs.content, "meta");
      continue;
    }
    if (tag === "link") {
      const rel = (attrs.rel || "").toLowerCase();
      if (/\bstylesheet\b/.test(rel) && attrs.href) stylesheets.add(resolve(attrs.href, base));
      else if (ICON_RELS.test(rel) && attrs.href) images.add(attrs.href, "icon");
      else if (/\bpreload\b/.test(rel) && attrs.as === "image") {
        if (attrs.href) images.add(attrs.href, "preload");
        if (attrs.imagesrcset) parseSrcset(attrs.imagesrcset).forEach((u) => images.add(u, "preload"));
      }
      continue;
    }

    const direct = DIRECT_ATTRS[tag] || [];
    const meta = { alt: attrs.alt || attrs.title, width: attrs.width, height: attrs.height };
    for (const [name, value] of Object.entries(attrs)) {
      if (!value || name === "style") continue;
      if (SRCSET_ATTRS.has(name)) {
        parseSrcset(value).forEach((u) => images.add(u, inPicture && tag === "source" ? "picture" : "srcset", meta));
      } else if (direct.includes(name)) {
        images.add(value, directKind(tag, name, inPicture), meta);
      } else if (looksLikeImage(value)) {
        // Lazy-loaders and frameworks stash image URLs in all sorts of attributes
        // (data-bg, data-image, content, href on a lightbox link...).
        images.add(value, name.startsWith("data-") ? "lazy" : "attr", meta);
      }
    }
  }
  return { images, stylesheets: [...stylesheets].filter(Boolean), title, base };
}

function directKind(tag, name, inPicture) {
  if (tag === "img") return name === "src" ? "img" : "lazy";
  if (tag === "video") return "poster";
  if (tag === "image") return "svg";
  return inPicture ? "picture" : "attr";
}

function looksLikeImage(value) {
  const v = value.trim();
  return /^data:image\//i.test(v) || (IMAGE_EXT.test(v) && !/\s/.test(v) && v.length < 2048);
}

function resolve(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function scanScript(js, images) {
  const text = js.replace(/\\u002[fF]/g, "/").replace(/\\\//g, "/");
  for (const m of text.matchAll(SCRIPT_URL_RE)) {
    const value = m[0];
    // Bare relative names like "logo.png" inside code are too ambiguous; require a path or host.
    if (!value.includes("/")) continue;
    images.add(value, "script");
  }
}

/** Scans a fetched stylesheet; returns nested @import URLs. */
export function extractFromCss(css, cssUrl, images) {
  images.addCss(css, "stylesheet", cssUrl);
  return [...css.matchAll(CSS_IMPORT_RE)].map((m) => resolve(m[1], cssUrl)).filter(Boolean);
}
