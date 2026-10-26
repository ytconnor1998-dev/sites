// ===== DART courier app =====
S.d = { view: "home", job: null, mode: "login", login: { email: "" }, reg: null, proof: { photo: null, receiver: "" }, vEdit: null, ticket: { topic: "delivery", orderId: "", text: "" } };
var JOB_STEPS = ["assigned", "to_pickup", "at_pickup", "collected", "in_transit", "at_dest"];
var NEXT = { assigned: ["to_pickup", "Start driving to pickup"], to_pickup: ["at_pickup", "I've arrived at pickup"], at_pickup: ["collected", "Item collected"], collected: ["in_transit", "Start the delivery"], in_transit: ["at_dest", "I've arrived at the destination"] };
var DOCS = { idcard: "ID card or passport", licence: "Driving licence", insurance: "Vehicle insurance", vehicleReg: "Vehicle registration (libretto)" };
function docsFor(type) { return type === "bicycle" ? ["idcard"] : ["idcard", "licence", "insurance", "vehicleReg"]; }
function myCourier() { return S.me.courierId ? byId(S.couriers, S.me.courierId) : null; }
function myJobs() { var id = S.me.courierId; return S.orders.filter(function (o) { return o.courier && o.courier.id === id; }); }
function activeJob() { return myJobs().filter(function (o) { return JOB_STEPS.indexOf(o.status) >= 0 || (o.status === "issue" && o.issue && JOB_STEPS.indexOf(o.issue.prev) >= 0); })[0] || null; }
function share() { return num(pricing().courierShare, 75); }
function payOf(o) { return o.courierPay != null ? o.courierPay : r2(o.price.total * share() / 100); }
function eligible(c, o) {
  if (o.status !== "awaiting" || !c || !c.vehicle || S.me.declined[o.id]) return false;
  if ((o.cls.vehicles || []).indexOf(c.vehicle.type) < 0) return false;
  return vehicleFits(c.vehicle, { l: o.cls.l, w: o.cls.w, h: o.cls.h, kg: o.cls.kg, qty: o.item.qty });
}
function requestsFor(c) {
  return S.orders.filter(function (o) { return eligible(c, o); }).sort(function (a, b) {
    var ka = c.area ? tripKm(c.area, a.pickup.area) : 0, kb = c.area ? tripKm(c.area, b.pickup.area) : 0; return ka - kb || a.createdAt - b.createdAt;
  });
}
function courierNotes() {
  var c = myCourier(); if (!c) return [];
  var out = [];
  if (c.approvedAt) out.push({ at: c.approvedAt, text: "Your DART courier account is approved", sub: "You can go online and take deliveries" });
  if (c.vehicleDecidedAt) out.push({ at: c.vehicleDecidedAt, text: "Vehicle change " + (c.vehicleStatus === "approved" ? "approved" : "declined"), sub: vLabel(c.vehicle && c.vehicle.type) });
  if (c.status === "approved" && c.online) requestsFor(c).forEach(function (o) { out.push({ at: o.createdAt, text: "New delivery request", sub: o.pickup.area + " → " + o.dropoff.area + " · " + eur(payOf(o)), req: o.id }); });
  myJobs().forEach(function (o) {
    if (o.lastMsg && o.lastMsg.from !== "courier") out.push({ at: o.lastMsg.at, text: "Message from " + (o.lastMsg.from === "admin" ? "DART support" : o.customer.name), sub: o.lastMsg.text, chat: o.id });
    if (o.status === "cancelled" && o.timeline.cancelled) out.push({ at: o.timeline.cancelled, text: "Delivery cancelled", sub: o.id, job: o.id });
    if (o.courierPaidAt) out.push({ at: o.courierPaidAt, text: "Earnings paid out", sub: eur(payOf(o)) + " for " + o.id });
  });
  S.tickets.filter(function (t) { return t.courierId === S.me.courierId; }).forEach(function (t) { (t.replies || []).forEach(function (r) { if (r.by === "admin") out.push({ at: r.at, text: "DART support replied", sub: r.text, help: true }); }); });
  return out.sort(function (a, b) { return b.at - a.at; }).slice(0, 60);
}
function courierUnseen() { var s = S.me.seen.courier || 0; return courierNotes().filter(function (n) { return n.at > s; }).length; }

