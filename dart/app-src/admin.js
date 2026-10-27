// ===== DART admin portal =====
S.a = { tab: "dash", q: "", status: "active", invKind: "all", invStatus: "all", tStatus: "open", rulesDraft: null, pricingDraft: null, settingsDraft: null, plan: null, preview: { from: "Monti", to: "Prati", cat: "medium" }, docs: {}, reply: "", decision: "", confirmClear: false };
var A_NAV = [["dash", "Dashboard"], ["deliveries", "Deliveries"], ["customers", "Customers"], ["couriers", "Couriers"], ["rules", "Vehicles and items"], ["pricing", "Pricing"], ["plans", "Plans"], ["discounts", "Discounts"], ["invoices", "Invoices"], ["payments", "Payments"], ["support", "Support"], ["reports", "Reports"], ["settings", "Settings"]];

function aCounts() {
  return {
    deliveries: S.orders.filter(function (o) { return o.status === "issue" || (o.issue && o.issue.open); }).length,
    couriers: S.couriers.filter(function (c) { return c.status === "pending" || c.vehicleStatus === "pending"; }).length,
    support: S.tickets.filter(function (t) { return t.status === "open"; }).length,
    invoices: S.invoices.filter(function (i) { return i.status === "outstanding"; }).length
  };
}
function adminApp() {
  var n = aCounts(), t = S.a.tab, main;
  switch (t) {
    case "deliveries": main = aDeliveries(); break;
    case "customers": main = aCustomers(); break;
    case "couriers": main = aCouriers(); break;
    case "rules": main = aRules(); break;
    case "pricing": main = aPricing(); break;
    case "plans": main = aPlans(); break;
    case "invoices": main = aInvoices(); break;
    case "payments": main = aPayments(); break;
    case "discounts": main = aDiscounts(); break;
    case "support": main = aSupport(); break;
    case "reports": main = aReports(); break;
    case "settings": main = aSettings(); break;
    default: main = aDash();
  }
  return '<div class="admin"><nav class="a-side" aria-label="Admin"><span class="logo"><svg><use href="#mark"/></svg>DART <small>Admin</small></span>' +
    A_NAV.map(function (x) { return '<button class="' + (t === x[0] ? "on" : "") + '" data-act="a-tab" data-v="' + x[0] + '">' + x[1] + (n[x[0]] ? "<span>" + n[x[0]] + "</span>" : "") + "</button>"; }).join("") +
    (LIVE ? '<a href="#web">← DART website</a>' : '<a href="#home">← All apps</a>') + '</nav><div class="a-main" data-scroll="a-' + t + '">' + main + "</div></div>";
}
ACT["a-tab"] = function (d) { S.a.tab = d.v; S.a.q = ""; S.a.confirmClear = false; closeChat(); render(); };
function aHead(title, right) { return '<div class="row between wrap"><h1>' + title + '</h1><div class="row wrap">' + (right || "") + modeChip() + "</div></div>"; }
function kpi(label, val, sub) { return '<div class="kpi"><small>' + label + "</small><b>" + val + "</b>" + (sub ? "<em>" + sub + "</em>" : "") + "</div>"; }
function search(ph) { return '<input class="input search" type="search" data-bind="a.q" data-live="1" value="' + esc(S.a.q) + '" placeholder="' + ph + '" aria-label="Search">'; }
function matchQ(s) { var q = S.a.q.trim().toLowerCase(); return !q || String(s).toLowerCase().indexOf(q) >= 0; }
function segBtns(key, val, opts) { return '<div class="seg inline">' + opts.map(function (o) { return '<button class="' + (val === o[0] ? "on" : "") + '" data-act="a-set" data-k="' + key + '" data-v="' + o[0] + '">' + o[1] + "</button>"; }).join("") + "</div>"; }
ACT["a-set"] = function (d) { S.a[d.k] = d.v; render(); };
function paidInv(kind) { return S.invoices.filter(function (i) { return i.status === "paid" && (!kind || i.kind === kind); }); }
function sumT(l) { return l.reduce(function (s, i) { return s + (+i.total || 0); }, 0); }
function onlineCouriers() { return S.couriers.filter(function (c) { return c.status === "approved" && c.online; }); }

// ---------- Dashboard ----------
function aDash() {
  var act = S.orders.filter(isActive), done = S.orders.filter(function (o) { return o.status === "delivered"; }), canc = S.orders.filter(function (o) { return o.status === "cancelled"; });
  var outstanding = S.invoices.filter(function (i) { return i.status === "outstanding"; });
  var events = [];
  S.orders.forEach(function (o) { Object.keys(o.timeline || {}).filter(function (k) { return k !== "requested"; }).forEach(function (k) { events.push({ at: o.timeline[k], text: STATUS[k] + " · " + o.id, sub: o.pickup.area + " → " + o.dropoff.area, id: o.id }); }); });
  S.accounts.forEach(function (a) { events.push({ at: a.createdAt, text: "New customer: " + a.name, sub: a.business && a.business.active ? "Business" : "Individual", cust: a.id }); });
  S.couriers.forEach(function (c) { events.push({ at: c.createdAt, text: "Courier application: " + c.name, sub: vLabel(c.vehicle && c.vehicle.type), cour: c.id }); });
  events.sort(function (a, b) { return b.at - a.at; });
  var issues = S.orders.filter(function (o) { return o.status === "issue" || (o.issue && o.issue.open); });
  var risky = S.orders.map(function (o) { return { o: o, why: riskOf(o) }; }).filter(function (x) { return x.why; }).sort(function (a, b) { return a.o.deliverBy - b.o.deliverBy; });
  var n = aCounts();
  var h = aHead("Dashboard") + '<div class="kpis">' +
    kpi("Customers", S.accounts.length, S.accounts.filter(function (a) { return a.business && a.business.active; }).length + " business · " + S.orders.filter(function (o) { return o.customer.guest; }).length + " guest bookings") +
    kpi("Couriers", S.couriers.filter(function (c) { return c.status === "approved"; }).length, onlineCouriers().length + " online now") +
    kpi("Registered vehicles", S.couriers.filter(function (c) { return c.vehicle; }).length, n.couriers ? n.couriers + " waiting for approval" : "") +
    kpi("Active deliveries", act.length, S.orders.filter(function (o) { return o.status === "awaiting"; }).length + " awaiting courier") +
    kpi("Completed", done.length, canc.length + " cancelled") +
    (function () {
      var wk = Date.now() - 7 * 864e5, recent = done.filter(function (o) { return o.timeline.delivered >= wk && o.deliverBy; });
      var onTime = recent.filter(function (o) { return o.timeline.delivered <= o.deliverBy; }).length, avg = recent.length ? recent.reduce(function (s, o) { return s + (o.timeline.delivered - o.createdAt); }, 0) / recent.length / 60000 : 0;
      return kpi("Delivered on time", recent.length ? Math.round(onTime / recent.length * 100) + "%" : "–", "Last 7 days · " + recent.length + " deliveries") + kpi("Average delivery time", recent.length ? minsText(avg) : "–", "Booking to door · target under " + hoursText());
    })() +
    kpi("Delivery revenue", eur(sumT(paidInv("delivery"))), "") + kpi("Subscription revenue", eur(sumT(paidInv("subscription"))), S.accounts.filter(activeSub).length + " active plans") +
    kpi("Outstanding", eur(sumT(outstanding)), outstanding.length + " invoices") + "</div>";
  h += '<div class="a-cols"><div class="panel"><div class="panel-h">Live map<span class="muted sm">' + act.length + " active · " + onlineCouriers().length + " couriers online</span></div><div class=\"map map-lg\">" +
    mapSVG({ routes: act.map(function (o) { return Object.assign({ from: o.pickup.area, to: o.dropoff.area, fromLL: o.pickup.ll, toLL: o.dropoff.ll, vehicle: o.courier && o.courier.vehicle, thin: true }, courierPos(o)); }), dots: onlineCouriers().filter(function (c) { return c.area; }).map(function (c, i) { return { area: c.area, ll: c.pos ? [c.pos.lat, c.pos.lng] : null, dx: (i % 3) * 6 - 6, dy: -10, color: "var(--ok)" }; }) }) + "</div></div>";
  h += '<div class="stack">';
  if (risky.length) h += '<div class="panel risk"><div class="panel-h">Running late <span class="muted sm">Deliveries that may miss their deliver-by time</span></div><div class="list pad-s">' + risky.map(function (x) {
    var o = x.o; return '<button class="item" data-act="a-order" data-v="' + esc(o.id) + '"><b>' + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + '</b><span class="chip ' + (x.why === "Late" ? "s-bad" : "s-warn") + '">' + esc(x.why) + "</span><small>" + esc(o.id) + " · due " + hhmm(o.deliverBy) + " · " + leftLabel(o.deliverBy) + "</small><small>" + esc(o.courier ? o.courier.name : "No courier") + "</small></button>";
  }).join("") + "</div></div>";
  h += '<div class="panel"><div class="panel-h">Needs attention</div><div class="list pad-s">' +
    (issues.map(function (o) { return '<button class="item" data-act="a-order" data-v="' + esc(o.id) + '"><b>Delivery issue · ' + esc(o.id) + '</b><span class="chip s-bad">' + esc(o.issue ? o.issue.reason : "Issue") + "</span><small>" + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + "</small><small>" + when(o.issue && o.issue.at) + "</small></button>"; }).join("") +
      S.couriers.filter(function (c) { return c.status === "pending"; }).map(function (c) { return '<button class="item" data-act="a-courier" data-v="' + esc(c.id) + '"><b>Courier to approve: ' + esc(c.name) + '</b><span class="chip s-warn">Pending</span><small>' + esc(vLabel(c.vehicle.type)) + "</small><small>" + when(c.createdAt) + "</small></button>"; }).join("") +
      S.couriers.filter(function (c) { return c.vehicleStatus === "pending"; }).map(function (c) { return '<button class="item" data-act="a-courier" data-v="' + esc(c.id) + '"><b>Vehicle change: ' + esc(c.name) + '</b><span class="chip s-warn">Review</span><small>' + esc(vLabel(c.vehicle.type)) + " → " + esc(vLabel(c.pendingVehicle && c.pendingVehicle.type)) + "</small><small></small></button>"; }).join("") +
      S.tickets.filter(function (t) { return t.status === "open"; }).slice(0, 5).map(function (t) { return '<button class="item" data-act="a-ticket" data-v="' + esc(t.id) + '"><b>Support: ' + esc(t.subject) + '</b><span class="chip s-warn">' + esc(t.from) + "</span><small>" + esc(t.name) + "</small><small>" + when(t.createdAt) + "</small></button>"; }).join("") || '<p class="muted pad-s">Nothing needs you right now.</p>') + "</div></div>";
  h += '<div class="panel"><div class="panel-h">Recent activity</div><div class="list pad-s">' + (events.slice(0, 8).map(function (e) { return '<button class="item" data-act="' + (e.id ? "a-order" : e.cust ? "a-customer" : "a-courier") + '" data-v="' + esc(e.id || e.cust || e.cour) + '"><b>' + esc(e.text) + "</b><small>" + when(e.at) + "</small><small>" + esc(e.sub || "") + "</small><small></small></button>"; }).join("") || '<p class="muted pad-s">No activity yet.</p>') + "</div></div>";
  return h + "</div></div>";
}

