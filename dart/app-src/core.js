// ===== DART core: reference data, store, rules engine, pricing, invoices, shared UI helpers =====
"use strict";

var ACT = {}, FORMS = {}, FILES = {}, AFTER = [];

// ---------- Reference data (Rome areas; road distance is estimated from these) ----------
var AREAS = {
  "Centro Storico": [41.8986, 12.4769], "Trastevere": [41.8867, 12.4700], "Prati": [41.9065, 12.4625],
  "Monti": [41.8950, 12.4920], "Testaccio": [41.8768, 12.4762], "San Lorenzo": [41.8975, 12.5150],
  "Pigneto": [41.8880, 12.5310], "Parioli": [41.9240, 12.4980], "Ostiense": [41.8700, 12.4800],
  "San Giovanni": [41.8860, 12.5060], "Termini": [41.9010, 12.5010], "EUR": [41.8320, 12.4700],
  "Flaminio": [41.9230, 12.4720], "Monteverde": [41.8800, 12.4550], "Garbatella": [41.8620, 12.4890],
  "Tuscolano": [41.8700, 12.5300]
};
var AREA_NAMES = Object.keys(AREAS).sort();

var STATUS = {
  requested: "Delivery requested", awaiting: "Awaiting courier", assigned: "Courier assigned",
  to_pickup: "Courier travelling to pickup", at_pickup: "Courier arrived at pickup", collected: "Item collected",
  in_transit: "In transit to destination", at_dest: "Courier arrived at destination", delivered: "Delivered",
  cancelled: "Cancelled", issue: "Delivery issue"
};
var FLOW = ["awaiting", "assigned", "to_pickup", "at_pickup", "collected", "in_transit", "at_dest", "delivered"];
var ACTIVE = ["awaiting", "assigned", "to_pickup", "at_pickup", "collected", "in_transit", "at_dest", "issue"];
function isActive(o) { return ACTIVE.indexOf(o.status) >= 0; }
function statusClass(s) { return s === "delivered" ? "s-ok" : s === "cancelled" ? "s-bad" : s === "issue" ? "s-bad" : s === "awaiting" ? "s-warn" : "s-pur"; }

var ITEM_TYPES = [
  { id: "letter", label: "Letter" }, { id: "document", label: "Documents" }, { id: "parcel", label: "Parcel or package" },
  { id: "furniture", label: "Furniture" }, { id: "other", label: "Something else" }
];
var FURNITURE = ["Chair", "Table", "Desk", "Sofa", "Bed", "Mattress", "Cabinet", "Wardrobe", "Shelving", "Other furniture"];
var OPTIONS = [
  { id: "fragile", label: "Fragile, handle with care" }, { id: "stairs", label: "Stairs, no lift" },
  { id: "assembly", label: "Assembly or disassembly" }, { id: "helper", label: "Extra helper" },
  { id: "scheduled", label: "Scheduled time window" }, { id: "signature", label: "Signature on delivery" }
];
// Four-digit code the customer gives the courier; the courier can't complete without it.
function newCode() { var a = new Uint32Array(1); (window.crypto || window.msCrypto).getRandomValues(a); return String(1000 + a[0] % 9000); }
// What the courier earns on a delivery, tip included.
function tipOf(o) { return o && o.tip ? num(o.tip.amount, 0) : 0; }
// A courier's average star rating from customer reviews.
function courierRating(cid) {
  var stars = function (o) { return o.review ? o.review.stars : o.rating; };
  var r = S.orders.filter(function (o) { return o.courier && o.courier.id === cid && stars(o); });
  return r.length ? { avg: Math.round(r.reduce(function (s, o) { return s + stars(o); }, 0) / r.length * 10) / 10, n: r.length } : null;
}
function ratingText(cid) { var r = courierRating(cid); return r ? r.avg.toFixed(1) + " ★ (" + r.n + ")" : "New courier"; }

// Admin-editable defaults. The live values come from config/rules and config/pricing.
var DEFAULT_RULES = {
  vehicles: [
    { id: "bicycle", label: "Bicycle", l: 45, w: 35, h: 30, kg: 8, speed: 16, pickup: 10, surcharge: 0, active: true },
    { id: "scooter", label: "Scooter", l: 45, w: 40, h: 35, kg: 10, speed: 18, pickup: 8, surcharge: 0, active: true },
    { id: "motorcycle", label: "Motorcycle", l: 55, w: 45, h: 40, kg: 20, speed: 20, pickup: 8, surcharge: 0, active: true },
    { id: "smallcar", label: "Small car", l: 100, w: 90, h: 50, kg: 100, speed: 15, pickup: 12, surcharge: 2, active: true },
    { id: "car", label: "Standard car", l: 150, w: 100, h: 60, kg: 200, speed: 15, pickup: 12, surcharge: 4, active: true },
    { id: "van", label: "Van", l: 250, w: 160, h: 130, kg: 800, speed: 14, pickup: 20, surcharge: 12, active: true },
    { id: "largevan", label: "Large van", l: 340, w: 170, h: 180, kg: 1200, speed: 13, pickup: 25, surcharge: 20, active: true },
    { id: "cargovan", label: "Cargo van", l: 420, w: 200, h: 200, kg: 1500, speed: 12, pickup: 30, surcharge: 30, active: true }
  ],
  categories: [
    { id: "letter", label: "Letter", types: ["letter"], l: 35, w: 25, h: 2, kg: 0.5, fee: 0, perKm: "", couriers: 1, vehicles: ["bicycle", "scooter", "motorcycle", "smallcar", "car", "van", "largevan", "cargovan"], handling: "", active: true },
    { id: "document", label: "Documents", types: ["letter", "document"], l: 45, w: 35, h: 8, kg: 3, fee: 0, perKm: "", couriers: 1, vehicles: ["bicycle", "scooter", "motorcycle", "smallcar", "car", "van", "largevan", "cargovan"], handling: "", active: true },
    { id: "small", label: "Small parcel", types: ["document", "parcel", "other"], l: 40, w: 30, h: 20, kg: 5, fee: 0, perKm: "", couriers: 1, vehicles: ["bicycle", "scooter", "motorcycle", "smallcar", "car", "van", "largevan", "cargovan"], handling: "", active: true },
    { id: "medium", label: "Medium parcel", types: ["parcel", "other"], l: 60, w: 45, h: 40, kg: 15, fee: 3, perKm: "", couriers: 1, vehicles: ["motorcycle", "smallcar", "car", "van", "largevan", "cargovan"], handling: "", active: true },
    { id: "large", label: "Large parcel", types: ["parcel", "other"], l: 100, w: 70, h: 60, kg: 30, fee: 8, perKm: "", couriers: 1, vehicles: ["smallcar", "car", "van", "largevan", "cargovan"], handling: "", active: true },
    { id: "heavy", label: "Heavy parcel", types: ["parcel", "other"], l: 120, w: 80, h: 80, kg: 70, fee: 15, perKm: "", couriers: 1, vehicles: ["car", "van", "largevan", "cargovan"], handling: "Heavy item: lifting help may be needed", active: true },
    { id: "furniture", label: "Furniture", types: ["furniture", "other"], l: 220, w: 120, h: 120, kg: 120, fee: 25, perKm: "", couriers: 1, vehicles: ["car", "van", "largevan", "cargovan"], handling: "Wrap and protect, check doorways and stairs", active: true },
    { id: "oversized", label: "Oversized item", types: ["furniture", "parcel", "other"], l: 400, w: 200, h: 200, kg: 600, fee: 45, perKm: "", couriers: 2, vehicles: ["largevan", "cargovan"], handling: "Two couriers needed", active: true }
  ],
  twoPersonKg: 40
};
var DEFAULT_PRICING = {
  minFee: 6.9, perKm: 0.95, minKm: 2, method: "road", roadFactor: 1.35,
  longFrom: 15, longFee: 0.5, weightFrom: 20, perKgOver: 0.25, extraItemFee: 1.5, secondCourierFee: 18,
  options: { fragile: 2, stairs: 8, assembly: 15, helper: 18, scheduled: 2, signature: 0 },
  businessDiscount: 0, vatRate: 22, courierShare: 75,
  // Timing and multi-stop
  referrals: true, referralDiscount: 5, referralReward: 5,
  maxHours: 3, asapBufferMins: 45, leadMins: 45, showHours: 3, latePenaltyPct: 10, maxOrders: 3, nearKm: 2.5
};
var DEFAULT_SETTINGS = {
  open: true, banner: "", company: "", companyVat: "", companyAddress: "", supportEmail: "", invoicePrefix: "DART"
};

