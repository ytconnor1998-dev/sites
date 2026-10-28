// ===== DART public website (the #web view): marketing pages around the working booking flow =====
S.c.hq = { from: "", to: "", type: "parcel", pickup: { street: "", area: "" }, dropoff: { street: "", area: "" } };
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
    '<button class="ws-cta" data-act="w-book"><span class="cta-l">Book a delivery</span><span class="cta-s">Book</span></button><button class="ws-burger" data-act="w-nav" aria-label="Menu" aria-expanded="' + !!open + '"><i></i><i></i><i></i></button></div></div>' +
    (acc && !isSite ? '<div class="ws-sub"><div class="ws-wrap">' + accNav + "</div></div>" : "") + "</header>";
  h += isSite ? "<main>" + body + "</main>" : '<main class="w-wrap w-main">' + body + "</main>";
  return h + siteFooter() + "</div>";
}
function siteFooter() {
  var st = settings();
  return '<footer class="ws-foot"><div class="ws-wrap"><div class="ws-foot-top"><div><span class="ws-logo light"><svg><use href="#mark"/></svg>DART</span><p>Delivered within ' + hoursText() + ' inside Rome’s GRA, from envelopes to wardrobes.</p></div>' +
    '<nav aria-label="Footer"><button data-act="w-book">Book a delivery</button><button data-act="c-go" data-v="track">Track a delivery</button><button data-act="w-page" data-v="site-pricing">Pricing</button><button data-act="w-page" data-v="site-business">Business</button><button data-act="w-page" data-v="site-couriers">Become a courier</button><button data-act="w-page" data-v="site-help">Help and contact</button><button data-act="w-page" data-v="site-terms">Terms and conditions</button><button data-act="w-page" data-v="site-privacy">Privacy policy</button></nav></div>' +
    '<div class="ws-legal"><span>© ' + new Date().getFullYear() + " " + esc(st.company || "DART") + (st.companyVat ? " · P.IVA " + esc(st.companyVat) : "") + (st.companyAddress ? " · " + esc(st.companyAddress) : "") + (st.supportEmail ? " · " + esc(st.supportEmail) : "") + '</span><span>Test build · ' + (Store.mode === "live" ? "live data" : "this browser only") + "</span></div></div></footer>";
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
  // The app's home screen collects full addresses; carry them over.
  ["pickup", "dropoff"].forEach(function (k) { var a = hq[k]; if (a && a.street) { dr[k].street = a.street; dr[k].area = a.area; dr[k].ll = a.ll || null; dr[k].pinStreet = a.pinStreet; dr[k].areaManual = a.areaManual; } });
  S.c.draft = dr; S.c.view = "new"; S.c.navOpen = false; render(); window.scrollTo(0, 0);
  if (!(dr.pickup.street && dr.dropoff.street)) toast(dr.pickup.area && dr.dropoff.area ? "Add the street addresses to continue." : "Start with where it's going.");
};