// ---------- Shell ----------
var D_NAV = [["home", "Jobs", "send"], ["earnings", "Earnings", "euro"], ["messages", "Messages", "chat"], ["account", "Account", "user"]];
function courierApp() {
  var c = myCourier();
  var body = !c ? dAuth() : dView(c);
  var cur = S.d.view === "job" || S.d.view === "req" ? "home" : S.d.view === "chat" ? "messages" : ["vehicle", "help", "history", "payout", "notes"].indexOf(S.d.view) >= 0 ? "account" : S.d.view;
  var un = c ? myJobs().reduce(function (s, o) { return s + unread(o, "courier"); }, 0) : 0;
  var tabs = c && c.status === "approved" ? '<nav class="tabs t4">' + D_NAV.map(function (n) { return '<button class="' + (cur === n[0] ? "on" : "") + '" data-act="d-go" data-v="' + n[0] + '"><svg><use href="#t-' + n[2] + '"/></svg>' + n[1] + (n[0] === "messages" && un ? '<span class="badge">' + un + "</span>" : "") + "</button>"; }).join("") + "</nav>" : "";
  return stage('<div class="app-body" data-scroll="d-' + S.d.view + '">' + body + "</div>" + tabs, "DART Courier app");
}
function dHead(title, back, right) { return '<div class="app-head">' + (back ? '<button class="btn ghost sm" data-act="d-go" data-v="' + back + '">← Back</button>' : "") + "<h2>" + title + "</h2>" + (right || "") + "</div>"; }
function dView(c) {
  if (c.status === "pending" || c.status === "rejected" || c.status === "suspended") return dWaiting(c);
  switch (S.d.view) {
    case "req": return dRequest(c);
    case "job": return dJob(c);
    case "earnings": return dEarnings(c);
    case "messages": return dMessages();
    case "chat": return dChat(c);
    case "account": return dAccount(c);
    case "vehicle": return dVehicle(c);
    case "payout": return dPayout(c);
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
    '<form class="stack" data-form="d-login">' + field("Email", inp("d.login.email", S.d.login.email, 'type="email" autocomplete="email" required')) + field("Password", '<input class="input" type="password" autocomplete="current-password">', "Test build: passwords aren't checked or stored.") + '<button class="btn block">Log in</button></form>' +
    '<p class="center">New courier? <button class="link" data-act="d-reg-start">Apply to ride with DART</button></p></div>';
}
FORMS["d-login"] = function () {
  var e = slugEmail(S.d.login.email), c = S.couriers.filter(function (x) { return slugEmail(x.email) === e; })[0];
  if (!c) return toast("No courier account with that email. Apply instead.");
  S.me.courierId = c.id; saveMe(); S.d.view = "home"; render(); toast("Welcome back, " + c.name.split(" ")[0]);
};
ACT["d-reg-start"] = function () { S.d.mode = "register"; S.d.reg = S.d.reg || newReg(); render(); };
ACT["d-login-mode"] = function () { S.d.mode = "login"; render(); };
function dRegister() {
  var r = S.d.reg, steps = ["You", "Vehicle", "Documents", "Payout"];
  var h = '<div class="app-head">' + (r.step > 1 ? '<button class="btn ghost sm" data-act="d-reg-step" data-v="' + (r.step - 1) + '">← Back</button>' : '<button class="btn ghost sm" data-act="d-login-mode">← Log in</button>') + "<h2>Become a courier</h2></div><div class=\"pad\">" +
    '<ol class="stepper">' + steps.map(function (s, i) { return '<li class="' + (r.step === i + 1 ? "on" : r.step > i + 1 ? "done" : "") + '"><span>' + (i + 1) + ". " + s + "</span></li>"; }).join("") + "</ol>";
  if (r.step === 1) h += '<form class="stack" data-form="d-reg-1">' + field("Full name", inp("d.reg.name", r.name, "required")) + field("Email", inp("d.reg.email", r.email, 'type="email" required')) + field("Phone", inp("d.reg.phone", r.phone, 'type="tel" required')) + field("Home address", inp("d.reg.address", r.address, 'required placeholder="Street, number, CAP"')) + field("Password", '<input class="input" type="password">', "Test build: not stored.") + '<button class="btn block">Next: your vehicle</button></form>';
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

// ---------- Home: online, requests, active job ----------
function dHome(c) {
  var job = activeJob(), reqs = requestsFor(c), done = myJobs().filter(function (o) { return o.status === "delivered"; });
  var today = done.filter(function (o) { return isToday(o.timeline.delivered); }), earned = today.reduce(function (s, o) { return s + payOf(o); }, 0);
  var pending = done.filter(function (o) { return !o.courierPaid; }).reduce(function (s, o) { return s + payOf(o); }, 0);
  var h = dHead('<span class="logo"><svg><use href="#mark"/></svg>Courier</span>', "", '<button class="icon-btn" data-act="d-go" data-v="notes" aria-label="Notifications"><svg><use href="#t-bell"/></svg>' + (courierUnseen() ? '<span class="badge">' + courierUnseen() + "</span>" : "") + "</button>") + '<div class="pad">';
  h += '<div class="online-card ' + (c.online ? "on" : "") + '"><div style="flex:1"><b>' + (c.online ? "You're online" : "You're offline") + '</b><div class="sm">' + (c.online ? "Requests that fit your " + esc(vLabel(c.vehicle.type).toLowerCase()) + " show up here" : "Go online to get delivery requests") + "</div></div>" + sw("d-online", c.online, "Online") + "</div>";
  if (c.online) h += field("Where are you now?", sel("d.areaPick", c.area || "", [["", "Choose area"]].concat(AREA_NAMES), 'data-onchange="d-area"'), "Requests nearest to you come first.");
  h += '<div class="stat3"><div><b class="num">' + eur(earned) + "</b><small>Today</small></div><div><b>" + today.length + '</b><small>Jobs today</small></div><div><b class="num">' + eur(pending) + "</b><small>To be paid</small></div></div>";
  if (c.vehicleStatus === "pending") h += '<div class="banner">Your vehicle change is waiting for approval. You get requests for your current vehicle until then.</div>';
  if (settings().open === false) h += '<div class="banner bad">DART is closed. No new requests until it reopens.</div>';
  if (job) h += '<div class="sec-h"><h3>Your delivery</h3></div><button class="item job-card" data-act="d-job" data-v="' + esc(job.id) + '"><b>' + esc(job.pickup.area) + " → " + esc(job.dropoff.area) + "</b>" + chip(job.status) + "<small>" + itemSummary(job) + '</small><small class="num">' + eur(payOf(job)) + "</small></button>";
  if (!c.online) return h + "</div>";
  h += '<div class="sec-h"><h3>Delivery requests</h3><span class="muted sm">' + reqs.length + "</span></div>";
  if (job) h += '<p class="muted sm">Finish your current delivery before accepting another.</p>';
  h += reqs.length ? '<div class="list">' + reqs.map(function (o) {
    var away = c.area ? tripKm(c.area, o.pickup.area).toFixed(1) + " km away · " : "";
    return '<button class="item req" data-act="d-req" data-v="' + esc(o.id) + '"><b>' + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + '</b><b class="num pay">' + eur(payOf(o)) + "</b><small>" + away + o.price.km.toFixed(1) + " km trip · " + esc(cLabel(o.cls.category)) + (o.cls.couriers > 1 ? " · 2 people" : "") + "</small><small>" + hhmm(o.createdAt) + "</small></button>";
  }).join("") + "</div>" : emptyState("No requests right now", "Book something in the customer app and it shows up here if it fits your vehicle.");
  return h + "</div>";
}
ACT["d-go"] = function (d) { if (d.v !== "chat") closeChat(); S.d.view = d.v || "home"; if (d.v === "notes") { S.me.seen.courier = Date.now(); saveMe(); } render(); };
ACT["d-area"] = function (d) { var c = myCourier(); if (c) run(Store.update("couriers", c.id, { area: d.v, updatedAt: Date.now() })); };
ACT["d-online"] = function () {
  var c = myCourier(); if (!c) return;
  run(Store.update("couriers", c.id, { online: !c.online, updatedAt: Date.now() }), c.online ? "You're offline" : "You're online");
};
ACT["d-req"] = function (d) { S.d.job = d.v; S.d.view = "req"; render(); };
ACT["d-job"] = function (d) { S.d.job = d.v; S.d.view = "job"; render(); };
function dRequest(c) {
  var o = byId(S.orders, S.d.job);
  if (!o || o.status !== "awaiting") return dHead("Request", "home") + '<div class="pad">' + emptyState("This request is gone", "Another courier took it or the customer cancelled.", '<button class="btn sm" data-act="d-go" data-v="home">Back to requests</button>') + "</div>";
  var job = activeJob();
  return dHead("Delivery request", "home") + '<div class="map map-md">' + mapSVG({ labels: false, routes: [{ from: o.pickup.area, to: o.dropoff.area }], dots: c.area ? [{ area: c.area, color: "var(--ok)" }] : [] }) + '</div><div class="pad">' +
    '<div class="row between"><span class="price-big">' + eur(payOf(o)) + '</span><span class="muted">' + o.price.km.toFixed(1) + " km · about " + o.price.mins + " min</span></div>" + legs(o) +
    '<div class="card"><b>' + esc(cLabel(o.cls.category)) + "</b><span>" + itemSummary(o) + "</span>" + (o.item.photos && o.item.photos.length ? '<div class="phs">' + photoStrip(o.item.photos) + "</div>" : "") +
    (o.cls.notes && o.cls.notes.length ? '<ul class="notes">' + o.cls.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>" : "") +
    (Object.keys(o.item.options || {}).filter(function (k) { return o.item.options[k]; }).length ? '<span class="muted">Extras: ' + OPTIONS.filter(function (x) { return o.item.options[x.id]; }).map(function (x) { return x.label; }).join(", ") + "</span>" : "") + "</div>" +
    (o.cls.couriers > 1 ? '<div class="banner">Two people needed. Accept only if you can bring a helper.</div>' : "") +
    '<div class="row"><button class="btn ghost" data-act="d-decline" data-v="' + esc(o.id) + '">Decline</button><button class="btn" style="flex:1" data-act="d-accept" data-v="' + esc(o.id) + '"' + (job || busy ? " disabled" : "") + ">Accept delivery</button></div></div>";
}
ACT["d-decline"] = function (d) { S.me.declined[d.v] = Date.now(); saveMe(); S.d.view = "home"; render(); toast("Request declined"); };
ACT["d-accept"] = function (d) {
  var c = myCourier(), o = byId(S.orders, d.v); if (!c || !o || busy || activeJob()) return;
  var now = Date.now();
  var patch = { status: "assigned", courier: { id: c.id, name: c.name, vehicle: c.vehicle.type, plate: c.vehicle.plate || "", phone: c.phone }, courierPay: r2(o.price.total * share() / 100), timeline: { assigned: now } };
  run(Store.claim("orders", o.id, c.id, function (x) { return x.status === "awaiting"; }, patch).then(function (ok) {
    if (ok) { S.d.job = o.id; S.d.view = "job"; toast("Delivery accepted. Head to pickup when ready."); } else { S.d.view = "home"; toast("Another courier took that one."); }
  }));
};

// ---------- Active job ----------
function dJob(c) {
  var o = byId(S.orders, S.d.job);
  if (!o) return dHead("Delivery", "home") + '<div class="pad">' + emptyState("Delivery not found", "", '<button class="btn sm" data-act="d-go" data-v="home">Back</button>') + "</div>";
  var st = o.status === "issue" ? (o.issue && o.issue.prev) : o.status, toPickup = ["assigned", "to_pickup", "at_pickup"].indexOf(st) >= 0;
  var h = dHead('<span class="mono">' + esc(o.id) + "</span>", "home", '<button class="btn ghost sm" data-act="d-chat" data-v="' + esc(o.id) + '">Message' + (unread(o, "courier") ? ' <span class="badge in">1</span>' : "") + "</button>") +
    '<div class="map map-md">' + mapSVG({ labels: false, routes: [Object.assign({ from: o.pickup.area, to: o.dropoff.area, dashed: toPickup }, courierPos(o))] }) + '</div><div class="pad">';
  h += '<div class="row between">' + chip(o.status) + '<span class="price-big">' + eur(payOf(o)) + "</span></div>";
  if (o.status === "cancelled") return h + '<div class="banner bad">This delivery was cancelled' + (o.cancelledBy === "admin" ? " by DART" : " by the customer") + ".</div>" + '<button class="btn block" data-act="d-go" data-v="home">Back to requests</button></div>';
  if (o.status === "delivered") return h + '<div class="card ok"><b>Delivered at ' + hhmm(o.timeline.delivered) + "</b><span>You earned " + eur(payOf(o)) + ". It's paid out with your next weekly payment.</span></div>" + '<button class="btn block" data-act="d-go" data-v="home">Back to requests</button></div>';
  var target = toPickup ? o.pickup : o.dropoff;
  h += '<div class="card"><span class="muted sm">' + (toPickup ? "Pickup" : "Delivery") + "</span><b>" + esc(target.street) + ", " + esc(target.area) + "</b>" + (target.notes ? "<span>" + esc(target.notes) + "</span>" : "") +
    '<a class="btn ghost sm" href="' + mapsLink(target.area, target.street) + '" target="_blank" rel="noopener">Navigate with Google Maps</a></div>';
  h += '<div class="card"><b>' + esc(cLabel(o.cls.category)) + "</b><span>" + itemSummary(o) + "</span>" + (o.item.photos && o.item.photos.length ? '<div class="phs">' + photoStrip(o.item.photos) + "</div>" : "") + (o.cls.couriers > 1 ? '<span class="warn-t">Two people needed</span>' : "") + "</div>";
  h += '<div class="person"><span class="avatar">' + esc(initials(o.customer.name)) + "</span><div><b>" + esc(o.customer.businessName || o.customer.name) + '</b><div class="muted sm">Customer</div></div></div>';
  if (o.status === "issue") {
    h += '<div class="banner bad">You reported: ' + esc(o.issue.reason) + ". DART support will contact you.</div>" + '<button class="btn block" data-act="d-resume">Problem solved, continue</button>';
  } else if (NEXT[o.status]) {
    h += '<button class="btn block big" data-act="d-next"' + (busy ? " disabled" : "") + ">" + NEXT[o.status][1] + "</button>";
  } else if (o.status === "at_dest") {
    var p = S.d.proof;
    h += '<form class="card" data-form="d-deliver"><b>Proof of delivery</b>' + field("Received by", inp("d.proof.receiver", p.receiver, 'placeholder="Name, or \'Left with concierge\'" required')) +
      (p.photo ? '<img class="proof" src="' + safeImg(p.photo) + '" alt="Your delivery photo">' : "") +
      '<label class="file-btn">' + (p.photo ? "Retake photo" : "Take a photo of the delivered item") + '<input type="file" accept="image/*" capture="environment" data-file="proof"></label>' +
      '<button class="btn ok block">Complete delivery</button></form>';
  }
  h += '<div class="row wrap"><button class="btn ghost sm" data-act="d-issue" data-v="' + esc(o.id) + '">Report a problem</button>' + (["assigned", "to_pickup", "at_pickup"].indexOf(o.status) >= 0 ? '<button class="btn ghost sm" data-act="d-release" data-v="' + esc(o.id) + '">Give this delivery back</button>' : "") + "</div>";
  return h + '<div class="card"><b>Status history</b>' + timelineList(o) + "</div></div>";
}
ACT["d-next"] = function () {
  var o = byId(S.orders, S.d.job); if (!o || !NEXT[o.status] || busy) return;
  var to = NEXT[o.status][0], patch = { status: to, timeline: {} }; patch.timeline[to] = Date.now();
  run(Store.update("orders", o.id, patch), STATUS[to]);
};
ACT["d-resume"] = function () { var o = byId(S.orders, S.d.job); if (!o) return; run(Store.update("orders", o.id, { status: o.issue.prev || "assigned", issue: { open: false, resolvedAt: Date.now() } }), "Back on track"); };
ACT["d-release"] = function (d) { S.modal = { kind: "confirm", title: "Give this delivery back?", body: "It goes back to other couriers. Do this only if you can't do it.", yes: "Give it back", act: "d-release-yes", v: d.v }; render(); };
ACT["d-release-yes"] = function (d) {
  S.modal = null; var c = myCourier();
  run(Store.claim("orders", d.v, c.id, function (x) { return x.courier && x.courier.id === c.id && ["assigned", "to_pickup", "at_pickup"].indexOf(x.status) >= 0; }, { status: "awaiting", courier: null, courierPay: null, timeline: { awaiting: Date.now() }, releasedBy: c.id }).then(function (ok) { S.me.declined[d.v] = Date.now(); saveMe(); S.d.view = "home"; if (!ok) toast("It couldn't be given back. Report a problem instead."); }));
};
ACT["d-issue"] = function (d) { S.modal = { kind: "issue", order: d.v, reason: "Can't find the address", text: "", role: "courier" }; render(); };
FILES["proof"] = function (file) { shrinkImage(file, 640, 60000).then(function (src) { S.d.proof.photo = src; render(); }, function () { toast("That photo couldn't be read."); }); };
FORMS["d-deliver"] = function () {
  var o = byId(S.orders, S.d.job), p = S.d.proof; if (!o || busy) return;
  if (!clip(p.receiver, 60)) return toast("Add who received it.");
  var now = Date.now(), acc = byId(S.accounts, o.customer.id) || { id: o.customer.id, name: o.customer.name, email: "" };
  var proof = { receiver: clip(p.receiver, 60), at: now }; if (p.photo) proof.photo = p.photo;
  var done = Object.assign({}, o, { timeline: Object.assign({}, o.timeline, { delivered: now }) });
  var invStatus = o.billing && o.billing.status === "to_invoice" ? "outstanding" : "paid";
  var invId = "I-" + rid(8), inv = deliveryInvoice(done, acc, invStatus);
  run(Store.update("orders", o.id, { status: "delivered", proof: proof, timeline: { delivered: now }, invoiceId: invId }).then(function () { return Store.set("invoices", invId, inv); }).then(function () { S.d.proof = { photo: null, receiver: "" }; }), "Delivered. Nice work.");
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
  var o = byId(S.orders, S.d.job); if (!o) return dHead("Chat", "messages");
  if (Chat.orderId !== o.id) openChat(o.id);
  return dHead(esc(o.customer.businessName || o.customer.name), "messages", '<button class="btn ghost sm" data-act="d-job" data-v="' + esc(o.id) + '">Delivery</button>') + chatView(o, "courier", c.name);
}
function dEarnings(c) {
  var done = myJobs().filter(function (o) { return o.status === "delivered"; }).sort(function (a, b) { return b.timeline.delivered - a.timeline.delivered; });
  var pend = done.filter(function (o) { return !o.courierPaid; }), paid = done.filter(function (o) { return o.courierPaid; });
  var sum = function (l) { return l.reduce(function (s, o) { return s + payOf(o); }, 0); };
  var payouts = {}; paid.forEach(function (o) { var k = o.courierPayout || dmy(o.courierPaidAt); payouts[k] = payouts[k] || { at: o.courierPaidAt, total: 0, n: 0 }; payouts[k].total += payOf(o); payouts[k].n++; });
  return dHead("Earnings") + '<div class="pad"><div class="stat3"><div><b class="num">' + eur(sum(done)) + '</b><small>All time</small></div><div><b class="num">' + eur(sum(pend)) + '</b><small>Pending</small></div><div><b class="num">' + eur(sum(paid)) + "</b><small>Paid</small></div></div>" +
    '<p class="muted sm">You keep ' + share() + "% of each delivery price. Pending earnings are paid every Monday to " + esc(c.payout ? "IBAN ending " + String(c.payout.iban).slice(-4) : "your bank") + ".</p>" +
    (Object.keys(payouts).length ? '<div class="sec-h"><h3>Payments</h3></div><div class="list">' + Object.keys(payouts).map(function (k) { var p = payouts[k]; return '<div class="item"><b>Paid ' + dmy(p.at) + '</b><b class="num">' + eur(p.total) + "</b><small>" + p.n + " deliveries</small><small></small></div>"; }).join("") + "</div>" : "") +
    '<div class="sec-h"><h3>Completed deliveries</h3></div>' + (done.length ? '<div class="list">' + done.map(function (o) { return '<button class="item" data-act="d-job" data-v="' + esc(o.id) + '"><b>' + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + '</b><b class="num">' + eur(payOf(o)) + "</b><small>" + when(o.timeline.delivered) + " · " + esc(o.id) + "</small><small>" + (o.courierPaid ? "Paid" : "Pending") + (o.rating ? " · " + o.rating + "★" : "") + "</small></button>"; }).join("") + "</div>" : emptyState("No deliveries yet", "Completed deliveries and what you earned show up here.")) + "</div>";
}
function dHistory() {
  var list = myJobs().sort(function (a, b) { return b.createdAt - a.createdAt; });
  return dHead("Delivery history", "account") + '<div class="pad">' + (list.length ? '<div class="list">' + list.map(function (o) { return '<button class="item" data-act="d-job" data-v="' + esc(o.id) + '"><b>' + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + "</b>" + chip(o.status) + "<small>" + when(o.createdAt) + " · " + esc(o.id) + '</small><small class="num">' + eur(payOf(o)) + "</small></button>"; }).join("") + "</div>" : emptyState("No deliveries yet", "")) + "</div>";
}
function dNotesView() {
  var list = courierNotes();
  return dHead("Notifications", "home") + '<div class="pad">' + (list.length ? '<div class="list">' + list.map(function (n) {
    return '<button class="item" data-act="' + (n.req ? "d-req" : n.chat ? "d-chat" : n.job ? "d-job" : n.help ? "d-go" : "d-go") + '" data-v="' + esc(n.req || n.chat || n.job || (n.help ? "help" : "home")) + '"><b>' + esc(n.text) + "</b><small>" + when(n.at) + "</small><small>" + esc(n.sub || "") + "</small><small></small></button>";
  }).join("") + "</div>" : emptyState("No notifications yet", "")) + "</div>";
}

// ---------- Account, vehicle, payout, help ----------
function dAccount(c) {
  var rows = [["vehicle", "Vehicle and documents", vLabel(c.vehicle.type) + (c.vehicleStatus === "pending" ? " · change pending" : "")], ["payout", "Payout details", c.payout ? "IBAN ending " + String(c.payout.iban).slice(-4) : "Not set"], ["history", "Delivery history", myJobs().length + " deliveries"], ["notes", "Notifications", ""], ["help", "Help and support", "Report a problem, FAQ"]];
  return dHead("Account") + '<div class="pad"><div class="person"><span class="avatar">' + esc(initials(c.name)) + "</span><div><b>" + esc(c.name) + '</b><div class="muted sm">' + esc(c.email) + " · " + esc(c.phone) + "</div></div></div>" +
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


// ---------- Courier home: a full map with a sheet over it ----------
function dMapHome(c) {
  var job = activeJob(), reqs = c.online && !job ? requestsFor(c) : [], done = myJobs().filter(function (o) { return o.status === "delivered"; });
  var today = done.filter(function (o) { return isToday(o.timeline.delivered); }), earned = today.reduce(function (s, o) { return s + payOf(o); }, 0);
  var pending = done.filter(function (o) { return !o.courierPaid; }).reduce(function (s, o) { return s + payOf(o); }, 0);
  var pins = reqs.slice(0, 8).map(function (o, i) { return { area: o.pickup.area, text: eur(payOf(o)), dy: -(i % 2) * 22 }; });
  if (c.online && c.area) pins.unshift({ area: c.area, text: tr("You"), tone: "green", dy: 44 });
  var routes = job ? [Object.assign({ from: job.pickup.area, to: job.dropoff.area }, courierPos(job))] : [];
  var title = !c.online ? "You're offline" : job ? "On a delivery" : reqs.length === 1 ? "1 request near you" : reqs.length + " requests near you";
  var sub = !c.online ? "Go online to see requests near you" : c.area ? "In " + c.area : "Set your area below";
  var h = '<div class="mh courier"><div class="mh-map">' + mapSVG({ vb: "-40 -200 440 1000", routes: routes, pins: pins }) + "</div>" +
    '<div class="mh-top"><button class="mh-online ' + (c.online ? "on" : "") + '" data-act="d-online" role="switch" aria-checked="' + !!c.online + '"><i></i>' + (c.online ? "Online" : "Offline") + "</button>" +
    '<button class="mh-chip icon" data-act="d-go" data-v="notes" aria-label="Notifications"><svg><use href="#t-bell"/></svg>' + (courierUnseen() ? '<span class="badge">' + courierUnseen() + "</span>" : "") + "</button></div>" +
    '<div class="mh-title"><p>' + esc(sub) + "</p><h1>" + esc(title) + "</h1></div>";
  h += '<div class="mh-sheet"><div class="grab" aria-hidden="true"></div>' +
    '<div class="stat3"><div><b class="num">' + eur(earned) + "</b><small>Today</small></div><div><b>" + today.length + '</b><small>Jobs today</small></div><div><b class="num">' + eur(pending) + "</b><small>To be paid</small></div></div>";
  if (c.vehicleStatus === "pending") h += '<div class="banner">Your vehicle change is waiting for approval. You get requests for your current vehicle until then.</div>';
  if (settings().open === false) h += '<div class="banner bad">DART is closed. No new requests until it reopens.</div>';
  if (job) h += '<button class="item job-card" data-act="d-job" data-v="' + esc(job.id) + '"><b>' + esc(job.pickup.area) + " → " + esc(job.dropoff.area) + "</b>" + chip(job.status) + "<small>" + itemSummary(job) + '</small><small class="num">' + eur(payOf(job)) + "</small></button>";
  if (!c.online) h += '<button class="btn block big" data-act="d-online">Go online</button>';
  else {
    h += field("Where are you now?", sel("d.areaPick", c.area || "", [["", "Choose area"]].concat(AREA_NAMES), 'data-onchange="d-area"'));
    if (!job) h += reqs.length ? '<div class="list">' + reqs.map(function (o) {
      var away = c.area ? tripKm(c.area, o.pickup.area).toFixed(1) + " km away · " : "";
      return '<button class="item req" data-act="d-req" data-v="' + esc(o.id) + '"><b>' + esc(o.pickup.area) + " → " + esc(o.dropoff.area) + '</b><b class="num pay">' + eur(payOf(o)) + "</b><small>" + away + o.price.km.toFixed(1) + " km trip · " + esc(cLabel(o.cls.category)) + (o.cls.couriers > 1 ? " · 2 people" : "") + "</small><small>" + hhmm(o.createdAt) + "</small></button>";
    }).join("") + "</div>" : emptyState("No requests right now", "Book something in the customer app and it shows up here if it fits your vehicle.");
  }
  return h + "</div></div>";
}
