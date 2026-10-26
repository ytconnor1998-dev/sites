// ===== DART public website (the #web view): marketing pages around the working booking flow =====
S.c.hq = { from: "", to: "", type: "parcel" };
S.c.contact = { name: "", email: "", topic: "question", text: "", sent: false };
var SITE_VIEWS = ["site-home", "site-how", "site-pricing", "site-business", "site-couriers", "site-courier-apply", "site-help", "site-terms", "site-privacy"];
GUEST_VIEWS.push.apply(GUEST_VIEWS, SITE_VIEWS);
var SITE_NAV = [["site-how", "How it works"], ["site-pricing", "Pricing"], ["site-business", "Business"], ["site-couriers", "Couriers"], ["site-help", "Help"]];
// Typical items used for "from" prices and the instant quote.
var TYPICAL = {
  letter: { label: "Letters and documents", item: { type: "document", l: 32, w: 24, h: 2, kg: 0.3, qty: 1, options: {} } },
  parcel: { label: "Parcels", item: { type: "parcel", l: 40, w: 30, h: 25, kg: 5, qty: 1, options: {} } },
  large: { label: "Large and heavy", item: { type: "parcel", l: 90, w: 60, h: 55, kg: 25, qty: 1, options: {} } },
  furniture: { label: "Furniture", item: { type: "furniture", l: 180, w: 85, h: 80, kg: 35, qty: 1, options: {} } }
};
function typicalQuote(kind, from, to) {
  var t = TYPICAL[kind], cls = classify(t.item); if (!cls.ok) return null;
  return { cls: cls, q: quote(from, to, t.item, cls, null) };
}
function fromPrice(kind) { var x = typicalQuote(kind, "Centro Storico", "Monti"); return x ? x.q.total : null; }

function siteShell(acc, body, isSite, accNav) {
  var v = S.c.view, open = S.c.navOpen;
  var h = '<div class="ws">';
  h += '<header class="ws-head"><div class="ws-wrap ws-bar"><button class="ws-logo" data-act="w-page" data-v="site-home" aria-label="DART home"><svg><use href="#mark"/></svg>DART</button>' +
    '<nav class="ws-nav' + (open ? " open" : "") + '" aria-label="Main">' + SITE_NAV.map(function (n) { return '<button class="' + (v === n[0] ? "on" : "") + '" data-act="w-page" data-v="' + n[0] + '">' + n[1] + "</button>"; }).join("") +
    '<button class="ws-only-m" data-act="c-go" data-v="track">Track a delivery</button>' + (acc ? '<button class="ws-only-m" data-act="c-go" data-v="home">My DART</button>' : '<button class="ws-only-m" data-act="c-auth-open" data-v="login">Log in</button>') + "</nav>" +
    '<div class="ws-right">' + langSwitch("on-dark") + '<button class="ws-link ws-hide-m" data-act="c-go" data-v="track">Track</button>' +
    (acc ? '<button class="ws-link ws-hide-m" data-act="c-go" data-v="home"><span class="avatar sm">' + esc(initials(acc.name)) + "</span> My DART</button>" : '<button class="ws-link ws-hide-m" data-act="c-auth-open" data-v="login">Log in</button>') +
    '<button class="ws-cta" data-act="w-book">Book a delivery</button><button class="ws-burger" data-act="w-nav" aria-label="Menu" aria-expanded="' + !!open + '"><i></i><i></i><i></i></button></div></div>' +
    (acc && !isSite ? '<div class="ws-sub"><div class="ws-wrap">' + accNav + "</div></div>" : "") + "</header>";
  h += isSite ? "<main>" + body + "</main>" : '<main class="w-wrap w-main">' + body + "</main>";
  return h + siteFooter() + "</div>";
}
function siteFooter() {
  var st = settings();
  return '<footer class="ws-foot"><div class="ws-wrap"><div class="ws-foot-top"><div><span class="ws-logo light"><svg><use href="#mark"/></svg>DART</span><p>Same-day delivery inside Rome’s GRA, from envelopes to wardrobes.</p></div>' +
    '<div><h4>Send</h4><button data-act="w-book">Book a delivery</button><button data-act="c-go" data-v="track">Track a delivery</button><button data-act="w-page" data-v="site-pricing">Pricing</button><button data-act="w-page" data-v="site-how">How it works</button></div>' +
    '<div><h4>Work with DART</h4><button data-act="w-page" data-v="site-business">Business plans</button><button data-act="w-page" data-v="site-couriers">Become a courier</button><button data-act="w-page" data-v="site-courier-apply">Apply to deliver</button><a href="#courier">Courier app log in</a></div>' +
    '<div><h4>Help</h4><button data-act="w-page" data-v="site-help">Help and contact</button><button data-act="w-page" data-v="site-terms">Terms and conditions</button><button data-act="w-page" data-v="site-privacy">Privacy policy</button>' + (st.supportEmail ? "<span>" + esc(st.supportEmail) + "</span>" : "") + "</div></div>" +
    '<div class="ws-word" aria-hidden="true">DART</div><div class="ws-legal"><span>© ' + new Date().getFullYear() + " " + esc(st.company || "DART") + (st.companyVat ? " · P.IVA " + esc(st.companyVat) : "") + (st.companyAddress ? " · " + esc(st.companyAddress) : "") + '</span><span>Test build · ' + (Store.mode === "live" ? "live data" : "this browser only") + "</span></div></div></footer>";
}
function sitePage(v, acc) {
  switch (v) {
    case "site-how": return siteHow();
    case "site-pricing": return sitePricing();
    case "site-business": return siteBusiness(acc);
    case "site-couriers": return siteCouriers();
    case "site-courier-apply": return siteCourierApply();
    case "site-help": return siteHelp(acc);
    case "site-terms": return siteLegal("terms");
    case "site-privacy": return siteLegal("privacy");
    default: return siteHome(acc);
  }
}
ACT["w-page"] = function (d) { S.c.view = d.v; S.c.navOpen = false; closeChat(); render(); window.scrollTo(0, 0); };
ACT["w-nav"] = function () { S.c.navOpen = !S.c.navOpen; render(); };
ACT["w-book"] = function () { S.c.navOpen = false; if (S.c.draft.done) S.c.draft = newDraft(); S.c.view = "new"; render(); window.scrollTo(0, 0); };
ACT["w-hq-type"] = function (d) { S.c.hq.type = d.v; render(); };
ACT["w-hq-book"] = function () {
  var hq = S.c.hq, dr = newDraft(), t = TYPICAL[hq.type];
  dr.pickup.area = hq.from; dr.dropoff.area = hq.to; dr.item.type = t.item.type;
  S.c.draft = dr; S.c.view = "new"; S.c.navOpen = false; render(); window.scrollTo(0, 0);
  toast(hq.from && hq.to ? "Add the street addresses to continue." : "Start with where it's going.");
};

