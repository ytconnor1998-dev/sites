// ===== DART public website (the #web view): marketing pages around the working booking flow =====
S.c.hq = { from: "", to: "", type: "parcel" };
S.c.contact = { name: "", email: "", topic: "question", text: "", sent: false };
var SITE_VIEWS = ["site-home", "site-how", "site-pricing", "site-business", "site-couriers", "site-help", "site-terms", "site-privacy"];
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
    '<div class="ws-right"><button class="ws-link ws-hide-m" data-act="c-go" data-v="track">Track</button>' +
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
    '<div><h4>Work with DART</h4><button data-act="w-page" data-v="site-business">Business plans</button><button data-act="w-page" data-v="site-couriers">Become a courier</button><a href="#courier">Courier app</a></div>' +
    '<div><h4>Help</h4><button data-act="w-page" data-v="site-help">Help and contact</button><button data-act="w-page" data-v="site-terms">Terms and conditions</button><button data-act="w-page" data-v="site-privacy">Privacy policy</button>' + (st.supportEmail ? "<span>" + esc(st.supportEmail) + "</span>" : "") + "</div></div>" +
    '<div class="ws-word" aria-hidden="true">DART</div><div class="ws-legal"><span>© ' + new Date().getFullYear() + " " + esc(st.company || "DART") + (st.companyVat ? " · P.IVA " + esc(st.companyVat) : "") + (st.companyAddress ? " · " + esc(st.companyAddress) : "") + '</span><span>Test build · ' + (Store.mode === "live" ? "live data" : "this browser only") + "</span></div></div></footer>";
}
function sitePage(v, acc) {
  switch (v) {
    case "site-how": return siteHow();
    case "site-pricing": return sitePricing();
    case "site-business": return siteBusiness(acc);
    case "site-couriers": return siteCouriers();
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
    '<button class="ws-btn" data-act="w-hq-book">Book now</button></div><p class="ws-q-note">Based on a typical ' + TYPICAL[hq.type].label.toLowerCase().replace(" and documents", "").replace(" and heavy", " item") + ". Your exact price comes from your addresses and measurements.</p></div>";
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
  h += '<section class="ws-band lilac"><div class="ws-wrap ws-split"><div class="ws-split-l"><h2 class="ws-h2">Deliver with DART</h2><a class="ws-btn dark" href="#courier">Apply in the courier app</a></div><div class="ws-courier"><p>Couriers keep ' + num(P.courierShare, 75) + "% of each delivery price" + (arm ? ". On the armchair above, that's " + eur(arm.q.total * num(P.courierShare, 75) / 100) + "." : ".") + " You choose when you're online, see the pickup, destination and pay before accepting, and are paid weekly by bank transfer.</p>" +
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

// ---------- Couriers ----------
function siteCouriers() {
  var P = pricing(), vs = rules().vehicles.filter(function (v) { return v.active !== false; });
  var h = pageHead("Couriers", "Deliver with DART", "Use your own bicycle, scooter, motorbike, car or van, and choose when you work.");
  h += '<section class="ws-sec"><div class="ws-wrap ws-two"><div><h2 class="ws-h2">How it works for couriers</h2><ol class="ws-how">' + step("Apply", "Add your details, your vehicle and its loading space, photos of your documents, and your IBAN.") + step("Get approved", "DART checks your documents and vehicle before your first job.") + step("Go online", "Requests that fit your vehicle appear, nearest first, with the pay shown before you accept.") + step("Get paid", "You keep " + num(P.courierShare, 75) + "% of each delivery price, paid weekly by bank transfer.") + '</ol><a class="ws-btn dark" href="#courier">Apply in the courier app</a></div>' +
    '<div><h2 class="ws-h2">Documents</h2><p class="ws-p">ID card or passport for everyone. For motor vehicles, also your driving licence, insurance and vehicle registration (libretto).</p></div></div></section>';
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">Vehicles</h2><p class="ws-p">Typical loading space for each type. You enter your own vehicle\'s measurements when you apply.</p><div class="tbl ws-tbl"><table><thead><tr><th>Vehicle</th><th>Loading space</th><th>Up to</th></tr></thead><tbody>' + vs.map(function (v) { return "<tr><td><b>" + esc(v.label) + "</b></td><td>" + v.l + " × " + v.w + " × " + v.h + " cm</td><td>" + v.kg + " kg</td></tr>"; }).join("") + "</tbody></table></div></div></section>";
  return h;
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