// ---------- Shared pieces ----------
var EXAMPLES = [
  { what: "A signed contract", from: "Prati", to: "EUR", item: { type: "document", l: 32, w: 24, h: 1, kg: 0.2, qty: 1, options: {} } },
  { what: "A shop order", from: "Monti", to: "Parioli", item: { type: "parcel", l: 35, w: 25, h: 15, kg: 2, qty: 1, options: {} } },
  { what: "Six moving boxes", from: "Termini", to: "Monteverde", item: { type: "parcel", l: 60, w: 40, h: 40, kg: 12, qty: 6, options: {} } },
  { what: "An armchair from Porta Portese, fourth floor without a lift", from: "Trastevere", to: "Pigneto", item: { type: "furniture", l: 95, w: 85, h: 90, kg: 22, qty: 1, options: { stairs: true } } },
  { what: "A wardrobe, taken apart", from: "San Giovanni", to: "Ostiense", item: { type: "furniture", l: 200, w: 60, h: 45, kg: 65, qty: 1, options: {} } }
];
function examplePrice(e) { var cls = classify(e.item); if (!cls.ok) return null; return { cls: cls, q: quote(e.from, e.to, e.item, cls, null) }; }
// A dashed delivery route sweeping across the hero, ending in the DART arrow.
function heroRoute() {
  return '<svg class="ws-hero-route" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 560 C 220 520, 260 360, 520 380 S 860 300, 940 170 S 1120 60, 1230 40" fill="none" stroke="var(--lilac)" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
}
function heroQuote() {
  var hq = S.c.hq, x = hq.from && hq.to ? typicalQuote(hq.type, hq.from, hq.to) : null;
  // The visible word sizes the blank; the real select sits invisibly on top of it.
  var pick = function (path, val, opts, label) {
    var cur = opts.filter(function (o) { return (Array.isArray(o) ? o[0] : o) === val; })[0] || opts[0], txt = Array.isArray(cur) ? cur[1] : cur;
    return '<span class="ws-say-sel"><span class="ws-say-w" aria-hidden="true">' + esc(txt) + "</span>" + sel(path, val, opts, 'data-live="1" aria-label="' + label + '"') + "</span>";
  };
  return '<form class="ws-say" data-form="w-quote"><p class="ws-say-line"><span>Send</span> ' + pick("c.hq.type", hq.type, [["letter", "a letter or documents"], ["parcel", "a parcel up to 40 cm"], ["large", "something large or heavy"], ["furniture", "a piece of furniture"]], "What is it?") +
    " <span>from</span> " + pick("c.hq.from", hq.from, [["", "pickup area"]].concat(AREA_NAMES), "From") + " <span>to</span> " + pick("c.hq.to", hq.to, [["", "delivery area"]].concat(AREA_NAMES), "To") + '<span>.</span></p>' +
    '<div class="ws-say-out">' + (x ? '<b class="ws-q-price">' + eur(x.q.total) + '</b><span class="ws-q-meta">' + x.q.km.toFixed(1) + " km · " + x.q.mins + " min</span>" : '<span class="ws-q-meta">Choose two areas to see the price</span>') + '<button class="ws-btn">Book now</button></div></form>';
}
FORMS["w-quote"] = function () { ACT["w-hq-book"](); };
// A measuring tape per size category, each as long as the longest side it allows.
function sizeTape() {
  var cats = rules().categories.filter(function (c) { return c.active !== false; }).sort(function (a, b) { return a.l - b.l; });
  var max = Math.ceil(Math.max.apply(null, cats.map(function (c) { return num(c.l, 0); }).concat([100])) / 50) * 50;
  var W = 1000, x0 = 4, sc = (W - 8) / max, row = 52, top = 34, H = top + cats.length * row + 4, f = ' font-family="Schibsted Grotesk, Arial, sans-serif"';
  var s = '<div class="ws-tape-wrap"><svg class="ws-tape" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Longest side allowed in each size category">';
  for (var cm = 0; cm <= max; cm += 50) { var gx = x0 + cm * sc; s += '<line x1="' + gx + '" y1="' + (top - 6) + '" x2="' + gx + '" y2="' + H + '" stroke="var(--line)" stroke-width="1"/><text x="' + gx + '" y="' + (top - 12) + '" text-anchor="' + (cm === 0 ? "start" : cm === max ? "end" : "middle") + '" font-size="18" fill="var(--muted)"' + f + ">" + cm + (cm === max ? " cm" : "") + "</text>"; }
  cats.forEach(function (c, i) {
    var y = top + i * row + 6, w = Math.max(num(c.l, 0) * sc, 6), end = x0 + w, right = end > W - 330, lw = (c.label.length + String(c.l).length + String(c.kg).length + 11) * 11.5;
    s += '<rect x="' + x0 + '" y="' + y + '" width="' + w + '" height="32" rx="2" fill="var(--lilac)"/>';
    for (var t = 10; t < num(c.l, 0); t += 10) if (!right || x0 + t * sc < end - lw - 16) s += '<line x1="' + (x0 + t * sc) + '" y1="' + y + '" x2="' + (x0 + t * sc) + '" y2="' + (y + (t % 50 ? 8 : 14)) + '" stroke="var(--on-lilac)" stroke-width="1"/>';
    s += '<text x="' + (right ? end - 10 : end + 10) + '" y="' + (y + 23) + '" text-anchor="' + (right ? "end" : "start") + '" font-size="21"' + f + ' fill="' + (right ? "var(--on-lilac)" : "var(--ink)") + '"><tspan font-weight="800">' + esc(c.label) + '</tspan><tspan fill="' + (right ? "var(--on-lilac)" : "var(--muted)") + '"> · ' + c.l + " cm, " + c.kg + " kg</tspan></text>";
  });
  return s + "</svg></div>";
}
function pageHead(kicker, title, lead) { return '<section class="ws-page-h"><div class="ws-wrap"><p class="ws-kicker">' + kicker + "</p><h1>" + title + "</h1>" + (lead ? '<p class="ws-lead">' + lead + "</p>" : "") + "</div></section>"; }
function step(t, b) { return "<li><b>" + t + "</b> " + b + "</li>"; }
function sec(title, body, id) { return '<section class="ws-s"' + (id ? ' id="' + id + '"' : "") + "><h2>" + title + "</h2>" + body + "</section>"; }
function who(word, lead, body) { return '<div class="ws-who-row"><span class="ws-who-w" aria-hidden="true">' + word + "</span><p><b>" + lead + "</b> " + body + "</p></div>"; }
// Example routes drawn as lines, each as long as its distance.
function routeLines(rows) {
  rows = rows.filter(Boolean); var max = Math.max.apply(null, rows.map(function (r) { return r.km; }).concat([1]));
  return '<ul class="ws-routes">' + rows.map(function (r) {
    return '<li><span class="ws-r-top"><span class="ws-c-what">' + r.what + '</span><b class="ws-c-amt">' + eur(r.price) + '</b></span><span class="ws-r"><span class="ws-r-a">' + esc(r.from) + '</span><span class="ws-r-line" style="--w:' + Math.max(12, Math.round(r.km / max * 100)) + '%"><i></i><em>' + r.km.toFixed(1) + ' km</em></span><span class="ws-r-b">' + esc(r.to) + "</span></span></li>";
  }).join("") + "</ul>";
}
function costLine(what, from, to, price, extra) { return '<li><span class="ws-c-what">' + what + '</span> <span class="ws-c-route">' + esc(from) + " → " + esc(to) + (extra ? " · " + extra : "") + '</span> <b class="ws-c-amt">' + eur(price) + "</b></li>"; }