// ---------- Home ----------
// Worked examples, priced live from the admin settings so every number on the page is real.
var EXAMPLES = [
  { what: "A signed contract", from: "Prati", to: "EUR", item: { type: "document", l: 32, w: 24, h: 1, kg: 0.2, qty: 1, options: {} } },
  { what: "A shop order", from: "Monti", to: "Parioli", item: { type: "parcel", l: 35, w: 25, h: 15, kg: 2, qty: 1, options: {} } },
  { what: "Six moving boxes", from: "Termini", to: "Monteverde", item: { type: "parcel", l: 60, w: 40, h: 40, kg: 12, qty: 6, options: {} } },
  { what: "An armchair from Porta Portese, fourth floor without a lift", from: "Trastevere", to: "Pigneto", item: { type: "furniture", l: 95, w: 85, h: 90, kg: 22, qty: 1, options: { stairs: true } } },
  { what: "A wardrobe, taken apart", from: "San Giovanni", to: "Ostiense", item: { type: "furniture", l: 200, w: 60, h: 45, kg: 65, qty: 1, options: {} } }
];
function examplePrice(e) { var cls = classify(e.item); if (!cls.ok) return null; return { cls: cls, q: quote(e.from, e.to, e.item, cls, null) }; }
function heroQuote() {
  var hq = S.c.hq, x = hq.from && hq.to ? typicalQuote(hq.type, hq.from, hq.to) : null;
  var hint = { letter: "envelope", parcel: "up to 40 cm", large: "up to 1 m", furniture: "chair to sofa" };
  return '<div class="ws-quote"><div class="ws-q-row"><label><span>From</span>' + sel("c.hq.from", hq.from, [["", "Pickup area"]].concat(AREA_NAMES), 'data-live="1"') + "</label>" +
    '<label><span>To</span>' + sel("c.hq.to", hq.to, [["", "Delivery area"]].concat(AREA_NAMES), 'data-live="1"') + "</label></div>" +
    '<div class="ws-q-types" role="radiogroup" aria-label="What are you sending">' + Object.keys(TYPICAL).map(function (k) { var on = hq.type === k; return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? "on" : "") + '" data-act="w-hq-type" data-v="' + k + '">' + TYPICAL[k].label.split(" and")[0] + "<small>" + hint[k] + "</small></button>"; }).join("") + "</div>" +
    '<div class="ws-q-out">' + (x ? '<div><span class="ws-q-price">' + eur(x.q.total) + '</span><span class="ws-q-meta">' + x.q.km.toFixed(1) + " km by road, " + esc(vLabel(x.cls.minVehicle).toLowerCase()) + ", about " + x.q.mins + " min</span></div>" : '<div><span class="ws-q-price muted-l">from ' + eur(pricing().minFee) + '</span><span class="ws-q-meta">Pick two areas to see a price</span></div>') +
    '<button class="ws-btn" data-act="w-hq-book">Book now</button></div><p class="ws-q-note">' + { letter: "Based on a typical letter.", parcel: "Based on a typical parcel.", large: "Based on a typical large item.", furniture: "Based on a typical piece of furniture." }[hq.type] + " Your exact price comes from your addresses and measurements.</p></div>";
}
function heroPhone() {
  return '<div class="ws-phone" aria-hidden="true"><div class="ws-phone-s"><div class="ws-ph-top"><span class="logo"><svg><use href="#mark"/></svg>DART</span><span class="chip s-pur">In transit</span></div>' +
    '<div class="ws-ph-map">' + mapSVG({ labels: false, routes: [{ from: "Trastevere", to: "Pigneto", t: .55 }] }) + '</div><div class="ws-ph-card"><b>12 min away</b><span>Armchair · Trastevere → Pigneto</span><div class="progress">' + [1, 1, 1, 1, 1, 1, 0, 0].map(function (on) { return '<i class="' + (on ? "on" : "") + '"></i>'; }).join("") + '</div><span class="ws-ph-note">Stairs, no lift · photo on delivery</span></div></div></div>';
}
function siteHome(acc) {
  var P = pricing(), R = rules(), plans = S.plans.filter(function (p) { return p.active !== false; }).sort(function (a, b) { return a.price - b.price; });
  var furn = R.categories.filter(function (c) { return c.id === "furniture"; })[0];
  var h = '<section class="ws-hero"><div class="ws-wrap ws-hero-grid"><div class="ws-hero-copy"><p class="ws-kicker">Same-day delivery inside Rome\'s GRA</p><h1>Get it across Rome.</h1>' +
    '<p class="ws-lead">DART collects whatever you need moved in the city, from a signed contract to a sofa, and delivers it the same day. Add a photo and the measurements and you see the exact price before you book.</p>' + heroQuote() + "</div>" + heroPhone() + "</div></section>";
  h += '<div class="ws-facts"><div class="ws-wrap"><dl>' +
    "<div><dt>Minimum fee</dt><dd>" + eur(P.minFee) + "</dd></div><div><dt>Per km</dt><dd>" + eur(P.perKm) + "</dd></div>" +
    (furn ? "<div><dt>Largest furniture</dt><dd>" + furn.l + " cm</dd></div>" : "") + "<div><dt>To book</dt><dd>No account</dd></div></dl></div></div>";
  h += '<section class="ws-sec"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">What a delivery costs</h2><p class="ws-p">Five real routes priced with today\'s rates. Distance sets the base, then size, weight, the vehicle and extras like stairs are added. VAT is included.</p><button class="ws-more" data-act="w-page" data-v="site-pricing">How pricing works →</button></div>' +
    '<ol class="ws-ex">' + EXAMPLES.map(function (e) {
      var x = examplePrice(e); if (!x) return "";
      return '<li><div><b>' + e.what + "</b><span>" + e.from + " → " + e.to + " · " + x.q.km.toFixed(1) + " km · " + esc(vLabel(x.cls.minVehicle).toLowerCase()) + (x.cls.couriers > 1 ? " · two people" : "") + '</span></div><span class="ws-ex-p">' + eur(x.q.total) + "</span></li>";
    }).join("") + "</ol></div></section>";
  h += '<section class="ws-sec alt"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">What happens after you book</h2><button class="ws-btn dark" data-act="w-book">Book a delivery</button></div><ol class="ws-how">' +
    "<li><b>Addresses and access</b><p>Add the buzzer name and the floor. Plenty of palazzi in the centre have no lift: tick “Stairs, no lift” and the courier arrives ready for it.</p></li>" +
    "<li><b>Photo and size</b><p>Measure the longest side, the width and the height. If you only have a photo, DART can suggest the size from it, and you check the numbers.</p></li>" +
    "<li><b>The right vehicle</b><p>DART picks the smallest vehicle the item fits in: a bicycle for an envelope, a van for a wardrobe. Couriers only see jobs their vehicle can carry.</p></li>" +
    "<li><b>Tracking and proof</b><p>You get an update at pickup, when it's on the way and at the door, with a photo of where it was left and an invoice straight after.</p></li></ol></div></section>";
  h += '<section class="ws-band dark"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">Monthly plans for shops and offices</h2><p>Use your normal DART account. Switch it to business in Settings, add your Partita IVA and SDI code, and pick a plan. Anything a plan doesn\'t cover is charged at the normal price, shown before you confirm.</p><button class="ws-btn lilac" data-act="w-page" data-v="site-business">Business details</button></div>' +
    (plans.length ? '<table class="ws-plantbl"><thead><tr><th>Plan</th><th>Per month</th><th>Deliveries</th><th>Each extra</th></tr></thead><tbody>' + plans.map(function (p) { return "<tr><td>" + esc(p.name) + "</td><td>" + eur(p.price) + "</td><td>" + p.allowance + "</td><td>" + eur(p.overageFee) + "</td></tr>"; }).join("") + "</tbody></table>" : "<p>Plans will be listed here. Until then, businesses pay per delivery.</p>") + "</div></section>";
  var arm = examplePrice(EXAMPLES[3]);
  h += '<section class="ws-band lilac"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">Deliver with DART</h2><button class="ws-btn dark" data-act="w-page" data-v="site-couriers">Courier details</button><button class="ws-more" data-act="w-page" data-v="site-courier-apply">Apply now →</button></div><div class="ws-courier"><p>Couriers keep ' + num(P.courierShare, 75) + "% of each delivery price" + (arm ? ". On the armchair above, that's " + eur(arm.q.total * num(P.courierShare, 75) / 100) + "." : ".") + " You choose when you're online, see the pickup, destination and pay before accepting, and are paid weekly by bank transfer.</p>" +
    "<p>Register a bicycle, scooter, motorbike, car or van. For motor vehicles we check your licence, insurance and libretto before your first job.</p></div></div></section>";
  h += '<section class="ws-sec"><div class="ws-wrap ws-cover"><div class="ws-split-l"><h2 class="ws-h2">Where we deliver</h2><p class="ws-p">Anywhere inside the Grande Raccordo Anulare. These are the areas you can choose when booking:</p><p class="ws-arealist">' + AREA_NAMES.join(", ") + '.</p></div><div class="ws-cover-map">' + mapSVG({ dots: AREA_NAMES.map(function (a) { return { area: a, color: "var(--purple)" }; }) }) + "</div></div></section>";
  h += '<section class="ws-sec alt"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">Questions</h2><button class="ws-more" data-act="w-page" data-v="site-help">More answers and contact →</button></div><div class="ws-faq">' + FAQ.slice(0, 4).map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + "</div></div></section>";
  return h;
}
function step(t, b) { return "<li><b>" + t + "</b><p>" + b + "</p></li>"; }
function pageHead(kicker, title, lead) { return '<section class="ws-page-h"><div class="ws-wrap"><p class="ws-kicker">' + kicker + "</p><h1>" + title + "</h1>" + (lead ? '<p class="ws-lead">' + lead + "</p>" : "") + "</div></section>"; }

