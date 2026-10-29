// ===== Real map (Google Maps) in DART colours, with the drawn map as the fallback =====
// The live build sets window.DART_MAPS = { key } when a Maps key is configured. Until Google has
// loaded (or if it fails), every map is the drawn one, so nothing breaks without a key.
var GMAP = { cfg: typeof window !== "undefined" ? window.DART_MAPS || null : null, state: "off", cache: {}, specs: {}, seen: {}, geocoder: null };
// The live site, or a marketing screenshot run of the test build (DART_MAPS_DEMO), uses the real map.
function gmapWanted() { return !!((LIVE || (typeof window !== "undefined" && window.DART_MAPS_DEMO)) && GMAP.cfg); }
function gmapLoad() {
  if (GMAP.state !== "off" || !gmapWanted()) return;
  GMAP.state = "loading";
  window.__dartMapsReady = function () { GMAP.state = "ready"; render(); };
  window.gm_authFailure = function () { GMAP.state = "failed"; GMAP.cache = {}; render(); };
  var s = document.createElement("script");
  s.src = "https://maps.googleapis.com/maps/api/js?v=weekly&loading=async&callback=__dartMapsReady&region=IT&language=" + (lang() === "it" ? "it" : "en") + (GMAP.cfg.key ? "&key=" + encodeURIComponent(GMAP.cfg.key) : "");
  s.async = true; s.onerror = function () { GMAP.state = "failed"; render(); };
  document.head.appendChild(s);
}
// Map colour schemes. GMAP_LOOK picks one; the others are kept to compare.
var GMAP_LOOKS = {
  // Clean: near-white streets, soft grey blocks, purple-tinted water and main roads.
  clean: [
    { elementType: "geometry", stylers: [{ color: "#F6F5F9" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#6B6580" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }, { weight: 3 }] },
    { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#EFEDF4" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", stylers: [{ visibility: "on" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#E3EEDD" }] },
    { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#FFFFFF" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E4E0EE" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#E6DEF8" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#D2C6F0" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#D5CDEF" }] },
    { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] }
  ],
  // Night purple: the map in DART's own purple, white routes stand out.
  purple: [
    { elementType: "geometry", stylers: [{ color: "#2A1B5C" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#CFC4F2" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#2A1B5C" }, { weight: 3 }] },
    { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#30205F" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", stylers: [{ visibility: "on" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#2D2A5A" }] },
    { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#46348C" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#5240A0" }] },
    { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#6A55BC" }] },
    { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#170F38" }] },
    { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] }
  ],
  // Neutral: warm grey and white, like most delivery apps, with DART purple only on routes and pins.
  neutral: [
    { elementType: "geometry", stylers: [{ color: "#F3F2EF" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#76726B" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }, { weight: 3 }] },
    { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#ECEAE6" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", stylers: [{ visibility: "on" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#E0EAD9" }] },
    { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#FFFFFF" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E2DFD9" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#FFFFFF" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#D8D4CC" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#CBDCEB" }] },
    { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] }
  ]
};
var GMAP_LOOK = (typeof window !== "undefined" && window.DART_MAP_LOOK) || "clean";
var GMAP_STYLE = GMAP_LOOKS[GMAP_LOOK] || GMAP_LOOKS.clean;
var GMAP_PURPLE = GMAP_LOOK === "purple" ? "#B79BFF" : "#452B94";
// Small pictures for the map: the courier's vehicle in a purple disc, and a pin for the delivery address.
var VEH_ICON = {
  bike: '<circle cx="13" cy="25" r="5"/><circle cx="27" cy="25" r="5"/><path d="M13 25l5-9h7l2 9M18 16l-2-3h-3M25 16l2-3"/>',
  scooter: '<circle cx="12" cy="26" r="4"/><circle cx="28" cy="26" r="4"/><path d="M12 26h9l4-8h-5M25 18l3-6h3M28 26l-3-8"/>',
  car: '<path d="M9 24v-5l3-6h16l3 6v5z"/><circle cx="14" cy="25" r="2.5"/><circle cx="26" cy="25" r="2.5"/>',
  van: '<path d="M8 25V13h16l6 5v7z"/><path d="M24 13v6h6"/><circle cx="13" cy="26" r="2.5"/><circle cx="26" cy="26" r="2.5"/>'
};
function vehKind(v) { return /bicycle|bike/.test(v || "") ? "bike" : /scooter|motorcycle/.test(v || "") ? "scooter" : /van/.test(v || "") ? "van" : /car/.test(v || "") ? "car" : "scooter"; }
function svgUrl(s) { return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(s); }
function vehIcon(v) {
  return { url: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#452B94" stroke="#fff" stroke-width="3"/><g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + VEH_ICON[vehKind(v)] + "</g></svg>"),
    scaledSize: new google.maps.Size(40, 40), anchor: new google.maps.Point(20, 20) };
}
function addrPin() {
  return { url: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path d="M16 41C16 41 3 26 3 16a13 13 0 0 1 26 0c0 10-13 25-13 25z" fill="#452B94" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="16" r="5" fill="#fff"/></svg>'),
    scaledSize: new google.maps.Size(32, 42), anchor: new google.maps.Point(16, 41) };
}

// Where a map point is: exact coordinates when known (a dropped pin or GPS), else the area's centre.
function llOf(area, ll) { return ll && isFinite(ll[0]) && isFinite(ll[1]) ? { lat: +ll[0], lng: +ll[1] } : AREAS[area] ? { lat: AREAS[area][0], lng: AREAS[area][1] } : null; }
function curvePts(a, b) {
  var mx = (a.lat + b.lat) / 2, my = (a.lng + b.lng) / 2, dx = b.lat - a.lat, dy = b.lng - a.lng, c = { lat: mx - dy * .18, lng: my + dx * .18 }, out = [];
  for (var i = 0; i <= 24; i++) { var t = i / 24, u = 1 - t; out.push({ lat: u * u * a.lat + 2 * u * t * c.lat + t * t * b.lat, lng: u * u * a.lng + 2 * u * t * c.lng + t * t * b.lng }); }
  return out;
}
// ---------- Real street routes (Google Routes API) ----------
// One request per pickup and drop-off pair, remembered for the session and on this device.
var ROUTE_CACHE = {};
try { ROUTE_CACHE = JSON.parse(localStorage.getItem("dart-routes") || "{}"); } catch (e) {}
var ROUTE_OFF = false;
function decodePolyline(s) {
  var pts = [], i = 0, lat = 0, lng = 0;
  while (i < s.length) {
    var r = 0, sh = 0, b; do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32); lat += r & 1 ? ~(r >> 1) : r >> 1;
    r = 0; sh = 0; do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32); lng += r & 1 ? ~(r >> 1) : r >> 1;
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}
function roadRoute(a, b, vehicle, done) {
  if (ROUTE_OFF || !GMAP.cfg || !GMAP.cfg.key || typeof fetch === "undefined") return;
  var mode = vehKind(vehicle) === "bike" ? "BICYCLE" : vehKind(vehicle) === "scooter" ? "TWO_WHEELER" : "DRIVE";
  var key = [a.lat.toFixed(4), a.lng.toFixed(4), b.lat.toFixed(4), b.lng.toFixed(4), mode].join(",");
  if (ROUTE_CACHE[key]) return done(decodePolyline(ROUTE_CACHE[key]));
  var ask = function (m) {
    return fetch("https://routes.googleapis.com/directions/v2:computeRoutes", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GMAP.cfg.key, "X-Goog-FieldMask": "routes.polyline.encodedPolyline" },
      body: JSON.stringify({ origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } }, destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } }, travelMode: m }) })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j, status: res.status }; }); });
  };
  ask(mode).then(function (r) { return r.ok && r.j.routes && r.j.routes.length || mode === "DRIVE" ? r : ask("DRIVE"); }).then(function (r) {
    if (r.status === 403) { ROUTE_OFF = true; return; } // Routes API not switched on for this key: keep curves
    var enc = r.ok && r.j.routes && r.j.routes[0] && r.j.routes[0].polyline && r.j.routes[0].polyline.encodedPolyline; if (!enc) return;
    ROUTE_CACHE[key] = enc;
    try { var ks = Object.keys(ROUTE_CACHE); if (ks.length > 150) delete ROUTE_CACHE[ks[0]]; localStorage.setItem("dart-routes", JSON.stringify(ROUTE_CACHE)); } catch (e) {}
    done(decodePolyline(enc));
  }, function () {});
}

// A placeholder in the page; the map itself lives in the cache and is moved in after each render,
// so maps don't flicker or reload when the page redraws every second.
function realMap(opt) {
  var stable = { r: (opt.routes || []).map(function (r) { return [r.from, r.to, r.fromLL, r.toLL, !!r.dashed, !!r.thin, r.vehicle || ""]; }), p: (opt.pins || []).map(function (p) { return p.tone || ""; }), d: (opt.dots || []).length, big: !!opt.vb, me: opt.me ? (opt.me.vehicle || "dot") : "" };
  var key = "m" + hashStr(JSON.stringify(stable));
  GMAP.specs[key] = opt;
  return '<div class="gm" data-gm="' + key + '"></div>';
}
function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
// Built inside its box (already on the page), so Google knows the size when it centres the map.
function gmapCreate(ph, opt) {
  var g = google.maps, el = document.createElement("div"); el.className = "gm-in"; ph.appendChild(el);
  var big = !!opt.vb || opt.interactive;
  var map = new g.Map(el, { styles: GMAP_STYLE, disableDefaultUI: true, clickableIcons: false, keyboardShortcuts: false, gestureHandling: big ? "greedy" : "none", backgroundColor: "#F1EEF8", center: { lat: 41.9, lng: 12.49 }, zoom: 12 });
  var e = { el: el, map: map, movers: [], follow: !!opt.vb, dragged: 0 };
  map.addListener("dragstart", function () { e.dragged = Date.now(); });
  var bounds = new g.LatLngBounds(), n = 0, add = function (p) { if (p) { bounds.extend(p); n++; } };
  (opt.routes || []).forEach(function (r) {
    var a = llOf(r.from, r.fromLL), b = llOf(r.to, r.toLL); if (!a || !b) return;
    var pts = curvePts(a, b);
    var line = new g.Polyline({ map: map, path: pts, strokeColor: GMAP_PURPLE, strokeOpacity: r.dashed ? 0 : .9, strokeWeight: r.thin ? 3 : 5, icons: r.dashed ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: GMAP_PURPLE, scale: 3 }, offset: "0", repeat: "12px" }] : null });
    new g.Marker({ map: map, position: a, clickable: false, icon: { path: g.SymbolPath.CIRCLE, scale: 7, fillColor: "#FFFFFF", fillOpacity: 1, strokeColor: GMAP_PURPLE, strokeWeight: 4 } });
    new g.Marker({ map: map, position: b, clickable: false, zIndex: 5, icon: addrPin() });
    add(a); add(b);
    var mv = r.t != null ? { r: r, pts: pts, a: a, m: new g.Marker({ map: map, position: a, clickable: false, zIndex: 9, icon: vehIcon(r.vehicle) }) } : null;
    if (mv) e.movers.push(mv);
    // Swap the curve for the real streets once Google answers (kept as a curve if it can't).
    roadRoute(a, b, r.vehicle, function (path) { line.setPath(path); if (mv) mv.pts = path; });
  });
  e.dots = []; e.pins = [];
  (opt.dots || []).forEach(function (d) { var p = llOf(d.area, d.ll); if (!p) return; e.dots.push(new g.Marker({ map: map, position: p, clickable: false, icon: { path: g.SymbolPath.CIRCLE, scale: 6, fillColor: d.color && d.color.indexOf("ok") >= 0 ? "#1F9D57" : "#B79BFF", fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 2.5 } })); add(p); });
  // Where the person looking at the map is: a courier's vehicle, or a soft purple dot for a customer.
  if (opt.me) {
    var mp = llOf(opt.me.area, opt.me.ll);
    if (mp) {
      e.me = new g.Marker({ map: map, position: mp, clickable: false, zIndex: 10, icon: opt.me.vehicle ? vehIcon(opt.me.vehicle) : { path: g.SymbolPath.CIRCLE, scale: 8, fillColor: GMAP_PURPLE, fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 3 } });
      if (!opt.me.vehicle) e.halo = new g.Circle({ map: map, center: mp, radius: 120, fillColor: GMAP_PURPLE, fillOpacity: .12, strokeOpacity: 0, clickable: false });
      add(mp);
    }
  }
  (opt.pins || []).forEach(function (p) {
    var at = llOf(p.area, p.ll); if (!at) return;
    var col = p.tone === "green" ? "#1F9D57" : p.tone === "ink" ? "#1B1530" : GMAP_PURPLE;
    e.pins.push(new g.Marker({ map: map, position: at, clickable: false, zIndex: 8, label: { text: tr(String(p.text)), color: "#FFFFFF", fontSize: "11px", fontWeight: "700" }, icon: { path: "M -24,-30 24,-30 24,-12 4,-12 0,-6 -4,-12 -24,-12 z", scale: 1, fillColor: col, fillOpacity: 1, strokeColor: col, strokeWeight: 1, labelOrigin: new g.Point(0, -21) } }));
    add(at);
  });
  // Frame the points. A map made while its box is still opening (the offer pop-up) has no size yet,
  // so frame it again the first time it gets one.
  // Only a full-screen map (the home screens) leaves room for the sheet over its lower part;
  // small maps (offer pop-up, job and delivery cards) frame the route in the whole box.
  var frame = function () {
    var tall = el.clientHeight > 450, pad = tall ? { top: 90, bottom: 320, left: 40, right: 40 } : { top: 46, bottom: 18, left: 28, right: 28 }; // room for the 42px address pin
    if (n > 1) map.fitBounds(bounds, pad);
    else if (n === 1) { map.setCenter(bounds.getCenter()); map.setZoom(14); if (tall) map.panBy(0, 150); }
    else { map.setCenter({ lat: 41.9, lng: 12.49 }); map.setZoom(12); if (tall) map.panBy(0, 150); }
  };
  frame();
  if (typeof ResizeObserver !== "undefined") {
    var sized = el.clientWidth > 0 && el.clientHeight > 0, ro = new ResizeObserver(function () {
      if (el.clientWidth > 0 && el.clientHeight > 0 && (!sized || !e.framedOnce)) { sized = true; e.framedOnce = true; frame(); }
    });
    ro.observe(el);
  }
  return e;
}
function gmapMove(e, opt) {
  var mp = opt.me && llOf(opt.me.area, opt.me.ll);
  if (e.me && mp) {
    var was = e.me.getPosition(), moved = was && (Math.abs(was.lat() - mp.lat) > .002 || Math.abs(was.lng() - mp.lng) > .002);
    e.me.setPosition(mp); if (e.halo) e.halo.setCenter(mp);
    if (moved && e.follow && Date.now() - e.dragged > 60000 && !(opt.routes || []).length) { e.map.setCenter(mp); if (e.el.clientHeight > 450) e.map.panBy(0, 150); }
  }
  (opt.pins || []).forEach(function (p, i) {
    var m = e.pins[i], at = llOf(p.area, p.ll); if (!m || !at) return;
    m.setPosition(at);
    var l = m.getLabel(); if (l && l.text !== tr(String(p.text))) m.setLabel(Object.assign({}, l, { text: tr(String(p.text)) }));
  });
  (opt.dots || []).forEach(function (d, i) { var m = e.dots[i], at = llOf(d.area, d.ll); if (m && at) m.setPosition(at); });
  e.movers.forEach(function (mv, i) {
    var r = (opt.routes || []).filter(function (x) { return x.t != null; })[i]; if (!r) return;
    var p;
    if (r.live && isFinite(r.live[0])) p = { lat: +r.live[0], lng: +r.live[1] };
    else if (r.approach != null) p = { lat: mv.a.lat + .006 * (1 - r.approach), lng: mv.a.lng - .006 * (1 - r.approach) };
    else p = mv.pts[Math.max(0, Math.min(mv.pts.length - 1, Math.round(r.t * (mv.pts.length - 1))))];
    mv.m.setPosition(p);
  });
}
AFTER.push(function (root) {
  if (GMAP.state !== "ready") return;
  var used = {};
  root.querySelectorAll("[data-gm]").forEach(function (ph) {
    var key = ph.dataset.gm, opt = GMAP.specs[key] || {};
    var e = GMAP.cache[key] || (GMAP.cache[key] = gmapCreate(ph, opt));
    gmapMove(e, opt); ph.appendChild(e.el); used[key] = 1;
  });
  // Forget maps that haven't been on screen for a while.
  Object.keys(GMAP.cache).forEach(function (k) { if (used[k]) GMAP.seen[k] = Date.now(); else if (Date.now() - (GMAP.seen[k] || 0) > 60000) delete GMAP.cache[k]; });
  GMAP.specs = {};
});

