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
      texts: {}, notesSeen: [], openedNotes: [], cooldowns: {}, chatted: [], tasksDone: [],
      brian: { p: 0, slowUntil: 0 }, items: {}, armed: {},
      pockets: [], stall: [], stallPrice: 'fair', stallUps: [],
      tools: { sofa: 0, pig: 0, dig: 0 }, toolDur: {}, request: null, nextRequestAt: 0, boosts: {}, crafted: [],
      letters: [], loftPigs: {}, boxes: [], washUntil: 0,
      buffs: [], flags: {}, playSecs: 0, town: null, friends: {}, museum: [null, null, null, null, null, null],
      stats: { clicks: 0, pigs: 0, cards: 0, golden: 0, events: 0, sofaFinds: 0, floor: 0 },
      startedAt: Date.now(), lastSave: Date.now(),
      // carried across runs
      endings: keep.endings || [], achievements: keep.achievements || [], runs: keep.runs || 0, secrets: keep.secrets || [],
      album: keep.album || { junk: [], finds: [], friends: [], town: [], letters: [] },
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
      S.brian = Object.assign({ p: 0, slowUntil: 0 }, data.brian); S.items = data.items || {}; S.armed = data.armed || {};
      S.pockets = data.pockets || []; S.stall = data.stall || []; S.stallUps = data.stallUps || [];
      S.letters = data.letters || []; S.loftPigs = data.loftPigs || {}; S.boxes = data.boxes || [];
      S.tools = Object.assign({ sofa: 0, pig: 0, dig: 0 }, data.tools); S.toolDur = data.toolDur || {}; S.boosts = data.boosts || {}; S.crafted = data.crafted || [];
      return true;
    } catch (e) { return false; }
  }

  // ---------- derived numbers ----------
  const has = (id) => S.upgrades.includes(id);
  const upgradesOf = (kind) => LC.UPGRADES.filter((u) => u.kind === kind && has(u.id));
  const buffMult = (key) => S.buffs.reduce((m, b) => m * (b[key] ?? 1), 1);

  const crafted = (id) => S.crafted.includes(id);
  const CRAFT_GEN = { detectorist: ['detector', 2], cat: ['robocat', 5], brother: ['spelunk', 5], pigeons: ['pigeonradio', 3] };
  function genMult(g) {
    let m = 1;
    LC.GEN_UP_TIERS.forEach((t, i) => { if (has(`${g.id}_${i}`)) m *= 2; });
    const c = CRAFT_GEN[g.id];
    if (c && crafted(c[0])) m *= c[1];
    if ((S.boosts[g.id] || 0) > Date.now()) m *= 3;
    return m;
  }
  // ---- tools: tiers, wear and tear ----
  function toolEff(k) { const t = S.tools[k] || 0; return t > 0 && (S.toolDur[k] ?? 1) <= 0 ? t - 1 : t; }
  const eff = (k) => LC.TOOLS[k][toolEff(k)];
  function wear(k) {
    const t = S.tools[k] || 0;
    if (!t || S.toolDur[k] <= 0) return;
    S.toolDur[k] = (S.toolDur[k] ?? LC.TOOLS[k][t].dur) - 1;
    if (S.toolDur[k] === 0) { LC.audio.sfx('nope'); toast(`${ic('🔧')}<div><b>Your ${LC.TOOLS[k][t].name.toLowerCase()} broke!</b><br><small>Repair it at the workbench in the shed.</small></div>`); }
  }
  function karmaMult() { return 1 + 0.25 * S.endings.length + 0.05 * S.runs; }
  function globalMult() {
    let m = 1 + upgradesOf('global').reduce((t, u) => t + u.value, 0);
    for (const f of S.finds) { const d = LC.DIG_FINDS.find((x) => x.name === f); if (d && d.reward.mult) m += d.reward.mult; }
    m += S.socks * 0.01;
    if (crafted('charm')) m += 0.25;
    if (S.flags.nanJumper) m += 0.1;
    if (S.flags.derek) m += 0.05;
    if (S.goose.friend) m += 0.1;
    m += museumBonus() + albumBonus();
    if (perk('lady', 3)) m += 0.05;
    if (perk('lady', 5)) m += 0.1;
    return m * karmaMult();
  }
  function genIncome(g) { return g.id === 'pigeons' && S.flags.pigeonStrike ? 0 : (S.gens[g.id] || 0) * g.income * genMult(g); }
  function baseIncome() { return LC.GENERATORS.reduce((t, g) => t + genIncome(g), 0) * globalMult(); }
  function income() { return baseIncome() * buffMult('income'); }
  function clickValue() {
    const mult = (eff('sofa').mult || 1) * karmaMult();
    const pct = eff('sofa').pct || 0;
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
    if (crafted('molekit')) m *= 3;
    if (S.flags.honoraryMole) m *= 2;
    return m * buffMult('dig');
  }
  const digRate = () => LC.DIG_TOOLS.reduce((t, d) => t + (S.digTools[d.id] || 0) * d.rate, 0) * digMult();
  const digClick = () => (perk('oldman', 5) ? 1.5 : 1) * ((0.05 + LC.DIG_TOOLS.reduce((t, d) => t + (S.digTools[d.id] || 0) * d.click, 0)) * (eff('dig').mult || 1) + digRate() * 0.05) * digMult();

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
    const box = $('#toasts');
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 4200);
    setTimeout(() => t.remove(), 4800);
  }
  function floater(x, y, text, cls = '') {
    const f = el('div', 'floater ' + cls, text);
    f.style.left = x + 'px'; f.style.top = y + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }
  // text floating up from something in the world (pos is a screen position, or null)
  function floatAt(pos, v, cls = '') {
    const p = pos || { x: innerWidth / 2, y: innerHeight / 2 - 40 };
    floater(p.x + rand(-20, 20), p.y - 10, typeof v === 'number' ? '+' + fmt(v) : v, cls);
  }
  // a line of dialogue or narration under the crosshair
  let sayTimer = 0;
  function say(text) {
    const b = $('#say');
    b.innerHTML = text;
    b.classList.add('show');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => b.classList.remove('show'), 3200);
  }
  function setPrompt(html) {
    const p = $('#prompt');
    if (p.dataset.html === html) return;
    p.dataset.html = html;
    p.innerHTML = html ? `<kbd>E</kbd> ${html}` : '';
    p.classList.toggle('show', !!html);
  }
  function setCompass(b) {
    const c = $('#compass');
    if (!b) { c.classList.remove('show'); return; }
    c.classList.add('show');
    c.querySelector('.arrow').style.transform = `rotate(${b.angle}rad)`;
    c.querySelector('span').textContent = Math.round(b.dist) + ' m';
  }

  // ---------- modal (events, endings, offline) ----------
  let modalOpen = false, talking = false;
  // Character events become in-world conversations: they walk up and talk in a speech bubble,
  // and your replies show at the bottom of the screen (keys 1-3). Everything else uses the card.
  function modal({ icon, title, text, choices = [{ label: 'OK' }], cls = '', speaker = null, npc = null }) {
    modalOpen = true;
    talking = !!speaker;
    const box = talking ? $('#dialog') : $('#modal');
    const name = speaker ? title : '';
    if (talking) {
      LC.world.talkStart(speaker, npc);
      setTimeout(() => LC.world.talkSay(text, name), 900);
      box.innerHTML = `<div class="dialog-title">${ic(icon)} ${title}</div><div class="modal-choices"></div>`;
      box.classList.add('show');
    } else {
      box.className = 'modal-card ' + cls;
      box.innerHTML = `<div class="modal-icon">${icon ? ic(icon) : ''}</div><h2>${title}</h2><p>${text}</p><div class="modal-choices"></div>`;
      $('#overlay').classList.add('show');
    }
    const row = box.querySelector('.modal-choices');
    const say2 = (t) => { if (talking) LC.world.talkSay(t, name); else box.querySelector('p').innerHTML = t; };
    choices.forEach((c, i) => {
      const b = el('button', 'btn ' + (c.cls || ''), `<kbd>${i + 1}</kbd> ${c.label}`);
      b.onclick = () => {
        LC.audio.sfx('click');
        const result = c.fn ? c.fn() : null;
        if (result) { // show the outcome, then OK
          say2(result.text || result);
          if (result.icon && !talking) box.querySelector('.modal-icon').innerHTML = ic(result.icon);
          row.innerHTML = '';
          const ok = el('button', 'btn', '<kbd>1</kbd> OK');
          ok.onclick = closeModal; row.appendChild(ok);
        } else closeModal();
      };
      row.appendChild(b);
    });
  }
  function closeModal() {
    $('#overlay').classList.remove('show');
    $('#dialog').classList.remove('show');
    if (talking) LC.world.talkEnd();
    modalOpen = false; talking = false;
  }

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

  // ---------- the sofa ----------
  // Rummaging has a rhythm: a ring pulses round the crosshair. Click as it lines up for a bonus,
  // and keep the rhythm going for a combo. Holding the button still works, without the bonus.
  const PULSE = 0.85; // seconds per pulse
  let pulseStart = performance.now(), combo = 0, lastHit = 0;
  function pulsePhase() { return ((performance.now() - pulseStart) / 1000 / PULSE) % 1; }
  function rummage(auto) {
    LC.audio.unlock();
    let mult = 1, grade = '';
    const now = performance.now();
    if (!auto) {
      const ph = pulsePhase(), off = Math.min(ph, 1 - ph); // 0 = ring exactly on target
      if (off < 0.07) { mult = 3; grade = 'PERFECT!'; }
      else if (off < 0.16) { mult = 1.5; grade = 'Nice'; }
      if (grade && now - lastHit < PULSE * 1000 * 1.9) combo++;
      else if (!grade) combo = 0;
      else combo = Math.max(1, combo);
      lastHit = now;
    }
    const comboMult = 1 + Math.min(combo, 20) * 0.1;
    const v = clickValue() * mult * comboMult;
    gain(v);
    wear('sofa');
    S.stats.clicks++;
    if (grade === 'PERFECT!') S.stats.perfects = (S.stats.perfects || 0) + 1;
    LC.audio.sfx('coin', 1 + Math.min(combo, 20) * 0.04);
    if (chance(grade === 'PERFECT!' ? 0.08 : 0.04)) sofaFind();
    if (S.stats.clicks === 500) giveLetter('l10');
    renderCombo(grade);
    return { value: v, grade, burst: grade === 'PERFECT!' ? 10 : grade ? 5 : 3 };
  }
  let comboTimer = 0;
  function renderCombo(grade) {
    const c = $('#combo');
    c.innerHTML = (grade ? `<b class="${grade === 'PERFECT!' ? 'perfect' : ''}">${grade}</b>` : '') + (combo > 1 ? `<span>COMBO x${(1 + Math.min(combo, 20) * 0.1).toFixed(1)}</span>` : '');
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { c.innerHTML = ''; }, 900);
  }
  function setPulse(on) {
    const p = $('#pulse');
    if (on === p.classList.contains('show')) return;
    p.classList.toggle('show', on);
    if (on) { pulseStart = performance.now(); p.style.setProperty('--pulse', PULSE + 's'); p.querySelector('i').style.animation = 'none'; void p.offsetWidth; p.querySelector('i').style.animation = ''; }
  }
  function sofaFind() {
    const f = LC.SOFA_FINDS.find((x) => x.text === weighted(LC.SOFA_FINDS.map((x) => [x.text, x.weight || 4])));
    S.stats.sofaFinds++;
    let reward = '';
    if (f.cash) { const n = lump(f.cash, f.cash / 100); gain(n); reward = ` <b>+${fmt(n)}</b>`; }
    if (f.flat) { gain(f.flat); reward = ` <b>+${fmt(f.flat)}</b>`; }
    if (f.buttons) { S.buttons += f.buttons; reward = ` <b>+${f.buttons} ${ic('🔘')}</b>`; }
    if (f.item) giveItem(f.item);
    if (f.junk) { giveJunk(f.junk, true); reward = ` <b>(in your pockets)</b>`; }
    toast(`${ic('🛋️')}<div>You found ${f.text}${reward}</div>`, 'find');
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
  function dig() {
    LC.audio.unlock();
    if (S.depth >= LC.EARTH_DIAMETER) return null;
    const m = digClick();
    addDepth(m);
    wear('dig');
    LC.audio.sfx('dig');
    if (chance(0.03)) { const n = lump(20, 0.2); gain(n); toast(`${ic('🪙')}<div>Your spade hit a coin. <b>+${fmt(n)}</b></div>`); }
    else if (chance(crafted('detector') ? 0.12 : 0.06)) { const tier = LC.DIG_JUNK.find((t) => S.depth <= t.upTo); giveJunk(pick(tier.ids)); }
    return { text: '+' + fmtDepth(m) };
  }
  function addDepth(m) {
    if (S.depth >= LC.EARTH_DIAMETER) return;
    S.depth = Math.min(LC.EARTH_DIAMETER, S.depth + m);
    for (const f of LC.DIG_FINDS) {
      if (S.depth >= f.at && !S.finds.includes(f.name)) {
        const r = f.reward;
        if (r.ending) { australiaReady(); continue; }
        S.finds.push(f.name); albumAdd('finds', f.name);
        let what = '';
        if (r.cash) { const n = lump(r.cash, 0.5); gain(n); what = `+${fmt(n)}`; }
        if (r.mult) what = `All income +${Math.round(r.mult * 100)}%`;
        if (r.dig) what = `Dig speed x${r.dig}`;
        if (r.buttons) { S.buttons += r.buttons; what = `+${r.buttons} buttons`; }
        if (r.item) { giveItem(r.item, true); what = '(in your pocket)'; }
        if (r.junk) giveJunk(r.junk, true);
        if (r.letter) giveLetter(r.letter);
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

  // ---------- piggy bank (sits on the mantelpiece) ----------
  function newPig(nestLevel = 0, carried = 0) {
    const id = nestLevel > 0 ? 'nesting' : weighted(LC.PIGS.map((p) => [p.id, p.weight]));
    const type = LC.PIGS.find((p) => p.id === id);
    S.pig = { type: type.id, stored: carried, hits: 0, nest: nestLevel };
    showPig();
  }
  function showPig() { LC.world.setPig(S.pig.type, S.pig.nest ? Math.pow(0.78, S.pig.nest) : 1); }
  function pigType() { return LC.PIGS.find((p) => p.id === S.pig.type); }
  function pigHitsNeeded() { const t = pigType(), tool = eff('pig'); if (tool.hits === 0) return 1; return Math.max(2, Math.ceil(t.hits * (tool.hits || 1) * pigHitsMult() * (S.pig.nest ? 0.7 : 1))); }
  function pigPrompt() {
    if (!S.pig) return '';
    const t = pigType();
    if (t.real) return 'Smash the... piggy bank?';
    const name = S.pig.nest ? `Smaller Pig (level ${S.pig.nest + 1})` : t.name;
    return `Smash ${name}: ${S.pig.hits}/${pigHitsNeeded()} · inside ${fmt(S.pig.stored * t.mult)}${S.pig.stored >= pigCap() ? ' (full!)' : ''}<small>${t.text}</small>`;
  }
  function hitPig() {
    LC.audio.unlock();
    if (!S.pig) return null;
    const t = pigType();
    if (t.real) {
      S.flags.realPig = true;
      LC.audio.sfx('oink');
      say('It was a real pig. It has left. It took nothing, but it judged you.');
      S.pig = null;
      return { type: 'real' };
    }
    S.pig.hits++;
    wear('pig');
    LC.audio.sfx(eff('pig').hits === 0 ? 'smash' : 'tap');
    if (t.id === 'kevin' && chance(0.15)) say(pick(['Kevin: "Oi!"', 'Kevin: "Rude."', 'Kevin: "Kevin remembers."', 'Kevin: "Not the face!"']));
    if (S.pig.hits < pigHitsNeeded()) return { type: 'hit' };
    const payout = S.pig.stored * t.mult * (eff('pig').pay || 1);
    gain(payout);
    S.stats.pigs++;
    LC.audio.sfx('smash');
    S.pig.smashed = true;
    return { type: 'smash', payout };
  }
  function nextPig() {
    const nestMax = LC.PIGS.find((p) => p.id === 'nesting').nest;
    if (S.pig && S.pig.type === 'nesting' && S.pig.nest < nestMax) { toast(`${ic('🪆')}<div>There was another pig inside!</div>`); newPig(S.pig.nest + 1, S.pig.stored * 0.8); }
    else newPig();
  }

  // ---------- scratch cards ----------
  let card = null;
  function buyCard(c) {
    LC.audio.unlock();
    if (card && !card.done) return;
    if (LC.world.cardActive()) return;
    if (S.cardStock < 1) { toast(`${ic('🏪')}<div>The corner shop has sold out. Back soon.</div>`); return; }
    const cost = cardCost(c);
    if (!spend(cost)) { LC.audio.sfx('nope'); return; }
    S.cardStock--;
    if (!S.cardRestockAt) S.cardRestockAt = Date.now() + LC.CARD_RESTOCK_SECS * 1000;
    const odds = Object.entries(c.odds).map(([k, w]) => [k, k === 'lose' ? Math.max(5, w - 6 * luck()) : w]);
    const outcome = weighted(odds);
    card = { def: c, cost, outcome, grid: layoutCard(outcome), done: false };
    // hand it over: the card appears in your hands back in the shop
    closeScreen();
    const SHORT = { coin: 'x2', pig: 'x4', clover: 'x10', gem: 'JACKPOT', goose: 'GOOSE', button: 'BUTTONS', sock: 'SOCK', frog: 'FROG' };
    LC.world.startCard(c, card.grid.map((k) => ({ icon: LC.SCRATCH_SYMBOLS[k].icon, label: SHORT[k] })));
    say('Hold the mouse button and move to scratch. <kbd>E</kbd> to scratch it all.');
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
    let msg;
    if (card.outcome === 'lose') { msg = pick(['No match. The frog on the back is laughing at you.', 'Nothing. So close. (Not close.)', 'No win. The corner shop owner buys another boat.']); LC.audio.sfx('nope'); }
    else if (sym.mult) {
      const n = card.cost * sym.mult;
      gain(n);
      msg = `Three ${ic(sym.icon)}! You win <b>${fmt(n)}</b>!`;
      if (card.outcome === 'gem') { S.flags.jackpot = true; LC.audio.sfx('fanfare'); LC.world.coinRain(20); } else LC.audio.sfx('win');
    } else if (sym.special === 'goose') {
      LC.audio.sfx('honk');
      if (!S.goose.met) { S.goose.met = true; S.goose.friend = true; msg = `You won <b>a goose</b>. A real one. It seems to like you. (All income +10%)`; }
      else { const n = lump(300); gain(n); msg = `You won another goose. Your goose eats it, and coughs up <b>${fmt(n)}</b>.`; }
    } else if (sym.special === 'buttons') { S.buttons += 25; msg = `A "lifetime supply" of buttons! It's 25 buttons. ${ic('🔘')}`; LC.audio.sfx('win'); }
    else if (sym.special === 'sock') { S.socks++; msg = `You won one sock. It's warm. It feels lucky. (All income +1%)`; LC.audio.sfx('win'); }
    else { S.frogs++; findSecret('colin'); msg = `You won... a frog. It's not a prize, it just got on the card. It's yours now. (Frogs: ${S.frogs})`; LC.audio.sfx('ribbit'); }
    say(msg + ' <small>(click or E to put the card away)</small>');
  }
  function renderCard() {
    $('#card-area').innerHTML = `<div class="card-empty">${ic('🎟️', 'huge')}<p>Buy a card and the shopkeeper hands it to you.<br>Scratch it right here in the shop with a 2p.</p></div>`;
  }


  // ---------- tasks (the to-do list, top-left) ----------
  function giveReward(r) {
    if (r.cash) gain(r.cash);
    if (r.secs) gain(lump(r.secs, r.min || 1));
    if (r.buttons) S.buttons += r.buttons;
    if (r.gen) S.gens[r.gen[0]] = (S.gens[r.gen[0]] || 0) + r.gen[1];
    if (r.tool) S.digTools[r.tool[0]] = (S.digTools[r.tool[0]] || 0) + r.tool[1];
    if (r.up && !has(r.up)) S.upgrades.push(r.up);
    if (r.toolTier) { const [k, t] = r.toolTier; if ((S.tools[k] || 0) < t) { S.tools[k] = t; S.toolDur[k] = LC.TOOLS[k][t].dur; } }
  }
  function activeTasks() { return LC.TASKS.filter((t) => !S.tasksDone.includes(t.id)).slice(0, 1); }
  function checkTasks() {
    for (const t of activeTasks()) {
      if (t.progress(S) < t.target) continue;
      S.tasksDone.push(t.id);
      if (t.id === 't25') continue; // the last one is The Thing itself
      giveReward(t.reward);
      LC.audio.sfx('fanfare');
      toast(`${ic('✅')}<div><b>Task done!</b> ${t.text}<br><small>Reward: ${t.rewardText}</small></div>`, 'gold');
      renderShop(true);
    }
    renderTasks();
  }
  let taskKey = '';
  function renderTasks() {
    const list = activeTasks();
    const key = list.map((t) => t.id).join();
    const box = $('#tasks');
    if (key !== taskKey) {
      taskKey = key;
      box.innerHTML = `<div class="tasks-head">${ic('📋')} Task ${S.tasksDone.length + 1} <span>of ${LC.TASKS.length}</span></div>` +
        list.map((t) => `<div class="task" data-id="${t.id}"><div class="task-text">${t.text}</div><div class="task-bar"><i></i></div><div class="task-reward">${ic('🎁', 'tiny')} ${t.rewardText}</div></div>`).join('');
    }
    for (const t of list) {
      const p = Math.min(1, t.progress(S) / t.target);
      const el2 = box.querySelector(`[data-id="${t.id}"] .task-bar i`);
      if (el2) el2.style.width = (p * 100).toFixed(1) + '%';
    }
  }

  // ---------- junk, pockets and your stall ----------
  const pocketSize = () => (S.stallUps.includes('wheelbarrow') ? 48 : S.stallUps.includes('rucksack') ? 24 : 12);
  const stallSize = () => (S.stallUps.includes('table') ? 10 : 6);
  function giveJunk(id, quiet) {
    const j = LC.JUNK[id];
    if (S.pockets.length >= pocketSize()) { if (!quiet) toast(`${ic('🎒')}<div><b>Your pockets are full!</b><br><small>Put things out on your stall to sell them.</small></div>`); return false; }
    const value = Math.max(j.min, baseIncome() * j.value) * (0.85 + Math.random() * 0.3);
    S.pockets.push({ id, value });
    albumAdd('junk', id);
    setTimeout(renderHotbar, 0);
    if (!quiet) toast(`${ic(j.icon)}<div>Found: <b>${j.name}</b><br><small>Worth about ${fmt(value)} at your stall</small></div>`, j.rarity >= 3 ? 'gold' : 'find');
    return true;
  }
  // ---------- the stall is used in the world: hold something, look at a spot, press E ----------
  const PRICE_ORDER = ['cheap', 'fair', 'cheeky'];
  let held = 0; // index into pockets
  function stallSlots() { while (S.stall.length < 10) S.stall.push(null); return S.stall; }
  const stallItems = () => stallSlots().slice(0, stallSize()).filter(Boolean);
  function syncStall() { LC.world.setStallItems(stallSlots().map((x, i) => (x && i < stallSize() ? { icon: LC.JUNK[x.id].icon, price: x.price || 'fair' } : null))); }
  const itemPrice = (x) => x.value * LC.STALL_PRICES[x.price || 'fair'].mult;
  function slotPrompt(i) {
    const x = stallSlots()[i];
    if (x) return `Take back the ${LC.JUNK[x.id].name.toLowerCase()}<small>Price tag: ${LC.STALL_PRICES[x.price || 'fair'].label} (${fmt(itemPrice(x))}) · press R to change</small>`;
    const h = S.pockets[held];
    return h ? `Put the ${LC.JUNK[h.id].name.toLowerCase()} on your stall<small>Scroll to choose something else</small>` : 'An empty spot<small>Find some junk to sell</small>';
  }
  function slotUse(i) {
    const slots = stallSlots();
    if (slots[i]) {
      if (S.pockets.length >= pocketSize()) { LC.audio.sfx('nope'); say('Your pockets are full.'); return; }
      S.pockets.push(slots[i]); slots[i] = null;
    } else {
      if (!S.pockets[held]) { LC.audio.sfx('nope'); return; }
      slots[i] = Object.assign(S.pockets.splice(held, 1)[0], { price: S.lastPrice || 'fair' });
      held = Math.min(held, Math.max(0, S.pockets.length - 1));
    }
    LC.audio.sfx('click'); syncStall(); renderHotbar();
  }
  function slotAlt(i) {
    const x = stallSlots()[i];
    if (!x) return;
    x.price = PRICE_ORDER[(PRICE_ORDER.indexOf(x.price || 'fair') + 1) % 3];
    S.lastPrice = x.price;
    LC.audio.sfx('click'); syncStall();
    say(`Price tag: <b>${LC.STALL_PRICES[x.price].label}</b> (${fmt(itemPrice(x))}). ${LC.STALL_PRICES[x.price].note}.`);
  }
  // the table itself: upgrades for the stall
  const nextStallUp = () => LC.STALL_UPS.find((u) => !S.stallUps.includes(u.id));
  function stallTablePrompt() {
    const u = nextStallUp();
    const n = stallItems().length;
    return u ? `${u.name} for your stall: <b>${fmt(u.cost)}</b><small>${u.desc}</small>` : `Your stall<small>${n} things for sale</small>`;
  }
  function stallTableUse() {
    const u = nextStallUp();
    if (!u) return;
    if (!spend(u.cost)) { LC.audio.sfx('nope'); say(`You need ${fmt(u.cost)} for the ${u.name.toLowerCase()}.`); return; }
    S.stallUps.push(u.id); LC.audio.sfx('buy'); LC.world.setStallUps(S.stallUps); syncStall();
    toast(`${ic(u.icon)}<div><b>${u.name}</b><br><small>${u.desc}</small></div>`);
  }
  // pockets hotbar at the bottom of the screen
  let hotKey = '';
  function renderHotbar() {
    const bar = $('#hotbar');
    if (!S.pockets.length) { bar.innerHTML = ''; hotKey = ''; return; }
    held = Math.max(0, Math.min(held, S.pockets.length - 1));
    const key = S.pockets.map((p) => p.id).join() + '|' + held + '|' + pocketSize();
    if (key === hotKey) return;
    hotKey = key;
    const h = S.pockets[held];
    bar.innerHTML = `<div class="hot-name">${LC.JUNK[h.id].name} <small>~${fmt(h.value)}</small></div><div class="hot-slots">` +
      S.pockets.map((p, i) => `<div class="hot ${i === held ? 'on' : ''} r${LC.JUNK[p.id].rarity}">${ic(LC.JUNK[p.id].icon)}${i < 9 ? `<i>${i + 1}</i>` : ''}</div>`).join('') +
      `<div class="hot-count">${S.pockets.length}/${pocketSize()}</div></div>`;
  }
  function cycleHeld(dir) { if (!S.pockets.length) return; held = (held + dir + S.pockets.length) % S.pockets.length; renderHotbar(); LC.audio.sfx('click'); }
  function selectHeld(i) { if (i < S.pockets.length) { held = i; renderHotbar(); LC.audio.sfx('click'); } }
  // customers turn up while there's something on the stall
  let customerTimer = 20;
  function stallTick(dt) {
    if (!stallItems().length) return;
    if (S.stallUps.includes('lemonade') && LC.world.nearStall(8)) gain(baseIncome() * 0.1 * dt);
    let rate = townStallRate() * (perk('kid', 3) ? 1.25 : 1);
    if (S.stallUps.includes('sign')) rate *= 1.4;
    if (S.stallUps.includes('parasol')) rate *= 1.3;
    if (S.stallUps.includes('bell')) rate *= 2;
    if (LC.world.nearStall(7)) rate *= 1.5;
    customerTimer -= dt * rate;
    if (customerTimer > 0) return;
    customerTimer = rand(18, 34);
    const rare = stallItems().some((x) => LC.JUNK[x.id].rarity >= 3);
    LC.world.spawnCustomer(rare && chance(0.35) ? 'collector' : 'person');
  }
  // A customer has arrived. If you're not there they wait (and you get a ping); if you take too long they might steal.
  let waiting = 0;
  function customerArrived(kind, npc) {
    if (LC.world.nearStall(7)) return customerAtStall(kind, npc);
    waiting++;
    LC.audio.sfx('text');
    toast(`${ic('🛎️')}<div><b>Someone's waiting at your stall!</b><br><small>Don't leave them too long...</small></div>`, 'msg');
    return { wait: kind === 'collector' ? 45 : 28 };
  }
  function customerGaveUp(kind) {
    waiting = Math.max(0, waiting - 1);
    const live = stallSlots().map((x, i) => (x && i < stallSize() ? i : -1)).filter((i) => i >= 0);
    if (!live.length || chance(0.45) || perk('kid', 5)) return { say: perk('kid', 5) && live.length ? 'Alfie was guarding the stall. I didn\'t dare.' : pick(['Nobody here? Fine.', 'I waited AGES.', "I'll come back. (They won't.)"]) };
    const idx = kind === 'collector' ? (live.find((i) => LC.JUNK[stallSlots()[i].id].rarity >= 3) ?? pick(live)) : pick(live);
    const it = stallSlots()[idx];
    stallSlots()[idx] = null;
    syncStall();
    stolen = it;
    LC.audio.sfx('event');
    toast(`${ic('🏃')}<div><b>THIEF!</b> Someone nicked your ${LC.JUNK[it.id].name.toLowerCase()}!<br><small>Chase them down the street!</small></div>`, 'gold');
    return { steal: true, icon: LC.JUNK[it.id].icon, say: pick(['Finders keepers!', 'Bye!', 'It was FREE, right?']) };
  }
  let stolen = null;
  function thiefCaught() {
    if (!stolen) return null;
    S.pockets.push(stolen); renderHotbar();
    const bonus = chance(0.5) ? lump(30, 1) : 0;
    if (bonus) gain(bonus);
    S.stats.thieves = (S.stats.thieves || 0) + 1;
    LC.audio.sfx('fanfare');
    toast(`${ic('🫵')}<div><b>Caught them!</b> You got your ${LC.JUNK[stolen.id].name.toLowerCase()} back.${bonus ? `<br><small>They gave you ${fmt(bonus)} to keep it quiet.</small>` : ''}</div>`, 'gold');
    stolen = null;
    return pick(['Sorry! SORRY!', "Alright, alright, here's your stuff!", 'Please don\'t tell my mum.', "I was just... borrowing it!"]);
  }
  function thiefEscaped() { if (stolen) { say(`They got away with your ${LC.JUNK[stolen.id].name.toLowerCase()}. Gone forever.`); stolen = null; } }
  function customerServe(kind, npc) { waiting = Math.max(0, waiting - 1); return customerAtStall(kind, npc); }
  // called by the world when a customer has had a browse (and you're there)
  function customerAtStall(kind, npc) {
    const slots = stallSlots(), live = [];
    slots.forEach((x, i) => { if (x && i < stallSize()) live.push(i); });
    if (!live.length) return { say: pick(['Oh. It\'s all gone.', 'Nothing left? Shame.']) };
    const collector = kind === 'collector';
    let idx = pick(live);
    if (collector) { const r = live.find((i) => LC.JUNK[slots[i].id].rarity >= 3); if (r != null) idx = r; }
    const it = slots[idx], j = LC.JUNK[it.id];
    const pr = it.price || 'fair';
    const price = itemPrice(it) * (collector ? 3 : 1);
    const near = LC.world.nearStall(7) && !modalOpen && !screenOpen;
    // haggling (only if you're there to haggle back)
    if (near && (pr === 'cheeky' || chance(0.25)) && !collector) {
      const offer = price * rand(0.55, 0.8);
      modal({ speaker: 'customer', npc, icon: j.icon, title: 'A customer', text: `I'll give you ${fmt(offer)} for the ${j.name.toLowerCase()}.`, choices: [
        { label: `Deal (${fmt(offer)})`, fn: () => { sell(idx, offer); return { text: 'Pleasure doing business!' }; } },
        { label: `"${fmt(price)}, final offer"`, fn: () => chance(0.5) ? (sell(idx, price), { text: 'Oh go on then. You drive a hard bargain.' }) : { text: 'Hmph. No thank you.' } },
        { label: 'No deal', cls: 'ghost', fn: () => ({ text: 'Suit yourself.' }) },
      ] });
      return null;
    }
    const buy = collector || chance(LC.STALL_PRICES[pr].buy * (near ? 1.2 : 1));
    if (!buy) return { say: pick(LC.STALL_LINES.pass) };
    sell(idx, price);
    if (collector) S.stats.collector = (S.stats.collector || 0) + 1;
    return { say: collector ? pick(LC.STALL_LINES.collector) : pick(LC.STALL_LINES.buy), sold: price };
  }
  function sell(idx, price) {
    const slots = stallSlots();
    const it = slots[idx];
    if (!it) return;
    slots[idx] = null;
    gain(price);
    S.stats.sold = (S.stats.sold || 0) + 1;
    S.stats.soldFor = (S.stats.soldFor || 0) + price;
    LC.audio.sfx('buy');
    syncStall();
    floatAt(LC.world.stallScreenPos(), price);
  }

  // ---------- Brian next door ----------
  const ITEMS = { whoopee: ['💨', 'Whoopee cushion'], glitter: ['✨', 'Glitter'], stink: ['🤢', 'Stink bomb'], ticket: ['🎫', 'Fake parking ticket'] };
  function giveItem(id, quiet) {
    S.items[id] = (S.items[id] || 0) + 1;
    if (!quiet) toast(`${ic(ITEMS[id][0])}<div><b>${ITEMS[id][1]}</b> in your pocket.<br><small>Brian won't like this.</small></div>`);
  }
  const useItem = (id) => { if (!S.items[id]) return false; S.items[id]--; return true; };
  const BRIAN_SECS = 2.7 * 3600; // unhindered, Brian gets there in about 2h40m
  const brianActive = () => S.lifetime >= 20 && !endingPlaying;
  const brianMoney = () => Math.pow(10, 12 * Math.max(0, S.brian.p)) - 1;
  function brianTick(dt) {
    if (!brianActive()) return;
    const mine = Math.log10(1 + S.money) / 12;
    let mult = 1;
    if (mine > S.brian.p + 0.08) mult = 1.6;      // you're ahead: he tries harder
    if (mine < S.brian.p - 0.1) mult = 0.6;       // you're behind: he gets complacent
    if (Date.now() < S.brian.slowUntil) mult *= 0.15;
    S.brian.p = Math.min(1, S.brian.p + dt / BRIAN_SECS * mult);
    if (S.brian.p >= 1) { S.brian.p = 1; playEnding('brian'); }
  }
  function prank(kind, secs, knock, line) {
    S.brian.slowUntil = Math.max(Date.now(), S.brian.slowUntil) + secs * 1000;
    S.brian.p = Math.max(0, S.brian.p - knock);
    S.stats.pranks = (S.stats.pranks || 0) + 1;
    S.flags['prank_' + kind] = true;
    delete S.armed[kind];
    LC.world.clearPrank(kind);
    LC.audio.sfx(kind === 'whoopee' ? 'fart' : kind === 'goose' ? 'honk' : 'event');
    toast(`${ic('😈')}<div><b>Prank!</b> ${line}<br><small>Brian's saving slows right down for ${Math.round(secs / 60)} minutes.</small></div>`, 'gold');
  }
  function brianEvent(name) {
    if (name === 'sit' && S.armed.whoopee) prank('whoopee', 240, 0.02, 'Brian sat on the whoopee cushion. The whole street heard.');
    if (name === 'enterDoor' && S.armed.glitter) prank('glitter', 180, 0.015, 'Brian opened his door into a cloud of glitter.');
    if (name === 'passCar' && S.armed.stink) { LC.world.prankFx('stink'); prank('stink', 300, 0.02, 'Brian got in his car. He got straight back out again.'); }
    if (name === 'passCar' && S.armed.ticket) prank('ticket', 180, 0.015, 'Brian found a parking ticket on his own car. He is phoning the council.');
  }
  function brianDoorPrompt() {
    if (S.items.glitter && !S.armed.glitter) return "Post glitter through Brian's letterbox";
    if (!S.flags.hasKey) return "Brian's front door<small>Locked</small>";
    const where = LC.world.brianState();
    const away = where === 'shops' || where === 'toShops' || where === 'garden' || where === 'toGarden';
    return (LC.world.playerInBrians() ? 'Open the door' : "Sneak into Brian's house") + `<small>${away ? (where.includes('arden') ? 'Brian is mowing the lawn...' : 'Brian is out!') : 'Brian is at home. Press C to crouch.'}</small>`;
  }
  let doorOpen = false;
  function brianDoor() {
    if (S.items.glitter && !S.armed.glitter) { useItem('glitter'); S.armed.glitter = true; LC.world.prankFx('glitter'); say('Glitter posted. Now wait for Brian to come home.'); return; }
    if (!S.flags.hasKey) { LC.audio.sfx('nope'); say(pick(['Locked. Brian has three locks. Two of them are fake.', 'Locked. You can hear a cuckoo clock inside.', "Locked. There's a sticker: NO JUNK MAIL, NO CHILDREN."])); return; }
    doorOpen = !doorOpen; LC.world.setDoorOpen(doorOpen); LC.audio.sfx('click');
  }
  function brianSofaPrompt() {
    if (S.items.whoopee && !S.armed.whoopee) return "Hide a whoopee cushion on Brian's sofa";
    return `Rummage down Brian's sofa<small>${LC.world.brianState() === 'home' ? 'Quietly... he might hear you' : 'He is out. Go go go!'}</small>`;
  }
  function raidBrianSofa() {
    if (S.items.whoopee && !S.armed.whoopee) { useItem('whoopee'); S.armed.whoopee = true; LC.world.prankFx('whoopee'); say('Whoopee cushion: hidden. Now wait for Brian to sit down.'); return null; }
    const v = clickValue() * 4;
    gain(v); S.stats.brianSofa = (S.stats.brianSofa || 0) + 1;
    LC.audio.sfx('coin');
    if (chance(0.05)) say(pick(["Brian's sofa: a receipt for 40 garden gnomes.", "Brian's sofa: a photo of Brian with the gnome. Both smiling.", "Brian's sofa: a moustache comb.", "Brian's sofa: a note. 'BEAT THE KID.'"]));
    if (LC.world.brianNoise()) say('Brian: "Hello? Is someone in the living room?"');
    return { value: v };
  }
  function fundPrompt() {
    const w = waitFor('fund');
    return w ? `Brian's Thing Fund<small>You've taken enough for now (${w}s)</small>` : `Raid Brian's THING FUND jar<small>It sets him back. Mostly it's just fun.</small>`;
  }
  function raidFund() {
    if (!ready('fund', 120)) { LC.audio.sfx('nope'); return; }
    const n = Math.min(Math.max(lump(120, 5), brianMoney() * 0.02), lump(900, 5));
    gain(n); floatAt(null, n);
    S.brian.p = Math.max(0, S.brian.p - 0.012);
    S.stats.fundRaids = (S.stats.fundRaids || 0) + 1;
    LC.audio.sfx('coin');
    say(pick(['You take a handful from the Thing Fund. Brian will never notice. (He will notice.)', 'The jar says THING FUND. Your pocket now says THING FUND.', 'Sorry, Brian.']));
    LC.world.brianNoise();
  }
  let brianReads = 0;
  function brianComputer() {
    if (++brianReads === 3) { say('In the desk drawer under the computer: an old letter. Brian kept it all these years.'); giveLetter('l6'); return; }
    say(pick([`Brian's spreadsheet. "THING FUND: ${fmt(brianMoney())}. KID: probably about £3."`, 'Brian\'s spreadsheet. Tab 2 is called "WAYS TO STOP THE KID". It is blank. He couldn\'t think of any.', 'Brian\'s spreadsheet. A column called "GNOME BIRTHDAYS".', `Brian's spreadsheet. "Days until The Thing is mine: ${Math.max(1, Math.round((1 - S.brian.p) * 40))}".`]));
  }
  function brianCarPrompt() {
    if (S.items.stink && !S.armed.stink) return "Hide a stink bomb in Brian's car";
    if (S.items.ticket && !S.armed.ticket) return "Put a fake parking ticket on Brian's car";
    return S.armed.stink || S.armed.ticket ? 'The trap is set. Wait for Brian to go out.' : "Brian's car<small>It's very clean. Suspiciously clean.</small>";
  }
  function brianCar() {
    if (S.items.stink && !S.armed.stink) { useItem('stink'); S.armed.stink = true; say('Stink bomb under the seat. Wait for Brian to go to the shops.'); return; }
    if (S.items.ticket && !S.armed.ticket) { useItem('ticket'); S.armed.ticket = true; LC.world.prankFx('ticket'); say('Ticket on the windscreen. Wait for Brian to go out.'); return; }
    say(pick(["Number plate: BR1 AN. Of course.", 'There is a gnome on the dashboard.', 'A sticker says "MY OTHER CAR IS ALSO VERY CLEAN".']));
  }
  function brianLawnPrompt() {
    if (S.goose.friend && waitFor('goosePrank') === 0) return 'Send your goose onto Brian\'s lawn';
    return "Brian's perfect lawn<small>KEEP OFF THE GRASS</small>";
  }
  function brianLawn() {
    if (S.goose.friend && ready('goosePrank', 600)) { prank('goose', 300, 0.02, 'Your goose charges across Brian\'s lawn, honking. Brian runs inside.'); return; }
    say(pick(['Every blade is the same height. Every single one.', 'You step on the lawn. Somewhere, Brian shivers.']));
  }
  function caughtByBrian() {
    S.flags.caught = true;
    modal({ speaker: 'brian', icon: '😠', title: 'Brian', text: 'OI! What are YOU doing in MY house?!', choices: [
      { label: '"...looking for the toilet?"', fn: () => { const n = S.money * 0.05; S.money -= n; S.brian.p = Math.min(1, S.brian.p + 0.01); setTimeout(() => LC.world.throwOut(), 50); doorOpen = false; return { text: `"The toilet. Right. I'm keeping ${fmt(n)} for the stress. OUT."` }; } },
      { label: 'Say nothing and run', fn: () => { setTimeout(() => LC.world.throwOut(), 50); doorOpen = false; if (chance(0.5)) return { text: '"Come back here!" (You got away clean.)' }; const n = S.money * 0.08; S.money -= n; return { text: `He grabs your hood. "That'll be ${fmt(n)}." He throws you out.` }; } },
    ] });
  }
  const BRIAN_CHAT = [
    () => `"Morning kiddo. Thing Fund's looking healthy. ${fmt(brianMoney())}, if you must know."`,
    () => '"Your grandad and I had an understanding. The Thing is MINE."',
    () => '"Lovely day for mowing. Every day is a lovely day for mowing."',
    () => '"Have you seen my gnome looking at you? He does that."',
    () => (S.brian.p > Math.log10(1 + S.money) / 12 ? '"Better hurry up. I\'m winning. 🙂"' : '"You\'re doing... well. Suspiciously well."'),
  ];
  let brianChatIdx = 0;
  function chatBrian() {
    modal({ speaker: 'brian', icon: '👨', title: 'Brian', text: BRIAN_CHAT[brianChatIdx++ % BRIAN_CHAT.length](), choices: [{ label: '"Cool. Bye Brian."' }, { label: '"Mine\'s bigger."', fn: () => ({ text: '"Your WHAT is bigger?" "Hole." "...Mine\'s deeper."' }) }] });
  }
  function setSuspicion(v, seeing) {
    const e = $('#sus');
    e.classList.toggle('show', v > 0.02 || seeing);
    e.classList.toggle('seen', seeing);
    e.querySelector('i').style.width = (v * 100) + '%';
  }

  // ---------- secrets & little earners around town ----------
  function findSecret(id) {
    if (S.secrets.includes(id)) return;
    const sec = LC.SECRETS.find((x) => x.id === id);
    if (!sec) return;
    S.secrets.push(id);
    LC.audio.sfx('sparkle');
    toast(`${ic(sec.icon)}<div><b>Secret found: ${sec.name}</b><br><small>${sec.found}</small></div>`, 'gold');
  }
  // a cooldown helper: true (and restarts the timer) if `secs` have passed
  function ready(key, secs) {
    const now = Date.now();
    if ((S.cooldowns[key] || 0) > now) return false;
    S.cooldowns[key] = now + secs * 1000;
    return true;
  }
  const waitFor = (key) => Math.max(0, Math.ceil(((S.cooldowns[key] || 0) - Date.now()) / 1000));
  function fountainPrompt() {
    const w = waitFor('fountain');
    return w ? `The fountain is empty<small>More wishes in ${w}s</small>` : 'Fish coins out of the fountain<small>Nobody is looking</small>';
  }
  function fountain() {
    if (!ready('fountain', 75)) { LC.audio.sfx('nope'); return; }
    const n = lump(40, 0.3);
    gain(n); floatAt(null, n);
    LC.audio.sfx('splash');
    findSecret('fountain');
    if (chance(0.15)) { S.buttons += 2; say('Among the coins: two buttons. Somebody wished for buttons.'); }
    else say(pick(['You fish out a handful of wishes.', 'Wet coins. Still coins.', "A duck watches you. It won't tell anyone.", 'One of these coins says "please let me pass my driving test".']));
  }
  function checkBench() {
    if (!ready('bench', 45)) { say(pick(["You've already checked. There's only a crisp packet.", 'A pigeon got here first.'])); return; }
    findSecret('bench');
    const r = Math.random();
    if (r < 0.65) { const n = lump(25, 0.2) * (perk('oldman', 3) ? 3 : 1); gain(n); floatAt(null, n); LC.audio.sfx('coin'); say(pick(['Loose change under the bench!', 'A pound coin, stuck to some chewing gum. Worth it.', 'Coins. And a sock. You take the coins.'])); }
    else if (r < 0.75) { S.buttons++; LC.audio.sfx('coin'); say('A button. Of course.'); }
    else if (r < 0.87) { giveItem('glitter'); say("A tube of glitter. Someone's craft project. It's yours now. You know what to do with it."); }
    else say(pick(['Nothing. Just a very old sandwich.', 'A note that says "TOLD YOU - KEN". Grandad was here.', 'An old man is sitting on this bench. He says "no".']));
  }
  function phoneBox() {
    if (!ready('phonebox', 120)) { say(pick(['The coin return is empty.', 'You press the buttons. Nothing happens. It smells of 1994.'])); return; }
    findSecret('phonebox');
    if (chance(0.15)) { LC.audio.sfx('text'); say('The phone rings. You answer. "Hello, is this the sofa?" Click.'); return; }
    if (chance(0.2)) { giveItem('ticket'); say('Someone left a pad of parking tickets in here. They look VERY official.'); return; }
    const n = lump(60, 0.5); gain(n); floatAt(null, n); LC.audio.sfx('coin');
    say(pick(['The coin return clunks. Coins!', 'Somebody forgot their change. Thanks, somebody.', 'Coins! And a business card for a man who fixes ghosts.']));
  }
  function gnomePrompt() { return S.flags.knowsKey && !S.flags.hasKey ? "Look under Brian's gnome" : "Stare at Brian's gnome"; }
  function gnome() {
    if (S.flags.knowsKey && !S.flags.hasKey) {
      S.flags.hasKey = true; LC.audio.sfx('ding');
      toast(`${ic('🗝️')}<div><b>Brian's spare key!</b><br><small>Now you just need him to be out. Or not looking.</small></div>`, 'gold');
      return;
    }
    gnomeStare();
  }
  let gnomeStares = 0;
  function gnomeStare() {
    gnomeStares++;
    if (gnomeStares >= 5) { findSecret('gnome'); say("You stare the gnome down. It blinks first. Inside its tiny notebook: 'KID IS WINNING. TELL BRIAN.'"); return; }
    say(pick(['The gnome is watching you.', 'The gnome has a tiny notebook. Your name is in it.', 'The gnome says nothing. Loudly.', 'You stare at the gnome. The gnome stares back.']));
  }
  const chatIdx = {};
  // ---------- friends ----------
  const hearts = (id) => Math.min(5, Math.floor((S.friends[id] || 0) / 3));
  function perk(id, n) { return hearts(id) >= n; }
  function friendPrompt(id) {
    const f = LC.FRIENDS[id], h = hearts(id);
    const held = S.pockets[held];
    return `Talk to ${f.name} <span class="hearts">${'♥'.repeat(h)}<i>${'♥'.repeat(5 - h)}</i></span><small>${held ? `Press R to give them your ${LC.JUNK[held.id].name.toLowerCase()}` : 'Hold some junk and press R to give it as a present'}</small>`;
  }
  function befriend(id, pts, npc) {
    const before = hearts(id);
    S.friends[id] = Math.min(15, (S.friends[id] || 0) + pts);
    const h = hearts(id);
    if (h <= before) return false;
    const f = LC.FRIENDS[id];
    LC.audio.sfx('fanfare');
    if (h === 5) albumAdd('friends', id);
    if (id === 'postman' && h === 5) S.brian.p = Math.max(0, S.brian.p - 0.05);
    if (id === 'mum' && h === 5) gain(lump(1500, 30));
    if (id === 'lady' && h === 5) S.buttons += 20;
    modal({ speaker: id === 'oldman' || id === 'postman' ? 'man' : id === 'lady' ? 'nan' : 'man', npc, icon: f.icon, title: `${f.name} ${'♥'.repeat(h)}`, text: f.hearts[h - 1], choices: [{ label: h === 5 ? 'Best friends!' : 'Aw.' }] });
    return true;
  }
  function gift(id, npc) {
    const it = S.pockets[held];
    if (!it) { LC.audio.sfx('nope'); return say('You\'re not holding anything to give. Scroll to pick some junk.'); }
    if (!ready('gift_' + id, 30)) return say(`${LC.FRIENDS[id].name} says you've already given them something. "Don\'t spoil me."`);
    S.pockets.splice(held, 1); renderHotbar();
    const loved = LC.FRIENDS[id].likes.includes(it.id);
    LC.audio.sfx(loved ? 'win' : 'ding');
    if (!befriend(id, loved ? 4 : 1, npc)) say(loved ? `"A ${LC.JUNK[it.id].name.toLowerCase()}! I LOVE these!" ♥♥` : `"Oh... a ${LC.JUNK[it.id].name.toLowerCase()}. Thanks." ♥`);
  }
  // little gifts from friends while you play
  let friendTimer = 0;
  function friendTick(dt) {
    if ((friendTimer += dt) < 1) return;
    friendTimer = 0;
    if (perk('jogger', 5) && ready('steve', 200)) { const n = lump(90, 2); gain(n); LC.audio.sfx('coin'); toast(`${ic('🏃')}<div><b>Speedy Steve</b> jogged past and dropped off ${fmt(n)}!</div>`); }
    if (perk('postman', 3) && ready('dave', 240)) { if (giveJunk(randJunk(2), true)) toast(`${ic('📮')}<div><b>Dave the Postie</b> put an unclaimed parcel through your door. Check your pockets!</div>`); }
  }
  function chat(who, npc) {
    if (LC.FRIENDS[who] && ready('chat_' + who, 60)) { S.stats.chats = (S.stats.chats || 0) + 1; if (befriend(who, 1, npc)) return; }
    const lines = LC.CHAT[who] || ['"Hello."'];
    const i = chatIdx[who] = ((chatIdx[who] ?? -1) + 1) % lines.length;
    LC.audio.sfx('babble');
    say(lines[i]);
    if (!S.chatted.includes(who)) S.chatted.push(who);
    if (Object.keys(LC.CHAT).every((k) => S.chatted.includes(k))) findSecret('chatty');
  }

  // ---------- Grandad's letters ----------
  function giveLetter(id) {
    if (S.letters.includes(id)) return;
    const l = LC.LETTERS.find((x) => x.id === id);
    S.letters.push(id); albumAdd('letters', id);
    LC.audio.sfx('ding');
    toast(`${ic('✉️')}<div><b>Grandad's letter (${S.letters.length}/12)</b><br><small>"${l.title}" · read it in your Notes app</small></div>`, 'gold');
  }
  // ---------- the kitchen ----------
  function jarPrompt() { const w = waitFor('jar'); return w ? `Mum's change jar<small>Empty. She'll top it up later (${w}s)</small>` : "Take some coins from Mum's change jar<small>She won't notice. Probably.</small>"; }
  function kitchenJar() {
    if (!ready('jar', 150)) { LC.audio.sfx('nope'); return; }
    const n = lump(60, 0.8); gain(n); floatAt(null, n); LC.audio.sfx('coin');
    S.stats.jar = (S.stats.jar || 0) + 1;
    if (S.stats.jar === 6) { setTimeout(() => { LC.audio.sfx('text'); toast(`${ic('💬')}<div><b>Mum</b><br><small>Has someone been in my change jar?? I know exactly how much was in there.</small></div>`, 'msg'); }, 4000); }
  }
  const washing = () => S.washUntil > Date.now();
  function washPrompt() {
    if (washing()) return `The washing machine is going<small>${Math.ceil((S.washUntil - Date.now()) / 1000)}s left. It's VERY loud.</small>`;
    if (S.washUntil) return 'Empty the washing machine<small>Check the pockets...</small>';
    return 'Put a load of washing on<small>Everyone leaves things in their pockets</small>';
  }
  function washer() {
    if (washing()) { say('Spinning. Something is clanking. Coins, hopefully.'); return; }
    if (S.washUntil) {
      S.washUntil = 0; LC.world.washerShake(false);
      S.stats.washes = (S.stats.washes || 0) + 1;
      const n = lump(150, 2); gain(n); floatAt(null, n); LC.audio.sfx('coin');
      const r = Math.random();
      if (r < 0.2) giveJunk(pick(['sock', 'marble', 'foreign', 'lego', 'bottlecap']));
      else if (r < 0.3) { S.buttons += 3; say('Clean coins, and three buttons. They are VERY clean.'); }
      else if (r < 0.38 && !S.items.whoopee) giveItem('whoopee');
      else say(pick(['Clean coins! Money laundering, but legal.', 'Coins, and one of Dad\'s socks is now pink.', 'A load of warm, clean change.']));
      return;
    }
    S.washUntil = Date.now() + (perk('mum', 3) ? 22500 : 45000); LC.world.washerShake(true); LC.audio.sfx('click');
    say('Washing on. 45 seconds. Go and do something else.');
  }
  // ---------- the loft ----------
  function hatchPrompt() { return S.stallUps.includes('loftpole') ? 'Pull down the loft ladder' : "A loft hatch<small>Too high to reach. Something with a hook on the end might help.</small>"; }
  function hatch() { if (!S.stallUps.includes('loftpole')) { LC.audio.sfx('nope'); say("You jump. You can't reach. Nailed It Hardware might have something."); return; } LC.world.goLoft(); }
  function boxPrompt(i) { return S.boxes.includes(i) ? "Grandad's box<small>You've been through it</small>" : "Look through Grandad's box"; }
  function grandadBox(i) {
    if (S.boxes.includes(i)) { say(pick(['Old photos. Grandad in a very big jumper.', 'Christmas lights. Tangled since 1987.', 'A tin of buttons. You take them all.'])); return; }
    S.boxes.push(i);
    giveLetter(['l1', 'l2', 'l3', 'l4'][i]);
    giveJunk(['medal', 'foreign', 'toycar', 'pipe'][i], true);
    const n = lump(120, 5); gain(n); floatAt(null, n);
  }
  function loftPigPrompt(i) { const h = S.loftPigs[i]; return h === 'done' ? '' : `Smash one of Grandad's old piggy banks<small>${4 - (h || 0)} hits left</small>`; }
  function loftPig(i) {
    if (S.loftPigs[i] === 'done') return null;
    S.loftPigs[i] = (S.loftPigs[i] || 0) + (eff('pig').hits === 0 ? 4 : 1);
    wear('pig');
    LC.audio.sfx('tap');
    if (S.loftPigs[i] < 4) return 'hit';
    S.loftPigs[i] = 'done';
    const n = lump(200 + i * 120, 10); gain(n); floatAt(null, n, 'big'); LC.audio.sfx('smash');
    if (chance(0.4)) giveJunk(pick(['foreign', 'roman', 'medal', 'key']));
    say(pick(['Old coins. Some of them are shillings.', 'Coins from 1972. Still money!', 'A note inside: "FOR A RAINY DAY". It is a rainy day.']));
    return 'smash';
  }
  function trunkPrompt() { return S.flags.trunk ? 'Grandad\'s trunk (open)' : `A locked trunk<small>${S.pockets.some((p) => p.id === 'key') ? 'You have a mystery key...' : 'It needs a key'}</small>`; }
  function trunk() {
    if (S.flags.trunk) { say('Grandad\'s savings book. Every penny he ever found, written down. It adds up to a lot.'); return; }
    const k = S.pockets.findIndex((p) => p.id === 'key');
    if (k < 0) { LC.audio.sfx('nope'); say('Locked. There must be a key somewhere. Keys turn up in odd places.'); return; }
    S.pockets.splice(k, 1); renderHotbar(); S.flags.trunk = true;
    const n = lump(2400, 200); gain(n); floatAt(null, n, 'big'); LC.audio.sfx('fanfare');
    giveLetter('l9');
  }

  // ---------- underground ----------
  function onArea(a) {
    if (a === 'under') { S.flags.wentDown = true; say(pick(['It is dark. It smells of soil and 2p coins.', 'You climb down. Your hole has become... a place.', 'Somewhere, something squeaks.'])); }
    if (a === 'loft') { S.flags.loft = true; say(pick(['The loft. Dusty. Quiet. Full of Grandad\'s things.', 'It smells of old books and Christmas decorations.'])); }
  }
  function pilePrompt(i) { const w = waitFor('pile' + i); return w ? `A pile of junk<small>Searched. Give it ${w}s.</small>` : 'Search the junk pile'; }
  function searchPile(i, tier) {
    if (!ready('pile' + i, 60)) { LC.audio.sfx('nope'); return; }
    LC.audio.sfx('dig');
    if (chance(0.55)) giveJunk(pick(LC.DIG_JUNK[Math.min(tier, LC.DIG_JUNK.length - 1)].ids));
    const n = lump(30 + tier * 30, 0.5); gain(n); floatAt(null, n);
  }
  const underIdx = {};
  function chatUnder(who) { const l = LC.UNDER_CHAT[who]; underIdx[who] = ((underIdx[who] ?? -1) + 1) % l.length; LC.audio.sfx(who === 'rat' ? 'babbleTiny' : 'babbleLow'); say(l[underIdx[who]]); }
  function findRing() {
    if (S.flags.hasRing || S.flags.ringReturned) return;
    S.flags.hasRing = true;
    LC.world.hideRing();
    LC.audio.sfx('fanfare');
    toast(`${ic('💍')}<div><b>A gold ring!</b> There's an inscription: "K & J, 1961".<br><small>Nan will want to see this.</small></div>`, 'gold');
    setTimeout(() => queueEvent(() => EVENTS.find((e) => e.id === 'nan').run()), 20000);
  }
  function chestPrompt() { return S.flags.chest ? 'An empty Roman chest' : 'Open the Roman chest'; }
  function openChest() {
    if (S.flags.chest) { say('Empty. Except for a note: "WE WERE HERE FIRST. - THE ROMANS"'); return; }
    S.flags.chest = true;
    const n = lump(1800, 500); gain(n); floatAt(null, n, 'big');
    giveJunk('helmet', true);
    giveLetter('l7');
    LC.audio.sfx('fanfare');
    toast(`${ic('🏛️')}<div><b>Roman treasure!</b> +${fmt(n)}<br><small>And a centurion's helmet for your pockets.</small></div>`, 'gold');
  }
  function moleKing(npc) {
    if (S.flags.honoraryMole) { modal({ speaker: 'mole', npc, icon: '👑', title: 'The Mole King', text: pick(['"Welcome back, Honorary Mole."', '"The Kingdom prospers. Mostly because of you."', '"Have you tried our market? Very fair prices. For moles."']), choices: [{ label: 'Bow' }] }); return; }
    const shiny = S.pockets.filter((p) => LC.JUNK[p.id].rarity >= 2);
    if (shiny.length >= 3) {
      modal({ speaker: 'mole', npc, icon: '👑', title: 'The Mole King', text: '"You bring SHINY THINGS. Three of them! Give them to me, surface child."', choices: [
        { label: 'Hand them over', fn: () => {
          for (let k = 0; k < 3; k++) { const i = S.pockets.findIndex((p) => LC.JUNK[p.id].rarity >= 2); S.pockets.splice(i, 1); }
          renderHotbar(); S.flags.honoraryMole = true; LC.audio.sfx('fanfare'); setTimeout(() => giveLetter('l8'), 3000);
          return { text: '"I name you HONORARY MOLE. Your digging is doubled. The Mole Market is open to you."' };
        } },
        { label: 'Not yet', cls: 'ghost' },
      ] });
    } else modal({ speaker: 'mole', npc, icon: '👑', title: 'The Mole King', text: `"A surface child. Bring me THREE SHINY THINGS and I shall make you an Honorary Mole." (You have ${shiny.length} uncommon or better.)`, choices: [{ label: 'I\'ll find some' }] });
  }
  function moleMarketPrompt() { return S.flags.honoraryMole ? `Mole Market<small>Sell everything in your pockets for 1.5x (${S.pockets.length} things)</small>` : 'Mole Market<small>"Honorary Moles only."</small>'; }
  function moleMarket() {
    if (!S.flags.honoraryMole) { say('A mole behind the stall shakes its head. "Honorary Moles only."'); return; }
    if (!S.pockets.length) { say('"Bring us surface junk! We love surface junk."'); return; }
    const total = S.pockets.reduce((t, p) => t + p.value * 1.5, 0);
    S.stats.sold = (S.stats.sold || 0) + S.pockets.length; S.stats.soldFor = (S.stats.soldFor || 0) + total;
    S.pockets = []; renderHotbar(); gain(total); floatAt(null, total, 'big'); LC.audio.sfx('buy');
    say(`The moles buy the lot for ${fmt(total)}. One of them is wearing your sock as a hat.`);
  }

  // ---------- things you pick up in the world ----------
  function goldenReward() {
    S.stats.golden++;
    LC.audio.sfx('fanfare');
    const roll = Math.random();
    if (roll < 0.45) { const n = lump(300, 25); gain(n); toast(`${ic('🪙')}<div><b>Golden coin!</b> +${fmt(n)}</div>`, 'gold'); return n; }
    if (roll < 0.75) { addBuff({ id: 'frenzy', icon: '🤑', label: 'Coin Frenzy: income x7', income: 7, secs: 30 }); toast(`${ic('🤑')}<div><b>Coin Frenzy!</b> Income x7 for 30 seconds.</div>`, 'gold'); return null; }
    if (roll < 0.92) { addBuff({ id: 'fingers', icon: '👆', label: 'Golden Fingers: sofa x77', click: 77, secs: 20 }); toast(`${ic('👆')}<div><b>Golden Fingers!</b> Sofa rummaging x77 for 20 seconds. RUN TO THE SOFA.</div>`, 'gold'); return null; }
    LC.world.coinRain(30); toast(`${ic('🌧️')}<div><b>It's raining coins!</b> Run around and grab them!</div>`, 'gold'); return null;
  }
  function collect(kind) {
    if (kind === 'golden') { findSecret('golden'); return goldenReward(); }
    if (kind === 'floor') { findSecret('floor'); S.stats.floor = (S.stats.floor || 0) + 1; }
    if (kind === 'piglet') { const n = lump(60, 1); gain(n); LC.audio.sfx('smash'); return n; }
    const n = kind === 'rain' ? lump(12, 0.05) : lump(8, 0.02);
    gain(n);
    LC.audio.sfx('coin');
    return n;
  }
  const magnet = () => 1.1 + upgradesOf('magnet').reduce((t, u) => t + u.value, 0) + (crafted('supermagnet') ? 2.5 : 0);

  // ---------- random events ----------
  const pending = [];
  function queueEvent(fn) { pending.push(fn); }
  const EVENTS = [
    { id: 'seagull', w: 10, run: () => modal({ speaker: 'seagull', icon: '🐦', title: 'A seagull is eyeing your coins',
      text: 'It has the look of a bird that has done this before.',
      choices: [
        { label: 'Shoo it away', fn: () => { const n = S.money * 0.05; S.money -= n; return { text: `It took ${fmt(n)} on the way out. Classic seagull.` }; } },
        { label: 'Offer it a chip', fn: () => { addBuff({ id: 'seagull', icon: '🍟', label: 'Seagull Ally: income +50%', income: 1.5, secs: 90 }); return { icon: '🍟', text: 'The seagull accepts. It is now on your side. Income +50% for 90 seconds.' }; } },
        { label: 'Fight it', cls: 'danger', fn: () => chance(0.5)
          ? (gain(S.money * 0.25 + 1), { text: 'You win! The seagull drops its stash of stolen coins. +25%!' })
          : (S.money *= 0.85, { text: 'You lose. Badly. It took 15% and your dignity.' }) },
      ] }) },
    { id: 'nan', w: 10, run: () => S.flags.hasRing && !S.flags.ringReturned ? modal({ speaker: 'nan', icon: '💍', title: 'Nan', text: 'Is that... is that KEN\'S RING? Where on earth did you find it?',
      choices: [{ label: 'Give Nan the ring', fn: () => {
        S.flags.ringReturned = true; S.flags.hasRing = false; const n = lump(1200, 50); gain(n); S.flags.nanJumper = true; LC.audio.sfx('fanfare');
        return { icon: '🧶', text: `Nan cries a bit. Then she gives you ${fmt(n)} and a knitted jumper with a coin on it. "He'd be so proud." (All income +10%)` };
      } }] }) : modal({ speaker: 'nan', icon: '👵', title: "Nan's popped round",
      text: 'She has her handbag. The handbag always has something in it.',
      choices: [
        { label: 'Put the kettle on', fn: () => { const n = lump(120, 5); gain(n); return { text: `She gives you ${fmt(n)} and says you look thin.` }; } },
        { label: 'Hide behind the sofa', fn: () => { const n = lump(60, 1); gain(n); return { text: `While hiding you find ${fmt(n)} and three Werther's Originals. She knew you were there.` }; } },
      ] }) },
    { id: 'goose', w: 9, run: () => {
      if (!S.goose.met) return modal({ speaker: 'goose', icon: '🪿', title: 'A goose has entered the garden',
        text: 'It is staring at you. It has not blinked.',
        choices: [
          { label: 'Befriend it', fn: () => { S.goose.met = true; if (chance(0.7)) { S.goose.friend = true; LC.audio.sfx('honk'); return { text: 'The goose accepts you. You are now goose friends. (All income +10%)' }; } LC.audio.sfx('honk'); return { text: 'The goose bites you. It is now hunting you. Keep moving.' }; } },
          { label: 'Honk back', fn: () => { S.goose.met = true; LC.audio.sfx('honk'); S.goose.friend = chance(0.4); return { text: S.goose.friend ? 'The goose respects this. You are now goose friends. (All income +10%)' : 'The goose did not like your accent.' }; } },
          { label: 'Run', cls: 'ghost', fn: () => { S.goose.met = true; return { text: 'You run. The goose follows. The goose will always follow.' }; } },
        ] });
      if (S.goose.friend) { LC.audio.sfx('honk'); const n = lump(240, 5); gain(n); return modal({ speaker: 'goose', icon: '🪿', title: 'Your goose brought you a gift', text: `It's ${fmt(n)}. You decide not to ask where from.` }); }
      LC.audio.sfx('honk');
      return modal({ speaker: 'goose', icon: '🪿', title: 'The goose is back', text: 'It is holding your piggy bank hostage.',
        choices: [
          { label: 'Pay the ransom (8%)', fn: () => { S.money *= 0.92; if (chance(0.5)) { S.goose.friend = true; return { text: 'The goose takes the money, then sits on your lap. You are friends now, apparently. (All income +10%)' }; } return { text: 'The goose takes the money and leaves. Business is business.' }; } },
          { label: 'Honk aggressively', cls: 'danger', fn: () => { LC.audio.sfx('honk'); if (S.pig) S.pig.stored = 0; return { text: 'The goose honks louder. It eats everything in your piggy bank.' }; } },
        ] });
    } },
    { id: 'badger', w: 7, run: () => modal({ speaker: 'badger', icon: '🦡', title: 'The Tax Badger has arrived',
      text: 'He is wearing a tiny tie. He would like his cut.',
      choices: [
        { label: 'Pay him (5%)', fn: () => { S.money *= 0.95; return { text: 'The badger nods respectfully and leaves you a receipt. It is a leaf.' }; } },
        { label: 'Hide in the sofa', fn: () => chance(0.55) ? (gain(lump(90, 2)), { text: 'He gives up. While in the sofa you find a load of coins.' }) : (S.money *= 0.85, { text: 'He found you. He always finds you. 15%, plus a late fee.' }) },
      ] }) },
    { id: 'icecream', w: 8, run: () => modal({ speaker: 'icecream', icon: '🍦', title: 'The ice cream van is playing its song',
      text: 'It is coming down your street. It is not stopping unless you run.',
      choices: [
        { label: 'RUN for a 99', fn: () => { S.money *= 0.98; addBuff({ id: 'brainfreeze', icon: '🍦', label: 'Brain Freeze: clicks x10', click: 10, secs: 30 }); return { text: 'You got one. Brain freeze gives you strange powers. Sofa clicks x10 for 30 seconds!' }; } },
        { label: 'Let it go', cls: 'ghost', fn: () => ({ text: 'You hear the song fading away down the road. A small part of you goes with it.' }) },
      ] }) },
    { id: 'union', w: 6, cond: () => baseIncome() > 1, run: () => modal({ speaker: 'coin', icon: '🪧', title: 'Your coins have formed a union',
      text: 'They demand better working conditions. One of them is holding a tiny sign.',
      choices: [
        { label: 'Give them a day off', fn: () => { addBuff({ id: 'strike', icon: '🪧', label: 'Coins on strike', income: 0, secs: 10 }); setTimeout(() => addBuff({ id: 'happycoins', icon: '😊', label: 'Happy coins: income x3', income: 3, secs: 45 }), 10000); return { text: 'Income stops for 10 seconds. Then they come back refreshed. Income x3 for 45 seconds.' }; } },
        { label: 'Give them a coin bath', fn: () => { S.money *= 0.97; addBuff({ id: 'bath', icon: '🛁', label: 'Clean coins: income +50%', income: 1.5, secs: 120 }); return { text: 'They love it. Income +50% for 2 minutes.' }; } },
      ] }) },
    { id: 'sale', w: 6, run: () => { addBuff({ id: 'sale', icon: '🏷️', label: 'Shop 50% off', cost: 0.5, secs: 25 }); modal({ icon: '🏷️', title: 'EVERYTHING IS HALF PRICE', text: 'For 25 seconds. A man in a van said so. Quick!' }); } },
    { id: 'flip', w: 4, run: () => { S.flags.flipped = true; LC.world.setFlip(true); addBuff({ id: 'flip', icon: '🙃', label: 'Upside down: income x3', income: 3, secs: 15 }); setTimeout(() => LC.world.setFlip(false), 15000); toast(`${ic('🙃')}<div><b>A cursed penny has flipped reality.</b> Income x3 while it lasts.</div>`); } },
    { id: 'goblin', w: 4, run: () => { document.body.classList.add('goblin'); addBuff({ id: 'goblin', icon: '🔤', label: 'Font Goblin: clicks x5', click: 5, secs: 30 }); setTimeout(() => document.body.classList.remove('goblin'), 30000); toast(`${ic('👺')}<div><b>The Font Goblin has struck!</b> Everything looks silly. Clicks x5 for 30 seconds.</div>`); } },
    { id: 'piglets', w: 5, run: () => { LC.world.piglets(3); toast(`${ic('🐽')}<div><b>Your piggy bank has had piglets!</b> Catch them before they get away!</div>`); } },
    { id: 'rain', w: 4, run: () => { LC.world.coinRain(30); toast(`${ic('🌧️')}<div><b>It's raining coins!</b> Run around and grab them!</div>`); } },
    { id: 'fox', w: 6, run: () => modal({ speaker: 'fox', icon: '🦊', title: 'A fox has got into the bins',
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
    { id: 'derek', w: 3, cond: () => !S.flags.derek && !S.flags.derekGone, run: () => modal({ speaker: 'coin', icon: '🪙', title: 'One of your coins has come to life',
      text: 'It says its name is Derek. It would like to stay.',
      choices: [
        { label: 'Keep Derek', fn: () => { S.flags.derek = true; return { text: 'Derek is delighted. Derek helps out. (All income +5%, forever)' }; } },
        { label: 'Spend Derek', cls: 'danger', fn: () => { S.flags.derekGone = true; gain(0.01); return { text: 'You spent Derek. He was 1p. You got a single Haribo. You think about Derek a lot.' }; } },
      ] }) },
    { id: 'meteor', w: 2, run: () => { const n = lump(600, 10); gain(n); modal({ icon: '☄️', title: 'A meteorite has landed in the garden', text: `Scientists rush over. It's a 50p. Well, technically it's worth ${fmt(n)} now because it's from space.` }); } },
    { id: 'doorbell', w: 5, cond: () => baseIncome() > 0.5, run: () => modal({ speaker: 'man', icon: '🛎️', title: 'Ding dong',
      text: 'A man at the door wants to sell you a slightly bigger sofa.',
      choices: [
        { label: 'Buy it (10%)', fn: () => { S.money *= 0.9; const g = [...LC.GENERATORS].reverse().find((x) => (S.gens[x.id] || 0) > 0) || LC.GENERATORS[0]; const free = Math.max(1, Math.ceil((S.gens[g.id] || 0) * 0.1)); S.gens[g.id] = (S.gens[g.id] || 0) + free; return { text: `The sofa comes with ${free} free ${g.name}${free > 1 ? 's' : ''} already inside.` }; } },
        { label: 'No thanks', cls: 'ghost', fn: () => ({ text: 'He leaves. As he goes you notice a goose in the back of his van.' }) },
      ] }) },
    { id: 'buttonman', w: 50, cond: () => S.buttons >= 100 && !S.flags.buttonmanNo, run: () => modal({ speaker: 'buttonman', icon: '🔘', title: 'The Button Man is here',
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
      const evId = weighted(pool.map((e) => [e.id, e.w]));
      const ev = EVENTS.find((e) => e.id === evId);
      S.stats.events++;
      LC.audio.sfx('event');
      ev.run();
    }
    if (now >= nextGoldenAt) { nextGoldenAt = now + rand(90000, 240000); if (LC.world.spawnGolden()) { LC.audio.sfx('sparkle'); toast(`${ic('✨')}<div><b>A golden coin has appeared!</b> Follow the arrow.</div>`, 'gold'); } }
  }

  // ---------- the museum shelf: rare things on display give a permanent bonus this run ----------
  const MUSEUM_BONUS = [0, 0.01, 0.03, 0.06, 0.12];
  function museumBonus() { return S.museum.reduce((t, id) => t + (id ? MUSEUM_BONUS[LC.JUNK[id].rarity] : 0), 0); }
  function museumPrompt(i) {
    const id = S.museum[i];
    if (id) return `${LC.JUNK[id].name}<small>On display. Income +${Math.round(MUSEUM_BONUS[LC.JUNK[id].rarity] * 100)}%</small>`;
    const h = S.pockets[held];
    return h ? `Put the ${LC.JUNK[h.id].name.toLowerCase()} on display<small>For good. Income +${Math.round(MUSEUM_BONUS[LC.JUNK[h.id].rarity] * 100)}%</small>` : 'An empty museum spot<small>Hold something rare and put it on display for a bonus</small>';
  }
  function museumUse(i) {
    if (S.museum[i]) return say(pick(['It looks magnificent.', 'A visitor would be impressed. If you had visitors.', 'You dust it. Lovely.']));
    const h = S.pockets[held];
    if (!h) { LC.audio.sfx('nope'); return; }
    S.museum[i] = h.id; S.pockets.splice(held, 1); renderHotbar(); syncMuseum();
    LC.audio.sfx('win');
    say(`The ${LC.JUNK[h.id].name.toLowerCase()} is now in the Museum of Finds. Income +${Math.round(MUSEUM_BONUS[LC.JUNK[h.id].rarity] * 100)}%`);
  }
  function syncMuseum() { LC.world.setMuseum(S.museum.map((id) => (id ? LC.JUNK[id].icon : null))); }

  // ---------- Grandad's sticker album (kept between runs) ----------
  const ALBUM_SIZE = { junk: () => Object.keys(LC.JUNK).length, finds: () => LC.DIG_FINDS.length, friends: () => Object.keys(LC.FRIENDS).length, town: () => LC.TOWN_EVENTS.length, letters: () => LC.LETTERS.length };
  function albumAdd(page, id) {
    const list = S.album[page];
    if (!list || list.includes(id)) return;
    list.push(id);
    const def = LC.ALBUM_PAGES.find((p) => p.id === page);
    if (list.length === ALBUM_SIZE[page]()) { LC.audio.sfx('fanfare'); toast(`${ic('📒')}<div><b>Sticker album page complete: ${def.name}!</b><br><small>Income +${def.bonus * 100}% for good</small></div>`, 'gold'); }
    else setTimeout(() => toast(`${ic('⭐')}<div>New sticker for Grandad's album! <small>(${def.name} ${list.length}/${ALBUM_SIZE[page]()})</small></div>`), 1500);
  }
  function albumBonus() { return LC.ALBUM_PAGES.reduce((t, p) => t + ((S.album[p.id] || []).length >= ALBUM_SIZE[p.id]() ? p.bonus : 0), 0); }
  function renderAlbum() {
    const pages = LC.ALBUM_PAGES.map((p) => {
      const got = S.album[p.id] || [];
      let items = [];
      if (p.id === 'junk') items = Object.entries(LC.JUNK).map(([k, j]) => [got.includes(k), j.icon, j.name]);
      if (p.id === 'finds') items = LC.DIG_FINDS.map((f) => [got.includes(f.name), f.icon, f.name]);
      if (p.id === 'friends') items = Object.entries(LC.FRIENDS).map(([k, f]) => [got.includes(k), f.icon, f.name]);
      if (p.id === 'town') items = LC.TOWN_EVENTS.map((e) => [got.includes(e.id), e.icon, e.name]);
      if (p.id === 'letters') items = LC.LETTERS.map((l) => [got.includes(l.id), '✉️', l.title]);
      const done = got.length >= items.length;
      return `<div class="album-page ${done ? 'done' : ''}"><div class="sub-title">${ic(p.icon)} ${p.name} <span class="muted">${got.length}/${items.length}${done ? ' · complete! +' + p.bonus * 100 + '%' : ' · fill it for +' + p.bonus * 100 + '%'}</span></div>
        <div class="stickers">${items.map(([has, icon, name]) => `<div class="sticker ${has ? 'got' : ''}" title="${has ? name : '???'}">${has ? ic(icon) : '?'}<small>${has ? name : '???'}</small></div>`).join('')}</div></div>`;
    }).join('');
    $('#album-view').innerHTML = `<p class="muted small">Grandad's old sticker album. You get a sticker the first time you find anything. The album stays with you, even after an ending.</p>${pages}`;
  }
  function renderFriends() {
    $('#friends-view').innerHTML = `<p class="muted small">Chat to people around town (once a minute each) and give them presents. Hold some junk, look at them and press <kbd>R</kbd>.</p>` +
      Object.entries(LC.FRIENDS).map(([k, f]) => {
        const h = hearts(k), met = (S.friends[k] || 0) > 0;
        return `<div class="friend ${met ? '' : 'unmet'}">${ic(f.icon)}<div><b>${met ? f.name : 'Someone in town'}</b> <span class="hearts">${'♥'.repeat(h)}<i>${'♥'.repeat(5 - h)}</i></span>
          <small>${met ? f.likeText : 'Go and say hello.'}</small>
          <small class="perks">${[3, 5].map((n) => `<span class="${h >= n ? 'on' : ''}">${n}♥ ${h >= n || met ? f.perks[n] : '???'}</span>`).join('')}</small></div></div>`;
      }).join('');
  }

  // ---------- town events: 5 or 6 random ones each run, roughly every 20 minutes ----------
  function townSetup() {
    if (S.town) return;
    const ids = LC.TOWN_EVENTS.map((e) => e.id).sort(() => Math.random() - 0.5);
    S.town = { queue: ids.slice(0, chance(0.5) ? 5 : 6), next: rand(600, 780), on: null, until: 0, seen: [], used: {} };
  }
  const townOn = (id) => S.town && S.town.on === id;
  const townDef = (id) => LC.TOWN_EVENTS.find((e) => e.id === id);
  function townTick(dt) {
    townSetup();
    const T = S.town;
    if (T.on) {
      T.until -= dt;
      if (T.on === 'storm' && chance(dt / 7)) LC.world.coinRain(8);
      if (T.on === 'treasure' && !T.used.clue2 && T.until < townDef('treasure').secs - 70) { T.used.clue2 = true; radio(LC.TREASURE_CLUES[T.used.spot][1]); }
      if (T.until <= 0) townEnd();
      return;
    }
    T.next -= dt;
    // only start when you're in town and free, so you actually see it
    if (T.next <= 0 && !modalOpen && !endingPlaying && LC.world.area() === 'town' && T.queue.length) townStart(T.queue.shift());
  }
  function townStart(id) {
    const T = S.town, e = townDef(id);
    T.on = id; T.until = e.secs; T.used = {}; if (!T.seen.includes(id)) T.seen.push(id);
    albumAdd('town', id);
    S.stats.townEvents = (S.stats.townEvents || 0) + 1;
    LC.world.townEvent(id, true);
    LC.audio.sfx('event');
    toast(`${ic(e.icon)}<div><b>${e.name}!</b><br><small>${e.news}</small><br><small><b>${e.tip}</b></small></div>`, 'gold');
    if (id === 'party') addBuff({ id: 'town', icon: e.icon, label: 'Street party: income +25%', income: 1.25, secs: e.secs });
    if (id === 'snow') addBuff({ id: 'town', icon: e.icon, label: 'Snow day: income +50%', income: 1.5, secs: e.secs });
    if (id === 'powercut') addBuff({ id: 'town', icon: e.icon, label: 'Power cut: rummaging ×3', click: 3, secs: e.secs });
    if (id === 'pigeons' && (S.gens.pigeons || 0) > 0) { S.flags.pigeonStrike = true; say('Your pigeons have stopped working. They\'re holding little signs.'); }
    if (id === 'treasure') { T.used.spot = LC.world.treasureSpot(); setTimeout(() => radio(LC.TREASURE_CLUES[T.used.spot][0]), 4000); }
    if (id === 'bbq') { say('Brian\'s in his front garden, burning sausages. His back door is wide open.'); }
    if (id === 'geese') T.used.bites = 0;
  }
  function townEnd() {
    const T = S.town, e = townDef(T.on);
    LC.world.townEvent(T.on, false);
    if (T.on === 'pigeons') S.flags.pigeonStrike = false;
    if (T.on === 'geese' && T.used.bites < 3) { const n = lump(300, 5); gain(n); toast(`${ic('🛡️')}<div><b>You survived the goose invasion!</b><br><small>Only ${T.used.bites} bites. The council gives you ${fmt(n)} for bravery.</small></div>`, 'gold'); }
    else toast(`${ic(e.icon)}<div>${e.end}</div>`);
    S.buffs = S.buffs.filter((b) => b.id !== 'town'); renderBuffs();
    T.on = null; T.until = 0; T.next = rand(1080, 1440);
  }
  function radio(line) { LC.audio.sfx('text'); toast(`${ic('📻')}<div><b>Radio Acacia FM:</b> "${line}"</div>`, 'msg'); }
  const once = (key) => { if (S.town.used[key]) return false; S.town.used[key] = true; return true; };
  // how busy the stall is during an event (0 = shut)
  function townStallRate() {
    if (!S.town || !S.town.on) return 1;
    return { party: 3, heatwave: 2, marathon: 2, storm: 0, geese: 0.3, mayor: 1.5, funfair: 1.3 }[S.town.on] ?? 1;
  }
  const randJunk = (maxR = 2) => pick(Object.keys(LC.JUNK).filter((k) => LC.JUNK[k].rarity <= maxR && !LC.JUNK[k].noDrop));
  function hookADuck() {
    const cost = lump(20, 0.5);
    if (!spend(cost)) { say(`It's ${fmt(cost)} a go. You can't afford a duck.`); LC.audio.sfx('nope'); return; }
    LC.audio.sfx('ding');
    const r = Math.random();
    if (r < 0.1) { giveJunk(randJunk(3)); say('You hooked the GOLDEN duck! Top shelf prize!'); }
    else if (r < 0.55) { giveJunk(randJunk(1)); say(pick(['Every duck wins a prize. This prize is... something.', 'A prize! Technically.'])); }
    else { const n = lump(45, 1); gain(n); floatAt(null, n); say('The man gives you change from the wrong pocket. Result.'); }
  }
  function binPrompt(key) { return S.town.used['bin' + key] ? 'Already searched this bin' : 'Search the wheelie bin<small>Bin day. One person\'s rubbish...</small>'; }
  function bin(key) {
    if (!once('bin' + key)) return say(pick(['Already been through that one. It still smells.', 'Nothing left in there but regret.']));
    LC.audio.sfx('tap');
    const r = Math.random();
    if (r < 0.4) giveJunk(randJunk(r < 0.06 ? 3 : 2));
    else if (r < 0.85) { const n = lump(35, 0.5); gain(n); floatAt(null, n); say(pick(['Coins at the bottom of the bin. Gross. Worth it.', 'A crisp packet full of change. Someone\'s secret stash.'])); }
    else say(pick(['Just a banana skin. And now it\'s on you.', 'A very angry cat. You close the lid.', 'Mrs Patel\'s bin is spotless. She\'s cleaned her rubbish.']));
  }
  function cheer() {
    if (!ready('cheer', 2.5)) return;
    LC.audio.sfx(pick(['tap', 'click']));
    S.town.used.cheers = (S.town.used.cheers || 0) + 1;
    if (chance(0.3)) { const n = lump(15, 0.3); gain(n); floatAt(null, n); say(pick(['A runner high-fives you and drops some coins!', '"THANKS KID!" They throw you their spare change.'])); }
    else say(pick(['GO ON!!', 'YOU CAN DO IT!', 'Nice legs, mate!', 'Only 25 miles to go!']));
    if (S.town.used.cheers === 15) { const n = lump(240, 5); gain(n); say(`The race organiser loves you. Best cheerer ever. ${fmt(n)} prize!`); LC.audio.sfx('fanfare'); }
  }
  function filmExtra(npc) {
    const T = S.town;
    if (T.used.filmed) return say('"That\'s a wrap on you, kid. Lovely work."');
    if (!T.used.briefed) {
      T.used.briefed = true;
      return modal({ speaker: 'director', npc, icon: '🎬', title: 'The film director', text: 'You! Kid! We need an extra. Stand on the red X and look like you\'ve lost something. Then talk to me.', choices: [{ label: 'I was BORN for this' }, { label: 'What\'s the film?', fn: () => ({ text: 'It\'s called "Loose Change". Gritty drama about a kid saving up for something. Nobody will watch it.' }) }] });
    }
    if (!LC.world.onFilmMark()) return say('"No no no. On the X! The RED X!"');
    T.used.filmed = true;
    const n = lump(600, 10); gain(n); floatAt(null, n); LC.audio.sfx('fanfare');
    S.flags.filmStar = true;
    modal({ speaker: 'director', npc, icon: '🎬', title: 'ACTION!', text: `You look at the floor sadly. The director cries. "GENIUS." He pays you ${fmt(n)}. You'll be in the credits as "Kid Who Looks Sad".` });
  }
  function iceCream() {
    const cost = lump(30, 1);
    if (!spend(cost)) { LC.audio.sfx('nope'); return say(`A 99 is ${fmt(cost)}. Daylight robbery.`); }
    LC.audio.sfx('ding');
    addBuff({ id: 'icecream', icon: '🍦', label: 'Brain freeze: rummaging ×2', click: 2, secs: 60 });
    say(pick(['BRAIN FREEZE. You can see through time. Rummaging ×2.', 'A 99 with a flake. You are unstoppable.', 'It drips on your shoe. Still worth it.']));
  }
  function snowman() {
    if (!once('snowman')) return say('The snowman has nothing left to give. Just a carrot.');
    const n = lump(400, 8); gain(n); floatAt(null, n); LC.audio.sfx('coin');
    say(`Inside the snowman: a frozen bag of coins! ${fmt(n)}! Whose snowman IS this?`);
  }
  function mayor(npc) {
    if (!once('mayor')) return say('The Mayor has already shaken your hand. Twice would be weird.');
    const n = lump(300, 5); gain(n);
    modal({ speaker: 'mayor', npc, icon: '🎩', title: 'The Mayor', text: `Ah! A young entrepreneur! I've heard about your little stall. Have ${fmt(n)} from the town's Small Business Fund. Don't tell Brian. He applied eleven times.`,
      choices: [{ label: 'Thank you, Mayor!' }, { label: 'Can I have your chain?', fn: () => ({ text: 'No. But he laughs, and gives you a commemorative pen. It is worth nothing.' }) }] });
  }
  function treasureDig() {
    if (!once('treasure')) return say('Already dug. Just a hole now.');
    LC.audio.sfx('fanfare'); LC.world.coinRain(12);
    const n = lump(900, 15); gain(n); floatAt(null, n);
    if (chance(0.5)) giveJunk(randJunk(3), true);
    S.flags.treasureHunter = true;
    radio(`WE HAVE A WINNER! A kid from Acacia Road found the prize! ${fmt(n)}!`);
  }
  function pigeonStrike(npc) {
    if (!S.flags.pigeonStrike) return say('Don Coo-leone nods at you. Respect.');
    const cost = lump(120, 2);
    modal({ speaker: 'pigeon', npc, icon: '🐦', title: 'Don Coo-leone', text: 'Coo. You come to me, on the day of the strike, asking me to work. Coo. My birds want better bread. Seeded. None of that white stuff.',
      choices: [
        { label: `Pay for seeded bread (${fmt(cost)})`, fn: () => { if (!spend(cost)) return { text: 'You can\'t afford it. The Don looks disappointed in you.' }; S.flags.pigeonStrike = false; S.boosts.pigeons = Date.now() + 120000; return { text: 'The strike is over! The pigeons are so happy they work at triple speed for 2 minutes.' }; } },
        { label: 'Make him an offer he can\'t refuse', fn: () => chance(0.4) ? (S.flags.pigeonStrike = false, { text: 'You offer him a whole sausage roll. His eyes water. The strike is over.' }) : { text: '"Coo." He refuses. You hear a lot of cooing behind you. You leave.' } },
        { label: 'Leave it', cls: 'ghost' },
      ] });
  }
  function saleSofa() {
    if (!ready('salesofa', 0.35)) return null;
    const v = clickValue() * 4; gain(v); LC.audio.sfx('coin', 1.2);
    S.stats.clicks++;
    if (chance(0.04)) giveJunk(randJunk(2));
    return { value: v };
  }
  function bbqSausage() {
    if (!ready('sausage', 20)) return say('Brian is looking this way. Wait a bit.');
    addBuff({ id: 'sausage', icon: '🌭', label: 'Pinched sausage: income +20%', income: 1.2, secs: 60 });
    LC.audio.sfx('ding');
    say(pick(['You pinch a sausage. Brian thinks it was the dog.', 'Burnt on the outside, raw in the middle. Classic Brian.', 'You grab a burger. It\'s mostly charcoal. Delicious.']));
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
    closeScreen();
    LC.world.unlock();
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
      again.onclick = () => { scr.classList.remove('show', 'upside'); endingPlaying = false; newRun(); LC.world.lock(); };
      box.appendChild(again);
      scr.querySelector('.ending-inner').appendChild(box);
    }, 900 + e.lines.length * 2200 + 600);
  }
  function newRun() {
    S = freshRun({ endings: S.endings, achievements: S.achievements, runs: S.runs + 1, allTime: S.allTime, settings: S.settings, secrets: S.secrets, album: S.album });
    newPig(); card = null; renderCard();
    renderShop(true); gardenDirty = true; buildGarden();
    LC.world.reset();
    LC.world.setLoftPigs([]);
    gooseShown = '';
    save();
    LC.audio.music(S.settings.music);
  }

  // ---------- HUD ----------
  function renderTop() {
    $('#money').textContent = fmt(S.money);
    $('#rate').textContent = fmtRate(income());
    const p = Math.min(1, S.money / LC.THING_COST);
    $('#thing-bar').style.width = (p * 100).toFixed(3) + '%';
    $('#thing-pct').textContent = (p * 100).toFixed(p < 0.01 ? 4 : 2) + '%';
    $('#thing').classList.toggle('ready', p >= 1);
    $('#buttons-count').textContent = fmtInt(S.buttons);
  }
  function renderBuffs() {
    const box = $('#buffs');
    const now = Date.now();
    box.innerHTML = S.buffs.map((b) => `<div class="buff" title="${b.label}">${ic(b.icon)}<span>${b.label}</span><i style="width:${Math.max(0, (b.until - now) / (b.total * 1000)) * 100}%"></i></div>`).join('');
  }
  function thingPrompt() {
    const p = S.money / LC.THING_COST;
    if (p >= 1) return '<b>Buy The Thing</b>. This is it.';
    return `The Thing. You're saving up for it. Price: <b>${fmt(LC.THING_COST)}</b><small>${(p * 100).toFixed(p < 0.01 ? 4 : 2)}% saved</small>`;
  }
  function tryBuyThing() {
    if (S.money < LC.THING_COST) { LC.audio.sfx('nope'); say(pick(["You lift the sheet a tiny bit. You can't see anything. You put it back.", "It's not time yet.", "You poke it. It feels expensive."])); return; }
    modal({ icon: '❓', title: 'Buy The Thing?', text: `You've saved up ${fmt(LC.THING_COST)}. This is it. Whatever it is.`,
      choices: [{ label: 'Buy it', fn: () => { closeModal(); buyThing(); } }, { label: 'Wait...', cls: 'ghost' }] });
  }
  function sofaPrompt() {
    const fingers = S.buffs.some((b) => b.id === 'fingers');
    return `Rummage down the back of the sofa${fingers ? ' <b>(GOLDEN FINGERS!)</b>' : ''}<small>Hold to keep rummaging</small>`;
  }
  function digPrompt() {
    if (S.depth >= LC.EARTH_DIAMETER) return 'The hole goes all the way through.';
    return `Dig the hole: <b>${fmtDepth(S.depth)}</b> deep<small>Who knows what's down there</small>`;
  }

  // ---------- screens: the phone, the shed, the corner shop ----------
  const APPS = [
    { id: 'roster', icon: '👥', label: 'Helpers', color: '#f2b631' },
    { id: 'messages', icon: '💬', label: 'Messages', color: '#5bc236' },
    { id: 'notes', icon: '📝', label: 'Notes', color: '#ffd84a' },
    { id: 'bank', icon: '🏦', label: 'Bank', color: '#3b6ea5' },
    { id: 'weather', icon: '⛅', label: 'Weather', color: '#8fd0e8' },
    { id: 'secrets', icon: '🔍', label: 'Secrets', color: '#e58a6b' },
    { id: 'friends', icon: '🤝', label: 'Friends', color: '#e86a8a' },
    { id: 'album', icon: '📒', label: 'Sticker album', color: '#5bb0e0' },
    { id: 'notebook', icon: '📊', label: 'Stats', color: '#9b59b6' },
    { id: 'endings', icon: '🏁', label: 'Endings', color: '#2d2118' },
    { id: 'settings', icon: '⚙️', label: 'Settings', color: '#8f8f8f' },
  ];
  const SCREENS = {
    phone: { title: 'Phone', icon: '📱' },
    shed: { title: 'The Shed', icon: '🛖', tabs: [['shed', '⛏️', 'Diggers'], ['workbench', '🔧', 'Workbench']] },
    corner: { title: 'Corner Shop', icon: '🏪', tabs: [['shop-corner', '🍬', 'Treats & gear'], ['scratch', '🎟️', 'Scratchcards']] },
    charity: { title: 'Second Chances Charity Shop', icon: '🧥', tabs: [['shop-charity', '🧥', 'Everything 50p*']] },
    hardware: { title: 'Nailed It Hardware', icon: '🔨', tabs: [['shop-hardware', '🔨', 'Tools']] },
    board: { title: 'Notice Board', icon: '📌', tabs: [['finders', '📌', 'Help wanted']] },
  };
  let screenOpen = null, phoneApp = null, msgThread = null, openNote = null;
  function openScreen(name, tab) {
    screenOpen = name;
    LC.world.unlock();
    hideTip();
    const card = $('.screen-card');
    card.classList.toggle('phone', name === 'phone');
    $('#screen').classList.add('show');
    $('#pause').classList.remove('show');
    LC.audio.sfx('open');
    if (name === 'phone') { $('#screen-tabs').innerHTML = ''; if (tab) openApp(tab); else phoneHome(); return; }
    const def = SCREENS[name];
    $('#screen-title').innerHTML = `${ic(def.icon)} ${def.title}`;
    $('#screen-close').innerHTML = 'Back <kbd>Esc</kbd>';
    const tabs = $('#screen-tabs');
    tabs.innerHTML = def.tabs.length > 1 ? def.tabs.map(([id, icon, label]) => `<button class="tab" data-tab="${id}">${ic(icon)} ${label}</button>`).join('') : '';
    tabs.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { LC.audio.sfx('click'); setTab(b.dataset.tab); }));
    setTab(tab || def.tabs[0][0]);
  }
  function phoneHome() {
    phoneApp = null; msgThread = null; openNote = null;
    $('#screen-title').innerHTML = '';
    $('#screen-tabs').innerHTML = '';
    $('#screen-close').innerHTML = 'Put away <kbd>Esc</kbd>';
    renderHome();
    setTab('home');
  }
  function openApp(id) {
    const app = APPS.find((a) => a.id === id);
    phoneApp = id;
    $('#screen-title').innerHTML = `${ic(app.icon)} ${app.label}`;
    $('#screen-close').innerHTML = '‹ Home';
    LC.audio.sfx('click');
    setTab(id);
  }
  function back() {
    if (screenOpen === 'phone') {
      if (msgThread || openNote) { msgThread = null; openNote = null; renderPhoneApp(phoneApp); return; }
      if (phoneApp) { phoneHome(); return; }
    }
    closeScreen();
  }
  function closeScreen() {
    if (!screenOpen) return;
    screenOpen = null; phoneApp = null;
    hideTip();
    $('#screen').classList.remove('show');
    LC.audio.sfx('click');
    LC.world.lock();
  }
  let shopOpen = null;
  function setTab(id) {
    document.querySelectorAll('#screen-tabs .tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
    shopOpen = id.startsWith('shop-') ? id.slice(5) : null;
    const panel = shopOpen ? 'shop' : id;
    document.querySelectorAll('.panel').forEach((p) => (p.hidden = p.id !== 'panel-' + panel));
    if (shopOpen) renderShopPanel();
    if (id === 'workbench') renderWorkbench();
    if (id === 'roster') renderRoster();
    if (id === 'notebook') renderStats();
    if (id === 'endings') renderEndings();
    if (id === 'finders' || id === 'upgrades') renderShop(true);
    if (id === 'shed') { gardenDirty = true; renderGarden(); }
    if (id === 'scratch') { renderShopCards(); setTimeout(renderCard, 0); }
    renderPhoneApp(id);
  }

  // ---------- shops: what each one sells ----------
  function shopItems(shop) {
    const out = [];
    const seen = (u) => S.lifetime >= u.cost * 0.3;
    if (shop === 'corner') {
      if (S.request && !S.items[S.request.item]) {
        const r = S.request;
        out.push({ key: 'treat', icon: r.icon, name: r.name, desc: `${r.text} Give them to a ${r.gen === 'cat' ? 'cat' : r.gen === 'brother' ? 'your brother' : 'detectorist'}.`, cost: lump(45, 2), buy: () => { S.items[r.item] = 1; toast(`${ic(r.icon)}<div><b>${r.name}</b> in your pocket. Go and give them to your helper!</div>`); } });
      }
      // treats & gear for each kind of helper: just the next one for each
      for (const g of LC.GENERATORS) {
        const owned = S.gens[g.id] || 0;
        const u = GEN_UPS.find((x) => x.gen === g.id && !has(x.id));
        if (u && owned >= u.at) out.push({ key: u.id, icon: g.icon, name: u.name, desc: `For your ${g.name}s: they find twice as much.`, cost: upCost(u), buy: () => S.upgrades.push(u.id) });
        else if (u && owned > 0) out.push({ key: u.id, icon: g.icon, name: u.name, desc: `Needs ${u.at} ${g.name}s (you have ${owned}).`, cost: upCost(u), locked: true });
      }
    }
    for (const u of LC.UPGRADES.filter((x) => x.shop === shop && !has(x.id) && (seen(x) || u.kind === 'letter'))) out.push({ key: u.id, icon: u.icon, name: u.name, desc: u.desc, cost: upCost(u), buy: () => { S.upgrades.push(u.id); if (u.kind === 'letter') giveLetter(u.value); } });
    if (shop === 'hardware') {
      for (const k of ['sofa', 'pig', 'dig']) {
        const t = (S.tools[k] || 0) + 1, def = LC.TOOLS[k][t];
        if (def) out.unshift({ key: 'tool-' + k, icon: def.icon, name: def.name, desc: `${def.desc} Lasts ${def.dur} uses.`, cost: def.cost * costMult(), buy: () => { S.tools[k] = t; S.toolDur[k] = def.dur; } });
      }
      for (const x of LC.HARDWARE_EXTRAS) if (!S.stallUps.includes(x.id) && seen(x)) out.push({ key: x.id, icon: x.icon, name: x.name, desc: x.desc, cost: x.cost * costMult(), buy: () => { S.stallUps.push(x.id); renderHotbar(); } });
    }
    return out;
  }
  const SHOP_FLAVOUR = {
    corner: '"Treats for your helpers. And sweets for you, if you\'re good." The man behind the counter is also selling scratch cards.',
    charity: 'Everything is 50p.* (*Nothing is 50p.) It smells of old books and mystery.',
    hardware: '"Tools, love? We\'ve got tools." There is a man here who has been choosing a screwdriver since 2003.',
  };
  function renderShopPanel() {
    const items = shopItems(shopOpen);
    $('#shop-view').innerHTML = `<p class="muted shop-flavour">${SHOP_FLAVOUR[shopOpen] || ''}</p><div class="shelf">` + (items.map((it, i) =>
      `<button class="product ${it.locked ? 'locked' : S.money < it.cost ? 'poor' : ''}" data-i="${i}">${ic(it.icon)}<b>${it.name}</b><small>${it.desc}</small><span class="price-tag">${fmt(it.cost)}</span></button>`).join('') || '<p class="muted">Sold out. Come back when you\'re richer.</p>') + '</div>';
    $('#shop-view').querySelectorAll('.product').forEach((b) => (b.onclick = () => {
      const it = items[+b.dataset.i];
      if (it.locked || !spend(it.cost)) { LC.audio.sfx('nope'); return; }
      it.buy(); LC.audio.sfx('buy'); renderShopPanel();
    }));
  }
  // ---- the shed workbench: repairs and crafting ----
  function renderWorkbench() {
    const repairs = ['sofa', 'pig', 'dig'].filter((k) => S.tools[k] > 0).map((k) => {
      const t = S.tools[k], def = LC.TOOLS[k][t], left = S.toolDur[k] ?? def.dur, cost = def.cost * 0.15;
      return `<div class="bench-row">${ic(def.icon)}<div><b>${def.name}</b><div class="dur"><i style="width:${(left / def.dur) * 100}%"></i></div><small>${left <= 0 ? 'BROKEN' : `${left} / ${def.dur} uses left`}</small></div>${left < def.dur ? `<button class="btn small" data-repair="${k}">Repair ${fmt(cost)}</button>` : ''}</div>`;
    }).join('') || '<p class="muted small">No tools yet. Nailed It Hardware sells them.</p>';
    const have = (id) => S.pockets.filter((p) => p.id === id).length;
    const recipes = LC.RECIPES.filter((r) => !crafted(r.id)).map((r) => {
      const ok = r.needs.every((id) => have(id) >= r.needs.filter((x) => x === id).length) && (!r.minGen || (S.gens[r.minGen[0]] || 0) >= r.minGen[1]);
      return `<div class="bench-row">${ic(r.icon)}<div><b>${r.name}</b><small>${r.desc}</small><div class="needs">${r.needs.map((id) => `<span class="${have(id) ? 'got' : ''}">${ic(LC.JUNK[id].icon, 'tiny')} ${LC.JUNK[id].name}</span>`).join('')}${r.minGen ? `<span class="${(S.gens[r.minGen[0]] || 0) >= r.minGen[1] ? 'got' : ''}">${r.minGen[1]} ${LC.GENERATORS.find((g) => g.id === r.minGen[0]).name}s</span>` : ''}</div></div><button class="btn small ${ok ? '' : 'ghost'}" data-craft="${r.id}" ${ok ? '' : 'disabled'}>Make it</button></div>`;
    }).join('');
    $('#workbench-view').innerHTML = `<div class="sub-title">Repairs</div>${repairs}<div class="sub-title">Make something from junk</div><p class="muted small">Uses junk from your pockets.</p>${recipes || '<p class="muted">You\'ve made everything!</p>'}`;
    $('#workbench-view').querySelectorAll('[data-repair]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.repair, def = LC.TOOLS[k][S.tools[k]];
      if (!spend(def.cost * 0.15)) { LC.audio.sfx('nope'); return; }
      S.toolDur[k] = def.dur; LC.audio.sfx('buy'); renderWorkbench();
    }));
    $('#workbench-view').querySelectorAll('[data-craft]').forEach((b) => (b.onclick = () => {
      const r = LC.RECIPES.find((x) => x.id === b.dataset.craft);
      for (const id of r.needs) S.pockets.splice(S.pockets.findIndex((p) => p.id === id), 1);
      S.crafted.push(r.id); renderHotbar();
      LC.audio.sfx('fanfare');
      toast(`${ic(r.icon)}<div><b>You made: ${r.name}!</b><br><small>${r.desc}</small></div>`, 'gold');
      if (r.id === 'robocat') LC.world.evolve('cat');
      renderWorkbench();
    }));
  }
  // ---- helper roster (phone) and requests ----
  const helperNames = (id, n) => { const names = LC.HELPER_NAMES[id] || []; const list = names.slice(0, Math.min(n, 3)); return list.join(', ') + (n > list.length ? ` and ${n - list.length} more` : ''); };
  function renderRoster() {
    const rows = LC.GENERATORS.filter((g) => S.gens[g.id] > 0).map((g) => {
      const boosted = (S.boosts[g.id] || 0) > Date.now();
      return `<div class="bench-row">${ic(g.icon)}<div><b>${g.name} x${S.gens[g.id]}</b><small>${helperNames(g.id, S.gens[g.id])}</small><small>${fmtRate(genIncome(g) * globalMult())}${boosted ? ' · <b>3x BOOST!</b>' : ''}</small></div></div>`;
    }).join('');
    const req = S.request ? `<div class="request">${ic(S.request.icon)}<div><b>Request!</b><small>${S.request.text} Get ${S.request.name.toLowerCase()} from the corner shop. ${Math.ceil((S.request.until - Date.now()) / 1000)}s left.</small></div></div>` : '';
    $('#roster-view').innerHTML = req + (rows || '<p class="muted">No helpers yet. There is a notice board outside the post office...</p>');
  }
  function requestTick(now) {
    if (S.request && now > S.request.until) { say(`Too late. ${S.request.gen === 'cat' ? 'The cats' : S.request.gen === 'brother' ? 'Your brother' : 'The detectorists'} gave up waiting.`); S.request = null; delete S.items.sardines; delete S.items.haribo; delete S.items.batteries; }
    if (S.request || S.lifetime < 50) return;
    if (!S.nextRequestAt) S.nextRequestAt = now + 240000;
    if (now < S.nextRequestAt) return;
    S.nextRequestAt = now + rand(300000, 480000);
    const options = LC.REQUESTS.filter((r) => (S.gens[r.gen] || 0) > 0);
    if (!options.length) return;
    S.request = Object.assign({ until: now + 240000 }, pick(options));
    LC.audio.sfx('text');
    toast(`${ic(S.request.icon)}<div><b>Request:</b> ${S.request.text}<br><small>Get some from the corner shop and give it to them.</small></div>`, 'msg');
  }
  // the world calls this when you interact with a helper; true if a request was fulfilled
  function helperUse(gen) {
    const r = S.request;
    if (!r || r.gen !== gen || !S.items[r.item]) return false;
    delete S.items[r.item];
    S.request = null;
    S.boosts[gen] = Date.now() + 300000;
    LC.audio.sfx('fanfare');
    toast(`${ic(r.icon)}<div><b>They love it!</b><br><small>${LC.GENERATORS.find((g) => g.id === gen).name}s work 3x harder for 5 minutes.</small></div>`, 'gold');
    return true;
  }

  // ---------- phone apps ----------
  const unreadTexts = () => Object.values(S.texts).filter((t) => !t.read).length;
  const unlockedNotes = () => LC.NOTES.filter((n) => S.notesSeen.includes(n.id));
  const newNotes = () => unlockedNotes().filter((n) => !S.openedNotes.includes(n.id)).length;
  function appBadge(id) {
    if (id === 'messages') return unreadTexts();
    if (id === 'notes') return newNotes();
    if (id === 'roster') return S.request ? 1 : 0;
    return 0;
  }
  function renderHome() {
    const now = new Date();
    $('#phone-clock').textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    $('#phone-date').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · Summer holidays';
    const grid = $('#app-grid');
    if (!grid.children.length) {
      grid.innerHTML = APPS.map((a) => `<button class="app" data-app="${a.id}"><span class="app-icon" style="--app:${a.color}">${ic(a.icon)}<i class="badge" hidden></i></span><span class="app-label">${a.label}</span></button>`).join('');
      grid.querySelectorAll('.app').forEach((b) => (b.onclick = () => openApp(b.dataset.app)));
    }
    for (const b of grid.children) {
      const n = appBadge(b.dataset.app), badge = b.querySelector('.badge');
      badge.hidden = !n;
      badge.textContent = n > 99 ? '99+' : n;
    }
  }
  function renderPhoneApp(id) {
    if (id === 'messages') renderMessages();
    if (id === 'notes') renderNotes();
    if (id === 'bank') renderBank();
    if (id === 'weather') renderWeather();
    if (id === 'secrets') renderSecrets();
    if (id === 'friends') renderFriends();
    if (id === 'album') renderAlbum();
  }
  function renderSecrets() {
    const found = LC.SECRETS.filter((x) => S.secrets.includes(x.id)).length;
    // no hints here: they're hidden in your messages, notes, the weather and what people say
    const left = LC.SECRETS.length - found;
    $('#secrets-view').innerHTML = `<p class="muted small">Found ${found} of ${LC.SECRETS.length}. ${left ? `${left} still hidden somewhere in town. People talk. Read your messages.` : 'You found them all!'}</p>` +
      LC.SECRETS.filter((x) => S.secrets.includes(x.id)).map((x) => `<div class="secret got">${ic(x.icon)}<div><b>${x.name}${x.egg ? ' <span class="egg">Easter egg</span>' : ''}</b><small>${x.found}</small></div></div>`).join('') +
      (left ? `<div class="secret">${ic('❓')}<div><b>??? x ${left}</b><small>Keep exploring.</small></div></div>` : '');
  }
  function renderMessages() {
    const v = $('#msg-view');
    if (msgThread) {
      const threads = LC.TEXTS.filter((t) => S.texts[t.id] && t.from === msgThread);
      threads.forEach((t) => (S.texts[t.id].read = true));
      v.innerHTML = `<div class="thread-head">${msgThread}</div><div class="bubbles">${threads.map((t) => t.msgs.map((m) => `<div class="bubble">${m}</div>`).join('')).join('<div class="bubble-gap"></div>')}</div>`;
      return;
    }
    const from = [];
    for (const t of [...LC.TEXTS].reverse()) if (S.texts[t.id] && !from.includes(t.from)) from.push(t.from);
    v.innerHTML = from.length ? from.map((f) => {
      const ts = LC.TEXTS.filter((t) => S.texts[t.id] && t.from === f);
      const lastT = ts[ts.length - 1];
      const unread = ts.some((t) => !S.texts[t.id].read);
      return `<button class="msg-row ${unread ? 'unread' : ''}" data-from="${f}"><span class="avatar">${f[0]}</span><span><b>${f}</b><small>${lastT.msgs[lastT.msgs.length - 1]}</small></span></button>`;
    }).join('') : '<p class="muted">No messages yet.</p>';
    v.querySelectorAll('.msg-row').forEach((b) => (b.onclick = () => { msgThread = b.dataset.from; $('#screen-close').innerHTML = '‹ Back'; renderMessages(); }));
  }
  function noteText(n) { return n.body.replace('{clicks}', fmtInt(S.stats.clicks)); }
  function renderNotes() {
    const v = $('#notes-view');
    if (openNote) {
      const n = LC.NOTES.find((x) => x.id === openNote) || (() => { const l = LC.LETTERS.find((x) => 'L' + x.id === openNote); return { id: openNote, title: `Grandad: ${l.title}`, body: l.body }; })();
      if (!S.openedNotes.includes(n.id)) S.openedNotes.push(n.id);
      if (LC.NOTES.every((x) => S.openedNotes.includes(x.id))) findSecret('notes');
      v.innerHTML = `<div class="note-page"><h3>${n.title}</h3><pre>${noteText(n)}</pre></div>`;
      return;
    }
    const letters = S.letters.map((id) => LC.LETTERS.find((l) => l.id === id)).filter(Boolean).map((l) => ({ id: 'L' + l.id, title: `✉️ Grandad: ${l.title}`, body: l.body }));
    const list = [...letters.reverse(), ...unlockedNotes().reverse()];
    v.innerHTML = list.map((n) => `<button class="note-row ${S.openedNotes.includes(n.id) ? '' : 'unread'}" data-id="${n.id}"><b>${n.title}</b><small>${noteText(n).split('\n')[0]}</small></button>`).join('') || '<p class="muted">No notes yet.</p>';
    v.querySelectorAll('.note-row').forEach((b) => (b.onclick = () => { openNote = b.dataset.id; $('#screen-close').innerHTML = '‹ Back'; renderNotes(); }));
  }
  function renderBank() {
    const p = Math.min(1, S.money / LC.THING_COST);
    $('#bank-view').innerHTML = `
      <div class="bank-card"><small>CURRENT ACCOUNT</small><div class="bank-bal">${fmt(S.money)}</div><small>Sort code 12-34-56 · Kid's Saver</small></div>
      <div class="bank-row"><span>Income</span><b>${fmtRate(income())}</b></div>
      <div class="bank-row"><span>Saved for The Thing</span><b>${(p * 100).toFixed(p < 0.01 ? 4 : 2)}%</b></div>
      <div class="bank-bar"><i style="width:${p * 100}%"></i></div>
      <div class="bank-row"><span>Interest rate</span><b>0.00%</b></div>
      <div class="bank-row"><span>Money found ever</span><b>${fmt(S.allTime)}</b></div>
      <p class="muted small">Your bank appreciates your business. Your bank does not understand where it is coming from. Your bank would like you to stop paying in 2p coins.</p>`;
  }
  function renderWeather() {
    const day = Math.floor(Date.now() / 3.6e6);
    const days = [0, 1, 2, 3].map((i) => LC.FORECASTS[(day + i * 3) % LC.FORECASTS.length]);
    const [icon, name, text] = days[0];
    $('#weather-view').innerHTML = `
      <div class="wx-now">${ic(icon, 'huge')}<div><div class="wx-name">${name}</div><div>${text}</div></div></div>
      ${days.slice(1).map(([i, n, t], k) => `<div class="wx-row">${ic(i)}<b>${['Tomorrow', 'Day after', 'Then'][k]}</b><span>${n}</span></div>`).join('')}
      <p class="muted small">Forecast provided by a man called Steve who looks out of the window.</p>`;
  }
  // texts arrive and notes unlock as you play
  function checkPhone() {
    for (const t of LC.TEXTS) {
      if (S.texts[t.id] || !t.when(S)) continue;
      S.texts[t.id] = { read: false };
      if (t.flag) S.flags[t.flag] = true;
      LC.audio.sfx('text');
      toast(`${ic('💬')}<div><b>${t.from}</b><br><small>${t.msgs[0]}</small></div>`, 'msg');
      break; // one at a time
    }
    for (const n of LC.NOTES) {
      if (S.notesSeen.includes(n.id) || !n.when(S)) continue;
      S.notesSeen.push(n.id);
      if (S.notesSeen.length > 2) toast(`${ic('📝')}<div>New note: <b>${n.title}</b></div>`);
    }
    const unread = unreadTexts() + newNotes();
    $('#phone-dot').hidden = !unread;
    $('#phone-dot').textContent = unread;
  }

  const panelVisible = (id) => screenOpen && !$('#panel-' + id).hidden;

  // ---------- shop lists ----------
  const genRows = {};
  let upKey = '';
  function buildShop() {
    const list = $('#gen-list');
    list.innerHTML = '';
    for (const g of LC.GENERATORS) {
      const row = el('button', 'gen');
      row.innerHTML = `<div class="gen-icon">${ic(g.icon)}</div>
        <div class="gen-main"><div class="gen-name">${g.name}</div><div class="gen-desc"></div><div class="gen-cost"></div></div>
        <div class="gen-count"></div>`;
      row.onclick = () => buyGen(g);
      row.onmouseenter = () => showTip(row, `<b>${g.name}</b><p>Each finds <b>${fmtRate(g.income * genMult(g) * globalMult())}</b></p><p>${S.gens[g.id] || 0} owned: <b>${fmtRate(genIncome(g) * globalMult())}</b> total</p>`);
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
      row.querySelector('.gen-desc').textContent = known ? (owned ? `${g.desc} Working for you: ${helperNames(g.id, owned)}.` : g.desc) : 'Keep finding money to find out.';
      row.querySelector('.gen-cost').innerHTML = `${ic('🪙', 'tiny')} ${fmt(cost)}${n > 1 ? ` <small>(x${n})</small>` : ''} · <span class="muted">${fmtRate(g.income * genMult(g) * globalMult())} each</span>`;
      row.querySelector('.gen-count').textContent = owned || '';
    });
    const avail = ALL_UPS.filter((u) => !has(u.id) && (u.gen ? (S.gens[u.gen] || 0) >= u.at : S.lifetime >= u.cost * 0.4));
    avail.sort((a, b) => a.cost - b.cost);
    const key = avail.map((u) => u.id).join(',');
    const grid = $('#up-grid');
    if (force || key !== upKey) {
      upKey = key;
      grid.innerHTML = '';
      if (!avail.length) grid.innerHTML = '<p class="muted">Upgrades appear here as you find more money.</p>';
      for (const u of avail) {
        const b = el('button', 'up');
        b.innerHTML = `${ic(u.icon)}<div><b>${u.name}</b><small>${u.desc}</small><span class="up-cost">${ic('🪙', 'tiny')} ${fmt(upCost(u))}</span></div>`;
        b.dataset.id = u.id;
        b.onclick = () => buyUpgrade(u);
        grid.appendChild(b);
      }
    }
    for (const b of grid.querySelectorAll('.up')) {
      const u = ALL_UPS.find((x) => x.id === b.dataset.id);
      b.classList.toggle('poor', S.money < upCost(u));
    }
    $('#up-count').textContent = avail.length ? `(${avail.length})` : '';
  }

  // tooltip
  function showTip(anchor, html) {
    const tip = $('#tip');
    tip.innerHTML = html;
    tip.classList.add('show');
    const r = anchor.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.right + 12;
    if (x + tw > innerWidth - 8) x = Math.max(8, r.left - tw - 12);
    const y = Math.max(8, Math.min(innerHeight - th - 8, r.top + r.height / 2 - th / 2));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { $('#tip').classList.remove('show'); }

  // shed
  let gardenDirty = true;
  const toolRows = {};
  function buildGarden() {
    const list = $('#tool-list');
    list.innerHTML = '';
    for (const t of LC.DIG_TOOLS) {
      const row = el('button', 'gen small');
      row.innerHTML = `<div class="gen-icon">${ic(t.icon)}</div><div class="gen-main"><div class="gen-name">${t.name}</div><div class="gen-desc">${t.desc}</div><div class="gen-cost"></div></div><div class="gen-count"></div>`;
      row.onclick = () => buyDigTool(t);
      list.appendChild(row);
      toolRows[t.id] = row;
    }
  }
  function renderGarden() {
    $('#depth').textContent = fmtDepth(S.depth);
    $('#dig-rate').textContent = fmtDepth(digRate()) + '/s';
    $('#dig-next').innerHTML = ['Keep digging. Something is down there. Probably.', 'Grandad always said the garden was "interesting".', 'The deeper you go, the weirder it gets.'][S.finds.length % 3];
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
        ? S.finds.map((n) => { const f = LC.DIG_FINDS.find((x) => x.name === n); return f ? `<li>${ic(f.icon)}<div><b>${f.name}</b><small>Found at ${fmtDepth(f.at)}. ${f.text}</small></div></li>` : ''; }).reverse().join('')
        : '<li class="muted">Nothing yet. Get digging.</li>';
    }
  }

  function renderShopCards() {
    $('#stock').textContent = `${S.cardStock} / ${maxStock()} cards in stock` + (S.cardStock < maxStock() && S.cardRestockAt ? ` · next delivery in ${Math.ceil((S.cardRestockAt - Date.now()) / 1000)}s` : '');
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
      ['Income', fmtRate(income())], ['Each sofa rummage finds about', fmt(clickValue())],
      ['Sofa rummages', fmtInt(S.stats.clicks)], ['Things found in the sofa', fmtInt(S.stats.sofaFinds)],
      ['Piggy banks smashed', fmtInt(S.stats.pigs)], ['Scratch cards scratched', fmtInt(S.stats.cards)],
      ['Golden coins caught', fmtInt(S.stats.golden)], ['Random events', fmtInt(S.stats.events)],
      ['Deepest hole', fmtDepth(S.depth)], ['Buttons', fmtInt(S.buttons)], ['Lucky socks', fmtInt(S.socks)], ['Frogs', fmtInt(S.frogs)],
      ['Goose status', S.goose.friend ? 'Best friends' : S.goose.met ? 'Hunting you' : 'Unknown'],
      ['Derek', S.flags.derek ? 'Doing well, thanks' : S.flags.derekGone ? 'Spent :(' : 'Not met yet'],
      ['Pockets', Object.entries(S.items).filter(([, n]) => n > 0).map(([k, n]) => `${ITEMS[k][1]} x${n}`).join(', ') || 'Fluff'],
      ['Pranks on Brian', fmtInt(S.stats.pranks || 0)],
      ['Things sold at your stall', `${fmtInt(S.stats.sold || 0)} for ${fmt(S.stats.soldFor || 0)}`],
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
    if (S.goose.met && !S.goose.friend) items.push('Goose seen chasing local resident around garden. Again.');
    if (S.depth > 100) items.push(`Hole in local garden now ${fmtDepth(S.depth)} deep. Brian "furious".`);
    if (S.frogs) items.push(`Person wins ${S.frogs} frog${S.frogs > 1 ? 's' : ''} on scratch cards. "We don't know how either," says shop.`);
    if (S.flags.derekGone) items.push('Man still thinking about Derek.');
    if (S.town && S.town.on && chance(0.6)) items.splice(0, items.length, 'BREAKING: ' + townDef(S.town.on).news);
    const t = $('#news-text');
    t.classList.remove('roll'); void t.offsetWidth;
    t.textContent = items[(newsIdx++ * 7 + Math.floor(Math.random() * 3)) % items.length];
    t.classList.add('roll');
  }

  // ---------- main loop ----------
  let lastTick = Date.now(), slow = 0, gooseShown = '';
  function tick() {
    const now = Date.now();
    const dt = Math.min(1, (now - lastTick) / 1000);
    lastTick = now;
    if (!endingPlaying) {
      gain(income() * dt);
      addDepth(digRate() * dt);
      S.playSecs += dt;
      brianTick(dt);
      townTick(dt);
      friendTick(dt);
      stallTick(dt);
      if (S.pig && !S.pig.smashed && !pigType().real) S.pig.stored = Math.min(pigCap(), S.pig.stored + pigFill() * dt);
      if (S.cardRestockAt && now >= S.cardRestockAt) {
        S.cardStock = Math.min(maxStock(), S.cardStock + 1);
        S.cardRestockAt = S.cardStock < maxStock() ? now + LC.CARD_RESTOCK_SECS * 1000 : 0;
      }
    }
    const before = S.buffs.length;
    S.buffs = S.buffs.filter((b) => b.until > now);
    renderTop();
    if (panelVisible('finders') || panelVisible('upgrades')) renderShop(false);
    if (panelVisible('shed')) renderGarden();
    if (panelVisible('scratch')) renderShopCards();
    if ((slow += dt) >= 1) {
      slow = 0;
      checkAchievements();
      checkTasks();
      if (S.money >= LC.THING_COST && !S.letters.includes('l12')) giveLetter('l12');
      if (S.washUntil && !washing() && !S.flags.washPinged) { S.flags.washPinged = true; LC.world.washerShake(false); LC.audio.sfx('ding'); toast(`${ic('🧺')}<div><b>The washing's done!</b><br><small>Go and check the pockets.</small></div>`); }
      if (washing()) S.flags.washPinged = false;
      if (panelVisible('notebook')) renderStats();
      if (panelVisible('bank')) renderBank();
      if (panelVisible('home')) renderHome();
      checkPhone();
      requestTick(Date.now());
      if (panelVisible('shop')) renderShopPanel();
      if (panelVisible('roster')) renderRoster();
      $('#phone-time').textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      document.title = `${fmt(S.money)} · Loose Change`;
      LC.world.syncHelpers(S.gens);
      LC.world.setDepthText(fmtDepth(S.depth));
      LC.world.setThingText(S.money >= LC.THING_COST ? 'READY!' : fmt(LC.THING_COST));
      const gm = S.goose.friend ? 'friend' : S.goose.met ? 'enemy' : 'none';
      if (gm !== gooseShown) { gooseShown = gm; LC.world.setGoose(gm); }
    }
    if (S.buffs.length || before) renderBuffs();
    eventTick(now);
  }
  function gooseBite(frac = 0.03) {
    if (townOn('geese')) S.town.used.bites = (S.town.used.bites || 0) + 1;
    const n = S.money * frac;
    S.money -= n;
    floatAt(null, '-' + fmt(n), 'bad');
    say(pick(['HONK. The goose bit you and took ' + fmt(n) + '.', 'The goose got you. ' + fmt(n) + ' gone.', 'You have been goosed. -' + fmt(n)]));
  }

  // ---------- settings ----------
  function buildSettings() {
    const s = S.settings;
    if (s.sens == null) s.sens = 1;
    $('#set-music').checked = s.music;
    $('#set-sfx').checked = s.sfx;
    $('#set-volume').value = s.volume;
    $('#set-sens').value = s.sens;
    LC.world.setSensitivity(s.sens);
    $('#set-music').onchange = (e) => { s.music = e.target.checked; LC.audio.unlock(); LC.audio.music(s.music); save(); };
    $('#set-sfx').onchange = (e) => { s.sfx = e.target.checked; save(); };
    $('#set-volume').oninput = (e) => { s.volume = +e.target.value; LC.audio.volume(s.volume); };
    $('#set-volume').onchange = save;
    $('#set-sens').oninput = (e) => { s.sens = +e.target.value; LC.world.setSensitivity(s.sens); };
    $('#set-sens').onchange = save;
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
      text: `Game design, code, 3D models, music and sound: made for this game, all original.<br><br>
        Icons: <b>Twemoji</b> by Twitter, Inc. and other contributors, licensed under CC-BY 4.0 (creativecommons.org/licenses/by/4.0).<br><br>
        Font: <b>Fredoka</b>, copyright 2016 The Fredoka Project Authors, SIL Open Font License 1.1.<br><br>
        3D engine: <b>three.js</b>, MIT License.` });
  }

  // ---------- boot ----------
  function onLockChange(locked) {
    if (locked) { $('#pause').classList.remove('show'); return; }
    if (!screenOpen && !endingPlaying) $('#pause').classList.add('show');
  }

  function boot() {
    LC.world.init();
    const loaded = load();
    buildShop(); buildGarden(); buildSettings();
    if (!S.pig || S.pig.smashed) newPig(); else showPig();
    syncStall(); syncMuseum(); LC.world.setStallUps(S.stallUps); renderHotbar();
    if (crafted('robocat')) LC.world.evolve('cat');
    LC.world.setLoftPigs(Object.keys(S.loftPigs).filter((k) => S.loftPigs[k] === 'done').map(Number));
    if (washing() || S.washUntil) LC.world.washerShake(washing());
    renderCard();
    if (!loaded) queueEvent(() => modal({ icon: '🛋️', title: 'Loose Change',
      text: `You're saving up for something. You're not sure what. It's under a sheet in the hall, and it costs <b>${fmt(LC.THING_COST)}</b>.<br><br>You have 0p.<br><br>Better check down the back of the sofa.`,
      choices: [{ label: "Let's go", fn: () => { LC.audio.unlock(); LC.audio.music(S.settings.music); } }] }));

    $('#pause').onclick = () => { LC.audio.unlock(); LC.audio.music(S.settings.music); LC.world.lock(); };
    $('#screen-close').onclick = back;
    $('#screen').addEventListener('mousedown', (e) => { if (e.target.id === 'screen') closeScreen(); });
    document.querySelectorAll('[data-amt]').forEach((b) => (b.onclick = () => {
      buyAmount = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt;
      document.querySelectorAll('[data-amt]').forEach((x) => x.classList.toggle('on', x === b));
      renderShop(true);
    }));
    LC.CARDS.forEach((c) => { $(`#buy-${c.id}`).onclick = () => buyCard(c); });
    addEventListener('keydown', (e) => {
      if (modalOpen) {
        const btns = [...$(talking ? '#dialog' : '#modal').querySelectorAll('.modal-choices button')];
        const n = e.code.startsWith('Digit') ? +e.code.slice(5) : (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') ? 1 : 0;
        if (n && btns[n - 1]) { e.preventDefault(); btns[n - 1].click(); }
        return;
      }
      if (screenOpen && (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Backspace') && !e.target.matches('textarea, input')) { e.preventDefault(); back(); }
    });
    $('#news-text').addEventListener('animationend', nextNews);
    LC.audio.volume(S.settings.volume);
    LC.audio.setSfxEnabled(() => S.settings.sfx);
    $('#pause').classList.add('show');

    nextNews();
    tick();
    setInterval(tick, TICK_MS);
    setInterval(save, 10000);
    addEventListener('beforeunload', save);
    addEventListener('resize', () => { if (card && !card.done && panelVisible('scratch')) renderCard(); });

    LC.game = {
      rummage, dig, hitPig, nextPig, collect, gooseBite, tryBuyThing, say, floatAt, setPrompt, setCompass,
      sofaPrompt, digPrompt, setPulse, pigPrompt, thingPrompt, openScreen, onLockChange, magnet,
      onArea, jarPrompt, kitchenJar, washPrompt, washer, hatchPrompt, hatch, boxPrompt, grandadBox, loftPigPrompt, loftPig, trunkPrompt, trunk,
      pilePrompt, searchPile, chatUnder, findRing, chestPrompt, openChest, moleKing, moleMarketPrompt, moleMarket,
      fountainPrompt, fountain, checkBench, phoneBox, gnomeStare, chat, findSecret,
      resolveCard, friendPrompt, gift, museumPrompt, museumUse, speedMult: () => (perk('jogger', 3) ? 1.15 : 1),
      hookADuck, binPrompt, bin, cheer, filmExtra, iceCream, snowman, mayor, treasureDig, pigeonStrike, saleSofa, bbqSausage, townOn,
      customerAtStall, customerArrived, customerGaveUp, customerServe, thiefCaught, thiefEscaped, slotPrompt, slotUse, slotAlt, stallTablePrompt, stallTableUse, cycleHeld, selectHeld,
      heldIcon: () => (S.pockets[held] ? LC.JUNK[S.pockets[held].id].icon : null),
      gnomePrompt, gnome, brianEvent, brianDoorPrompt, brianDoor, brianSofaPrompt, raidBrianSofa, fundPrompt, raidFund,
      brianComputer, brianCarPrompt, brianCar, brianLawnPrompt, brianLawn, caughtByBrian, chatBrian, setSuspicion,
      tip: (secs, secret) => { const n = lump(secs, 0.05); gain(n); floatAt(null, n); if (secret) findSecret(secret); },
      depth: () => S.depth,
      toolTier: (kind) => (kind === 'sofa' ? [0, 0, 1, 2, 3][toolEff('sofa')] : toolEff(kind)),
      helperUse,
      togglePhone: () => { if (endingPlaying || modalOpen) return; if (screenOpen) closeScreen(); else openScreen('phone'); },
      isBlocked: () => modalOpen || !!screenOpen || endingPlaying,
      canLock: () => !screenOpen && !endingPlaying,
    };
    // Handy for testing: LC.debug.gain(1e9)
    LC.debug = { quiet: () => { nextEventAt = nextGoldenAt = Date.now() + 1e9; }, gain, ending: playEnding, event: (id) => EVENTS.find((e) => e.id === id)?.run(), state: () => S, setDepth: (m) => addDepth(m - S.depth), golden: () => LC.world.spawnGolden(), town: (id) => { townSetup(); if (S.town.on) townEnd(); if (id) townStart(id); }, townEnd: () => S.town && S.town.on && townEnd() };
  }
  // the world module needs LC.game before its first frame, so set a stub early
  LC.game = { setPulse: () => {}, setSuspicion: () => {}, brianEvent: () => {}, toolTier: () => 0, isBlocked: () => true, setPrompt: () => {}, setCompass: () => {}, depth: () => 0, magnet: () => 1, canLock: () => false, onLockChange: () => {}, speedMult: () => 1 };
  addEventListener('load', boot);
})();
