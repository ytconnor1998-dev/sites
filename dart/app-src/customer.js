// ===== DART customer app (phone) and customer website dashboard (web) =====

function newDraft() {
  return {
    step: 1, pickup: { area: "", street: "", notes: "" }, dropoff: { area: "", street: "", notes: "" },
    item: { type: "parcel", desc: "", qty: 1, l: "", w: "", h: "", kg: "", photos: [], options: {}, ai: false },
    billing: "card", aiBusy: false, aiNote: "", when: { mode: "asap", by: "" }
  };
}
S.c = { view: "home", listTab: "active", order: null, draft: newDraft(), auth: { mode: "login", email: "", name: "", phone: "", type: "individual", bizName: "" }, newAddr: { label: "", area: "", street: "", notes: "" }, newCard: { brand: "Visa", last4: "", exp: "" }, biz: null, bulk: { text: "", rows: null }, ticket: { topic: "delivery", orderId: "", text: "" }, issue: { reason: "Item damaged", text: "" } };

S.me.guestOrders = S.me.guestOrders || [];
S.c.guest = { name: "", email: "", phone: "", create: false };
S.c.trk = { code: "", email: "" };
var GUEST_VIEWS = ["home", "new", "track", "order", "chat", "auth"];
function me() { return S.me.customerId ? byId(S.accounts, S.me.customerId) : null; }
function myOrders() { var id = S.me.customerId; return S.orders.filter(function (o) { return o.customer && o.customer.id === id; }); }
function myInvoices() { var id = S.me.customerId; return S.invoices.filter(function (i) { return i.accountId === id; }).sort(function (a, b) { return b.issuedAt - a.issuedAt; }); }
function isWeb() { return route() === "web"; }

// Notifications derived from what happened to this customer's deliveries, chats and bills.
function custNotes() {
  var out = [], EV = { assigned: "A courier accepted your delivery", at_pickup: "Your courier arrived at pickup", collected: "Your item was collected", in_transit: "Your item is on the way", at_dest: "Your courier has arrived", delivered: "Delivered", cancelled: "Delivery cancelled", issue: "There's a problem with your delivery" };
  myOrders().forEach(function (o) {
    var t = o.timeline || {};
    Object.keys(EV).forEach(function (k) { if (t[k]) out.push({ at: t[k], text: EV[k], sub: o.id + " · " + o.pickup.area + " → " + o.dropoff.area, order: o.id }); });
    if (o.lastMsg && o.lastMsg.from !== "customer") out.push({ at: o.lastMsg.at, text: "New message from " + (o.lastMsg.from === "admin" ? "DART support" : o.courier ? o.courier.name : "your courier"), sub: o.lastMsg.text, order: o.id, chat: true });
  });
  myInvoices().forEach(function (i) { out.push({ at: i.issuedAt, text: "Invoice " + i.number + " is ready", sub: eur(i.total) + " · " + i.status, invoice: i.id }); });
  S.tickets.filter(function (t) { return t.accountId === S.me.customerId; }).forEach(function (t) { (t.replies || []).forEach(function (r) { if (r.by === "admin") out.push({ at: r.at, text: "DART support replied", sub: r.text, help: true }); }); });
  return out.sort(function (a, b) { return b.at - a.at; }).slice(0, 60);
}
function custUnseen() { var seen = S.me.seen.customer || 0; return custNotes().filter(function (n) { return n.at > seen; }).length; }

// ---------- Shell ----------
var C_NAV = [["home", "Home", "home"], ["new", "Send", "send"], ["deliveries", "Deliveries", "list"], ["messages", "Messages", "chat"], ["account", "Account", "user"]];
function customerApp() {
  var acc = me(), web = isWeb();
  if (web && !S.c.webInit) { S.c.webInit = true; if (!acc || S.c.view === "home") S.c.view = "site-home"; }
  if (!web && SITE_VIEWS.indexOf(S.c.view) >= 0) S.c.view = "home";
  if (!acc && GUEST_VIEWS.indexOf(S.c.view) < 0) S.c.view = web ? "site-home" : "home";
  var isSite = SITE_VIEWS.indexOf(S.c.view) >= 0;
  var body = isSite ? sitePage(S.c.view, acc) : !acc ? cGuest() : acc.status === "suspended" ? '<div class="pad">' + emptyState("Your account is paused", "Contact DART support from the Help page to reactivate it.", '<button class="btn ghost sm" data-act="c-logout">Log out</button>') + "</div>" : cView(acc);
  var unreadMsgs = acc ? myOrders().reduce(function (s, o) { return s + unread(o, "customer"); }, 0) : 0;
  var active = acc ? myOrders().filter(isActive).length : 0;
  var badge = function (k) { return k === "deliveries" && active ? '<span class="badge">' + active + "</span>" : k === "messages" && unreadMsgs ? '<span class="badge">' + unreadMsgs + "</span>" : ""; };
  var cur = S.c.view === "order" ? "deliveries" : S.c.view === "chat" ? "messages" : ["invoices", "business", "plans", "bulk", "help", "profile", "addresses", "payments", "prefs", "notes"].indexOf(S.c.view) >= 0 ? "account" : S.c.view;
  if (web) {
    var accNav = acc ? '<nav class="w-nav" aria-label="Your account">' + C_NAV.map(function (n) { return '<button class="' + (cur === n[0] ? "on" : "") + '" data-act="c-go" data-v="' + n[0] + '">' + (n[0] === "new" ? "New delivery" : n[1]) + badge(n[0]) + "</button>"; }).join("") +
      '<button class="' + (S.c.view === "invoices" ? "on" : "") + '" data-act="c-go" data-v="invoices">Invoices</button><button class="bell ' + (S.c.view === "notes" ? "on" : "") + '" data-act="c-go" data-v="notes" aria-label="Notifications"><svg><use href="#t-bell"/></svg>' + (custUnseen() ? '<span class="badge">' + custUnseen() + "</span>" : "") + "</button></nav>" : "";
    return siteShell(acc, body, isSite, accNav);
  }
  var tabs = acc && acc.status !== "suspended" ? '<nav class="tabs t5">' + C_NAV.map(function (n) { return '<button class="' + (cur === n[0] ? "on" : "") + '" data-act="c-go" data-v="' + n[0] + '"><svg><use href="#t-' + n[2] + '"/></svg>' + n[1] + badge(n[0]) + "</button>"; }).join("") + "</nav>" :
    !acc ? '<nav class="tabs t3">' + [["home", "Home", "home"], ["track", "Track", "list"], ["auth", "Log in", "user"]].map(function (n) { var on = S.c.view === n[0] || (n[0] === "track" && (S.c.view === "order" || S.c.view === "chat")); return '<button class="' + (on ? "on" : "") + '" data-act="' + (n[0] === "auth" ? "c-auth-open" : "c-go") + '" data-v="' + (n[0] === "auth" ? "login" : n[0]) + '"><svg><use href="#t-' + n[2] + '"/></svg>' + n[1] + "</button>"; }).join("") + "</nav>" : "";
  return stage('<div class="app-body" data-scroll="c-' + S.c.view + '">' + body + "</div>" + tabs, "DART customer app");
}
function stage(inner, label) {
  return '<div class="stage"><div class="stage-bar"><a href="#home">← All apps</a>' + modeChip() + '</div><div class="device" aria-label="' + label + '">' + inner + "</div></div>";
}
function head(title, back, right) {
  return '<div class="app-head">' + (back ? '<button class="btn ghost sm" data-act="c-go" data-v="' + back + '">← Back</button>' : "") + "<h2>" + title + "</h2>" + (right || "") + "</div>";
}
function cGuest() {
  switch (S.c.view) {
    case "auth": return cAuth();
    case "track": return cTrack(null);
    case "order": return cOrder(null);
    case "chat": return cChat(null);
    case "new": return cNew(null);
    default: return isWeb() ? cNew(null) : cMapHome(null);
  }
}
ACT["c-auth-open"] = function (d) { S.c.auth.mode = d.v; S.c.view = "auth"; closeChat(); render(); };
function cView(acc) {
  switch (S.c.view) {
    case "new": return cNew(acc);
    case "deliveries": return cDeliveries();
    case "order": return cOrder(acc);
    case "messages": return cMessages();
    case "chat": return cChat(acc);
    case "account": return cAccount(acc);
    case "profile": return cProfile(acc);
    case "addresses": return cAddresses(acc);
    case "payments": return cPayments(acc);
    case "prefs": return cPrefs(acc);
    case "invoices": return cInvoices();
    case "business": return cBusiness(acc);
    case "bulk": return cBulk(acc);
    case "help": return cHelp(acc);
    case "notes": return cNotesView();
    case "track": return cTrack(acc);
    default: return isWeb() ? cHome(acc) : cMapHome(acc);
  }
}