// ---------- Deliveries ----------
function aDeliveries() {
  var st = S.a.status, rows = S.orders.filter(function (o) {
    var ok = st === "all" ? true : st === "active" ? isActive(o) : st === "issues" ? o.status === "issue" || (o.issue && o.issue.open) : o.status === st;
    return ok && matchQ([o.id, o.customer.name, o.customer.businessName, o.pickup.area, o.dropoff.area, o.courier && o.courier.name, o.item.desc].join(" "));
  });
  var fin = S.orders.filter(function (o) { return o.status === "delivered" || o.status === "cancelled"; }).length;
  return aHead("Deliveries", search("Search reference, customer, courier, area")) +
    '<div class="row wrap">' + segBtns("status", st, [["active", "Active"], ["awaiting", "Awaiting courier"], ["issues", "Issues"], ["delivered", "Delivered"], ["cancelled", "Cancelled"], ["all", "All"]]) +
    (fin ? (S.a.confirmClear ? "<span>Remove " + fin + ' finished deliveries?</span><button class="btn danger sm" data-act="a-clear-yes">Remove</button><button class="btn ghost sm" data-act="a-set" data-k="confirmClear" data-v="">Keep</button>' : '<button class="btn ghost sm" data-act="a-set" data-k="confirmClear" data-v="1">Clear finished</button>') : "") + "</div>" +
    '<div class="panel">' + ordersTable(rows) + "</div>";
}
function ordersTable(rows) {
  if (!rows.length) return emptyState("No deliveries here", "Bookings from the customer app and website appear here instantly.");
  return '<div class="tbl"><table><thead><tr><th>Ref</th><th>Created</th><th>Customer</th><th>Route</th><th>Item</th><th>Courier</th><th>Price</th><th>Payment</th><th>Status</th></tr></thead><tbody>' +
    rows.slice(0, 300).map(function (o) {
      return '<tr class="click" data-act="a-order" data-v="' + esc(o.id) + '"><td class="mono sm">' + esc(o.id) + "</td><td>" + when(o.createdAt) + "</td><td>" + esc(o.customer.businessName || o.customer.name) + (o.customer.guest ? ' <span class="muted sm">guest</span>' : "") + "</td><td>" + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + "</td><td>" + esc(cLabel(o.cls.category)) + "</td><td>" + esc(o.courier ? o.courier.name : "—") + '</td><td class="num">' + eur(o.billing ? o.billing.amount : o.price.total) + "</td><td>" + esc(o.billing ? o.billing.status : "") + "</td><td>" + chip(o.status) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
}
ACT["a-clear-yes"] = function () {
  var ids = S.orders.filter(function (o) { return o.status === "delivered" || o.status === "cancelled"; }).map(function (o) { return o.id; });
  S.a.confirmClear = false;
  run(ids.reduce(function (p, id) { return p.then(function () { return Store.del("orders", id); }); }, Promise.resolve()), ids.length + " deliveries removed");
};
ACT["a-order"] = function (d) { S.modal = { kind: "a-order", id: d.v, chat: false }; closeChat(); render(); };
function aOrderModal(m) {
  var o = byId(S.orders, m.id); if (!o) return modalShell("Delivery", emptyState("Delivery not found", ""));
  var acc = byId(S.accounts, o.customer.id), inv = o.invoiceId ? byId(S.invoices, o.invoiceId) : null;
  if (m.chat) return modalShell("Conversation · " + o.id, '<p class="muted sm">Opened by DART support for this reported delivery. Both people can see what support writes.</p>' + chatView(o, "admin", "DART support"), '<button class="btn ghost" data-act="a-order-back">Back to delivery</button>');
  var h = '<div class="a-detail"><div class="stack"><div class="row between">' + chip(o.status) + '<span class="mono">' + esc(o.id) + "</span></div>" + legs(o) +
    '<div class="map map-sm">' + mapSVG({ labels: false, routes: [Object.assign({ from: o.pickup.area, to: o.dropoff.area, fromLL: o.pickup.ll, toLL: o.dropoff.ll, vehicle: o.courier && o.courier.vehicle }, courierPos(o))] }) + "</div>" +
    '<div class="card"><b>Item</b><span>' + itemSummary(o) + "</span>" + (o.item.photos && o.item.photos.length ? '<div class="phs">' + photoStrip(o.item.photos) + "</div>" : '<span class="muted sm">No photos</span>') +
    '<dl class="kv">' + (o.deliverBy ? "<dt>Deliver by</dt><dd>" + esc(byLabel(o.deliverBy)) + (o.asap ? " (ASAP)" : "") + (o.late ? ' · <span class="bad-t">' + o.late.mins + " min late" + (o.late.decided ? (o.late.penalty ? ", late fee " + eur(o.late.penalty) : ", no fee") : ", not reviewed") + "</span>" : "") + "</dd>" : "") + '<dt>Classification</dt><dd>' + esc(cLabel(o.cls.category)) + " (from " + esc(o.cls.source) + ")</dd><dt>Eligible vehicles</dt><dd>" + esc((o.cls.vehicles || []).map(vLabel).join(", ")) + "</dd><dt>Couriers needed</dt><dd>" + o.cls.couriers + "</dd>" +
    (OPTIONS.filter(function (x) { return o.item.options && o.item.options[x.id]; }).length ? "<dt>Extras</dt><dd>" + esc(OPTIONS.filter(function (x) { return o.item.options[x.id]; }).map(function (x) { return x.label; }).join(", ")) + "</dd>" : "") + "</dl></div>" +
    '<div class="card"><b>Status history</b>' + timelineList(o) + "</div></div><div class=\"stack\">";
  h += o.customer.guest ? '<div class="card"><b>Customer</b><span>' + esc(o.customer.name) + ' <span class="chip s-pur">Guest</span></span><span class="muted sm">' + esc(o.customer.email) + (o.customer.phone ? " · " + esc(o.customer.phone) : "") + "</span></div>"
    : '<div class="card"><b>Customer</b><button class="link left" data-act="a-customer" data-v="' + esc(o.customer.id) + '">' + esc(o.customer.name) + (o.customer.businessName ? " · " + esc(o.customer.businessName) : "") + "</button>" + (acc ? '<span class="muted sm">' + esc(acc.email) + (acc.phone ? " · " + esc(acc.phone) : "") + "</span>" : "") + "</div>";
  if (o.courier) h += '<div class="card"><b>Courier</b><button class="link left" data-act="a-courier" data-v="' + esc(o.courier.id) + '">' + esc(o.courier.name) + "</button><span class=\"muted sm\">" + esc(vLabel(o.courier.vehicle)) + (o.courier.plate ? " · " + esc(o.courier.plate) : "") + " · earns " + eur(o.courierPay) + "</span></div>";
  if (o.status === "awaiting") {
    var el = S.couriers.filter(function (c) { return c.status === "approved" && eligible(c, o); }), f = liveOffer(o), fc = f && byId(S.couriers, f.to);
    var dec = (o.declinedBy || []).map(function (id) { var c = byId(S.couriers, id); return c ? c.name : id; });
    h += '<div class="card"><b>Courier offers</b><span>' + (fc ? "Offered to " + esc(fc.name) + ", " + Math.max(0, Math.ceil((f.until - Date.now()) / 1000)) + " s left to answer" : el.some(function (c) { return freeCourier(c); }) ? "Finding the next courier…" : "No courier is free right now. It's offered again when one comes online.") + "</span>" +
      (dec.length ? '<span class="muted sm">Declined or missed: ' + esc(dec.join(", ")) + "</span>" : "") +
      (el.length ? el.map(function (c) { var free = freeCourier(c), mine = f && f.to === c.id; return '<div class="row between"><span>' + esc(c.name) + ' <span class="muted sm">' + esc(vLabel(c.vehicle.type)) + (c.online ? (free || mine ? " · online" : " · busy") : " · offline") + (c.area ? " · " + esc(c.area) : "") + '</span></span>' + (mine ? '<span class="chip s-warn">Deciding</span>' : '<button class="btn sm ghost" data-act="a-assign" data-v="' + esc(c.id) + '"' + (free ? "" : " disabled") + ">Offer now</button>") + "</div>"; }).join("") : '<span class="muted">No approved courier has a vehicle that fits this item.</span>') + "</div>";
  }
  h += '<div class="card"><b>Price and payment</b>' + breakdown(o.price, o.billing && o.billing.method === "subscription" ? o.billing : null) + '<span class="muted sm">' + esc(payLabel(o.billing)) + " · " + esc(o.billing ? o.billing.status : "") + "</span>" + (inv ? '<button class="btn ghost sm" data-act="c-inv" data-v="' + esc(inv.id) + '">Invoice ' + esc(inv.number) + "</button>" : "") + "</div>";
  if (o.issue && (o.issue.open || o.status === "issue")) h += '<div class="card warn"><b>Issue reported by ' + esc(o.issue.by) + "</b><span>" + esc(o.issue.reason) + ": " + esc(o.issue.text) + '</span><div class="row wrap"><button class="btn sm" data-act="a-resolve" data-v="' + esc(o.id) + '">Mark resolved</button></div></div>';
  if (o.code && ACTIVE.indexOf(o.status) >= 0) h += '<div class="card"><b>Delivery code</b><span class="code-big">' + esc(o.code) + '</span><span class="muted sm">Give it to the courier only if the customer has confirmed by phone.</span></div>';
  if (o.pickupProof) h += '<div class="card"><b>Pickup photo</b>' + (safeImg(o.pickupProof.photo) ? '<img class="proof" src="' + safeImg(o.pickupProof.photo) + '" alt="Photo taken by the courier at pickup">' : "") + '<span class="muted sm">' + when(o.pickupProof.at) + "</span></div>";
  if (o.status === "delivered" && o.proof) h += '<div class="card"><b>Proof of delivery</b>' + (safeImg(o.proof.photo) ? '<img class="proof" src="' + safeImg(o.proof.photo) + '" alt="Delivery photo">' : "") + '<span class="muted sm">Received by ' + esc(o.proof.receiver) + (o.proof.codeOk ? " · code confirmed" : "") + "</span>" +
    (safeImg(o.proof.sig) ? '<img class="sig-img" src="' + safeImg(o.proof.sig) + '" alt="Signature">' : "") + "</div>";
  if (o.review || o.rating) h += '<div class="card"><b>Review: ' + (o.review ? o.review.stars : o.rating) + " ★</b>" + (o.review && o.review.text ? "<span>“" + esc(o.review.text) + "”</span>" : "") + (o.tip ? '<span class="muted sm">Tip ' + eur(o.tip.amount) + " to the courier</span>" : "") + "</div>";
  var reported = (o.issue && o.issue.ticket) || S.tickets.some(function (t) { return t.orderId === o.id; });
  h += '<div class="card"><b>Messenger</b>' + (reported ? '<span class="muted sm">This delivery has a report, so support can open the conversation.</span><button class="btn ghost sm" data-act="a-chat">Open conversation</button>' : '<span class="muted sm">Private between the customer and courier. Support can open it only when someone reports a problem.</span>') + "</div>";
  h += "</div></div>";
  var foot = isActive(o) && o.status !== "delivered" ? '<button class="btn danger" data-act="a-cancel" data-v="' + esc(o.id) + '">Cancel delivery</button>' : "";
  return modalShell("Delivery " + o.id, h, foot);
}
ACT["a-order-back"] = function () { closeChat(); S.modal.chat = false; render(); };
ACT["a-chat"] = function () { var o = byId(S.orders, S.modal.id); openChat(o.id); S.modal.chat = true; Store.update("orders", o.id, { adminViewed: { at: Date.now() } }).catch(function () { }); render(); };
// Admin can put a delivery in front of a specific courier; they still accept or decline it.
ACT["a-assign"] = function (d) {
  var c = byId(S.couriers, d.v), o = byId(S.orders, S.modal.id); if (!c || !o) return;
  var now = Date.now(), declined = (o.declinedBy || []).filter(function (id) { return id !== c.id; });
  run(Store.claim("orders", o.id, "admin", function (x) { return x.status === "awaiting"; }, { offer: { to: c.id, at: now, until: now + OFFER_SECS * 1000, byAdmin: true }, declinedBy: declined }).then(function (ok) { toast(ok ? "Offered to " + c.name : "It was already taken."); }));
};
ACT["a-resolve"] = function (d) {
  var o = byId(S.orders, d.v); if (!o) return;
  var patch = { issue: { open: false, resolvedAt: Date.now() } }; if (o.status === "issue") patch.status = o.issue.prev || "assigned";
  run(Store.update("orders", o.id, patch), "Issue marked resolved");
};
ACT["a-cancel"] = function (d) {
  var o = byId(S.orders, d.v); if (!o) return;
  var patch = { status: "cancelled", cancelledBy: "admin", timeline: { cancelled: Date.now() } };
  if (o.billing && o.billing.status === "paid") patch.billing = { status: "refunded" };
  run(Store.update("orders", o.id, patch), "Delivery cancelled" + (patch.billing ? " and refunded" : ""));
};

// ---------- Customers ----------
function aCustomers() {
  var f = S.a.custType || "all", rows = S.accounts.filter(function (a) { var b = a.business && a.business.active; return (f === "all" || (f === "business" ? b : !b)) && matchQ([a.name, a.email, a.phone, b ? a.business.name : ""].join(" ")); }).sort(function (a, b) { return b.createdAt - a.createdAt; });
  return aHead("Customers", search("Search name, email, business")) + '<div class="row wrap">' + segBtns("custType", f, [["all", "All"], ["individual", "Individuals"], ["business", "Businesses"]]) + "</div>" +
    '<div class="panel">' + (rows.length ? '<div class="tbl"><table><thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Plan</th><th>Deliveries</th><th>Spent</th><th>Joined</th><th>Status</th></tr></thead><tbody>' + rows.map(function (a) {
      var os = S.orders.filter(function (o) { return o.customer.id === a.id; }), spent = sumT(S.invoices.filter(function (i) { return i.accountId === a.id && i.status === "paid"; })), plan = subPlan(a);
      return '<tr class="click" data-act="a-customer" data-v="' + esc(a.id) + '"><td><b>' + esc(a.name) + "</b></td><td>" + esc(a.email) + "</td><td>" + (a.business && a.business.active ? "Business · " + esc(a.business.name) + (a.business.verified ? " ✓" : "") : "Individual") + "</td><td>" + esc(plan ? plan.name : "—") + "</td><td>" + os.length + '</td><td class="num">' + eur(spent) + "</td><td>" + dmy(a.createdAt) + '</td><td><span class="chip ' + (a.status === "suspended" ? "s-bad" : "s-ok") + '">' + esc(a.status || "active") + "</span></td></tr>";
    }).join("") + "</tbody></table></div>" : emptyState("No customers yet", "People who sign up in the customer app or website appear here.")) + "</div>";
}
ACT["a-customer"] = function (d) { S.modal = { kind: "a-customer", id: d.v }; render(); };
function aCustomerModal(m) {
  var a = byId(S.accounts, m.id); if (!a) return modalShell("Customer", emptyState("Customer not found", ""));
  var os = S.orders.filter(function (o) { return o.customer.id === a.id; }), invs = S.invoices.filter(function (i) { return i.accountId === a.id; }), b = a.business, sub = a.subscription, plan = sub ? byId(S.plans, sub.planId) : null;
  var h = '<div class="a-detail"><div class="stack"><div class="card"><b>' + esc(a.name) + '</b><span class="muted sm">' + esc(a.email) + (a.phone ? " · " + esc(a.phone) : "") + " · signed up with " + esc(a.provider) + " on " + dmy(a.createdAt) + "</span>" +
    '<span class="chip ' + (a.status === "suspended" ? "s-bad" : "s-ok") + '">' + esc(a.status || "active") + "</span></div>";
  var nref = S.orders.filter(function (o) { return o.billing && o.billing.discount && o.billing.discount.referrer === a.id && o.status !== "cancelled"; }).length;
  h += '<div class="card"><div class="row between"><b>Referral code</b><b class="mono">' + esc(refCodeOf(a)) + '</b></div><span class="muted sm">' + nref + (nref === 1 ? " friend has" : " friends have") + " booked with it</span></div>";
  var cr = S.a.credit && S.a.credit.id === a.id ? S.a.credit : (S.a.credit = { id: a.id, amount: "", reason: "" });
  h += '<div class="card"><div class="row between"><b>DART credit</b><b>' + eur(num(a.credit, 0)) + "</b></div>" +
    (a.creditLog || []).slice(-5).reverse().map(function (l) { return '<div class="row between sm"><span>' + esc(l.reason || "") + ' <span class="muted">· ' + dmy(l.at) + (l.by ? " · " + esc(l.by) : "") + "</span></span><b>" + (l.amount < 0 ? "−" + eur(-l.amount) : "+" + eur(l.amount)) + "</b></div>"; }).join("") +
    '<div class="grid2">' + field("Amount €", inp("a.credit.amount", cr.amount, 'inputmode="decimal" placeholder="10"')) + field("Reason (the customer sees it)", inp("a.credit.reason", cr.reason, 'placeholder="Sorry about the late delivery"')) + "</div>" +
    '<div class="row"><button class="btn sm" data-act="a-credit" data-v="add">Add credit</button><button class="btn sm ghost" data-act="a-credit" data-v="remove">Remove credit</button></div></div>';
  if (b && b.active) h += '<div class="card"><div class="row between"><b>' + esc(b.name) + '</b><span class="chip ' + (b.verified ? "s-ok" : "s-warn") + '">' + (b.verified ? "Verified" : "Not reviewed") + '</span></div><dl class="kv"><dt>Address</dt><dd>' + esc(b.address || "—") + "</dd><dt>P.IVA / CF</dt><dd>" + esc(b.vat || "—") + "</dd><dt>SDI / PEC</dt><dd>" + esc(b.sdi || "—") + "</dd><dt>Billing email</dt><dd>" + esc(b.email || "—") + "</dd><dt>Activated</dt><dd>" + dmy(b.activatedAt) + "</dd></dl>" +
    '<button class="btn ghost sm" data-act="a-biz-verify" data-v="' + esc(a.id) + '">' + (b.verified ? "Mark as not verified" : "Mark business as verified") + "</button></div>";
  if (sub) h += '<div class="card"><b>Plan: ' + esc(plan ? plan.name : sub.planId) + '</b><span class="chip ' + (sub.status === "active" ? "s-ok" : "s-bad") + '">' + esc(sub.status) + "</span>" + (plan ? usageBar(subUsage(a), plan.allowance) : "") + '<span class="muted sm">Started ' + dmy(sub.startedAt) + " · period ends " + dmy(sub.renewsAt) + (sub.cancelAtEnd ? " · cancels at end" : "") + "</span>" +
    '<div class="row wrap">' + (sub.status === "active" ? '<button class="btn ghost sm" data-act="a-sub-fail" data-v="' + esc(a.id) + '">Simulate failed payment</button><button class="btn danger sm" data-act="a-sub-end" data-v="' + esc(a.id) + '">End plan now</button>' : "") + "</div></div>";
  h += '</div><div class="stack"><div class="card"><b>Deliveries (' + os.length + ")</b>" + (os.length ? '<div class="list">' + os.slice(0, 8).map(function (o) { return '<button class="item" data-act="a-order" data-v="' + esc(o.id) + '"><b>' + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + "</b>" + chip(o.status) + '<small class="mono">' + esc(o.id) + '</small><small class="num">' + eur(o.billing ? o.billing.amount : o.price.total) + "</small></button>"; }).join("") + "</div>" : '<span class="muted">None yet</span>') + "</div>" +
    '<div class="card"><b>Invoices (' + invs.length + ")</b>" + (invs.length ? '<div class="list">' + invs.slice(0, 8).map(function (i) { return '<button class="item" data-act="c-inv" data-v="' + esc(i.id) + '"><b>' + esc(i.number) + '</b><b class="num">' + eur(i.total) + "</b><small>" + esc(i.kind) + " · " + dmy(i.issuedAt) + "</small><small>" + esc(i.status) + "</small></button>"; }).join("") + "</div>" : '<span class="muted">None yet</span>') + "</div></div></div>";
  return modalShell("Customer", h, '<button class="btn ' + (a.status === "suspended" ? "" : "danger") + '" data-act="a-cust-status" data-v="' + esc(a.id) + '">' + (a.status === "suspended" ? "Reactivate account" : "Suspend account") + "</button>");
}
ACT["a-cust-status"] = function (d) { var a = byId(S.accounts, d.v); run(Store.update("accounts", a.id, { status: a.status === "suspended" ? "active" : "suspended" }), a.status === "suspended" ? "Account reactivated" : "Account suspended"); };
ACT["a-biz-verify"] = function (d) { var a = byId(S.accounts, d.v); run(Store.update("accounts", a.id, { business: { verified: !a.business.verified, verifiedAt: Date.now() } }), "Business review updated"); };
ACT["a-sub-fail"] = function (d) { run(Store.update("accounts", d.v, { subscription: { status: "past_due", failedAt: Date.now() } }), "Plan marked as payment failed"); };
ACT["a-sub-end"] = function (d) { run(Store.update("accounts", d.v, { subscription: { status: "cancelled", endedAt: Date.now() } }), "Plan ended"); };

// ---------- Couriers ----------
ACT["a-credit"] = function (d) {
  var cr = S.a.credit, a = cr && byId(S.accounts, cr.id), amt = r2(num(cr && cr.amount, 0)); if (!a) return;
  if (!(amt > 0)) return toast("Enter an amount.");
  if (!clip(cr.reason, 80)) return toast("Add a reason. The customer sees it.");
  var delta = d.v === "remove" ? -Math.min(amt, num(a.credit, 0)) : amt;
  run(Store.update("accounts", a.id, { credit: r2(num(a.credit, 0) + delta), creditLog: (a.creditLog || []).concat([{ amount: delta, reason: clip(cr.reason, 80), at: Date.now(), by: "DART" }]).slice(-50) }).then(function () { S.a.credit = null; }),
    delta >= 0 ? eur(delta) + " credit added" : eur(-delta) + " credit removed");
};

// ---------- Discount codes ----------
function aDiscounts() {
  var list = discounts(), f = S.a.disc || (S.a.disc = { code: "", type: "percent", value: "", minOrder: "", maxUses: "", once: true, newOnly: false, until: "" });
  var h = aHead("Discounts") + '<p class="muted">Codes customers type at checkout. Couriers are still paid on the full price.</p>';
  var P = pricing(), refs = S.orders.filter(function (o) { return o.billing && o.billing.discount && o.billing.discount.referrer && o.status !== "cancelled"; }), paid = refs.filter(function (o) { return o.refRewarded; });
  h += '<div class="panel pad-m"><div class="panel-h">Referrals <span class="muted sm">Every customer has a personal code on their Account page</span></div>' +
    '<p>' + (P.referrals === false ? "Referrals are off." : "Friends get " + eur(P.referralDiscount) + " off their first delivery. The customer who shared the code gets " + eur(P.referralReward) + " credit when it's delivered.") + ' <span class="muted">Change the amounts in Pricing.</span></p>' +
    '<div class="kpis">' + kpi("Referral bookings", refs.length, paid.length + " delivered") + kpi("Discount given", eur(refs.reduce(function (s, o) { return s + num(o.billing.discount.amount, 0); }, 0)), "") + kpi("Credit paid out", eur(paid.length * num(P.referralReward, 5)), "") + "</div></div>";
  h += '<div class="panel">' + (list.length ? '<div class="tbl"><table><thead><tr><th>Code</th><th>Discount</th><th>Rules</th><th>Used</th><th>Discount given</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (x) {
    var used = S.orders.filter(function (o) { return o.billing && o.billing.discount && o.billing.discount.code === x.code && o.status !== "cancelled"; });
    var given = used.reduce(function (s, o) { return s + num(o.billing.discount.amount, 0); }, 0);
    var expired = x.until && Date.now() > new Date(x.until + "T23:59:59").getTime();
    var rules = [num(x.minOrder, 0) ? "Min " + eur(x.minOrder) : "", x.once ? "Once per customer" : "", x.newOnly ? "First delivery only" : "", x.until ? "Until " + x.until : ""].filter(Boolean).join(" · ") || "None";
    return '<tr><td><b class="mono">' + esc(x.code) + "</b></td><td>" + (x.type === "fixed" ? eur(x.value) + " off" : num(x.value, 0) + "% off") + "</td><td>" + esc(rules) + "</td><td>" + used.length + (num(x.maxUses, 0) ? " / " + x.maxUses : "") + "</td><td>" + eur(given) + "</td><td>" +
      '<span class="chip ' + (x.active === false || expired ? "s-bad" : "s-ok") + '">' + (expired ? "Expired" : x.active === false ? "Off" : "On") + '</span></td><td><button class="btn sm ghost" data-act="a-disc-toggle" data-v="' + esc(x.code) + '">' + (x.active === false ? "Turn on" : "Turn off") + "</button></td></tr>";
  }).join("") + "</tbody></table></div>" : emptyState("No discount codes yet", "Create one below. Customers enter it when they book.")) + "</div>";
  h += '<form class="panel pad-m" data-form="a-disc"><div class="panel-h">New code</div><div class="grid3">' +
    field("Code", inp("a.disc.code", f.code, 'placeholder="WELCOME10" autocapitalize="characters" required')) +
    field("Type", sel("a.disc.type", f.type, [["percent", "Percentage off"], ["fixed", "Amount off (€)"]])) +
    field(f.type === "fixed" ? "Amount off €" : "Percentage off %", inp("a.disc.value", f.value, 'inputmode="decimal" required')) + "</div>" +
    '<div class="grid3">' + field("Minimum delivery price €", inp("a.disc.minOrder", f.minOrder, 'inputmode="decimal" placeholder="None"')) + field("Total uses allowed", inp("a.disc.maxUses", f.maxUses, 'inputmode="numeric" placeholder="Unlimited"')) + field("Valid until", inp("a.disc.until", f.until, 'type="date"')) + "</div>" +
    check("a.disc.once", f.once, "Each customer can use it once") + check("a.disc.newOnly", f.newOnly, "Only for a customer's first delivery") +
    '<button class="btn">Create code</button></form>';
  return h;
}
FORMS["a-disc"] = function () {
  var f = S.a.disc, code = normCode(f.code), v = num(f.value, 0);
  if (code.length < 3) return toast("Use at least 3 letters or numbers for the code.");
  if (!(v > 0) || (f.type === "percent" && v > 100)) return toast(f.type === "percent" ? "Enter a percentage between 1 and 100." : "Enter the amount off.");
  if (discounts().some(function (x) { return x.code === code; })) return toast("That code already exists.");
  var item = { code: code, type: f.type === "fixed" ? "fixed" : "percent", value: v, minOrder: num(f.minOrder, 0), maxUses: Math.round(num(f.maxUses, 0)), once: !!f.once, newOnly: !!f.newOnly, until: /^\d{4}-\d\d-\d\d$/.test(f.until || "") ? f.until : "", active: true, createdAt: Date.now() };
  run(Store.set("config", "discounts", { codes: discounts().concat([item]) }).then(function () { S.a.disc = null; }), "Code " + code + " created");
};
ACT["a-disc-toggle"] = function (d) {
  run(Store.set("config", "discounts", { codes: discounts().map(function (x) { return x.code === d.v ? Object.assign({}, x, { active: x.active === false }) : x; }) }), "Saved");
};

