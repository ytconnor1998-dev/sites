// ===== DART public website (the #web view): marketing pages around the working booking flow =====
S.c.hq = { from: "", to: "", type: "parcel" };
S.c.contact = { name: "", email: "", topic: "question", text: "", sent: false };
var SITE_VIEWS = ["site-home", "site-how", "site-pricing", "site-business", "site-couriers", "site-help", "site-terms", "site-privacy"];
GUEST_VIEWS.push.apply(GUEST_VIEWS, SITE_VIEWS);
var SITE_NAV = [["site-how", "How it works"], ["site-pricing", "Pricing"], ["site-business", "Business"], ["site-couriers", "Couriers"], ["site-help", "Help"]];
// Typical items used for "from" prices and the instant quote.
var TYPICAL = {
  letter: { label: "Letters and documents", item: { type: "document", l: 32, w: 24, h: 2, kg: 0.3, qty: 1, options: {} }, icon: "s-env" },
  parcel: { label: "Parcels", item: { type: "parcel", l: 40, w: 30, h: 25, kg: 5, qty: 1, options: {} }, icon: "s-box" },
  large: { label: "Large and heavy", item: { type: "parcel", l: 90, w: 60, h: 55, kg: 25, qty: 1, options: {} }, icon: "s-big" },
  furniture: { label: "Furniture", item: { type: "furniture", l: 180, w: 85, h: 80, kg: 35, qty: 1, options: {} }, icon: "s-sofa" }
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
  return '<footer class="ws-foot"><div class="ws-wrap"><div class="ws-foot-top"><div><span class="ws-logo light"><svg><use href="#mark"/></svg>DART</span><p>Letters, parcels and furniture across Rome. For people and for businesses.</p>' +
    '<div class="ws-stores"><span class="ws-store">App Store<small>coming soon</small></span><span class="ws-store">Google Play<small>coming soon</small></span></div></div>' +
    '<div><h4>Send</h4><button data-act="w-book">Book a delivery</button><button data-act="c-go" data-v="track">Track a delivery</button><button data-act="w-page" data-v="site-pricing">Pricing</button><button data-act="w-page" data-v="site-how">How it works</button></div>' +
    '<div><h4>Work with DART</h4><button data-act="w-page" data-v="site-business">Business plans</button><button data-act="w-page" data-v="site-couriers">Become a courier</button><a href="#courier">Courier app</a></div>' +
    '<div><h4>Help</h4><button data-act="w-page" data-v="site-help">Help and contact</button><button data-act="w-page" data-v="site-terms">Terms and conditions</button><button data-act="w-page" data-v="site-privacy">Privacy policy</button><span>' + esc(st.supportEmail) + "</span></div></div>" +
    '<div class="ws-word" aria-hidden="true">DART</div><div class="ws-legal"><span>© ' + new Date().getFullYear() + " " + esc(st.company) + " · P.IVA " + esc(st.companyVat) + " · " + esc(st.companyAddress) + '</span><span>Test build · ' + (Store.mode === "live" ? "live data" : "this browser only") + "</span></div></div></footer>";
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
function heroQuote() {
  var hq = S.c.hq, x = hq.from && hq.to ? typicalQuote(hq.type, hq.from, hq.to) : null;
  return '<div class="ws-quote"><div class="ws-q-row"><label><span>From</span>' + sel("c.hq.from", hq.from, [["", "Pickup area"]].concat(AREA_NAMES), 'data-live="1"') + "</label>" +
    '<label><span>To</span>' + sel("c.hq.to", hq.to, [["", "Delivery area"]].concat(AREA_NAMES), 'data-live="1"') + "</label></div>" +
    '<div class="ws-q-types" role="radiogroup" aria-label="What are you sending">' + Object.keys(TYPICAL).map(function (k) { var on = hq.type === k; return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? "on" : "") + '" data-act="w-hq-type" data-v="' + k + '"><svg><use href="#' + TYPICAL[k].icon + '"/></svg>' + TYPICAL[k].label.split(" and")[0] + "</button>"; }).join("") + "</div>" +
    '<div class="ws-q-out">' + (x ? '<div><span class="ws-q-price">' + eur(x.q.total) + '</span><span class="ws-q-meta">' + x.q.km.toFixed(1) + " km · " + esc(vLabel(x.cls.minVehicle)) + " · about " + x.q.mins + " min</span></div>" : '<div><span class="ws-q-price muted-l">from ' + eur(pricing().minFee) + '</span><span class="ws-q-meta">Choose two areas to see your price</span></div>') +
    '<button class="ws-btn" data-act="w-hq-book">Book now</button></div><p class="ws-q-note">Typical ' + TYPICAL[hq.type].label.toLowerCase() + " item. Your exact price comes from your measurements.</p></div>";
}
function heroPhone() {
  return '<div class="ws-phone" aria-hidden="true"><div class="ws-phone-s"><div class="ws-ph-top"><span class="logo"><svg><use href="#mark"/></svg>DART</span><span class="chip s-pur">In transit</span></div>' +
    '<div class="ws-ph-map">' + mapSVG({ labels: false, routes: [{ from: "Pigneto", to: "Trastevere", t: .55 }] }) + '</div><div class="ws-ph-card"><b>Arriving in 12 min</b><span>Sofa · Pigneto → Trastevere</span><div class="progress">' + [1, 1, 1, 1, 1, 1, 0, 0].map(function (on) { return '<i class="' + (on ? "on" : "") + '"></i>'; }).join("") + '</div><div class="person"><span class="avatar">MR</span><div><b>Marco</b><div class="muted sm">Van · two people</div></div></div></div></div></div>';
}
function siteHome(acc) {
  var P = pricing(), plans = S.plans.filter(function (p) { return p.active !== false; }).sort(function (a, b) { return a.price - b.price; });
  var h = '<section class="ws-hero"><div class="ws-wrap ws-hero-grid"><div class="ws-hero-copy"><p class="ws-kicker">Local delivery in Rome</p><h1>Get it across Rome.</h1>' +
    "<p class=\"ws-lead\">No car, no time, no idea how to get it home? DART picks up letters, parcels and furniture anywhere in the city and brings them where they need to go, today.</p>" + heroQuote() + "</div>" + heroPhone() + "</div></section>";
  h += '<div class="ws-strip"><div class="ws-wrap">' + [["s-camera", "Photo proof at the door"], ["s-receipt", "An invoice for every delivery"], ["s-pin", "Live tracking and chat"], ["s-shield", "No account needed to book"]].map(function (x) { return '<span><svg><use href="#' + x[0] + '"/></svg>' + x[1] + "</span>"; }).join("") + "</div></div>";
  h += '<section class="ws-sec"><div class="ws-wrap"><h2 class="ws-h2">Made for moments like these</h2><div class="ws-stories">' +
    story("s-keys", "You just moved to Rome", "New flat, no car, and a pile of boxes or a mattress to get home. Book a car or a van and it's sorted.", "Moving boxes from ", fromPrice("large")) +
    story("s-tag", "You found a deal across town", "That chair on Facebook Marketplace is perfect, but the seller is in EUR and you're in Prati. We collect it and carry it in.", "Furniture from ", fromPrice("furniture")) +
    story("s-brief", "Your business needs it there today", "Contracts, supplies, stock and samples between offices, shops and clients. Pay per delivery or get a monthly plan.", "Documents from ", fromPrice("letter")) + "</div></div></section>";
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">How DART works</h2><ol class="ws-steps">' +
    step("Tell us where", "Pick the pickup and delivery addresses anywhere in Rome.") + step("Show us what", "Add a photo and the measurements. DART checks it fits and picks the right vehicle.") +
    step("See your price", "Priced by distance with a " + eur(P.minFee) + " minimum, and every line shown before you pay.") + step("Track it to the door", "Follow each step, chat with your courier and get a photo when it arrives.") +
    '</ol><button class="ws-btn dark" data-act="w-book">Book a delivery</button></div></section>';
  h += '<section class="ws-sec"><div class="ws-wrap"><div class="ws-sec-h"><h2 class="ws-h2">What we move</h2><button class="ws-more" data-act="w-page" data-v="site-pricing">See all prices →</button></div><div class="ws-moves">' +
    Object.keys(TYPICAL).map(function (k) {
      var x = typicalQuote(k, "Centro Storico", "Monti"), sub = { letter: "Contracts, letters, keys, passports", parcel: "Online orders, gifts, shop purchases", large: "Moving boxes, appliances, equipment", furniture: "Chairs, tables, sofas, beds, wardrobes" }[k];
      return '<div class="ws-move"><svg><use href="#' + TYPICAL[k].icon + '"/></svg><h3>' + TYPICAL[k].label + "</h3><p>" + sub + '</p><span class="ws-from">from <b>' + (x ? eur(x.q.total) : "—") + "</b></span><small>" + (x ? esc(vLabel(x.cls.minVehicle)) + (x.cls.vehicles.length > 1 ? " or bigger" : "") : "") + "</small></div>";
    }).join("") + "</div></div></section>";
  h += '<section class="ws-band dark"><div class="ws-wrap ws-band-grid"><div><p class="ws-kicker lilac">DART for business</p><h2 class="ws-h2">Your delivery team, without hiring one.</h2><p>Use the same DART account. Switch it to business in your settings and choose a monthly plan with a set number of deliveries, or just keep paying per delivery.</p><button class="ws-btn lilac" data-act="w-page" data-v="site-business">Business plans</button></div>' +
    '<div class="ws-plans">' + (plans.length ? plans.slice(0, 3).map(function (p) { return '<div class="ws-plan"><b>' + esc(p.name) + '</b><span class="ws-plan-p">' + eur(p.price) + "<small>/month</small></span><span>" + p.allowance + " deliveries a month</span><small>" + esc(p.desc || (p.categories || []).map(cLabel).join(", ")) + "</small></div>"; }).join("") : '<div class="ws-plan"><b>Plans coming soon</b><span>Pay per delivery in the meantime.</span></div>') + "</div></div></section>";
  h += '<section class="ws-band lilac"><div class="ws-wrap ws-band-grid"><div><p class="ws-kicker">Become a courier</p><h2 class="ws-h2">Ride with DART.</h2><p>Bicycle, scooter, car or van: register it once and you only get deliveries that fit. Choose your hours, see the pay first, and get paid every week.</p><a class="ws-btn dark" href="#courier">Apply to ride</a></div>' +
    '<ul class="ws-ticks"><li>You keep ' + num(P.courierShare, 75) + "% of every delivery price</li><li>Jobs matched to your vehicle's space and weight limit</li><li>Navigation, chat and proof of delivery in the app</li><li>Weekly payouts to your bank</li></ul></div></section>";
  h += '<section class="ws-sec"><div class="ws-wrap ws-cover"><div><h2 class="ws-h2">Across all of Rome</h2><p class="ws-p">From Prati to EUR, Pigneto to Monteverde. Same day, every day we\'re open.</p><div class="ws-areas">' + AREA_NAMES.map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("") + '</div></div><div class="ws-cover-map">' + mapSVG({ dots: AREA_NAMES.map(function (a) { return { area: a, color: "var(--purple)" }; }) }) + "</div></div></section>";
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">Questions</h2><div class="ws-faq">' + FAQ.slice(0, 4).map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + '</div><button class="ws-more" data-act="w-page" data-v="site-help">More answers and contact →</button></div></section>';
  h += '<section class="ws-final"><div class="ws-wrap"><h2>Send something today.</h2><button class="ws-btn" data-act="w-book">Book a delivery</button></div></section>';
  return h;
}
function story(icon, title, body, label, price) { return '<div class="ws-story"><svg><use href="#' + icon + '"/></svg><h3>' + title + "</h3><p>" + body + '</p><span class="ws-from">' + label + "<b>" + (price != null ? eur(price) : "—") + "</b></span></div>"; }
function step(t, b) { return "<li><h3>" + t + "</h3><p>" + b + "</p></li>"; }
function pageHead(kicker, title, lead) { return '<section class="ws-page-h"><div class="ws-wrap"><p class="ws-kicker">' + kicker + "</p><h1>" + title + "</h1>" + (lead ? '<p class="ws-lead">' + lead + "</p>" : "") + "</div></section>"; }