// ---------- Sign up / log in ----------
function cAuth() {
  var a = S.c.auth, reg = a.mode === "register";
  return '<div class="auth"><span class="logo xl"><svg><use href="#mark"/></svg>DART</span>' +
    "<h1>" + (reg ? "Create your DART account" : "Get it across Rome.") + '</h1><p class="muted">' + (reg ? "One account for the app and the website. Use it for yourself, or for your business." : "Log in to send something, track a delivery or see your invoices.") + "</p>" +
    socialButtons("c-social") + '<div class="or"><span>or</span></div>' +
    '<form class="stack" data-form="c-auth">' +
    (reg ? field("Full name", inp("c.auth.name", a.name, 'autocomplete="name" required')) : "") +
    field("Email", inp("c.auth.email", a.email, 'type="email" autocomplete="email" required')) +
    field("Password", '<input class="input" type="password" data-bind="c.auth.pw" value="' + esc(a.pw || "") + '" autocomplete="' + (reg ? "new-password" : "current-password") + '" required>', "Test build: passwords aren't checked or stored.") +
    (reg ? field("Phone (optional)", inp("c.auth.phone", a.phone, 'type="tel" autocomplete="tel"')) + '<small class="hint">Running a business? Switch to a business account later in Settings to get subscription plans.</small>' : "") +
    '<button class="btn block">' + (reg ? "Create account" : "Log in") + "</button></form>" +
    '<p class="center"><button class="link" data-act="c-go" data-v="new">Continue without an account</button></p>' +
    '<p class="center">' + (reg ? 'Already have an account? <button class="link" data-act="c-auth-mode" data-v="login">Log in</button>' : 'New to DART? <button class="link" data-act="c-auth-mode" data-v="register">Create an account</button>') + "</p></div>";
}
function findAccount(email) { var e = slugEmail(email); return S.accounts.filter(function (x) { return slugEmail(x.email) === e; })[0] || null; }
function claimGuest(id, acc) {
  var email = slugEmail(acc.email);
  var mine = S.orders.filter(function (o) { return o.customer && o.customer.guest && slugEmail(o.customer.email) === email; });
  var invs = S.invoices.filter(function (i) { return /^g-/.test(i.accountId || "") && i.party && slugEmail(i.party.email) === email; });
  return mine.reduce(function (p, o) { return p.then(function () { return Store.update("orders", o.id, { customer: { id: id, guest: false, name: acc.name } }); }); }, Promise.resolve())
    .then(function () { return invs.reduce(function (p, i) { return p.then(function () { return Store.update("invoices", i.id, { accountId: id }); }); }, Promise.resolve()); })
    .then(function () { return mine.length; });
}
function newAccountDoc(o) {
  var now = Date.now();
  var acc = { name: o.name, email: slugEmail(o.email), phone: o.phone || "", provider: o.provider, type: o.type || "individual", addresses: [], cards: [{ id: "k1", brand: "Visa", last4: "4242", exp: "12/29", def: true }], prefs: { push: true, email: true, sms: false }, status: "active", createdAt: now };
  if (o.type === "business") acc.business = { active: true, name: o.bizName || o.name, address: "", vat: "", sdi: "", email: slugEmail(o.email), phone: o.phone || "", verified: false, activatedAt: now };
  return acc;
}
function createAccount(o) {
  var id = "a-" + rid(10), acc = newAccountDoc(o);
  return run(Store.set("accounts", id, acc).then(function () { S.me.customerId = id; saveMe(); S.c.view = "home"; return claimGuest(id, acc); }).then(function (n) { if (n) toast("Welcome to DART. " + n + " earlier deliver" + (n > 1 ? "ies were" : "y was") + " added to your account."); }), "Welcome to DART, " + o.name.split(" ")[0]);
}
FORMS["c-auth"] = function (f) {
  var a = S.c.auth, email = slugEmail(a.email);
  if (!emailOk(email)) return toast("Enter a valid email address.");
  var found = findAccount(email);
  if (a.mode === "login") {
    if (!found) return toast("There's no DART account with that email. Create one instead.");
    S.me.customerId = found.id; saveMe(); S.c.view = "home"; render(); return toast("Welcome back, " + found.name.split(" ")[0]);
  }
  if (found) return toast("That email already has an account. Log in instead.");
  if (!clip(a.name, 60)) return toast("Enter your name.");
  createAccount({ name: clip(a.name, 60), email: email, phone: clip(a.phone, 30), provider: "email", type: "individual" });
};
ACT["c-auth-mode"] = function (d) { S.c.auth.mode = d.v; render(); };
// Apple and Google sign-in. The test build asks for the account details the real sign-in sheet would return.
var PROVIDERS = { apple: "Apple", google: "Google" };
function socialButtons(act) {
  return '<div class="social"><button class="btn apple block" data-act="' + act + '" data-v="apple"><svg aria-hidden="true"><use href="#t-apple"/></svg>Continue with Apple</button>' +
    '<button class="btn google block" data-act="' + act + '" data-v="google"><svg aria-hidden="true"><use href="#t-g"/></svg>Continue with Google</button></div>';
}
ACT["c-social"] = function (d) { S.modal = { kind: "google", provider: d.v || "google", role: "customer", email: "", name: "" }; render(); };
ACT["c-google"] = ACT["c-social"];
function googleModal(m) {
  var p = PROVIDERS[m.provider] || "Google", apple = m.provider === "apple";
  return modalShell("Sign in with " + p, '<p class="muted">Test build: this stands in for ' + p + "'s sign-in screen. Enter the account you want to use.</p>" + (apple ? '<p class="muted sm">With Apple you can choose to hide your email. DART then gets a private relay address that forwards to you.</p>' : "") +
    '<form class="stack" data-form="c-google">' + field(apple ? "Apple ID email" : "Gmail address", inp("modal.email", m.email, 'type="email" required')) + (m.role === "courier" ? "" : field("Name on the account", inp("modal.name", m.name, "required"))) + '<button class="btn block">Continue</button></form>');
}
FORMS["c-google"] = function () {
  var m = S.modal, email = slugEmail(m.email), p = PROVIDERS[m.provider] || "Google";
  if (!emailOk(email)) return toast("Enter a valid email address.");
  if (m.role === "courier") return courierSocial(email, p);
  var found = findAccount(email); S.modal = null;
  if (found) { S.me.customerId = found.id; saveMe(); S.c.view = "home"; render(); return toast("Signed in with " + p); }
  createAccount({ name: clip(m.name, 60) || email.split("@")[0], email: email, provider: m.provider || "google", type: "individual" });
};
ACT["c-logout"] = function () { S.me.customerId = null; saveMe(); S.c = Object.assign(S.c, { view: isWeb() ? "site-home" : "home", draft: newDraft() }); closeChat(); render(); };

// ---------- Home ----------
function cHome(acc) {
  var orders = myOrders(), active = orders.filter(isActive), recent = orders.filter(function (o) { return !isActive(o); }).slice(0, 3), sub = activeSub(acc), plan = subPlan(acc);
  var st = settings(), web = isWeb();
  var h = (web ? "" : head("Hi " + esc(acc.name.split(" ")[0]), "", '<button class="icon-btn" data-act="c-go" data-v="notes" aria-label="Notifications"><svg><use href="#t-bell"/></svg>' + (custUnseen() ? '<span class="badge">' + custUnseen() + "</span>" : "") + "</button>")) + '<div class="pad">';
  if (web) h += '<h1 class="w-title">Hi ' + esc(acc.name.split(" ")[0]) + "</h1>";
  if (st.open === false) h += '<div class="banner bad">DART is closed right now. You can book again when we reopen.</div>';
  else if (st.banner) h += '<div class="banner">' + esc(st.banner) + "</div>";
  if (acc.subscription && acc.subscription.status === "past_due") h += '<div class="banner bad">Your plan payment failed. <button class="link" data-act="c-go" data-v="business">Update payment</button></div>';
  h += '<button class="hero-card" data-act="c-go" data-v="new"><b>Book a delivery</b><span>From ' + eur(pricing().minFee) + ', priced by distance. You see the full price before you pay.</span><i aria-hidden="true">→</i></button>';
  h += '<div class="' + (web ? "w-cols" : "stack") + '"><div class="stack">';
  h += '<div class="sec-h"><h3>Active deliveries</h3>' + (active.length ? '<button class="link" data-act="c-go" data-v="deliveries">See all</button>' : "") + "</div>";
  h += active.length ? '<div class="list">' + active.map(orderRow).join("") + "</div>" : '<p class="muted">Nothing on the move right now.</p>';
  if (recent.length) h += '<div class="sec-h"><h3>Previous</h3></div><div class="list">' + recent.map(orderRow).join("") + "</div>";
  h += '</div><div class="stack">';
  if (acc.business && acc.business.active) {
    h += '<div class="card"><div class="row between"><b>' + esc(acc.business.name) + '</b><span class="chip s-pur">Business</span></div>';
    if (plan && sub) { var used = subUsage(acc); h += usageBar(used, plan.allowance) + '<span class="muted">' + esc(plan.name) + " · renews " + dmy(sub.renewsAt) + "</span>"; }
    else h += '<span class="muted">No plan. You pay per delivery.</span>';
    h += '<div class="row wrap"><button class="btn ghost sm" data-act="c-go" data-v="business">Business settings</button>' + (plan && plan.bulk ? '<button class="btn ghost sm" data-act="c-go" data-v="bulk">Bulk deliveries</button>' : "") + "</div></div>";
  }
  h += '<div class="quick"><button data-act="c-go" data-v="invoices"><b>Invoices</b><span>' + myInvoices().length + " total</span></button><button data-act=\"c-go\" data-v=\"messages\"><b>Messages</b><span>Chat with couriers</span></button><button data-act=\"c-go\" data-v=\"help\"><b>Help</b><span>Report a problem</span></button>" + (!(acc.business && acc.business.active) ? '<button data-act="c-go" data-v="business"><b>For business</b><span>Subscription plans</span></button>' : "") + "</div>";
  return h + "</div></div></div>";
}
function usageBar(used, total) {
  var pct = total ? Math.min(100, Math.round(used / total * 100)) : 0;
  return '<div class="usage"><div class="row between"><span>' + used + " of " + total + ' deliveries used</span><b>' + Math.max(0, total - used) + ' left</b></div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
}
function orderRow(o) {
  return '<button class="item" data-act="c-order" data-v="' + esc(o.id) + '"><b>' + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + "</b>" + chip(o.status) +
    "<small>" + esc(cLabel(o.cls.category)) + " · " + when(o.createdAt) + '</small><small class="num">' + eur(o.billing ? o.billing.amount : o.price.total) + (unread(o, "customer") ? ' · <b class="dot-new">new message</b>' : "") + "</small></button>";
}

