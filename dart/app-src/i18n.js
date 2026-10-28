// ===== Italian and English =====
// Screens are written in English; after each render the DOM is translated from the dictionary below.
// Exact strings live in IT, strings with numbers or names in IT_PATTERNS.
function lang() {
  if (S.me.lang === "it" || S.me.lang === "en") return S.me.lang;
  // Most couriers are Italian: the courier app starts in Italian until they choose English.
  if (typeof route === "function" && route() === "courier") return "it";
  return /^it\b/i.test((navigator.language || "") + "") ? "it" : "en";
}
function locale() { return lang() === "it" ? "it-IT" : "en-GB"; }
ACT["lang"] = function (d) { S.me.lang = d.v || (lang() === "it" ? "en" : "it"); saveMe(); trCache = {}; render(); };
function langSwitch(cls) {
  var l = lang();
  return '<span class="lang-sw ' + (cls || "") + '" data-notr="1" role="group" aria-label="Language / Lingua"><button class="' + (l === "it" ? "on" : "") + '" data-act="lang" data-v="it" aria-pressed="' + (l === "it") + '">IT</button><button class="' + (l === "en" ? "on" : "") + '" data-act="lang" data-v="en" aria-pressed="' + (l === "en") + '">EN</button></span>';
}
var IT = {};
var IT_PATTERNS = [];
var trCache = {};
var MISS = null; // set to an object to collect untranslated strings while testing
function has(s) { return Object.prototype.hasOwnProperty.call(IT, s); }
function plain(s) { return !/[A-Za-z]/.test(s.replace(/\b(cm|kg|km|min|h|DRT-[A-Z0-9-]+|DART-\d{4}-[A-Z0-9]+)\b/g, "")); }
function trCore(s) {
  if (has(s)) return IT[s];
  if (plain(s)) return s;
  for (var i = 0; i < IT_PATTERNS.length; i++) {
    var p = IT_PATTERNS[i], m = s.match(p[0]);
    if (m) return typeof p[1] === "function" ? p[1].apply(null, m) : s.replace(p[0], p[1]);
  }
  // Pieces joined by " · ", lists joined by ", ", and "X to Y" ranges translate piece by piece.
  var parts = s.split(" · ");
  if (parts.length > 1) { var any = false, out = parts.map(function (x) { var t = trCore(x); if (t != null && t !== x) any = true; return t == null ? x : t; }); if (any) return out.join(" · "); }
  var list = s.replace(/\.$/, "").split(", ");
  if (list.length > 1 && list.every(has)) return list.map(function (x) { return IT[x]; }).join(", ") + (/\.$/.test(s) ? "." : "");
  var rg = s.match(/^(.+) to (.+)$/);
  if (rg && has(rg[1]) && has(rg[2])) return "da " + IT[rg[1]] + " a " + IT[rg[2]];
  return null;
}
function trItem(x) { var t = trCore(x); return t == null ? x : t; }
function trList(x) { return x.split(", ").map(trItem).join(", "); }
function tr(s) {
  if (s == null) return s;
  var str = String(s), core = str.trim();
  if (!core || !/[A-Za-z]/.test(core)) return str;
  if (lang() !== "it") { if (MISS && trCore(core) == null) MISS[core] = 1; return str; }
  if (trCache[core] === undefined) { var t = trCore(core); if (t == null && MISS) MISS[core] = 1; trCache[core] = t == null ? core : t; }
  var out = trCache[core];
  return str.replace(core, function () { return out; });
}
function itNumbers(s) { return s.replace(/(\d)\.(\d)(?=\d*\s?(?:km|kg|%|cm))/g, "$1,$2"); }
function translateDOM(node) {
  var it = lang() === "it";
  if (!it && !MISS) return;
  var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) { var p = n.parentNode; if (!p || p.closest && p.closest("[data-notr],script,style,textarea")) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; }
  });
  var n, list = [];
  while ((n = w.nextNode())) list.push(n);
  list.forEach(function (t) { var v = tr(t.nodeValue); if (it) v = itNumbers(v); if (v !== t.nodeValue) t.nodeValue = v; });
  var els = node.querySelectorAll ? node.querySelectorAll("[placeholder],[aria-label],[title],[alt]") : [];
  for (var i = 0; i < els.length; i++) {
    var el = els[i]; if (el.closest("[data-notr]")) continue;
    ["placeholder", "aria-label", "title", "alt"].forEach(function (a) { var v = el.getAttribute(a); if (v) { var t = tr(v); if (t !== v) el.setAttribute(a, t); } });
  }
}
function translateHTML(html) {
  if (lang() !== "it") return html;
  var doc = new DOMParser().parseFromString(html, "text/html");
  translateDOM(doc.documentElement);
  doc.documentElement.setAttribute("lang", "it");
  return "<!doctype html>" + doc.documentElement.outerHTML;
}
