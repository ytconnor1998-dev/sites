// ===== Router, rendering, events, startup =====
function route() { var h = location.hash.replace("#", ""); return ["customer", "web", "courier", "admin"].indexOf(h) >= 0 ? h : LIVE ? "web" : "home"; }
// The live site has no test launcher: the address on its own opens the website.

function launcher() {
  return '<div class="home"><div class="row between wrap"><span class="logo xl"><svg><use href="#mark"/></svg>DART</span>' + modeChip() + "</div>" +
    '<h1>Test the DART platform.</h1><p class="lead">One live system: the customer app and website share one account, couriers get only what fits their vehicle, and the admin portal sets every price and rule. Nothing here charges real money.</p>' +
    '<div class="launch"><a class="l-c" href="#customer"><h2>DART</h2><p>Customer app. Book a letter, parcel or sofa with or without an account, pay, track, chat, get invoices. Businesses get subscription plans.</p><span class="go">Open on phone →</span></a>' +
    '<a class="l-w" href="#web"><h2>DART website</h2><p>Book and track from a computer, no account needed. Log in for history, invoices and business plans.</p><span class="go">Open website dashboard →</span></a>' +
    '<a class="l-d" href="#courier"><h2>DART Courier</h2><p>Apply with your vehicle and documents, get approved, go online, take deliveries that fit, prove delivery, see earnings.</p><span class="go">Open courier app →</span></a>' +
    '<a class="l-a" href="#admin"><h2>Admin portal</h2><p>Approve couriers, set prices, vehicles, item sizes and plans, manage deliveries, invoices, payments and support.</p><span class="go">Open admin portal →</span></a></div>' +
    '<div class="howto"><div><h3>Try a full delivery</h3><ol><li>Open <b>DART Courier</b>, apply as a courier with a van and add photos for the documents.</li><li>In the <b>Admin portal</b>, open Couriers and approve yourself.</li><li>Back in the courier app, go online.</li><li>Open <b>DART</b> on your phone, create an account and book a parcel or a piece of furniture with photos and measurements.</li><li>Accept the request in the courier app, step through pickup and delivery, and chat with the customer.</li><li>Finish with a photo. The customer sees the proof and the invoice.</li></ol></div>' +
    '<div><h3>Try the business side</h3><ol><li>In the <b>Admin portal</b>, create a plan under Plans if none exist.</li><li>In the customer app, go to Account → Switch to a business account.</li><li>Subscribe to a plan and book a delivery using it.</li><li>Upload several deliveries at once with Bulk deliveries.</li><li>Change prices or item sizes in the admin portal and watch the customer price change.</li></ol></div></div>' +
    (Store.mode === "live" ? '<p class="muted">Everyone you share this link with as a Contributor uses the same live data. Prices, rules and plans can be changed only by you as owner or by Editors.</p>' : '<p class="muted">Live sync isn\'t available in this view, so data stays in this browser. Open two tabs to play customer and courier.</p>') + "</div>";
}

var root, pending = false, holdRender = false, heldRender = false;
function render() {
  if (!root) return;
  if (holdRender) { heldRender = true; return; }
  if (Store.mode === "connecting") { root.innerHTML = '<div class="splash">Connecting to DART…</div>'; return; }
  var a = document.activeElement;
  if (a && root.contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /^(text|email|tel|search|number|password|)$/.test(a.type)))) { pending = true; return; }
  pending = false;
  var scroll = {}; root.querySelectorAll("[data-scroll]").forEach(function (el) { scroll[el.dataset.scroll] = el.scrollTop; });
  var mb = root.querySelector(".modal-b"), mscroll = mb ? mb.scrollTop : 0, mkey = S.modal ? S.modal.kind + (S.modal.id || "") : "";
  var r = route(), html = r === "customer" || r === "web" ? customerApp() : r === "courier" ? courierApp() : r === "admin" ? adminApp() : launcher();
  if (S.modal) html += modalHTML(S.modal);
  root.innerHTML = html;
  translateDOM(root);
  AFTER.forEach(function (f) { f(root); });
  document.documentElement.lang = lang();
  root.querySelectorAll("[data-scroll]").forEach(function (el) { if (scroll[el.dataset.scroll] != null) el.scrollTop = scroll[el.dataset.scroll]; });
  var nb = root.querySelector(".modal-b"); if (nb && root.dataset.mkey === mkey) nb.scrollTop = mscroll;
  root.dataset.mkey = mkey;
  document.title = tr(r === "customer" ? "DART" : r === "web" ? "DART · Delivery in Rome" : r === "courier" ? "DART Courier" : r === "admin" ? "DART Admin" : "DART Test Platform");
}
function modalHTML(m) {
  switch (m.kind) {
    case "google": return googleModal(m);
    case "issue": return issueModal(m, m.role || "customer");
    case "invoice": var inv = byId(S.invoices, m.id); return inv ? invoiceModal(inv) : "";
    case "confirm": return modalShell(m.title, "<p>" + esc(m.body) + "</p>", '<button class="btn ghost" data-act="modal-close">Go back</button><button class="btn" data-act="' + m.act + '" data-v="' + esc(m.v || "") + '">' + esc(m.yes) + "</button>");
    case "a-order": return aOrderModal(m);
    case "a-customer": return aCustomerModal(m);
    case "a-courier": return aCourierModal(m);
    case "a-ticket": return aTicketModal(m);
  }
  return "";
}
ACT["modal-close"] = function () { if (S.modal && S.modal.kind === "a-order" && S.modal.chat) closeChat(); S.modal = null; render(); };