// ---------- Home ----------
function siteHome(acc) {
  var P = pricing(), plans = S.plans.filter(function (p) { return p.active !== false; }).sort(function (a, b) { return a.price - b.price; });
  var h = '<section class="ws-hero">' + heroRoute() + '<div class="ws-wrap"><h1>Get it across Rome.</h1>' + heroQuote() +
    '<p class="ws-hero-facts"><span>Minimum</span> <b>' + eur(P.minFee) + '</b><span>, then</span> <b>' + eur(P.perKm) + '</b> <span>a kilometre. VAT included. Book with a free DART account.</span></p></div></section>';
  h += '<div class="ws-wrap ws-read">';
  h += sec("Why DART exists", '<p class="ws-intro">Sometimes you need to get something across Rome, but you don\'t have a car, the time, or an easy way to do it.</p>' +
    "<p>That's the problem DART was started to solve. We're building a local delivery network for the city, for people and for businesses. Tell us what it is and where it's going, and a nearby courier with the right vehicle delivers it within " + hoursText() + ", often much sooner, whether it's a second-hand find, a shop purchase, or documents for another office.</p>" +
    "<p>No contract, just a free account, and you see the full price before you book.</p>");
  h += sec("Who uses DART", '<div class="ws-who">' +
    who("Boxes.", "People who just moved to Rome.", "New flat, no car, and boxes or a mattress to get home. Book a car or a van and it's done.") +
    who("Armchair.", "Anyone who found a deal across town.", "The chair on Facebook Marketplace is perfect, but the seller is in EUR and you're in Prati. We collect it and carry it in.") +
    who("Contracts.", "Shops, offices and studios.", "Contracts, stock, supplies and samples between offices, shops and clients, paid per delivery or on a monthly plan.") + "</div>");
  h += '<p class="ws-pull">If it fits in a van, we can take it.</p>';
  h += sec("What things cost", '<p>Real routes, priced with today\'s rates. Distance sets the base; size, weight, the vehicle and extras like stairs are added.</p>' + routeLines(EXAMPLES.map(function (e) { var x = examplePrice(e); return x ? { what: e.what, from: e.from, to: e.to, km: x.q.km, price: x.q.total } : null; })) +
    '<p><button class="ws-more" data-act="w-page" data-v="site-pricing">How the price is worked out →</button></p>');
  h += sec("How big can it be?", "<p>Every item goes in the smallest category it fits. These are the longest sides each one allows.</p>" + sizeTape());
  h += sec("What happens after you book", '<ol class="ws-steps">' +
    step("Addresses and access.", "Add the buzzer name and the floor. Plenty of palazzi in the centre have no lift: tick “Stairs, no lift” and the courier arrives ready for it.") +
    step("Photo and size.", "Measure the longest side, the width and the height. If you only have a photo, DART can suggest the size and you check it.") +
    step("The right vehicle.", "DART picks the smallest vehicle the item fits in: a bicycle for an envelope, a van for a wardrobe.") +
    step("Tracking and proof.", "You get an update at pickup, on the way and at the door, with a photo of where it was left and the invoice straight after.") +
    '</ol><p><button class="ws-btn" data-act="w-book">Book a delivery</button></p>');
  h += sec("For businesses", "<p>Use your normal DART account. Switch it to business in Settings, add your Partita IVA and SDI code, and choose a monthly plan or keep paying per delivery.</p>" +
    (plans.length ? '<ul class="ws-plain">' + plans.map(planLine).join("") + "</ul>" : "") + '<p><button class="ws-more" data-act="w-page" data-v="site-business">Business details →</button></p>');
  h += sec("Where we deliver", "<p>Anywhere inside the Grande Raccordo Anulare. These are the areas you can choose when booking:</p><p class=\"ws-arealist\">" + AREA_NAMES.join(", ") + ".</p>");
  h += sec("Questions", '<div class="ws-faq">' + FAQ.slice(0, 4).map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + '</div><p><button class="ws-more" data-act="w-page" data-v="site-help">More answers and contact →</button></p>');
  h += "</div>";
  // Closing band that sends would-be couriers to the courier page.
  h += '<section class="ws-join"><div class="ws-wrap"><p class="ws-kicker">Become a courier</p><h2>Got a bike, a scooter or a van?</h2><p>Deliver across Rome on your own hours. Find out how it works, what you earn and what you need.</p>' +
    '<button class="ws-btn" data-act="w-page" data-v="site-couriers">Become a courier</button></div></section>';
  return h;
}
function planLine(p) { return '<li><b>' + esc(p.name) + "</b>: <span>" + eur(p.price) + "</span> <span>a month for</span> <span>" + p.allowance + "</span> <span>deliveries</span>. <span>Extra deliveries</span> <span>" + eur(p.overageFee) + "</span> <span>each.</span></li>"; }