// ---------- How it works ----------
function siteHow() {
  return pageHead("How it works", "What happens when you book", "DART matches your item to a courier whose vehicle can carry it. This is the whole process, start to finish.") +
    '<section class="ws-sec"><div class="ws-wrap ws-split"><div class="ws-split-l"><button class="ws-btn dark" data-act="w-book">Book a delivery</button></div><ol class="ws-how">' +
    step("Add the addresses", "Choose the area and street for pickup and delivery. Add instructions like the buzzer name, the floor, or the seller's name if you're collecting something you bought.") +
    step("Describe the item", "Choose letter, parcel, furniture or something else. Add up to three photos and the length, width, height and weight if you know it.") +
    step("DART checks it fits", "We find the item's size category, the vehicles that can carry it, and whether it needs two people. If nothing can carry it, you're told before paying.") +
    step("See the full price", "A distance charge, the size category fee, any weight or extra-item charges, the vehicle, and the extras you ticked. Every line is shown.") +
    step("Book", "Pay by card. Guests only need a name, email and phone number. Businesses on a plan use their monthly allowance.") +
    step("A courier accepts", "Nearby couriers with a suitable vehicle see the request. When one accepts, you see their name and vehicle and can message them.") +
    step("Follow it", "Travelling to pickup, collected, in transit, arrived. You get a notification at each step.") +
    step("Delivered", "The courier records who received it and adds a photo. Your invoice is ready straight away.") +
    "</ol></div></section>";
}