// ---------- How it works ----------
function siteHow() {
  return pageHead("How it works", "From your door to theirs.", "DART connects you with a courier whose vehicle fits what you're sending. Here's what happens when you book.") +
    '<section class="ws-sec"><div class="ws-wrap"><ol class="ws-steps long">' +
    step("Add the addresses", "Choose the pickup and delivery addresses and add instructions like buzzer codes, floors or the seller's name.") +
    step("Describe the item", "Pick a type (letter, parcel, furniture or something else), add up to three photos, and the length, width, height and weight if you know it. Couldn't measure? Our photo estimate can suggest the size.") +
    step("DART checks it fits", "We work out the item's category, which vehicles can carry it, and whether it needs two people. If it's too big, we tell you before you book.") +
    step("See the full price", "Distance-based, with a minimum fee. Size, weight, the number of items, the vehicle and extras like stairs or assembly are shown line by line.") +
    step("Book, with or without an account", "Pay by card. Guests only need a name, email and phone. Businesses on a plan use their monthly allowance.") +
    step("A courier accepts", "We offer it to couriers nearby with a suitable vehicle. You see who's coming and can message them.") +
    step("Follow every step", "Travelling to pickup, collected, in transit, arrived. You get a notification at each one.") +
    step("Delivered, with proof", "The courier adds a photo and who received it. Your invoice is ready straight away.") +
    '</ol><button class="ws-btn dark" data-act="w-book">Book a delivery</button></div></section>';
}