// ---------- How it works ----------
function siteHow() {
  return pageHead("How it works", "What happens when you book", "DART matches your item to a courier whose vehicle can carry it. This is the whole process, start to finish.") +
    '<div class="ws-wrap ws-read">' + sec("Step by step", '<ol class="ws-steps">' +
    step("Add the addresses.", "Choose the area and street for pickup and delivery. Add instructions like the buzzer name, the floor, or the seller's name if you're collecting something you bought.") +
    step("Describe the item.", "Choose letter, parcel, furniture or something else. Add up to three photos and the length, width, height and weight if you know it.") +
    step("DART checks it fits.", "We find the item's size category, the vehicles that can carry it, and whether it needs two people. If nothing can carry it, you're told before paying.") +
    step("See the full price.", "A distance charge, the size category fee, any weight or extra-item charges, the vehicle, and the extras you ticked. Every line is shown.") +
    step("Book.", "Log in or create a free account, then pay by card. Businesses on a plan use their monthly allowance.") +
    step("A courier accepts.", "Nearby couriers with a suitable vehicle see the request. When one accepts, you see their name and vehicle and can message them.") +
    step("It arrives on time.", "As soon as possible means within " + hoursText() + " of booking, usually much sooner. Or choose a set time and it arrives by then.") +
    step("Follow it.", "Travelling to pickup, collected, in transit, arrived. You get a notification at each step.") +
    step("Delivered.", "The courier records who received it and adds a photo. Your invoice is ready straight away.") +
    '</ol><p><button class="ws-btn" data-act="w-book">Book a delivery</button></p>') + "</div>";
}