// ---------- New delivery ----------
function cNew(acc) {
  var d = S.c.draft, web = isWeb(), st = settings();
  var steps = ["Where", "What", "Review"];
  var back = d.step > 1 ? '<button class="btn ghost sm" data-act="c-step" data-v="' + (d.step - 1) + '">← Back</button>' : '<button class="btn ghost sm" data-act="c-go" data-v="home">← Back</button>';
  var title = acc ? "New delivery" : "Send something";
  var h = (web ? '<h1 class="w-title">' + (acc ? "New delivery" : "Send something across Rome") + "</h1>" + (acc ? "" : '<p class="muted">No account needed. Get a price, book and track with just your email.</p>') : '<div class="app-head">' + back + "<h2>" + title + "</h2>" + (acc ? "" : '<button class="btn ghost sm" data-act="c-auth-open" data-v="login">Log in</button>') + "</div>") + '<div class="pad">';
  if (st.open === false) return h + '<div class="banner bad">DART is closed right now. Bookings open again soon.</div></div>';
  h += '<ol class="stepper">' + steps.map(function (s, i) { return '<li class="' + (d.step === i + 1 ? "on" : d.step > i + 1 ? "done" : "") + '"><button data-act="c-step" data-v="' + (i + 1) + '"' + (i + 1 > d.step ? " disabled" : "") + ">" + (i + 1) + ". " + s + "</button></li>"; }).join("") + "</ol>";
  var main = d.step === 1 ? newWhere(acc) : d.step === 2 ? newWhat(acc) : newReview(acc);
  if (web) return h + '<div class="w-cols wide-left"><div class="stack">' + main + '</div><aside class="stack sticky">' + newSummary(acc) + "</aside></div></div>";
  return h + main + "</div>";
}
function addrBlock(key, label, acc) {
  var a = S.c.draft[key], saved = acc ? (acc.addresses || []) : [];
  return '<div class="card"><b>' + label + "</b>" +
    (saved.length ? '<div class="chips">' + saved.map(function (s) { return '<button type="button" class="chipbtn" data-act="c-use-addr" data-k="' + key + '" data-v="' + esc(s.id) + '">' + esc(s.label || s.street) + "</button>"; }).join("") + "</div>" : "") +
    '<div class="grid2">' + field("Area of Rome", areaSel("c.draft." + key + ".area", a.area)) + field("Street and number", inp("c.draft." + key + ".street", a.street, 'placeholder="e.g. Via Panisperna 41" autocomplete="street-address"')) + "</div>" +
    field(key === "pickup" ? "Pickup instructions" : "Delivery instructions", inp("c.draft." + key + ".notes", a.notes, 'placeholder="' + (key === "pickup" ? "Seller's name, buzzer, floor" : "Buzzer, floor, who receives it") + '"')) + "</div>";
}
function newWhere(acc) {
  var d = S.c.draft, ok = d.pickup.area && d.dropoff.area && d.pickup.street && d.dropoff.street;
  var h = addrBlock("pickup", "Pickup", acc) + addrBlock("dropoff", "Delivery", acc);
  if (d.pickup.area && d.dropoff.area) h += '<div class="map map-sm">' + mapSVG({ routes: [{ from: d.pickup.area, to: d.dropoff.area }] }) + '</div><p class="muted">About ' + tripKm(d.pickup.area, d.dropoff.area).toFixed(1) + " km by road</p>";
  if (d.pickup.area && d.dropoff.area) h += whenCard(d);
  return h + '<button class="btn block" data-act="c-step" data-v="2">Next: what you\'re sending</button>';
}
// When it should arrive: as soon as possible, or by a time the customer picks.
function whenCard(d) {
  var w = d.when || (d.when = { mode: "asap", by: "" }), slots = deliverySlots(d.pickup.area, d.dropoff.area);
  if (w.mode === "set" && slots.indexOf(+w.by) < 0) w.by = slots.length ? String(slots[0]) : "";
  return '<div class="card"><b>When should it arrive?</b><div class="opts">' +
    '<button type="button" class="opt ' + (w.mode === "asap" ? "on" : "") + '" role="radio" aria-checked="' + (w.mode === "asap") + '" data-act="c-when" data-v="asap"><b>As soon as possible</b><span>Usually by ' + hhmm(earliestBy(d.pickup.area, d.dropoff.area)) + "</span></button>" +
    '<button type="button" class="opt ' + (w.mode === "set" ? "on" : "") + '" role="radio" aria-checked="' + (w.mode === "set") + '" data-act="c-when" data-v="set"><b>By a set time</b><span>Pick when it needs to be there, today or tomorrow</span></button></div>' +
    (w.mode === "set" ? field("Deliver by", sel("c.draft.when.by", w.by, slots.map(function (t) { return [String(t), byLabel(t)]; }), 'data-live="1"')) : "") + "</div>";
}
ACT["c-when"] = function (d) { var w = S.c.draft.when; w.mode = d.v; render(); };
function deliverByOf(d, mins) { return d.when && d.when.mode === "set" && +d.when.by ? +d.when.by : Date.now() + Math.round(mins + num(pricing().asapBufferMins, 30)) * 60000; }
function newWhat(acc) {
  var d = S.c.draft, it = d.item, cls = classify(it);
  var h = '<div class="card"><b>What are you sending?</b><div class="chips">' + ITEM_TYPES.map(function (t) { return '<button type="button" class="chipbtn ' + (it.type === t.id ? "on" : "") + '" data-act="c-type" data-v="' + t.id + '">' + t.label + "</button>"; }).join("") + "</div>";
  if (it.type === "furniture") h += '<div class="chips">' + FURNITURE.map(function (f) { return '<button type="button" class="chipbtn sm ' + (it.desc === f ? "on" : "") + '" data-act="c-furn" data-v="' + f + '">' + f + "</button>"; }).join("") + "</div>";
  h += field("Description", inp("c.draft.item.desc", it.desc, 'placeholder="' + (it.type === "furniture" ? "e.g. IKEA Kallax shelf, 4x4" : "e.g. Box of books, a signed contract") + '" maxlength="120"')) + "</div>";
  h += '<div class="card"><div class="row between"><b>Photos</b><span class="muted">' + it.photos.length + "/3</span></div>" +
    (it.photos.length ? '<div class="phs">' + it.photos.map(function (p, i) { return '<span class="ph-wrap"><img class="ph" src="' + safeImg(p) + '" alt="Item photo ' + (i + 1) + '"><button type="button" class="ph-x" data-act="c-photo-del" data-v="' + i + '" aria-label="Remove photo">×</button></span>'; }).join("") + "</div>" : "") +
    (it.photos.length < 3 ? '<label class="file-btn">Add a photo of the item<input type="file" accept="image/*" data-file="item"></label>' : "") +
    (Caps.sample && Caps.sampleImages && it.photos.length ? '<button type="button" class="btn ghost block" data-act="c-ai"' + (d.aiBusy ? " disabled" : "") + ">" + (d.aiBusy ? "Looking at your photos…" : "Estimate size and weight from photos") + "</button>" : "") +
    (d.aiNote ? '<p class="note">' + esc(d.aiNote) + "</p>" : "") + "</div>";
  var needDims = it.type !== "letter" && it.type !== "document";
  h += '<div class="card"><b>Size and weight</b>' + (needDims ? "" : '<span class="muted">Optional for letters and documents.</span>') +
    '<div class="grid4">' + field("Length cm", inp("c.draft.item.l", it.l, 'inputmode="decimal" data-live="1"')) + field("Width cm", inp("c.draft.item.w", it.w, 'inputmode="decimal" data-live="1"')) + field("Height cm", inp("c.draft.item.h", it.h, 'inputmode="decimal" data-live="1"')) + field("Weight kg", inp("c.draft.item.kg", it.kg, 'inputmode="decimal" data-live="1" placeholder="if known"')) + "</div>" +
    field("Number of items", inp("c.draft.item.qty", it.qty, 'inputmode="numeric" data-live="1"')) + "</div>";
  h += '<div class="card"><b>Extra services</b>' + OPTIONS.map(function (o) { var fee = num(pricing().options[o.id], 0); return check("c.draft.item.options." + o.id, it.options[o.id], o.label + (fee ? ' <span class="muted">+' + eur(fee) + "</span>" : "")); }).join("") + "</div>";
  h += clsCard(cls);
  return h + '<button class="btn block" data-act="c-step" data-v="3">Next: review price</button>';
}
function clsCard(cls) {
  if (!cls.ok) return '<div class="card ' + (cls.tooBig ? "warn" : "") + '"><b>' + (cls.tooBig ? "We can't take this one" : "We need a bit more") + '</b><span>' + esc(cls.msg) + "</span></div>";
  return '<div class="card ok"><div class="row between"><b>' + esc(cls.label) + '</b><span class="chip s-ok">DART can deliver this</span></div>' +
    '<span>Vehicle: ' + esc(vLabel(cls.minVehicle)) + (cls.vehicles.length > 1 ? " or bigger" : "") + " · " + (cls.couriers > 1 ? "2 couriers" : "1 courier") + "</span>" +
    (cls.notes.length ? '<ul class="notes">' + cls.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>" : "") +
    '<small class="hint">Based on your ' + (cls.source === "photos" ? "photos and " : "") + "measurements. Check it before you book.</small></div>";
}
function draftQuote(acc) {
  var d = S.c.draft, cls = classify(d.item);
  if (!cls.ok || !d.pickup.area || !d.dropoff.area) return null;
  var q = quote(d.pickup.area, d.dropoff.area, d.item, cls, acc);
  return { cls: cls, q: q, sub: subBilling(acc, cls, q) };
}
function newSummary(acc) {
  var d = S.c.draft, x = draftQuote(acc);
  var h = '<div class="card"><b>Summary</b>';
  if (d.pickup.area) h += '<div class="map map-xs">' + mapSVG({ labels: false, routes: d.dropoff.area ? [{ from: d.pickup.area, to: d.dropoff.area }] : [] }) + "</div>";
  h += '<dl class="kv"><dt>From</dt><dd>' + esc(d.pickup.area || "—") + "</dd><dt>To</dt><dd>" + esc(d.dropoff.area || "—") + "</dd><dt>Item</dt><dd>" + esc(x ? x.cls.label : "—") + "</dd></dl>";
  if (x) h += '<div class="row between"><span class="muted">' + x.q.km.toFixed(1) + " km · about " + x.q.mins + ' min</span><span class="price-big">' + eur(x.sub && d.billing === "subscription" ? x.sub.amount : x.q.total) + "</span></div>";
  return h + "</div>";
}
function newReview(acc) {
  var d = S.c.draft, x = draftQuote(acc);
  if (!x) return '<div class="card warn">Go back and finish the addresses and item details.</div>';
  var biz = !!(acc && acc.business && acc.business.active), cards = acc ? acc.cards || [] : [];
  if (d.billing === "subscription" && !x.sub) d.billing = "card";
  if (d.billing === "invoice" && !biz) d.billing = "card";
  var h = '<div class="card">' + '<div class="map map-sm">' + mapSVG({ labels: false, routes: [{ from: d.pickup.area, to: d.dropoff.area }] }) + "</div>" +
    legs({ pickup: d.pickup, dropoff: d.dropoff }) + "<span>" + esc(x.cls.label) + (d.item.desc ? " · " + esc(d.item.desc) : "") + "</span>" + (d.item.photos.length ? '<div class="phs">' + photoStrip(d.item.photos) + "</div>" : "") +
    '<div class="row between when-row"><span>Arrives</span><b>' + (d.when && d.when.mode === "set" && +d.when.by ? byLabel(+d.when.by) : "As soon as possible · by about " + hhmm(deliverByOf(d, x.q.mins))) + '</b><button type="button" class="link" data-act="c-step" data-v="1">Change</button></div></div>';
  h += clsCard(x.cls);
  h += '<div class="card"><b>Price</b>' + breakdown(x.q, d.billing === "subscription" ? x.sub : null) + '<small class="hint">Prices are set by distance with a minimum fee of ' + eur(pricing().minFee) + ", plus size, weight, vehicle and extra services.</small></div>";
  if (!acc) {
    var g = S.c.guest;
    h += '<div class="card"><b>Your details</b><span class="muted sm">For the receipt, the tracking link and so the courier can reach you. No account needed.</span>' +
      field("Name", inp("c.guest.name", g.name, 'autocomplete="name" required')) + '<div class="grid2">' + field("Email", inp("c.guest.email", g.email, 'type="email" autocomplete="email" required')) + field("Phone", inp("c.guest.phone", g.phone, 'type="tel" autocomplete="tel" required')) + "</div>" +
      check("c.guest.create", g.create, "Also create a DART account with these details, to keep your history and invoices in one place") +
      '<span class="sm">Already have an account? <button class="link" data-act="c-auth-open" data-v="login">Log in</button></span></div>';
  }
  h += '<div class="card"><b>How do you want to pay?</b><div class="opts">' +
    payOpt("applepay", '<span class="wallet"><svg aria-hidden="true"><use href="#t-apple"/></svg>Pay</span>', "Apple Pay · charged now: " + eur(x.q.total)) +
    payOpt("googlepay", '<span class="wallet g"><svg aria-hidden="true"><use href="#t-g"/></svg>Pay</span>', "Google Pay · charged now: " + eur(x.q.total)) +
    payOpt("card", "Card", (cards.filter(function (k) { return k.def; })[0] || cards[0] || { brand: "Visa", last4: "4242" }).brand + " •• " + (cards.filter(function (k) { return k.def; })[0] || cards[0] || { last4: "4242" }).last4 + " · charged now: " + eur(x.q.total)) +
    (x.sub ? payOpt("subscription", "Use my " + esc(x.sub.plan.name) + " plan", esc(x.sub.note) + " · you pay " + eur(x.sub.amount)) : "") +
    (biz ? payOpt("invoice", "Monthly business invoice", "Added to this month's invoice: " + eur(x.q.total)) : "") +
    "</div></div>";
  return h + '<button class="btn block big" data-act="c-book"' + (busy ? " disabled" : "") + ">Confirm and book · " + eur(d.billing === "subscription" ? x.sub.amount : x.q.total) + "</button>" + '<p class="hint center">No real payment is taken in the test build.</p>';
}
function payOpt(v, title, sub) { var on = S.c.draft.billing === v; return '<button type="button" class="opt ' + (on ? "on" : "") + '" role="radio" aria-checked="' + on + '" data-act="c-pay" data-v="' + v + '"><b>' + title + "</b><span>" + sub + "</span></button>"; }

ACT["c-go"] = function (d) {
  var v = d.v || "home";
  if (v !== "chat") closeChat();
  if (v === "new" && S.c.view !== "new" && S.c.draft.done) S.c.draft = newDraft();
  if (v === "notes") { S.c.view = "notes"; render(); S.me.seen.customer = Date.now(); saveMe(); return; }
  S.c.view = v; render();
};
ACT["c-step"] = function (d) {
  var dr = S.c.draft, to = +d.v;
  if (to >= 2 && !(dr.pickup.area && dr.dropoff.area && clip(dr.pickup.street, 80) && clip(dr.dropoff.street, 80))) { dr.step = 1; render(); return toast("Add an area and a street for both addresses."); }
  if (to >= 3) { var cls = classify(dr.item); if (!cls.ok) { dr.step = 2; render(); return toast(cls.msg); } }
  dr.step = to; render(); var b = document.querySelector(".app-body"); if (b) b.scrollTop = 0; window.scrollTo(0, 0);
};
ACT["c-type"] = function (d) { S.c.draft.item.type = d.v; if (d.v !== "furniture" && FURNITURE.indexOf(S.c.draft.item.desc) >= 0) S.c.draft.item.desc = ""; render(); };
ACT["c-furn"] = function (d) { S.c.draft.item.desc = d.v; render(); };
ACT["c-pay"] = function (d) { S.c.draft.billing = d.v; render(); };
ACT["c-photo-del"] = function (d) { S.c.draft.item.photos.splice(+d.v, 1); render(); };
ACT["c-use-addr"] = function (d) { var acc = me(), a = byId(acc.addresses || [], d.v); if (a) { S.c.draft[d.k] = { area: a.area, street: a.street, notes: a.notes || "" }; render(); } };
FILES["item"] = function (file) {
  shrinkImage(file, 520, 36000).then(function (src) { S.c.draft.item.photos.push(src); S.c.draft.item._blobs = (S.c.draft.item._blobs || []).concat([file]); render(); }, function () { toast("That photo couldn't be read. Try another one."); });
};
ACT["c-ai"] = function () {
  var d = S.c.draft, it = d.item;
  if (!Caps.sample || d.aiBusy) return;
  d.aiBusy = true; d.aiNote = ""; render();
  var prompt = "You help a courier company in Rome decide how to carry an item. The photos show the item a customer wants delivered. " +
    "The customer says it is: " + (ITEM_TYPES.filter(function (t) { return t.id === it.type; })[0] || {}).label + (it.desc ? ", described as: " + it.desc.slice(0, 120) : "") + ". " +
    'Estimate its outer size and weight. Reply with only JSON like {"description":"short name","length_cm":80,"width_cm":40,"height_cm":40,"weight_kg":12,"fragile":false,"confidence":"medium","note":"one short sentence"}. confidence is high, medium or low.';
  Caps.sample.json(prompt, { images: it.photos.map(dataUrlToBlob), modelTier: "quick" }).then(function (r) {
    r = r || {};
    var conf = ["high", "medium", "low"].indexOf(r.confidence) >= 0 ? r.confidence : "low";
    if (conf === "low") { d.aiNote = "We couldn't tell the size from these photos. Please measure the item."; return; }
    ["l", "w", "h", "kg"].forEach(function (k, i) { var v = num([r.length_cm, r.width_cm, r.height_cm, r.weight_kg][i], 0); if (v) it[k] = String(Math.round(v * 10) / 10); });
    if (!it.desc && r.description) it.desc = clip(r.description, 120);
    if (r.fragile) it.options.fragile = true;
    it.ai = true;
    d.aiNote = "Estimated from your photos (" + conf + " confidence)" + (r.note ? ": " + clip(r.note, 140) : "") + ". Check the numbers and correct them if needed.";
  }, function (e) {
    d.aiNote = e && (e.code === "not_granted" || e.code === "sampling_disabled") ? "Photo estimates aren't available. Enter the measurements instead." : "The photo estimate didn't work this time. Enter the measurements instead.";
    if (e && e.code === "not_granted") Caps.sample = null;
  }).then(function () { d.aiBusy = false; render(); });
};
ACT["c-book"] = function () {
  var acc = me(), d = S.c.draft, x = draftQuote(acc), g = S.c.guest;
  if (!x || busy || settings().open === false) return;
  if (!acc) {
    if (!clip(g.name, 60)) return toast("Add your name so the courier knows who it's for.");
    if (!emailOk(slugEmail(g.email))) return toast("Add your email for the receipt and tracking.");
    if (!clip(g.phone, 30)) return toast("Add a phone number so the courier can reach you.");
    if (g.create && findAccount(g.email)) return toast("That email already has a DART account. Log in to book with it.");
  }
  var now = Date.now(), id = "DRT-" + rid(3) + "-" + rid(3), method = d.billing;
  var amount = method === "subscription" && x.sub ? x.sub.amount : x.q.total;
  var billing = { method: method, amount: r2(amount), status: method === "invoice" ? "to_invoice" : amount === 0 ? "included" : "paid" };
  if (method === "subscription" && x.sub) { billing.planId = x.sub.plan.id; billing.planName = x.sub.plan.name; billing.included = x.sub.included; }
  var item = { type: d.item.type, desc: clip(d.item.desc, 120), qty: Math.max(1, Math.round(num(d.item.qty, 1))), l: num(d.item.l, 0), w: num(d.item.w, 0), h: num(d.item.h, 0), kg: num(d.item.kg, 0), photos: d.item.photos.slice(0, 3), options: Object.assign({}, d.item.options), ai: !!d.item.ai };
  var order = {
    customer: null,
    pickup: { area: d.pickup.area, street: clip(d.pickup.street, 80), notes: clip(d.pickup.notes, 160) },
    dropoff: { area: d.dropoff.area, street: clip(d.dropoff.street, 80), notes: clip(d.dropoff.notes, 160) },
    item: item, cls: x.cls, price: x.q, billing: billing, code: newCode(), deliverBy: deliverByOf(d, x.q.mins), asap: !(d.when && d.when.mode === "set"), status: "awaiting", createdAt: now, timeline: { requested: now, awaiting: now }
  };
  var start = Promise.resolve(acc ? Object.assign({ id: acc.id }, acc) : null);
  if (!acc && g.create) {
    var aid = "a-" + rid(10), doc = newAccountDoc({ name: clip(g.name, 60), email: g.email, phone: clip(g.phone, 30), provider: "email", type: "individual" });
    start = Store.set("accounts", aid, doc).then(function () { S.me.customerId = aid; saveMe(); return claimGuest(aid, doc); }).then(function () { return Object.assign({ id: aid }, doc); });
  }
  run(start.then(function (a) {
    order.customer = a ? { id: a.id, name: a.name, email: a.email, phone: a.phone || "", business: !!(a.business && a.business.active), businessName: a.business && a.business.active ? a.business.name : "" }
      : { id: "g-" + rid(10), name: clip(g.name, 60), email: slugEmail(g.email), phone: clip(g.phone, 30), guest: true, business: false, businessName: "" };
    return Store.set("orders", id, order);
  }).then(function () {
    if (order.customer.guest) { S.me.guestOrders = [id].concat(S.me.guestOrders.filter(function (x) { return x !== id; })).slice(0, 30); saveMe(); }
    S.c.draft = newDraft(); S.c.order = id; S.c.view = "order";
  }), acc ? "Booked. We're finding you a courier." : "Booked. Your tracking code is " + id + ".");
};

// ---------- Deliveries ----------
function cDeliveries() {
  var list = myOrders(), tab = S.c.listTab, q = (S.c.search || "").toLowerCase();
  var rows = list.filter(function (o) { return tab === "active" ? isActive(o) : !isActive(o); }).filter(function (o) { return !q || (o.id + " " + o.pickup.area + " " + o.dropoff.area + " " + (o.item.desc || "")).toLowerCase().indexOf(q) >= 0; });
  var h = (isWeb() ? '<h1 class="w-title">Deliveries</h1>' : head("Deliveries")) + '<div class="pad"><div class="seg">' +
    [["active", "Active"], ["past", "Previous"]].map(function (t) { return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="c-list-tab" data-v="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div>" +
    field("Search", inp("c.search", S.c.search || "", 'placeholder="Reference, area or item" data-live="1" type="search"'));
  h += rows.length ? '<div class="list">' + rows.map(orderRow).join("") + "</div>" : emptyState(tab === "active" ? "No active deliveries" : "No previous deliveries", "Deliveries you book show up here.", '<button class="btn sm" data-act="c-go" data-v="new">Send something</button>');
  return h + "</div>";
}
ACT["c-list-tab"] = function (d) { S.c.listTab = d.v; render(); };
ACT["c-order"] = function (d) { S.c.order = d.v; S.c.view = "order"; closeChat(); render(); };
function cOrder(acc) {
  var o = byId(S.orders, S.c.order), backTo = acc ? "deliveries" : "track";
  if (!o) return head("Delivery", backTo) + '<div class="pad">' + emptyState("This delivery isn't available", "It may have been removed.", '<button class="btn sm" data-act="c-go" data-v="deliveries">Back to deliveries</button>') + "</div>";
  var pos = courierPos(o), idx = FLOW.indexOf(o.status), web = isWeb();
  var eta = "";
  if (o.status === "to_pickup" || o.status === "assigned") eta = "Courier heading to pickup";
  if (o.status === "in_transit") eta = "About " + Math.max(1, Math.round((o.price.mins - 10) * (1 - (pos.t || 0)))) + " min to delivery";
  var top = (web ? '<div class="row between"><h1 class="w-title">Delivery ' + esc(o.id) + '</h1><button class="btn ghost sm" data-act="c-go" data-v="' + backTo + '">← ' + (acc ? "All deliveries" : "Track another") + "</button></div>" : head('<span class="mono">' + esc(o.id) + "</span>", backTo));
  if (!acc && o.customer.guest && o.status === "awaiting") top += '<div class="' + (web ? "" : "pad") + '"><div class="banner">Keep your tracking code <b class="mono">' + esc(o.id) + "</b>. You can track it any time with your email.</div></div>";
  var mapH = '<div class="map map-md">' + mapSVG({ labels: false, routes: [Object.assign({ from: o.pickup.area, to: o.dropoff.area }, pos)] }) + "</div>";
  var by = o.deliverBy && ACTIVE.indexOf(o.status) >= 0 ? '<p class="by-line">Arrives ' + (o.asap ? "by about " + hhmm(o.deliverBy) : byLabel(o.deliverBy).replace(/^Today by /, "by ").replace(/^Tomorrow by /, "tomorrow by ")) + "</p>" : "";
  var a = '<div class="stack"><div><h2 class="status-h">' + esc(STATUS[o.status]) + "</h2>" + by + (eta ? '<p class="muted">' + eta + "</p>" : o.status === "awaiting" ? '<p class="muted">We\'re offering it to couriers with a suitable vehicle.</p>' : "") + "</div>" +
    (idx >= 0 ? '<div class="progress">' + FLOW.map(function (k, i) { return '<i class="' + (i <= idx ? "on" : "") + '"></i>'; }).join("") + "</div>" : "");
  if (o.status === "issue" || (o.issue && o.issue.open)) a += '<div class="banner bad">' + esc(o.issue && o.issue.by === "courier" ? "Your courier reported: " + o.issue.reason : "You reported a problem: " + (o.issue ? o.issue.reason : "")) + ". DART support is looking at it.</div>";
  if (o.code && ACTIVE.indexOf(o.status) >= 0) a += '<div class="code-card"><div><span class="muted sm">Delivery code</span><b class="code-big">' + esc(o.code) + "</b></div><p>Give this code to the courier when they arrive. They can't finish the delivery without it. If someone else is receiving it, send them the code.</p>" +
    (o.item.options && o.item.options.signature ? '<p class="muted sm">The person receiving it will also be asked to sign on the courier\'s phone.</p>' : "") + "</div>";
  if (o.courier) a += '<div class="person"><span class="avatar">' + esc(initials(o.courier.name)) + "</span><div><b>" + esc(o.courier.name) + '</b><div class="muted sm">' + esc(ratingText(o.courier.id)) + " · " + esc(vLabel(o.courier.vehicle)) + (o.courier.plate ? " · " + esc(o.courier.plate) : "") + "</div></div>" +
    '<button class="btn sm" data-act="c-chat" data-v="' + esc(o.id) + '">Message' + (unread(o, "customer") ? ' <span class="badge in">1</span>' : "") + "</button></div>";
  if (o.status === "delivered") {
    var img = o.proof && safeImg(o.proof.photo);
    var sig = o.proof && safeImg(o.proof.sig);
    a += '<div class="card"><b>Proof of delivery</b>' + (img ? '<img class="proof" src="' + img + '" alt="Photo taken by the courier at delivery">' : "") +
      '<span class="muted">Received by ' + esc(o.proof ? o.proof.receiver : "recipient") + " · " + when(o.timeline.delivered) + (o.proof && o.proof.codeOk ? " · code confirmed" : "") + "</span>" +
      (sig ? '<span class="muted sm">Signature</span><img class="sig-img" src="' + sig + '" alt="Signature of the person who received it">' : "") + "</div>";
    a += reviewCard(o);
  }
  var b = '<div class="stack"><div class="card">' + legs(o) + "<span>" + itemSummary(o) + "</span>" + (o.item.photos && o.item.photos.length ? '<div class="phs">' + photoStrip(o.item.photos) + "</div>" : "") + "</div>" +
    '<div class="card"><b>Price</b>' + breakdown(o.price, o.billing && o.billing.method === "subscription" ? o.billing : null) + '<span class="muted">Payment: ' + esc(payLabel(o.billing)) + "</span></div>" +
    '<div class="card"><b>Status history</b>' + timelineList(o) + "</div>";
  var inv = o.invoiceId ? byId(S.invoices, o.invoiceId) : null;
  var actions = '<div class="row wrap">' + (inv ? '<button class="btn ghost sm" data-act="c-inv" data-v="' + esc(inv.id) + '">View invoice</button>' : "") +
    '<button class="btn ghost sm" data-act="c-repeat" data-v="' + esc(o.id) + '">Repeat this delivery</button>' +
    (o.status !== "cancelled" ? '<button class="btn ghost sm" data-act="c-issue" data-v="' + esc(o.id) + '">Report a problem</button>' : "") +
    (o.status === "awaiting" || o.status === "assigned" || o.status === "to_pickup" ? '<button class="btn danger sm" data-act="c-cancel" data-v="' + esc(o.id) + '">Cancel delivery</button>' : "") + "</div>";
  a += actions + "</div>"; b += "</div>";
  if (web) return top + '<div class="w-cols"><div class="stack">' + mapH + a + "</div>" + b + "</div>";
  return top + mapH + '<div class="pad">' + a + b + "</div>";
}
var WALLETS = { applepay: "Apple Pay", googlepay: "Google Pay" };
function payLabel(b) { if (!b) return "Card"; if (WALLETS[b.method]) return WALLETS[b.method] + (b.status === "refunded" ? ", refunded" : ", paid"); return b.method === "subscription" ? (b.included ? "Included in " + b.planName : b.planName + " plan, extra charge") : b.method === "invoice" ? "Monthly business invoice" : b.status === "refunded" ? "Card, refunded" : "Card, paid"; }
// Review and tip, once, after delivery. Tips go to the courier in full.
var TIPS = [0, 1, 2, 5, 10];
function reviewCard(o) {
  var name = o.courier ? o.courier.name : "your courier";
  if (o.review) return '<div class="card"><b>Your review</b><div class="stars static" aria-label="' + o.review.stars + ' stars">' + [1, 2, 3, 4, 5].map(function (n) { return '<span class="' + (o.review.stars >= n ? "on" : "") + '">★</span>'; }).join("") + "</div>" +
    (o.review.text ? "<p>“" + esc(o.review.text) + "”</p>" : "") + (o.tip ? '<span class="muted">You tipped ' + eur(o.tip.amount) + ". All of it goes to " + esc(name) + ".</span>" : "") + "</div>";
  var r = S.c.rv && S.c.rv.id === o.id ? S.c.rv : (S.c.rv = { id: o.id, stars: 0, text: "", tip: 0 });
  return '<form class="card" data-form="c-review"><b>How was ' + esc(name) + "?</b>" +
    '<div class="stars" role="radiogroup" aria-label="Rating">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="' + (r.stars === n) + '" aria-label="' + n + ' stars" class="' + (r.stars >= n ? "on" : "") + '" data-act="c-rate" data-v="' + n + '">★</button>'; }).join("") + "</div>" +
    field("Add a comment (optional)", txt("c.rv.text", r.text, 'rows="2" maxlength="300" placeholder="On time, careful with the stairs…"')) +
    '<span class="field-l">Add a tip for ' + esc(name) + '</span><div class="chips">' + TIPS.map(function (t) { return '<button type="button" class="chipbtn ' + (r.tip === t ? "on" : "") + '" data-act="c-tip" data-v="' + t + '">' + (t ? eur(t) : "No tip") + "</button>"; }).join("") + "</div>" +
    '<span class="muted sm">Tips go to your courier in full and are charged to your card.</span>' +
    '<button class="btn block"' + (r.stars ? "" : " disabled") + ">" + (r.tip ? "Send review and " + eur(r.tip) + " tip" : "Send review") + "</button></form>";
}
ACT["c-rate"] = function (d) { var o = byId(S.orders, S.c.order); if (!o) return; if (!S.c.rv || S.c.rv.id !== o.id) S.c.rv = { id: o.id, stars: 0, text: "", tip: 0 }; S.c.rv.stars = +d.v; render(); };
ACT["c-tip"] = function (d) { if (S.c.rv) { S.c.rv.tip = +d.v; render(); } };
FORMS["c-review"] = function () {
  var o = byId(S.orders, S.c.order), r = S.c.rv; if (!o || !r || r.id !== o.id || !r.stars || o.review) return;
  var now = Date.now(), patch = { review: { stars: r.stars, text: clip(r.text, 300), at: now } };
  if (r.tip > 0) patch.tip = { amount: r.tip, at: now };
  run(Store.claim("orders", o.id, "review", function (x) { return !x.review; }, patch).then(function () { S.c.rv = null; }), r.tip ? "Thanks. Your tip goes to " + (o.courier ? o.courier.name : "your courier") + "." : "Thanks for your review");
};
ACT["c-cancel"] = function (d) {
  var o = byId(S.orders, d.v); if (!o) return;
  S.modal = { kind: "confirm", title: "Cancel this delivery?", body: o.billing && o.billing.status === "paid" ? "You'll get a full refund of " + eur(o.billing.amount) + " to your card." : "It won't count towards your plan or invoice.", yes: "Cancel delivery", act: "c-cancel-yes", v: o.id }; render();
};
ACT["c-cancel-yes"] = function (d) {
  var o = byId(S.orders, d.v); S.modal = null;
  if (!o) return render();
  var patch = { status: "cancelled", timeline: { cancelled: Date.now() }, cancelledBy: "customer" };
  if (o.billing && o.billing.status === "paid") patch.billing = { status: "refunded" };
  run(Store.claim("orders", o.id, S.me.customerId || o.customer.id, function (x) { return ["awaiting", "assigned", "to_pickup"].indexOf(x.status) >= 0; }, patch).then(function (ok) { if (!ok) toast("Too late to cancel: the item has been collected. Report a problem instead."); }));
};
ACT["c-repeat"] = function (d) {
  var o = byId(S.orders, d.v); if (!o) return;
  var dr = newDraft(); dr.pickup = clone(o.pickup); dr.dropoff = clone(o.dropoff);
  dr.item = Object.assign(dr.item, { type: o.item.type, desc: o.item.desc, qty: o.item.qty, l: o.item.l || "", w: o.item.w || "", h: o.item.h || "", kg: o.item.kg || "", options: clone(o.item.options || {}), photos: [] });
  dr.step = 3; S.c.draft = dr; S.c.view = "new"; render(); toast("Details copied. Check them and book.");
};
ACT["c-issue"] = function (d) { S.modal = { kind: "issue", order: d.v, reason: "Item damaged", text: "" }; render(); };
function issueModal(m, role) {
  var reasons = role === "courier" ? ["Can't find the address", "Nobody at pickup", "Nobody at delivery", "Item not as described", "Item too big for my vehicle", "Access problem", "Vehicle problem", "Other"] : ["Item damaged", "Item not delivered", "Courier late", "Wrong item", "Courier behaviour", "Payment problem", "Other"];
  return modalShell("Report a problem", '<form class="stack" data-form="issue" data-role="' + role + '">' + field("What happened?", sel("modal.reason", m.reason, reasons)) + field("Details", txt("modal.text", m.text, 'rows="4" maxlength="800" required')) + '<button class="btn block">Send to DART support</button></form>');
}
FORMS["issue"] = function (form) {
  var m = S.modal, role = form.dataset.role, o = byId(S.orders, m.order); if (!o) return;
  var now = Date.now(), text = clip(m.text, 800); if (!text) return toast("Tell us what happened.");
  var who = role === "courier" ? myCourier() : me() || { id: o.customer.id, name: o.customer.name };
  var tid = "T-" + rid(6);
  var ticket = { from: role, accountId: role === "customer" ? who.id : null, courierId: role === "courier" ? who.id : null, name: who.name, orderId: o.id, topic: "delivery", subject: m.reason, text: text, status: "open", replies: [], createdAt: now };
  var patch = { issue: { open: true, by: role, reason: m.reason, text: text, at: now, ticket: tid } };
  if (role === "courier") { patch.status = "issue"; patch.issue.prev = o.status === "issue" ? (o.issue && o.issue.prev) || "assigned" : o.status; patch.timeline = { issue: now }; }
  S.modal = null;
  run(Store.set("tickets", tid, ticket).then(function () { return Store.update("orders", o.id, patch); }), "Problem reported. DART support will get back to you.");
};

// ---------- Messages ----------
function cMessages() {
  var list = myOrders().filter(function (o) { return o.courier || o.lastMsg; }).sort(function (a, b) { return ((b.lastMsg && b.lastMsg.at) || b.createdAt) - ((a.lastMsg && a.lastMsg.at) || a.createdAt); });
  var h = (isWeb() ? '<h1 class="w-title">Messages</h1>' : head("Messages")) + '<div class="pad">';
  if (!list.length) return h + emptyState("No conversations yet", "When a courier accepts your delivery, you can chat with them here.") + "</div>";
  return h + '<div class="list">' + list.map(function (o) {
    return '<button class="item" data-act="c-chat" data-v="' + esc(o.id) + '"><b>' + esc(o.courier ? o.courier.name : "DART support") + "</b>" + (unread(o, "customer") ? '<span class="badge in">new</span>' : chip(o.status)) + "<small>" + esc(o.lastMsg ? o.lastMsg.text : "No messages yet") + '</small><small class="mono">' + esc(o.id) + "</small></button>";
  }).join("") + "</div></div>";
}
ACT["c-chat"] = function (d) { S.c.order = d.v; S.c.view = "chat"; openChat(d.v); markRead(d.v); render(); scrollChat(); };
function cChat(acc) {
  var o = byId(S.orders, S.c.order); if (!o) return head("Chat", acc ? "messages" : "track");
  if (Chat.orderId !== o.id) openChat(o.id);
  var title = esc(o.courier ? o.courier.name : "Chat");
  return (isWeb() ? '<div class="row between"><h1 class="w-title">' + title + ' <span class="muted mono sm">' + esc(o.id) + '</span></h1><button class="btn ghost sm" data-act="c-order" data-v="' + esc(o.id) + '">Delivery details</button></div>' : head(title, acc ? "messages" : "", '<button class="btn ghost sm" data-act="c-order" data-v="' + esc(o.id) + '">Details</button>')) + chatView(o, "customer", acc ? acc.name : o.customer.name);
}
FORMS["chat"] = function (form) { sendChat(form); };
FILES["chat"] = function (file) { shrinkImage(file, 640, 60000).then(function (src) { Chat.draftPhoto = src; render(); }, function () { toast("That photo couldn't be read."); }); };

// ---------- Notifications ----------
function cNotesView() {
  var list = custNotes();
  return (isWeb() ? '<h1 class="w-title">Notifications</h1>' : head("Notifications", "home")) + '<div class="pad">' +
    (list.length ? '<div class="list">' + list.map(function (n) {
      return '<button class="item" data-act="' + (n.chat ? "c-chat" : n.order ? "c-order" : n.invoice ? "c-inv" : "c-go") + '" data-v="' + esc(n.order || n.invoice || "help") + '"><b>' + esc(n.text) + "</b><small>" + when(n.at) + "</small><small>" + esc(n.sub || "") + "</small><small></small></button>";
    }).join("") + "</div>" : emptyState("No notifications yet", "Updates about your deliveries, messages and invoices show up here.")) + "</div>";
}

// ---------- Account ----------
function cAccount(acc) {
  var biz = acc.business && acc.business.active;
  var rows = [["profile", "Profile", esc(acc.email)], ["addresses", "Saved addresses", (acc.addresses || []).length + " saved"], ["payments", "Payment methods", (acc.cards || []).length + " cards"], ["prefs", "Notifications", "Push, email, SMS"], ["invoices", "Invoices", myInvoices().length + " invoices"], ["deliveries", "Delivery history", myOrders().length + " deliveries"], ["business", biz ? "Business account" : "Switch to a business account", biz ? esc(acc.business.name) + " · subscription plans" : "Get access to monthly subscription plans"]];
  if (biz && subPlan(acc) && subPlan(acc).bulk) rows.push(["bulk", "Bulk deliveries", "Upload a CSV or Excel file"]);
  rows.push(["help", "Help and support", "FAQ, contact, report a problem"]);
  return (isWeb() ? '<h1 class="w-title">Account</h1>' : head("Account")) + '<div class="pad"><div class="person"><span class="avatar">' + esc(initials(acc.name)) + "</span><div><b>" + esc(acc.name) + '</b><div class="muted sm">' + (biz ? "Business · " + esc(acc.business.name) : "Individual") + (acc.provider === "google" ? " · Google sign-in" : "") + "</div></div></div>" +
    '<div class="menu">' + rows.map(function (r) { return '<button data-act="c-go" data-v="' + r[0] + '"><b>' + r[1] + "</b><span>" + r[2] + "</span><i>›</i></button>"; }).join("") + "</div>" +
    '<button class="btn ghost block" data-act="c-logout">Log out</button></div>';
}
function cProfile(acc) {
  if (!S.c.profile || S.c.profile.id !== acc.id) S.c.profile = { id: acc.id, name: acc.name, email: acc.email, phone: acc.phone || "" };
  var p = S.c.profile;
  return head("Profile", "account") + '<div class="pad"><form class="card" data-form="c-profile">' + field("Full name", inp("c.profile.name", p.name, "required")) + field("Email", inp("c.profile.email", p.email, 'type="email" required')) + field("Phone", inp("c.profile.phone", p.phone, 'type="tel"')) + '<button class="btn">Save changes</button></form>' +
    '<div class="card"><b>Password</b><span class="muted">' + (PROVIDERS[acc.provider] ? "You sign in with " + PROVIDERS[acc.provider] + ", so there's no DART password." : "Test build: passwords aren't stored, so there's nothing to change yet.") + "</span></div></div>";
}
FORMS["c-profile"] = function () {
  var p = S.c.profile, acc = me(), email = slugEmail(p.email);
  if (!emailOk(email)) return toast("Enter a valid email address.");
  var other = findAccount(email); if (other && other.id !== acc.id) return toast("Another account already uses that email.");
  run(Store.update("accounts", acc.id, { name: clip(p.name, 60) || acc.name, email: email, phone: clip(p.phone, 30) }), "Profile saved");
};
function cAddresses(acc) {
  var a = S.c.newAddr, list = acc.addresses || [];
  return head("Saved addresses", "account") + '<div class="pad">' + (list.length ? '<div class="list">' + list.map(function (x) { return '<div class="item"><b>' + esc(x.label || "Address") + '</b><button class="btn ghost sm" data-act="c-addr-del" data-v="' + esc(x.id) + '">Remove</button><small>' + esc(x.street) + ", " + esc(x.area) + "</small><small></small></div>"; }).join("") + "</div>" : '<p class="muted">Save places you use often, like home or the office.</p>') +
    '<form class="card" data-form="c-addr"><b>Add an address</b>' + field("Name", inp("c.newAddr.label", a.label, 'placeholder="Home, Office, Mum\'s"')) + '<div class="grid2">' + field("Area", areaSel("c.newAddr.area", a.area)) + field("Street and number", inp("c.newAddr.street", a.street)) + "</div>" + field("Instructions", inp("c.newAddr.notes", a.notes, 'placeholder="Buzzer, floor"')) + '<button class="btn">Save address</button></form></div>';
}
FORMS["c-addr"] = function () {
  var a = S.c.newAddr, acc = me(); if (!a.area || !clip(a.street, 80)) return toast("Add an area and a street.");
  var list = (acc.addresses || []).concat([{ id: rid(6), label: clip(a.label, 30), area: a.area, street: clip(a.street, 80), notes: clip(a.notes, 120) }]);
  S.c.newAddr = { label: "", area: "", street: "", notes: "" };
  run(Store.update("accounts", acc.id, { addresses: list }), "Address saved");
};
ACT["c-addr-del"] = function (d) { var acc = me(); run(Store.update("accounts", acc.id, { addresses: (acc.addresses || []).filter(function (x) { return x.id !== d.v; }) }), "Address removed"); };
function cPayments(acc) {
  var k = S.c.newCard, list = acc.cards || [];
  return head("Payment methods", "account") + '<div class="pad"><div class="card"><b>Apple Pay and Google Pay</b><span class="muted">Offered at checkout on phones that support them. Nothing to set up here.</span></div><div class="list">' + list.map(function (c) { return '<div class="item"><b>' + esc(c.brand) + " •• " + esc(c.last4) + (c.def ? ' <span class="chip s-pur">Default</span>' : "") + '</b><span class="row">' + (c.def ? "" : '<button class="btn ghost sm" data-act="c-card-def" data-v="' + esc(c.id) + '">Make default</button>') + (list.length > 1 ? '<button class="btn ghost sm" data-act="c-card-del" data-v="' + esc(c.id) + '">Remove</button>' : "") + "</span><small>Expires " + esc(c.exp) + "</small><small></small></div>"; }).join("") + "</div>" +
    '<form class="card" data-form="c-card"><b>Add a test card</b><span class="muted">The full app uses Stripe. Here you only enter the last 4 digits.</span><div class="grid3">' + field("Brand", sel("c.newCard.brand", k.brand, ["Visa", "Mastercard", "Amex"])) + field("Last 4 digits", inp("c.newCard.last4", k.last4, 'inputmode="numeric" maxlength="4"')) + field("Expiry", inp("c.newCard.exp", k.exp, 'placeholder="MM/YY" maxlength="5"')) + '</div><button class="btn">Add card</button></form></div>';
}
FORMS["c-card"] = function () {
  var k = S.c.newCard, acc = me(); if (!/^\d{4}$/.test(k.last4) || !/^\d\d\/\d\d$/.test(k.exp)) return toast("Enter 4 digits and an expiry like 08/28.");
  var list = (acc.cards || []).concat([{ id: rid(5), brand: k.brand, last4: k.last4, exp: k.exp, def: !(acc.cards || []).length }]);
  S.c.newCard = { brand: "Visa", last4: "", exp: "" };
  run(Store.update("accounts", acc.id, { cards: list }), "Card added");
};
ACT["c-card-def"] = function (d) { var acc = me(); run(Store.update("accounts", acc.id, { cards: (acc.cards || []).map(function (c) { return Object.assign({}, c, { def: c.id === d.v }); }) })); };
ACT["c-card-del"] = function (d) { var acc = me(), list = (acc.cards || []).filter(function (c) { return c.id !== d.v; }); if (list.length && !list.some(function (c) { return c.def; })) list[0].def = true; run(Store.update("accounts", acc.id, { cards: list }), "Card removed"); };
function cPrefs(acc) {
  var p = acc.prefs || {};
  return head("Notifications", "account") + '<div class="pad"><div class="card">' + [["push", "Push notifications", "Delivery updates and messages on this phone"], ["email", "Email", "Receipts, invoices and plan renewals"], ["sms", "Text messages", "When your courier is arriving"]].map(function (r) {
    return '<div class="row between"><div><b>' + r[1] + '</b><div class="muted sm">' + r[2] + "</div></div>" + sw("c-pref", p[r[0]] !== false && (r[0] !== "sms" || p.sms), r[1], 'data-v="' + r[0] + '"') + "</div>";
  }).join("") + "</div></div>";
}
ACT["c-pref"] = function (d) { var acc = me(), p = Object.assign({ push: true, email: true, sms: false }, acc.prefs || {}); p[d.v] = !p[d.v]; run(Store.update("accounts", acc.id, { prefs: p })); };

// ---------- Invoices ----------
function cInvoices() {
  var list = myInvoices();
  return (isWeb() ? '<h1 class="w-title">Invoices</h1>' : head("Invoices", "account")) + '<div class="pad">' + (list.length ? '<div class="list">' + list.map(function (i) {
    return '<button class="item" data-act="c-inv" data-v="' + esc(i.id) + '"><b>' + esc(i.number) + '</b><b class="num">' + eur(i.total) + "</b><small>" + (i.kind === "subscription" ? "Subscription" : "Delivery " + esc(i.orderId)) + " · " + dmy(i.issuedAt) + '</small><small class="' + (i.status === "paid" ? "" : "warn-t") + '">' + esc(i.status) + "</small></button>";
  }).join("") + "</div>" : emptyState("No invoices yet", "An invoice is created for every completed delivery and every plan payment.")) + "</div>";
}
ACT["c-inv"] = function (d) { var inv = byId(S.invoices, d.v); if (inv) { S.modal = { kind: "invoice", id: inv.id }; render(); } };
ACT["inv-download"] = function (d) { var inv = byId(S.invoices, d.v); if (inv) downloadInvoice(inv); };

// ---------- Business features and subscriptions ----------
function cBusiness(acc) {
  var b = acc.business || {}, on = b.active;
  if (!S.c.biz || S.c.biz.id !== acc.id) S.c.biz = { id: acc.id, name: b.name || "", address: b.address || "", vat: b.vat || "", sdi: b.sdi || "", email: b.email || acc.email, phone: b.phone || acc.phone || "" };
  var f = S.c.biz, h = (isWeb() ? '<h1 class="w-title">Business</h1>' : head(on ? "Business account" : "Business features", "account")) + '<div class="pad">';
  if (!on) h += '<div class="card"><b>Switch to a business account</b><span>Keep the same login. Add your business details and you get access to DART subscription plans: a set number of deliveries every month for one monthly price. Your invoices will show your business details.</span></div>';
  h += '<form class="card" data-form="c-biz"><b>Business details</b>' + field("Business name", inp("c.biz.name", f.name, "required")) + field("Business address", inp("c.biz.address", f.address)) +
    '<div class="grid2">' + field("Partita IVA or Codice Fiscale", inp("c.biz.vat", f.vat)) + field("SDI code or PEC", inp("c.biz.sdi", f.sdi)) + "</div>" +
    '<div class="grid2">' + field("Billing email", inp("c.biz.email", f.email, 'type="email"')) + field("Business phone", inp("c.biz.phone", f.phone, 'type="tel"')) + "</div>" +
    '<button class="btn">' + (on ? "Save business details" : "Switch to business") + "</button></form>";
  if (!on) return h + "</div>";
  var sub = acc.subscription, plan = sub ? byId(S.plans, sub.planId) : null, active = activeSub(acc);
  h += '<div class="card"><div class="row between"><b>Delivery plan</b>' + (sub ? '<span class="chip ' + (sub.status === "active" ? "s-ok" : "s-bad") + '">' + esc(sub.status === "past_due" ? "Payment failed" : sub.status) + "</span>" : "") + "</div>";
  if (active && plan) {
    h += "<span><b>" + esc(plan.name) + "</b> · " + eur(plan.price) + "/month</span>" + usageBar(subUsage(acc), plan.allowance) +
      '<span class="muted">' + (sub.cancelAtEnd ? "Ends on " + dmy(sub.renewsAt) + ". You can keep using it until then." : "Renews " + dmy(sub.renewsAt)) + "</span>" +
      '<span class="muted">Covers: ' + esc((plan.categories || []).map(cLabel).join(", ")) + ". Over the allowance: " + eur(plan.overageFee) + " per delivery.</span>" +
      '<div class="row wrap">' + (sub.cancelAtEnd ? '<button class="btn ghost sm" data-act="c-sub-resume">Keep my plan</button>' : '<button class="btn danger sm" data-act="c-sub-cancel">Cancel plan</button>') + "</div>";
  } else if (sub && sub.status === "past_due") {
    h += "<span>Your last payment for " + esc(plan ? plan.name : "your plan") + ' didn\'t go through.</span><button class="btn sm" data-act="c-sub-retry">Retry payment</button>';
  } else h += '<span class="muted">No plan. You pay for each delivery, and can add it to a monthly invoice.</span>';
  h += "</div>";
  var plans = S.plans.filter(function (p) { return p.active !== false; }).sort(function (a, b) { return a.price - b.price; });
  h += '<div class="sec-h"><h3>' + (active ? "Change plan" : "Available plans") + "</h3></div>";
  h += plans.length ? '<div class="plans">' + plans.map(function (p) {
    var cur = active && plan && plan.id === p.id;
    return '<div class="card plan ' + (cur ? "on" : "") + '"><b>' + esc(p.name) + '</b><span class="price-big">' + eur(p.price) + '<small>/month</small></span><span>' + p.allowance + " deliveries a month</span>" +
      '<ul class="notes"><li>Covers ' + esc((p.categories || []).map(cLabel).join(", ")) + "</li><li>Over the allowance: " + eur(p.overageFee) + " each</li>" + (p.bulk ? "<li>Bulk deliveries by CSV or Excel</li>" : "") + (p.desc ? "<li>" + esc(p.desc) + "</li>" : "") + "</ul>" +
      (cur ? '<span class="chip s-ok">Your plan</span>' : '<button class="btn sm" data-act="c-sub-pick" data-v="' + esc(p.id) + '">' + (active ? (p.price > plan.price ? "Upgrade" : "Switch") : "Subscribe") + "</button>") + "</div>";
  }).join("") + "</div>" : '<p class="muted">DART hasn\'t published any plans yet.</p>';
  return h + "</div>";
}
FORMS["c-biz"] = function () {
  var f = S.c.biz, acc = me(); if (!clip(f.name, 80)) return toast("Enter your business name.");
  var b = Object.assign({}, acc.business || {}, { active: true, name: clip(f.name, 80), address: clip(f.address, 140), vat: clip(f.vat, 20), sdi: clip(f.sdi, 80), email: slugEmail(f.email), phone: clip(f.phone, 30) });
  if (!b.activatedAt) { b.activatedAt = Date.now(); b.verified = false; }
  var first = !(acc.business && acc.business.active);
  run(Store.update("accounts", acc.id, { business: b, type: "business" }), first ? "You're now a business account. Choose a plan below." : "Business details saved");
};
ACT["c-sub-pick"] = function (d) {
  var p = byId(S.plans, d.v), acc = me(); if (!p) return;
  var card = (acc.cards || []).filter(function (k) { return k.def; })[0] || (acc.cards || [])[0] || { brand: "Visa", last4: "4242" };
  S.modal = { kind: "confirm", title: (activeSub(acc) ? "Switch to " : "Subscribe to ") + p.name + "?", body: eur(p.price) + " a month for " + p.allowance + " deliveries, charged to " + card.brand + " •• " + card.last4 + " today and every month until you cancel." + (activeSub(acc) ? " Your new allowance starts today." : ""), yes: "Pay " + eur(p.price), act: "c-sub-yes", v: p.id }; render();
};
function startPeriod(acc, plan, label) {
  var now = Date.now(), end = now + 30 * 864e5;
  var sub = { planId: plan.id, status: "active", startedAt: (acc.subscription && acc.subscription.startedAt) || now, periodStart: now, renewsAt: end, cancelAtEnd: false };
  var invId = "I-" + rid(8), inv = subscriptionInvoice(acc, plan, { from: now, to: end }, plan.price, label);
  return Store.update("accounts", acc.id, { subscription: sub }).then(function () { return Store.set("invoices", invId, inv); });
}
ACT["c-sub-yes"] = function (d) { var p = byId(S.plans, d.v), acc = me(); S.modal = null; if (p && acc) run(startPeriod(acc, p), "You're on the " + p.name + " plan"); };
ACT["c-sub-cancel"] = function () { var acc = me(); S.modal = { kind: "confirm", title: "Cancel your plan?", body: "It stays active until " + dmy(acc.subscription.renewsAt) + ". After that you pay per delivery.", yes: "Cancel plan", act: "c-sub-cancel-yes" }; render(); };
ACT["c-sub-cancel-yes"] = function () { var acc = me(); S.modal = null; run(Store.update("accounts", acc.id, { subscription: { cancelAtEnd: true } }), "Your plan will end on " + dmy(acc.subscription.renewsAt)); };
ACT["c-sub-resume"] = function () { var acc = me(); run(Store.update("accounts", acc.id, { subscription: { cancelAtEnd: false } }), "Your plan will renew as normal"); };
ACT["c-sub-retry"] = function () { var acc = me(), p = byId(S.plans, acc.subscription.planId); if (p) run(startPeriod(acc, p, p.name + " plan, payment retried"), "Payment went through. Your plan is active."); };
// Renew or end the plan when its period is over (the full system does this on the server).
function checkRenewal(acc) {
  var s = acc && acc.subscription; if (!s || s.status !== "active" || Date.now() < s.renewsAt || checkRenewal.done === acc.id) return;
  checkRenewal.done = acc.id;
  var p = byId(S.plans, s.planId);
  if (s.cancelAtEnd || !p || p.active === false) Store.update("accounts", acc.id, { subscription: { status: "cancelled" } }).catch(fail);
  else startPeriod(acc, p, p.name + " plan renewal").then(function () { toast("Your " + p.name + " plan renewed"); }, fail);
}

// ---------- Bulk deliveries ----------
var BULK_COLS = ["pickup_area", "pickup_street", "dropoff_area", "dropoff_street", "item_type", "description", "length_cm", "width_cm", "height_cm", "weight_kg", "quantity", "dropoff_notes"];
function cBulk(acc) {
  var plan = subPlan(acc), b = S.c.bulk;
  var h = (isWeb() ? '<h1 class="w-title">Bulk deliveries</h1>' : head("Bulk deliveries", "account")) + '<div class="pad">';
  if (!plan || !plan.bulk) return h + '<div class="card"><b>Bulk deliveries come with selected plans</b><span>Choose a plan with bulk deliveries to upload many orders at once.</span><button class="btn sm" data-act="c-go" data-v="business">See plans</button></div></div>';
  h += '<div class="card"><b>Upload a list</b><span class="muted">One delivery per row. Columns: ' + BULK_COLS.join(", ") + '. Item type is letter, document, parcel, furniture or other. Areas must match DART\'s list of Rome areas.</span>' +
    '<div class="row wrap"><label class="btn ghost sm file-mini">Choose CSV or Excel file<input type="file" accept=".csv,.xlsx,.xls,text/csv" data-file="bulk"></label><button class="btn ghost sm" data-act="c-bulk-template">Download template</button><button class="btn ghost sm" data-act="c-bulk-sample">Fill with sample rows</button></div>' +
    field("Or paste rows", txt("c.bulk.text", b.text, 'rows="6" placeholder="' + BULK_COLS.join(",") + '"')) + '<button class="btn" data-act="c-bulk-check">Check rows</button></div>';
  if (b.rows) {
    var ok = b.rows.filter(function (r) { return r.ok; }), total = ok.reduce(function (s, r) { return s + r.amount; }, 0);
    h += '<div class="card"><div class="row between"><b>' + ok.length + " of " + b.rows.length + ' rows ready</b><b class="num">' + eur(total) + '</b></div><div class="tbl"><table><thead><tr><th>#</th><th>Route</th><th>Item</th><th>Price</th><th>Status</th></tr></thead><tbody>' +
      b.rows.map(function (r, i) { return "<tr><td>" + (i + 1) + "</td><td>" + esc(r.pickup.area) + " → " + esc(r.dropoff.area) + "</td><td>" + esc(r.ok ? r.cls.label : r.item.type) + '</td><td class="num">' + (r.ok ? eur(r.amount) : "—") + "</td><td>" + (r.ok ? '<span class="chip s-ok">' + esc(r.note) + "</span>" : '<span class="warn-t">' + esc(r.err) + "</span>") + "</td></tr>"; }).join("") +
      "</tbody></table></div>" + (ok.length ? '<button class="btn block" data-act="c-bulk-go"' + (busy ? " disabled" : "") + ">Book " + ok.length + " deliveries</button>" : "") + "</div>";
  }
  return h + "</div>";
}
function parseCSV(text) {
  var rows = [], row = [], cur = "", q = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === "," || ch === ";" || ch === "\t") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
}
function areaMatch(s) { s = String(s || "").trim().toLowerCase(); return AREA_NAMES.filter(function (a) { return a.toLowerCase() === s; })[0] || ""; }
function bulkCheck(grid) {
  var acc = me(), start = 0;
  if (grid.length && String(grid[0][0]).toLowerCase().indexOf("pickup") >= 0) start = 1;
  var plan = subPlan(acc), left = plan ? Math.max(0, plan.allowance - subUsage(acc)) : 0;
  S.c.bulk.rows = grid.slice(start, start + 50).map(function (c) {
    var r = { pickup: { area: areaMatch(c[0]), street: clip(c[1], 80), notes: "" }, dropoff: { area: areaMatch(c[2]), street: clip(c[3], 80), notes: clip(c[11], 160) }, item: { type: String(c[4] || "parcel").trim().toLowerCase(), desc: clip(c[5], 120), l: c[6], w: c[7], h: c[8], kg: c[9], qty: Math.max(1, Math.round(num(c[10], 1))), photos: [], options: {} } };
    if (!r.pickup.area || !r.dropoff.area) { r.err = "Unknown area"; return r; }
    if (!r.pickup.street || !r.dropoff.street) { r.err = "Missing street"; return r; }
    if (!ITEM_TYPES.some(function (t) { return t.id === r.item.type; })) { r.err = "Unknown item type"; return r; }
    var cls = classify(r.item); if (!cls.ok) { r.err = cls.msg.split(".")[0]; return r; }
    var q = quote(r.pickup.area, r.dropoff.area, r.item, cls, acc), covered = plan && (plan.categories || []).indexOf(cls.category) >= 0;
    r.ok = true; r.cls = cls; r.q = q;
    if (covered && left > 0) { left--; r.amount = 0; r.billing = { method: "subscription", amount: 0, status: "included", planId: plan.id, planName: plan.name, included: true }; r.note = "In plan"; }
    else { r.amount = covered ? num(plan.overageFee, q.total) : q.total; r.billing = covered ? { method: "subscription", amount: r.amount, status: "to_invoice", planId: plan.id, planName: plan.name, included: false } : { method: "invoice", amount: r.amount, status: "to_invoice" }; r.note = covered ? "Over allowance" : "Invoiced"; }
    return r;
  });
  render();
}
ACT["c-bulk-check"] = function () { bulkCheck(parseCSV(S.c.bulk.text || "")); };
ACT["c-bulk-sample"] = function () {
  S.c.bulk.text = BULK_COLS.join(",") + "\nMonti,Via Panisperna 41,Prati,Via Cola di Rienzo 212,document,Signed contracts,,,,,1,Reception desk\nTestaccio,Via Marmorata 30,EUR,Viale Europa 100,parcel,Stationery order,40,30,25,6,2,Loading bay\nSan Lorenzo,Via dei Volsci 12,Trastevere,Via della Lungaretta 90,parcel,Coffee beans,50,40,30,14,1,Leave with barista\nPigneto,Via del Pigneto 50,Parioli,Viale Parioli 30,furniture,Display shelf,180,40,35,32,1,Ring Rossi";
  render();
};
ACT["c-bulk-template"] = function () {
  if (!Caps.downloads) return toast("Downloads aren't available in this view. Use 'Fill with sample rows' instead.");
  Caps.downloads.save({ filename: "dart-bulk-template.csv", data: BULK_COLS.join(",") + "\nMonti,Via Panisperna 41,Prati,Via Cola di Rienzo 212,parcel,Box of books,40,30,30,8,1,Buzzer 4\n" }).catch(function (e) { if (e && e.code !== "declined") toast("The template couldn't be saved here."); });
};
FILES["bulk"] = function (file) {
  if (/\.xlsx?$/i.test(file.name)) {
    loadXLSX().then(function (X) {
      return file.arrayBuffer().then(function (buf) { var wb = X.read(buf, { type: "array" }); var ws = wb.Sheets[wb.SheetNames[0]]; bulkCheck(X.utils.sheet_to_json(ws, { header: 1, defval: "" })); });
    }).catch(function () { toast("That Excel file couldn't be read. Save it as CSV and try again."); });
  } else file.text().then(function (t) { S.c.bulk.text = t.slice(0, 20000); bulkCheck(parseCSV(t)); });
};
var xlsxP = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!xlsxP) xlsxP = new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = function () { res(window.XLSX); }; s.onerror = rej; document.head.appendChild(s); });
  return xlsxP;
}
ACT["c-bulk-go"] = function () {
  var acc = me(), rows = (S.c.bulk.rows || []).filter(function (r) { return r.ok; }); if (!rows.length || busy) return;
  var now = Date.now(), batch = "B-" + rid(5);
  var p = rows.reduce(function (pr, r, i) {
    return pr.then(function () {
      var id = "DRT-" + rid(3) + "-" + rid(3);
      return Store.set("orders", id, {
        customer: { id: acc.id, name: acc.name, business: true, businessName: acc.business.name }, pickup: r.pickup, dropoff: r.dropoff,
        item: { type: r.item.type, desc: r.item.desc, qty: r.item.qty, l: num(r.item.l, 0), w: num(r.item.w, 0), h: num(r.item.h, 0), kg: num(r.item.kg, 0), photos: [], options: {} },
        cls: r.cls, price: r.q, billing: r.billing, status: "awaiting", createdAt: now + i, timeline: { requested: now, awaiting: now }, batch: batch
      });
    });
  }, Promise.resolve());
  run(p.then(function () { S.c.bulk = { text: "", rows: null }; S.c.view = "deliveries"; S.c.listTab = "active"; }), rows.length + " deliveries booked");
};

