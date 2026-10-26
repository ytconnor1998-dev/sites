// ===== Live mode: the real DART database (Supabase) =====
// Only active in the live build, where DART_LIVE = { url, key } and the Supabase library are included.
// The rest of the app talks to Store exactly as before; this file supplies a database that behaves
// like the test store, real logins, and server functions for things a customer may not see directly.
var LIVE = typeof window !== "undefined" && window.DART_LIVE && window.supabase ? window.DART_LIVE : null;
S.live = { uid: null, email: "", admin: false, ready: false, guest: {}, codeInfo: {} };

// Each app keeps its own login, so one phone can be a customer and a courier at the same time.
function liveRole() { var r = route(); return r === "courier" ? "courier" : r === "admin" ? "admin" : "customer"; }
var SB = null;
if (LIVE) SB = window.supabase.createClient(LIVE.url, LIVE.key, { auth: { storageKey: "dart-" + liveRole(), persistSession: true, autoRefreshToken: true }, realtime: { params: { eventsPerSecond: 5 } } });

// Collections map to tables; chat lives in "orders/<id>/messages".
function liveTable(path) {
  var m = /^orders\/([^/]+)\/messages$/.exec(path);
  if (m) return { table: "messages", order: m[1] };
  return { table: path === "courierDocs" ? "courier_docs" : path };
}
function liveErr(e) { return e && (e.message || e.code) ? { code: e.code || "error", message: e.message } : e; }

// Coming back to the app or getting signal again: refresh the login, then reload everything on screen.
if (LIVE && typeof document !== "undefined") {
  var liveWake = function () { SB.auth.getSession().then(function () { liveReloaders.forEach(function (x) { x.fn(); }); }, function () {}); };
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") liveWake(); });
  window.addEventListener("online", liveWake);
}

// A database object with the same shape the app's Store already uses.
var liveDb = LIVE && {
  collection: function (path) {
    var t = liveTable(path);
    return {
      onSnapshot: function (cb, onErr) {
        // Phones pause connections in the background: failed loads retry quietly, and a dropped
        // live channel reconnects. Only a long outage is shown to the person.
        var stopped = false, timer = null, fails = 0, ch = null;
        var load = function () {
          var q = SB.from(t.table).select(t.table === "messages" ? "id,data" : "id,data,updated_at");
          if (t.order) q = q.eq("order_id", t.order);
          q.then(function (r) {
            if (stopped) return;
            if (r.error) {
              fails++;
              if (fails === 4 && onErr) onErr(liveErr(r.error));
              clearTimeout(timer); timer = setTimeout(function () { SB.auth.getSession().then(load, load); }, Math.min(30000, 1500 * fails));
              return;
            }
            fails = 0;
            var rows = (r.data || []).map(function (x) { return { id: x.id, data: x.data, v: x.updated_at }; });
            if (t.table === "orders") {
              // Guest deliveries aren't readable directly; they're fetched with their code and email.
              Object.keys(S.live.guest).forEach(function (id) { if (!rows.some(function (x) { return x.id === id; })) rows.push({ id: id, data: S.live.guest[id] }); });
              rows.forEach(function (x) { liveSeen[x.id] = x.v; });
            }
            cb({ docs: rows.map(function (x) { return { id: x.id, data: function () { return x.data; } }; }) });
          }, function () { fails++; clearTimeout(timer); timer = setTimeout(load, Math.min(30000, 1500 * fails)); });
        };
        var soon = function () { clearTimeout(timer); timer = setTimeout(load, 120); };
        load();
        var connect = function () {
          var mine = SB.channel("w-" + path + "-" + rid(5)).on("postgres_changes", Object.assign({ event: "*", schema: "public", table: t.table }, t.order ? { filter: "order_id=eq." + t.order } : {}), soon);
          ch = mine;
          mine.subscribe(function (st) {
            if (stopped || ch !== mine || ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].indexOf(st) < 0) return;
            ch = null; SB.removeChannel(mine);
            setTimeout(function () { if (!stopped) { connect(); soon(); } }, 3000);
          });
        };
        connect();
        liveReloaders.push({ table: t.table, fn: soon });
        return function () { stopped = true; clearTimeout(timer); if (ch) { var c = ch; ch = null; SB.removeChannel(c); } liveReloaders = liveReloaders.filter(function (x) { return x.fn !== soon; }); };
      }
    };
  },
  doc: function (full) {
    var i = full.lastIndexOf("/"), path = full.slice(0, i), id = full.slice(i + 1), t = liveTable(path);
    var done = function (r) { if (r.error) throw liveErr(r.error); liveRefresh(t.table); return r; };
    return {
      set: function (data) {
        var row = { id: id, data: data }; if (t.order) row.order_id = t.order;
        if (t.table === "orders" && data && data.customer && data.customer.guest) { S.live.guest[id] = data; liveGuestSave(id, data.customer.email); }
        // Insert first: replacing needs permission to read the old record, which e.g. a courier issuing an invoice doesn't have.
        return SB.from(t.table).insert(row).then(function (r) {
          if (r.error && r.error.code === "23505") { var q = SB.from(t.table).update({ data: data }).eq("id", id); if (t.order) q = q.eq("order_id", t.order); return q.then(done); }
          return done(r);
        });
      },
      update: function (patch) { return SB.rpc("patch_doc", { p_table: t.table, p_id: id, p_patch: patch }).then(done); },
      delete: function () { return SB.from(t.table).delete().eq("id", id).then(done); },
      get: function () {
        return SB.from(t.table).select("id,data,updated_at").eq("id", id).maybeSingle().then(function (r) {
          if (r.error) throw liveErr(r.error);
          return { exists: !!r.data, id: id, v: r.data && r.data.updated_at, data: function () { return r.data ? r.data.data : null; } };
        });
      }
    };
  },
  // Single winner: apply only if the document hasn't changed since we read it.
  claim: function (path, id, ok, patch) {
    var t = liveTable(path);
    return SB.from(t.table).select("data,updated_at").eq("id", id).maybeSingle().then(function (r) {
      if (r.error || !r.data || !ok(r.data.data)) return false;
      return SB.rpc("claim_doc", { p_table: t.table, p_id: id, p_patch: patch, p_seen: r.data.updated_at }).then(function (x) { liveRefresh(t.table); return !x.error && x.data === true; });
    });
  }
};
var liveSeen = {}, liveReloaders = [];
function liveRefresh(table) { liveReloaders.forEach(function (x) { if (x.table === table) x.fn(); }); }
if (LIVE) {
  var storeClaim = Store.claim;
  Store.claim = function (path, id, holder, ok, patch) { return this.mode === "live" && this.db && this.db.claim ? this.db.claim(path, id, ok, patch) : storeClaim.call(this, path, id, holder, ok, patch); };
}