// Late deliveries waiting for a decision: deduct a fee or waive it. Only before the courier is paid.
function lateReview() {
  var list = S.orders.filter(function (o) { return o.status === "delivered" && o.late && !o.late.decided && !o.courierPaid; }).sort(function (a, b) { return b.timeline.delivered - a.timeline.delivered; });
  if (!list.length) return "";
  var pct = num(pricing().latePenaltyPct, 10);
  return '<div class="panel"><div class="panel-h">Late deliveries to review <span class="muted sm">Couriers see any fee on that delivery in their earnings.</span></div><div class="tbl"><table><thead><tr><th>Delivery</th><th>Courier</th><th>Deliver by</th><th>Late</th><th>Courier pay</th><th>Late fee €</th><th></th></tr></thead><tbody>' +
    list.map(function (o) {
      var k = "a.lateFee." + o.id, v = getPath(S, k); if (v == null) { S.a.lateFee = S.a.lateFee || {}; S.a.lateFee[o.id] = String(r2(payOf(o) * pct / 100)); v = S.a.lateFee[o.id]; }
      return "<tr><td><button class=\"link\" data-act=\"a-order\" data-v=\"" + esc(o.id) + "\">" + esc(o.id) + "</button></td><td>" + esc(o.courier.name) + "</td><td>" + hhmm(o.deliverBy) + "</td><td>" + o.late.mins + " min</td><td>" + eur(payOf(o)) + "</td><td>" + inp(k, v, 'inputmode="decimal" style="width:90px"') +
        '</td><td class="row"><button class="btn sm danger" data-act="a-late" data-v="' + esc(o.id) + '">Deduct</button><button class="btn sm ghost" data-act="a-late-waive" data-v="' + esc(o.id) + '">No fee</button></td></tr>';
    }).join("") + "</tbody></table></div></div>";
}
ACT["a-late"] = function (d) {
  var o = byId(S.orders, d.v), fee = r2(Math.max(0, Math.min(num((S.a.lateFee || {})[d.v], 0), payOf(o || {})))); if (!o) return;
  run(Store.update("orders", o.id, { late: { mins: o.late.mins, penalty: fee, decided: true, decidedAt: Date.now() } }), "Late fee of " + eur(fee) + " deducted");
};
ACT["a-late-waive"] = function (d) { var o = byId(S.orders, d.v); if (!o) return; run(Store.update("orders", o.id, { late: { mins: o.late.mins, penalty: 0, decided: true, decidedAt: Date.now() } }), "No late fee"); };
function aCouriers() {
  var f = S.a.courStatus || "all", rows = S.couriers.filter(function (c) { return (f === "all" || c.status === f || (f === "vehicle" && c.vehicleStatus === "pending")) && matchQ([c.name, c.email, c.phone, c.vehicle && c.vehicle.plate].join(" ")); }).sort(function (a, b) { return b.createdAt - a.createdAt; });
  return aHead("Couriers", search("Search name, email, plate")) + lateReview() + '<div class="row wrap">' + segBtns("courStatus", f, [["all", "All"], ["pending", "To approve"], ["vehicle", "Vehicle changes"], ["approved", "Approved"], ["suspended", "Suspended"], ["rejected", "Rejected"]]) + "</div>" +
    '<div class="panel">' + (rows.length ? '<div class="tbl"><table><thead><tr><th>Name</th><th>Vehicle</th><th>Capacity</th><th>Status</th><th>Online</th><th>Delivered</th><th>Pending pay</th><th>Applied</th></tr></thead><tbody>' + rows.map(function (c) {
      var done = S.orders.filter(function (o) { return o.courier && o.courier.id === c.id && o.status === "delivered"; }), pend = done.filter(function (o) { return !o.courierPaid; }).reduce(function (s, o) { return s + earnOf(o); }, 0);
      return '<tr class="click" data-act="a-courier" data-v="' + esc(c.id) + '"><td><b>' + esc(c.name) + "</b></td><td>" + esc(vLabel(c.vehicle.type)) + (c.vehicle.plate ? " · " + esc(c.vehicle.plate) : "") + (c.vehicleStatus === "pending" ? ' <span class="chip s-warn">change</span>' : "") + "</td><td>" + c.vehicle.l + "×" + c.vehicle.w + "×" + c.vehicle.h + " · " + c.vehicle.kg + ' kg</td><td><span class="chip ' + (c.status === "approved" ? "s-ok" : c.status === "pending" ? "s-warn" : "s-bad") + '">' + esc(c.status) + "</span></td><td>" + (c.online ? "Yes" + (c.area ? ", " + esc(c.area) : "") : "No") + "</td><td>" + done.length + '</td><td class="num">' + eur(pend) + "</td><td>" + dmy(c.createdAt) + "</td></tr>";
    }).join("") + "</tbody></table></div>" : emptyState("No couriers here", "Applications from the courier app appear here for approval.")) + "</div>";
}
ACT["a-courier"] = function (d) {
  S.modal = { kind: "a-courier", id: d.v }; S.a.decision = ""; render();
  Store.get("courierDocs", d.v).then(function (doc) { S.a.docs[d.v] = doc || {}; render(); }, function () { });
};
function aCourierModal(m) {
  var c = byId(S.couriers, m.id); if (!c) return modalShell("Courier", emptyState("Courier not found", ""));
  var docs = S.a.docs[c.id], v = c.vehicle, pv = c.pendingVehicle;
  var done = S.orders.filter(function (o) { return o.courier && o.courier.id === c.id && o.status === "delivered"; }), pend = done.filter(function (o) { return !o.courierPaid; });
  var h = '<div class="a-detail"><div class="stack"><div class="card"><div class="row between"><b>' + esc(c.name) + '</b><span class="chip ' + (c.status === "approved" ? "s-ok" : c.status === "pending" ? "s-warn" : "s-bad") + '">' + esc(c.status) + '</span></div><dl class="kv"><dt>Email</dt><dd>' + esc(c.email) + "</dd><dt>Phone</dt><dd>" + esc(c.phone) + "</dd><dt>Address</dt><dd>" + esc(c.address) + "</dd><dt>Payout</dt><dd>" + esc(c.payout ? c.payout.holder + " · " + c.payout.iban : "—") + "</dd><dt>Applied</dt><dd>" + dmy(c.createdAt) + "</dd></dl></div>" +
    '<div class="card"><b>Vehicle: ' + esc(vLabel(v.type)) + "</b><span>" + esc(v.model || "") + (v.plate ? " · " + esc(v.plate) : "") + '</span><span class="muted sm">Loading space ' + v.l + "×" + v.w + "×" + v.h + " cm · " + v.kg + " kg</span></div>";
  if (c.vehicleStatus === "pending" && pv) h += '<div class="card warn"><b>Requested change: ' + esc(vLabel(pv.type)) + "</b><span>" + esc(pv.model || "") + (pv.plate ? " · " + esc(pv.plate) : "") + " · " + pv.l + "×" + pv.w + "×" + pv.h + " cm · " + pv.kg + ' kg</span><div class="row wrap"><button class="btn sm" data-act="a-veh" data-v="approve">Approve change</button><button class="btn danger sm" data-act="a-veh" data-v="decline">Decline</button></div></div>';
  h += '</div><div class="stack"><div class="card"><b>Documents</b>' + (docs ? docsFor(v.type).concat(pv && pv.type !== v.type ? docsFor(pv.type) : []).filter(function (k, i, arr) { return arr.indexOf(k) === i; }).map(function (k) { var img = safeImg(docs[k]); return '<div class="doc-view"><span>' + DOCS[k] + "</span>" + (img ? '<img src="' + img + '" alt="' + DOCS[k] + '">' : '<span class="warn-t">Missing</span>') + "</div>"; }).join("") : '<span class="muted">Loading documents…</span>') + "</div>" +
    '<div class="card"><b>Rating</b><span>' + esc(ratingText(c.id)) + "</span></div>" +
    '<div class="card"><b>Earnings</b><span>' + done.length + " deliveries · " + eur(done.reduce(function (s, o) { return s + earnOf(o); }, 0)) + " earned, tips included</span><span>Pending payout: <b>" + eur(pend.reduce(function (s, o) { return s + earnOf(o); }, 0)) + "</b></span>" + (pend.length ? '<button class="btn sm" data-act="a-payout" data-v="' + esc(c.id) + '">Mark ' + pend.length + " deliveries as paid</button>" : "") + "</div>" +
    field("Note to the courier (optional)", inp("a.decision", S.a.decision, 'placeholder="Shown if you reject, suspend or decline a vehicle"')) + "</div></div>";
  var foot = c.status === "pending" ? '<button class="btn danger" data-act="a-cour-status" data-v="rejected">Reject</button><button class="btn" data-act="a-cour-status" data-v="approved">Approve courier</button>' :
    c.status === "approved" ? '<button class="btn danger" data-act="a-cour-status" data-v="suspended">Suspend</button>' : '<button class="btn" data-act="a-cour-status" data-v="approved">Approve</button>';
  return modalShell("Courier", h, foot);
}
ACT["a-cour-status"] = function (d) {
  var c = byId(S.couriers, S.modal.id), patch = { status: d.v, decisionNote: clip(S.a.decision, 200), updatedAt: Date.now() };
  if (d.v === "approved") patch.approvedAt = Date.now(); else patch.online = false;
  run(Store.update("couriers", c.id, patch), { approved: "Courier approved", rejected: "Application rejected", suspended: "Courier suspended" }[d.v]);
};
ACT["a-veh"] = function (d) {
  var c = byId(S.couriers, S.modal.id), ok = d.v === "approve";
  var patch = ok ? { vehicle: c.pendingVehicle, pendingVehicle: null, vehicleStatus: "approved", vehicleDecidedAt: Date.now() } : { pendingVehicle: null, vehicleStatus: "declined", vehicleNote: clip(S.a.decision, 200) || "Contact support for details", vehicleDecidedAt: Date.now() };
  run(Store.update("couriers", c.id, patch), ok ? "Vehicle change approved" : "Vehicle change declined");
};
ACT["a-payout"] = function (d) {
  var ids = S.orders.filter(function (o) { return o.courier && o.courier.id === d.v && o.status === "delivered" && !o.courierPaid; }).map(function (o) { return o.id; }), now = Date.now(), pid = "P-" + rid(5);
  run(ids.reduce(function (p, id) { return p.then(function () { return Store.update("orders", id, { courierPaid: true, courierPaidAt: now, courierPayout: pid }); }); }, Promise.resolve()), "Payout recorded");
};