// ---------- Helpers ----------
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function eur(n) { var v = Math.round((Number(n) || 0) * 100) / 100, a = Math.abs(v).toFixed(2); return lang() === "it" ? (v < 0 ? "−" : "") + a.replace(".", ",") + " €" : (v < 0 ? "−€" : "€") + a; }
function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function hhmm(t) { return t ? new Date(t).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) : ""; }
function dmy(t) { return t ? new Date(t).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" }) : ""; }
function when(t) { if (!t) return ""; return isToday(t) ? "Today " + hhmm(t) : dmy(t) + " " + hhmm(t); }
function isToday(t) { return t && new Date(t).toDateString() === new Date().toDateString(); }
function initials(n) { return String(n || "?").trim().split(/\s+/).map(function (w) { return w[0] || ""; }).join("").slice(0, 2).toUpperCase() || "?"; }
function rid(n) { var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = ""; for (var i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
function num(v, d) { if (v === "" || v == null) return d; var x = parseFloat(String(v).replace(",", ".")); return isFinite(x) && x >= 0 ? x : d; }
function clip(s, n) { return String(s == null ? "" : s).trim().slice(0, n); }
function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function merge(a, b) {
  var o = Object.assign({}, a);
  Object.keys(b || {}).forEach(function (k) {
    var v = b[k];
    o[k] = v && typeof v === "object" && !Array.isArray(v) && o[k] && typeof o[k] === "object" && !Array.isArray(o[k]) ? merge(o[k], v) : v;
  });
  return o;
}
function getPath(o, p) { return p.split(".").reduce(function (x, k) { return x == null ? x : x[k]; }, o); }
function setPath(o, p, v) { var ks = p.split("."), last = ks.pop(); var t = ks.reduce(function (x, k) { if (x[k] == null || typeof x[k] !== "object") x[k] = {}; return x[k]; }, o); t[last] = v; }
function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
function safeImg(src) { return typeof src === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src) ? src : ""; }
function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function slugEmail(e) { return String(e || "").trim().toLowerCase(); }

function haversine(a, b) {
  var R = 6371, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  var h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.pow(Math.sin(dLng / 2), 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
// ---------- Address lookup (test build) ----------
// The real apps use Google address search, which returns the exact place. The test build
// knows the main streets of each area and Rome's postcodes, so typing an address fills in the area.
var STREETS = {
  "Centro Storico": ["Via del Corso", "Via del Governo Vecchio", "Corso Vittorio Emanuele II", "Via dei Coronari", "Piazza Navona", "Campo de' Fiori", "Via Giulia", "Via dei Giubbonari", "Piazza Venezia", "Via della Scrofa", "Via del Babuino", "Via Margutta", "Via Condotti", "Via Frattina", "Via del Tritone", "Via Veneto", "Piazza di Spagna", "Via di Ripetta", "Largo di Torre Argentina", "Via del Pellegrino", "Via Arenula", "Via di Monserrato", "Via della Croce", "Via del Plebiscito", "Piazza del Popolo"],
  "Trastevere": ["Viale di Trastevere", "Via della Lungaretta", "Via della Scala", "Via della Lungara", "Piazza di Santa Maria in Trastevere", "Via di San Francesco a Ripa", "Via Garibaldi", "Via della Paglia", "Vicolo del Cinque", "Via dei Genovesi", "Via Natale del Grande", "Piazza Trilussa", "Via Roma Libera", "Via Luciano Manara", "Piazza di San Cosimato", "Via Anicia", "Via dei Vascellari"],
  "Prati": ["Via Cola di Rienzo", "Viale Giulio Cesare", "Via Ottaviano", "Via Crescenzio", "Via dei Gracchi", "Piazza Cavour", "Via Marcantonio Colonna", "Via Fabio Massimo", "Via Germanico", "Viale delle Milizie", "Via Boezio", "Via Properzio", "Lungotevere Prati", "Via Vittoria Colonna", "Via Tacito", "Via Pompeo Magno", "Via Ezio", "Piazza del Risorgimento", "Viale Angelico", "Piazza Mazzini", "Via Candia", "Via Andrea Doria", "Via Federico Cesi", "Via Cicerone"],
  "Monti": ["Via Nazionale", "Via Panisperna", "Via dei Serpenti", "Via del Boschetto", "Via Urbana", "Via Leonina", "Via Baccina", "Via dei Fori Imperiali", "Via Cavour", "Via Milano", "Via degli Zingari", "Piazza della Madonna dei Monti", "Via Labicana", "Via Mazzarino", "Via del Colosseo", "Via Clementina", "Via Ciancaleoni"],
  "Testaccio": ["Via Marmorata", "Via Galvani", "Via Mastro Giorgio", "Piazza Testaccio", "Via Ginori", "Via Vanvitelli", "Via Nicola Zabaglia", "Via Alessandro Volta", "Via Luca della Robbia", "Via Aldo Manuzio", "Via di Monte Testaccio", "Via Caio Cestio", "Piazza dell'Emporio", "Lungotevere Testaccio", "Via Bodoni", "Via Florio"],
  "San Lorenzo": ["Via Tiburtina", "Via dei Volsci", "Via degli Equi", "Via dei Sabelli", "Via dei Marsi", "Via degli Ausoni", "Largo degli Osci", "Piazza dell'Immacolata", "Via dei Reti", "Via dei Latini", "Via dello Scalo di San Lorenzo", "Via dei Ramni", "Via dei Taurini", "Via dei Piceni"],
  "Pigneto": ["Via del Pigneto", "Via Prenestina", "Circonvallazione Casilina", "Via L'Aquila", "Via Fanfulla da Lodi", "Via Ascoli Piceno", "Via Macerata", "Via Braccio da Montone", "Via Casilina", "Via Pesaro", "Via Alberto da Giussano", "Via Gentile da Mogliano", "Via Perugia"],
  "Parioli": ["Viale Parioli", "Viale Bruno Buozzi", "Via Antonio Bertoloni", "Piazza Euclide", "Via Archimede", "Viale Liegi", "Via Paisiello", "Via Panama", "Piazza Ungheria", "Viale Rossini", "Via Antonio Gramsci", "Via Salaria", "Viale dei Parioli", "Via Denza", "Via Mercalli", "Viale Romania", "Via Nomentana"],
  "Ostiense": ["Via Ostiense", "Viale Guglielmo Marconi", "Via del Porto Fluviale", "Via Pellegrino Matteucci", "Via Giacomo Bove", "Via Libetta", "Via del Gazometro", "Lungotevere San Paolo", "Piazzale Ostiense", "Via dei Magazzini Generali", "Via Gustavo Bianchi", "Via Antonio Pacinotti"],
  "San Giovanni": ["Via Appia Nuova", "Via La Spezia", "Via Taranto", "Via Gallia", "Via Magna Grecia", "Via Sannio", "Piazza di San Giovanni in Laterano", "Via Merulana", "Via Emanuele Filiberto", "Via dell'Amba Aradam", "Via Britannia", "Via Pinerolo", "Piazza Re di Roma", "Via Cerveteri", "Via Orvieto", "Via Etruria", "Via Enna", "Via Albalonga"],
  "Termini": ["Via Marsala", "Via Giolitti", "Piazza dei Cinquecento", "Via Volturno", "Via Milazzo", "Via Principe Amedeo", "Piazza Vittorio Emanuele II", "Via Gioberti", "Via Napoleone III", "Via Carlo Alberto", "Via Filippo Turati", "Via Palestro", "Via Goito", "Via XX Settembre", "Via Solferino", "Piazza della Repubblica", "Via Castelfidardo", "Via Manin", "Via Cernaia"],
  "EUR": ["Viale Europa", "Via Cristoforo Colombo", "Piazzale Guglielmo Marconi", "Viale America", "Viale dell'Oceano Pacifico", "Viale Beethoven", "Viale della Civiltà del Lavoro", "Viale della Tecnica", "Viale Asia", "Viale Africa", "Viale Egeo", "Via Laurentina", "Viale dell'Arte", "Piazza Pakistan", "Viale Shakespeare"],
  "Flaminio": ["Via Flaminia", "Viale Tiziano", "Piazza Mancini", "Via Guido Reni", "Viale Pinturicchio", "Via Fracassini", "Lungotevere Flaminio", "Piazza Apollodoro", "Viale del Vignola", "Via Masaccio", "Piazza Gentile da Fabriano", "Via Flaminia Vecchia"],
  "Monteverde": ["Circonvallazione Gianicolense", "Via di Donna Olimpia", "Via Fonteiana", "Viale dei Quattro Venti", "Via Giacinto Carini", "Via Vitellia", "Piazza Rosolino Pilo", "Via Federico Ozanam", "Via Emilio Dandolo", "Via Carlo Poerio", "Via di Monteverde", "Piazza San Giovanni di Dio", "Via Ludovico di Monreale"],
  "Garbatella": ["Circonvallazione Ostiense", "Via delle Sette Chiese", "Piazza Benedetto Brin", "Via Rocco da Cesinale", "Largo delle Sette Chiese", "Piazza Damiano Sauli", "Via Ignazio Persico", "Via Giovanni Ansaldo", "Via Edgardo Ferrati", "Via Francesco Passino", "Via Guglielmo Massaia"],
  "Tuscolano": ["Via Tuscolana", "Viale Furio Camillo", "Via Ponzio Cominio", "Viale Giulio Agricola", "Via Cesare Baronio", "Via dell'Arco di Travertino", "Viale Spartaco", "Via di Porta Furba", "Piazza di Cinecittà", "Via Lucio Sestio", "Via dei Quintili"]
};
// Rome postcodes (CAP) and the areas they cover.
var CAPS = { "00184": ["Monti"], "00186": ["Centro Storico"], "00187": ["Centro Storico"], "00153": ["Trastevere", "Testaccio"], "00185": ["Termini", "San Lorenzo"],
  "00192": ["Prati"], "00193": ["Prati"], "00195": ["Prati"], "00196": ["Flaminio"], "00197": ["Parioli"], "00198": ["Parioli"], "00199": ["Parioli"],
  "00176": ["Pigneto"], "00177": ["Pigneto"], "00182": ["San Giovanni"], "00183": ["San Giovanni"], "00181": ["Tuscolano"], "00174": ["Tuscolano"], "00179": ["Tuscolano"],
  "00144": ["EUR"], "00142": ["EUR"], "00143": ["EUR"], "00152": ["Monteverde"], "00151": ["Monteverde"], "00154": ["Ostiense", "Garbatella"], "00145": ["Garbatella"], "00146": ["Ostiense"], "00147": ["Garbatella"] };
function fold(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "'").toLowerCase().replace(/\s+/g, " ").trim(); }
var STREET_LIST = []; Object.keys(STREETS).forEach(function (a) { STREETS[a].forEach(function (s) { STREET_LIST.push({ street: s, area: a, key: fold(s) }); }); });
// Suggestions while typing: streets whose name contains every word typed (house numbers ignored).
function streetMatches(text, max) {
  var words = fold(text).replace(/\b\d+[a-z]?\b|,|\b00\d{3}\b/g, " ").split(" ").filter(function (w) { return w.length > 1 && ["via", "viale", "piazza", "largo", "vicolo", "corso", "lungotevere", "piazzale", "circonvallazione"].indexOf(w) < 0; });
  if (!words.length) return [];
  return STREET_LIST.filter(function (s) { return words.every(function (w) { return s.key.indexOf(w) >= 0; }); })
    .sort(function (a, b) { return a.key.indexOf(words[0]) - b.key.indexOf(words[0]) || a.key.length - b.key.length; }).slice(0, max || 6);
}
// The area for a typed address: from a known street, else from the postcode. Returns the areas it could be.
function findArea(text) {
  var t = fold(text), hit = STREET_LIST.filter(function (s) { return t.indexOf(s.key) === 0 || t.indexOf(s.key + " ") >= 0 || t.indexOf(s.key + ",") >= 0 || t === s.key; }).sort(function (a, b) { return b.key.length - a.key.length; })[0];
  if (hit) return [hit.area];
  var cap = (t.match(/\b(00\d{3})\b/) || [])[1];
  return cap && CAPS[cap] ? CAPS[cap] : [];
}
function houseNumber(text) { var m = String(text || "").match(/(?:^|[\s,])(\d+[a-zA-Z]?(?:\/[a-zA-Z0-9]+)?)\s*(?:,|$)/); return m ? m[1] : ""; }

// ---------- Delivery times ----------
// ASAP promises the trip time plus a buffer; a set time must be at least that far ahead.
function earliestBy(from, to, now) {
  var v = vehicle("scooter") || {}, mins = num(v.pickup, 12) + tripKm(from, to) / num(v.speed, 15) * 60;
  return (now || Date.now()) + Math.min(Math.round(mins + num(pricing().asapBufferMins, 45)), maxMins()) * 60000;
}
// The longest DART ever promises for an as-soon-as-possible delivery.
function maxMins() { return Math.round(num(pricing().maxHours, 3) * 60); }
function hoursText() { var h = num(pricing().maxHours, 3); return h === 1 ? "1 hour" : h + " hours"; }
function minsText(m) { m = Math.round(m); return m >= 60 ? Math.floor(m / 60) + " h " + (m % 60 ? (m % 60) + " min" : "") : m + " min"; }
// Is a delivery at risk of missing its deliver-by time? Returns a short reason, or null.
function riskOf(o, now) {
  now = now || Date.now();
  if (!o.deliverBy || ACTIVE.indexOf(o.status) < 0) return null;
  if (now > o.deliverBy) return "Late";
  if (o.status === "awaiting") return (o.asap || now >= startAt(o)) && now + num(o.price.mins, 30) * 60000 > o.deliverBy - 20 * 60000 ? "No courier yet" : null;
  var c = o.courier && byId(S.couriers, o.courier.id);
  if (c && c.vehicle && typeof planRoute === "function" && !bookedAhead(o, now)) {
    var jobs = S.orders.filter(function (j) { return j.courier && j.courier.id === c.id && ACTIVE.indexOf(j.status) >= 0 && j.status !== "awaiting" && !bookedAhead(j, now); });
    var plan = planRoute(c.vehicle.type, c.area || o.pickup.area, jobs, now), stop = plan.stops.filter(function (s) { return s.o.id === o.id && s.kind === "dropoff"; })[0];
    if (stop && stop.eta > o.deliverBy) return "On track to be late";
  }
  return null;
}
// Choices for "By a set time": half-hour steps today and tomorrow, 08:00 to 21:00.
function deliverySlots(from, to, now) {
  var first = earliestBy(from, to, now), out = [], d = new Date(now || Date.now()); d.setHours(0, 0, 0, 0);
  for (var day = 0; day < 2; day++) for (var m = 8 * 60; m <= 21 * 60; m += 30) {
    var t = d.getTime() + day * 864e5 + m * 60000; if (t >= first) out.push(t);
  }
  return out;
}
// When a courier should set off for a set-time delivery, and when couriers can first see it.
function startAt(o) { return o.deliverBy - (num(o.price && o.price.mins, 30) + num(pricing().leadMins, 45)) * 60000; }
function visibleFrom(o) { return o.deliverBy - num(pricing().showHours, 3) * 3600000; }
// A set-time delivery a courier has accepted ahead but doesn't need to start yet.
function bookedAhead(o, now) { return !o.asap && o.deliverBy && o.status === "assigned" && (now || Date.now()) < startAt(o); }
function byLabel(t) { var d = new Date(t), today = new Date(); return (d.toDateString() === today.toDateString() ? "Today" : "Tomorrow") + " by " + hhmm(t); }
function leftLabel(t) { var m = Math.round((t - Date.now()) / 60000); return m >= 0 ? (m >= 60 ? Math.floor(m / 60) + " h " + (m % 60) + " min left" : m + " min left") : Math.abs(m) + " min late"; }
function tripKm(from, to) {
  var p = pricing(), f = p.method === "straight" ? 1 : num(p.roadFactor, 1.35);
  if (!AREAS[from] || !AREAS[to]) return 0;
  return from === to ? 1.2 : r2(haversine(AREAS[from], AREAS[to]) * f);
}

// Shrink a photo to a small JPEG data URL so it fits in a shared document.
function shrinkImage(file, max, cap) {
  return new Promise(function (resolve, reject) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      var q = .72, out = c.toDataURL("image/jpeg", q);
      while (out.length > cap && q > .3) { q -= .1; out = c.toDataURL("image/jpeg", q); }
      URL.revokeObjectURL(url); resolve(out);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}
function dataUrlToBlob(d) {
  var b = atob(d.split(",")[1]), u = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return new Blob([u], { type: "image/jpeg" });
}

// ---------- Store: the artifact's shared db when available, this browser otherwise ----------
var LS = "dart-v2-data";
var Store = {
  mode: "connecting", db: null, ws: [], localSubs: [],
  local: function () { return lsGet(LS, {}); },
  watch: function (path, cb) {
    var w = { path: path, cb: cb, un: null }, self = this;
    this.ws.push(w);
    if (this.mode !== "connecting") this._attach(w);
    return function () { if (w.un) w.un(); var i = self.ws.indexOf(w); if (i >= 0) self.ws.splice(i, 1); };
  },
  _attach: function (w) {
    var self = this;
    if (self.mode === "live") {
      w.un = self.db.collection(w.path).onSnapshot(function (snap) {
        w.cb(snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
      }, function (e) { toast("Live data stopped (" + e.code + "). Reload the page to reconnect."); });
    } else {
      var fire = function () { var d = self.local()[w.path] || {}; w.cb(Object.keys(d).map(function (id) { return Object.assign({ id: id }, d[id]); })); };
      self.localSubs.push(fire);
      w.un = function () { var i = self.localSubs.indexOf(fire); if (i >= 0) self.localSubs.splice(i, 1); };
      fire();
    }
  },
  start: function (mode, db) {
    this.ws.forEach(function (w) { if (w.un) { try { w.un(); } catch (e) { } } w.un = null; });
    this.mode = mode; this.db = db || null;
    var self = this; this.ws.forEach(function (w) { self._attach(w); });
  },
  emit: function () { this.localSubs.slice().forEach(function (f) { f(); }); },
  set: function (path, id, data) {
    if (this.mode === "live") return this.db.doc(path + "/" + id).set(data);
    var d = this.local(); d[path] = d[path] || {}; d[path][id] = data; lsSet(LS, d); this.emit(); return Promise.resolve();
  },
  update: function (path, id, patch) {
    if (this.mode === "live") return this.db.doc(path + "/" + id).update(patch);
    var d = this.local(); if (!d[path] || !d[path][id]) return Promise.reject({ code: "invalid_argument" });
    d[path][id] = merge(d[path][id], patch); lsSet(LS, d); this.emit(); return Promise.resolve();
  },
  del: function (path, id) {
    if (this.mode === "live") return this.db.doc(path + "/" + id).delete();
    var d = this.local(); if (d[path]) delete d[path][id]; lsSet(LS, d); this.emit(); return Promise.resolve();
  },
  get: function (path, id) {
    if (this.mode === "live") return this.db.doc(path + "/" + id).get().then(function (s) { return s.exists ? Object.assign({ id: s.id }, s.data()) : null; });
    var d = this.local(); return Promise.resolve(d[path] && d[path][id] ? Object.assign({ id: id }, d[path][id]) : null);
  },
  // Single-winner update: hold a short lease, re-read, apply only if `ok(doc)` still holds.
  claim: function (path, id, holder, ok, patch) {
    var self = this;
    if (this.mode === "live") {
      var ref = this.db.doc(path + "/" + id);
      return ref.acquire({ holder: holder, ttlMs: 5000 }).then(function (r) {
        if (!r.acquired) return false;
        return ref.get().then(function (s) {
          if (!s.exists || !ok(s.data())) return false;
          return ref.update(patch).then(function () { return true; });
        });
      });
    }
    return this.get(path, id).then(function (doc) { if (!doc || !ok(doc)) return false; return self.update(path, id, patch).then(function () { return true; }); });
  }
};
window.addEventListener("storage", function (e) { if (e.key === LS && Store.mode === "local") Store.emit(); });

// ---------- Shared state ----------
var S = {
  orders: [], accounts: [], couriers: [], invoices: [], tickets: [], plans: [],
  cfg: { rules: null, pricing: null, settings: null, discounts: null },
  me: Object.assign({ customerId: null, courierId: null, read: {}, seen: {}, declined: {} }, lsGet("dart-v2-me", {})),
  modal: null,
  c: {}, d: {}, a: {}
};
function saveMe() { lsSet("dart-v2-me", S.me); }
function rules() {
  var r = S.cfg.rules || {};
  return { vehicles: r.vehicles && r.vehicles.length ? r.vehicles : DEFAULT_RULES.vehicles, categories: r.categories && r.categories.length ? r.categories : DEFAULT_RULES.categories, twoPersonKg: num(r.twoPersonKg, DEFAULT_RULES.twoPersonKg) };
}
function pricing() { return merge(DEFAULT_PRICING, S.cfg.pricing || {}); }
function settings() { return merge(DEFAULT_SETTINGS, S.cfg.settings || {}); }
function vehicle(id) { return byId(rules().vehicles, id); }
function vLabel(id) { var v = vehicle(id); return v ? v.label : id || ""; }
function category(id) { return byId(rules().categories, id); }
function cLabel(id) { var c = category(id); return c ? c.label : id || ""; }

// ---------- Classification and vehicle eligibility ----------
function dims(x) { return [num(x.l, 0), num(x.w, 0), num(x.h, 0)].sort(function (a, b) { return b - a; }); }
function fitsBox(item, box) { var a = dims(item), b = dims(box); return a[0] <= b[0] && a[1] <= b[1] && a[2] <= b[2]; }
function itemKg(item) { return num(item.kg, 0) * Math.max(1, num(item.qty, 1)); }
function vehicleFits(v, item) {
  if (!v) return false;
  var q = Math.max(1, num(item.qty, 1)), a = dims(item), b = dims(v);
  var vol = a[0] * a[1] * a[2] * q, cap = b[0] * b[1] * b[2] * .85;
  return fitsBox(item, v) && itemKg(item) <= num(v.kg, 0) && vol <= cap;
}
// Estimated weight when the customer doesn't know it (kg per litre by item type).
function estimateKg(item) {
  var a = dims(item), litres = a[0] * a[1] * a[2] / 1000;
  var density = item.type === "furniture" ? .06 : item.type === "letter" || item.type === "document" ? .4 : .15;
  return Math.max(.1, Math.round(litres * density * 10) / 10);
}
function classify(item) {
  var R = rules(), type = item.type || "parcel";
  if (!type) return { ok: false, need: "type", msg: "Choose what you're sending." };
  var it = Object.assign({}, item);
  if (type === "letter" && !num(it.l, 0)) { it.l = 30; it.w = 22; it.h = 1; }
  if (type === "document" && !num(it.l, 0)) { it.l = 32; it.w = 24; it.h = 3; }
  if (!num(it.l, 0) || !num(it.w, 0) || !num(it.h, 0)) return { ok: false, need: "measurements", msg: "Add the length, width and height so we can find the right vehicle." };
  var kgEstimated = false;
  if (!num(it.kg, 0)) { it.kg = estimateKg(it); kgEstimated = true; }
  var cats = R.categories.filter(function (c) { return c.active !== false && (c.types || []).indexOf(type) >= 0; });
  var cat = null;
  for (var i = 0; i < cats.length; i++) if (fitsBox(it, cats[i]) && num(it.kg, 0) <= num(cats[i].kg, 0)) { cat = cats[i]; break; }
  if (!cat) return { ok: false, tooBig: true, msg: "This is bigger or heavier than anything DART carries right now. Contact support for a custom quote." };
  var vs = R.vehicles.filter(function (v) { return v.active !== false && (cat.vehicles || []).indexOf(v.id) >= 0 && vehicleFits(v, it); });
  if (!vs.length) return { ok: false, tooBig: true, category: cat.id, msg: "None of our vehicles can carry this many items at once. Split it into more than one delivery, or contact support." };
  vs.sort(function (a, b) { return a.l * a.w * a.h - b.l * b.w * b.h; });
  var couriers = Math.max(num(cat.couriers, 1), num(it.kg, 0) > R.twoPersonKg || (item.options && item.options.helper) ? 2 : 1);
  var notes = [];
  if (cat.handling) notes.push(cat.handling);
  if (kgEstimated) notes.push("Weight estimated at about " + it.kg + " kg from the size");
  if (couriers > 1) notes.push("Two people will handle this item");
  return {
    ok: true, category: cat.id, label: cat.label, vehicles: vs.map(function (v) { return v.id; }), minVehicle: vs[0].id,
    couriers: couriers, kg: num(it.kg, 0), kgEstimated: kgEstimated, l: num(it.l, 0), w: num(it.w, 0), h: num(it.h, 0),
    source: item.ai ? "photos" : "measurements", notes: notes
  };
}

// ---------- Pricing ----------
function quote(from, to, item, cls, account) {
  var P = pricing(), R = rules(), lines = [];
  var cat = category(cls.category) || {}, v = vehicle(cls.minVehicle) || {};
  var km = tripKm(from, to), billKm = Math.max(km, num(P.minKm, 0));
  var rate = cat.perKm !== "" && cat.perKm != null && isFinite(parseFloat(cat.perKm)) ? parseFloat(cat.perKm) : num(P.perKm, 0);
  lines.push({ label: "Distance " + km.toFixed(1) + " km" + (km < num(P.minKm, 0) ? " (charged as " + P.minKm + " km)" : "") + " × " + eur(rate), amount: r2(billKm * rate), kind: "base" });
  if (km > num(P.longFrom, 999)) lines.push({ label: "Long distance, over " + P.longFrom + " km", amount: r2((km - P.longFrom) * num(P.longFee, 0)), kind: "base" });
  if (num(cat.fee, 0)) lines.push({ label: cat.label, amount: r2(cat.fee), kind: "base" });
  var kgT = cls.kg * Math.max(1, num(item.qty, 1));
  if (kgT > num(P.weightFrom, 9999)) lines.push({ label: "Weight over " + P.weightFrom + " kg", amount: r2((kgT - P.weightFrom) * num(P.perKgOver, 0)), kind: "base" });
  var q = Math.max(1, num(item.qty, 1));
  if (q > 1) lines.push({ label: (q - 1) + " extra item" + (q > 2 ? "s" : ""), amount: r2((q - 1) * num(P.extraItemFee, 0)), kind: "base" });
  if (num(v.surcharge, 0)) lines.push({ label: "Vehicle: " + v.label, amount: r2(v.surcharge), kind: "base" });
  if (cls.couriers > 1 && !(item.options && item.options.helper)) lines.push({ label: "Second courier", amount: r2(P.secondCourierFee), kind: "base" });
  OPTIONS.forEach(function (o) { if (item.options && item.options[o.id] && num(P.options[o.id], 0)) lines.push({ label: o.label, amount: r2(P.options[o.id]), kind: "option" }); });
  var sum = lines.reduce(function (s, l) { return s + l.amount; }, 0);
  if (sum < num(P.minFee, 0)) { lines.push({ label: "Minimum delivery fee top-up", amount: r2(P.minFee - sum), kind: "base" }); sum = num(P.minFee, 0); }
  if (account && account.business && account.business.active && num(P.businessDiscount, 0)) {
    var d = -r2(sum * P.businessDiscount / 100); lines.push({ label: "Business discount " + P.businessDiscount + "%", amount: d, kind: "base" }); sum += d;
  }
  var total = r2(sum), vat = r2(total - total / (1 + num(P.vatRate, 22) / 100));
  var mins = Math.round(num(v.pickup, 12) + km / num(v.speed, 15) * 60);
  return { lines: lines, total: total, vat: vat, net: r2(total - vat), km: km, mins: mins, vatRate: num(P.vatRate, 22) };
}

// ---------- Subscriptions ----------
function activeSub(acc) { return acc && acc.subscription && acc.subscription.status === "active" && Date.now() < (acc.subscription.renewsAt || 0) + 864e5 ? acc.subscription : null; }
function subPlan(acc) { var s = activeSub(acc); return s ? byId(S.plans, s.planId) : null; }
function subUsage(acc) {
  var s = activeSub(acc); if (!s) return 0;
  return S.orders.filter(function (o) { return o.customer && o.customer.id === acc.id && o.billing && o.billing.method === "subscription" && o.billing.included && o.status !== "cancelled" && (o.createdAt || 0) >= (s.periodStart || 0); }).length;
}
// What the customer pays when using their plan: covered, over the allowance, or not covered.
function subBilling(acc, cls, q) {
  var plan = subPlan(acc); if (!plan) return null;
  var used = subUsage(acc), left = Math.max(0, num(plan.allowance, 0) - used);
  var covered = (plan.categories || []).indexOf(cls.category) >= 0;
  var extras = q.lines.filter(function (l) { return l.kind === "option"; }).reduce(function (s, l) { return s + l.amount; }, 0);
  if (covered && left > 0) return { plan: plan, included: true, amount: r2(extras), note: "Included in " + plan.name + " (" + left + " of " + plan.allowance + " left this month)" + (extras ? ". Optional services are charged." : "") };
  if (covered) return { plan: plan, included: false, amount: r2(num(plan.overageFee, q.total) + extras), note: "Over your monthly allowance: " + eur(plan.overageFee) + " per extra delivery" + (extras ? " plus optional services" : "") };
  return { plan: plan, included: false, amount: q.total, note: cLabel(cls.category) + " isn't included in " + plan.name + ", so the normal price applies" };
}

// ---------- Invoices ----------
function invoiceNo() { return settings().invoicePrefix + "-" + new Date().getFullYear() + "-" + rid(6); }
function partyFor(acc) {
  var b = acc && acc.business && acc.business.active ? acc.business : null;
  return b ? { name: b.name, address: b.address, vat: b.vat, email: b.email || acc.email, sdi: b.sdi, contact: acc.name } : { name: acc ? acc.name : "Customer", address: "", email: acc ? acc.email : "" };
}
// ---------- Discount codes and account credit ----------
function discounts() { return (S.cfg.discounts && S.cfg.discounts.codes) || []; }
function normCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20); }
function codeUses(code, who) {
  return S.orders.filter(function (o) { return o.billing && o.billing.discount && o.billing.discount.code === code && o.status !== "cancelled" && (!who || o.customer.id === who.id || (who.email && slugEmail(o.customer.email || "") === slugEmail(who.email))); }).length;
}
// Every customer's personal referral code: first name plus three characters from their account.
function refCodeOf(acc) {
  if (!acc) return "";
  if (acc.refCode) return acc.refCode;
  var name = fold(String(acc.name || "").split(" ")[0]).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "DART";
  return name + String(acc.id || "").replace(/[^A-Za-z0-9]/g, "").slice(-3).toUpperCase();
}
function referrerFor(code) { return code ? S.accounts.filter(function (a) { return refCodeOf(a) === code; })[0] || null : null; }
function hasBooked(who) { return S.orders.some(function (o) { return o.status !== "cancelled" && ((who.id && o.customer.id === who.id) || (who.email && slugEmail(o.customer.email || "") === slugEmail(who.email))); }); }
// Is this code valid for this booking? Returns the discount in euros, or why not.
function checkCode(raw, total, who) {
  var code = normCode(raw), d = discounts().filter(function (x) { return x.code === code; })[0];
  if (!code) return null;
  var ref = !d && referrerFor(code), P = pricing();
  if (ref) {
    if (P.referrals === false) return { ok: false, msg: "Referral codes aren't available right now." };
    if (who && ((who.id && who.id === ref.id) || (who.email && slugEmail(who.email) === slugEmail(ref.email)))) return { ok: false, msg: "That's your own code. Share it with friends instead." };
    if (who && (who.id || who.email) && hasBooked(who)) return { ok: false, msg: "Referral codes are for your first delivery." };
    return { ok: true, code: code, referrer: ref.id, amount: r2(Math.min(total, num(P.referralDiscount, 5))), label: "from " + String(ref.name || "").split(" ")[0] };
  }
  if (!d || d.active === false) return { ok: false, msg: "That code isn't valid." };
  if (d.until && Date.now() > new Date(d.until + "T23:59:59").getTime()) return { ok: false, msg: "That code has expired." };
  if (num(d.minOrder, 0) && total < num(d.minOrder, 0)) return { ok: false, msg: "This code needs a delivery of at least " + eur(d.minOrder) + "." };
  if (num(d.maxUses, 0) && codeUses(code) >= num(d.maxUses, 0)) return { ok: false, msg: "That code has been used up." };
  if (d.once && who && (who.id || who.email) && codeUses(code, who) > 0) return { ok: false, msg: "You've already used this code." };
  if (d.newOnly && who && who.id && S.orders.some(function (o) { return o.customer.id === who.id && o.status !== "cancelled"; })) return { ok: false, msg: "This code is for your first delivery." };
  var amount = d.type === "fixed" ? num(d.value, 0) : total * num(d.value, 0) / 100;
  return { ok: true, code: code, amount: r2(Math.min(total, amount)), label: d.type === "fixed" ? eur(d.value) + " off" : num(d.value, 0) + "% off" };
}
function deliveryInvoice(o, acc, status) {
  var vr = num(pricing().vatRate, 22), lines = (o.price.lines || []).slice(), b = o.billing || {};
  var disc = b.discount ? num(b.discount.amount, 0) : 0, total = b.method === "subscription" ? num(b.amount, o.price.total) : r2(o.price.total - disc);
  if (b.method === "subscription") lines = [{ label: b.included ? "Delivery included in " + b.planName : "Delivery under " + b.planName, amount: total }];
  else if (disc) lines.push({ label: "Discount " + b.discount.code, amount: -disc });
  var vat = r2(total - total / (1 + vr / 100));
  return {
    number: invoiceNo(), kind: "delivery", accountId: o.customer.id, party: partyFor(acc), orderId: o.id,
    lines: lines, total: r2(total), vat: vat, net: r2(total - vat), vatRate: vr,
    status: status, method: o.billing ? o.billing.method : "card", creditUsed: b.credit ? num(b.credit, 0) : 0, issuedAt: Date.now(), paidAt: status === "paid" ? Date.now() : null,
    ref: { from: o.pickup.area + (o.pickup.street ? ", " + o.pickup.street : ""), to: o.dropoff.area + (o.dropoff.street ? ", " + o.dropoff.street : ""), item: cLabel(o.cls.category) + (o.item.desc ? ": " + o.item.desc : ""), km: o.price.km, date: o.timeline && o.timeline.delivered || o.createdAt }
  };
}
function subscriptionInvoice(acc, plan, period, amount, label) {
  var vr = num(pricing().vatRate, 22), vat = r2(amount - amount / (1 + vr / 100));
  return {
    number: invoiceNo(), kind: "subscription", accountId: acc.id, party: partyFor(acc), planId: plan.id,
    lines: [{ label: label || (plan.name + " plan, " + plan.allowance + " deliveries"), amount: r2(amount) }],
    total: r2(amount), vat: vat, net: r2(amount - vat), vatRate: vr, status: "paid", method: "card",
    issuedAt: Date.now(), paidAt: Date.now(), period: period
  };
}
function invoiceHTML(inv) {
  var st = settings(), p = inv.party || {};
  var rows = (inv.lines || []).map(function (l) { return "<tr><td>" + esc(l.label) + "</td><td style='text-align:right'>" + eur(l.amount) + "</td></tr>"; }).join("");
  return "<!doctype html><html><head><meta charset='utf-8'><title>Invoice " + esc(inv.number) + "</title><style>body{font-family:Helvetica,Arial,sans-serif;color:#170F2E;max-width:720px;margin:40px auto;padding:0 20px}h1{font-size:28px;margin:0}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{padding:8px 0;border-bottom:1px solid #ddd;text-align:left}.tot td{font-weight:bold;border-bottom:0}.muted{color:#5E5677}.grid{display:flex;justify-content:space-between;gap:20px;margin-top:24px}</style></head><body>" +
    "<h1>DART</h1><p class='muted'>" + esc(st.company || "DART") + (st.companyVat ? " · P.IVA " + esc(st.companyVat) : "") + (st.companyAddress ? " · " + esc(st.companyAddress) : "") + "</p>" +
    "<div class='grid'><div><b>Invoice " + esc(inv.number) + "</b><br>Issued " + dmy(inv.issuedAt) + "<br>Status: " + esc(inv.status === "paid" ? "Paid " + dmy(inv.paidAt) : inv.status) + "</div>" +
    "<div><b>Billed to</b><br>" + esc(p.name) + (p.address ? "<br>" + esc(p.address) : "") + (p.vat ? "<br>P.IVA / CF " + esc(p.vat) : "") + (p.sdi ? "<br>SDI / PEC " + esc(p.sdi) : "") + (p.email ? "<br>" + esc(p.email) : "") + "</div></div>" +
    (inv.ref ? "<p><b>Delivery " + esc(inv.orderId) + "</b><br>" + esc(inv.ref.from) + " → " + esc(inv.ref.to) + "<br>" + esc(inv.ref.item) + " · " + (+inv.ref.km || 0).toFixed(1) + " km · " + dmy(inv.ref.date) + "</p>" : "") +
    (inv.period ? "<p><b>Billing period</b><br>" + dmy(inv.period.from) + " to " + dmy(inv.period.to) + "</p>" : "") +
    "<table><thead><tr><th>Description</th><th style='text-align:right'>Amount</th></tr></thead><tbody>" + rows +
    "<tr><td class='muted'>Net</td><td style='text-align:right' class='muted'>" + eur(inv.net) + "</td></tr><tr><td class='muted'>VAT " + inv.vatRate + "% (included)</td><td style='text-align:right' class='muted'>" + eur(inv.vat) + "</td></tr>" +
    "<tr class='tot'><td>Total</td><td style='text-align:right'>" + eur(inv.total) + "</td></tr>" + (inv.creditUsed ? "<tr><td>Paid with DART credit</td><td style='text-align:right'>" + eur(inv.creditUsed) + "</td></tr>" : "") + "</tbody></table>" +
    "<p class='muted' style='margin-top:30px'>Test invoice generated by the DART test build. Not a fiscal document.</p></body></html>";
}

// ---------- Map of Rome ----------
var MW = 360, MH = 400;
function proj(ll) { return [r2((ll[1] - 12.43) / .115 * MW), r2((41.94 - ll[0]) / .12 * MH)]; }
var TIBER = [[41.945, 12.468], [41.93, 12.472], [41.918, 12.47], [41.908, 12.475], [41.902, 12.466], [41.896, 12.468], [41.892, 12.471], [41.889, 12.4775], [41.882, 12.477], [41.876, 12.471], [41.868, 12.468], [41.858, 12.474], [41.848, 12.468], [41.838, 12.458], [41.82, 12.45]];
var ROADS = [["Prati", "Centro Storico"], ["Centro Storico", "Monti"], ["Monti", "Termini"], ["Termini", "San Lorenzo"], ["San Lorenzo", "Pigneto"], ["Monti", "San Giovanni"], ["San Giovanni", "Pigneto"], ["Centro Storico", "Trastevere"], ["Trastevere", "Testaccio"], ["Testaccio", "Ostiense"], ["Ostiense", "EUR"], ["Termini", "Parioli"], ["Parioli", "Flaminio"], ["Flaminio", "Prati"], ["Testaccio", "San Giovanni"], ["Trastevere", "Monteverde"], ["Ostiense", "Garbatella"], ["Garbatella", "EUR"], ["San Giovanni", "Tuscolano"], ["Pigneto", "Tuscolano"], ["Centro Storico", "Flaminio"]];
function quad(a, b) { var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; return [r2(mx - dy * .18), r2(my + dx * .18)]; }
function onQuad(a, c, b, t) { var u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; }
// A viewBox that frames the given areas at a set width:height ratio, so a route is never cut off.
function fitVB(names, ratio, pad) {
  var pts = names.filter(function (n) { return AREAS[n]; }).map(function (n) { return proj(AREAS[n]); });
  if (!pts.length) return null;
  pad = pad == null ? 40 : pad;
  var x0 = Math.min.apply(null, pts.map(function (p) { return p[0]; })) - pad, x1 = Math.max.apply(null, pts.map(function (p) { return p[0]; })) + pad;
  var y0 = Math.min.apply(null, pts.map(function (p) { return p[1]; })) - pad, y1 = Math.max.apply(null, pts.map(function (p) { return p[1]; })) + pad;
  var w = Math.max(x1 - x0, 160), h = Math.max(y1 - y0, 80), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (w / h < ratio) w = h * ratio; else h = w / ratio;
  return [cx - w / 2, cy - h / 2, w, h].map(function (v) { return Math.round(v); }).join(" ");
}
function mapSVG(opt) {
  opt = opt || {};
  var s = '<svg viewBox="' + (opt.vb || "0 0 " + MW + " " + MH) + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map of Rome">';
  s += '<rect x="-400" y="-400" width="' + (MW + 800) + '" height="' + (MH + 1200) + '" fill="var(--map-bg)"/>';
  if (opt.vb) s += '<g stroke="var(--map-road)" stroke-width="3" opacity=".7">' + [-200, -120, -40, 420, 500, 580].map(function (y) { return '<line x1="-400" y1="' + y + '" x2="800" y2="' + (y + 30) + '"/>'; }).join("") + [-60, 420].map(function (x) { return '<line x1="' + x + '" y1="-400" x2="' + (x + 20) + '" y2="900"/>'; }).join("") + "</g>";
  [[41.914, 12.487, 26, 16], [41.886, 12.452, 20, 24], [41.931, 12.503, 18, 12], [41.873, 12.497, 14, 10]].forEach(function (p) { var c = proj(p); s += '<ellipse cx="' + c[0] + '" cy="' + c[1] + '" rx="' + p[2] + '" ry="' + p[3] + '" fill="var(--map-park)"/>'; });
  ROADS.forEach(function (r) { var a = proj(AREAS[r[0]]), b = proj(AREAS[r[1]]); s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="var(--map-road)" stroke-width="6" stroke-linecap="round"/>'; });
  s += '<polyline points="' + TIBER.map(function (p) { return proj(p).join(","); }).join(" ") + '" fill="none" stroke="var(--map-river)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>';
  if (opt.labels !== false) AREA_NAMES.forEach(function (n) { var c = proj(AREAS[n]); s += '<text x="' + c[0] + '" y="' + (c[1] + 15) + '" text-anchor="middle" font-size="9" font-weight="600" fill="var(--muted)" font-family="Schibsted Grotesk, Arial, sans-serif">' + esc(n) + "</text>"; });
  (opt.dots || []).forEach(function (d) { if (!AREAS[d.area]) return; var c = proj(AREAS[d.area]); s += '<circle cx="' + (c[0] + (d.dx || 0)) + '" cy="' + (c[1] + (d.dy || 0)) + '" r="6" fill="' + (d.color || "var(--lilac)") + '" stroke="var(--card)" stroke-width="2.5"/>'; });
  (opt.routes || []).forEach(function (r) {
    if (!AREAS[r.from] || !AREAS[r.to]) return;
    var a = proj(AREAS[r.from]), b = proj(AREAS[r.to]), c = quad(a, b);
    s += '<path d="M' + a + " Q" + c + " " + b + '" fill="none" stroke="var(--purple)" stroke-width="' + (r.thin ? 3 : 5) + '" stroke-linecap="round"' + (r.dashed ? ' stroke-dasharray="2 8"' : "") + "/>";
    s += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="7" fill="var(--card)" stroke="var(--purple)" stroke-width="4"/>';
    s += '<rect x="' + (b[0] - 7) + '" y="' + (b[1] - 7) + '" width="14" height="14" rx="3" fill="var(--ink)"/>';
    if (r.t != null) {
      var p = r.approach != null ? [a[0] + 40 * (1 - r.approach), a[1] - 50 * (1 - r.approach)] : onQuad(a, c, b, r.t);
      s += '<circle class="pulse" cx="' + p[0] + '" cy="' + p[1] + '" r="8" fill="var(--purple)"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="var(--lilac)" stroke="var(--card)" stroke-width="3"/>';
    }
  });
  (opt.pins || []).forEach(function (p) {
    if (!AREAS[p.area]) return;
    var c = proj(AREAS[p.area]), x = c[0] + (p.dx || 0), y = c[1] + (p.dy || 0), w = Math.max(30, String(p.text).length * 6.4 + 14);
    var bg = p.tone === "green" ? "var(--ok)" : p.tone === "ink" ? "var(--ink)" : "var(--purple)", fg = p.tone === "ink" ? "var(--paper)" : "#fff";
    s += '<g><circle cx="' + c[0] + '" cy="' + c[1] + '" r="5" fill="' + bg + '" stroke="var(--card)" stroke-width="2"/><rect x="' + (x - w / 2) + '" y="' + (y - 26) + '" width="' + w + '" height="18" rx="4" fill="' + bg + '"/><path d="M' + (x - 4) + " " + (y - 8) + " L" + x + " " + (y - 3) + " L" + (x + 4) + " " + (y - 8) + 'z" fill="' + bg + '"/><text x="' + x + '" y="' + (y - 13.5) + '" text-anchor="middle" font-size="10.5" font-weight="800" fill="' + fg + '" font-family="JetBrains Mono, ui-monospace, monospace">' + esc(p.text) + "</text></g>";
  });
  return s + "</svg>";
}
// Simulated courier position from the order's timestamps (the test build has no GPS).
function courierPos(o) {
  var now = Date.now(), t = o.timeline || {}, legMin = Math.max(5, (o.price && o.price.mins || 20) - 10);
  if (o.status === "assigned") return { t: 0, approach: 0 };
  if (o.status === "to_pickup") return { t: 0, approach: Math.min(.95, (now - (t.to_pickup || now)) / 300000) };
  if (o.status === "at_pickup" || o.status === "collected") return { t: 0, approach: 1 };
  if (o.status === "in_transit") return { t: Math.min(.95, (now - (t.in_transit || now)) / (legMin * 60000)) };
  if (o.status === "at_dest" || o.status === "delivered") return { t: 1 };
  return {};
}
function mapsLink(area, street) { return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent((street ? street + ", " : "") + area + ", Roma"); }

// ---------- Toast and errors ----------
var toastTimer;
function toast(msg) {
  var el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = tr(msg); el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 3400);
}
function fail(e) {
  // Errors written for people (e.show) are shown as they are.
  if (e && e.show && e.message) return toast(e.message);
  toast(e && e.code === "invalid_argument" ? "You don't have permission to change this." : e && e.code === "quota_exceeded" ? "The test database is full. Clear old orders in the admin portal." : "That didn't save. Check your connection and try again.");
}
var busy = false;
function run(p, okMsg) { busy = true; return Promise.resolve(p).then(function (v) { if (okMsg) toast(okMsg); return v; }, function (e) { fail(e); return undefined; }).finally(function () { busy = false; render(); }); }

// ---------- Shared UI pieces ----------
function chip(s) { return '<span class="chip ' + statusClass(s) + '">' + esc(STATUS[s] || s) + "</span>"; }
function modeChip() { return langSwitch() + (Store.mode === "live" ? '<span class="mode live"><i></i>Live · shared</span>' : '<span class="mode"><i></i>This browser only</span>'); }
function field(label, inner, hint) { return '<label class="field"><span>' + label + "</span>" + inner + (hint ? '<small class="hint">' + hint + "</small>" : "") + "</label>"; }
function inp(bind, val, attrs) { return '<input class="input" data-bind="' + bind + '" value="' + esc(val == null ? "" : val) + '" ' + (attrs || "") + ">"; }
function txt(bind, val, attrs) { return '<textarea class="input" data-bind="' + bind + '" ' + (attrs || "") + ">" + esc(val || "") + "</textarea>"; }
function sel(bind, val, opts, attrs) { return '<select class="input" data-bind="' + bind + '" ' + (attrs || "") + ">" + opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? " selected" : "") + ">" + esc(l) + "</option>"; }).join("") + "</select>"; }
function areaSel(bind, val) { return sel(bind, val || "", [["", "Choose area"]].concat(AREA_NAMES), 'data-live="1"'); }
function check(bind, on, label) { return '<label class="check"><input type="checkbox" data-bind="' + bind + '"' + (on ? " checked" : "") + ' data-live="1"><span>' + label + "</span></label>"; }
function sw(act, on, label, extra) { return '<button type="button" class="switch ' + (on ? "on" : "") + '" role="switch" aria-checked="' + !!on + '" aria-label="' + esc(label) + '" data-act="' + act + '" ' + (extra || "") + "></button>"; }
function vIcon(id) { var two = ["bicycle", "scooter", "motorcycle"].indexOf(id) >= 0, big = ["van", "largevan", "cargovan"].indexOf(id) >= 0; return '<svg class="vic" aria-hidden="true"><use href="#i-' + (two ? "scooter" : big ? "van" : "car") + '"/></svg>'; }
function photoStrip(list) { return (list || []).map(safeImg).filter(Boolean).map(function (p) { return '<img class="ph" src="' + p + '" alt="Item photo">'; }).join(""); }
function breakdown(q, billing) {
  var h = '<dl class="kv">' + q.lines.map(function (l) { return "<dt>" + esc(l.label) + '</dt><dd class="num">' + eur(l.amount) + "</dd>"; }).join("");
  h += '<dt class="tot">Delivery price</dt><dd class="tot num">' + eur(q.total) + "</dd>";
  if (billing && billing.amount !== q.total) h += '<dt class="tot">You pay with your plan</dt><dd class="tot num">' + eur(billing.amount) + "</dd>";
  h += '<dt class="muted">Includes VAT ' + q.vatRate + '%</dt><dd class="muted num">' + eur(billing ? r2(billing.amount - billing.amount / (1 + q.vatRate / 100)) : q.vat) + "</dd></dl>";
  return h;
}
function timelineList(o) {
  var t = o.timeline || {}, keys = ["requested"].concat(FLOW).concat(["issue", "cancelled"]);
  return '<ol class="tl">' + keys.filter(function (k) { return t[k]; }).sort(function (a, b) { return t[a] - t[b]; }).map(function (k) { return '<li class="' + (k === o.status ? "now" : "") + '"><b>' + esc(STATUS[k]) + "</b><time>" + when(t[k]) + "</time></li>"; }).join("") + "</ol>";
}
function legs(o) {
  return '<div class="legs"><div class="leg"><i></i><span><b>' + esc(o.pickup.street || o.pickup.area) + "</b><small>" + esc(o.pickup.area) + (o.pickup.notes ? " · " + esc(o.pickup.notes) : "") + "</small></span></div>" +
    '<div class="leg drop"><i></i><span><b>' + esc(o.dropoff.street || o.dropoff.area) + "</b><small>" + esc(o.dropoff.area) + (o.dropoff.notes ? " · " + esc(o.dropoff.notes) : "") + "</small></span></div></div>";
}
function itemSummary(o) {
  var it = o.item || {}, c = o.cls || {};
  return esc(cLabel(c.category)) + (it.desc ? " · " + esc(it.desc) : "") + (num(it.qty, 1) > 1 ? " · " + it.qty + " items" : "") + (c.l ? " · " + c.l + "×" + c.w + "×" + c.h + " cm" : "") + (c.kg ? " · " + c.kg + " kg" + (c.kgEstimated ? " (est.)" : "") : "");
}
function emptyState(title, body, btn) { return '<div class="empty"><b>' + title + "</b><span>" + body + "</span>" + (btn || "") + "</div>"; }
function modalShell(title, body, foot) {
  return '<div class="modal-bg" data-act="modal-close"><div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '" data-stop="1"><div class="modal-h"><h3>' + esc(title) + '</h3><button class="btn ghost sm" data-act="modal-close" aria-label="Close">Close</button></div><div class="modal-b">' + body + "</div>" + (foot ? '<div class="modal-f">' + foot + "</div>" : "") + "</div></div>";
}
function invoiceModal(inv) {
  return modalShell("Invoice " + inv.number,
    '<div class="card"><div class="row between"><b>' + esc(inv.kind === "subscription" ? "Subscription" : "Delivery " + (inv.orderId || "")) + "</b>" + '<span class="chip ' + (inv.status === "paid" ? "s-ok" : inv.status === "refunded" ? "s-pur" : "s-warn") + '">' + esc(inv.status) + "</span></div>" +
    '<span class="muted">Issued ' + dmy(inv.issuedAt) + (inv.paidAt ? " · Paid " + dmy(inv.paidAt) : "") + "</span>" +
    (inv.ref ? "<span>" + esc(inv.ref.from) + " → " + esc(inv.ref.to) + "</span>" : "") +
    '<dl class="kv">' + (inv.lines || []).map(function (l) { return "<dt>" + esc(l.label) + '</dt><dd class="num">' + eur(l.amount) + "</dd>"; }).join("") +
    '<dt class="muted">Net</dt><dd class="muted num">' + eur(inv.net) + '</dd><dt class="muted">VAT ' + inv.vatRate + '%</dt><dd class="muted num">' + eur(inv.vat) + '</dd><dt class="tot">Total</dt><dd class="tot num">' + eur(inv.total) + "</dd>" + (inv.creditUsed ? '<dt class="muted">Paid with DART credit</dt><dd class="muted num">' + eur(inv.creditUsed) + "</dd>" : "") + "</dl>" +
    '<span class="muted">Billed to ' + esc(inv.party && inv.party.name) + "</span></div>",
    '<button class="btn" data-act="inv-download" data-v="' + esc(inv.id) + '">Download invoice</button>');
}
var Caps = { downloads: null, sample: null, sampleImages: false };
function downloadInvoice(inv) {
  var html = translateHTML(invoiceHTML(inv));
  if (!Caps.downloads) { toast("Downloads aren't available in this view."); return; }
  Caps.downloads.save({ filename: inv.number + ".html", data: html }).then(function () { toast("Invoice saved"); }, function (e) { if (e && e.code !== "declined") toast("The invoice couldn't be saved here."); });
}

// ---------- Chat (messenger) ----------
var Chat = { orderId: null, msgs: [], un: null, draftPhoto: null };
function openChat(orderId) {
  if (Chat.orderId === orderId) return;
  closeChat(); Chat.orderId = orderId; Chat.msgs = [];
  Chat.un = Store.watch("orders/" + orderId + "/messages", function (rows) { rows.sort(function (a, b) { return a.at - b.at; }); Chat.msgs = rows; markRead(orderId); render(); scrollChat(); });
}
function closeChat() { if (Chat.un) Chat.un(); Chat.un = null; Chat.orderId = null; Chat.msgs = []; Chat.draftPhoto = null; }
function markRead(orderId) { S.me.read[orderId] = Date.now(); saveMe(); }
function unread(o, role) { return o.lastMsg && o.lastMsg.from !== role && o.lastMsg.at > (S.me.read[o.id] || 0) ? 1 : 0; }
function scrollChat() { setTimeout(function () { var el = document.querySelector(".chat-log"); if (el) el.scrollTop = el.scrollHeight; }, 0); }
function chatView(o, role, name) {
  var other = role === "customer" ? (o.courier ? o.courier.name : "your courier") : (o.customer ? o.customer.name : "the customer");
  var canSend = role === "admin" || (o.courier && o.status !== "cancelled");
  var h = '<div class="chat"><div class="chat-log" aria-live="polite">';
  if (!Chat.msgs.length) h += '<div class="empty"><b>No messages yet</b><span>' + (role === "admin" ? "Nothing has been said in this delivery yet." : "Messages here go only to " + esc(other) + ". Use them for buzzer codes, access, delays or handling.") + "</span></div>";
  h += Chat.msgs.map(function (m) {
    var mine = m.from === role, img = safeImg(m.photo);
    return '<div class="msg ' + (mine ? "mine" : "") + (m.from === "admin" ? " sys" : "") + '"><small>' + esc(m.from === "admin" ? "DART support" : m.name) + " · " + hhmm(m.at) + "</small>" + (m.text ? "<p>" + esc(m.text) + "</p>" : "") + (img ? '<img src="' + img + '" alt="Photo in chat">' : "") + "</div>";
  }).join("");
  h += "</div>";
  if (canSend) h += '<form class="chat-in" data-form="chat" data-role="' + role + '" data-name="' + esc(name) + '">' + (Chat.draftPhoto ? '<img class="chat-prev" src="' + safeImg(Chat.draftPhoto) + '" alt="Photo to send">' : "") +
    '<label class="btn ghost sm file-mini" aria-label="Add a photo">Photo<input type="file" accept="image/*" data-file="chat"></label><input class="input" id="chat-text" name="t" autocomplete="off" placeholder="Message ' + esc(other) + '"><button class="btn sm">Send</button></form>';
  else h += '<p class="muted pad-s">Chat opens when a courier is assigned.</p>';
  return h + "</div>";
}
function sendChat(form) {
  var role = form.dataset.role, name = form.dataset.name, text = clip(new FormData(form).get("t"), 600), photo = Chat.draftPhoto;
  if (!text && !photo || !Chat.orderId) return;
  var id = Date.now().toString(36) + rid(4), now = Date.now(), oid = Chat.orderId;
  var msg = { from: role, name: name, text: text, at: now }; if (photo) msg.photo = photo;
  form.reset(); Chat.draftPhoto = null;
  Store.set("orders/" + oid + "/messages", id, msg).then(function () { return Store.update("orders", oid, { lastMsg: { from: role, at: now, text: text ? text.slice(0, 80) : "Photo" } }); }).catch(fail);
}