// ---------- Pricing ----------
function sitePricing() {
  var P = pricing(), R = rules();
  var cats = R.categories.filter(function (c) { return c.active !== false; });
  var h = pageHead("Pricing", "What a delivery costs", "Every delivery has a distance charge with a minimum fee. Size, weight and extras are added on top, and you see each line before you book.");
  h += '<section class="ws-sec"><div class="ws-wrap"><div class="ws-facts flat"><dl><div><dt>Minimum fee</dt><dd>' + eur(P.minFee) + "</dd></div><div><dt>Per km</dt><dd>" + eur(P.perKm) + "</dd></div><div><dt>Shortest charged trip</dt><dd>" + P.minKm + " km</dd></div><div><dt>VAT</dt><dd>" + P.vatRate + "%, included</dd></div></dl></div></div></section>";
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">Size categories</h2><p class="ws-p">Your item goes in the smallest category it fits, by its three dimensions and its weight.</p><div class="tbl ws-tbl"><table><thead><tr><th>Category</th><th>Up to</th><th>Weight up to</th><th>Category fee</th><th>Vehicles</th></tr></thead><tbody>' +
    cats.map(function (c) { return "<tr><td><b>" + esc(c.label) + "</b>" + (num(c.couriers, 1) > 1 ? ' <span class="muted sm">· two people</span>' : "") + "</td><td>" + c.l + " × " + c.w + " × " + c.h + " cm</td><td>" + c.kg + " kg</td><td>" + (num(c.fee, 0) ? "+" + eur(c.fee) : "none") + '</td><td class="sm">' + esc((c.vehicles || []).map(vLabel).join(", ")) + "</td></tr>"; }).join("") + "</tbody></table></div></div></section>";
  h += '<section class="ws-sec"><div class="ws-wrap ws-two"><div><h2 class="ws-h2">Extras</h2><dl class="kv ws-kv">' + OPTIONS.map(function (o) { return "<dt>" + o.label + "</dt><dd>+" + eur(P.options[o.id]) + "</dd>"; }).join("") +
    "<dt>Each extra item in the same delivery</dt><dd>+" + eur(P.extraItemFee) + "</dd><dt>Weight over " + P.weightFrom + " kg</dt><dd>+" + eur(P.perKgOver) + " per kg</dd><dt>Second courier, when needed</dt><dd>+" + eur(P.secondCourierFee) + "</dd>" + (num(P.longFrom, 0) ? "<dt>Over " + P.longFrom + " km</dt><dd>+" + eur(P.longFee) + " per km</dd>" : "") + "</dl></div>" +
    '<div><h2 class="ws-h2">Try a route</h2>' + heroQuote() + "</div></div></section>";
  return h;
}