// ---------- Vehicles and item categories ----------
function aRules() {
  if (!S.a.rulesDraft) S.a.rulesDraft = clone(rules());
  var R = S.a.rulesDraft, b = "a.rulesDraft";
  var h = aHead("Vehicles and items", '<button class="btn" data-act="a-rules-save">Save rules</button><button class="btn ghost" data-act="a-rules-reset">Undo changes</button>') +
    '<p class="muted">Changes apply to the customer app, website and courier app as soon as you save. Sizes are in cm, weights in kg.</p>';
  h += '<div class="panel"><div class="panel-h">Vehicle types<button class="btn ghost sm" data-act="a-veh-add">Add vehicle type</button></div><div class="tbl"><table class="edit"><thead><tr><th>Name</th><th>Length</th><th>Width</th><th>Height</th><th>Max kg</th><th>Speed km/h</th><th>Pickup min</th><th>Surcharge €</th><th>Active</th></tr></thead><tbody>' +
    R.vehicles.map(function (v, i) { var p = b + ".vehicles." + i + "."; return "<tr><td>" + inp(p + "label", v.label, 'aria-label="Name"') + "</td>" + ["l", "w", "h", "kg", "speed", "pickup", "surcharge"].map(function (k) { return "<td>" + inp(p + k, v[k], 'inputmode="decimal" class="input n" aria-label="' + k + '"') + "</td>"; }).join("") + "<td>" + '<input type="checkbox" data-bind="' + p + 'active"' + (v.active !== false ? " checked" : "") + ' aria-label="Active">' + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
  h += '<div class="row between"><h2 class="h2">Item categories</h2><button class="btn ghost sm" data-act="a-cat-add">Add category</button></div><p class="muted sm">DART picks the smallest active category the item fits (by its three dimensions and weight), within the item types listed. Then it offers the delivery only to eligible vehicles the item fits in.</p>';
  h += '<div class="cat-grid">' + R.categories.map(function (c, i) {
    var p = b + ".categories." + i + ".";
    return '<div class="card"><div class="row between">' + inp(p + "label", c.label, 'aria-label="Category name" class="input strong"') + '<label class="check"><input type="checkbox" data-bind="' + p + 'active"' + (c.active !== false ? " checked" : "") + "><span>Active</span></label></div>" +
      '<div class="grid4">' + field("Max L", inp(p + "l", c.l, 'inputmode="decimal"')) + field("Max W", inp(p + "w", c.w, 'inputmode="decimal"')) + field("Max H", inp(p + "h", c.h, 'inputmode="decimal"')) + field("Max kg", inp(p + "kg", c.kg, 'inputmode="decimal"')) + "</div>" +
      '<div class="grid3">' + field("Category fee €", inp(p + "fee", c.fee, 'inputmode="decimal"')) + field("Price per km €", inp(p + "perKm", c.perKm, 'inputmode="decimal" placeholder="default"')) + field("Couriers", inp(p + "couriers", c.couriers, 'inputmode="numeric"')) + "</div>" +
      field("Handling note", inp(p + "handling", c.handling, 'placeholder="Shown to customer and courier"')) +
      '<div class="field"><span>Item types it covers</span><div class="chips">' + ITEM_TYPES.map(function (t) { var on = (c.types || []).indexOf(t.id) >= 0; return '<button type="button" class="chipbtn sm ' + (on ? "on" : "") + '" data-act="a-cat-type" data-i="' + i + '" data-v="' + t.id + '">' + t.label + "</button>"; }).join("") + "</div></div>" +
      '<div class="field"><span>Eligible vehicles</span><div class="chips">' + R.vehicles.map(function (v) { var on = (c.vehicles || []).indexOf(v.id) >= 0; return '<button type="button" class="chipbtn sm ' + (on ? "on" : "") + '" data-act="a-cat-veh" data-i="' + i + '" data-v="' + v.id + '">' + esc(v.label) + "</button>"; }).join("") + "</div></div>" +
      '<div class="row between"><span class="muted sm">Order ' + (i + 1) + '</span><span class="row"><button class="btn ghost sm" data-act="a-cat-move" data-i="' + i + '" data-v="-1"' + (i ? "" : " disabled") + ' aria-label="Move up">↑</button><button class="btn ghost sm" data-act="a-cat-move" data-i="' + i + '" data-v="1"' + (i < R.categories.length - 1 ? "" : " disabled") + ' aria-label="Move down">↓</button></span></div></div>';
  }).join("") + "</div>";
  h += '<div class="card" style="max-width:420px">' + field("Two people needed for single items over (kg)", inp(b + ".twoPersonKg", R.twoPersonKg, 'inputmode="decimal"')) + "</div>";
  return h;
}
function toggleIn(arr, v) { arr = (arr || []).slice(); var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); return arr; }
ACT["a-cat-type"] = function (d) { var c = S.a.rulesDraft.categories[+d.i]; c.types = toggleIn(c.types, d.v); render(); };
ACT["a-cat-veh"] = function (d) { var c = S.a.rulesDraft.categories[+d.i]; c.vehicles = toggleIn(c.vehicles, d.v); render(); };
ACT["a-cat-move"] = function (d) { var l = S.a.rulesDraft.categories, i = +d.i, j = i + +d.v; var t = l[i]; l[i] = l[j]; l[j] = t; render(); };
ACT["a-veh-add"] = function () { S.a.rulesDraft.vehicles.push({ id: "v" + rid(4).toLowerCase(), label: "New vehicle", l: 100, w: 60, h: 60, kg: 50, speed: 15, pickup: 12, surcharge: 0, active: false }); render(); };
ACT["a-cat-add"] = function () { S.a.rulesDraft.categories.push({ id: "k" + rid(4).toLowerCase(), label: "New category", types: ["other"], l: 50, w: 50, h: 50, kg: 10, fee: 0, perKm: "", couriers: 1, vehicles: [], handling: "", active: false }); render(); };
ACT["a-rules-reset"] = function () { S.a.rulesDraft = null; render(); };
ACT["a-rules-save"] = function () {
  var R = clone(S.a.rulesDraft);
  R.vehicles.forEach(function (v) { ["l", "w", "h", "kg", "speed", "pickup", "surcharge"].forEach(function (k) { v[k] = num(v[k], 0); }); v.label = clip(v.label, 40) || "Vehicle"; });
  R.categories.forEach(function (c) { ["l", "w", "h", "kg", "fee"].forEach(function (k) { c[k] = num(c[k], 0); }); c.couriers = Math.max(1, Math.round(num(c.couriers, 1))); c.perKm = c.perKm === "" || c.perKm == null ? "" : num(c.perKm, ""); c.label = clip(c.label, 40) || "Category"; c.handling = clip(c.handling, 140); });
  R.twoPersonKg = num(R.twoPersonKg, 40);
  run(Store.set("config", "rules", R).then(function () { S.a.rulesDraft = null; }), "Rules saved and live");
};

// ---------- Pricing ----------
function aPricing() {
  if (!S.a.pricingDraft) S.a.pricingDraft = clone(pricing());
  var P = S.a.pricingDraft, b = "a.pricingDraft.", pv = S.a.preview;
  var num2 = function (k, label, hint) { return field(label, inp(b + k, getPath(P, k), 'inputmode="decimal" data-live="1"'), hint); };
  var h = aHead("Pricing", '<button class="btn" data-act="a-pricing-save">Save prices</button><button class="btn ghost" data-act="a-pricing-reset">Undo changes</button>') + '<p class="muted">Prices include VAT. They go live in every app when you save, without any code changes.</p><div class="a-cols"><div class="stack">';
  h += '<div class="card"><b>Distance</b><div class="grid3">' + num2("minFee", "Minimum delivery fee €", "Short trips never cost less") + num2("perKm", "Price per km €", "Default; a category can override it") + num2("minKm", "Minimum billable km") + "</div>" +
    '<div class="grid3">' + field("Distance method", sel(b + "method", P.method, [["road", "By road"], ["straight", "Straight line"]], 'data-live="1"')) + num2("roadFactor", "Road factor", "Road distance = straight × factor") + "<span></span></div>" +
    '<div class="grid2">' + num2("longFrom", "Long distance from km") + num2("longFee", "Extra per km after that €") + "</div></div>";
  h += '<div class="card"><b>Size, weight and items</b><span class="muted sm">Category fees are set in Vehicles and items.</span><div class="grid3">' + num2("weightFrom", "Weight charge from kg") + num2("perKgOver", "Per kg over that €") + num2("extraItemFee", "Per extra item €") + "</div>" +
    '<div class="grid3">' + num2("secondCourierFee", "Second courier €", "When 2 people are needed") + num2("businessDiscount", "Business discount %") + num2("vatRate", "VAT %") + "</div></div>";
  h += '<div class="card"><b>Extra services</b><div class="grid3">' + OPTIONS.map(function (o) { return num2("options." + o.id, o.label + " €"); }).join("") + "</div></div>";
  h += '<div class="card"><b>Courier earnings</b>' + num2("courierShare", "Courier share of the delivery price %") + num2("latePenaltyPct", "Suggested late fee %", "Pre-filled when you review a late delivery. Nothing is deducted automatically.") + "</div>";
  h += '<div class="card"><b>Referrals</b>' + check("a.pricingDraft.referrals", P.referrals !== false, "Referral codes are on") + '<div class="grid2">' + num2("referralDiscount", "Friend's discount on their first delivery €") + num2("referralReward", "Credit for the customer who shared the code €") + "</div></div>";
  h += '<div class="card"><b>Delivery times and multi-stop</b><div class="grid2">' + num2("maxHours", "Longest delivery promise, hours", "As soon as possible never promises later than this") + num2("asapBufferMins", "ASAP: minutes added to the trip time", "Sets the arrival time customers are promised") + num2("showHours", "Set times: couriers can book ahead from this many hours before") + num2("leadMins", "Set times: if nobody has booked it, pop it up this many minutes before setting off") + "</div>" +
    '<div class="grid2">' + num2("maxOrders", "Most deliveries a courier carries at once") + num2("nearKm", "Close enough to add to a route, km", "Pickup near the courier or a stop, or drop-off near one of theirs") + "</div></div>";
  h += '</div><div class="stack sticky"><div class="card"><b>Try a price</b><span class="muted sm">Uses the numbers on this page, before you save.</span><div class="grid2">' + field("From", sel("a.preview.from", pv.from, AREA_NAMES, 'data-live="1"')) + field("To", sel("a.preview.to", pv.to, AREA_NAMES, 'data-live="1"')) + "</div>" +
    field("Category", sel("a.preview.cat", pv.cat, rules().categories.map(function (c) { return [c.id, c.label]; }), 'data-live="1"'));
  var keep = S.cfg.pricing, cat = category(pv.cat);
  if (cat) {
    S.cfg.pricing = P;
    try {
      var item = { qty: 1, options: {} }, cls = { category: cat.id, minVehicle: (cat.vehicles || [])[0], couriers: num(cat.couriers, 1), kg: Math.min(num(cat.kg, 1), 10) };
      h += breakdown(quote(pv.from, pv.to, item, cls, null)) + '<span class="muted sm">Example: one item, ' + cls.kg + " kg, smallest eligible vehicle (" + esc(vLabel(cls.minVehicle)) + ").</span>";
    } finally { S.cfg.pricing = keep; }
  }
  return h + "</div></div></div>";
}
ACT["a-pricing-reset"] = function () { S.a.pricingDraft = null; render(); };
ACT["a-pricing-save"] = function () {
  var P = clone(S.a.pricingDraft), D = DEFAULT_PRICING;
  Object.keys(D).forEach(function (k) { if (typeof D[k] === "number") P[k] = num(P[k], D[k]); });
  Object.keys(D.options).forEach(function (k) { P.options[k] = num(P.options[k], D.options[k]); });
  P.courierShare = Math.min(100, P.courierShare); P.businessDiscount = Math.min(100, P.businessDiscount);
  run(Store.set("config", "pricing", P).then(function () { S.a.pricingDraft = null; }), "Prices saved and live");
};

// ---------- Plans and subscriptions ----------
function newPlan() { return { id: null, name: "", price: "", allowance: "", overageFee: "", categories: ["letter", "document", "small"], bulk: false, desc: "", active: true }; }
function aPlans() {
  var pl = S.a.plan, subs = S.accounts.filter(function (a) { return a.subscription; });
  var h = aHead("Plans", pl ? "" : '<button class="btn" data-act="a-plan-new">New plan</button>') + '<p class="muted">Businesses choose a plan in their account. Each plan has a monthly price, a delivery allowance, the item categories it covers and a price for each delivery over the allowance.</p>';
  if (pl) {
    var b = "a.plan.";
    h += '<form class="card" data-form="a-plan" style="max-width:760px"><b>' + (pl.id ? "Edit plan" : "New plan") + '</b><div class="grid2">' + field("Plan name", inp(b + "name", pl.name, "required")) + field("Monthly price €", inp(b + "price", pl.price, 'inputmode="decimal" required')) + "</div>" +
      '<div class="grid2">' + field("Deliveries included each month", inp(b + "allowance", pl.allowance, 'inputmode="numeric" required')) + field("Price per delivery over the allowance €", inp(b + "overageFee", pl.overageFee, 'inputmode="decimal" required')) + "</div>" +
      '<div class="field"><span>Item categories included</span><div class="chips">' + rules().categories.map(function (c) { var on = (pl.categories || []).indexOf(c.id) >= 0; return '<button type="button" class="chipbtn sm ' + (on ? "on" : "") + '" data-act="a-plan-cat" data-v="' + c.id + '">' + esc(c.label) + "</button>"; }).join("") + '</div><small class="hint">Other categories are charged at the normal price.</small></div>' +
      check(b + "bulk", pl.bulk, "Includes bulk deliveries (CSV and Excel upload)") + check(b + "active", pl.active, "Available to customers") + field("Short description", inp(b + "desc", pl.desc, 'maxlength="140"')) +
      '<div class="row"><button type="button" class="btn ghost" data-act="a-plan-cancel">Cancel</button><button class="btn">Save plan</button></div></form>';
  }
  h += '<div class="plans">' + (S.plans.length ? S.plans.slice().sort(function (a, b) { return a.price - b.price; }).map(function (p) {
    var n = S.accounts.filter(function (a) { return activeSub(a) && a.subscription.planId === p.id; }).length;
    return '<div class="card plan"><div class="row between"><b>' + esc(p.name) + '</b><span class="chip ' + (p.active !== false ? "s-ok" : "s-bad") + '">' + (p.active !== false ? "Active" : "Hidden") + '</span></div><span class="price-big">' + eur(p.price) + "<small>/month</small></span><span>" + p.allowance + " deliveries · over: " + eur(p.overageFee) + '</span><span class="muted sm">' + esc((p.categories || []).map(cLabel).join(", ")) + (p.bulk ? " · bulk" : "") + "</span><span>" + n + ' active subscribers</span><div class="row wrap"><button class="btn ghost sm" data-act="a-plan-edit" data-v="' + esc(p.id) + '">Edit</button><button class="btn ghost sm" data-act="a-plan-toggle" data-v="' + esc(p.id) + '">' + (p.active !== false ? "Hide" : "Show") + "</button></div></div>";
  }).join("") : emptyState("No plans yet", "Create your first business plan.")) + "</div>";
  h += '<h2 class="h2">Subscriptions</h2><div class="panel">' + (subs.length ? '<div class="tbl"><table><thead><tr><th>Business</th><th>Plan</th><th>Status</th><th>Used</th><th>Renews</th><th>Paid so far</th></tr></thead><tbody>' + subs.map(function (a) {
    var p = byId(S.plans, a.subscription.planId), paid = sumT(S.invoices.filter(function (i) { return i.accountId === a.id && i.kind === "subscription" && i.status === "paid"; }));
    return '<tr class="click" data-act="a-customer" data-v="' + esc(a.id) + '"><td>' + esc(a.business ? a.business.name : a.name) + "</td><td>" + esc(p ? p.name : "—") + '</td><td><span class="chip ' + (a.subscription.status === "active" ? "s-ok" : "s-bad") + '">' + esc(a.subscription.status) + (a.subscription.cancelAtEnd ? " (ending)" : "") + "</span></td><td>" + (activeSub(a) && p ? subUsage(a) + " / " + p.allowance : "—") + "</td><td>" + dmy(a.subscription.renewsAt) + '</td><td class="num">' + eur(paid) + "</td></tr>";
  }).join("") + "</tbody></table></div>" : emptyState("No subscriptions yet", "When a business subscribes, it shows here.")) + "</div>";
  return h;
}
ACT["a-plan-new"] = function () { S.a.plan = newPlan(); render(); };
ACT["a-plan-edit"] = function (d) { S.a.plan = clone(byId(S.plans, d.v)); render(); };
ACT["a-plan-cancel"] = function () { S.a.plan = null; render(); };
ACT["a-plan-cat"] = function (d) { S.a.plan.categories = toggleIn(S.a.plan.categories, d.v); render(); };
ACT["a-plan-toggle"] = function (d) { var p = byId(S.plans, d.v); run(Store.update("plans", p.id, { active: p.active === false }), "Plan updated"); };
FORMS["a-plan"] = function () {
  var p = S.a.plan; if (!clip(p.name, 40) || !num(p.price, 0) || !num(p.allowance, 0)) return toast("Add a name, monthly price and allowance.");
  var id = p.id || "plan-" + rid(5).toLowerCase();
  var doc = { name: clip(p.name, 40), price: num(p.price, 0), allowance: Math.round(num(p.allowance, 0)), overageFee: num(p.overageFee, 0), categories: p.categories || [], bulk: !!p.bulk, desc: clip(p.desc, 140), active: p.active !== false, updatedAt: Date.now() };
  run(Store.set("plans", id, doc).then(function () { S.a.plan = null; }), "Plan saved");
};

// ---------- Invoices and payments ----------
function aInvoices() {
  var k = S.a.invKind, st = S.a.invStatus;
  var rows = S.invoices.filter(function (i) { return (k === "all" || i.kind === k) && (st === "all" || i.status === st) && matchQ([i.number, i.party && i.party.name, i.orderId].join(" ")); }).sort(function (a, b) { return b.issuedAt - a.issuedAt; });
  return aHead("Invoices", search("Search number, customer, delivery")) + '<div class="row wrap">' + segBtns("invKind", k, [["all", "All"], ["delivery", "Delivery"], ["subscription", "Subscription"]]) + segBtns("invStatus", st, [["all", "Any status"], ["paid", "Paid"], ["outstanding", "Outstanding"], ["refunded", "Refunded"]]) + "</div>" +
    '<div class="panel">' + (rows.length ? '<div class="tbl"><table><thead><tr><th>Number</th><th>Issued</th><th>Customer</th><th>Type</th><th>Reference</th><th>Total</th><th>VAT</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(function (i) {
      return '<tr><td class="mono sm">' + esc(i.number) + "</td><td>" + dmy(i.issuedAt) + "</td><td>" + esc(i.party && i.party.name) + "</td><td>" + esc(i.kind) + '</td><td class="mono sm">' + esc(i.orderId || i.planId || "") + '</td><td class="num">' + eur(i.total) + '</td><td class="num">' + eur(i.vat) + '</td><td><span class="chip ' + (i.status === "paid" ? "s-ok" : i.status === "refunded" ? "s-pur" : "s-warn") + '">' + esc(i.status) + "</span></td>" +
        '<td><div class="row"><button class="btn ghost sm" data-act="c-inv" data-v="' + esc(i.id) + '">View</button>' + (i.status === "outstanding" ? '<button class="btn sm" data-act="a-inv-paid" data-v="' + esc(i.id) + '">Mark paid</button>' : "") + (i.status === "paid" && i.total > 0 ? '<button class="btn ghost sm" data-act="a-inv-refund" data-v="' + esc(i.id) + '">Refund</button>' : "") + "</div></td></tr>";
    }).join("") + "</tbody></table></div>" : emptyState("No invoices here", "Invoices are created when a delivery is completed and when a plan is paid.")) + "</div>";
}
ACT["a-inv-paid"] = function (d) { run(Store.update("invoices", d.v, { status: "paid", paidAt: Date.now() }), "Invoice marked as paid"); };
ACT["a-inv-refund"] = function (d) {
  var i = byId(S.invoices, d.v);
  run(Store.update("invoices", d.v, { status: "refunded", refundedAt: Date.now() }).then(function () { if (i.orderId && byId(S.orders, i.orderId)) return Store.update("orders", i.orderId, { billing: { status: "refunded" } }); }), "Refund recorded");
};
function aPayments() {
  var del = paidInv("delivery"), sub = paidInv("subscription"), out = S.invoices.filter(function (i) { return i.status === "outstanding"; }), ref = S.invoices.filter(function (i) { return i.status === "refunded"; });
  var failed = S.accounts.filter(function (a) { return a.subscription && a.subscription.status === "past_due"; });
  var refundedOrders = S.orders.filter(function (o) { return o.billing && o.billing.status === "refunded"; });
  var days = [], now = new Date(); now.setHours(0, 0, 0, 0);
  for (var i = 13; i >= 0; i--) { var d0 = now.getTime() - i * 864e5; days.push({ label: new Date(d0).toLocaleDateString(locale(), { day: "numeric", month: "short" }), v: sumT(S.invoices.filter(function (x) { return x.status === "paid" && x.paidAt >= d0 && x.paidAt < d0 + 864e5; })) }); }
  var h = aHead("Payments") + '<div class="kpis">' + kpi("Delivery payments", eur(sumT(del)), del.length + " paid invoices") + kpi("Subscription payments", eur(sumT(sub)), sub.length + " payments") + kpi("Outstanding", eur(sumT(out)), out.length + " invoices") + kpi("Refunds", eur(sumT(ref) + refundedOrders.filter(function (o) { return !o.invoiceId; }).reduce(function (s, o) { return s + o.billing.amount; }, 0)), refundedOrders.length + " deliveries") + kpi("Failed payments", failed.length, "plans past due") + "</div>";
  h += '<div class="panel"><div class="panel-h">Revenue, last 14 days</div>' + bars(days, true) + "</div>";
  if (failed.length) h += '<div class="panel"><div class="panel-h">Failed plan payments</div><div class="list pad-s">' + failed.map(function (a) { return '<button class="item" data-act="a-customer" data-v="' + esc(a.id) + '"><b>' + esc(a.business ? a.business.name : a.name) + '</b><span class="chip s-bad">Past due</span><small>' + esc(a.email) + "</small><small>" + when(a.subscription.failedAt) + "</small></button>"; }).join("") + "</div></div>";
  return h;
}
function bars(list, money) {
  var max = Math.max.apply(null, list.map(function (x) { return x.v; }).concat([1]));
  return '<div class="bars" role="img" aria-label="Bar chart">' + list.map(function (x) { return '<div class="bar-c"><span class="bar-v">' + (x.v ? (money ? eur(x.v).replace(".00", "") : x.v) : "") + '</span><i style="height:' + Math.round(x.v / max * 100) + '%"></i><span class="bar-l">' + esc(x.label) + "</span></div>"; }).join("") + "</div>";
}