// The customer's own position, asked for once on the home screen (the app asks the phone for permission).
AFTER.push(function () {
  if (!gmapWanted() || S.c.hereAsked || route() !== "customer" || !(S.c.view === "home" || !S.c.view) || !navigator.geolocation) return;
  S.c.hereAsked = true;
  navigator.geolocation.getCurrentPosition(function (p) { S.c.here = { lat: p.coords.latitude, lng: p.coords.longitude }; render(); }, function () {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
});

// ---------- Drop a pin to set an address ----------
// The customer moves the map under a fixed pin; Google turns the spot into a street address.
function pinModal(m) {
  var body = '<div class="pin-wrap"><div class="gm-pin" data-pinmap="1"></div><span class="pin-mark" aria-hidden="true"></span></div>' +
    '<div class="pin-addr">' + (m.busy ? '<span class="muted">Finding the address…</span>' : m.err ? '<span class="bad-t">' + esc(m.err) + "</span>" : m.street ? "<b>" + esc(m.street) + "</b><span class=\"muted sm\">" + esc(m.area ? "In " + m.area : "") + "</span>" : '<span class="muted">Move the map to put the pin on the door</span>') + "</div>";
  return modalShell("Put the pin on the address", body, '<button class="btn block" data-act="c-pin-use"' + (m.street && m.area && !m.busy ? "" : " disabled") + ">Use this address</button>");
}
ACT["c-pin-open"] = function (d) {
  var a = getPath(S, d.k) || {};
  // Start on the address if there is one, else where the customer is (when in Rome), else the centre.
  var here = S.c.here && nearestArea(S.c.here.lat, S.c.here.lng).km < 3.5 ? S.c.here : null;
  var at = llOf(a.area, a.ll) || here || { lat: 41.9009, lng: 12.4833 };
  S.modal = { kind: "pin", k: d.k, lat: at.lat, lng: at.lng, street: "", area: "", busy: false }; GMAP.pinReset = true; render();
};
ACT["c-pin-use"] = function () {
  var m = S.modal, a = m && getPath(S, m.k); if (!a || !m.street || !m.area) return;
  a.street = m.street; a.pinStreet = m.street.replace(/\s+\d+\w*$/, ""); a.area = m.area; a.ll = [+m.lat.toFixed(6), +m.lng.toFixed(6)]; a.areaOpen = false; a.areaManual = true;
  S.modal = null; render();
};
var pinTimer = null;
function pinLookup(lat, lng) {
  var m = S.modal; if (!m || m.kind !== "pin") return;
  m.lat = lat; m.lng = lng; m.busy = true; m.err = ""; pinPaint();
  clearTimeout(pinTimer);
  pinTimer = setTimeout(function () {
    GMAP.geocoder = GMAP.geocoder || new google.maps.Geocoder();
    GMAP.geocoder.geocode({ location: { lat: lat, lng: lng } }).then(function (r) {
      var mm = S.modal; if (!mm || mm.kind !== "pin" || mm.lat !== lat) return;
      var best = (r.results || []).filter(function (x) { return x.types.indexOf("street_address") >= 0 || x.types.indexOf("premise") >= 0; })[0] || (r.results || [])[0];
      var part = function (t) { var c = best && best.address_components.filter(function (x) { return x.types.indexOf(t) >= 0; })[0]; return c ? c.long_name : ""; };
      var street = part("route"), no = part("street_number"), cap = part("postal_code");
      var near = nearestArea(lat, lng), byCap = cap ? findArea(street + ", " + cap) : [];
      mm.busy = false;
      if (!street) { mm.street = ""; mm.err = "No street here. Move the pin onto a building."; }
      else if (near.km > 3.5) { mm.street = ""; mm.err = "That's outside the area DART covers."; }
      else { mm.street = street + (no ? " " + no : ""); mm.area = byCap.length === 1 ? byCap[0] : byCap.indexOf(near.area) >= 0 || !byCap.length ? near.area : byCap[0]; }
      pinPaint();
    }, function () { var mm = S.modal; if (mm && mm.kind === "pin") { mm.busy = false; mm.err = "Couldn't look up this spot. Try again."; pinPaint(); } });
  }, 450);
}
// Only the address line and button change while the map moves; the map itself stays put.
function pinPaint() {
  var m = S.modal, box = document.querySelector(".pin-addr"), btn = document.querySelector('[data-act="c-pin-use"]'); if (!m || !box) return;
  var tmp = document.createElement("div"); tmp.innerHTML = pinModal(m); translateDOM(tmp);
  box.innerHTML = tmp.querySelector(".pin-addr").innerHTML;
  if (btn) btn.disabled = !(m.street && m.area && !m.busy);
}
AFTER.push(function (root) {
  var el = root.querySelector("[data-pinmap]"), m = S.modal; if (!el || !m || m.kind !== "pin") return;
  if (GMAP.state !== "ready") { el.innerHTML = '<p class="muted center pad">Loading the map…</p>'; gmapLoad(); return; }
  if (!GMAP.pin) {
    var inner = document.createElement("div"); inner.className = "gm-in";
    var map = new google.maps.Map(inner, { styles: GMAP_STYLE, disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: "greedy", center: { lat: m.lat, lng: m.lng }, zoom: 17 });
    map.addListener("idle", function () { var c = map.getCenter(); if (S.modal && S.modal.kind === "pin" && (Math.abs(c.lat() - S.modal.lat) > 1e-6 || Math.abs(c.lng() - S.modal.lng) > 1e-6 || (!S.modal.street && !S.modal.busy && !S.modal.err))) pinLookup(c.lat(), c.lng()); });
    GMAP.pin = { el: inner, map: map };
  } else if (GMAP.pinReset) { GMAP.pin.map.setCenter({ lat: m.lat, lng: m.lng }); GMAP.pin.map.setZoom(17); }
  GMAP.pinReset = false;
  el.appendChild(GMAP.pin.el);
});
