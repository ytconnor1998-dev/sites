// Balance simulator: plays a run second by second like an attentive player
// and reports when they could afford each finder, find, and The Thing.
// Usage: npm run sim   (optional: node tools/sim.js <clicksPerSec> <bonusMult>)
require('../src/data.js');
const LC = globalThis.LC;

const PIG_AVG_MULT = 1.3; // average piggy payout multiplier across pig types

function run({ cps = 2.5, bonus = 1.35, end = 6 * 3600, quiet = false } = {}) {
const CPS = cps, BONUS = bonus, END = end;
const S = { money: 0, lifetime: 0, gens: {}, ups: new Set(), tools: {}, depth: 0, finds: new Set() };
const has = (id) => S.ups.has(id);
const sumUp = (kind, f = (t, u) => t + u.value, init = 0) => LC.UPGRADES.filter((u) => u.kind === kind && has(u.id)).reduce(f, init);
const genMult = (g) => LC.GEN_UP_TIERS.reduce((m, t, i) => m * (has(`${g.id}_${i}`) ? 2 : 1), 1);
function globalMult() {
  let m = 1 + sumUp('global');
  for (const f of LC.DIG_FINDS) if (S.finds.has(f.name) && f.reward.mult) m += f.reward.mult;
  return m + 0.1 + 0.05; // goose friend + Derek, usually picked up early
}
const baseIncome = () => LC.GENERATORS.reduce((t, g) => t + (S.gens[g.id] || 0) * g.income * genMult(g), 0) * globalMult();
const clickMult = () => sumUp('click', (m, u) => m * u.value, 1);
const clickPct = () => sumUp('clickPct');
const clickIncome = () => CPS * (0.03 * clickMult() + baseIncome() * clickPct());
const pigIncome = () => (0.02 + baseIncome() * 0.3) * sumUp('piggyFill', (m, u) => m * u.value, 1) * PIG_AVG_MULT;
const income = () => baseIncome() * BONUS + clickIncome() + pigIncome();

const digMult = () => LC.DIG_FINDS.reduce((m, f) => m * (S.finds.has(f.name) && f.reward.dig ? f.reward.dig : 1), 1);
const digRate = () => LC.DIG_TOOLS.reduce((t, d) => t + (S.tools[d.id] || 0) * d.rate, 0) * digMult();

const genCost = (g) => g.cost * Math.pow(LC.COST_GROWTH, S.gens[g.id] || 0);
const toolCost = (t) => t.cost * Math.pow(1.17, S.tools[t.id] || 0);
const GEN_UPS = LC.GENERATORS.flatMap((g) => LC.GEN_UP_TIERS.map((t, i) => ({ id: `${g.id}_${i}`, gen: g.id, at: t.at, cost: g.cost * t.mult })));

function gainOf(apply) { // income change from a purchase, by trying it
  const before = income();
  const undo = apply();
  const after = income();
  undo();
  return after - before;
}
function options() {
  const opts = [];
  for (const g of LC.GENERATORS) opts.push({ label: g.name, cost: genCost(g), gain: gainOf(() => { S.gens[g.id] = (S.gens[g.id] || 0) + 1; return () => S.gens[g.id]--; }), buy: () => { S.gens[g.id] = (S.gens[g.id] || 0) + 1; } });
  for (const u of [...GEN_UPS, ...LC.UPGRADES]) {
    if (has(u.id) || (u.gen && (S.gens[u.gen] || 0) < u.at)) continue;
    let gain = gainOf(() => { S.ups.add(u.id); return () => S.ups.delete(u.id); });
    if (['piggyCap', 'piggyHits', 'luck', 'stock'].includes(u.kind)) gain = income() * 0.03; // small, hard-to-measure boosts
    opts.push({ label: u.name || u.id, cost: u.cost, gain, buy: () => S.ups.add(u.id) });
  }
  return opts;
}

const milestones = [];
const seen = new Set();
const unlocks = {};
let thingAt = null;
const log = (t, what) => milestones.push(`${fmtTime(t)}  ${what}`);
function fmtTime(t) { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60); return `${h}h${String(m).padStart(2, '0')}m`; }
function fmt(n) { const s = ['', 'k', 'm', 'bn', 'tn']; const i = Math.min(4, Math.floor(Math.log10(Math.max(1, n)) / 3)); return '£' + (n / Math.pow(1000, i)).toFixed(1) + s[i]; }

let t = 0;
for (; t < END; t++) {
  const inc = income();
  S.money += inc; S.lifetime += inc;
  // digging: a few clicks a minute plus diggers
  S.depth = Math.min(LC.EARTH_DIAMETER, S.depth + digRate() + 0.05 * 0.2 * digMult());
  for (const f of LC.DIG_FINDS) {
    if (S.depth >= f.at && !S.finds.has(f.name)) {
      S.finds.add(f.name);
      if (f.reward.cash) S.money += baseIncome() * f.reward.cash;
      log(t, `dug up ${f.name}`);
    }
  }
  if (S.money >= LC.THING_COST) { thingAt = t; log(t, `*** can buy The Thing (${fmt(LC.THING_COST)}) ***`); break; }

  // spend: best payback first, a few purchases per second at most
  for (let k = 0; k < 5; k++) {
    const opts = options().filter((o) => o.gain > 0);
    if (!opts.length) break;
    const cur = income();
    opts.forEach((o) => (o.score = Math.max(0, o.cost - S.money) / cur + o.cost / o.gain));
    opts.sort((a, b) => a.score - b.score);
    const best = opts[0];
    if (best.cost > S.money) break;
    S.money -= best.cost;
    best.buy();
    if (!seen.has(best.label) && LC.GENERATORS.some((g) => g.name === best.label)) { seen.add(best.label); unlocks[best.label] = t; log(t, `first ${best.label}  (income ${fmt(income())}/s)`); }
  }
  // dig tools: keep about 4% of spending going into the hole
  for (const d of LC.DIG_TOOLS) if (toolCost(d) < S.money * 0.04) { S.money -= toolCost(d); S.tools[d.id] = (S.tools[d.id] || 0) + 1; }
  if (t % 1800 === 0 && t) log(t, `-- money ${fmt(S.money)}, income ${fmt(income())}/s, depth ${(S.depth / 1000).toFixed(1)} km`);
}
if (!quiet) {
  console.log(milestones.join('\n'));
  if (t >= END) console.log(`Did not reach The Thing in ${END / 3600}h. Final income ${fmt(income())}/s`);
  console.log(`\nfinders owned: ${LC.GENERATORS.map((g) => `${g.id}:${S.gens[g.id] || 0}`).join(' ')}`);
  console.log(`upgrades bought: ${S.ups.size}, depth ${(S.depth / 1000).toFixed(1)} km`);
}
return { thingAt, unlocks, money: S.money, lifetime: S.lifetime };
}
module.exports = { run };
if (require.main === module) run({ cps: +(process.argv[2] || 2.5), bonus: +(process.argv[3] || 1.35) });