// ---------- Support and messenger moderation ----------
function aSupport() {
  var st = S.a.tStatus, rows = S.tickets.filter(function (t) { return (st === "all" || t.status === st) && matchQ([t.name, t.subject, t.text, t.orderId].join(" ")); }).sort(function (a, b) { return b.createdAt - a.createdAt; });
  return aHead("Support", search("Search requests")) + '<div class="row wrap">' + segBtns("tStatus", st, [["open", "Open"], ["resolved", "Resolved"], ["all", "All"]]) + "</div>" +
    '<div class="panel">' + (rows.length ? '<div class="tbl"><table><thead><tr><th>Received</th><th>From</th><th>Name</th><th>Subject</th><th>Delivery</th><th>Replies</th><th>Status</th></tr></thead><tbody>' + rows.map(function (t) {
      return '<tr class="click" data-act="a-ticket" data-v="' + esc(t.id) + '"><td>' + when(t.createdAt) + "</td><td>" + esc(t.from) + "</td><td>" + esc(t.name) + "</td><td>" + esc(t.subject) + '</td><td class="mono sm">' + esc(t.orderId || "—") + "</td><td>" + (t.replies || []).length + '</td><td><span class="chip ' + (t.status === "open" ? "s-warn" : "s-ok") + '">' + esc(t.status) + "</span></td></tr>";
    }).join("") + "</tbody></table></div>" : emptyState("No support requests", "Requests and problem reports from customers and couriers appear here.")) + "</div>";
}
ACT["a-ticket"] = function (d) { S.modal = { kind: "a-ticket", id: d.v }; S.a.reply = ""; render(); };
function aTicketModal(m) {
  var t = byId(S.tickets, m.id); if (!t) return modalShell("Support request", emptyState("Not found", ""));
  var h = '<div class="card"><div class="row between"><b>' + esc(t.subject) + '</b><span class="chip ' + (t.status === "open" ? "s-warn" : "s-ok") + '">' + esc(t.status) + '</span></div><span class="muted sm">From ' + esc(t.from) + ": " + esc(t.name) + " · " + when(t.createdAt) + "</span><p>" + esc(t.text) + "</p>" +
    (t.orderId ? '<button class="btn ghost sm" data-act="a-order" data-v="' + esc(t.orderId) + '">Open delivery ' + esc(t.orderId) + "</button>" : "") + "</div>" +
    (t.replies || []).map(function (r) { return '<div class="reply ' + (r.by === "admin" ? "staff" : "") + '"><small>' + (r.by === "admin" ? "DART support" : esc(t.name)) + " · " + when(r.at) + "</small><p>" + esc(r.text) + "</p></div>"; }).join("") +
    '<form class="stack" data-form="a-reply">' + field("Reply", txt("a.reply", S.a.reply, 'rows="3" required')) + '<button class="btn">Send reply</button></form>';
  return modalShell("Support request", h, '<button class="btn ghost" data-act="a-ticket-status">' + (t.status === "open" ? "Mark resolved" : "Reopen") + "</button>");
}
FORMS["a-reply"] = function () {
  var t = byId(S.tickets, S.modal.id), text = clip(S.a.reply, 1000); if (!text) return;
  S.a.reply = "";
  run(Store.update("tickets", t.id, { replies: (t.replies || []).concat([{ by: "admin", text: text, at: Date.now() }]) }), "Reply sent");
};
ACT["a-ticket-status"] = function () { var t = byId(S.tickets, S.modal.id); run(Store.update("tickets", t.id, { status: t.status === "open" ? "resolved" : "open" }), "Request updated"); };