// ---------- Pricing ----------
function sitePricing() {
  var P = pricing(), R = rules();
  var cats = R.categories.filter(function (c) { return c.active !== false; });
  var h = pageHead("Pricing", "Priced by distance. Shown before you pay.", "Every delivery starts with a distance charge and a minimum fee. Bigger, heavier or more demanding items add a clear extra on top.");
  h += '<section class="ws-sec"><div class="ws-wrap ws-price-grid"><div class="ws-pcard"><span>Minimum delivery fee</span><b>' + eur(P.minFee) + '</b></div><div class="ws-pcard"><span>Per kilometre</span><b>' + eur(P.perKm) + '</b></div><div class="ws-pcard"><span>Charged from at least</span><b>' + P.minKm + ' km</b></div><div class="ws-pcard"><span>VAT</span><b>included</b></div></div></section>';
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">Size categories</h2><p class="ws-p">DART puts your item in the smallest category it fits, by its three dimensions and weight.</p><div class="tbl ws-tbl"><table><thead><tr><th>Category</th><th>Up to</th><th>Weight up to</th><th>Category fee</th><th>Vehicles</th></tr></thead><tbody>' +
    cats.map(function (c) { return "<tr><td><b>" + esc(c.label) + "</b>" + (num(c.couriers, 1) > 1 ? ' <span class="muted sm">· 2 people</span>' : "") + "</td><td>" + c.l + " × " + c.w + " × " + c.h + " cm</td><td>" + c.kg + " kg</td><td>" + (num(c.fee, 0) ? "+" + eur(c.fee) : "Included") + '</td><td class="sm">' + esc((c.vehicles || []).map(vLabel).join(", ")) + "</td></tr>"; }).join("") + "</tbody></table></div></div></section>";
  h += '<section class="ws-sec"><div class="ws-wrap ws-two"><div><h2 class="ws-h2">Extras</h2><dl class="kv ws-kv">' + OPTIONS.map(function (o) { return "<dt>" + o.label + "</dt><dd>+" + eur(P.options[o.id]) + "</dd>"; }).join("") +
    "<dt>Each extra item in the same delivery</dt><dd>+" + eur(P.extraItemFee) + "</dd><dt>Weight over " + P.weightFrom + " kg</dt><dd>+" + eur(P.perKgOver) + " per kg</dd><dt>Second courier, when needed</dt><dd>+" + eur(P.secondCourierFee) + "</dd>" + (num(P.longFrom, 0) ? "<dt>Over " + P.longFrom + " km</dt><dd>+" + eur(P.longFee) + " per km</dd>" : "") + "</dl></div>" +
    '<div><h2 class="ws-h2">Try a price</h2>' + heroQuote() + "</div></div></section>";
  return h + '<section class="ws-final"><div class="ws-wrap"><h2>Ready when you are.</h2><button class="ws-btn" data-act="w-book">Book a delivery</button></div></section>';
}