// ---------- Help and support ----------
var FAQ = [
  ["What can DART carry?", "Letters, documents, parcels of every size, furniture and large items. When you add measurements and photos, DART tells you if it fits and which vehicle is needed before you pay."],
  ["How is the price worked out?", "By distance between pickup and delivery, with a minimum fee. Size, weight, number of items, the vehicle needed and extra services like stairs or assembly are added on top. You see the full breakdown before you book."],
  ["Can I cancel?", "Yes, free of charge until the courier collects the item. Card payments are refunded in full."],
  ["Do I need a business account for invoices?", "No. Every delivery gets an invoice. Business features add your company details, monthly invoicing and optional plans."],
  ["How do business plans work?", "You pay a monthly fee for a set number of deliveries. Deliveries over the allowance, or types the plan doesn't cover, are charged separately and shown before you confirm."]
];
function cHelp(acc) {
  var t = S.c.ticket, mine = S.tickets.filter(function (x) { return x.accountId === acc.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
  return (isWeb() ? '<h1 class="w-title">Help and support</h1>' : head("Help", "account")) + '<div class="pad"><div class="faq">' + FAQ.map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + "</div>" +
    '<form class="card" data-form="c-ticket"><b>Contact DART support</b>' + field("Topic", sel("c.ticket.topic", t.topic, [["delivery", "A delivery"], ["payment", "Payment or invoice"], ["courier", "A courier"], ["account", "My account"], ["other", "Something else"]])) +
    field("Delivery (optional)", sel("c.ticket.orderId", t.orderId, [["", "None"]].concat(myOrders().slice(0, 20).map(function (o) { return [o.id, o.id + " · " + o.pickup.area + " → " + o.dropoff.area]; })))) +
    field("Message", txt("c.ticket.text", t.text, 'rows="4" maxlength="1000" required')) + '<button class="btn">Send</button>' + (settings().supportEmail ? '<span class="muted sm">Or email ' + esc(settings().supportEmail) + "</span>" : "") + "</form>" +
    (mine.length ? '<div class="sec-h"><h3>Your requests</h3></div>' + mine.map(ticketCard).join("") : "") + "</div>";
}
function ticketCard(t) {
  return '<div class="card"><div class="row between"><b>' + esc(t.subject || t.topic) + '</b><span class="chip ' + (t.status === "open" ? "s-warn" : "s-ok") + '">' + esc(t.status) + '</span></div><span class="muted sm">' + when(t.createdAt) + (t.orderId ? " · " + esc(t.orderId) : "") + "</span><p>" + esc(t.text) + "</p>" +
    (t.replies || []).map(function (r) { return '<div class="reply ' + (r.by === "admin" ? "staff" : "") + '"><small>' + (r.by === "admin" ? "DART support" : "You") + " · " + when(r.at) + "</small><p>" + esc(r.text) + "</p></div>"; }).join("") + "</div>";
}
FORMS["c-ticket"] = function () {
  var t = S.c.ticket, acc = me(), text = clip(t.text, 1000); if (!text) return toast("Write a message first.");
  var labels = { delivery: "Delivery question", payment: "Payment or invoice", courier: "About a courier", account: "Account", other: "Other" };
  S.c.ticket = { topic: "delivery", orderId: "", text: "" };
  run(Store.set("tickets", "T-" + rid(6), { from: "customer", accountId: acc.id, name: acc.name, orderId: t.orderId || null, topic: t.topic, subject: labels[t.topic], text: text, status: "open", replies: [], createdAt: Date.now() }), "Sent. DART support will reply here.");
};

// ---------- Track a delivery (no account needed) ----------
function cTrack(acc) {
  var t = S.c.trk, web = isWeb();
  var local = S.me.guestOrders.map(function (id) { return byId(S.orders, id); }).filter(Boolean);
  var h = (web ? '<h1 class="w-title">Track a delivery</h1>' : (acc ? head("Track a delivery", "home") : '<div class="app-head"><span class="logo"><svg><use href="#mark"/></svg>DART</span><h2></h2><button class="btn ghost sm" data-act="c-auth-open" data-v="login">Log in</button></div>')) + '<div class="pad"' + (web ? ' style="max-width:640px"' : "") + ">";
  h += '<form class="card" data-form="c-track"><b>' + (web ? "Enter your tracking code" : "Track a delivery") + '</b><span class="muted sm">You\'ll find the code in your booking confirmation. It looks like DRT-ABC-123.</span>' +
    field("Tracking code", inp("c.trk.code", t.code, 'autocomplete="off" spellcheck="false" placeholder="DRT-ABC-123" required style="text-transform:uppercase"')) +
    (acc ? "" : field("Email used to book", inp("c.trk.email", t.email, 'type="email" autocomplete="email" required'))) + '<button class="btn">Track</button></form>';
  if (local.length) h += '<div class="sec-h"><h3>Booked on this device</h3></div><div class="list">' + local.map(orderRow).join("") + "</div>";
  if (acc) h += '<p class="muted sm">Your own deliveries are always in <button class="link" data-act="c-go" data-v="deliveries">Deliveries</button>.</p>';
  else h += '<div class="card"><b>Want your history in one place?</b><span class="muted sm">Create a free account with the same email and your earlier deliveries are added to it.</span><button class="btn ghost sm" data-act="c-auth-open" data-v="register">Create an account</button></div>';
  return h + "</div>";
}
FORMS["c-track"] = function () {
  var t = S.c.trk, acc = me(), code = clip(t.code, 20).toUpperCase().replace(/\s+/g, "");
  var o = byId(S.orders, code);
  var ok = o && ((acc && o.customer.id === acc.id) || (o.customer.email && slugEmail(o.customer.email) === slugEmail(t.email)));
  if (!ok) return toast(o ? "That email doesn't match this delivery." : "We couldn't find a delivery with that code.");
  if (o.customer.guest) { S.me.guestOrders = [o.id].concat(S.me.guestOrders.filter(function (x) { return x !== o.id; })).slice(0, 30); saveMe(); }
  S.c.order = o.id; S.c.view = "order"; render();
};


// ---------- Phone home: a full map with a sheet over it ----------
var MAP_PIN = { awaiting: "Searching", assigned: "To pickup", to_pickup: "To pickup", at_pickup: "At pickup", collected: "Collected", at_dest: "Arrived", issue: "Issue" };
function cMapHome(acc) {
  var orders = acc ? myOrders() : S.me.guestOrders.map(function (id) { return byId(S.orders, id); }).filter(Boolean);
  var active = orders.filter(isActive), hq = S.c.hq, st = settings();
  var x = hq.from && hq.to ? typicalQuote(hq.type, hq.from, hq.to) : null;
  var routes = active.map(function (o) { return Object.assign({ from: o.pickup.area, to: o.dropoff.area, thin: active.length > 1 }, courierPos(o)); });
  var pins = active.map(function (o) {
    var moving = o.status === "in_transit", pos = courierPos(o);
    return { area: moving || o.status === "at_dest" ? o.dropoff.area : o.pickup.area, text: moving ? Math.max(1, Math.round((o.price.mins - 10) * (1 - (pos.t || 0)))) + " min" : tr(MAP_PIN[o.status] || "") };
  });
  if (!active.length && x) { routes = [{ from: hq.from, to: hq.to }]; pins = [{ area: hq.to, text: eur(x.q.total) }]; }
  var title = active.length === 1 ? STATUS[active[0].status] : active.length > 1 ? active.length + " deliveries in progress" : "What are we sending today?";
  var h = '<div class="mh"><div class="mh-map">' + mapSVG({ vb: "-40 -200 440 1000", routes: routes, pins: pins }) + "</div>" +
    '<div class="mh-top"><span class="mh-chip"><svg><use href="#mark"/></svg>DART</span>' +
    (acc ? '<button class="mh-chip icon" data-act="c-go" data-v="notes" aria-label="Notifications"><svg><use href="#t-bell"/></svg>' + (custUnseen() ? '<span class="badge">' + custUnseen() + "</span>" : "") + "</button>" : '<button class="mh-chip" data-act="c-auth-open" data-v="login">Log in</button>') + "</div>" +
    '<div class="mh-title"><p>' + (acc ? "Hi " + esc(acc.name.split(" ")[0]) : "Same-day delivery in Rome") + "</p><h1>" + esc(title) + "</h1></div>";
  h += '<div class="mh-sheet"><div class="grab" aria-hidden="true"></div>';
  if (st.open === false) h += '<div class="banner bad">DART is closed right now. You can book again when we reopen.</div>';
  else if (st.banner) h += '<div class="banner">' + esc(st.banner) + "</div>";
  if (active.length) h += '<div class="list">' + active.slice(0, 3).map(orderRow).join("") + "</div>";
  h += '<div class="mh-q"><div class="grid2">' + field("From", sel("c.hq.from", hq.from, [["", "Pickup area"]].concat(AREA_NAMES), 'data-live="1"')) + field("To", sel("c.hq.to", hq.to, [["", "Delivery area"]].concat(AREA_NAMES), 'data-live="1"')) + "</div>" +
    '<div class="mh-types" role="radiogroup" aria-label="What are you sending">' + Object.keys(TYPICAL).map(function (k) { var on = hq.type === k; return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? "on" : "") + '" data-act="w-hq-type" data-v="' + k + '">' + TYPICAL[k].label.split(" and")[0] + "</button>"; }).join("") + "</div>" +
    '<div class="row between"><div><span class="mh-price">' + (x ? eur(x.q.total) : "from " + eur(pricing().minFee)) + '</span><span class="muted sm">' + (x ? x.q.km.toFixed(1) + " km · about " + x.q.mins + " min" : "Pick two areas to see a price") + '</span></div><button class="btn" data-act="w-hq-book">Continue</button></div></div>';
  h += acc ? '<div class="quick"><button data-act="c-go" data-v="deliveries"><b>Deliveries</b><span>' + orders.length + " total</span></button><button data-act=\"c-go\" data-v=\"invoices\"><b>Invoices</b><span>" + myInvoices().length + " total</span></button></div>"
    : '<div class="quick"><button data-act="c-go" data-v="track"><b>Track a delivery</b><span>Code and email</span></button><button data-act="c-auth-open" data-v="register"><b>Create an account</b><span>History and invoices</span></button></div>';
  return h + "</div></div>";
}