// ---------- Reports ----------
function aReports() {
  var all = S.orders, done = all.filter(function (o) { return o.status === "delivered"; }), canc = all.filter(function (o) { return o.status === "cancelled"; });
  var rev = sumT(paidInv("delivery")), subRev = sumT(paidInv("subscription"));
  var avgVal = done.length ? done.reduce(function (s, o) { return s + o.price.total; }, 0) / done.length : 0, avgKm = all.length ? all.reduce(function (s, o) { return s + (o.price.km || 0); }, 0) / all.length : 0;
  var byCat = rules().categories.map(function (c) { return { label: c.label, v: all.filter(function (o) { return o.cls.category === c.id; }).length }; });
  var byVeh = rules().vehicles.map(function (v) { return { label: v.label, v: all.filter(function (o) { return o.courier && o.courier.vehicle === v.id; }).length }; });
  var days = [], now = new Date(); now.setHours(0, 0, 0, 0);
  for (var i = 13; i >= 0; i--) { var d0 = now.getTime() - i * 864e5; days.push({ label: new Date(d0).toLocaleDateString(locale(), { day: "numeric", month: "short" }), v: all.filter(function (o) { return o.createdAt >= d0 && o.createdAt < d0 + 864e5; }).length }); }
  var weeks = []; for (var w = 7; w >= 0; w--) { var end = now.getTime() + 864e5 - w * 7 * 864e5; weeks.push({ label: new Date(end - 864e5).toLocaleDateString(locale(), { day: "numeric", month: "short" }), v: S.accounts.filter(function (a) { return a.createdAt < end; }).length }); }
  var dist = [[0, 2], [2, 5], [5, 10], [10, 20], [20, 999]].map(function (r) { return { label: r[1] > 100 ? r[0] + "+ km" : r[0] + "–" + r[1] + " km", v: all.filter(function (o) { return o.price.km >= r[0] && o.price.km < r[1]; }).length }; });
  var planUse = S.plans.map(function (p) { return { label: p.name, v: S.orders.filter(function (o) { return o.billing && o.billing.planId === p.id && o.billing.included; }).length }; });
  return aHead("Reports") + '<div class="kpis">' + kpi("Total deliveries", all.length) + kpi("Completed", done.length) + kpi("Cancelled", canc.length) + kpi("Delivery revenue", eur(rev)) + kpi("Subscription revenue", eur(subRev)) + kpi("Average delivery value", eur(avgVal)) + kpi("Average distance", avgKm.toFixed(1) + " km") + kpi("Furniture deliveries", all.filter(function (o) { return o.cls.category === "furniture" || o.cls.category === "oversized"; }).length) + kpi("Active couriers", onlineCouriers().length) + kpi("Outstanding", eur(sumT(S.invoices.filter(function (i) { return i.status === "outstanding"; })))) + "</div>" +
    '<div class="a-cols"><div class="panel"><div class="panel-h">Deliveries per day</div>' + bars(days) + '</div><div class="panel"><div class="panel-h">Customers over time</div>' + bars(weeks) + "</div></div>" +
    '<div class="a-cols"><div class="panel"><div class="panel-h">Item categories</div>' + bars(byCat) + '</div><div class="panel"><div class="panel-h">Vehicles used</div>' + bars(byVeh) + "</div></div>" +
    '<div class="a-cols"><div class="panel"><div class="panel-h">Delivery distances</div>' + bars(dist) + '</div><div class="panel"><div class="panel-h">Plan deliveries used</div>' + (planUse.length ? bars(planUse) : '<p class="muted pad-s">No plans yet.</p>') + "</div></div>";
}

