// Loose Change — surface textures painted in code (wood, wallpaper, grass, tarmac, paving, brick).
import * as THREE from 'three';

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// seeded random so textures look the same every time
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
function speckle(g, w, h, n, col, size = 2) {
  for (let i = 0; i < n; i++) { g.fillStyle = col(); g.fillRect(rnd() * w, rnd() * h, size, size); }
}

const cache = {};
export function tex(name, repeatX = 1, repeatY = 1) {
  if (!cache[name]) cache[name] = make[name]();
  const t = cache[name].clone();
  t.needsUpdate = true;
  t.repeat.set(repeatX, repeatY);
  return t;
}

const make = {
  wood: () => { seed = 3; return canvas(512, 512, (g, w, h) => {
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 300;
      while (x < w) {
        const len = 180 + rnd() * 200;
        g.fillStyle = shade('#b07a4a', (rnd() - 0.5) * 0.12);
        g.fillRect(x, r * h / rows, len, h / rows);
        g.strokeStyle = 'rgba(60,35,15,.12)'; g.lineWidth = 1.5;
        for (let k = 0; k < 4; k++) { g.beginPath(); const y = r * h / rows + 6 + rnd() * (h / rows - 12); g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y + 3, x + len * 0.6, y - 3, x + len, y); g.stroke(); }
        g.fillStyle = 'rgba(50,30,15,.55)'; g.fillRect(x, r * h / rows, 2, h / rows);
        x += len;
      }
      g.fillStyle = 'rgba(50,30,15,.5)'; g.fillRect(0, r * h / rows, w, 2);
    }
  }); },
  wallpaper: () => { seed = 5; return canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#f4e7c8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(214,170,110,.28)'; g.fillRect(x, 0, 12, h); }
    g.fillStyle = 'rgba(190,120,90,.35)';
    for (let y = 16; y < h; y += 64) for (let x = 22; x < w; x += 64) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.beginPath(); g.arc(x + 32, y + 32, 4, 0, 7); g.fill(); }
  }); },
  wallpaper2: () => { seed = 6; return canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#e3eef0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,140,160,.25)'; g.lineWidth = 3;
    for (let x = -h; x < w; x += 28) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke(); }
  }); },
  tiles: () => { seed = 7; return canvas(256, 256, (g, w, h) => {
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? '#e9e4d8' : '#3d4a5c'; g.fillRect(x * s, y * s, s, s); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  }); },
  grass: () => { seed = 11; return canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#79bd55'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const r = 30 + rnd() * 80; const gr = g.createRadialGradient(rnd() * w, rnd() * h, 0, rnd() * w, rnd() * h, r); void gr; g.fillStyle = `rgba(${rnd() < 0.5 ? '95,160,60' : '140,200,95'},.18)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 7); g.fill(); }
    for (let i = 0; i < 9000; i++) { const x = rnd() * w, y = rnd() * h; g.strokeStyle = rnd() < 0.5 ? 'rgba(70,130,45,.5)' : 'rgba(160,215,110,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 4); g.stroke(); }
  }); },
  tarmac: () => { seed = 13; return canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#4b4d55'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 5000, () => (rnd() < 0.5 ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.12)'), 2);
  }); },
  paving: () => { seed = 17; return canvas(256, 256, (g, w, h) => {
    const s = 64;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { g.fillStyle = shade('#cfcac0', (rnd() - 0.5) * 0.08); g.fillRect(x, y, s, s); }
    speckle(g, w, h, 1500, () => 'rgba(0,0,0,.08)', 2);
    g.strokeStyle = 'rgba(90,85,75,.6)'; g.lineWidth = 2.5;
    for (let i = 0; i <= w; i += s) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }); },
  brick: () => { seed = 19; return canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#d9cfc0'; g.fillRect(0, 0, w, h);
    const bh = 32, bw = 64;
    for (let r = 0; r < h / bh; r++) for (let x = (r % 2) * -bw / 2; x < w; x += bw) { g.fillStyle = shade('#b5573b', (rnd() - 0.5) * 0.14); g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4); }
  }); },
  render: () => { seed = 23; return canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#efe6d6'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 4000, () => (rnd() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.2)'), 2);
  }); },
  carpet: () => { seed = 29; return canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#b04848'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8c07a'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.lineWidth = 3; g.strokeRect(34, 34, w - 68, h - 68);
    speckle(g, w, h, 3000, () => 'rgba(0,0,0,.08)', 2);
  }); },
};
