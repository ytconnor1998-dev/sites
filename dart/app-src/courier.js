// ===== DART courier app =====
S.d = { view: "home", job: null, mode: "login", login: { email: "" }, reg: null, proof: { photo: null, receiver: "" }, vEdit: null, ticket: { topic: "delivery", orderId: "", text: "" } };
var JOB_STEPS = ["assigned", "to_pickup", "at_pickup", "collected", "in_transit", "at_dest"];
var NEXT = { assigned: ["to_pickup", "Start driving to pickup"], to_pickup: ["at_pickup", "I've arrived at pickup"], at_pickup: ["collected", "Item collected"], collected: ["in_transit", "Start the delivery"], in_transit: ["at_dest", "I've arrived at the destination"] };
var DOCS = { idcard: "ID card or passport", licence: "Driving licence", insurance: "Vehicle insurance", vehicleReg: "Vehicle registration (libretto)" };
function docsFor(type) { return type === "bicycle" ? ["idcard"] : ["idcard", "licence", "insurance", "vehicleReg"]; }
function myCourier() { return S.me.courierId ? byId(S.couriers, S.me.courierId) : null; }
function myJobs() { var id = S.me.courierId; return S.orders.filter(function (o) { return o.courier && o.courier.id === id; }); }
function activeJobs() { return myJobs().filter(function (o) { return !bookedAhead(o) && (JOB_STEPS.indexOf(o.status) >= 0 || (o.status === "issue" && o.issue && JOB_STEPS.indexOf(o.issue.prev) >= 0)); }); }
function bookedJobs(cid) { return S.orders.filter(function (o) { return o.courier && o.courier.id === (cid || S.me.courierId) && bookedAhead(o); }).sort(function (a, b) { return startAt(a) - startAt(b); }); }
function activeJob() { return myJobs().filter(function (o) { return JOB_STEPS.indexOf(o.status) >= 0 || (o.status === "issue" && o.issue && JOB_STEPS.indexOf(o.issue.prev) >= 0); })[0] || null; }
function share() { return num(pricing().courierShare, 75); }
function payOf(o) { return o.courierPay != null ? o.courierPay : r2(o.price.total * share() / 100); }
// Delivery pay plus any tip: what the courier is paid out for a finished delivery.
function earnOf(o) { return r2(payOf(o) + tipOf(o) - (o.late ? num(o.late.penalty, 0) : 0)); }
// Late fees are set by admin per delivery; nothing is deducted automatically.
function lateFee(o) { return o.late ? num(o.late.penalty, 0) : 0; }
function eligible(c, o) {
  if (o.status !== "awaiting" || !c || !c.vehicle) return false;
  if ((o.cls.vehicles || []).indexOf(c.vehicle.type) < 0) return false;
  return vehicleFits(c.vehicle, { l: o.cls.l, w: o.cls.w, h: o.cls.h, kg: o.cls.kg, qty: o.item.qty });
}
// ---------- Offers: each waiting delivery goes to one courier at a time ----------
var OFFER_SECS = 120, RETRY_SECS = 120;
function liveOffer(o, now) { return o.offer && o.offer.until > (now || Date.now()) ? o.offer : null; }
function jobsOf(cid) { return S.orders.filter(function (o) { return o.courier && o.courier.id === cid && !bookedAhead(o) && (JOB_STEPS.indexOf(o.status) >= 0 || o.status === "issue"); }); }
function jobOf(cid) { return jobsOf(cid)[0] || null; }
function freeCourier(c, now) {
  return c.status === "approved" && c.online && !S.orders.some(function (x) { var f = liveOffer(x, now); return f && f.to === c.id; }) && S.orders.some(function (o) { return o.status === "awaiting" && routeCheck(c, o, now); });
}

// ---------- Set-time jobs couriers can book ahead, the same day ----------
function openScheduled(c, now) {
  now = now || Date.now();
  var mine = bookedJobs(c.id);
  return S.orders.filter(function (o) {
    if (o.status !== "awaiting" || o.asap || !o.deliverBy || liveOffer(o, now) || now < visibleFrom(o) || now >= startAt(o) || !eligible(c, o)) return false;
    if (mine.length >= num(pricing().maxOrders, 3)) return false;
    // No two booked jobs whose time on the road overlaps.
    return mine.every(function (b) { return o.deliverBy <= startAt(b) || startAt(o) >= b.deliverBy; });
  }).sort(function (a, b) { return a.deliverBy - b.deliverBy; });
}
function schedRow(o, act) {
  return '<button class="item" data-act="' + act + '" data-v="' + esc(o.id) + '"><b>' + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + '</b><b class="num">' + eur(payOf(o)) + "</b><small>" + (o.status === "awaiting" ? "Deliver by " + hhmm(o.deliverBy) : "Start by " + hhmm(startAt(o)) + " · deliver by " + hhmm(o.deliverBy)) + "</small><small>" + esc(cLabel(o.cls.category)) + " · " + o.price.km.toFixed(1) + " km</small></button>";
}
ACT["d-sched"] = function (d) { S.d.job = d.v; S.d.view = "sched"; render(); };
function dSched(c) {
  var o = byId(S.orders, S.d.job), now = Date.now();
  if (!o || o.status !== "awaiting") return dHead("Scheduled job", "home") + '<div class="pad">' + emptyState("This job is gone", "Another courier booked it or the customer cancelled.", '<button class="btn sm" data-act="d-go" data-v="home">Back</button>') + "</div>";
  var can = openScheduled(c, now).some(function (x) { return x.id === o.id; }), extras = OPTIONS.filter(function (x) { return o.item.options && o.item.options[x.id]; }).map(function (x) { return x.label; });
  return dHead("Scheduled job", "home") + '<div class="map map-md">' + mapSVG({ vb: fitVB([o.pickup.area, o.dropoff.area], 1.7, 34), labels: false, routes: [{ from: o.pickup.area, to: o.dropoff.area, fromLL: o.pickup.ll, toLL: o.dropoff.ll, vehicle: o.courier && o.courier.vehicle }] }) + '</div><div class="pad">' +
    '<div class="offer-top"><div><span class="muted sm">You earn</span><b class="offer-pay">' + eur(payOf(o)) + '</b></div></div><p class="offer-meta">' + o.price.km.toFixed(1) + " km trip · about " + o.price.mins + " min</p>" +
    '<div class="by-card"><span>Deliver by</span><b>' + hhmm(o.deliverBy) + "</b><small>Start by " + hhmm(startAt(o)) + ". Be at the pickup in time to make it.</small></div>" +
    '<div class="offer-legs"><div><i class="dot a"></i><span class="muted sm">Pickup</span><b>' + esc(o.pickup.street || o.pickup.area) + "</b><small>" + esc(o.pickup.area) + (o.pickup.notes ? " · " + esc(o.pickup.notes) : "") + '</small></div><div><i class="dot b"></i><span class="muted sm">Delivery</span><b>' + esc(o.dropoff.street || o.dropoff.area) + "</b><small>" + esc(o.dropoff.area) + (o.dropoff.notes ? " · " + esc(o.dropoff.notes) : "") + "</small></div></div>" +
    '<div class="offer-item"><b>' + esc(cLabel(o.cls.category)) + "</b><span>" + itemSummary(o) + "</span>" + (o.item.photos && o.item.photos.length ? '<div class="phs">' + photoStrip(o.item.photos) + "</div>" : "") + (extras.length ? '<span class="muted sm">Extras: ' + extras.join(", ") + "</span>" : "") + "</div>" +
    (can ? '<button class="btn block big" data-act="d-book" data-v="' + esc(o.id) + '"' + (busy ? " disabled" : "") + ">Book this job for " + hhmm(o.deliverBy) + '</button><p class="muted sm center">Once booked it\'s yours. If you can\'t make it, give it back from the job screen as early as you can.</p>'
      : '<div class="banner">This one clashes with a job you\'ve already booked.</div>') + "</div>";
}
ACT["d-book"] = function (d) {
  var c = myCourier(), o = byId(S.orders, d.v); if (!c || !o || busy) return;
  var patch = { status: "assigned", offer: null, bookedAhead: true, courier: { id: c.id, name: c.name, vehicle: c.vehicle.type, plate: c.vehicle.plate || "", phone: c.phone }, courierPay: r2(o.price.total * share() / 100), timeline: { assigned: Date.now() } };
  run(Store.claim("orders", o.id, c.id, function (x) { return x.status === "awaiting" && !(x.offer && x.offer.until > Date.now()); }, patch).then(function (ok) {
    S.d.view = "home"; toast(ok ? "Booked. Start by " + hhmm(startAt(o)) + "." : "Another courier booked it first.");
  }));
};