// ---------- Settings ----------
function aSettings() {
  if (!S.a.settingsDraft) S.a.settingsDraft = clone(settings());
  var s = S.a.settingsDraft, b = "a.settingsDraft.";
  var missing = ["company", "companyVat", "companyAddress", "supportEmail"].filter(function (k) { return !clip(s[k], 200); });
  return aHead("Settings", '<button class="btn" data-act="a-settings-save">Save settings</button>') + '<div class="stack" style="max-width:720px">' +
    (missing.length ? '<div class="banner bad">Add your company name, Partita IVA, registered address and support email. Italian websites and invoices must show them, and the website footer only shows what you fill in.</div>' : "") +
    '<div class="card"><div class="row between"><div><b>Taking deliveries</b><div class="muted sm">Turn off to close DART. Customers can\'t book and couriers get no new requests.</div></div>' + sw("a-open", s.open !== false, "Taking deliveries") + "</div></div>" +
    '<div class="card"><div class="row between"><div><b>Location check: testing</b><div class="muted sm">While on, couriers can tap \u201cI\'m here\u201d to skip the GPS check at pickup and drop-off. Turn off before launch.</div></div>' + sw("a-gps-test", s.gpsTest !== false, "Location check: testing") + "</div></div>" +
    '<div class="card">' + field("Message at the top of the customer app and website", inp(b + "banner", s.banner, 'maxlength="160" placeholder="e.g. Free delivery on your first order"'), "Leave empty to show nothing.") + "</div>" +
    '<div class="card"><b>Invoice details</b><div class="grid2">' + field("Company name", inp(b + "company", s.company)) + field("Partita IVA", inp(b + "companyVat", s.companyVat)) + "</div>" + field("Registered address", inp(b + "companyAddress", s.companyAddress)) + '<div class="grid2">' + field("Invoice number prefix", inp(b + "invoicePrefix", s.invoicePrefix)) + field("Support email", inp(b + "supportEmail", s.supportEmail, 'type="email"')) + "</div></div></div>";
}
ACT["a-gps-test"] = function () { S.a.settingsDraft.gpsTest = S.a.settingsDraft.gpsTest === false; render(); };
ACT["a-open"] = function () { S.a.settingsDraft.open = S.a.settingsDraft.open === false; render(); };
ACT["a-settings-save"] = function () {
  var s = S.a.settingsDraft, out = { open: s.open !== false, gpsTest: s.gpsTest !== false, banner: clip(s.banner, 160), company: clip(s.company, 80), companyVat: clip(s.companyVat, 20), companyAddress: clip(s.companyAddress, 140), invoicePrefix: clip(s.invoicePrefix, 10).replace(/[^A-Za-z0-9]/g, "") || "DART", supportEmail: clip(s.supportEmail, 80) };
  run(Store.set("config", "settings", out).then(function () { S.a.settingsDraft = null; }), "Settings saved and live");
};