// ---------- Guest deliveries: kept on this phone by code and email, refreshed from the server ----------
function liveGuestSave(id, email) { S.me.guestEmails = S.me.guestEmails || {}; S.me.guestEmails[id] = slugEmail(email); S.me.guestOrders = [id].concat((S.me.guestOrders || []).filter(function (x) { return x !== id; })).slice(0, 30); saveMe(); }
function livePollGuests() {
  var map = S.me.guestEmails || {};
  return Promise.all(Object.keys(map).map(function (id) {
    return SB.rpc("track_order", { p_code: id, p_email: map[id] }).then(function (r) { if (r.data) { var d = Object.assign({}, r.data); delete d.id; S.live.guest[id] = d; } });
  })).then(function () { liveRefresh("orders"); });
}

// ---------- Logins ----------
function liveSession() {
  return SB.auth.getSession().then(function (r) {
    var u = r.data && r.data.session && r.data.session.user;
    S.live.uid = u ? u.id : null; S.live.email = u ? u.email : "";
    var role = liveRole();
    if (role === "customer") S.me.customerId = S.live.uid;
    if (role === "courier") S.me.courierId = S.live.uid;
    if (role === "admin" && u) return SB.rpc("is_admin").then(function (x) { S.live.admin = x.data === true; });
    S.live.admin = false;
  });
}
function liveAuth(mode, email, pw) {
  if (!pw || pw.length < 8) return Promise.reject({ show: true, message: "Use a password of at least 8 characters." });
  var call = mode === "register" ? SB.auth.signUp({ email: email, password: pw }) : SB.auth.signInWithPassword({ email: email, password: pw });
  return call.then(function (r) {
    if (r.error) throw { show: true, message: /invalid login/i.test(r.error.message) ? "That email and password don't match. First time? Tap Create password." : /already registered/i.test(r.error.message) ? "That email already has an account. Log in instead." : /rate limit/i.test(r.error.message) ? "Too many tries. Wait a minute and try again." : "That didn't work: " + r.error.message };
    return liveSession().then(function () { return r.data.user; });
  });
}
function liveSignOut() { return SB.auth.signOut().then(function () { S.live.uid = null; S.live.admin = false; }); }