// ---------- Business ----------
function siteBusiness(acc) {
  var plans = S.plans.filter(function (p) { return p.active !== false; }).sort(function (a, b) { return a.price - b.price; });
  var cta = acc ? '<button class="ws-btn dark" data-act="c-go" data-v="business">Switch my account to business</button>' : '<button class="ws-btn dark" data-act="c-auth-open" data-v="register">Create an account</button>';
  var h = pageHead("DART for business", "Deliveries your business can count on.", "Shops, offices, studios and restaurants use DART to move documents, stock and supplies across Rome. One account, no separate app.");
  h += '<section class="ws-sec"><div class="ws-wrap"><ol class="ws-steps">' + step("Create a DART account", "Or use the one you already have.") + step("Switch to business", "In Settings, add your business name, address, Partita IVA and SDI code.") + step("Choose a plan", "A monthly fee for a set number of deliveries. Or keep paying per delivery.") + step("Send", "Book one at a time, or upload a CSV or Excel file with many at once.") + "</ol>" + cta + "</div></section>";
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">Plans</h2><div class="ws-plan-grid">' + (plans.length ? plans.map(function (p) {
    return '<div class="ws-plan big"><b>' + esc(p.name) + '</b><span class="ws-plan-p">' + eur(p.price) + "<small>/month</small></span><span>" + p.allowance + ' deliveries included each month</span><ul class="ws-ticks sm"><li>Covers ' + esc((p.categories || []).map(cLabel).join(", ")) + "</li><li>Extra deliveries " + eur(p.overageFee) + " each</li>" + (p.bulk ? "<li>Bulk upload by CSV or Excel</li>" : "") + "<li>Business invoices with your details</li></ul></div>";
  }).join("") : "<p>Plans are coming soon. You can already use DART as a business and pay per delivery.</p>") + '</div><p class="ws-p sm">Items a plan doesn\'t cover, like furniture, are charged at the normal price and shown before you confirm.</p></div></section>';
  return h;
}

