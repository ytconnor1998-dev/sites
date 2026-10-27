// Loose Change — all sound is synthesised live with the Web Audio API.
// No samples or recordings: the music below is an original composition written for this game.
(() => {
  const LC = (globalThis.LC = globalThis.LC || {});
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let sfxOn = () => true;
  let vol = 0.6;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return false; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // One enveloped oscillator note.
  function tone(t, { freq, type = 'square', dur = 0.15, gain = 0.2, attack = 0.005, slideTo, out = sfxBus, filter }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
    node.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, { dur = 0.1, gain = 0.2, freq = 3000, type = 'bandpass', q = 1, out = sfxBus }) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ---------- sound effects ----------
  let lastScratch = 0;
  const SFX = {
    coin: (t) => { const p = 1 + Math.random() * 0.12; tone(t, { freq: 1568 * p, type: 'square', dur: 0.07, gain: 0.07, filter: 5000 }); tone(t + 0.05, { freq: 2093 * p, type: 'square', dur: 0.16, gain: 0.07, filter: 5000 }); },
    buy: (t) => { [523, 659, 784].forEach((f, i) => tone(t + i * 0.045, { freq: f, type: 'triangle', dur: 0.12, gain: 0.18 })); },
    nope: (t) => tone(t, { freq: 180, type: 'square', dur: 0.15, gain: 0.08, slideTo: 120, filter: 1200 }),
    click: (t) => tone(t, { freq: 900, type: 'triangle', dur: 0.04, gain: 0.12 }),
    tap: (t) => { tone(t, { freq: 420 + Math.random() * 80, type: 'triangle', dur: 0.08, gain: 0.25 }); noise(t, { dur: 0.04, gain: 0.1, freq: 2500 }); },
    smash: (t) => { noise(t, { dur: 0.35, gain: 0.5, freq: 1800, q: 0.6 }); noise(t + 0.02, { dur: 0.5, gain: 0.25, freq: 6000, q: 0.8 }); for (let i = 0; i < 6; i++) tone(t + 0.05 + i * 0.04, { freq: 1400 + Math.random() * 1200, type: 'square', dur: 0.08, gain: 0.04, filter: 6000 }); },
    dig: (t) => { noise(t, { dur: 0.12, gain: 0.35, freq: 350, type: 'lowpass' }); tone(t, { freq: 110, type: 'sine', dur: 0.1, gain: 0.2, slideTo: 60 }); },
    scratch: (t) => { if (t - lastScratch < 0.06) return; lastScratch = t; noise(t, { dur: 0.06, gain: 0.12, freq: 4500, q: 2 }); },
    ding: (t) => { tone(t, { freq: 1319, type: 'sine', dur: 0.5, gain: 0.2 }); tone(t, { freq: 2637, type: 'sine', dur: 0.3, gain: 0.05 }); },
    win: (t) => { [659, 784, 1047].forEach((f, i) => tone(t + i * 0.08, { freq: f, type: 'square', dur: 0.14, gain: 0.08, filter: 4000 })); },
    fanfare: (t) => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(t + i * 0.09, { freq: f, type: 'square', dur: i === 5 ? 0.5 : 0.12, gain: 0.08, filter: 4000 })); },
    event: (t) => { tone(t, { freq: 784, type: 'triangle', dur: 0.12, gain: 0.2 }); tone(t + 0.12, { freq: 1175, type: 'triangle', dur: 0.25, gain: 0.2 }); },
    honk: (t) => { tone(t, { freq: 330, type: 'sawtooth', dur: 0.28, gain: 0.18, slideTo: 260, filter: 1400 }); tone(t, { freq: 336, type: 'square', dur: 0.28, gain: 0.08, slideTo: 250, filter: 900 }); },
    oink: (t) => { tone(t, { freq: 220, type: 'sawtooth', dur: 0.12, gain: 0.15, slideTo: 330, filter: 900 }); tone(t + 0.16, { freq: 240, type: 'sawtooth', dur: 0.14, gain: 0.15, slideTo: 300, filter: 900 }); },
    ribbit: (t) => { for (let i = 0; i < 3; i++) tone(t + i * 0.05, { freq: 180, type: 'square', dur: 0.04, gain: 0.12, slideTo: 320, filter: 1500 }); },
  };
  function sfx(name) {
    if (!ctx || !sfxOn() || ctx.state !== 'running') return;
    SFX[name]?.(ctx.currentTime + 0.005);
  }

  // ---------- music: "Down The Back Of The Sofa" (original, 16 bars, loops) ----------
  // 8 steps per bar (eighth notes). null = rest.
  const CHORDS = {
    C: { pad: [60, 64, 67], bass: 36 }, Am: { pad: [57, 60, 64], bass: 33 }, F: { pad: [57, 60, 65], bass: 41 },
    G: { pad: [55, 59, 62], bass: 43 }, Em: { pad: [55, 59, 64], bass: 40 }, Dm: { pad: [57, 62, 65], bass: 38 },
  };
  const PROG = ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G', 'F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'C'];
  const _ = null;
  const MELODY = [
    [76, _, 79, _, 76, 74, 72, _], [69, _, 72, _, 76, _, 74, 72], [69, _, 72, 77, _, 76, 74, _], [74, _, 71, _, 67, _, _, _],
    [76, _, 79, _, 84, _, 83, 79], [71, _, 76, _, 79, _, 76, _], [77, 76, 74, 72, 69, _, 72, _], [74, _, _, 67, 71, 74, _, _],
    [81, _, 79, 77, _, 76, _, _], [79, _, 77, 76, _, 74, _, _], [76, 79, 83, _, 79, _, 76, _], [84, _, 83, 81, _, 76, _, _],
    [74, 77, 81, _, 77, _, 74, _], [71, 74, 79, _, 77, _, 74, 71], [72, _, 76, _, 79, _, 76, _], [72, _, _, _, _, _, _, _],
  ];
  const BPM = 112, STEP = 60 / BPM / 2;
  let playing = false, step = 0, nextTime = 0, timer = null, loops = 0;

  function scheduleStep(s, t) {
    const bar = Math.floor(s / 8) % 16, pos = s % 8;
    const ch = CHORDS[PROG[bar]];
    const n = MELODY[bar][pos];
    // the melody sits out every third loop so it doesn't get stuck in your head (much)
    if (n != null && loops % 3 !== 2) {
      const len = MELODY[bar][pos + 1] === null ? STEP * 1.8 : STEP * 0.9;
      tone(t, { freq: hz(n), type: 'square', dur: len, gain: 0.09, attack: 0.01, filter: 2600, out: musicBus });
      tone(t, { freq: hz(n + 12), type: 'sine', dur: len * 0.6, gain: 0.025, out: musicBus });
    }
    if (pos === 0 || pos === 4) tone(t, { freq: hz(ch.bass), type: 'triangle', dur: STEP * 1.6, gain: 0.32, out: musicBus });
    if (pos === 6) tone(t, { freq: hz(ch.bass + 7), type: 'triangle', dur: STEP * 0.9, gain: 0.22, out: musicBus });
    if (pos === 2 || pos === 6) ch.pad.forEach((p) => tone(t, { freq: hz(p), type: 'square', dur: STEP * 0.7, gain: 0.025, filter: 1600, out: musicBus }));
    if (pos === 0 || pos === 4) tone(t, { freq: 120, type: 'sine', dur: 0.12, gain: 0.35, slideTo: 45, out: musicBus });
    if (pos === 2 || pos === 6) noise(t, { dur: 0.09, gain: 0.12, freq: 1800, q: 0.7, out: musicBus });
    noise(t, { dur: 0.03, gain: pos % 2 ? 0.03 : 0.05, freq: 8000, type: 'highpass', out: musicBus });
  }
  function scheduler() {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      nextTime += STEP;
      step++;
      if (step % 128 === 0) loops++;
    }
  }
  function music(on) {
    if (!ctx) return;
    if (on && !playing) {
      playing = true;
      step = 0; nextTime = ctx.currentTime + 0.1;
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setValueAtTime(0.32, ctx.currentTime);
      timer = setInterval(scheduler, 40);
    } else if (!on && playing) {
      playing = false;
      clearInterval(timer);
      musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
    }
  }
  function volume(v) { vol = v; if (master) master.gain.value = v; }

  LC.audio = { unlock, sfx, music, volume, setSfxEnabled: (fn) => (sfxOn = fn) };
})();