// ---------- Pricing ----------
function sitePricing() {
  var P = pricing();
  var extras = OPTIONS.map(function (o) { return "<li><span>" + o.label + "</span> <b>" + (num(P.options[o.id], 0) ? "+" : "") + (num(P.options[o.id], 0) ? eur(P.options[o.id]) : "free") + "</b></li>"; }).join("") +
    "<li><span>Each extra item in the same delivery</span> <b>+" + eur(P.extraItemFee) + "</b></li><li><span>Second courier, when needed</span> <b>+" + eur(P.secondCourierFee) + "</b></li>";
  return pageHead("Pricing", "What a delivery costs", "Every delivery has a distance charge with a minimum fee. Size, weight and extras are added on top, and you see each line before you book.") +
    '<div class="ws-wrap ws-read">' +
    sec("The base", '<p class="ws-big"><span>Minimum</span> <b>' + eur(P.minFee) + '</b><span>, then</span> <b>' + eur(P.perKm) + '</b> <span>for every kilometre.</span></p><p>Short trips are charged as at least ' + P.minKm + " km. Prices include " + P.vatRate + "% VAT.</p>") +
    sec("Size", "<p>Your item goes in the smallest category it fits, by its three dimensions and its weight. Larger categories add a fee and need a bigger vehicle.</p>" + sizeTape() +
      '<ul class="ws-plain">' + rules().categories.filter(function (c) { return c.active !== false; }).map(function (c) { return "<li><b>" + esc(c.label) + "</b>: <span>" + c.l + " × " + c.w + " × " + c.h + " cm, " + c.kg + " kg</span>" + (num(c.fee, 0) ? " <span>· +" + eur(c.fee) + "</span>" : "") + "</li>"; }).join("") + "</ul>") +
    sec("Weight and extras", "<p>Anything over " + P.weightFrom + " kg adds " + eur(P.perKgOver) + " per kg.</p><ul class=\"ws-plain\">" + extras + "</ul>") +
    sec("Try a route", heroQuote()) + "</div>";
}

// ---------- Business ----------
function siteBusiness(acc) {
  var plans = S.plans.filter(function (p) { return p.active !== false; }).sort(function (a, b) { return a.price - b.price; });
  var cta = acc ? '<button class="ws-btn" data-act="c-go" data-v="business">Switch my account to business</button>' : '<button class="ws-btn" data-act="c-auth-open" data-v="register">Create an account</button>';
  return pageHead("Business", "DART for shops, offices and studios", "Send documents, stock and supplies across Rome from the account you already use. There's no separate business app.") +
    '<div class="ws-wrap ws-read">' +
    sec("Getting started", '<ol class="ws-steps">' + step("Create a DART account.", "Or log in to the one you have.") + step("Switch to business.", "In Settings, add your business name, address, Partita IVA and SDI code. Your invoices show them from then on.") + step("Choose a plan, or don't.", "A plan gives you a set number of deliveries each month for one price. Without one, you pay per delivery.") + step("Send.", "Book deliveries one at a time, or, on plans that include it, upload a CSV or Excel file and book every row at once.") + "</ol><p>" + cta + "</p>") +
    sec("Plans", plans.length ? '<ul class="ws-plain">' + plans.map(function (p) { return planLine(p).replace("</li>", ' <span class="ws-note">' + "Covers" + " " + esc((p.categories || []).map(cLabel).join(", ")) + (p.bulk ? " · " + "bulk upload" : "") + "</span></li>"); }).join("") + "</ul><p>Categories a plan doesn't cover, such as furniture, are charged at the normal price. The app shows this before you confirm.</p>" : "<p>Plans will be listed here. You can already use DART as a business and pay per delivery.</p>") + "</div>";
}