// ---------- Business ----------
function siteBusiness(acc) {
  var plans = S.plans.filter(function (p) { return p.active !== false; }).sort(function (a, b) { return a.price - b.price; });
  var cta = acc ? '<button class="ws-btn dark" data-act="c-go" data-v="business">Switch my account to business</button>' : '<button class="ws-btn dark" data-act="c-auth-open" data-v="register">Create an account</button>';
  var h = pageHead("Business", "DART for shops, offices and studios", "Send documents, stock and supplies across Rome from the account you already use. There's no separate business app.");
  h += '<section class="ws-sec"><div class="ws-wrap ws-split"><div class="ws-split-l">' + cta + '</div><ol class="ws-how">' + step("Create a DART account", "Or log in to the one you have.") + step("Switch to business", "In Settings, add your business name, address, Partita IVA and SDI code. Your invoices show them from then on.") + step("Choose a plan, or don't", "A plan gives you a set number of deliveries each month for one price. Without one, you pay per delivery.") + step("Send", "Book deliveries one at a time, or, on plans that include it, upload a CSV or Excel file and book every row at once.") + "</ol></div></section>";
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">Plans</h2>' + (plans.length ? '<div class="tbl ws-tbl"><table><thead><tr><th>Plan</th><th>Per month</th><th>Deliveries included</th><th>Each extra delivery</th><th>Covers</th><th>Bulk upload</th></tr></thead><tbody>' + plans.map(function (p) {
    return "<tr><td><b>" + esc(p.name) + "</b></td><td>" + eur(p.price) + "</td><td>" + p.allowance + "</td><td>" + eur(p.overageFee) + '</td><td class="sm">' + esc((p.categories || []).map(cLabel).join(", ")) + "</td><td>" + (p.bulk ? "Yes" : "No") + "</td></tr>";
  }).join("") + "</tbody></table></div>" : '<p class="ws-p">Plans will be listed here. You can already use DART as a business and pay per delivery.</p>') + '<p class="ws-p sm">Categories a plan doesn\'t cover, such as furniture, are charged at the normal price. The app shows this before you confirm.</p></div></section>';
  return h;
}