if (LIVE) {
  // Customer: real accounts. The account document's id is the login's id.
  FORMS["c-auth"] = function () {
    var a = S.c.auth, email = slugEmail(a.email);
    if (!emailOk(email)) return toast("Enter a valid email address.");
    if (a.mode === "register" && !clip(a.name, 60)) return toast("Enter your name.");
    run(liveAuth(a.mode, email, a.pw).then(function (u) {
      a.pw = "";
      if (a.mode === "register") return Store.set("accounts", u.id, newAccountDoc({ name: clip(a.name, 60), email: email, phone: clip(a.phone, 30), provider: "email", type: "individual" })).then(function () { S.c.view = "home"; toast("Welcome to DART"); });
      S.c.view = "home"; toast("Welcome back");
    }));
  };
  createAccount = function (o) {
    if (!S.live.uid) return toast("Log in first.");
    return run(Store.set("accounts", S.live.uid, newAccountDoc(o)).then(function () { S.me.customerId = S.live.uid; S.c.view = "home"; }));
  };
  var cLogout = ACT["c-logout"]; ACT["c-logout"] = function (d) { liveSignOut().then(function () { cLogout(d); }); };
  // Apple and Google sign-in arrive with the store builds.
  socialButtons = function () { return ""; };

  // Track a delivery by code and email.
  FORMS["c-track"] = function () {
    var t = S.c.trk, code = clip(t.code, 20).toUpperCase().replace(/\s+/g, ""), mine = byId(S.orders, code);
    if (mine && !(mine.customer && mine.customer.guest)) { S.c.order = mine.id; S.c.view = "order"; return render(); }
    run(SB.rpc("track_order", { p_code: code, p_email: slugEmail(t.email) }).then(function (r) {
      if (!r.data) return toast("We couldn't find a delivery with that code and email.");
      var d = Object.assign({}, r.data); delete d.id; S.live.guest[code] = d; liveGuestSave(code, t.email); liveRefresh("orders");
      S.c.order = code; S.c.view = "order";
    }));
  };
  // Guests cancel through the server, which checks the code and email.
  var cCancelYes = ACT["c-cancel-yes"];
  ACT["c-cancel-yes"] = function (d) {
    var o = byId(S.orders, d.v);
    if (o && o.customer && o.customer.guest && !S.live.uid) {
      S.modal = null;
      return run(SB.rpc("guest_cancel", { p_code: o.id, p_email: o.customer.email }).then(function (r) { if (!r.data) toast("Too late to cancel: the item has been collected."); return livePollGuests(); }));
    }
    cCancelYes(d);
    // Credit used on the booking goes back through the server.
    setTimeout(function () { SB.rpc("return_credit", { p_order: d.v }).then(function () { liveRefresh("accounts"); }); }, 800);
  };

  // Couriers: apply with a password; the courier record's id is the login's id.
  FORMS["d-login"] = function () {
    var e = slugEmail(S.d.login.email);
    if (!emailOk(e)) return toast("Enter a valid email.");
    run(liveAuth("login", e, S.d.login.pw).then(function () { S.d.login.pw = ""; S.d.view = "home"; }));
  };
  FORMS["d-reg-1"] = function () {
    var r = S.d.reg; if (!emailOk(slugEmail(r.email))) return toast("Enter a valid email.");
    if (!clip(r.name, 60) || !clip(r.phone, 30) || !clip(r.address, 140)) return toast("Fill in every field.");
    if (!r.pw || r.pw.length < 8) return toast("Choose a password of at least 8 characters.");
    r.step = 2; render();
  };
  var regFinish = FORMS["d-reg-4"];
  FORMS["d-reg-4"] = function () {
    var r = S.d.reg; if (!clip(r.iban, 40) || !clip(r.holder || r.name, 60)) return toast("Add the account holder and IBAN.");
    run(liveAuth("register", slugEmail(r.email), r.pw).then(function (u) {
      var flags = {}; Object.keys(r.docs).forEach(function (k) { flags[k] = true; });
      var courier = { name: clip(r.name, 60), email: slugEmail(r.email), phone: clip(r.phone, 30), address: clip(r.address, 140), vehicle: cleanVehicle(r.vehicle), vehicleStatus: "approved", docs: flags,
        payout: { iban: clip(r.iban, 40).toUpperCase(), holder: clip(r.holder || r.name, 60) }, status: "pending", online: false, createdAt: Date.now() };
      return Store.set("couriers", u.id, courier).then(function () { return Store.set("courierDocs", u.id, r.docs); }).then(function () { S.me.courierId = u.id; S.d.reg = null; S.d.mode = "login"; S.d.view = "home"; });
    }), "Application sent");
  };
  var dLogout = ACT["d-logout"]; ACT["d-logout"] = function (d) { dLogout(d); liveSignOut().then(render); };

  // Referral rewards and credit are given by the server.
  rewardReferral = function (oid) { return SB.rpc("reward_referral", { p_order: oid }).then(function () { }); };

  // Code checks need to look across all customers, so ask the server once per code and remember it.
  var baseCheck = checkCode;
  checkCode = function (raw, total, who) {
    var code = normCode(raw); if (!code) return null;
    var info = S.live.codeInfo[code];
    if (!info) {
      S.live.codeInfo[code] = { loading: true };
      Promise.all([SB.rpc("code_uses", { p_code: code, p_uid: S.live.uid || "", p_email: (who && who.email) || "" }), SB.rpc("referrer_for", { p_code: code })]).then(function (r) {
        S.live.codeInfo[code] = { uses: r[0].data || { total: 0, mine: 0, booked: 0 }, ref: r[1].data || null }; render();
      });
      return { ok: false, msg: "Checking the code…" };
    }
    if (info.loading) return { ok: false, msg: "Checking the code…" };
    return baseCheck(raw, total, who);
  };
  codeUses = function (code, who) { var i = S.live.codeInfo[code]; return i && i.uses ? (who ? i.uses.mine : i.uses.total) : 0; };
  referrerFor = function (code) { var i = S.live.codeInfo[code]; return i && i.ref ? { id: i.ref.id, name: i.ref.name, email: "" } : null; };
  hasBooked = function (who) { var i = Object.keys(S.live.codeInfo).map(function (k) { return S.live.codeInfo[k]; }).filter(function (x) { return x.uses; })[0]; return i ? i.uses.booked > 0 : S.orders.some(function (o) { return o.status !== "cancelled" && who.id && o.customer.id === who.id; }); };

  // Admin: sign in with an admin email.
  var adminBase = adminApp;
  adminApp = function () {
    if (S.live.admin) return adminBase();
    var a = S.a.login || (S.a.login = { email: "", pw: "" });
    return '<div class="auth admin-login"><span class="logo xl"><svg><use href="#mark"/></svg>DART Admin</span><h1>Sign in</h1>' +
      (S.live.uid ? '<div class="banner bad">' + esc(S.live.email) + " isn't a DART admin.</div>" : "") +
      '<form class="stack" data-form="a-login">' + field("Email", inp("a.login.email", a.email, 'type="email" autocomplete="email" required')) +
      field("Password", '<input class="input" type="password" data-bind="a.login.pw" autocomplete="current-password" required>') +
      '<button class="btn block">Sign in</button></form><p class="muted sm center">First time? Choose “Create password” to set one for your admin email.</p>' +
      '<p class="center"><button class="link" data-act="a-login-new">Create password</button></p></div>';
  };
  FORMS["a-login"] = function () { var a = S.a.login; run(liveAuth("login", slugEmail(a.email), a.pw).then(function () { a.pw = ""; if (!S.live.admin) toast("That account isn't a DART admin."); })); };
  ACT["a-login-new"] = function () { var a = S.a.login || {}; if (!emailOk(slugEmail(a.email)) || !a.pw) return toast("Enter your admin email and a new password, then tap Create password."); run(liveAuth("register", slugEmail(a.email), a.pw).then(function () { a.pw = ""; })); };
}

// ---------- Start ----------
function liveStart(go) {
  // Switching between the customer app, courier app and admin reloads, so each uses its own login.
  var role = liveRole();
  window.addEventListener("hashchange", function () { if (liveRole() !== role) location.reload(); });
  SB.auth.onAuthStateChange(function () { liveSession().then(function () { Store.start("live", liveDb); render(); }); });
  liveSession().then(function () { go("live", liveDb); S.live.ready = true; livePollGuests(); setInterval(livePollGuests, 10000); });
}