// ---------- Couriers: information ----------
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
function eurWhole(n) { var t = Math.round(n).toLocaleString(locale(), { maximumFractionDigits: 0 }); return lang() === "it" ? t + " €" : "€" + t; }
// A month of work per vehicle, from the typical jobs that vehicle can carry.
var MONTH_PLAN = [["scooter", 12], ["car", 8], ["van", 6]];
function monthLines(share) {
  var vs = rules().vehicles, order = vs.map(function (v) { return v.id; });
  return '<ul class="ws-costs">' + MONTH_PLAN.map(function (m) {
    var v = vehicle(m[0]); if (!v || v.active === false) return "";
    var upto = order.indexOf(m[0]), pays = Object.keys(COURIER_JOBS).filter(function (k) { return order.indexOf(k) >= 0 && order.indexOf(k) <= upto; }).map(function (k) {
      var j = COURIER_JOBS[k], cls = classify(j.item); if (!cls.ok) return null; return quote(j.from, j.to, j.item, Object.assign({}, cls, { minVehicle: m[0] }), null).total * share / 100;
    }).filter(function (x) { return x != null; });
    if (!pays.length) return "";
    var avg = pays.reduce(function (a, b) { return a + b; }, 0) / pays.length, month = Math.round(avg * m[1] * 22 / 10) * 10;
    return '<li><span class="ws-c-what">' + esc(v.label) + '</span> <span class="ws-c-route">' + m[1] + " deliveries a day · about " + eur(avg) + ' each</span> <b class="ws-c-amt">' + eurWhole(month) + " a month</b></li>";
  }).join("") + "</ul>";
}
function siteCouriers() {
  var P = pricing(), R = rules(), share = num(P.courierShare, 75), vs = R.vehicles.filter(function (v) { return v.active !== false; });
  var pay = routeLines(vs.map(function (v) {
    var j = COURIER_JOBS[v.id]; if (!j) return null;
    var cls = classify(j.item); if (!cls.ok) return null;
    var q = quote(j.from, j.to, j.item, Object.assign({}, cls, { minVehicle: v.id }), null);
    return { what: esc(v.label) + " · " + j.what, from: j.from, to: j.to, km: q.km, price: q.total * share / 100 };
  }));
  return pageHead("Couriers", "Deliver with DART", "Use your own bicycle, scooter, motorbike, car or van to deliver across Rome. You choose when you work, and you only get jobs your vehicle can carry.") +
    '<div class="ws-wrap ws-read"><div class="ws-stat"><b>' + share + '%</b><p><span>of every delivery price is yours, paid every Monday.</span></p></div>' +
    '<p><b>Better paid than food delivery.</b> On apps like Glovo and Deliveroo you carry one meal for a few euros. At DART you carry parcels, boxes and furniture, which pay more per job, and you keep ' + share + '% of the price. Nearby jobs are added to your route, so you earn more per hour on the road.</p><p><button class="ws-btn" data-act="w-page" data-v="site-courier-apply">Apply to deliver</button></p>' +
    sec("What you earn", "<p>Each job shows its pay before you accept. Here's what a typical job pays on each vehicle, with today's prices.</p>" + pay + "<p>Bigger vehicles also see smaller jobs. Furniture and heavy items pay more, and some need two people.</p>") +
    sec("An example month", "<p>What a month can look like at today's prices, working 22 days. Bigger vehicles also take smaller jobs, so their example mixes both.</p>" + monthLines(share) +
      '<p class="ws-note">Before tax and your own vehicle costs. What you actually earn depends on how many hours you work and how busy DART is.</p>') +
    sec("From application to first job", '<ol class="ws-steps">' +
      step("Apply online.", "Your name, phone and address, your vehicle with its loading space and weight limit, photos of your documents, and the IBAN you want to be paid to. It takes about ten minutes.") +
      step("We check your documents.", "DART reviews your identity and, for motor vehicles, your licence, insurance and libretto. You'll get a notification when you're approved, or a note telling you what to fix.") +
      step("Go online in the courier app.", "Switch to online and set the area you're in. Requests that fit your vehicle appear, nearest first.") +
      step("Take a job.", "You see the pickup, the destination, the item with its size, weight and photos, any extras like stairs, and what you'll earn. Accept or decline.") +
      step("Deliver.", "Navigate with Google Maps, update each step, message the customer if you need to, and finish with a photo and the name of who received it.") +
      step("Get paid.", "Completed jobs show as pending in Earnings and are paid every Monday by bank transfer.") + "</ol>") +
    sec("What you need", "<p>On a bicycle, an ID card or passport. For anything with a motor, also a driving licence, insurance and the vehicle's libretto.</p><p>You also need a smartphone with mobile data, an Italian or EU bank account for payouts, your own insurance for motor vehicles, and to be 18 or over.</p>") +
    sec("Courier questions", '<div class="ws-faq">' + [
      ["Do I have to work set hours?", "No. You go online when you want to take jobs and offline when you don't. There are no shifts."],
      ["Why don't I see every request?", "DART only shows you items that fit your registered vehicle's loading space and weight limit. Bigger vehicles see smaller jobs too."],
      ["Can I change my vehicle later?", "Yes. Send the new vehicle from the courier app. DART approves it, and you keep getting jobs for your current vehicle until then."],
      ["What if something goes wrong on a job?", "Use Report a problem on the delivery. DART support sees it straight away, and the customer is told there's an issue."],
      ["How am I paid and taxed?", "Earnings are paid every Monday to your IBAN. You work as an independent courier and are responsible for your own tax position. We'll confirm the contract terms with you before your first job."],
      ["Can I give a job back?", "Yes, before you collect the item. It goes back to other couriers. Doing it often may affect your account."]
    ].map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + "</div>") +
    sec("Ready to apply?", '<p>The application takes about ten minutes. Have your documents and IBAN to hand.</p><p><button class="ws-btn" data-act="w-page" data-v="site-courier-apply">Apply to deliver</button></p><p>Already applied? Open the <a href="#courier">courier app</a> and log in with your email.</p>') + "</div>";
}

