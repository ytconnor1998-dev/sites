import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFromHtml, extractFromCss } from "../lib/extract.js";
import { isPrivateAddress } from "../lib/safe-fetch.js";

const html = `<!doctype html><html><head>
<title>Demo &amp; Co</title>
<base href="https://cdn.example.com/assets/">
<meta property="og:image" content="https://example.com/share.jpg">
<meta name="twitter:image" content="/tw.png">
<link rel="icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="touch.png">
<link rel="stylesheet" href="/main.css">
<link rel="preload" as="image" href="hero.avif">
<style>.hero{background:url('bg/hero.jpg')} @font-face{src:url(font.woff2)}</style>
<!-- <img src="commented.png"> -->
</head><body>
<img src="a.jpg" alt="Photo A" width="400">
<img data-src="lazy.webp" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
<img srcset="s-1x.jpg 1x, s-2x.jpg 2x">
<picture><source srcset="p.avif 1x, p@2x.avif 2x" type="image/avif"><img src="p.jpg"></picture>
<source srcset="loose.jpg">
<div style="background-image: url(&quot;div-bg.png&quot;)" data-bg="/bg2.jpg"></div>
<a href="/full/photo.JPG?x=1">full</a>
<a href="/page.html">page</a>
<video poster="poster.jpg"></video>
<svg><image href="svg-img.png"></image></svg>
<script>window.__DATA__={"img":"https:\\/\\/img.example.com\\/x\\/y.png","other":"/static/z.webp"}</script>
</body></html>`;

test("finds images in all the usual places", () => {
  const { images, stylesheets, title } = extractFromHtml(html, "https://example.com/page");
  const byUrl = Object.fromEntries(images.list().map((i) => [i.url, i]));
  const urls = Object.keys(byUrl);
  const expect = [
    "https://example.com/share.jpg",
    "https://cdn.example.com/tw.png",
    "https://cdn.example.com/favicon.ico",
    "https://cdn.example.com/assets/touch.png",
    "https://cdn.example.com/assets/hero.avif",
    "https://cdn.example.com/assets/bg/hero.jpg",
    "https://cdn.example.com/assets/a.jpg",
    "https://cdn.example.com/assets/lazy.webp",
    "https://cdn.example.com/assets/s-1x.jpg",
    "https://cdn.example.com/assets/s-2x.jpg",
    "https://cdn.example.com/assets/p.avif",
    "https://cdn.example.com/assets/p@2x.avif",
    "https://cdn.example.com/assets/p.jpg",
    "https://cdn.example.com/assets/loose.jpg",
    "https://cdn.example.com/assets/div-bg.png",
    "https://cdn.example.com/bg2.jpg",
    "https://cdn.example.com/full/photo.JPG?x=1",
    "https://cdn.example.com/assets/poster.jpg",
    "https://cdn.example.com/assets/svg-img.png",
    "https://img.example.com/x/y.png",
    "https://cdn.example.com/static/z.webp",
    "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
  ];
  for (const u of expect) assert.ok(urls.includes(u), `missing ${u}`);
  assert.ok(!urls.some((u) => u.includes("commented")), "commented-out image included");
  assert.ok(!urls.some((u) => u.includes("font.woff2")), "font included");
  assert.ok(!urls.some((u) => u.includes("page.html")), "non-image link included");
  assert.equal(urls.length, expect.length, `unexpected extras: ${urls.filter((u) => !expect.includes(u))}`);

  assert.equal(byUrl["https://cdn.example.com/assets/a.jpg"].alt, "Photo A");
  assert.deepEqual(byUrl["https://cdn.example.com/assets/p.avif"].sources, ["<picture>"]);
  assert.deepEqual(byUrl["https://cdn.example.com/assets/loose.jpg"].sources, ["srcset"]);
  assert.deepEqual(byUrl["https://example.com/share.jpg"].sources, ["Social / meta tag"]);
  assert.deepEqual(stylesheets, ["https://cdn.example.com/main.css"]);
  assert.equal(title, "Demo & Co");
});

test("scans stylesheet url() relative to the stylesheet", () => {
  const { images } = extractFromHtml("<p>hi</p>", "https://example.com/");
  const imports = extractFromCss(
    `@import url("more.css"); .a{background:url(../img/bg.png)} .b{mask:url(data:image/svg+xml;utf8,<svg/>)}`,
    "https://example.com/css/site.css",
    images,
  );
  const urls = images.list().map((i) => i.url);
  assert.ok(urls.includes("https://example.com/img/bg.png"));
  assert.ok(urls.includes("data:image/svg+xml;utf8,<svg/>"));
  assert.deepEqual(imports, ["https://example.com/css/more.css"]);
});

test("blocks private and loopback addresses", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0"]) {
    assert.ok(isPrivateAddress(ip), ip);
  }
  for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700::1111"]) assert.ok(!isPrivateAddress(ip), ip);
});