// ---------- Routes: what to pick up and drop off, in which order ----------
function legMins(vtype, a, b) { var v = vehicle(vtype) || {}; return a === b ? 3 : Math.max(3, Math.round(tripKm(a, b) / num(v.speed, 15) * 60)); }
function stopMins(o) { return o.cls && o.cls.couriers > 1 || /furniture|oversize/.test(o.cls && o.cls.category || "") ? 15 : 5; }
function needsPickup(o) { var st = o.status === "issue" && o.issue ? o.issue.prev : o.status; return ["awaiting", "assigned", "to_pickup", "at_pickup"].indexOf(st) >= 0; }
// Greedy plan: go to the nearest next stop, unless a drop-off would otherwise be late.
function planRoute(vtype, start, orders, now) {
  var t = now || Date.now(), at = start, stops = [], todo = [], picked = {};
  orders.forEach(function (o) { if (needsPickup(o)) todo.push({ o: o, kind: "pickup" }); else { picked[o.id] = true; todo.push({ o: o, kind: "dropoff" }); } });
  while (todo.length) {
    var best = null, bestScore = Infinity;
    todo.forEach(function (s) {
      var place = s.kind === "pickup" ? s.o.pickup.area : s.o.dropoff.area, m = at ? legMins(vtype, at, place) : 0, score = m;
      if (s.kind === "dropoff" && s.o.deliverBy) { var slack = (s.o.deliverBy - (t + m * 60000)) / 60000; if (slack < 25) score = m - 1000 + slack; }
      if (score < bestScore) { bestScore = score; best = s; }
    });
    var place = best.kind === "pickup" ? best.o.pickup.area : best.o.dropoff.area;
    t += ((at ? legMins(vtype, at, place) : 0) + stopMins(best.o)) * 60000; at = place;
    stops.push({ o: best.o, kind: best.kind, area: place, eta: t, late: best.kind === "dropoff" && !!best.o.deliverBy && t > best.o.deliverBy });
    todo.splice(todo.indexOf(best), 1);
    if (best.kind === "pickup") todo.push({ o: best.o, kind: "dropoff" });
  }
  return { stops: stops, end: t, ok: stops.every(function (s) { return !s.late; }) };
}
function myRoute(c) { var jobs = activeJobs(); return jobs.length ? planRoute(c.vehicle.type, c.area || jobs[0].pickup.area, jobs, Date.now()) : null; }
// Can this courier take this delivery now? Free couriers can take anything that fits.
// Busy couriers only get it if it's close, fits alongside what they carry, and keeps every deadline.
function routeCheck(c, o, now) {
  if (!c || c.status !== "approved" || !c.online || !eligible(c, o)) return null;
  var P = pricing(), jobs = jobsOf(c.id), start = c.area || o.pickup.area;
  var booked = bookedJobs(c.id), fitsBooked = function (end) { return booked.every(function (b) { return end + legMins(c.vehicle.type, o.dropoff.area, b.pickup.area) * 60000 <= startAt(b) + 10 * 60000; }); };
  if (!jobs.length) return fitsBooked(planRoute(c.vehicle.type, start, [o], now).end) ? { batch: false, mins: legMins(c.vehicle.type, start, o.pickup.area) } : null;
  if (jobs.length >= num(P.maxOrders, 3) || jobs.some(function (j) { return j.status === "issue" || j.cls.couriers > 1; }) || o.cls.couriers > 1) return null;
  var v = c.vehicle, all = jobs.concat([o]), kg = 0, vol = 0;
  all.forEach(function (j) { var q = Math.max(1, num(j.item.qty, 1)), d = dims(j.cls); kg += num(j.cls.kg, 0) * q; vol += d[0] * d[1] * d[2] * q; });
  var vd = dims(v); if (kg > num(v.kg, 0) || vol > vd[0] * vd[1] * vd[2] * .85) return null;
  var near = num(P.nearKm, 2.5), pts = [c.area].concat(jobs.filter(needsPickup).map(function (j) { return j.pickup.area; }), jobs.map(function (j) { return j.dropoff.area; })).filter(Boolean);
  var closePick = pts.some(function (a) { return tripKm(a, o.pickup.area) <= near; }), closeDrop = jobs.some(function (j) { return tripKm(j.dropoff.area, o.dropoff.area) <= near; });
  if (!closePick && !closeDrop) return null;
  var before = planRoute(v.type, start, jobs, now), after = planRoute(v.type, start, all, now);
  if (!after.ok || !fitsBooked(after.end)) return null;
  return { batch: true, mins: Math.max(1, Math.round((after.end - before.end) / 60000)), stops: after.stops.length };
}
// The offer showing on this courier's phone, if any.
function myOffer() {
  var id = S.me.courierId, now = Date.now();
  return id ? S.orders.filter(function (o) { var f = o.status === "awaiting" && liveOffer(o, now); return f && f.to === id; }).sort(function (a, b) { return a.offer.at - b.offer.at || (a.id < b.id ? -1 : 1); })[0] || null : null;
}
// Runs on every open courier and admin screen. In production this runs on the server.
var dispatching = {};
function dispatch() {
  if (settings().open === false) return;
  var now = Date.now(), held = {};
  // A courier holds at most one offer: the oldest live one counts, any others move on.
  S.orders.filter(function (o) { return o.status === "awaiting" && liveOffer(o, now); }).sort(function (a, b) { return a.offer.at - b.offer.at || (a.id < b.id ? -1 : 1); })
    .forEach(function (o) { if (!held[o.offer.to]) held[o.offer.to] = o.id; });
  S.orders.forEach(function (o) {
    if (o.status !== "awaiting" || dispatching[o.id]) return;
    // Set-time deliveries are offered once it's time to start, not hours early.
    if (!o.asap && o.deliverBy && !o.offer && now < startAt(o)) return;
    var f = liveOffer(o, now), holder = f && byId(S.couriers, f.to);
    if (f && holder && held[f.to] === o.id && routeCheck(holder, o, now)) return;
    var dup = f && held[f.to] !== o.id;
    var declined = (o.declinedBy || []).slice();
    if (o.offer && !dup && declined.indexOf(o.offer.to) < 0) declined.push(o.offer.to);
    var next = S.couriers.map(function (c) { return declined.indexOf(c.id) < 0 && !held[c.id] ? { c: c, chk: routeCheck(c, o, now) } : null; })
      .filter(function (x) { return x && x.chk; }).sort(function (a, b) { return a.chk.mins - b.chk.mins; }).map(function (x) { return x.c; })[0];
    var patch;
    if (next) { held[next.id] = o.id; patch = { offer: { to: next.id, at: now, until: now + OFFER_SECS * 1000 }, declinedBy: declined }; }
    else if (declined.length && now - (o.lastDeclineAt || (o.offer && o.offer.until) || 0) > RETRY_SECS * 1000) patch = { offer: null, declinedBy: [] };
    else if (o.offer) patch = { offer: null, declinedBy: declined, lastDeclineAt: o.offer.until < now ? o.offer.until : now };
    if (!patch) return;
    var stamp = o.offer ? o.offer.at : 0;
    dispatching[o.id] = true;
    Store.claim("orders", o.id, "dispatch", function (x) { return x.status === "awaiting" && (x.offer ? x.offer.at : 0) === stamp; }, patch)
      .catch(function () { }).then(function () { delete dispatching[o.id]; });
  });
}
function courierNotes() {
  var c = myCourier(); if (!c) return [];
  var out = [];
  if (c.approvedAt) out.push({ at: c.approvedAt, text: "Your DART courier account is approved", sub: "You can go online and take deliveries" });
  if (c.vehicleDecidedAt) out.push({ at: c.vehicleDecidedAt, text: "Vehicle change " + (c.vehicleStatus === "approved" ? "approved" : "declined"), sub: vLabel(c.vehicle && c.vehicle.type) });
  myJobs().forEach(function (o) {
    if (o.lastMsg && o.lastMsg.from !== "courier") out.push({ at: o.lastMsg.at, text: "Message from " + (o.lastMsg.from === "admin" ? "DART support" : o.customer.name), sub: o.lastMsg.text, chat: o.id });
    if (o.status === "cancelled" && o.timeline.cancelled) out.push({ at: o.timeline.cancelled, text: "Delivery cancelled", sub: o.id, job: o.id });
    if (o.courierPaidAt) out.push({ at: o.courierPaidAt, text: "Earnings paid out", sub: eur(earnOf(o)) + " for " + o.id });
  });
  S.tickets.filter(function (t) { return t.courierId === S.me.courierId; }).forEach(function (t) { (t.replies || []).forEach(function (r) { if (r.by === "admin") out.push({ at: r.at, text: "DART support replied", sub: r.text, help: true }); }); });
  return out.sort(function (a, b) { return b.at - a.at; }).slice(0, 60);
}
function courierUnseen() { var s = S.me.seen.courier || 0; return courierNotes().filter(function (n) { return n.at > s; }).length; }

// ---------- Shell ----------
var D_NAV = [["home", "Jobs", "send"], ["earnings", "Earnings", "euro"], ["account", "Account", "user"]];
// No separate Messages tab: couriers message the customer from inside the job, while it's under way.
function courierApp() {
  var c = myCourier();
  var body = !c ? dAuth() : dView(c);
  var cur = S.d.view === "job" || S.d.view === "req" || S.d.view === "sched" ? "home" : S.d.view === "chat" ? "home" : ["payments", "invreq"].indexOf(S.d.view) >= 0 ? "earnings" : ["vehicle", "help", "history", "payout", "notes"].indexOf(S.d.view) >= 0 ? "account" : S.d.view;
  var un = c ? myJobs().reduce(function (s, o) { return s + unread(o, "courier"); }, 0) : 0;
  var tabs = c && c.status === "approved" ? '<nav class="tabs t3">' + D_NAV.map(function (n) { return '<button class="' + (cur === n[0] ? "on" : "") + '" data-act="d-go" data-v="' + n[0] + '"><svg><use href="#t-' + n[2] + '"/></svg>' + n[1] + (n[0] === "messages" && un ? '<span class="badge">' + un + "</span>" : "") + "</button>"; }).join("") + "</nav>" : "";
  var offer = c && c.status === "approved" ? myOffer() : null;
  return stage('<div class="app-body" data-scroll="d-' + S.d.view + '">' + body + "</div>" + tabs + (offer ? offerSheet(c, offer) : ""), "DART Courier app");
}
function dHead(title, back, right) { return '<div class="app-head">' + (back ? '<button class="btn ghost sm" data-act="d-go" data-v="' + back + '">← Back</button>' : "") + "<h2>" + title + "</h2>" + (right || "") + "</div>"; }
function dView(c) {
  if (c.status === "pending" || c.status === "rejected" || c.status === "suspended") return dWaiting(c);
  switch (S.d.view) {
        case "job": return dJob(c);
    case "sched": return dSched(c);
    case "earnings": return dEarnings(c);
    case "messages": return dMessages();
    case "chat": return dChat(c);
    case "account": return dAccount(c);
    case "vehicle": return dVehicle(c);
    case "payout": return dPayout(c);
    case "payments": return dPayments(c);
    case "invreq": return dInvoiceRequest(c);
    case "history": return dHistory();
    case "help": return dHelp(c);
    case "notes": return dNotesView();
    default: return dMapHome(c);
  }
}