// ---------- Couriers: information ----------
// A typical job for each vehicle, priced live, so courier earnings on the page are real numbers.
var COURIER_JOBS = {
  bicycle: { what: "Contract", from: "Prati", to: "Centro Storico", item: { type: "document", l: 32, w: 24, h: 1, kg: 0.2, qty: 1, options: {} } },
  scooter: { what: "Shop order", from: "Monti", to: "Parioli", item: { type: "parcel", l: 35, w: 25, h: 15, kg: 2, qty: 1, options: {} } },
  motorcycle: { what: "Shoebox parcel", from: "Testaccio", to: "San Lorenzo", item: { type: "parcel", l: 50, w: 40, h: 30, kg: 8, qty: 1, options: {} } },
  smallcar: { what: "Two boxes", from: "Termini", to: "Monteverde", item: { type: "parcel", l: 55, w: 40, h: 35, kg: 9, qty: 2, options: {} } },
  car: { what: "Armchair", from: "Trastevere", to: "Pigneto", item: { type: "furniture", l: 95, w: 85, h: 90, kg: 22, qty: 1, options: {} } },
  van: { what: "Sofa, three seats", from: "Garbatella", to: "Flaminio", item: { type: "furniture", l: 210, w: 90, h: 85, kg: 60, qty: 1, options: {} } },
  largevan: { what: "Wardrobe", from: "San Giovanni", to: "EUR", item: { type: "furniture", l: 200, w: 100, h: 60, kg: 90, qty: 1, options: { stairs: true } } },
  cargovan: { what: "Small office move", from: "Ostiense", to: "Prati", item: { type: "furniture", l: 300, w: 150, h: 120, kg: 400, qty: 1, options: {} } }
};
function siteCouriers() {
  var P = pricing(), R = rules(), share = num(P.courierShare, 75), vs = R.vehicles.filter(function (v) { return v.active !== false; });
  var h = pageHead("Couriers", "Deliver with DART", "Use your own bicycle, scooter, motorbike, car or van to deliver across Rome. You choose when you work, and you only get jobs your vehicle can carry.") +
    '<section class="ws-sec"><div class="ws-wrap"><div class="ws-facts flat"><dl><div><dt>You keep</dt><dd>' + share + "% of the price</dd></div><div><dt>Paid</dt><dd>Every Monday</dd></div><div><dt>Hours</dt><dd>Your choice</dd></div><div><dt>Area</dt><dd>Inside the GRA</dd></div></dl></div>" +
    '<button class="ws-btn" data-act="w-page" data-v="site-courier-apply">Apply to deliver</button></div></section>';
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">What you earn</h2><p class="ws-p">Each job shows its pay before you accept. These are typical jobs for each vehicle, worked out with today\'s prices.</p><div class="tbl ws-tbl"><table><thead><tr><th>Vehicle</th><th>Typical job</th><th>Route</th><th>Delivery price</th><th>You earn</th></tr></thead><tbody>' +
    vs.map(function (v) {
      var j = COURIER_JOBS[v.id]; if (!j) return "";
      var cls = classify(j.item); if (!cls.ok) return "";
      var q = quote(j.from, j.to, j.item, Object.assign({}, cls, { minVehicle: v.id }), null);
      return "<tr><td><b>" + esc(v.label) + "</b></td><td>" + j.what + "</td><td>" + j.from + " → " + j.to + " · " + q.km.toFixed(1) + ' km</td><td class="mono">' + eur(q.total) + '</td><td class="mono"><b>' + eur(q.total * share / 100) + "</b></td></tr>";
    }).join("") + "</tbody></table></div><p class=\"ws-p sm\">Bigger vehicles also see smaller jobs. Furniture and heavy items pay more, and some need two people.</p></div></section>";
  h += '<section class="ws-sec"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">From application to first job</h2><button class="ws-btn dark" data-act="w-page" data-v="site-courier-apply">Start your application</button></div><ol class="ws-how">' +
    step("Apply online", "Your name, phone and address, your vehicle with its loading space and weight limit, photos of your documents, and the IBAN you want to be paid to. It takes about ten minutes.") +
    step("We check your documents", "DART reviews your identity and, for motor vehicles, your licence, insurance and libretto. You'll get a notification when you're approved, or a note telling you what to fix.") +
    step("Go online in the courier app", "Switch to online and set the area you're in. Requests that fit your vehicle appear, nearest first.") +
    step("Take a job", "You see the pickup, the destination, the item with its size, weight and photos, any extras like stairs, and what you'll earn. Accept or decline.") +
    step("Deliver", "Navigate with Google Maps, update each step, message the customer if you need to, and finish with a photo and the name of who received it.") +
    step("Get paid", "Completed jobs show as pending in Earnings and are paid every Monday by bank transfer.") + "</ol></div></section>";
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">What you need</h2><div class="tbl ws-tbl"><table><thead><tr><th>Vehicle</th><th>Typical loading space</th><th>Up to</th><th>Documents</th><th>Can carry</th></tr></thead><tbody>' +
    vs.map(function (v) {
      var cats = R.categories.filter(function (c) { return c.active !== false && (c.vehicles || []).indexOf(v.id) >= 0; }).map(function (c) { return c.label; });
      var docs = v.id === "bicycle" ? "ID card or passport" : "ID, driving licence, insurance, libretto";
      return "<tr><td><b>" + esc(v.label) + "</b></td><td>" + v.l + " × " + v.w + " × " + v.h + " cm</td><td>" + v.kg + ' kg</td><td class="sm">' + docs + '</td><td class="sm">' + esc(cats.length > 1 ? cats[0] + " to " + cats[cats.length - 1] : cats.join("")) + "</td></tr>";
    }).join("") + '</tbody></table></div><ul class="ws-ticks sm"><li>A smartphone with mobile data, for the courier app and photos</li><li>An Italian or EU bank account (IBAN) for payouts</li><li>Your own vehicle insurance for motor vehicles</li><li>You must be 18 or over</li></ul></div></section>';
  h += '<section class="ws-sec"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">Courier questions</h2></div><div class="ws-faq">' + [
    ["Do I have to work set hours?", "No. You go online when you want to take jobs and offline when you don't. There are no shifts."],
    ["Why don't I see every request?", "DART only shows you items that fit your registered vehicle's loading space and weight limit. Bigger vehicles see smaller jobs too."],
    ["Can I change my vehicle later?", "Yes. Send the new vehicle from the courier app. DART approves it, and you keep getting jobs for your current vehicle until then."],
    ["What if something goes wrong on a job?", "Use Report a problem on the delivery. DART support sees it straight away, and the customer is told there's an issue."],
    ["How am I paid and taxed?", "Earnings are paid every Monday to your IBAN. You work as an independent courier and are responsible for your own tax position. We'll confirm the contract terms with you before your first job."],
    ["Can I give a job back?", "Yes, before you collect the item. It goes back to other couriers. Doing it often may affect your account."]
  ].map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + "</div></div></section>";
  return h + '<section class="ws-sec alt"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">Ready to apply?</h2></div><div class="ws-split-l"><p class="ws-p">The application takes about ten minutes. Have your documents and IBAN to hand.</p><button class="ws-btn" data-act="w-page" data-v="site-courier-apply">Apply to deliver</button><p class="ws-p sm">Already applied? Open the <a href="#courier">courier app</a> and log in with your email.</p></div></div></section>';
}