// ---------- Couriers: apply on the website ----------
function siteCourierApply() {
  var c = myCourier();
  var h = pageHead("Apply", "Apply to deliver with DART", "");
  if (c) {
    var st = { pending: ["We're checking your application", "You'll get a notification in the courier app when you're approved, or a note telling you what to fix."], approved: ["You're approved", "Open the courier app, go online and start taking jobs."], rejected: ["Your application wasn't approved", c.decisionNote || "Contact DART support to find out why."], suspended: ["Your account is paused", c.decisionNote || "Contact DART support."] }[c.status] || ["Application received", ""];
    return h + '<div class="ws-wrap ws-read">' + sec(st[0], "<p>" + esc(st[1]) + '</p><p class="ws-note"><b>' + esc(c.name) + "</b> · " + esc(c.email) + " · " + esc(vLabel(c.vehicle.type)) + (c.vehicle.plate ? " · " + esc(c.vehicle.plate) : "") + '</p><p><a class="ws-btn" href="#courier">Open the courier app</a></p>') + "</div>";
  }
  var r = S.d.reg = S.d.reg || newReg(), steps = ["About you", "Your vehicle", "Documents", "Payouts"];
  var form = "";
  if (r.step === 1) form = '<form class="stack" data-form="d-reg-1">' + '<div class="grid2">' + field("Full name", inp("d.reg.name", r.name, 'autocomplete="name" required')) + field("Email", inp("d.reg.email", r.email, 'type="email" autocomplete="email" required')) + "</div>" + '<div class="grid2">' + field("Phone", inp("d.reg.phone", r.phone, 'type="tel" autocomplete="tel" required')) + field("Password", '<input class="input" type="password" data-bind="d.reg.pw" autocomplete="new-password">', LIVE ? "At least 8 characters. You'll use it to log in to the courier app." : "Test build: not stored.") + "</div>" + field("Home address", inp("d.reg.address", r.address, 'autocomplete="street-address" required placeholder="Street, number, CAP"')) + '<button class="btn">Next: your vehicle</button></form>';
  if (r.step === 2) form = vehicleForm("d.reg.vehicle", r.vehicle) + '<div class="row"><button class="btn ghost" data-act="d-reg-step" data-v="1">Back</button><button class="btn" data-act="d-reg-step" data-v="3">Next: documents</button></div>';
  if (r.step === 3) form = docsForm(r.vehicle.type, r.docs, "reg") + '<div class="row"><button class="btn ghost" data-act="d-reg-step" data-v="2">Back</button><button class="btn" data-act="d-reg-step" data-v="4"' + (docsFor(r.vehicle.type).every(function (k) { return r.docs[k]; }) ? "" : " disabled") + ">Next: payouts</button></div>";
  if (r.step === 4) form = '<form class="stack" data-form="d-reg-4"><div class="card"><b>Where should we pay you?</b><span class="muted">Earnings are paid every Monday by bank transfer.</span>' + field("Account holder", inp("d.reg.holder", r.holder || r.name, "required")) + field("IBAN", inp("d.reg.iban", r.iban, 'required placeholder="IT60 X054 2811 1010 0000 0123 456"')) + '</div><div class="row"><button type="button" class="btn ghost" data-act="d-reg-step" data-v="3">Back</button><button class="btn">Send my application</button></div></form>';
  return h + '<div class="ws-wrap ws-read"><p class="ws-progress">' + steps.map(function (t, i) { return '<span class="' + (r.step === i + 1 ? "on" : r.step > i + 1 ? "done" : "") + '">' + (i + 1) + ". " + t + "</span>"; }).join("") + "</p>" +
    '<div class="stack ws-apply">' + form + '</div><p class="ws-note">Want the details first? Read <button class="ws-more" data-act="w-page" data-v="site-couriers">what being a DART courier involves</button>.</p></div>';
}