// ---------- Registration and login ----------
function newReg() { var v = vehicle("scooter") || rules().vehicles[0]; return { step: 1, name: "", email: "", phone: "", address: "", vehicle: { type: v.id, model: "", plate: "", l: v.l, w: v.w, h: v.h, kg: v.kg }, docs: {}, iban: "", holder: "" }; }
function dAuth() {
  if (S.d.mode === "register") return dRegister();
  return '<div class="auth"><span class="logo xl"><svg><use href="#mark"/></svg>DART Courier</span><h1>Deliver with DART</h1><p class="muted">Take delivery jobs across Rome with your own bicycle, scooter, car or van, whenever it suits you.</p>' +
    socialOr("d-social") +
    '<form class="stack" data-form="d-login">' + field("Email", inp("d.login.email", S.d.login.email, 'type="email" autocomplete="email" required')) + field("Password", '<input class="input" type="password" data-bind="d.login.pw" autocomplete="current-password">', LIVE ? "" : "Test build: passwords aren't checked or stored.") + '<button class="btn block">Log in</button></form>' +
    '<p class="center">New courier? <button class="link" data-act="d-reg-start">Apply to ride with DART</button></p></div>';
}
FORMS["d-login"] = function () {
  var e = slugEmail(S.d.login.email), c = S.couriers.filter(function (x) { return slugEmail(x.email) === e; })[0];
  if (!c) return toast("No courier account with that email. Apply instead.");
  S.me.courierId = c.id; saveMe(); S.d.view = "home"; render(); toast("Welcome back, " + c.name.split(" ")[0]);
};
ACT["d-reg-start"] = function () { S.d.mode = "register"; S.d.reg = S.d.reg || newReg(); render(); };
ACT["d-social"] = function (d) { S.modal = { kind: "google", provider: d.v || "google", role: "courier", email: "" }; render(); };
function courierSocial(email, p) {
  var c = S.couriers.filter(function (x) { return slugEmail(x.email) === email; })[0];
  if (!c) return toast("No courier account uses that email. Apply to become a courier first.");
  S.modal = null; S.me.courierId = c.id; saveMe(); S.d.view = "home"; render(); toast("Signed in with " + p);
}
ACT["d-login-mode"] = function () { S.d.mode = "login"; render(); };
function dRegister() {
  var r = S.d.reg, steps = ["You", "Vehicle", "Documents", "Payout"];
  var h = '<div class="app-head">' + (r.step > 1 ? '<button class="btn ghost sm" data-act="d-reg-step" data-v="' + (r.step - 1) + '">← Back</button>' : '<button class="btn ghost sm" data-act="d-login-mode">← Log in</button>') + "<h2>Become a courier</h2></div><div class=\"pad\">" +
    '<ol class="stepper">' + steps.map(function (s, i) { return '<li class="' + (r.step === i + 1 ? "on" : r.step > i + 1 ? "done" : "") + '"><span>' + (i + 1) + ". " + s + "</span></li>"; }).join("") + "</ol>";
  if (r.step === 1) h += '<form class="stack" data-form="d-reg-1">' + field("Full name", inp("d.reg.name", r.name, "required")) + field("Email", inp("d.reg.email", r.email, 'type="email" required')) + field("Phone", inp("d.reg.phone", r.phone, 'type="tel" required')) + field("Home address", inp("d.reg.address", r.address, 'required placeholder="Street, number, CAP"')) + field("Password", '<input class="input" type="password" data-bind="d.reg.pw" autocomplete="new-password">', LIVE ? "At least 8 characters. You'll use it to log in to the courier app." : "Test build: not stored.") + '<button class="btn block">Next: your vehicle</button></form>';
  if (r.step === 2) h += vehicleForm("d.reg.vehicle", r.vehicle) + '<button class="btn block" data-act="d-reg-step" data-v="3">Next: documents</button>';
  if (r.step === 3) h += docsForm(r.vehicle.type, r.docs, "reg") + '<button class="btn block" data-act="d-reg-step" data-v="4"' + (docsFor(r.vehicle.type).every(function (k) { return r.docs[k]; }) ? "" : " disabled") + ">Next: payout details</button>";
  if (r.step === 4) h += '<form class="stack" data-form="d-reg-4"><div class="card"><b>Where should we pay you?</b><span class="muted">Earnings are paid every Monday by bank transfer.</span>' + field("Account holder", inp("d.reg.holder", r.holder || r.name, "required")) + field("IBAN", inp("d.reg.iban", r.iban, 'required placeholder="IT60 X054 2811 1010 0000 0123 456"')) + '</div><button class="btn block">Send my application</button></form>';
  return h + "</div>";
}
function vehicleForm(base, v) {
  var vs = rules().vehicles.filter(function (x) { return x.active !== false; });
  var cur = vehicle(v.type) || {};
  return '<div class="card"><b>Your vehicle</b><div class="chips">' + vs.map(function (x) { return '<button type="button" class="chipbtn ' + (v.type === x.id ? "on" : "") + '" data-act="d-vtype" data-base="' + base + '" data-v="' + x.id + '">' + esc(x.label) + "</button>"; }).join("") + "</div>" +
    (v.type !== "bicycle" ? '<div class="grid2">' + field("Make and model", inp(base + ".model", v.model, 'placeholder="e.g. Piaggio Liberty 125"')) + field("Number plate", inp(base + ".plate", v.plate, 'placeholder="e.g. AB 12345"')) + "</div>" : field("Make and model", inp(base + ".model", v.model))) +
    '<b class="sm">Loading space</b><span class="muted sm">Pre-filled for a typical ' + esc(cur.label || "vehicle") + ". Change it to match yours. DART only offers you items that fit.</span>" +
    '<div class="grid4">' + field("Length cm", inp(base + ".l", v.l, 'inputmode="decimal"')) + field("Width cm", inp(base + ".w", v.w, 'inputmode="decimal"')) + field("Height cm", inp(base + ".h", v.h, 'inputmode="decimal"')) + field("Max kg", inp(base + ".kg", v.kg, 'inputmode="decimal"')) + "</div></div>";
}
ACT["d-vtype"] = function (d) { var v = vehicle(d.v), cur = getPath(S, d.base); if (!v) return; setPath(S, d.base, Object.assign({}, cur, { type: v.id, l: v.l, w: v.w, h: v.h, kg: v.kg })); render(); };
function docsForm(type, docs, mode) {
  return '<div class="card"><b>Documents</b><span class="muted sm">Take a clear photo of each one. DART checks them before you can take deliveries.</span>' + docsFor(type).map(function (k) {
    return '<div class="doc-row"><div><b>' + DOCS[k] + "</b><small>" + (docs[k] ? "Added" : "Needed") + "</small></div>" + (docs[k] && docs[k] !== true ? '<img class="ph sm" src="' + safeImg(docs[k]) + '" alt="">' : docs[k] ? '<span class="chip s-ok">Sent</span>' : "") +
      '<label class="btn ghost sm file-mini">' + (docs[k] ? "Replace" : "Add photo") + '<input type="file" accept="image/*" data-file="doc" data-k="' + k + '" data-mode="' + mode + '"></label></div>';
  }).join("") + "</div>";
}
FILES["doc"] = function (file, el) {
  var k = el.dataset.k, mode = el.dataset.mode;
  shrinkImage(file, 560, 45000).then(function (src) {
    if (mode === "reg") { S.d.reg.docs[k] = src; render(); return; }
    var c = myCourier(), flags = Object.assign({}, c.docs || {}); flags[k] = true;
    Store.get("courierDocs", c.id).then(function (doc) {
      var all = Object.assign({}, doc || {}); delete all.id; all[k] = src;
      return Store.set("courierDocs", c.id, all);
    }).then(function () { return Store.update("couriers", c.id, { docs: flags, docsUpdatedAt: Date.now() }); }).then(function () { toast(DOCS[k] + " uploaded"); }, fail);
  }, function () { toast("That photo couldn't be read."); });
};
ACT["d-reg-step"] = function (d) {
  var r = S.d.reg, to = +d.v;
  if (to === 3 && r.step === 2) { var v = r.vehicle; if (!num(v.l, 0) || !num(v.w, 0) || !num(v.h, 0) || !num(v.kg, 0)) return toast("Add your vehicle's loading space and maximum weight."); if (v.type !== "bicycle" && !clip(v.plate, 20)) return toast("Add your number plate."); }
  r.step = to; render();
};
FORMS["d-reg-1"] = function () {
  var r = S.d.reg; if (!emailOk(slugEmail(r.email))) return toast("Enter a valid email.");
  if (S.couriers.some(function (c) { return slugEmail(c.email) === slugEmail(r.email); })) return toast("That email already has a courier account. Log in instead.");
  if (!clip(r.name, 60) || !clip(r.phone, 30) || !clip(r.address, 140)) return toast("Fill in every field."); r.step = 2; render();
};
function cleanVehicle(v) { return { type: v.type, model: clip(v.model, 60), plate: clip(v.plate, 20).toUpperCase(), l: num(v.l, 0), w: num(v.w, 0), h: num(v.h, 0), kg: num(v.kg, 0) }; }
FORMS["d-reg-4"] = function () {
  var r = S.d.reg; if (!clip(r.iban, 40) || !clip(r.holder || r.name, 60)) return toast("Add the account holder and IBAN.");
  var id = "c-" + rid(10), now = Date.now(), flags = {};
  Object.keys(r.docs).forEach(function (k) { flags[k] = true; });
  var courier = { name: clip(r.name, 60), email: slugEmail(r.email), phone: clip(r.phone, 30), address: clip(r.address, 140), vehicle: cleanVehicle(r.vehicle), vehicleStatus: "approved", docs: flags, payout: { iban: clip(r.iban, 40).toUpperCase(), holder: clip(r.holder || r.name, 60) }, status: "pending", online: false, createdAt: now, updatedAt: now };
  run(Store.set("courierDocs", id, r.docs).then(function () { return Store.set("couriers", id, courier); }).then(function () { S.me.courierId = id; saveMe(); S.d.reg = null; S.d.mode = "login"; S.d.view = "home"; }), "Application sent");
};
function dWaiting(c) {
  var msg = c.status === "pending" ? ["We're checking your application", "DART reviews documents and vehicles before your first delivery. You'll get a notification when you're approved.", "Test build: approve yourself in the admin portal under Couriers."] :
    c.status === "rejected" ? ["Your application wasn't approved", c.decisionNote || "Contact DART support to find out why and what to fix.", ""] : ["Your account is paused", c.decisionNote || "Contact DART support to reactivate it.", ""];
  return dHead("DART Courier") + '<div class="pad"><div class="card"><b>' + msg[0] + "</b><span>" + esc(msg[1]) + "</span>" + (msg[2] ? '<span class="hint">' + msg[2] + "</span>" : "") + "</div>" +
    '<div class="card"><b>' + esc(c.name) + '</b><span class="muted">' + esc(vLabel(c.vehicle.type)) + (c.vehicle.plate ? " · " + esc(c.vehicle.plate) : "") + "</span></div>" + docsForm(c.vehicle.type, c.docs || {}, "live") +
    '<button class="btn ghost block" data-act="d-logout">Log out</button></div>';
}
ACT["d-logout"] = function () { var c = myCourier(); if (c && c.online) Store.update("couriers", c.id, { online: false, updatedAt: Date.now() }).catch(function () { }); S.me.courierId = null; saveMe(); S.d.view = "home"; closeChat(); render(); };