// ---------- Couriers: apply on the website ----------
function siteCourierApply() {
  var c = myCourier();
  var h = pageHead("Apply", "Apply to deliver with DART", "");
  if (c) {
    var st = { pending: ["We're checking your application", "You'll get a notification in the courier app when you're approved, or a note telling you what to fix."], approved: ["You're approved", "Open the courier app, go online and start taking jobs."], rejected: ["Your application wasn't approved", c.decisionNote || "Contact DART support to find out why."], suspended: ["Your account is paused", c.decisionNote || "Contact DART support."] }[c.status] || ["Application received", ""];
    return h + '<section class="ws-sec"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">' + st[0] + '</h2><p class="ws-p">' + esc(st[1]) + '</p><a class="ws-btn dark" href="#courier">Open the courier app</a></div><div class="card"><b>' + esc(c.name) + '</b><span class="muted">' + esc(c.email) + " · " + esc(vLabel(c.vehicle.type)) + (c.vehicle.plate ? " · " + esc(c.vehicle.plate) : "") + '</span><span class="chip ' + (c.status === "approved" ? "s-ok" : c.status === "pending" ? "s-warn" : "s-bad") + '">' + esc(c.status) + "</span></div></div></section>";
  }
  var r = S.d.reg = S.d.reg || newReg(), steps = ["About you", "Your vehicle", "Documents", "Payouts"];
  var form = "";
  if (r.step === 1) form = '<form class="stack" data-form="d-reg-1">' + '<div class="grid2">' + field("Full name", inp("d.reg.name", r.name, 'autocomplete="name" required')) + field("Email", inp("d.reg.email", r.email, 'type="email" autocomplete="email" required')) + "</div>" + '<div class="grid2">' + field("Phone", inp("d.reg.phone", r.phone, 'type="tel" autocomplete="tel" required')) + field("Password", '<input class="input" type="password" autocomplete="new-password">', "Test build: not stored.") + "</div>" + field("Home address", inp("d.reg.address", r.address, 'autocomplete="street-address" required placeholder="Street, number, CAP"')) + '<button class="btn">Next: your vehicle</button></form>';
  if (r.step === 2) form = vehicleForm("d.reg.vehicle", r.vehicle) + '<div class="row"><button class="btn ghost" data-act="d-reg-step" data-v="1">Back</button><button class="btn" data-act="d-reg-step" data-v="3">Next: documents</button></div>';
  if (r.step === 3) form = docsForm(r.vehicle.type, r.docs, "reg") + '<div class="row"><button class="btn ghost" data-act="d-reg-step" data-v="2">Back</button><button class="btn" data-act="d-reg-step" data-v="4"' + (docsFor(r.vehicle.type).every(function (k) { return r.docs[k]; }) ? "" : " disabled") + ">Next: payouts</button></div>";
  if (r.step === 4) form = '<form class="stack" data-form="d-reg-4"><div class="card"><b>Where should we pay you?</b><span class="muted">Earnings are paid every Monday by bank transfer.</span>' + field("Account holder", inp("d.reg.holder", r.holder || r.name, "required")) + field("IBAN", inp("d.reg.iban", r.iban, 'required placeholder="IT60 X054 2811 1010 0000 0123 456"')) + '</div><div class="row"><button type="button" class="btn ghost" data-act="d-reg-step" data-v="3">Back</button><button class="btn">Send my application</button></div></form>';
  return h + '<section class="ws-sec"><div class="ws-wrap ws-split"><div class="ws-split-l"><ol class="ws-how ws-apply-steps">' + steps.map(function (t, i) { return '<li class="' + (r.step === i + 1 ? "on" : r.step > i + 1 ? "done" : "") + '"><b>' + t + "</b><p>" + ["Name, contact details and address", "Type, plate and loading space", "Photos of ID and vehicle papers", "Your IBAN for weekly payouts"][i] + "</p></li>"; }).join("") +
    '</ol><p class="ws-p sm">Want the details first? Read <button class="ws-more" data-act="w-page" data-v="site-couriers">what being a DART courier involves</button>.</p></div><div class="stack ws-apply">' + form + "</div></div></section>";
}