function bindValue(el) {
  var p = el.dataset.bind; if (!p) return false;
  var v = el.type === "checkbox" ? el.checked : el.value;
  if (p.indexOf("modal.") === 0) { if (S.modal) setPath(S.modal, p.slice(6), v); } else setPath(S, p, v);
  return true;
}
function release() { setTimeout(function () { holdRender = false; if (heldRender) { heldRender = false; render(); } }, 0); }
function wire() {
  // Keep the DOM still between press and release so a tap right after typing isn't lost.
  root.addEventListener("pointerdown", function (e) { if (e.target.closest("button, [data-act], label, a")) { holdRender = true; setTimeout(function () { if (holdRender) { holdRender = false; if (heldRender) { heldRender = false; render(); } } }, 1500); } }, true);
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
  root.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el || !root.contains(el)) return;
    if (el.classList.contains("modal-bg") && e.target !== el) return;
    if (el.tagName === "A" && el.getAttribute("href")) return;
    var f = ACT[el.dataset.act]; if (!f) return;
    e.preventDefault(); f(el.dataset, el);
  });
  root.addEventListener("input", function (e) { if (e.target.type !== "checkbox" && e.target.tagName !== "SELECT") bindValue(e.target); });
  root.addEventListener("change", function (e) {
    var el = e.target;
    if (el.type === "file") { var file = el.files && el.files[0], h = FILES[el.dataset.file]; if (file && h) h(file, el); el.value = ""; return; }
    if (el.dataset.onchange && ACT[el.dataset.onchange]) { ACT[el.dataset.onchange]({ v: el.value }, el); return; }
    // Redraw after focus has moved on, so the field being typed into next isn't replaced.
    if (bindValue(el) && (el.dataset.live || el.tagName === "SELECT" || el.type === "checkbox")) setTimeout(render, 0);
  });
  root.addEventListener("submit", function (e) {
    var f = e.target, h = FORMS[f.dataset.form]; if (!h) return;
    e.preventDefault();
    f.querySelectorAll("[data-bind]").forEach(bindValue);
    if (document.activeElement && f.contains(document.activeElement)) document.activeElement.blur();
    h(f);
    if (pending) render();
  });
  root.addEventListener("focusout", function () { setTimeout(function () { if (pending) render(); }, 0); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && S.modal) { ACT["modal-close"](); } });
  window.addEventListener("hashchange", function () { S.modal = null; closeChat(); render(); window.scrollTo(0, 0); });
  // Hand waiting deliveries to couriers one at a time, and keep an open offer's timer moving.
  setInterval(function () {
    var r = route();
    if (r === "courier" || r === "admin") dispatch();
    if (r === "courier" && myOffer() && !pending && !S.modal) render();
  }, 1000);
  // Keep simulated courier movement and relative times fresh on live views.
  setInterval(function () {
    var r = route();
    if (S.modal || pending) return;
    if ((r === "customer" || r === "web") && S.c.view === "order" || r === "courier" && S.d.view === "job" || r === "admin" && S.a.tab === "dash") render();
  }, 4000);
}

function subscribeAll() {
  ["orders", "accounts", "couriers", "invoices", "tickets", "plans"].forEach(function (col) {
    Store.watch(col, function (rows) {
      // Skip records left by the first test build, which used a simpler format.
      if (col === "orders") rows = rows.filter(function (o) { return o.cls && o.pickup && o.dropoff && o.price && o.customer; });
      if (col === "couriers") rows = rows.filter(function (c) { return c.email && c.vehicle && typeof c.vehicle === "object"; });
      if (col === "accounts") rows = rows.filter(function (a) { return a.email && a.name; });
      if (col === "orders") rows.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      S[col] = rows;
      if (col === "accounts" && S.me.customerId) { var acc = byId(rows, S.me.customerId); if (acc) checkRenewal(acc); }
      render();
    });
  });
  Store.watch("config", function (rows) {
    ["rules", "pricing", "settings", "discounts"].forEach(function (k) { var r = byId(rows, k); if (r) { r = Object.assign({}, r); delete r.id; } S.cfg[k] = r; });
    render();
  });
}

(function boot() {
  root = document.getElementById("root");
  try { if (localStorage.getItem("dart-i18n-collect")) { MISS = {}; window.__dartMiss = function () { return MISS; }; window.__dartAct = function (n, d) { ACT[n](d || {}); }; window.__dartModal = function (m) { S.modal = m; render(); }; window.__dartEval = function (src) { return eval(src); }; } } catch (e) { }
  wire(); subscribeAll();
  var settled = false;
  function go(mode, db) {
    if (settled && !(mode === "live" && Store.mode === "local")) return;
    settled = true; Store.start(mode, db); render();
  }
  if (LIVE) { liveStart(go); return; }
  setTimeout(function () { go("local"); }, 3000);
  var c = window.claude;
  if (!c || !c.use) { go("local"); return; }
  c.use("db").then(function (db) { db ? go("live", db) : go("local"); }, function () { go("local"); });
  c.use("downloads").then(function (d) { Caps.downloads = d; }, function () { });
  c.use("sample").then(function (s) {
    if (!s) return; Caps.sample = s;
    return s.limits().then(function (l) { Caps.sampleImages = !!(l && l.images); render(); }, function () { });
  }, function () { });
})();