ACT["d-go"] = function (d) { if (d.v !== "chat") closeChat(); S.modal = null; S.d.view = d.v || "home"; if (d.v === "notes") { S.me.seen.courier = Date.now(); saveMe(); } render(); };
ACT["d-area"] = function (d) { var c = myCourier(); if (LIVE && settings().gpsTest === false) return; if (c) run(Store.update("couriers", c.id, { area: d.v, updatedAt: Date.now() })); };
ACT["d-online"] = function () {
  var c = myCourier(); if (!c) return;
  run(Store.update("couriers", c.id, { online: !c.online, updatedAt: Date.now() }), c.online ? "You're offline" : "You're online");
};
ACT["d-job"] = function (d) { S.d.job = d.v; S.d.view = "job"; render(); };
// Offer pop-up: route, pay and timer first; "Show more" opens the full details.
function offerSheet(c, o) {
  var f = o.offer, total = OFFER_SECS, left = Math.max(0, Math.ceil((f.until - Date.now()) / 1000)), more = S.d.offerMore === o.id;
  // Animate in only the first time this offer is drawn; the countdown redraws it every second.
  var enter = S.d.offerSeen !== o.id + (more ? ":more" : "") ? " enter" : ""; S.d.offerSeen = o.id + (more ? ":more" : "");
  var chk = routeCheck(c, o, Date.now()), away = c.area ? tripKm(c.area, o.pickup.area) : null, extras = OPTIONS.filter(function (x) { return o.item.options && o.item.options[x.id]; }).map(function (x) { return x.label; });
  var timer = '<div class="offer-timer" aria-hidden="true"><i style="animation-duration:' + total + "s;animation-delay:-" + (total - left) + 's"></i></div>';
  var top = '<div class="offer-top"><div><span class="muted sm">You earn</span><b class="offer-pay" id="offer-pay">' + eur(payOf(o)) + '</b></div><span class="offer-left"><b>' + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0") + "</b></span></div>" +
    '<p class="offer-route"><b>' + esc(o.pickup.area) + "</b> → <b>" + esc(o.dropoff.area) + "</b></p>" +
    '<p class="offer-meta">' + o.price.km.toFixed(1) + " km trip · about " + o.price.mins + " min" + (away != null ? " · " + away.toFixed(1) + " km to pickup" : "") + "</p>" +
    (o.deliverBy ? '<p class="offer-by"><b>Deliver ' + byLabel(o.deliverBy).replace(/^Today by /, "by ").replace(/^Tomorrow by /, "tomorrow by ") + "</b>" + (o.asap ? " · ASAP" : "") + "</p>" : "") +
    (chk && chk.batch ? '<p class="offer-batch">Adds to your route: ' + chk.stops + " stops in total, about +" + chk.mins + " min. Your other deliveries stay on time.</p>" : "");
  var acts = '<div class="offer-act"><button class="btn ghost" data-act="d-decline" data-v="' + esc(o.id) + '">Decline</button><button class="btn ghost" data-act="d-offer-more" data-v="' + esc(o.id) + '">' + (more ? "Show less" : "Show more") + '</button><button class="btn" data-act="d-accept" data-v="' + esc(o.id) + '"' + (busy ? " disabled" : "") + ">Accept</button></div>";
  var map = '<div class="offer-map">' + mapSVG({ vb: fitVB([o.pickup.area, o.dropoff.area].concat(c.area ? [c.area] : []), more ? 1.7 : 2.4, 34), labels: false, routes: [{ from: o.pickup.area, to: o.dropoff.area, fromLL: o.pickup.ll, toLL: o.dropoff.ll, vehicle: o.courier && o.courier.vehicle }], dots: c.area ? [{ area: c.area, color: "var(--ok)" }] : [] }) + '<span class="offer-tag">New delivery</span></div>';
  if (!more) return '<div class="offer-scrim' + enter + '"><div class="offer-card" role="dialog" aria-modal="true" aria-labelledby="offer-pay">' + map + timer + '<div class="offer-in">' + top + acts + "</div></div></div>";
  return '<div class="offer full' + enter + '" role="dialog" aria-modal="true" aria-labelledby="offer-pay">' + map + '<div class="offer-body">' + timer + top +
    '<div class="offer-legs"><div><i class="dot a"></i><span class="muted sm">Pickup</span><b>' + esc(o.pickup.street || o.pickup.area) + "</b><small>" + esc(o.pickup.area) + (o.pickup.notes ? " · " + esc(o.pickup.notes) : "") + '</small></div><div><i class="dot b"></i><span class="muted sm">Delivery</span><b>' + esc(o.dropoff.street || o.dropoff.area) + "</b><small>" + esc(o.dropoff.area) + (o.dropoff.notes ? " · " + esc(o.dropoff.notes) : "") + "</small></div></div>" +
    '<div class="offer-item"><b>' + esc(cLabel(o.cls.category)) + "</b><span>" + itemSummary(o) + "</span>" + (o.item.photos && o.item.photos.length ? '<div class="phs">' + photoStrip(o.item.photos) + "</div>" : "") +
    (extras.length ? '<span class="muted sm">Extras: ' + extras.join(", ") + "</span>" : "") + "</div>" +
    (o.cls.couriers > 1 ? '<div class="banner">Two people needed. Accept only if you can bring a helper.</div>' : "") +
    '<p class="muted sm center">If you decline or the timer runs out, it goes to the next courier.</p>' + acts + "</div></div>";
}
ACT["d-offer-more"] = function (d) { S.d.offerMore = S.d.offerMore === d.v ? null : d.v; render(); };
ACT["d-decline"] = function (d) {
  var c = myCourier(), o = byId(S.orders, d.v); if (!c || !o) return;
  var declined = (o.declinedBy || []).concat([c.id]);
  run(Store.claim("orders", o.id, c.id, function (x) { return x.offer && x.offer.to === c.id; }, { offer: null, declinedBy: declined, lastDeclineAt: Date.now() }), "Declined. It goes to the next courier.");
};
ACT["d-accept"] = function (d) {
  var c = myCourier(), o = byId(S.orders, d.v); if (!c || !o || busy) return;
  if (!routeCheck(c, o, Date.now())) return toast("This one no longer fits your route.");
  var now = Date.now();
  var patch = { status: "assigned", offer: null, courier: { id: c.id, name: c.name, vehicle: c.vehicle.type, plate: c.vehicle.plate || "", phone: c.phone }, courierPay: r2(o.price.total * share() / 100), timeline: { assigned: now } };
  run(Store.claim("orders", o.id, c.id, function (x) { return x.status === "awaiting" && x.offer && x.offer.to === c.id && x.offer.until > Date.now(); }, patch).then(function (ok) {
    if (ok) { S.d.job = o.id; S.d.view = "job"; toast("Delivery accepted. Head to pickup when ready."); } else toast("The time ran out, so it went to another courier.");
  }));
};