// ---------- Help and contact ----------
function siteHelp(acc) {
  var c = S.c.contact;
  var h = pageHead("Help", "Help and contact", settings().supportEmail ? "Write to " + esc(settings().supportEmail) + " or use the form below." : "Use the form below and we'll reply by email.");
  h += '<section class="ws-sec"><div class="ws-wrap ws-two"><div><h2 class="ws-h2">Common questions</h2><div class="ws-faq">' + FAQ.concat([["Do I need an account?", "No. You can book and track with just your name, email and phone. An account keeps your history, saved addresses and invoices together, and lets businesses use plans."], ["Where can I find my tracking code?", "On the confirmation screen after booking. Use it with your email under Track a delivery."]]).map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + "</div></div>" +
    '<div><h2 class="ws-h2">Contact us</h2>' + (c.sent ? '<div class="card ok"><b>Thanks, we\'ve got your message.</b><span>DART support will reply by email.</span></div>' :
      '<form class="card" data-form="w-contact">' + (acc ? "" : '<div class="grid2">' + field("Name", inp("c.contact.name", c.name, "required")) + field("Email", inp("c.contact.email", c.email, 'type="email" required')) + "</div>") +
      field("About", sel("c.contact.topic", c.topic, [["question", "A question"], ["delivery", "A delivery"], ["business", "Business plans"], ["courier", "Becoming a courier"], ["other", "Something else"]])) + field("Message", txt("c.contact.text", c.text, 'rows="5" required')) + '<button class="btn">Send message</button></form>') +
    '<div class="card"><b>Already booked?</b><span class="muted">Track it with your code and email, chat with your courier, or report a problem from the delivery page.</span><button class="btn ghost sm" data-act="c-go" data-v="track">Track a delivery</button></div></div></div></section>';
  return h;
}
FORMS["w-contact"] = function () {
  var c = S.c.contact, acc = me(), text = clip(c.text, 1000), name = acc ? acc.name : clip(c.name, 60), email = acc ? acc.email : slugEmail(c.email);
  if (!name || !emailOk(email) || !text) return toast("Add your name, a valid email and a message.");
  var labels = { question: "Website question", delivery: "Delivery question", business: "Business plans", courier: "Becoming a courier", other: "Other" };
  run(Store.set("tickets", "T-" + rid(6), { from: "website", accountId: acc ? acc.id : null, name: name, email: email, orderId: null, topic: c.topic, subject: labels[c.topic], text: text, status: "open", replies: [], createdAt: Date.now() }).then(function () { S.c.contact = { name: "", email: "", topic: "question", text: "", sent: true }; }), "Message sent");
};

// ---------- Legal (drafts) ----------
function siteLegal(kind) {
  var st = settings(), terms = kind === "terms";
  var body = terms ? [
    ["Who we are", esc(st.company || "DART") + (st.companyAddress ? ", " + esc(st.companyAddress) : "") + (st.companyVat ? ", P.IVA " + esc(st.companyVat) : "") + ", runs the DART delivery platform."],
    ["Bookings", "A booking is confirmed when you pay or, for businesses on a plan or monthly invoicing, when you confirm it. The price shown before you confirm is the price you pay, unless the item turns out to be different from what you described."],
    ["What you can send", "Letters, documents, parcels and furniture that you're allowed to send. We don't carry cash, weapons, illegal items, prescription medicines, or alcohol for anyone under 18."],
    ["Cancellations and refunds", "You can cancel free of charge until the courier collects the item. Card payments are refunded in full."],
    ["Business plans", "Plans renew monthly until you cancel. Cancelling stops the next renewal; your allowance stays until the end of the period."],
    ["Couriers", "Couriers are independent and approved by DART after checking their identity, vehicle and documents."]
  ] : [
    ["What we collect", "Your name, email, phone number, addresses, item details and photos, payment status, messages with your courier, and delivery history. For couriers, also identity and vehicle documents and payout details."],
    ["Why", "To arrange and complete deliveries, take payment, issue invoices, provide support, and keep the service safe."],
    ["Who sees it", "Your courier sees what they need for your delivery. DART support can see messages only when a problem is reported. We use payment and hosting providers who process data for us."],
    ["How long we keep it", "As long as your account is open, and invoices for as long as Italian tax law requires."],
    ["Your rights", "Under GDPR you can ask to see, correct, export or delete your data" + (st.supportEmail ? ". Write to " + esc(st.supportEmail) + "." : ", using the contact form on the Help page.")]
  ];
  return pageHead(terms ? "Terms" : "Privacy", terms ? "Terms and conditions" : "Privacy policy", "Draft for the test build. Replace with text reviewed by a lawyer before launch.") +
    '<section class="ws-sec"><div class="ws-wrap ws-legal-body">' + body.map(function (b) { return "<h3>" + b[0] + "</h3><p>" + b[1] + "</p>"; }).join("") + "</div></section>";
}
