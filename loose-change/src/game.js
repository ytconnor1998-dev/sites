// Loose Change — game logic and UI.
(() => {
  const LC = globalThis.LC;
  const SAVE_KEY = 'loose-change-save-v1';
  const TICK_MS = 100;
  const OFFLINE_CAP = 8 * 3600;
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // ---------- helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  function weighted(pairs) {
    const total = pairs.reduce((t, [, w]) => t + Math.max(0, w), 0);
    let r = Math.random() * total;
    for (const [k, w] of pairs) { r -= Math.max(0, w); if (r <= 0) return k; }
    return pairs[pairs.length - 1][0];
  }

  // Twemoji file name for an emoji: codepoints in hex, FE0F dropped unless it's a ZWJ sequence.
  function emojiFile(emoji) {
    const cps = [...emoji].map((c) => c.codePointAt(0));
    const list = cps.includes(0x200d) ? cps : cps.filter((c) => c !== 0xfe0f);
    return list.map((c) => c.toString(16)).join('-');
  }
  const ic = (emoji, cls = '') =>
    `<img class="ic ${cls}" src="assets/icons/${emojiFile(emoji)}.svg" alt="${emoji}" draggable="false">`;
  LC.ic = ic;

  const SUFFIX = ['', 'k', 'm', 'bn', 'tn', 'qd', 'qn', 'sx', 'sp', 'oc', 'no', 'dc'];
  function fmt(n) {
    if (!isFinite(n)) return '£∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1) return Math.floor(n * 100) + 'p';
    if (n < 1000) return '£' + (n < 100 ? n.toFixed(2) : Math.floor(n).toString());
    const tier = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(n) / 3));
    const v = n / Math.pow(1000, tier);
    return '£' + (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)) + SUFFIX[tier];
  }
  const fmtRate = (n) => (n < 1 && n > 0 ? (n * 100).toFixed(n < 0.1 ? 2 : 1) + 'p' : fmt(n)) + '/s';
  function fmtDepth(m) {
    if (m < 1000) return m.toFixed(m < 10 ? 2 : 1) + ' m';
    return (m / 1000).toLocaleString('en-GB', { maximumFractionDigits: m < 1e5 ? 2 : 0 }) + ' km';
  }
  const fmtInt = (n) => Math.floor(n).toLocaleString('en-GB');
  LC.fmt = fmt;

  // ---------- state ----------
  function freshRun(keep = {}) {
    return {
      v: 1,
      money: 0, lifetime: 0, gens: {}, upgrades: [], digTools: {},
      depth: 0, finds: [], buttons: 0, socks: 0, frogs: 0,
      pig: null, cardStock: 3, cardRestockAt: 0,
      goose: { met: false, friend: false },
      buffs: [], flags: {},
      stats: { clicks: 0, pigs: 0, cards: 0, golden: 0, events: 0, sofaFinds: 0 },
      startedAt: Date.now(), lastSave: Date.now(),
      // carried across runs
      endings: keep.endings || [], achievements: keep.achievements || [], runs: keep.runs || 0,
      allTime: keep.allTime || 0, settings: keep.settings || { sfx: true, music: true, volume: 0.6 },
    };
  }
  let S = freshRun();
  LC.state = () => S;

  function save() {
    S.lastSave = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  }
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* ignore */ }
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      S = Object.assign(freshRun(data), data);
      S.stats = Object.assign(freshRun().stats, data.stats);
      S.goose = Object.assign({ met: false, friend: false }, data.goose);
      S.buffs = []; // buffs don't survive a reload
      return true;
    } catch (e) { return false; }
  }

  // ---------- derived numbers ----------
  const has = (id) => S.upgrades.includes(id);
  const upgradesOf = (kind) => LC.UPGRADES.filter((u) => u.kind === kind && has(u.id));
  const buffMult = (key) => S.buffs.reduce((m, b) => m * (b[key] ?? 1), 1);

  function genMult(g) {
    let m = 1;
    LC.GEN_UP_TIERS.forEach((t, i) => { if (has(`${g.id}_${i}`)) m *= 2; });
    return m;
  }
  function karmaMult() { return 1 + 0.25 * S.endings.length + 0.05 * S.runs; }
  function globalMult() {
    let m = 1 + upgradesOf('global').reduce((t, u) => t + u.value, 0);
    for (const f of S.finds) { const d = LC.DIG_FINDS.find((x) => x.name === f); if (d && d.reward.mult) m += d.reward.mult; }
    m += S.socks * 0.01;
    if (S.flags.derek) m += 0.05;
    if (S.goose.friend) m += 0.1;
    return m * karmaMult();
  }
  function genIncome(g) { return (S.gens[g.id] || 0) * g.income * genMult(g); }
  function baseIncome() { return LC.GENERATORS.reduce((t, g) => t + genIncome(g), 0) * globalMult(); }
  function income() { return baseIncome() * buffMult('income'); }
  function clickValue() {
    const mult = upgradesOf('click').reduce((m, u) => m * u.value, 1) * karmaMult();
    const pct = upgradesOf('clickPct').reduce((t, u) => t + u.value, 0);
    return ((0.01 + Math.random() * 0.04) * mult + baseIncome() * pct) * buffMult('click');
  }
  const costMult = () => buffMult('cost');
  function genCost(g, n = 1) {
    const r = LC.COST_GROWTH, owned = S.gens[g.id] || 0;
    return g.cost * Math.pow(r, owned) * (Math.pow(r, n) - 1) / (r - 1) * costMult();
  }
  function maxAffordable(g) {
    const r = LC.COST_GROWTH, owned = S.gens[g.id] || 0;
    const c0 = g.cost * Math.pow(r, owned) * costMult();
    return Math.max(0, Math.floor(Math.log(S.money * (r - 1) / c0 + 1) / Math.log(r)));
  }
  function genUpgradeList() {
    const out = [];
    for (const g of LC.GENERATORS) {
      LC.GEN_UP_TIERS.forEach((t, i) => {
        out.push({ id: `${g.id}_${i}`, icon: g.icon, name: g.ups[i], cost: g.cost * t.mult, gen: g.id, at: t.at,
          desc: `${g.name}s are twice as good. (Needs ${t.at} owned.)` });
      });
    }
    return out;
  }
  const GEN_UPS = genUpgradeList();
  const ALL_UPS = [...GEN_UPS, ...LC.UPGRADES];
  const upCost = (u) => u.cost * costMult();

  function digToolCost(t) { return t.cost * Math.pow(1.17, S.digTools[t.id] || 0) * costMult(); }
  function digMult() {
    let m = 1;
    for (const f of S.finds) { const d = LC.DIG_FINDS.find((x) => x.name === f); if (d && d.reward.dig) m *= d.reward.dig; }
    return m * buffMult('dig');
  }
  const digRate = () => LC.DIG_TOOLS.reduce((t, d) => t + (S.digTools[d.id] || 0) * d.rate, 0) * digMult();
  const digClick = () => (0.05 + LC.DIG_TOOLS.reduce((t, d) => t + (S.digTools[d.id] || 0) * d.click, 0) + digRate() * 0.05) * digMult();

  const pigCap = () => Math.max(1, baseIncome() * 180) * upgradesOf('piggyCap').reduce((m, u) => m * u.value, 1);
  const pigFill = () => (0.02 + baseIncome() * 0.3) * upgradesOf('piggyFill').reduce((m, u) => m * u.value, 1);
  const pigHitsMult = () => upgradesOf('piggyHits').reduce((m, u) => m * u.value, 1);

  const luck = () => upgradesOf('luck').reduce((t, u) => t + u.value, 0);
  const maxStock = () => 3 + upgradesOf('stock').reduce((t, u) => t + u.value, 0);
  const cardCost = (c) => Math.max(c.min, baseIncome() * c.secs) * costMult();

  // ---------- gaining money ----------
  function gain(n) { if (n <= 0) return; S.money += n; S.lifetime += n; S.allTime += n; }
  function spend(n) { if (S.money + 1e-9 < n) return false; S.money = Math.max(0, S.money - n); return true; }
  const lump = (secs, min = 0.5) => Math.max(min, baseIncome() * secs);

  // ---------- buffs ----------
  function addBuff(b) {
    S.buffs = S.buffs.filter((x) => x.id !== b.id);
    S.buffs.push({ ...b, until: Date.now() + b.secs * 1000, total: b.secs });
    renderBuffs();
  }

  // ---------- UI: toasts, floaters, log ----------
  function toast(html, cls = '') {
    const t = el('div', 'toast ' + cls, html);
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 4200);
    setTimeout(() => t.remove(), 4800);
  }
  function floater(x, y, text, cls = '') {
    const f = el('div', 'floater ' + cls, text);
    f.style.left = x + 'px'; f.style.top = y + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }
  function coinBurst(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      const c = el('div', 'burst', ic('🪙'));
      c.style.left = x + 'px'; c.style.top = y + 'px';
      c.style.setProperty('--dx', rand(-80, 80) + 'px');
      c.style.setProperty('--dy', rand(-110, -40) + 'px');
      c.style.setProperty('--rot', rand(-360, 360) + 'deg');
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 900);
    }
  }
  function sofaLog(html) {
    const log = $('#sofa-log');
    const li = el('li', '', html);
    log.prepend(li);
    while (log.children.length > 5) log.lastChild.remove();
  }

  // ---------- modal (events, endings, offline) ----------
  let modalOpen = false;
  function modal({ icon, title, text, choices = [{ label: 'OK' }], cls = '' }) {
    modalOpen = true;
    const box = $('#modal');
    box.className = 'modal-card ' + cls;
    box.innerHTML = `<div class="modal-icon">${icon ? ic(icon) : ''}</div><h2>${title}</h2><p>${text}</p><div class="modal-choices"></div>`;
    const row = box.querySelector('.modal-choices');
    choices.forEach((c) => {
      const b = el('button', 'btn ' + (c.cls || ''), c.label);
      b.onclick = () => {
        LC.audio.sfx('click');
        const result = c.fn ? c.fn() : null;
        if (result) { // show outcome in the same card
          box.querySelector('p').innerHTML = result.text || result;
          if (result.icon) box.querySelector('.modal-icon').innerHTML = ic(result.icon);
          row.innerHTML = '';
          const ok = el('button', 'btn', 'OK');
          ok.onclick = closeModal; row.appendChild(ok); ok.focus();
        } else closeModal();
      };
      row.appendChild(b);
    });
    $('#overlay').classList.add('show');
    row.querySelector('button')?.focus();
  }
  function closeModal() { $('#overlay').classList.remove('show'); modalOpen = false; }

  // ---------- achievements ----------
  function checkAchievements() {
    for (const a of LC.ACHIEVEMENTS) {
      if (S.achievements.includes(a.id)) continue;
      if (a.test(S)) {
        S.achievements.push(a.id);
        toast(`${ic('🏆')}<div><b>Achievement:</b> ${a.name}<br><small>${a.desc}</small></div>`, 'ach');
        LC.audio.sfx('ding');
        try { globalThis.steam?.unlock(a.id); } catch (e) { /* not on Steam */ }
      }
    }
  }

  // ---------- sofa clicking ----------
  function clickSofa(ev) {
    LC.audio.unlock();
    const v = clickValue();
    gain(v);
    S.stats.clicks++;
    const r = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX || r.left + r.width / 2, y = ev.clientY || r.top + r.height / 2;
    floater(x, y - 20, '+' + fmt(v));
    coinBurst(x, y, 2);
    LC.audio.sfx('coin');
    ev.currentTarget.classList.remove('squish'); void ev.currentTarget.offsetWidth; ev.currentTarget.classList.add('squish');
    if (chance(0.04)) sofaFind();
  }
  function sofaFind() {
    const f = pick(LC.SOFA_FINDS);
    S.stats.sofaFinds++;
    let reward = '';
    if (f.cash) { const n = lump(f.cash, f.cash / 100); gain(n); reward = ` <b>+${fmt(n)}</b>`; }
    if (f.flat) { gain(f.flat); reward = ` <b>+${fmt(f.flat)}</b>`; }
    if (f.buttons) { S.buttons += f.buttons; reward = ` <b>+${f.buttons} ${ic('🔘')}</b>`; }
    sofaLog(`You found ${f.text}${reward}`);
  }

  // ---------- buying ----------
  let buyAmount = 1;
  function buyGen(g) {
    LC.audio.unlock();
    let n = buyAmount === 'max' ? maxAffordable(g) : buyAmount;
    if (n < 1) n = 1;
    const cost = genCost(g, n);
    if (!spend(cost)) { LC.audio.sfx('nope'); return; }
    S.gens[g.id] = (S.gens[g.id] || 0) + n;
    LC.audio.sfx('buy');
    renderShop(true);
  }
  function buyUpgrade(u) {
    if (has(u.id) || !spend(upCost(u))) { LC.audio.sfx('nope'); return; }
    S.upgrades.push(u.id);
    LC.audio.sfx('buy');
    toast(`${ic(u.icon)}<div><b>${u.name}</b><br><small>${u.desc}</small></div>`);
    hideTip();
    renderShop(true);
  }

  // ---------- garden ----------
  function digOnce(ev) {
    LC.audio.unlock();
    addDepth(digClick());
    LC.audio.sfx('dig');
    const r = ev.currentTarget.getBoundingClientRect();
    floater(ev.clientX || r.left + r.width / 2, (ev.clientY || r.top) - 20, '+' + fmtDepth(digClick()), 'dirt');
    if (chance(0.03)) { const n = lump(20, 0.2); gain(n); toast(`${ic('🪙')}<div>Your spade hit a coin. <b>+${fmt(n)}</b></div>`); }
  }
  function addDepth(m) {
    if (S.depth >= LC.EARTH_DIAMETER) return;
    S.depth = Math.min(LC.EARTH_DIAMETER, S.depth + m);
    for (const f of LC.DIG_FINDS) {
      if (S.depth >= f.at && !S.finds.includes(f.name)) {
        const r = f.reward;
        if (r.ending) { australiaReady(); continue; }
        S.finds.push(f.name);
        let what = '';
        if (r.cash) { const n = lump(r.cash, 0.5); gain(n); what = `+${fmt(n)}`; }
        if (r.mult) what = `All income +${Math.round(r.mult * 100)}%`;
        if (r.dig) what = `Dig speed x${r.dig}`;
        if (r.buttons) { S.buttons += r.buttons; what = `+${r.buttons} buttons`; }
        LC.audio.sfx('ding');
        toast(`${ic(f.icon)}<div><b>Dug up: ${f.name}</b><br><small>${f.text} ${what}</small></div>`, 'find');
        gardenDirty = true;
      }
    }
  }
  function buyDigTool(t) {
    if (!spend(digToolCost(t))) { LC.audio.sfx('nope'); return; }
    S.digTools[t.id] = (S.digTools[t.id] || 0) + 1;
    LC.audio.sfx('buy');
  }
  let australiaOffered = false;
  function australiaReady() {
    if (australiaOffered) return;
    australiaOffered = true;
    queueEvent(() => modal({ icon: '🦘', title: 'There is light at the bottom of the hole',
      text: 'You can hear birds. Strange birds. Someone is shouting "mate".',
      choices: [
        { label: 'Climb through', fn: () => { closeModal(); playEnding('australia'); } },
        { label: 'Not yet', cls: 'ghost', fn: () => { S.depth = LC.EARTH_DIAMETER - 1; setTimeout(() => (australiaOffered = false), 60000); return { text: 'You put a bin lid over the hole. For now.' }; } },
      ] }));
  }

  // ---------- piggy bank ----------
  function newPig(nestLevel = 0, carried = 0) {
    const type = nestLevel > 0 ? LC.PIGS.find((p) => p.id === 'nesting') : LC.PIGS.find((p) => p.id === weighted(LC.PIGS.map((p) => [p.id, p.weight])));
    S.pig = { type: type.id, stored: carried, hits: 0, nest: nestLevel };
    renderPig(true);
  }
  function pigType() { return LC.PIGS.find((p) => p.id === S.pig.type); }
  function pigHitsNeeded() { const t = pigType(); return Math.max(2, Math.ceil(t.hits * pigHitsMult() * (S.pig.nest ? 0.7 : 1))); }
  let pigBusy = false;
  function hitPig(ev) {
    LC.audio.unlock();
    if (pigBusy || !S.pig) return;
    const t = pigType();
    const pigEl = $('#pig');
    if (t.real) {
      pigBusy = true;
      S.flags.realPig = true;
      LC.audio.sfx('oink');
      pigEl.classList.add('runaway');
      $('#pig-name').textContent = 'It was a real pig.';
      $('#pig-text').textContent = 'It has left. It took nothing, but it judged you.';
      setTimeout(() => { pigBusy = false; newPig(); }, 2500);
      return;
    }
    S.pig.hits++;
    LC.audio.sfx('tap');
    pigEl.classList.remove('shake'); void pigEl.offsetWidth; pigEl.classList.add('shake');
    if (t.id === 'kevin' && chance(0.12)) floater(ev.clientX, ev.clientY - 30, pick(['Oi!', 'Rude.', 'Kevin remembers.', 'Not the face!']), 'speech');
    if (S.pig.hits >= pigHitsNeeded()) smashPig(ev);
    else renderPig();
  }
  function smashPig(ev) {
    const t = pigType();
    const payout = S.pig.stored * t.mult;
    gain(payout);
    S.stats.pigs++;
    LC.audio.sfx('smash');
    const r = $('#pig').getBoundingClientRect();
    coinBurst(r.left + r.width / 2, r.top + r.height / 2, 14);
    floater(r.left + r.width / 2, r.top, '+' + fmt(payout), 'big');
    pigBusy = true;
    $('#pig').classList.add('smashed');
    const nestMax = LC.PIGS.find((p) => p.id === 'nesting').nest;
    setTimeout(() => {
      pigBusy = false;
      if (t.id === 'nesting' && S.pig.nest < nestMax) { toast(`${ic('🪆')}<div>There was another pig inside!</div>`); newPig(S.pig.nest + 1, S.pig.stored * 0.8); }
      else newPig();
    }, 900);
  }

  // ---------- scratch cards ----------
  let card = null;
  function buyCard(c) {
    LC.audio.unlock();
    if (card && !card.done) return;
    if (S.cardStock < 1) { toast(`${ic('🏪')}<div>The corner shop has sold out. Back soon.</div>`); return; }
    const cost = cardCost(c);
    if (!spend(cost)) { LC.audio.sfx('nope'); return; }
    S.cardStock--;
    if (!S.cardRestockAt) S.cardRestockAt = Date.now() + LC.CARD_RESTOCK_SECS * 1000;
    const odds = Object.entries(c.odds).map(([k, w]) => [k, k === 'lose' ? Math.max(5, w - 6 * luck()) : w]);
    const outcome = weighted(odds);
    card = { def: c, cost, outcome, grid: layoutCard(outcome), done: false };
    renderCard();
  }
  function layoutCard(outcome) {
    const keys = Object.keys(LC.SCRATCH_SYMBOLS);
    const counts = {};
    const grid = [];
    if (outcome !== 'lose') { for (let i = 0; i < 3; i++) grid.push(outcome); counts[outcome] = 3; }
    while (grid.length < 9) {
      const k = pick(keys);
      if (k === outcome || (counts[k] || 0) >= 2) continue;
      counts[k] = (counts[k] || 0) + 1;
      grid.push(k);
    }
    return grid.sort(() => Math.random() - 0.5);
  }
  function resolveCard() {
    if (!card || card.done) return;
    card.done = true;
    S.stats.cards++;
    const sym = LC.SCRATCH_SYMBOLS[card.outcome];
    const res = $('#card-result');
    let msg;
    if (card.outcome === 'lose') { msg = pick(['No match. The frog on the back is laughing at you.', 'Nothing. So close. (Not close.)', 'No win. The corner shop owner buys another boat.']); LC.audio.sfx('nope'); }
    else if (sym.mult) {
      const n = card.cost * sym.mult;
      gain(n);
      msg = `Three ${ic(sym.icon)}! You win <b>${fmt(n)}</b>!`;
      if (card.outcome === 'gem') { S.flags.jackpot = true; LC.audio.sfx('fanfare'); coinRain(14); } else LC.audio.sfx('win');
    } else if (sym.special === 'goose') {
      LC.audio.sfx('honk');
      if (!S.goose.met) { S.goose.met = true; S.goose.friend = true; msg = `You won <b>a goose</b>. A real one. It seems to like you. (All income +10%)`; }
      else { const n = lump(300); gain(n); msg = `You won another goose. Your goose eats it, and coughs up <b>${fmt(n)}</b>.`; }
    } else if (sym.special === 'buttons') { S.buttons += 25; msg = `A "lifetime supply" of buttons! It's 25 buttons. ${ic('🔘')}`; LC.audio.sfx('win'); }
    else if (sym.special === 'sock') { S.socks++; msg = `You won one sock. It's warm. It feels lucky. (All income +1%)`; LC.audio.sfx('win'); }
    else { S.frogs++; msg = `You won... a frog. It's not a prize, it just got on the card. It's yours now. (Frogs: ${S.frogs})`; LC.audio.sfx('ribbit'); }
    res.innerHTML = msg;
    res.classList.add('show');
    $('#card-canvas').classList.add('cleared');
  }
  function renderCard() {
    const wrap = $('#card-area');
    if (!card) { wrap.innerHTML = `<div class="card-empty">${ic('🎟️', 'huge')}<p>Buy a card from the corner shop, then scratch it with your mouse.</p></div>`; return; }
    wrap.innerHTML = `
      <div class="scratch-card" style="--cc:${card.def.colour}">
        <div class="card-head">${card.def.name}<span>${fmt(card.cost)}</span></div>
        <div class="card-grid">${card.grid.map((k) => `<div class="cell">${ic(LC.SCRATCH_SYMBOLS[k].icon)}<small>${LC.SCRATCH_SYMBOLS[k].label}</small></div>`).join('')}</div>
        <canvas id="card-canvas"></canvas>
        <div class="card-foot">MATCH 3 TO WIN</div>
      </div>
      <div class="card-actions"><button class="btn ghost small" id="scratch-all">${ic('🪙')} Scratch it all</button></div>
      <div id="card-result" class="card-result"></div>`;
    $('#scratch-all').onclick = () => { $('#card-canvas').classList.add('cleared'); resolveCard(); };
    setupScratch();
  }
  function setupScratch() {
    const cv = $('#card-canvas');
    const grid = cv.parentElement.querySelector('.card-grid');
    const w = grid.offsetWidth, h = grid.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.style.top = grid.offsetTop + 'px'; cv.style.left = grid.offsetLeft + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#c9c9c9'); grad.addColorStop(0.5, '#efefef'); grad.addColorStop(1, '#b5b5b5');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 0; i < 260; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    ctx.fillStyle = '#8a8a8a'; ctx.font = '700 15px Fredoka, sans-serif'; ctx.textAlign = 'center';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillText('SCRATCH', (c + 0.5) * w / 3, (r + 0.5) * h / 3 + 5);
    ctx.globalCompositeOperation = 'destination-out';
    let down = false, last = null, moves = 0;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const scrape = (e) => {
      if (!down || card.done) return;
      const [x, y] = pos(e);
      ctx.lineWidth = 34; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(...(last || [x, y])); ctx.lineTo(x, y); ctx.stroke();
      last = [x, y];
      if (++moves % 6 === 0) { LC.audio.sfx('scratch'); if (clearedFraction(ctx, cv) > 0.6) resolveCard(); }
    };
    cv.onpointerdown = (e) => { LC.audio.unlock(); down = true; last = null; cv.setPointerCapture(e.pointerId); scrape(e); };
    cv.onpointermove = scrape;
    cv.onpointerup = cv.onpointercancel = () => { down = false; last = null; };
  }
  function clearedFraction(ctx, cv) {
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let clear = 0, n = 0;
    for (let i = 3; i < d.length; i += 4 * 37) { n++; if (d[i] === 0) clear++; }
    return clear / n;
  }

  // ---------- golden coin & coin rain ----------
  function spawnGolden() {
    const g = el('button', 'golden', ic('🪙'));
    g.setAttribute('aria-label', 'Golden coin');
    const fromLeft = chance(0.5);
    const y0 = rand(15, 70);
    g.style.top = y0 + 'vh';
    g.style.left = fromLeft ? '-80px' : 'calc(100vw + 10px)';
    document.body.appendChild(g);
    const start = performance.now(), dur = 13000;
    let alive = true;
    const step = (t) => {
      if (!alive) return;
      const p = (t - start) / dur;
      if (p >= 1) { g.remove(); return; }
      const x = fromLeft ? -80 + p * (innerWidth + 160) : innerWidth + 10 - p * (innerWidth + 160);
      g.style.left = x + 'px';
      g.style.top = `calc(${y0}vh + ${Math.sin(p * 12) * 40}px)`;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    g.onclick = (e) => {
      alive = false; g.remove();
      S.stats.golden++;
      LC.audio.unlock(); LC.audio.sfx('fanfare');
      coinBurst(e.clientX, e.clientY, 12);
      const roll = Math.random();
      if (roll < 0.45) { const n = lump(300, 25); gain(n); toast(`${ic('🪙')}<div><b>Golden coin!</b> +${fmt(n)}</div>`, 'gold'); }
      else if (roll < 0.75) { addBuff({ id: 'frenzy', icon: '🤑', label: 'Coin Frenzy: income x7', income: 7, secs: 30 }); toast(`${ic('🤑')}<div><b>Coin Frenzy!</b> Income x7 for 30 seconds.</div>`, 'gold'); }
      else if (roll < 0.92) { addBuff({ id: 'fingers', icon: '👆', label: 'Golden Fingers: clicks x77', click: 77, secs: 15 }); toast(`${ic('👆')}<div><b>Golden Fingers!</b> Sofa clicks x77 for 15 seconds. GO GO GO.</div>`, 'gold'); }
      else { coinRain(30); toast(`${ic('🌧️')}<div><b>It's raining coins!</b> Catch them!</div>`, 'gold'); }
    };
  }
  function coinRain(n = 25) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const c = el('button', 'raindrop', ic('🪙'));
        c.style.left = rand(3, 95) + 'vw';
        c.style.animationDuration = rand(2.6, 4.2) + 's';
        c.onpointerdown = (e) => { const v = lump(15, 0.05); gain(v); floater(e.clientX, e.clientY - 10, '+' + fmt(v)); LC.audio.sfx('coin'); c.remove(); };
        c.addEventListener('animationend', () => c.remove());
        $('#rain').appendChild(c);
      }, i * rand(150, 320));
    }
  }

  // ---------- random events ----------
  const pending = [];
  function queueEvent(fn) { pending.push(fn); }
  const EVENTS = [
    { id: 'seagull', w: 10, run: () => modal({ icon: '🐦', title: 'A seagull is eyeing your coins',
      text: 'It has the look of a bird that has done this before.',
      choices: [
        { label: 'Shoo it away', fn: () => { const n = S.money * 0.05; S.money -= n; return { text: `It took ${fmt(n)} on the way out. Classic seagull.` }; } },
        { label: 'Offer it a chip', fn: () => { addBuff({ id: 'seagull', icon: '🍟', label: 'Seagull Ally: income +50%', income: 1.5, secs: 90 }); return { icon: '🍟', text: 'The seagull accepts. It is now on your side. Income +50% for 90 seconds.' }; } },
        { label: 'Fight it', cls: 'danger', fn: () => chance(0.5)
          ? (gain(S.money * 0.25 + 1), { text: 'You win! The seagull drops its stash of stolen coins. +25%!' })
          : (S.money *= 0.85, { text: 'You lose. Badly. It took 15% and your dignity.' }) },
      ] }) },
    { id: 'nan', w: 10, run: () => modal({ icon: '👵', title: "Nan's popped round",
      text: 'She has her handbag. The handbag always has something in it.',
      choices: [
        { label: 'Put the kettle on', fn: () => { const n = lump(120, 5); gain(n); return { text: `She gives you ${fmt(n)} and says you look thin.` }; } },
        { label: 'Hide behind the sofa', fn: () => { const n = lump(60, 1); gain(n); return { text: `While hiding you find ${fmt(n)} and three Werther's Originals. She knew you were there.` }; } },
      ] }) },
    { id: 'goose', w: 9, run: () => {
      if (!S.goose.met) return modal({ icon: '🪿', title: 'A goose has entered the garden',
        text: 'It is staring at you. It has not blinked.',
        choices: [
          { label: 'Befriend it', fn: () => { S.goose.met = true; if (chance(0.7)) { S.goose.friend = true; LC.audio.sfx('honk'); return { text: 'The goose accepts you. You are now goose friends. (All income +10%)' }; } LC.audio.sfx('honk'); return { text: 'The goose bites you and leaves. It will be back.' }; } },
          { label: 'Honk back', fn: () => { S.goose.met = true; LC.audio.sfx('honk'); S.goose.friend = chance(0.4); return { text: S.goose.friend ? 'The goose respects this. You are now goose friends. (All income +10%)' : 'The goose did not like your accent.' }; } },
          { label: 'Run', cls: 'ghost', fn: () => ({ text: 'You run. The goose does not chase you. It simply remembers.' }) },
        ] });
      if (S.goose.friend) { LC.audio.sfx('honk'); const n = lump(240, 5); gain(n); return modal({ icon: '🪿', title: 'Your goose brought you a gift', text: `It's ${fmt(n)}. You decide not to ask where from.` }); }
      LC.audio.sfx('honk');
      return modal({ icon: '🪿', title: 'The goose is back', text: 'It is holding your piggy bank hostage.',
        choices: [
          { label: 'Pay the ransom (8%)', fn: () => { S.money *= 0.92; if (chance(0.5)) { S.goose.friend = true; return { text: 'The goose takes the money, then sits on your lap. You are friends now, apparently. (All income +10%)' }; } return { text: 'The goose takes the money and leaves. Business is business.' }; } },
          { label: 'Honk aggressively', cls: 'danger', fn: () => { LC.audio.sfx('honk'); if (S.pig) S.pig.stored = 0; return { text: 'The goose honks louder. It eats everything in your piggy bank.' }; } },
        ] });
    } },
    { id: 'badger', w: 7, run: () => modal({ icon: '🦡', title: 'The Tax Badger has arrived',
      text: 'He is wearing a tiny tie. He would like his cut.',
      choices: [
        { label: 'Pay him (5%)', fn: () => { S.money *= 0.95; return { text: 'The badger nods respectfully and leaves you a receipt. It is a leaf.' }; } },
        { label: 'Hide in the sofa', fn: () => chance(0.55) ? (gain(lump(90, 2)), { text: 'He gives up. While in the sofa you find a load of coins.' }) : (S.money *= 0.85, { text: 'He found you. He always finds you. 15%, plus a late fee.' }) },
      ] }) },
    { id: 'icecream', w: 8, run: () => modal({ icon: '🍦', title: 'The ice cream van is playing its song',
      text: 'It is coming down your street. It is not stopping unless you run.',
      choices: [
        { label: 'RUN for a 99', fn: () => { S.money *= 0.98; addBuff({ id: 'brainfreeze', icon: '🍦', label: 'Brain Freeze: clicks x10', click: 10, secs: 30 }); return { text: 'You got one. Brain freeze gives you strange powers. Sofa clicks x10 for 30 seconds!' }; } },
        { label: 'Let it go', cls: 'ghost', fn: () => ({ text: 'You hear the song fading away down the road. A small part of you goes with it.' }) },
      ] }) },
    { id: 'union', w: 6, cond: () => baseIncome() > 1, run: () => modal({ icon: '🪧', title: 'Your coins have formed a union',
      text: 'They demand better working conditions. One of them is holding a tiny sign.',
      choices: [
        { label: 'Give them a day off', fn: () => { addBuff({ id: 'strike', icon: '🪧', label: 'Coins on strike', income: 0, secs: 10 }); setTimeout(() => addBuff({ id: 'happycoins', icon: '😊', label: 'Happy coins: income x3', income: 3, secs: 45 }), 10000); return { text: 'Income stops for 10 seconds. Then they come back refreshed. Income x3 for 45 seconds.' }; } },
        { label: 'Give them a coin bath', fn: () => { S.money *= 0.97; addBuff({ id: 'bath', icon: '🛁', label: 'Clean coins: income +50%', income: 1.5, secs: 120 }); return { text: 'They love it. Income +50% for 2 minutes.' }; } },
      ] }) },
    { id: 'sale', w: 6, run: () => { addBuff({ id: 'sale', icon: '🏷️', label: 'Shop 50% off', cost: 0.5, secs: 25 }); modal({ icon: '🏷️', title: 'EVERYTHING IS HALF PRICE', text: 'For 25 seconds. A man in a van said so. Quick!' }); } },
    { id: 'flip', w: 4, run: () => { S.flags.flipped = true; document.body.classList.add('flipped'); addBuff({ id: 'flip', icon: '🙃', label: 'Upside down: income x3', income: 3, secs: 15 }); setTimeout(() => document.body.classList.remove('flipped'), 15000); toast(`${ic('🙃')}<div><b>A cursed penny has flipped reality.</b> Income x3 while it lasts.</div>`); } },
    { id: 'goblin', w: 4, run: () => { document.body.classList.add('goblin'); addBuff({ id: 'goblin', icon: '🔤', label: 'Font Goblin: clicks x5', click: 5, secs: 30 }); setTimeout(() => document.body.classList.remove('goblin'), 30000); toast(`${ic('👺')}<div><b>The Font Goblin has struck!</b> Everything looks silly. Clicks x5 for 30 seconds.</div>`); } },
    { id: 'piglets', w: 5, run: () => { spawnPiglets(); toast(`${ic('🐽')}<div><b>Your piggy bank has had piglets!</b> Smash them before they get away!</div>`); } },
    { id: 'rain', w: 4, run: () => { coinRain(28); toast(`${ic('🌧️')}<div><b>It's raining coins!</b> Click them!</div>`); } },
    { id: 'fox', w: 6, run: () => modal({ icon: '🦊', title: 'A fox has got into the bins',
      text: 'It is making the noise foxes make. You know the one.',
      choices: [
        { label: 'Let it rummage', fn: () => { const n = lump(150, 2); gain(n); return { text: `Foxes are just sofa-checkers with tails. It finds ${fmt(n)} and gives it to you.` }; } },
        { label: 'Scream back', fn: () => ({ text: 'You both scream at each other for a while. Nothing is gained. It was cathartic though.' }) },
      ] }) },
    { id: 'phone', w: 5, run: () => modal({ icon: '📞', title: 'Your phone rings',
      text: '"Hello, is this the sofa?"',
      choices: [
        { label: '"Yes."', fn: () => chance(0.6) ? (gain(lump(200, 3)), { text: '"Great, we\'ve found some of your coins." They send them over. Nice.' }) : (S.money *= 0.95, { text: '"Then you owe us 5%." They hang up. How did they do that?' }) },
        { label: '"No."', fn: () => ({ text: '"Sorry, wrong sofa." Click.' }) },
      ] }) },
    { id: 'derek', w: 3, cond: () => !S.flags.derek && !S.flags.derekGone, run: () => modal({ icon: '🪙', title: 'One of your coins has come to life',
      text: 'It says its name is Derek. It would like to stay.',
      choices: [
        { label: 'Keep Derek', fn: () => { S.flags.derek = true; return { text: 'Derek is delighted. Derek helps out. (All income +5%, forever)' }; } },
        { label: 'Spend Derek', cls: 'danger', fn: () => { S.flags.derekGone = true; gain(0.01); return { text: 'You spent Derek. He was 1p. You got a single Haribo. You think about Derek a lot.' }; } },
      ] }) },
    { id: 'meteor', w: 2, run: () => { const n = lump(600, 10); gain(n); modal({ icon: '☄️', title: 'A meteorite has landed in the garden', text: `Scientists rush over. It's a 50p. Well, technically it's worth ${fmt(n)} now because it's from space.` }); } },
    { id: 'doorbell', w: 5, cond: () => baseIncome() > 0.5, run: () => modal({ icon: '🛎️', title: 'Ding dong',
      text: 'A man at the door wants to sell you a slightly bigger sofa.',
      choices: [
        { label: 'Buy it (10%)', fn: () => { S.money *= 0.9; const g = [...LC.GENERATORS].reverse().find((x) => (S.gens[x.id] || 0) > 0) || LC.GENERATORS[0]; const free = Math.max(1, Math.ceil((S.gens[g.id] || 0) * 0.1)); S.gens[g.id] = (S.gens[g.id] || 0) + free; return { text: `The sofa comes with ${free} free ${g.name}${free > 1 ? 's' : ''} already inside.` }; } },
        { label: 'No thanks', cls: 'ghost', fn: () => ({ text: 'He leaves. As he goes you notice a goose in the back of his van.' }) },
      ] }) },
    { id: 'buttonman', w: 50, cond: () => S.buttons >= 100 && !S.flags.buttonmanNo, run: () => modal({ icon: '🔘', title: 'The Button Man is here',
      text: 'A tall man in a coat made entirely of buttons is standing in your garden. "You have 100 buttons," he whispers. "Come with me."',
      choices: [
        { label: 'Go with him', fn: () => { closeModal(); playEnding('buttons'); } },
        { label: 'Not today', cls: 'ghost', fn: () => { S.flags.buttonmanNo = true; setTimeout(() => (S.flags.buttonmanNo = false), 180000); return { text: '"I will return," he says, and walks into a hedge.' }; } },
      ] }) },
  ];
  let nextEventAt = Date.now() + 25000, nextGoldenAt = Date.now() + 40000;
  function eventTick(now) {
    if (modalOpen || endingPlaying) return;
    if (pending.length) { pending.shift()(); return; }
    if (S.lifetime < 2) return;
    if (now >= nextEventAt) {
      nextEventAt = now + rand(60000, 140000);
      const pool = EVENTS.filter((e) => !e.cond || e.cond());
      const ev = EVENTS.find((e) => e.id === weighted(pool.map((e) => [e.id, e.w])));
      S.stats.events++;
      LC.audio.sfx('event');
      ev.run();
    }
    if (now >= nextGoldenAt) { nextGoldenAt = now + rand(90000, 240000); spawnGolden(); }
  }
  function spawnPiglets() {
    for (let i = 0; i < 3; i++) {
      const p = el('button', 'piglet', ic('🐷'));
      p.style.left = rand(10, 85) + 'vw'; p.style.top = rand(20, 75) + 'vh';
      p.style.animationDelay = rand(0, 1) + 's';
      p.onclick = (e) => { const n = lump(60, 1); gain(n); coinBurst(e.clientX, e.clientY, 8); floater(e.clientX, e.clientY - 20, '+' + fmt(n)); LC.audio.sfx('smash'); p.remove(); };
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 9000);
    }
  }

  // ---------- The Thing & endings ----------
  let endingPlaying = false;
  function buyThing() {
    if (!spend(LC.THING_COST)) { LC.audio.sfx('nope'); return; }
    const unseen = LC.RANDOM_ENDINGS.filter((e) => !S.endings.includes(e));
    playEnding(pick(unseen.length ? unseen : LC.RANDOM_ENDINGS));
  }
  function playEnding(id) {
    const e = LC.ENDINGS.find((x) => x.id === id);
    endingPlaying = true;
    closeModal();
    LC.audio.music(false);
    const isNew = !S.endings.includes(id);
    if (isNew) S.endings.push(id);
    checkAchievements();
    save();
    const scr = $('#ending');
    scr.innerHTML = `<div class="ending-inner"><div class="ending-lines"></div></div>`;
    scr.classList.add('show');
    if (id === 'australia') scr.classList.add('upside');
    const lines = scr.querySelector('.ending-lines');
    e.lines.forEach((line, i) => setTimeout(() => {
      lines.appendChild(el('p', 'eline', line));
      LC.audio.sfx(i === e.lines.length - 1 ? (id === 'goose' ? 'honk' : 'fanfare') : 'tap');
    }, 900 + i * 2200));
    setTimeout(() => {
      const found = S.endings.length, total = LC.ENDINGS.length;
      const box = el('div', 'ending-card', `
        <div class="ending-icon">${ic(e.icon)}</div>
        <h2>THE END${e.secret ? ' (secret)' : ''}: ${e.title}</h2>
        <p>${isNew ? 'New ending found!' : 'You have seen this one before.'} Endings found: <b>${found} / ${total}</b></p>
        <p class="small">Starting again keeps your endings and achievements. Each ending found gives +25% to everything, forever.</p>`);
      const again = el('button', 'btn big', 'Check down the sofa again');
      again.onclick = () => { scr.classList.remove('show', 'upside'); endingPlaying = false; newRun(); };
      box.appendChild(again);
      scr.querySelector('.ending-inner').appendChild(box);
    }, 900 + e.lines.length * 2200 + 600);
  }
  function newRun() {
    S = freshRun({ endings: S.endings, achievements: S.achievements, runs: S.runs + 1, allTime: S.allTime, settings: S.settings });
    newPig(); card = null; renderCard();
    renderShop(true); gardenDirty = true; buildGarden();
    $('#sofa-log').innerHTML = '<li>Another day, another sofa.</li>';
    save();
    LC.audio.music(S.settings.music);
  }

  // ---------- rendering ----------
  function renderTop() {
    $('#money').textContent = fmt(S.money);
    $('#rate').textContent = fmtRate(income());
    const p = Math.min(1, S.money / LC.THING_COST);
    $('#thing-bar').style.width = (p * 100).toFixed(3) + '%';
    $('#thing-pct').textContent = (p * 100).toFixed(p < 0.01 ? 4 : 2) + '%';
    const btn = $('#thing-buy');
    const can = S.money >= LC.THING_COST;
    btn.disabled = !can;
    btn.classList.toggle('ready', can);
    $('#buttons-count').textContent = fmtInt(S.buttons);
  }
  function renderBuffs() {
    const box = $('#buffs');
    const now = Date.now();
    box.innerHTML = S.buffs.map((b) => `<div class="buff" title="${b.label}">${ic(b.icon)}<span>${b.label}</span><i style="width:${Math.max(0, (b.until - now) / (b.total * 1000)) * 100}%"></i></div>`).join('');
  }

  const genRows = {};
  let upKey = '';
  function buildShop() {
    const list = $('#gen-list');
    list.innerHTML = '';
    for (const g of LC.GENERATORS) {
      const row = el('button', 'gen');
      row.innerHTML = `<div class="gen-icon">${ic(g.icon)}</div>
        <div class="gen-main"><div class="gen-name">${g.name}</div><div class="gen-cost"></div></div>
        <div class="gen-count"></div>`;
      row.onclick = () => buyGen(g);
      row.onmouseenter = () => showTip(row, `<b>${g.name}</b><p>${g.desc}</p><p class="tip-stat">Each finds <b>${fmtRate(g.income * genMult(g) * globalMult())}</b></p><p class="tip-stat">${S.gens[g.id] || 0} owned: <b>${fmtRate(genIncome(g) * globalMult())}</b> total</p>`);
      row.onmouseleave = hideTip;
      list.appendChild(row);
      genRows[g.id] = row;
    }
  }
  function renderShop(force) {
    LC.GENERATORS.forEach((g, i) => {
      const row = genRows[g.id];
      const owned = S.gens[g.id] || 0;
      const prevOwned = i === 0 || (S.gens[LC.GENERATORS[i - 1].id] || 0) > 0;
      const visible = owned > 0 || prevOwned || S.lifetime >= g.cost * 0.5;
      const known = owned > 0 || S.lifetime >= g.cost * 0.3;
      row.hidden = !visible;
      if (!visible) return;
      const n = buyAmount === 'max' ? Math.max(1, maxAffordable(g)) : buyAmount;
      const cost = genCost(g, n);
      row.classList.toggle('poor', S.money < cost);
      row.classList.toggle('mystery', !known);
      row.querySelector('.gen-name').textContent = known ? g.name : '???';
      row.querySelector('.gen-cost').innerHTML = `${ic('🪙', 'tiny')} ${fmt(cost)}${n > 1 ? ` <small>(x${n})</small>` : ''}`;
      row.querySelector('.gen-count').textContent = owned || '';
    });
    const avail = ALL_UPS.filter((u) => !has(u.id) && (u.gen ? (S.gens[u.gen] || 0) >= u.at : S.lifetime >= u.cost * 0.4));
    avail.sort((a, b) => a.cost - b.cost);
    const key = avail.map((u) => u.id).join(',');
    const grid = $('#up-grid');
    if (force || key !== upKey) {
      upKey = key;
      grid.innerHTML = '';
      if (!avail.length) grid.innerHTML = '<p class="muted small">Upgrades appear here as you find more money.</p>';
      for (const u of avail) {
        const b = el('button', 'up', ic(u.icon));
        b.dataset.id = u.id;
        b.onclick = () => buyUpgrade(u);
        b.onmouseenter = () => showTip(b, `<b>${u.name}</b><p>${u.desc}</p><p class="tip-stat">${ic('🪙', 'tiny')} ${fmt(upCost(u))}</p>`);
        b.onmouseleave = hideTip;
        grid.appendChild(b);
      }
    }
    for (const b of grid.querySelectorAll('.up')) {
      const u = ALL_UPS.find((x) => x.id === b.dataset.id);
      b.classList.toggle('poor', S.money < upCost(u));
    }
  }

  // tooltip
  function showTip(anchor, html) {
    const tip = $('#tip');
    tip.innerHTML = html;
    tip.classList.add('show');
    const r = anchor.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.left - tw - 12;
    if (x < 8) x = Math.min(innerWidth - tw - 8, r.right + 12);
    const y = Math.max(8, Math.min(innerHeight - th - 8, r.top + r.height / 2 - th / 2));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { $('#tip').classList.remove('show'); }

  function renderPig(fresh) {
    if (!S.pig) return;
    const t = pigType();
    const pigEl = $('#pig');
    if (fresh) {
      pigEl.className = 'pig enter' + (t.gold ? ' gold' : '');
      pigEl.style.setProperty('--scale', S.pig.nest ? Math.pow(0.8, S.pig.nest) : 1);
      pigEl.querySelector('.pig-body').innerHTML = ic(t.icon);
      $('#pig-name').textContent = S.pig.nest ? `Smaller Pig (level ${S.pig.nest + 1})` : t.name;
      $('#pig-text').textContent = t.text;
    }
    const need = pigHitsNeeded();
    const cracks = pigEl.querySelectorAll('.crack');
    const shown = Math.floor((S.pig.hits / need) * cracks.length);
    cracks.forEach((c, i) => c.classList.toggle('on', i < shown));
    $('#pig-hits').textContent = t.real ? '' : `${S.pig.hits} / ${need} hits`;
  }
  function renderPigFill() {
    if (!S.pig) return;
    const cap = pigCap();
    $('#pig-fill').style.width = Math.min(100, (S.pig.stored / cap) * 100) + '%';
    const t = pigType();
    $('#pig-stored').textContent = t.real ? '???' : fmt(S.pig.stored * t.mult) + (S.pig.stored >= cap ? ' (full!)' : '');
  }

  // garden
  let gardenDirty = true;
  const toolRows = {};
  function buildGarden() {
    const list = $('#tool-list');
    list.innerHTML = '';
    for (const t of LC.DIG_TOOLS) {
      const row = el('button', 'gen small');
      row.innerHTML = `<div class="gen-icon">${ic(t.icon)}</div><div class="gen-main"><div class="gen-name">${t.name}</div><div class="gen-cost"></div></div><div class="gen-count"></div>`;
      row.onclick = () => buyDigTool(t);
      row.onmouseenter = () => showTip(row, `<b>${t.name}</b><p>${t.desc}</p>`);
      row.onmouseleave = hideTip;
      list.appendChild(row);
      toolRows[t.id] = row;
    }
  }
  function renderGarden() {
    $('#depth').textContent = fmtDepth(S.depth);
    $('#dig-rate').textContent = fmtDepth(digRate()) + '/s';
    const next = LC.DIG_FINDS.find((f) => !S.finds.includes(f.name));
    $('#dig-next').innerHTML = next ? `Something is buried at <b>${fmtDepth(next.at)}</b>` : 'You have found everything. Probably.';
    const p = Math.log10(1 + S.depth) / Math.log10(1 + LC.EARTH_DIAMETER);
    $('#shaft-dot').style.top = (p * 100).toFixed(2) + '%';
    LC.DIG_TOOLS.forEach((t, i) => {
      const row = toolRows[t.id];
      const owned = S.digTools[t.id] || 0;
      const visible = owned > 0 || i === 0 || (S.digTools[LC.DIG_TOOLS[i - 1].id] || 0) > 0 || S.lifetime > t.cost * 0.5;
      row.hidden = !visible;
      const cost = digToolCost(t);
      row.classList.toggle('poor', S.money < cost);
      row.querySelector('.gen-cost').innerHTML = `${ic('🪙', 'tiny')} ${fmt(cost)}`;
      row.querySelector('.gen-count').textContent = owned || '';
    });
    if (gardenDirty) {
      gardenDirty = false;
      $('#finds').innerHTML = S.finds.length
        ? S.finds.map((n) => { const f = LC.DIG_FINDS.find((x) => x.name === n); return f ? `<li>${ic(f.icon)}<div><b>${f.name}</b><small>${fmtDepth(f.at)}. ${f.text}</small></div></li>` : ''; }).reverse().join('')
        : '<li class="muted">Nothing yet. Get digging.</li>';
    }
  }

  function renderShopCards() {
    $('#stock').textContent = `${S.cardStock} / ${maxStock()} in stock`;
    for (const c of LC.CARDS) {
      const b = $(`#buy-${c.id}`);
      const cost = cardCost(c);
      b.querySelector('.cost').textContent = fmt(cost);
      b.classList.toggle('poor', S.money < cost || S.cardStock < 1 || (card && !card.done));
    }
  }

  function renderStats() {
    const rows = [
      ['Money found this run', fmt(S.lifetime)], ['Money found ever', fmt(S.allTime)],
      ['Income', fmtRate(income())], ['Each sofa check finds about', fmt(clickValue())],
      ['Sofa checks', fmtInt(S.stats.clicks)], ['Things found in the sofa', fmtInt(S.stats.sofaFinds)],
      ['Piggy banks smashed', fmtInt(S.stats.pigs)], ['Scratch cards scratched', fmtInt(S.stats.cards)],
      ['Golden coins caught', fmtInt(S.stats.golden)], ['Random events', fmtInt(S.stats.events)],
      ['Deepest hole', fmtDepth(S.depth)], ['Buttons', fmtInt(S.buttons)], ['Lucky socks', fmtInt(S.socks)], ['Frogs', fmtInt(S.frogs)],
      ['Goose status', S.goose.friend ? 'Best friends' : S.goose.met ? 'Suspicious' : 'Unknown'],
      ['Derek', S.flags.derek ? 'Doing well, thanks' : S.flags.derekGone ? 'Spent :(' : 'Not met yet'],
      ['Endings bonus', '+' + Math.round((karmaMult() - 1) * 100) + '% to everything'], ['Runs finished', fmtInt(S.runs)],
    ];
    $('#stats').innerHTML = rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
    $('#ach-count').textContent = `${S.achievements.length} / ${LC.ACHIEVEMENTS.length}`;
    $('#ach-grid').innerHTML = LC.ACHIEVEMENTS.map((a) => {
      const got = S.achievements.includes(a.id);
      return `<div class="ach ${got ? 'got' : ''}" title="${got ? a.desc : '???'}">${ic(got ? '🏆' : '🔒')}<span>${got ? a.name : '???'}</span></div>`;
    }).join('');
  }
  function renderEndings() {
    $('#end-count').textContent = `${S.endings.length} / ${LC.ENDINGS.length}`;
    $('#end-grid').innerHTML = LC.ENDINGS.map((e) => {
      const got = S.endings.includes(e.id);
      return `<div class="end ${got ? 'got' : ''}">${ic(got ? e.icon : '❓')}<b>${got ? e.title : e.secret ? 'Secret ending' : '???'}</b><small>${got ? e.lines[e.lines.length - 1] : e.secret ? 'Not found by buying The Thing...' : 'Buy The Thing to find out.'}</small></div>`;
    }).join('');
  }

  // news ticker
  let newsIdx = 0;
  function nextNews() {
    const items = [...LC.NEWS];
    if (S.goose.friend) items.push('Local goose "actually quite nice once you get to know it".');
    if (S.depth > 100) items.push(`Hole in local garden now ${fmtDepth(S.depth)} deep. Brian "furious".`);
    if (S.frogs) items.push(`Person wins ${S.frogs} frog${S.frogs > 1 ? 's' : ''} on scratch cards. "We don't know how either," says shop.`);
    if (S.flags.derekGone) items.push('Man still thinking about Derek.');
    const t = $('#news-text');
    t.classList.remove('roll'); void t.offsetWidth;
    t.textContent = items[(newsIdx++ * 7 + Math.floor(Math.random() * 3)) % items.length];
    t.classList.add('roll');
  }

  // tabs
  function setTab(id) {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
    document.querySelectorAll('.panel').forEach((p) => (p.hidden = p.id !== 'panel-' + id));
    if (id === 'stats') renderStats();
    if (id === 'endings') renderEndings();
    if (id === 'scratch' && card && !card.done) setTimeout(renderCard, 0);
    try { localStorage.setItem('loose-change-tab', id); } catch (e) { /* ignore */ }
  }

  // ---------- main loop ----------
  let lastTick = Date.now(), slow = 0;
  function tick() {
    const now = Date.now();
    const dt = Math.min(1, (now - lastTick) / 1000);
    lastTick = now;
    if (!endingPlaying) {
      gain(income() * dt);
      addDepth(digRate() * dt);
      if (S.pig && !pigType().real) S.pig.stored = Math.min(pigCap(), S.pig.stored + pigFill() * dt);
      if (S.cardRestockAt && now >= S.cardRestockAt) {
        S.cardStock = Math.min(maxStock(), S.cardStock + 1);
        S.cardRestockAt = S.cardStock < maxStock() ? now + LC.CARD_RESTOCK_SECS * 1000 : 0;
      }
    }
    const before = S.buffs.length;
    S.buffs = S.buffs.filter((b) => b.until > now);
    renderTop();
    renderShop(false);
    renderPigFill();
    if (!$('#panel-garden').hidden) renderGarden();
    if (!$('#panel-scratch').hidden) renderShopCards();
    if ((slow += dt) >= 1) {
      slow = 0;
      checkAchievements();
      if (!$('#panel-stats').hidden) renderStats();
      document.title = `${fmt(S.money)} · Loose Change`;
    }
    if (S.buffs.length || before) renderBuffs();
    eventTick(now);
  }

  // ---------- settings ----------
  function buildSettings() {
    const s = S.settings;
    $('#set-music').checked = s.music;
    $('#set-sfx').checked = s.sfx;
    $('#set-volume').value = s.volume;
    $('#set-music').onchange = (e) => { s.music = e.target.checked; LC.audio.unlock(); LC.audio.music(s.music); save(); };
    $('#set-sfx').onchange = (e) => { s.sfx = e.target.checked; save(); };
    $('#set-volume').oninput = (e) => { s.volume = +e.target.value; LC.audio.volume(s.volume); };
    $('#set-volume').onchange = save;
    $('#set-export').onclick = async () => {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      $('#save-code').value = code;
      try { await navigator.clipboard.writeText(code); toast(`${ic('📋')}<div>Save copied to clipboard.</div>`); } catch (e) { toast(`${ic('📋')}<div>Copy the save code from the box.</div>`); }
    };
    $('#set-import').onclick = () => {
      try {
        const data = JSON.parse(decodeURIComponent(escape(atob($('#save-code').value.trim()))));
        if (typeof data.money !== 'number') throw new Error('bad');
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        location.reload();
      } catch (e) { toast(`${ic('❌')}<div>That save code didn't work.</div>`); }
    };
    $('#set-reset').onclick = () => modal({ icon: '🔥', title: 'Wipe everything?', text: 'This deletes your save, endings and achievements. There is no undo.',
      choices: [
        { label: 'Wipe it', cls: 'danger', fn: () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } location.reload(); } },
        { label: 'Keep my coins', cls: 'ghost' },
      ] });
    $('#set-credits').onclick = () => modal({ icon: '📜', title: 'Credits',
      text: `Game design, code, music and sound: made for this game, all original.<br><br>
        Icons: <b>Twemoji</b> by Twitter, Inc. and other contributors, licensed under CC-BY 4.0 (creativecommons.org/licenses/by/4.0).<br><br>
        Font: <b>Fredoka</b>, copyright 2016 The Fredoka Project Authors, SIL Open Font License 1.1.` });
  }

  // ---------- boot ----------
  function offlineProgress() {
    const away = Math.min(OFFLINE_CAP, (Date.now() - S.lastSave) / 1000);
    if (away < 60 || baseIncome() <= 0) return;
    const n = baseIncome() * away * 0.5;
    gain(n);
    addDepth(digRate() * away * 0.5);
    const h = Math.floor(away / 3600), m = Math.floor((away % 3600) / 60);
    queueEvent(() => modal({ icon: '🐈', title: 'Welcome back',
      text: `You were away for ${h ? h + 'h ' : ''}${m}m. While you were gone, the cat found <b>${fmt(n)}</b>.<br><small>It would like a treat.</small>` }));
  }

  function boot() {
    const loaded = load();
    buildShop(); buildGarden(); buildSettings();
    if (!S.pig) newPig(); else renderPig(true);
    renderCard();
    if (loaded) offlineProgress();
    else queueEvent(() => modal({ icon: '🛋️', title: 'Loose Change',
      text: "You're saving up for something. You're not sure what. It costs <b>£1,000,000,000,000</b>.<br><br>You have 0p.<br><br>Better check down the back of the sofa.",
      choices: [{ label: "Let's go", fn: () => { LC.audio.unlock(); LC.audio.music(S.settings.music); } }] }));

    $('#sofa').onclick = clickSofa;
    $('#pig').onclick = hitPig;
    $('#dig').onclick = digOnce;
    $('#thing-buy').onclick = () => modal({ icon: '❓', title: 'Buy The Thing?', text: "You've saved up £1,000,000,000,000. This is it. Whatever it is.",
      choices: [{ label: 'Buy it', fn: () => { closeModal(); buyThing(); } }, { label: 'Wait...', cls: 'ghost' }] });
    document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { LC.audio.sfx('click'); setTab(b.dataset.tab); }));
    document.querySelectorAll('[data-amt]').forEach((b) => (b.onclick = () => {
      buyAmount = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt;
      document.querySelectorAll('[data-amt]').forEach((x) => x.classList.toggle('on', x === b));
      renderShop(true);
    }));
    LC.CARDS.forEach((c) => { $(`#buy-${c.id}`).onclick = () => buyCard(c); });
    document.addEventListener('pointerdown', () => { if (LC.audio.unlock()) LC.audio.music(S.settings.music); }, { once: true });
    $('#news-text').addEventListener('animationend', nextNews);
    LC.audio.volume(S.settings.volume);
    LC.audio.setSfxEnabled(() => S.settings.sfx);

    let tab = 'garden';
    try { tab = localStorage.getItem('loose-change-tab') || tab; } catch (e) { /* ignore */ }
    setTab(document.getElementById('panel-' + tab) ? tab : 'garden');
    nextNews();
    tick();
    setInterval(tick, TICK_MS);
    setInterval(save, 10000);
    addEventListener('beforeunload', save);
    addEventListener('resize', () => { if (card && !card.done && !$('#panel-scratch').hidden) renderCard(); });

    // Handy for testing: LC.debug.gain(1e9)
    LC.debug = { gain, spawnGolden, coinRain, ending: playEnding, event: (id) => EVENTS.find((e) => e.id === id)?.run(), state: () => S, setDepth: (m) => addDepth(m - S.depth) };
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