// ---------- Active job ----------
function dJob(c) {
  var o = byId(S.orders, S.d.job);
  if (!o) return dHead("Delivery", "home") + '<div class="pad">' + emptyState("Delivery not found", "", '<button class="btn sm" data-act="d-go" data-v="home">Back</button>') + "</div>";
  var st = o.status === "issue" ? (o.issue && o.issue.prev) : o.status, toPickup = ["assigned", "to_pickup", "at_pickup"].indexOf(st) >= 0;
  var h = dHead('<span class="mono">' + esc(o.id) + "</span>", "home", isActive(o) ? '<button class="btn ghost sm" data-act="d-chat" data-v="' + esc(o.id) + '">Message' + (unread(o, "courier") ? ' <span class="badge in">1</span>' : "") + "</button>" : "") +
    '<div class="map map-md">' + mapSVG({ labels: false, routes: [Object.assign({ from: o.pickup.area, to: o.dropoff.area, fromLL: o.pickup.ll, toLL: o.dropoff.ll, vehicle: o.courier && o.courier.vehicle, dashed: toPickup }, courierPos(o))] }) + '</div><div class="pad">';
  h += '<div class="row between">' + chip(o.status) + '<span class="price-big">' + eur(payOf(o)) + "</span></div>";
  if (bookedAhead(o)) h += '<div class="banner">Booked ahead. Start by ' + hhmm(startAt(o)) + " to deliver by " + hhmm(o.deliverBy) + ".</div>";
  if (o.deliverBy && JOB_STEPS.indexOf(st) >= 0) { var lateNow = Date.now() > o.deliverBy; h += '<div class="by-card' + (lateNow ? " late" : Date.now() > o.deliverBy - 15 * 60000 ? " soon" : "") + '"><span>Deliver by</span><b>' + hhmm(o.deliverBy) + "</b><small>" + leftLabel(o.deliverBy) + (lateNow ? " · DART may deduct a late fee" : "") + "</small></div>"; }
  if (o.status === "cancelled") return h + '<div class="banner bad">This delivery was cancelled' + (o.cancelledBy === "admin" ? " by DART" : " by the customer") + ".</div>" + '<button class="btn block" data-act="d-go" data-v="home">Back to requests</button></div>';
  if (o.status === "delivered") return h + (o.review ? '<div class="card"><b>' + "★★★★★".slice(0, o.review.stars) + '<span class="muted">' + "★★★★★".slice(o.review.stars) + "</span></b>" + (o.review.text ? "<span>“" + esc(o.review.text) + "”</span>" : "") + (o.tip ? '<span class="ok-t">' + esc(o.customer.name) + " tipped you " + eur(o.tip.amount) + "</span>" : "") + "</div>" : "") + '<div class="card ok"><b>Delivered at ' + hhmm(o.timeline.delivered) + "</b>" + (o.late ? '<span class="bad-t">' + o.late.mins + " min late" + (lateFee(o) ? " · Late fee −" + eur(lateFee(o)) : "") + "</span>" : "") + "<span>You earned " + eur(earnOf(o)) + ". It's paid out with your next weekly payment.</span></div>" + '<button class="btn block" data-act="d-go" data-v="home">Back to requests</button></div>';
  var target = toPickup ? o.pickup : o.dropoff;
  h += '<div class="card"><span class="muted sm">' + (toPickup ? "Pickup" : "Delivery") + "</span><b>" + esc(target.street) + ", " + esc(target.area) + "</b>" + (target.notes ? "<span>" + esc(target.notes) + "</span>" : "") +
    '<a class="btn ghost sm" href="' + mapsLink(target.area, target.street) + '" target="_blank" rel="noopener">Navigate with Google Maps</a></div>';
  h += '<div class="card"><b>' + esc(cLabel(o.cls.category)) + "</b><span>" + itemSummary(o) + "</span>" + (o.item.photos && o.item.photos.length ? '<div class="phs">' + photoStrip(o.item.photos) + "</div>" : "") + (o.cls.couriers > 1 ? '<span class="warn-t">Two people needed</span>' : "") + "</div>";
  h += '<div class="person"><span class="avatar">' + esc(initials(o.customer.name)) + "</span><div><b>" + esc(o.customer.businessName || o.customer.name) + '</b><div class="muted sm">Customer</div></div></div>';
  if (o.status === "issue") {
    h += '<div class="banner bad">You reported: ' + esc(o.issue.reason) + ". DART support will contact you.</div>" + '<button class="btn block" data-act="d-resume">Problem solved, continue</button>';
  } else if (o.status === "at_pickup") {
    var pp = S.d.pickupPhoto && S.d.pickupPhoto.id === o.id ? S.d.pickupPhoto.src : null;
    h += whereCheck(c, o.pickup, "pickup") + '<div class="card"><b>Photo of the item</b><span class="muted">Take a photo showing you have it, before you leave the pickup.</span>' +
      (pp ? '<img class="proof" src="' + safeImg(pp) + '" alt="Your pickup photo">' : "") +
      '<label class="file-btn">' + (pp ? "Retake photo" : "Take a photo of the item") + '<input type="file" accept="image/*" capture="environment" data-file="pickup"></label></div>' +
      '<button class="btn block big" data-act="d-next"' + (busy || !pp || !atPlace(c, o.pickup) ? " disabled" : "") + ">" + NEXT[o.status][1] + "</button>";
  } else if (NEXT[o.status]) {
    var place = GATE[o.status] === "pickup" ? o.pickup : GATE[o.status] === "dropoff" ? o.dropoff : null;
    h += (place ? whereCheck(c, place, GATE[o.status]) : "") + '<button class="btn block big" data-act="d-next"' + (busy || (place && !atPlace(c, place)) ? " disabled" : "") + ">" + NEXT[o.status][1] + "</button>";
  } else if (o.status === "at_dest") {
    var p = S.d.proof, needSig = !!(o.item.options && o.item.options.signature), here = atPlace(c, o.dropoff);
    h += whereCheck(c, o.dropoff, "dropoff") + '<form class="card" data-form="d-deliver"><b>Proof of delivery</b>' +
      (o.code ? field("Delivery code from the customer", inp("d.proof.code", p.code, 'inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="off" placeholder="4 digits" required'), "The customer has it in their DART app or email. Ask the person receiving it.") : "") +
      field("Received by", inp("d.proof.receiver", p.receiver, 'placeholder="Name, or \'Left with concierge\'" required')) +
      (p.photo ? '<img class="proof" src="' + safeImg(p.photo) + '" alt="Your delivery photo">' : "") +
      '<label class="file-btn">' + (p.photo ? "Retake photo" : "Take a photo of the delivered item") + '<input type="file" accept="image/*" capture="environment" data-file="proof"></label>' +
      (needSig ? '<div class="sig"><div class="row between"><span class="field-l">Signature of the person receiving it</span><button type="button" class="link" data-act="d-sig-clear">Clear</button></div><canvas id="sig-pad" width="640" height="260" aria-label="Signature pad"></canvas><small class="hint">Ask them to sign with a finger.</small></div>' : "") +
      '<button class="btn ok block"' + (here ? "" : " disabled") + ">Complete delivery</button></form>";
  }
  h += '<div class="row wrap"><button class="btn ghost sm" data-act="d-issue" data-v="' + esc(o.id) + '">Report a problem</button>' + (["assigned", "to_pickup"].indexOf(o.status) >= 0 ? '<button class="btn ghost sm" data-act="d-release" data-v="' + esc(o.id) + '">Give this delivery back</button>' : "") + "</div>";
  return h + '<div class="card"><b>Status history</b>' + timelineList(o) + "</div></div>";
}
// Live location: while online, the phone's GPS sets the courier's area (the nearest DART area).
// Saved when the area changes or every minute, so offers and the map use where the courier really is.
var GPS = { watch: null, fix: null, err: null, savedAt: 0 };
function gpsOn() { return typeof navigator !== "undefined" && !!navigator.geolocation; }
function gpsStart() {
  if (GPS.watch != null || !gpsOn()) return;
  GPS.err = null;
  GPS.watch = navigator.geolocation.watchPosition(function (p) {
    var c = myCourier(); GPS.fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, at: Date.now() }; GPS.err = null;
    if (!c) return;
    var n = nearestArea(GPS.fix.lat, GPS.fix.lng), moved = n.area !== c.area;
    if (moved || Date.now() - GPS.savedAt > 60000) {
      GPS.savedAt = Date.now();
      Store.update("couriers", c.id, { area: n.area, pos: { lat: +GPS.fix.lat.toFixed(5), lng: +GPS.fix.lng.toFixed(5), at: GPS.fix.at }, updatedAt: Date.now() }).catch(function () {});
    }
    if (moved) render();
  }, function (e) { GPS.err = e && e.code === 1 ? "denied" : "unavailable"; render(); }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
}
function gpsStop() { if (GPS.watch != null && gpsOn()) navigator.geolocation.clearWatch(GPS.watch); GPS.watch = null; }
function gpsBanner() {
  if (!LIVE) return "";
  if (!gpsOn()) return '<div class="banner bad">This phone can\'t share its location, so you can\'t get deliveries.</div>';
  if (GPS.err === "denied") return '<div class="banner bad"><b>Turn on location for DART Courier.</b> DART needs it to send you nearby deliveries and to check you\'re at each pickup and drop-off. Allow it in your phone\'s settings, then come back.</div>';
  if (GPS.err) return '<div class="banner">Can\'t find your location right now. Check location is on and you have signal.</div>';
  return "";
}
AFTER.push(function () {
  if (!LIVE || route() !== "courier") return gpsStop();
  var c = myCourier();
  if (c && c.status === "approved" && c.online) gpsStart(); else gpsStop();
});