// ---------- Couriers ----------
function siteCouriers() {
  var P = pricing(), vs = rules().vehicles.filter(function (v) { return v.active !== false; });
  var h = pageHead("Become a courier", "Earn with the vehicle you already have.", "DART couriers deliver letters, parcels and furniture across Rome on their own schedule.");
  h += '<section class="ws-sec"><div class="ws-wrap ws-two"><div><h2 class="ws-h2">Why ride with DART</h2><ul class="ws-ticks"><li>You keep ' + num(P.courierShare, 75) + "% of the delivery price</li><li>Go online when you want, offline when you don't</li><li>See the pickup, destination, item and pay before you accept</li><li>Only get items that fit your vehicle</li><li>Weekly payouts by bank transfer</li></ul><a class=\"ws-btn dark\" href=\"#courier\">Apply in the courier app</a></div>" +
    '<div><h2 class="ws-h2">What you need</h2><ul class="ws-ticks"><li>ID card or passport</li><li>For motor vehicles: driving licence, insurance and registration (libretto)</li><li>A smartphone</li><li>A bank account for payouts</li></ul></div></div></section>';
  h += '<section class="ws-sec alt"><div class="ws-wrap"><h2 class="ws-h2">Vehicles we work with</h2><div class="ws-vgrid">' + vs.map(function (v) { return '<div class="ws-v">' + vIcon(v.id) + "<b>" + esc(v.label) + "</b><span>Typical space " + v.l + "×" + v.w + "×" + v.h + " cm · up to " + v.kg + " kg</span></div>"; }).join("") + "</div></div></section>";
  return h;
}

// ---------- Help and contact ----------
function siteHelp(acc) {
  var c = S.c.contact;
  var h = pageHead("Help", "How can we help?", "");
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
    ["Who we are", esc(st.company) + ", " + esc(st.companyAddress) + ", P.IVA " + esc(st.companyVat) + ", runs the DART delivery platform."],
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
    ["Your rights", "Under GDPR you can ask to see, correct, export or delete your data. Write to " + esc(st.supportEmail) + "."]
  ];
  return pageHead(terms ? "Terms" : "Privacy", terms ? "Terms and conditions" : "Privacy policy", "Draft for the test build. Replace with text reviewed by a lawyer before launch.") +
    '<section class="ws-sec"><div class="ws-wrap ws-legal-body">' + body.map(function (b) { return "<h3>" + b[0] + "</h3><p>" + b[1] + "</p>"; }).join("") + "</div></section>";
}