// ---------- Help and contact ----------
function siteHelp(acc) {
  var c = S.c.contact;
  var h = pageHead("Help", "Help and contact", settings().supportEmail ? "Write to " + esc(settings().supportEmail) + " or use the form below." : "Use the form below and we'll reply by email.");
  h += '<div class="ws-wrap ws-read">' + sec("Already booked?", '<p>Track it with your code and the email you booked with. From the delivery page you can message your courier or report a problem.</p><p><button class="ws-more" data-act="c-go" data-v="track">Track a delivery →</button></p>') +
    sec("Common questions", '<div class="ws-faq">' + FAQ.concat([["Do I need an account?", "Yes, a free one. It takes a minute: your name, email and a password. It keeps your deliveries, tracking, saved addresses and invoices together, and businesses can add a plan."], ["Where can I find my tracking code?", "On the confirmation screen after booking. Use it with your email under Track a delivery."]]).map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + "</div>") +
    sec("Write to us", c.sent ? "<p><b>Thanks, we've got your message.</b> DART support will reply by email.</p>" :
      '<form class="stack ws-form" data-form="w-contact">' + (acc ? "" : '<div class="grid2">' + field("Name", inp("c.contact.name", c.name, "required")) + field("Email", inp("c.contact.email", c.email, 'type="email" required')) + "</div>") +
      field("About", sel("c.contact.topic", c.topic, [["question", "A question"], ["delivery", "A delivery"], ["business", "Business plans"], ["courier", "Becoming a courier"], ["other", "Something else"]])) + field("Message", txt("c.contact.text", c.text, 'rows="5" required')) + '<button class="ws-btn">Send message</button></form>') + "</div>";
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
    ["Couriers", "Couriers are independent and approved by DART after checking their identity, vehicle and documents."],
    ["Delivery times and late fees for couriers", "Every delivery shows a deliver-by time before the courier accepts it. If a delivery arrives after that time, DART reviews it and may deduct a late fee from the courier's pay for that delivery, usually a small percentage of it. Any fee is shown on the delivery in the courier's earnings before payout. Delays caused by the customer or by DART are not charged."]
  ] : [
    ["What we collect", "Your name, email, phone number, addresses, item details and photos, payment status, messages with your courier, and delivery history. For couriers, also identity and vehicle documents and payout details."],
    ["Why", "To arrange and complete deliveries, take payment, issue invoices, provide support, and keep the service safe."],
    ["Who sees it", "Your courier sees what they need for your delivery. DART support can see messages only when a problem is reported. We use payment and hosting providers who process data for us."],
    ["How long we keep it", "As long as your account is open, and invoices for as long as Italian tax law requires."],
    ["Your rights", "Under GDPR you can ask to see, correct, export or delete your data" + (st.supportEmail ? ". Write to " + esc(st.supportEmail) + "." : ", using the contact form on the Help page.")]
  ];
  return pageHead(terms ? "Terms" : "Privacy", terms ? "Terms and conditions" : "Privacy policy", "Draft for the test build. Replace with text reviewed by a lawyer before launch.") +
    '<div class="ws-wrap ws-read ws-legal-body">' + body.map(function (b) { return "<h3>" + b[0] + "</h3><p>" + b[1] + "</p>"; }).join("") + "</div>";
}