// Steps that can only be confirmed at a place: the courier's GPS area must match the pickup or drop-off area.
// While admin has "Location check: testing" on, couriers can skip it.
var GATE = { to_pickup: "pickup", at_pickup: "pickup", in_transit: "dropoff" };
function atPlace(c, place) { return !!(c && place && c.area === place.area); }
function whereCheck(c, place, kind) {
  var ok = atPlace(c, place), label = kind === "pickup" ? "pickup" : "delivery address";
  if (ok) return '<div class="where ok"><i aria-hidden="true"></i><span>You\'re at the ' + label + "</span></div>";
  var away = c.area ? tripKm(c.area, place.area).toFixed(1) + " km away" : "location unknown";
  var skip = !LIVE || settings().gpsTest !== false;
  return '<div class="where"><i aria-hidden="true"></i><span><b>You need to be at the ' + label + "</b> (" + away + "). DART checks your location before you can confirm.</span>" +
    (skip ? '<button class="btn ghost sm" data-act="d-area" data-v="' + esc(place.area) + '">Testing: I\'m in ' + esc(place.area) + "</button>" : "") + "</div>";
}
ACT["d-next"] = function () {
  var o = byId(S.orders, S.d.job), c = myCourier(); if (!o || !NEXT[o.status] || busy) return;
  var g = GATE[o.status]; if (g && !atPlace(c, g === "pickup" ? o.pickup : o.dropoff)) return toast("You need to be there first.");
  var to = NEXT[o.status][0], patch = { status: to, timeline: {} }; patch.timeline[to] = Date.now();
  if (o.status === "at_pickup") {
    var pp = S.d.pickupPhoto && S.d.pickupPhoto.id === o.id ? S.d.pickupPhoto.src : null;
    if (!pp) return toast("Take a photo of the item first.");
    patch.pickupProof = { photo: pp, at: Date.now() };
  }
  run(Store.update("orders", o.id, patch).then(function () { if (to === "collected") S.d.pickupPhoto = null; }), STATUS[to]);
};
// The friend who shared a referral code gets credit once the first delivery is delivered.
function rewardReferral(oid) {
  var o = byId(S.orders, oid), ref = o && o.billing && o.billing.discount && o.billing.discount.referrer;
  if (!ref || o.refRewarded) return Promise.resolve();
  var amt = r2(num(pricing().referralReward, 5));
  return Store.claim("orders", oid, "referral", function (x) { return !x.refRewarded; }, { refRewarded: Date.now() }).then(function (ok) {
    var a = ok && byId(S.accounts, ref); if (!a || !(amt > 0)) return;
    return Store.update("accounts", a.id, { credit: r2(num(a.credit, 0) + amt), creditLog: (a.creditLog || []).concat([{ amount: amt, reason: "Friend's first delivery: " + String(o.customer.name || "").split(" ")[0], at: Date.now() }]).slice(-50) });
  });
}
FILES["pickup"] = function (file) { var id = S.d.job; shrinkImage(file, 640, 60000).then(function (src) { S.d.pickupPhoto = { id: id, src: src }; render(); }, function () { toast("That photo couldn't be read."); }); };
// Signature pad: strokes are kept as an image so a redraw doesn't lose them.
ACT["d-sig-clear"] = function () { S.d.proof.sig = null; render(); };
AFTER.push(function (root) {
  var cv = root.querySelector("#sig-pad"); if (!cv) return;
  var g = cv.getContext("2d"), drawing = false, last = null;
  g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
  g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#170F2E";
  if (S.d.proof.sig) { var im = new Image(); im.onload = function () { g.drawImage(im, 0, 0); }; im.src = S.d.proof.sig; }
  var pt = function (e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener("pointerdown", function (e) { holdRender = true; drawing = true; last = pt(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener("pointermove", function (e) { if (!drawing) return; var p = pt(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; });
  var end = function () { if (!drawing) return; drawing = false; S.d.proof.sig = cv.toDataURL("image/jpeg", 0.8); };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
});
ACT["d-resume"] = function () { var o = byId(S.orders, S.d.job); if (!o) return; run(Store.update("orders", o.id, { status: o.issue.prev || "assigned", issue: { open: false, resolvedAt: Date.now() } }), "Back on track"); };
// Only before reaching the pickup: once a courier is there, they may have the item, so problems go to DART via Report a problem.
ACT["d-release"] = function (d) { S.modal = { kind: "confirm", title: "Give this delivery back?", body: "It goes back to other couriers. Do this only if you can't do it. Once you're at the pickup, use Report a problem instead.", yes: "Give it back", act: "d-release-yes", v: d.v }; render(); };
ACT["d-release-yes"] = function (d) {
  S.modal = null; var c = myCourier();
  run(Store.claim("orders", d.v, c.id, function (x) { return x.courier && x.courier.id === c.id && ["assigned", "to_pickup"].indexOf(x.status) >= 0; }, { status: "awaiting", courier: null, courierPay: null, offer: null, declinedBy: [c.id], timeline: { awaiting: Date.now() }, releasedBy: c.id }).then(function (ok) { S.d.view = "home"; if (!ok) toast("It couldn't be given back. Report a problem instead."); }));
};
ACT["d-issue"] = function (d) { S.modal = { kind: "issue", order: d.v, reason: "Can't find the address", text: "", role: "courier" }; render(); };
FILES["proof"] = function (file) { shrinkImage(file, 640, 60000).then(function (src) { S.d.proof.photo = src; render(); }, function () { toast("That photo couldn't be read."); }); };
FORMS["d-deliver"] = function () {
  var o = byId(S.orders, S.d.job), p = S.d.proof; if (!o || busy) return;
  if (!atPlace(myCourier(), o.dropoff)) return toast("You need to be at the delivery address.");
  if (o.code && String(p.code || "").trim() !== o.code) return toast("That code doesn't match. Ask for the 4-digit code in the customer's DART app.");
  if (!clip(p.receiver, 60)) return toast("Add who received it.");
  if (!p.photo) return toast("Take a photo of the delivered item.");
  if (o.item.options && o.item.options.signature && !p.sig) return toast("Ask the person receiving it to sign.");
  var now = Date.now(), acc = byId(S.accounts, o.customer.id) || { id: o.customer.id, name: o.customer.name, email: "" };
  var proof = { receiver: clip(p.receiver, 60), at: now, photo: p.photo, codeOk: !!o.code }; if (p.sig) proof.sig = p.sig;
  var late = o.deliverBy && now > o.deliverBy ? { mins: Math.round((now - o.deliverBy) / 60000), penalty: 0 } : null;
  var done = Object.assign({}, o, { timeline: Object.assign({}, o.timeline, { delivered: now }) });
  var invStatus = o.billing && o.billing.status === "to_invoice" ? "outstanding" : "paid";
  var invId = "I-" + rid(8), inv = deliveryInvoice(done, acc, invStatus);
  run(Store.update("orders", o.id, { status: "delivered", proof: proof, late: late, timeline: { delivered: now }, invoiceId: invId }).then(function () { return Store.set("invoices", invId, inv); }).then(function () { return rewardReferral(o.id); }).then(function () { S.d.proof = { photo: null, receiver: "", code: "", sig: null }; }), "Delivered. Nice work.");
};

// ---------- Messages, history, earnings ----------
function dMessages() {
  var list = myJobs().filter(function (o) { return o.status !== "cancelled" || o.lastMsg; }).sort(function (a, b) { return ((b.lastMsg && b.lastMsg.at) || b.createdAt) - ((a.lastMsg && a.lastMsg.at) || a.createdAt); });
  return dHead("Messages") + '<div class="pad">' + (list.length ? '<div class="list">' + list.map(function (o) {
    return '<button class="item" data-act="d-chat" data-v="' + esc(o.id) + '"><b>' + esc(o.customer.businessName || o.customer.name) + "</b>" + (unread(o, "courier") ? '<span class="badge in">new</span>' : chip(o.status)) + "<small>" + esc(o.lastMsg ? o.lastMsg.text : "No messages yet") + '</small><small class="mono">' + esc(o.id) + "</small></button>";
  }).join("") + "</div>" : emptyState("No conversations yet", "You can message a customer once you accept their delivery.")) + "</div>";
}
ACT["d-chat"] = function (d) { S.d.job = d.v; S.d.view = "chat"; openChat(d.v); markRead(d.v); render(); scrollChat(); };
function dChat(c) {
  var o = byId(S.orders, S.d.job); if (!o) return dHead("Chat", "home");
  if (!isActive(o)) return dHead("Chat", "job") + emptyState("This delivery is finished", "Messages close when a delivery ends. Need help? Contact DART from Account → Help.");
  if (Chat.orderId !== o.id) openChat(o.id);
  return dHead(esc(o.customer.businessName || o.customer.name), "job", '<button class="btn ghost sm" data-act="d-job" data-v="' + esc(o.id) + '">Delivery</button>') + chatView(o, "courier", c.name);
}
// ---------- Earnings ----------
// Totals for a chosen period (like the big food-delivery apps), the deliveries behind them,
// then statements: what's owed now, past payments, and a way to ask DART for an invoice.
var EARN_P = [["today", "Today"], ["week", "This week"], ["lastweek", "Last week"], ["month", "This month"], ["lastmonth", "Last month"]];
function dayStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function weekStart(t) { var d = new Date(dayStart(t)); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }
function monthStart(t, back) { var d = new Date(dayStart(t)); d.setDate(1); if (back) d.setMonth(d.getMonth() - back); return d.getTime(); }
function earnRange(k, now) {
  if (k === "today") return [dayStart(now), Infinity];
  if (k === "week") return [weekStart(now), Infinity];
  if (k === "lastweek") { var a = new Date(weekStart(now)); a.setDate(a.getDate() - 7); return [a.getTime(), weekStart(now)]; }
  if (k === "lastmonth") return [monthStart(now, 1), monthStart(now)];
  return [monthStart(now), Infinity];
}
function nextMonday(now) { var d = new Date(dayStart(now)); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d.getTime(); }
function bigEur(v) { var c = eur(v), m = c.match(/^(.*?)(\d[\d.,]*)([.,])(\d\d)(.*)$/); return m ? m[1] + m[2] + "<sup>" + m[3] + m[4] + "</sup>" + m[5] : c; }
function doneJobs() { return myJobs().filter(function (o) { return o.status === "delivered"; }).sort(function (a, b) { return b.timeline.delivered - a.timeline.delivered; }); }
function jobTitle(o) { return o.customer.businessName || o.pickup.street || o.pickup.area; }
function earnRow(o) {
  return '<button class="earn-row" data-act="d-job" data-v="' + esc(o.id) + '"><span><b>' + esc(jobTitle(o)) + "</b><small>" + (isToday(o.timeline.delivered) ? hhmm(o.timeline.delivered) : when(o.timeline.delivered)) + " · " + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + '</small></span><b class="num">' + eur(earnOf(o)) + '</b><i aria-hidden="true">›</i></button>';
}
function dEarnings(c) {
  var k = S.d.earnP || "week", r = earnRange(k, Date.now()), done = doneJobs();
  var list = done.filter(function (o) { return o.timeline.delivered >= r[0] && o.timeline.delivered < r[1]; });
  var sum = function (l, f) { return r2(l.reduce(function (s, o) { return s + f(o); }, 0)); };
  var fees = sum(list, payOf), tips = sum(list, tipOf), late = sum(list, lateFee), total = sum(list, earnOf);
  var pend = done.filter(function (o) { return !o.courierPaid; }), owed = sum(pend, earnOf), paidRuns = payoutRuns(done);
  var shown = S.d.earnAll ? list : list.slice(0, 3);
  return dHead("Earnings") + '<div class="pad">' +
    '<div class="seg inline earn-p">' + EARN_P.map(function (p) { return '<button class="' + (k === p[0] ? "on" : "") + '" data-act="d-earn-p" data-v="' + p[0] + '">' + p[1] + "</button>"; }).join("") + "</div>" +
    '<div class="card earn-sum"><div class="earn-top"><div><b class="earn-big num">' + bigEur(total) + '</b><small>Total earnings</small></div><div><b class="earn-big num">' + list.length + "</b><small>" + (list.length === 1 ? "Delivery" : "Deliveries") + "</small></div></div>" +
    '<p class="earn-break">Delivery fees <b class="num">' + eur(fees) + "</b> · Tips <b class=\"num\">" + eur(tips) + "</b>" + (late ? ' · Late fees <b class="num bad-t">−' + eur(late) + "</b>" : "") + "</p></div>" +
    (list.length ? '<div class="earn-list">' + shown.map(earnRow).join("") + (list.length > 3 ? '<button class="link earn-more" data-act="d-earn-all">' + (S.d.earnAll ? "Show less" : "See all " + list.length) + "</button>" : "") + "</div>"
      : '<p class="muted center">No deliveries in this period.</p>') +
    '<div class="sec-h"><h3>Statements</h3></div><div class="menu">' +
    '<div class="menu-row"><b>Current balance</b><b class="num">' + eur(owed) + '</b><span>' + (owed ? "Paid on " + dmy(nextMonday(Date.now())) + " to " + esc(c.payout ? "IBAN ending " + String(c.payout.iban).slice(-4) : "your bank") : "Nothing waiting to be paid") + "</span></div>" +
    '<button data-act="d-go" data-v="payments"><b>Previous payments</b><span>' + (paidRuns.length ? paidRuns.length + (paidRuns.length === 1 ? " payment" : " payments") + " · last " + dmy(paidRuns[0].at) : "None yet") + "</span><i>›</i></button>" +
    '<button data-act="d-go" data-v="invreq"><b>Request an invoice</b><span>For a month, sent to you by DART</span><i>›</i></button></div>' +
    '<p class="muted sm">You earn the amount shown on each delivery. Payments go out every Monday.</p></div>';
}
ACT["d-earn-p"] = function (d) { S.d.earnP = d.v; S.d.earnAll = false; render(); };
ACT["d-earn-all"] = function () { S.d.earnAll = !S.d.earnAll; render(); };
// Each payout DART records groups the deliveries it covered.
function payoutRuns(done) {
  var runs = {};
  done.filter(function (o) { return o.courierPaid; }).forEach(function (o) { var k = o.courierPayout || dmy(o.courierPaidAt); runs[k] = runs[k] || { id: k, at: o.courierPaidAt, jobs: [] }; runs[k].jobs.push(o); });
  return Object.keys(runs).map(function (k) { return runs[k]; }).sort(function (a, b) { return b.at - a.at; });
}
function dPayments(c) {
  var runs = payoutRuns(doneJobs());
  return dHead("Previous payments", "earnings") + '<div class="pad">' + (runs.length ? '<div class="menu">' + runs.map(function (p) {
    return '<button data-act="d-statement" data-v="' + esc(p.id) + '"><b>' + dmy(p.at) + '</b><span>' + p.jobs.length + (p.jobs.length === 1 ? " delivery" : " deliveries") + " · " + eur(r2(p.jobs.reduce(function (s, o) { return s + earnOf(o); }, 0))) + "</span><i>›</i></button>";
  }).join("") + "</div>" : emptyState("No payments yet", "Each Monday's payment shows up here with the deliveries it covers.")) + "</div>";
}
ACT["d-statement"] = function (d) { S.modal = { kind: "d-statement", id: d.v }; render(); };
function statementModal(m) {
  var p = payoutRuns(doneJobs()).filter(function (x) { return x.id === m.id; })[0]; if (!p) return "";
  var sum = function (f) { return r2(p.jobs.reduce(function (s, o) { return s + f(o); }, 0)); };
  return modalShell("Payment " + dmy(p.at),
    '<div class="card"><dl class="kv">' + p.jobs.map(function (o) { return "<dt>" + esc(o.id) + " · " + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + '<br><span class="muted sm">' + when(o.timeline.delivered) + '</span></dt><dd class="num">' + eur(earnOf(o)) + "</dd>"; }).join("") +
    '<dt class="muted">Delivery fees</dt><dd class="muted num">' + eur(sum(payOf)) + '</dd><dt class="muted">Tips</dt><dd class="muted num">' + eur(sum(tipOf)) + "</dd>" + (sum(lateFee) ? '<dt class="muted">Late fees</dt><dd class="muted num">−' + eur(sum(lateFee)) + "</dd>" : "") +
    '<dt class="tot">Paid</dt><dd class="tot num">' + eur(sum(earnOf)) + "</dd></dl></div>",
    '<button class="btn" data-act="d-go" data-v="invreq">Request an invoice</button>');
}
function dInvoiceRequest(c) {
  var done = doneJobs(), months = [];
  for (var i = 0; i < 12; i++) { var a = monthStart(Date.now(), i), b = i ? monthStart(Date.now(), i - 1) : Infinity, n = done.filter(function (o) { return o.timeline.delivered >= a && o.timeline.delivered < b; }); if (n.length || i < 2) months.push([String(a), new Date(a).toLocaleDateString(locale(), { month: "long", year: "numeric" }) + " · " + n.length + (n.length === 1 ? " delivery" : " deliveries")]); }
  if (!S.d.invreq) S.d.invreq = { month: months[0][0], note: "" };
  var mine = (S.tickets || []).filter(function (t) { return t.courierId === c.id && t.topic === "invoice"; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
  return dHead("Request an invoice", "earnings") + '<div class="pad"><form class="card stack" data-form="d-invreq"><p class="muted sm">DART prepares an invoice for your deliveries in the month you choose and sends it to ' + esc(c.email) + ".</p>" +
    field("Month", sel("d.invreq.month", S.d.invreq.month, months)) + field("Anything to add? (optional)", txt("d.invreq.note", S.d.invreq.note, 'rows="2" placeholder="e.g. My Partita IVA, or a different email"')) + '<button class="btn">Send request</button></form>' +
    (mine.length ? '<div class="sec-h"><h3>Your requests</h3></div>' + mine.map(ticketCard).join("") : "") + "</div>";
}
FORMS["d-invreq"] = function () {
  var c = myCourier(), q = S.d.invreq, a = +q.month, label = new Date(a).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  var end = monthStart(a, -1), jobs = doneJobs().filter(function (o) { return o.timeline.delivered >= a && o.timeline.delivered < end; });
  var text = "Please send an invoice for " + label + ": " + jobs.length + " deliveries, " + eur(r2(jobs.reduce(function (s, o) { return s + earnOf(o); }, 0))) + "." + (clip(q.note, 500) ? "\n" + clip(q.note, 500) : "");
  S.d.invreq = null;
  run(Store.set("tickets", "T-" + rid(6), { from: "courier", courierId: c.id, name: c.name, orderId: null, topic: "invoice", subject: "Invoice request: " + label, text: text, status: "open", replies: [], createdAt: Date.now() }), "Request sent. DART will email your invoice.");
};
function dHistory() {
  var list = myJobs().sort(function (a, b) { return b.createdAt - a.createdAt; });
  return dHead("Delivery history", "account") + '<div class="pad">' + (list.length ? '<div class="list">' + list.map(function (o) { return '<button class="item" data-act="d-job" data-v="' + esc(o.id) + '"><b>' + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + "</b>" + chip(o.status) + "<small>" + when(o.createdAt) + " · " + esc(o.id) + '</small><small class="num">' + eur(payOf(o)) + "</small></button>"; }).join("") + "</div>" : emptyState("No deliveries yet", "")) + "</div>";
}
function dNotesView() {
  var list = courierNotes();
  return dHead("Notifications", "home") + '<div class="pad">' + (list.length ? '<div class="list">' + list.map(function (n) {
    return '<button class="item" data-act="' + (n.chat ? "d-chat" : n.job ? "d-job" : n.help ? "d-go" : "d-go") + '" data-v="' + esc(n.chat || n.job || (n.help ? "help" : "home")) + '"><b>' + esc(n.text) + "</b><small>" + when(n.at) + "</small><small>" + esc(n.sub || "") + "</small><small></small></button>";
  }).join("") + "</div>" : emptyState("No notifications yet", "")) + "</div>";
}

// ---------- Account, vehicle, payout, help ----------
function dAccount(c) {
  var rows = [["vehicle", "Vehicle and documents", vLabel(c.vehicle.type) + (c.vehicleStatus === "pending" ? " · change pending" : "")], ["payout", "Payout details", c.payout ? "IBAN ending " + String(c.payout.iban).slice(-4) : "Not set"], ["history", "Delivery history", myJobs().length + " deliveries"], ["notes", "Notifications", ""], ["help", "Help and support", "Report a problem, FAQ"]];
  var rt = courierRating(c.id), revs = myJobs().filter(function (o) { return o.review && o.review.text; }).sort(function (a, b) { return b.review.at - a.review.at; }).slice(0, 3);
  var tips = myJobs().reduce(function (s, o) { return s + tipOf(o); }, 0);
  return dHead("Account", "", inApp() ? langSwitch() : "") + '<div class="pad"><div class="person"><span class="avatar">' + esc(initials(c.name)) + "</span><div><b>" + esc(c.name) + '</b><div class="muted sm">' + esc(c.email) + " · " + esc(c.phone) + "</div></div></div>" +
    '<div class="card"><div class="row between"><b>Your rating</b><b class="rating-big">' + (rt ? rt.avg.toFixed(1) + " ★" : "–") + '</b></div><span class="muted sm">' + (rt ? "From " + rt.n + " customer reviews" : "No reviews yet") + (tips ? " · " + eur(tips) + " in tips" : "") + "</span>" +
    revs.map(function (o) { return '<div class="rev"><span>' + "★★★★★".slice(0, o.review.stars) + "</span><p>“" + esc(o.review.text) + "”</p></div>"; }).join("") + "</div>" +
    '<div class="menu">' + rows.map(function (r) { return '<button data-act="d-go" data-v="' + r[0] + '"><b>' + r[1] + "</b><span>" + esc(r[2]) + "</span><i>›</i></button>"; }).join("") + "</div>" + '<button class="btn ghost block" data-act="d-logout">Log out</button></div>';
}
function dVehicle(c) {
  var v = c.vehicle, pv = c.pendingVehicle;
  var h = dHead("Vehicle", "account") + '<div class="pad"><div class="card"><div class="row between"><b>' + esc(vLabel(v.type)) + '</b><span class="chip s-ok">Approved</span></div><span>' + esc(v.model || "") + (v.plate ? " · " + esc(v.plate) : "") + '</span><span class="muted">Loading space ' + v.l + "×" + v.w + "×" + v.h + " cm · up to " + v.kg + " kg</span></div>";
  if (c.vehicleStatus === "pending" && pv) h += '<div class="card warn"><b>Change waiting for approval</b><span>' + esc(vLabel(pv.type)) + " · " + pv.l + "×" + pv.w + "×" + pv.h + " cm · " + pv.kg + " kg</span></div>";
  if (c.vehicleStatus === "declined" && c.vehicleNote) h += '<div class="banner bad">Your last vehicle change was declined: ' + esc(c.vehicleNote) + "</div>";
  if (S.d.vEdit) h += '<form class="stack" data-form="d-vehicle">' + vehicleForm("d.vEdit", S.d.vEdit) + '<div class="row"><button type="button" class="btn ghost" data-act="d-vedit-cancel">Cancel</button><button class="btn" style="flex:1">Send for approval</button></div></form>';
  else h += '<button class="btn ghost block" data-act="d-vedit">Change vehicle or capacity</button>';
  return h + docsForm(v.type, c.docs || {}, "live") + "</div>";
}
ACT["d-vedit"] = function () { S.d.vEdit = clone(myCourier().vehicle); render(); };
ACT["d-vedit-cancel"] = function () { S.d.vEdit = null; render(); };
FORMS["d-vehicle"] = function () {
  var v = cleanVehicle(S.d.vEdit), c = myCourier();
  if (!v.l || !v.w || !v.h || !v.kg) return toast("Add the loading space and maximum weight.");
  S.d.vEdit = null;
  run(Store.update("couriers", c.id, { pendingVehicle: v, vehicleStatus: "pending", vehicleRequestedAt: Date.now() }), "Sent to DART for approval");
};
function dPayout(c) {
  if (!S.d.pay) S.d.pay = { holder: c.payout ? c.payout.holder : c.name, iban: c.payout ? c.payout.iban : "" };
  return dHead("Payout details", "account") + '<div class="pad"><form class="card" data-form="d-payout">' + field("Account holder", inp("d.pay.holder", S.d.pay.holder, "required")) + field("IBAN", inp("d.pay.iban", S.d.pay.iban, "required")) + '<button class="btn">Save</button></form></div>';
}
FORMS["d-payout"] = function () { var c = myCourier(); run(Store.update("couriers", c.id, { payout: { holder: clip(S.d.pay.holder, 60), iban: clip(S.d.pay.iban, 40).toUpperCase() } }), "Payout details saved"); };
function dHelp(c) {
  var t = S.d.ticket, mine = S.tickets.filter(function (x) { return x.courierId === c.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
  return dHead("Help", "account") + '<div class="pad"><div class="faq"><details><summary>When do I get paid?</summary><p>Every Monday, by bank transfer, for every delivery completed up to Sunday.</p></details><details><summary>Why don\'t I see some requests?</summary><p>DART only offers items that fit your registered vehicle\'s loading space and weight limit.</p></details><details><summary>What if something goes wrong?</summary><p>Use "Report a problem" on the delivery. DART support sees it straight away.</p></details></div>' +
    '<form class="card" data-form="d-ticket"><b>Contact DART support</b>' + field("Topic", sel("d.ticket.topic", t.topic, [["delivery", "A delivery"], ["customer", "A customer"], ["payment", "Earnings or payment"], ["vehicle", "My vehicle or documents"], ["other", "Something else"]])) +
    field("Delivery (optional)", sel("d.ticket.orderId", t.orderId, [["", "None"]].concat(myJobs().slice(0, 20).map(function (o) { return [o.id, o.id + " · " + o.pickup.area + " → " + o.dropoff.area]; })))) + field("Message", txt("d.ticket.text", t.text, 'rows="4" required')) + '<button class="btn">Send</button></form>' +
    (mine.length ? '<div class="sec-h"><h3>Your requests</h3></div>' + mine.map(ticketCard).join("") : "") + "</div>";
}
FORMS["d-ticket"] = function () {
  var t = S.d.ticket, c = myCourier(), text = clip(t.text, 1000); if (!text) return toast("Write a message first.");
  var labels = { delivery: "Delivery problem", customer: "About a customer", payment: "Earnings or payment", vehicle: "Vehicle or documents", other: "Other" };
  S.d.ticket = { topic: "delivery", orderId: "", text: "" };
  run(Store.set("tickets", "T-" + rid(6), { from: "courier", courierId: c.id, name: c.name, orderId: t.orderId || null, topic: t.topic, subject: labels[t.topic], text: text, status: "open", replies: [], createdAt: Date.now() }), "Sent to DART support");
};


// Every stop in the planned order; the first one is where to go next.
function routeCard(plan) {
  return '<div class="route"><div class="row between"><b>Your route</b><span class="muted sm">' + plan.stops.length + " stops · done about " + hhmm(plan.end) + "</span></div><ol>" + plan.stops.map(function (s, i) {
    var o = s.o, place = s.kind === "pickup" ? o.pickup : o.dropoff;
    return '<li class="' + (i === 0 ? "next" : "") + (s.late ? " late" : "") + '"><button data-act="d-job" data-v="' + esc(o.id) + '"><i class="' + s.kind + '" aria-hidden="true"></i><span><b>' + (s.kind === "pickup" ? "Pick up" : "Drop off") + " · " + esc(place.street || place.area) + "</b><small>" + esc(place.area) + " · " + esc(cLabel(o.cls.category)) + (s.kind === "dropoff" && o.deliverBy ? " · by " + hhmm(o.deliverBy) : "") + "</small></span><em>" + hhmm(s.eta) + "</em></button></li>";
  }).join("") + "</ol>" + (plan.ok ? "" : '<p class="bad-t sm">At this pace one delivery will be late. Message the customer or DART support.</p>') + "</div>";
}

// ---------- Courier home: a full map with a sheet over it ----------
function dMapHome(c) {
  var job = activeJob(), done = myJobs().filter(function (o) { return o.status === "delivered"; });
  var today = done.filter(function (o) { return isToday(o.timeline.delivered); }), earned = today.reduce(function (s, o) { return s + earnOf(o); }, 0);
  var pending = done.filter(function (o) { return !o.courierPaid; }).reduce(function (s, o) { return s + earnOf(o); }, 0);
  var pins = [];
  var me = c.online && c.area ? { area: c.area, ll: c.pos ? [c.pos.lat, c.pos.lng] : null, vehicle: c.vehicle.type } : null;
  var jobs = activeJobs(), plan = myRoute(c);
  var routes = jobs.map(function (j) { return Object.assign({ from: j.pickup.area, to: j.dropoff.area, fromLL: j.pickup.ll, toLL: j.dropoff.ll, vehicle: j.courier && j.courier.vehicle }, courierPos(j)); });
  var title = !c.online && !job ? "You're offline" : jobs.length > 1 ? jobs.length + " deliveries on your route" : job ? "On a delivery" : "Waiting for a delivery";
  var sub = !c.online ? "Go online to get deliveries" : c.area ? "In " + c.area : "Finding your location…";
  var h = '<div class="mh courier"><div class="mh-map">' + mapSVG({ vb: "-40 -200 440 1000", routes: routes, pins: pins, me: me }) + "</div>" +
    '<div class="mh-top"><button class="mh-online ' + (c.online ? "on" : "") + '" data-act="d-online" role="switch" aria-checked="' + !!c.online + '"><i></i>' + (c.online ? "Online" : "Offline") + "</button>" +
    '<button class="mh-chip icon" data-act="d-go" data-v="notes" aria-label="Notifications"><svg><use href="#t-bell"/></svg>' + (courierUnseen() ? '<span class="badge">' + courierUnseen() + "</span>" : "") + "</button></div>" +
    '<div class="mh-title"><p>' + esc(sub) + "</p><h1>" + esc(title) + "</h1></div>";
  h += '<div class="mh-sheet"><div class="grab" aria-hidden="true"></div>' +
    '<div class="stat3"><div><b class="num">' + eur(earned) + "</b><small>Today</small></div><div><b>" + today.length + '</b><small>Jobs today</small></div><div><b class="num">' + eur(pending) + "</b><small>To be paid</small></div></div>";
  if (c.vehicleStatus === "pending") h += '<div class="banner">Your vehicle change is waiting for approval. You get requests for your current vehicle until then.</div>';
  if (settings().open === false) h += '<div class="banner bad">DART is closed. No new requests until it reopens.</div>';
  if (plan && plan.stops.length > 2) h += routeCard(plan);
  else if (job) h += '<button class="item job-card" data-act="d-job" data-v="' + esc(job.id) + '"><b>' + esc(job.pickup.area) + " → " + esc(job.dropoff.area) + "</b>" + chip(job.status) + "<small>" + itemSummary(job) + (job.deliverBy ? " · by " + hhmm(job.deliverBy) : "") + '</small><small class="num">' + eur(payOf(job)) + "</small></button>";
  if (!c.online) h += '<button class="btn block big" data-act="d-online">Go online</button>';
  else {
    h += gpsBanner();
    if (!LIVE) h += field("Test build: where are you?", sel("d.areaPick", c.area || "", [["", "Choose area"]].concat(AREA_NAMES), 'data-onchange="d-area"'), "The phone apps use GPS instead.");
    var later = bookedJobs(c.id), board = openScheduled(c);
    if (later.length) h += '<div class="sec-h"><h3>Later today</h3></div><div class="list">' + later.map(function (o) { return schedRow(o, "d-job"); }).join("") + "</div>";
    if (board.length) h += '<div class="sec-h"><h3>Scheduled today</h3><span class="muted sm">Book ahead</span></div><div class="list">' + board.map(function (o) { return schedRow(o, "d-sched"); }).join("") + "</div>";
    if (!job) h += '<div class="wait-card"><span class="pulse" aria-hidden="true"></span><div><b>You\'re in the queue</b><span>New deliveries that fit your ' + esc(vLabel(c.vehicle.type).toLowerCase()) + " pop up on this screen. You have " + Math.round(OFFER_SECS / 60) + " minutes to accept or decline.</span></div></div>";
  }
  return h + "</div></div>";
}
