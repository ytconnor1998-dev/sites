// Loose Change — every 3D model in the game, built from simple shapes in code.
// No downloaded models: all original, chunky low-poly style.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// a faint grain on every surface gives the painted look
let grainTex = null;
// soft painted dabs on every surface give the hand-painted look
function grain() {
  if (grainTex) return grainTex;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(236,236,236)'; g.fillRect(0, 0, 256, 256);
  let sd = 7; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  for (let i = 0; i < 900; i++) {
    const v = 205 + Math.floor(r() * 50);
    g.fillStyle = `rgba(${v},${v},${v},0.5)`;
    const x = r() * 256, y = r() * 256, a = r() * Math.PI;
    for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { g.beginPath(); g.ellipse(x + dx, y + dy, 6 + r() * 14, 2.5 + r() * 5, a, 0, 7); g.fill(); }
  }
  grainTex = new THREE.CanvasTexture(c);
  grainTex.colorSpace = THREE.SRGBColorSpace;
  grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping;
  grainTex.repeat.set(2, 2);
  return grainTex;
}
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, map: opts.map === null ? null : grain(), ...opts }));
  return matCache.get(key);
}
export function part(geo, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, typeof color === 'object' ? color : mat(color, opts.mat));
  m.position.set(x, y, z);
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.scale) m.scale.set(...opts.scale);
  m.castShadow = opts.shadow !== false;
  m.receiveShadow = true;
  return m;
}
// boxes get softly rounded edges unless they're walls/floors (opts.sharp)
export const box = (w, h, d, color, x, y, z, opts = {}) => {
  const r = Math.min(w, h, d) * 0.2;
  const geo = opts.sharp || r < 0.006 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, r);
  return part(geo, color, x, y, z, opts);
};
export const cyl = (rt, rb, h, color, x, y, z, opts = {}) => part(new THREE.CylinderGeometry(rt, rb, h, opts.seg || 12), color, x, y, z, opts);
export const ball = (r, color, x, y, z, opts = {}) => part(new THREE.SphereGeometry(r, opts.seg || 18, opts.seg ? Math.ceil(opts.seg * 0.7) : 14), color, x, y, z, opts);
export const cone = (r, h, color, x, y, z, opts = {}) => part(new THREE.ConeGeometry(r, h, opts.seg || 8), color, x, y, z, opts);
const group = (...kids) => { const g = new THREE.Group(); kids.forEach((k) => k && g.add(k)); return g; };

// ---------- real 3D models (glTF), loaded at start from assets/models/manifest.json ----------
// lib.tree, lib.bush, lib.rock, lib.car... each an array of loaded scenes. Anything not supplied
// falls back to the shapes built in code below.
export const lib = {};
let libPick = 0;
export function libModel(kind, height = null, index = null) {
  const list = lib[kind];
  if (!list || !list.length) return null;
  const src = list[index != null ? index % list.length : (libPick++ * 7) % list.length];
  const m = src.clone(true);
  m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  if (height) {
    const b = new THREE.Box3().setFromObject(m), h = b.max.y - b.min.y;
    if (h > 0) m.scale.multiplyScalar(height / h);
  }
  const g = new THREE.Group(); g.add(m);
  return g;
}

export const C = {
  sofa: 0x6aa84f, sofaDark: 0x4d8a2c, wood: 0x9b6a3f, woodDark: 0x6e4a2a, pig: 0xf7a8bd, pigDark: 0xe07d9a,
  gold: 0xf2b631, white: 0xf7f3ea, ink: 0x2d2118, skin: 0xf1c39b, skin2: 0xc68863, orange: 0xf08a24,
  grey: 0x8f8f8f, stone: 0xa59f95, brick: 0xb5573b, roof: 0x5b4a5f, grass: 0x7cc35a, soil: 0x7a4f2c,
};

// ---------- furniture ----------
export function sofa(color = C.sofa, dark = C.sofaDark, width = 2.3) {
  const w = width;
  return group(
    box(w, 0.42, 0.95, dark, 0, 0.29, 0),
    box(w / 2 - 0.08, 0.2, 0.78, color, -w / 4 + 0.02, 0.6, 0.06),
    box(w / 2 - 0.08, 0.2, 0.78, color, w / 4 - 0.02, 0.6, 0.06),
    box(w, 0.7, 0.26, color, 0, 0.82, -0.36),
    box(0.26, 0.62, 0.95, dark, -w / 2 + 0.13, 0.6, 0),
    box(0.26, 0.62, 0.95, dark, w / 2 - 0.13, 0.6, 0),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => cyl(0.05, 0.04, 0.1, C.woodDark, a * (w / 2 - 0.15), 0.05, b * 0.38)),
    box(0.45, 0.32, 0.12, 0xf2d16b, -w / 4, 0.82, -0.18, { rot: [0.2, 0.1, 0.12] }),
  );
}
export function armchair(color = 0xd27a5a) { return sofa(color, 0xa45a40, 1.15); }
export function coffeeTable() {
  return group(box(1.2, 0.08, 0.6, C.wood, 0, 0.42, 0), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => box(0.06, 0.4, 0.06, C.woodDark, a * 0.52, 0.2, b * 0.24)),
    cyl(0.06, 0.05, 0.1, 0xffffff, 0.3, 0.51, 0), box(0.25, 0.03, 0.18, 0xd9534f, -0.25, 0.47, 0.05, { rot: [0, 0.3, 0] }));
}
export function tv() {
  const screen = box(1.5, 0.85, 0.04, 0x1a2a3a, 0, 1.15, 0.05, { mat: { emissive: 0x4a90d0, emissiveIntensity: 1.4, map: null } });
  screen.name = 'screen';
  return group(box(1.6, 0.5, 0.45, C.woodDark, 0, 0.25, 0), box(1.6, 0.95, 0.06, C.ink, 0, 1.15, 0), screen);
}
export function lamp() {
  const shade = cone(0.28, 0.35, 0xf8b04a, 0, 1.55, 0, { seg: 16, mat: { emissive: 0xffa040, emissiveIntensity: 1.6, map: null } });
  return group(cyl(0.18, 0.2, 0.05, C.ink, 0, 0.03, 0), cyl(0.025, 0.025, 1.4, 0xdddddd, 0, 0.72, 0), shade);
}
export function plant() {
  return group(cyl(0.2, 0.15, 0.35, 0xc4683f, 0, 0.18, 0), ball(0.32, 0x4f9a3a, 0, 0.6, 0, { seg: 6 }), ball(0.22, 0x5fb046, 0.12, 0.85, 0.05, { seg: 6 }));
}
export function bookshelf() {
  const g = group(box(1.2, 1.9, 0.35, C.wood, 0, 0.95, 0));
  const cols = [0xd9534f, 0x5b8bd9, 0xf2b631, 0x6aa84f, 0x9b59b6];
  for (let s = 0; s < 4; s++) {
    g.add(box(1.1, 0.03, 0.3, C.woodDark, 0, 0.3 + s * 0.45, 0.03));
    let x = -0.5;
    while (x < 0.45) { const w = 0.05 + Math.random() * 0.06; const h = 0.25 + Math.random() * 0.12; g.add(box(w, h, 0.22, cols[Math.floor(Math.random() * 5)], x + w / 2, 0.32 + s * 0.45 + h / 2, 0.05)); x += w + 0.01; }
  }
  return g;
}
export function fireplace() {
  return group(box(1.8, 1.1, 0.5, C.brick, 0, 0.55, 0), box(0.9, 0.6, 0.1, 0x241a14, 0, 0.35, 0.22), box(2.1, 0.1, 0.65, C.white, 0, 1.15, 0.03),
    box(0.5, 0.18, 0.12, 0xf08a24, 0, 0.15, 0.2, { mat: { emissive: 0xff6a10, emissiveIntensity: 2.5, map: null } }));
}
export function rug(color = 0xc0504d) { return cyl(1.4, 1.4, 0.02, color, 0, 0.011, 0, { seg: 24, shadow: false }); }
export function counter(len = 3) {
  return group(box(len, 0.9, 0.65, 0xe8e2d4, 0, 0.45, 0), box(len + 0.05, 0.06, 0.7, 0x5c5c66, 0, 0.93, 0));
}
export function fridge() { return group(box(0.75, 1.9, 0.7, 0xeeeeee, 0, 0.95, 0), box(0.04, 0.5, 0.04, 0x999999, -0.28, 1.3, 0.36)); }
export function door(color = 0x3b6ea5) { return group(box(1.0, 2.1, 0.08, color, 0, 1.05, 0), ball(0.04, C.gold, 0.38, 1.0, 0.06)); }

// ---------- piggy banks ----------
export function piggy(kind = 'normal') {
  const g = new THREE.Group();
  if (kind === 'owl') {
    g.add(ball(0.32, 0x9b6a3f, 0, 0.36, 0, { scale: [1, 1.2, 0.95] }), ball(0.11, 0xffffff, -0.11, 0.5, 0.25), ball(0.11, 0xffffff, 0.11, 0.5, 0.25),
      ball(0.05, C.ink, -0.11, 0.5, 0.34), ball(0.05, C.ink, 0.11, 0.5, 0.34), cone(0.05, 0.12, C.orange, 0, 0.4, 0.32, { rot: [Math.PI / 2, 0, 0] }),
      cone(0.06, 0.14, 0x6e4a2a, -0.18, 0.75, 0), cone(0.06, 0.14, 0x6e4a2a, 0.18, 0.75, 0), box(0.12, 0.02, 0.04, C.ink, 0, 0.75, 0));
    return g;
  }
  const body = { normal: C.pig, golden: C.gold, kevin: 0xc9768d, nesting: 0xe85d75, real: 0xf3b0b8 }[kind] || C.pig;
  const dark = kind === 'golden' ? 0xc98a12 : C.pigDark;
  const m = kind === 'golden' ? { emissive: 0x6b4a00 } : undefined;
  g.add(ball(0.34, body, 0, 0.4, 0, { scale: [1, 0.9, 1.25], mat: m }));
  g.add(cyl(0.12, 0.13, 0.1, dark, 0, 0.42, 0.44, { rot: [Math.PI / 2, 0, 0] }));
  g.add(ball(0.025, C.ink, -0.045, 0.42, 0.5), ball(0.025, C.ink, 0.045, 0.42, 0.5));
  g.add(ball(0.04, C.ink, -0.13, 0.53, 0.33), ball(0.04, C.ink, 0.13, 0.53, 0.33));
  g.add(cone(0.08, 0.14, dark, -0.17, 0.72, 0.15, { rot: [0.3, 0, -0.3] }), cone(0.08, 0.14, dark, 0.17, 0.72, 0.15, { rot: [0.3, 0, 0.3] }));
  for (const [x, z] of [[-0.17, 0.2], [0.17, 0.2], [-0.17, -0.2], [0.17, -0.2]]) g.add(cyl(0.06, 0.06, 0.16, dark, x, 0.08, z));
  if (kind !== 'real') g.add(box(0.16, 0.02, 0.04, C.ink, 0, 0.71, -0.02));
  if (kind === 'kevin') g.add(box(0.12, 0.03, 0.03, C.ink, -0.13, 0.6, 0.35, { rot: [0, 0, -0.5] }), box(0.12, 0.03, 0.03, C.ink, 0.13, 0.6, 0.35, { rot: [0, 0, 0.5] }));
  if (kind === 'nesting') g.add(cyl(0.36, 0.36, 0.08, C.gold, 0, 0.4, 0, { rot: [Math.PI / 2, 0, 0], scale: [1, 1.2, 0.95] }));
  g.add(part(new THREE.TorusGeometry(0.05, 0.015, 6, 10), dark, 0, 0.45, -0.42));
  return g;
}

// ---------- creatures & people ----------
export function cat(color = C.orange) {
  const g = group(
    box(0.22, 0.2, 0.5, color, 0, 0.25, 0),
    ball(0.14, color, 0, 0.42, 0.28),
    cone(0.05, 0.1, color, -0.07, 0.56, 0.28), cone(0.05, 0.1, color, 0.07, 0.56, 0.28),
    ball(0.025, 0x2a6b2a, -0.05, 0.45, 0.4), ball(0.025, 0x2a6b2a, 0.05, 0.45, 0.4),
    ...[[-0.08, 0.17], [0.08, 0.17], [-0.08, -0.17], [0.08, -0.17]].map(([x, z]) => box(0.06, 0.16, 0.06, color, x, 0.08, z)),
  );
  const tail = cyl(0.025, 0.03, 0.4, color, 0, 0.4, -0.32, { rot: [-0.6, 0, 0] });
  tail.name = 'tail';
  g.add(tail);
  return g;
}
export function goose() {
  const g = group(
    ball(0.25, C.white, 0, 0.42, 0, { scale: [0.85, 0.8, 1.3] }),
    cyl(0.05, 0.07, 0.42, C.white, 0, 0.72, 0.2, { rot: [0.25, 0, 0] }),
    ball(0.09, C.white, 0, 0.95, 0.27),
    cone(0.045, 0.16, C.orange, 0, 0.94, 0.4, { rot: [Math.PI / 2, 0, 0] }),
    ball(0.02, C.ink, -0.06, 0.98, 0.31), ball(0.02, C.ink, 0.06, 0.98, 0.31),
    cyl(0.02, 0.02, 0.22, C.orange, -0.09, 0.11, 0), cyl(0.02, 0.02, 0.22, C.orange, 0.09, 0.11, 0),
    box(0.1, 0.02, 0.12, C.orange, -0.09, 0.01, 0.04), box(0.1, 0.02, 0.12, C.orange, 0.09, 0.01, 0.04),
    cone(0.12, 0.2, 0xe8e2d4, 0, 0.5, -0.36, { rot: [-1.9, 0, 0] }),
  );
  return g;
}
export function pigeon() {
  return group(ball(0.09, 0x8d93a3, 0, 0.1, 0, { scale: [0.9, 0.9, 1.3], seg: 7 }), ball(0.055, 0x6a7186, 0, 0.2, 0.08, { seg: 7 }),
    cone(0.015, 0.05, 0xd8a24a, 0, 0.2, 0.15, { rot: [Math.PI / 2, 0, 0] }), box(0.09, 0.02, 0.1, 0x6a7186, 0, 0.1, -0.13));
}
export function person({ shirt = 0x5b8bd9, legs = 0x3a3f58, skin = C.skin, hair = 0x5a3a22, height = 1, hat = null, bald = false } = {}) {
  const g = new THREE.Group();
  const s = height;
  const legL = box(0.14, 0.75, 0.16, legs, -0.1, 0.375, 0); legL.name = 'legL';
  const legR = box(0.14, 0.75, 0.16, legs, 0.1, 0.375, 0); legR.name = 'legR';
  const armL = box(0.11, 0.6, 0.13, shirt, -0.28, 1.08, 0); armL.name = 'armL'; armL.geometry.translate(0, -0.25, 0); armL.position.y = 1.33;
  const armR = box(0.11, 0.6, 0.13, shirt, 0.28, 1.08, 0); armR.name = 'armR'; armR.geometry.translate(0, -0.25, 0); armR.position.y = 1.33;
  legL.geometry.translate(0, -0.375, 0); legL.position.y = 0.75;
  legR.geometry.translate(0, -0.375, 0); legR.position.y = 0.75;
  g.add(legL, legR, box(0.46, 0.65, 0.26, shirt, 0, 1.08, 0), armL, armR, ball(0.17, skin, 0, 1.58, 0));
  g.add(ball(0.025, C.ink, -0.06, 1.6, 0.15), ball(0.025, C.ink, 0.06, 1.6, 0.15));
  if (!bald) g.add(box(0.36, 0.12, 0.36, hair, 0, 1.72, -0.02));
  if (hat === 'cap') g.add(box(0.38, 0.1, 0.38, 0xd9534f, 0, 1.76, 0), box(0.3, 0.03, 0.2, 0xd9534f, 0, 1.72, 0.2));
  if (hat === 'beanie') g.add(ball(0.19, 0x6aa84f, 0, 1.68, 0, { scale: [1, 0.8, 1] }));
  if (hat === 'gnome') g.add(cone(0.2, 0.5, 0xd9534f, 0, 1.95, 0), ball(0.16, 0xffffff, 0, 1.45, 0.12, { scale: [1, 1.2, 0.7] }));
  if (hat === 'top') g.add(cyl(0.2, 0.2, 0.4, 0x1a1a1a, 0, 1.92, 0), cyl(0.3, 0.3, 0.03, 0x1a1a1a, 0, 1.73, 0), cyl(0.205, 0.205, 0.06, 0x8a1a1a, 0, 1.78, 0));
  if (hat === 'bun') g.add(ball(0.12, 0xd9d9d9, 0, 1.8, -0.08), box(0.36, 0.12, 0.36, 0xd9d9d9, 0, 1.72, -0.02));
  g.scale.setScalar(s);
  return g;
}

// ---------- tools you hold (first person) ----------
// the player's hand: a kid's hand poking out of a hoodie sleeve
export function glove(sleeve = 0x3b6ea5) {
  const g = new THREE.Group();
  g.add(cyl(0.06, 0.068, 0.22, sleeve, 0, -0.03, 0.14, { rot: [Math.PI / 2, 0, 0] }));
  g.add(cyl(0.066, 0.066, 0.04, 0xeeeeee, 0, -0.03, 0.03, { rot: [Math.PI / 2, 0, 0] }));
  g.add(box(0.1, 0.045, 0.1, C.skin, 0, -0.02, -0.04));
  for (let i = 0; i < 4; i++) {
    const f = part(new THREE.CapsuleGeometry(0.012, 0.045, 4, 8), C.skin, -0.036 + i * 0.024, -0.025, -0.11 + Math.abs(i - 1.5) * 0.006, { rot: [Math.PI / 2 - 0.5, 0, 0] });
    g.add(f);
  }
  g.add(part(new THREE.CapsuleGeometry(0.013, 0.035, 4, 8), C.skin, 0.058, -0.02, -0.04, { rot: [Math.PI / 2, 0, -0.9] }));
  return g;
}
export function heldTool(kind, tier = 0) {
  const g = new THREE.Group();
  const handle = (len, col) => cyl(0.022, 0.026, len, col, 0, len / 2 - 0.1, 0);
  if (kind === 'sofa') {
    if (tier === 0) { g.add(glove()); return g; }
    if (tier === 1) { g.add(handle(0.7, 0x888888), box(0.02, 0.12, 0.05, 0xf2b631, 0.02, 0.62, 0), box(0.02, 0.12, 0.05, 0xf2b631, -0.02, 0.62, 0), box(0.06, 0.1, 0.08, 0xd9534f, 0, -0.05, 0.05)); g.rotation.x = 1.0; return g; }
    if (tier === 2) { g.add(handle(0.6, 0x5b8bd9), box(0.18, 0.05, 0.08, 0x333333, 0, 0.55, 0.02), cyl(0.05, 0.05, 0.14, 0xd9534f, 0, -0.08, 0)); g.rotation.x = 1.0; return g; }
    g.add(box(0.26, 0.09, 0.08, 0x3fb3c9, 0, 0, 0, { mat: { emissive: 0x1a6a7a } })); return g;
  }
  if (kind === 'pig') {
    if (tier === 3) { for (let i = 0; i < 3; i++) g.add(cyl(0.035, 0.035, 0.22, 0xd9534f, (i - 1) * 0.07, 0.1, 0)); g.add(box(0.24, 0.04, 0.08, 0x3a2a1a, 0, 0.05, 0), cyl(0.004, 0.004, 0.12, 0x222222, 0, 0.27, 0)); return g; }
    const len = [0.35, 0.45, 0.75][tier], headC = [0xd9534f, 0x666666, 0x444444][tier], hc = [0xf2b631, C.wood, C.woodDark][tier];
    const hs = [0.12, 0.14, 0.26][tier];
    g.add(handle(len, hc), box(hs, hs * 0.6, hs * 0.6, headC, 0, len - 0.12, 0, { mat: { metalness: tier ? 0.5 : 0, roughness: tier ? 0.4 : 0.6 } }));
    return g;
  }
  if (kind === 'dig') {
    if (tier === 0) { g.add(handle(0.25, 0xcccccc), ball(0.045, 0xcccccc, 0, 0.17, 0, { scale: [1, 1.4, 0.4], mat: { metalness: 0.7, roughness: 0.3 } })); return g; }
    if (tier === 1) { g.add(handle(0.3, 0x6aa84f), box(0.09, 0.14, 0.01, 0x999999, 0, 0.26, 0, { mat: { metalness: 0.6, roughness: 0.35 } })); return g; }
    if (tier === 2) { g.add(handle(0.8, C.wood), box(0.18, 0.24, 0.02, 0x8a8a8a, 0, 0.78, 0, { mat: { metalness: 0.6, roughness: 0.35 } }), box(0.14, 0.04, 0.04, 0x222222, 0, -0.08, 0)); return g; }
    g.add(box(0.12, 0.2, 0.28, 0xf2b631, 0, 0, 0), cyl(0.02, 0.01, 0.3, 0x999999, 0, 0, 0.28, { rot: [Math.PI / 2, 0, 0], mat: { metalness: 0.8, roughness: 0.3 } }));
    return g;
  }
  return g;
}

export function detector() {
  return group(cyl(0.015, 0.015, 1.1, 0x333333, 0, 0, 0), cyl(0.13, 0.13, 0.03, 0x333333, 0, -0.55, 0.05, { rot: [0.3, 0, 0] }), box(0.08, 0.1, 0.12, 0xf2b631, 0, 0.3, 0.05));
}
export function badger() {
  return group(box(0.35, 0.28, 0.7, 0x555555, 0, 0.25, 0), box(0.28, 0.22, 0.3, 0xffffff, 0, 0.32, 0.45), box(0.08, 0.23, 0.31, C.ink, -0.08, 0.33, 0.46), box(0.08, 0.23, 0.31, C.ink, 0.08, 0.33, 0.46),
    box(0.1, 0.12, 0.04, 0xd9534f, 0, 0.2, 0.6));
}
export function mole() { return group(ball(0.16, 0x3a2f2a, 0, 0.12, 0, { scale: [1, 0.8, 1.4] }), ball(0.04, 0xf7a8bd, 0, 0.12, 0.22)); }
export function gnome() { return person({ shirt: 0x3a7bd5, legs: 0x5a3a22, hat: 'gnome', bald: true, height: 0.45 }); }

// ---------- garden & street ----------
// chunky, bright summer trees: a few overlapping blobs of leaves
export function tree(h = 3) {
  const real = libModel('tree', h * 1.3); if (real) { real.rotation.y = Math.random() * 6; return real; }
  const leaf = { seg: 8, mat: { flatShading: true } };
  return group(cyl(0.15, 0.24, h * 0.55, 0x7a5434, 0, h * 0.27, 0, { seg: 7 }),
    ball(h * 0.34, 0x4fae32, 0, h * 0.66, 0, leaf), ball(h * 0.24, 0x66c23e, h * 0.2, h * 0.86, 0.12, leaf),
    ball(h * 0.22, 0x5ab838, -h * 0.2, h * 0.78, -0.1, leaf), ball(h * 0.18, 0x7ad44a, 0.05, h * 0.98, -0.05, leaf));
}
export function bush() { const real = libModel('bush', 0.9); if (real) { real.rotation.y = Math.random() * 6; return real; } return group(ball(0.5, 0x4fae32, 0, 0.35, 0, { seg: 7, scale: [1.3, 0.8, 1], mat: { flatShading: true } }), ball(0.35, 0x6ac840, 0.35, 0.45, 0.1, { seg: 7, mat: { flatShading: true } })); }
export function fence(len, color = 0xb08050) {
  const g = group(box(len, 0.1, 0.06, color, 0, 0.9, 0), box(len, 0.1, 0.06, color, 0, 0.4, 0));
  for (let x = -len / 2; x <= len / 2 + 0.01; x += 0.5) g.add(box(0.12, 1.2, 0.05, color, x, 0.6, 0.04));
  return g;
}
export function shed() {
  const g = group(box(3, 2.2, 2.4, 0x7a9a5a, 0, 1.1, 0), box(3.4, 0.12, 2.9, C.roof, 0, 2.45, 0, { rot: [0.12, 0, 0] }), door(0x5a4a3a));
  g.children[2].position.set(0, 0, 1.22);
  g.add(box(0.6, 0.5, 0.04, 0xbfe0f0, 0.95, 1.35, 1.21));
  return g;
}
export function well() {
  const g = group(cyl(0.75, 0.8, 0.7, C.stone, 0, 0.35, 0, { seg: 12 }), cyl(0.6, 0.6, 0.02, 0x3a7bd5, 0, 0.62, 0, { seg: 12, mat: { emissive: 0x0a2a5a } }),
    box(0.1, 1.5, 0.1, C.woodDark, -0.7, 1.2, 0), box(0.1, 1.5, 0.1, C.woodDark, 0.7, 1.2, 0), box(1.8, 0.1, 1.2, C.roof, 0, 2.0, 0, { rot: [0, 0, 0] }),
    cyl(0.06, 0.06, 1.4, C.wood, 0, 1.6, 0, { rot: [0, 0, Math.PI / 2] }));
  for (let i = 0; i < 6; i++) g.add(coin(0.07, false).translateX(Math.random() * 0.8 - 0.4).translateY(0.64).translateZ(Math.random() * 0.8 - 0.4));
  return g;
}
export function coinPusher() {
  const g = group(box(0.9, 1.0, 0.8, 0xd9534f, 0, 0.5, 0), box(0.9, 0.9, 0.06, 0x9fd8ff, 0, 1.45, 0.37, { mat: { transparent: true, opacity: 0.45 } }),
    box(0.9, 0.9, 0.8, 0xd9534f, 0, 1.45, -0.05, { mat: { side: THREE.BackSide } }), box(1.0, 0.25, 0.9, 0xf2b631, 0, 2.0, 0, { mat: { emissive: 0x6a4a00 } }));
  for (let i = 0; i < 14; i++) g.add(coin(0.06, false).translateX(Math.random() * 0.7 - 0.35).translateY(1.05 + Math.random() * 0.05).translateZ(Math.random() * 0.5 - 0.2));
  return g;
}
export function car(color = 0x3b6ea5) {
  const real = libModel('car', 1.45); if (real) return real;
  const g = group(box(1.7, 0.6, 3.6, color, 0, 0.55, 0), box(1.5, 0.55, 1.8, color, 0, 1.12, -0.2), box(1.45, 0.45, 1.7, 0xbfe0f0, 0, 1.13, -0.2),
    ...[[-0.85, 1.1], [0.85, 1.1], [-0.85, -1.1], [0.85, -1.1]].map(([x, z]) => cyl(0.3, 0.3, 0.2, 0x222222, x, 0.3, z, { rot: [0, 0, Math.PI / 2] })));
  g.add(box(1.6, 0.06, 1.0, color, 0, 1.5, -1.9, { rot: [-0.9, 0, 0] }));
  const table = group(box(1.4, 0.05, 0.7, 0xeeeeee, 0, 0.75, 0), box(0.05, 0.75, 0.6, 0x999999, -0.6, 0.37, 0), box(0.05, 0.75, 0.6, 0x999999, 0.6, 0.37, 0));
  const junk = [0xd9534f, 0xf2b631, 0x6aa84f, 0x9b59b6, 0x5b8bd9];
  for (let i = 0; i < 5; i++) table.add(box(0.15 + Math.random() * 0.15, 0.1 + Math.random() * 0.25, 0.15, junk[i], -0.5 + i * 0.25, 0.85, 0));
  table.position.set(0, 0, -2.8);
  g.add(table);
  return g;
}
export function headframe() {
  const g = group(box(0.15, 4, 0.15, C.woodDark, -0.9, 2, 0, { rot: [0, 0, 0.18] }), box(0.15, 4, 0.15, C.woodDark, 0.9, 2, 0, { rot: [0, 0, -0.18] }),
    box(2.2, 0.15, 0.15, C.woodDark, 0, 1.2, 0), box(1.4, 0.15, 0.15, C.woodDark, 0, 2.6, 0), cyl(1.1, 1.1, 0.2, 0x2a1d14, 0, 0.05, 0, { seg: 14, shadow: false }));
  const wheel = part(new THREE.TorusGeometry(0.5, 0.06, 6, 16), 0x444444, 0, 3.9, 0);
  wheel.name = 'wheel';
  g.add(wheel, cyl(0.02, 0.02, 3.7, 0x222222, 0, 2.0, 0));
  return g;
}
export function factory() {
  const g = group(box(12, 6, 8, 0x8a6f8f, 0, 3, 0), box(12.4, 0.4, 8.4, C.roof, 0, 6.2, 0));
  for (let i = 0; i < 3; i++) g.add(cyl(0.6, 0.8, 6, C.brick, -4 + i * 4, 9, 0));
  g.add(sofa(0xd9534f, 0xa83a3a, 3).translateY(6.4).translateZ(2));
  return g;
}
export function portal(color = 0xa070ff) {
  const g = group(part(new THREE.TorusGeometry(2, 0.3, 8, 24), color, 0, 0, 0, { mat: { emissive: color, emissiveIntensity: 0.6 }, shadow: false }),
    part(new THREE.CircleGeometry(1.9, 24), 0x2a0a4a, 0, 0, 0, { mat: { emissive: 0x3a1080, side: THREE.DoubleSide }, shadow: false }));
  const s = sofa(0x6aa84f, 0x4d8a2c, 1.4); s.scale.setScalar(0.6); s.position.y = -0.4; g.add(s);
  return g;
}
export function lampPost() {
  return group(cyl(0.07, 0.09, 4, 0x333333, 0, 2, 0), box(0.6, 0.08, 0.08, 0x333333, 0.25, 4, 0), box(0.3, 0.15, 0.3, 0xfff2b0, 0.5, 3.92, 0, { mat: { emissive: 0xffc070, emissiveIntensity: 3, map: null } }));
}
// the garden hole: a sculpted crater that gets deeper and wider as you dig (see setHoleDepth)
const HOLE_R = 1.7;
export function hole(soilMap) {
  const g = new THREE.Group();
  const geo = new THREE.CircleGeometry(HOLE_R, 48, 0, Math.PI * 2);
  // more rings so the crater can bend smoothly
  const ringGeo = new THREE.RingGeometry(0.001, HOLE_R, 48, 14);
  ringGeo.rotateX(-Math.PI / 2);
  void geo;
  const colors = new Float32Array(ringGeo.attributes.position.count * 3);
  ringGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const pit = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: soilMap || null, color: 0xffffff, vertexColors: true, roughness: 0.95 }));
  pit.name = 'pit'; pit.receiveShadow = true; pit.castShadow = false;
  pit.userData.base = Float32Array.from(ringGeo.attributes.position.array);
  g.add(pit);
  // lumpy dirt rim
  const rim = new THREE.Group(); rim.name = 'ring';
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; const r = HOLE_R + 0.05 + Math.random() * 0.15; const lump = ball(0.22 + Math.random() * 0.18, [0x9a6238, 0x8a5530, 0xa86c3e][i % 3], Math.cos(a) * r, 0.02, Math.sin(a) * r, { seg: 7, scale: [1.4, 0.45, 1], mat: { flatShading: true } }); rim.add(lump); }
  for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2, r = HOLE_R + 0.25 + Math.random() * 0.8; const rock = part(new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.12, 0), [0xb8b0a4, 0xd8cfc0, 0xc8784a][i % 3], Math.cos(a) * r, 0.05, Math.sin(a) * r, { rot: [Math.random() * 3, Math.random() * 3, 0], mat: { flatShading: true } }); rim.add(rock); }
  g.add(rim);
  const pile = group(ball(0.75, 0x9a6238, 0, 0.1, 0, { seg: 9, scale: [1.2, 0.55, 1], mat: { flatShading: true } }), ball(0.5, 0xa86c3e, 0.45, 0.25, 0.25, { seg: 8, scale: [1, 0.6, 1], mat: { flatShading: true } }), ball(0.42, 0x8a5530, -0.4, 0.2, -0.3, { seg: 8, scale: [1, 0.6, 1], mat: { flatShading: true } }));
  pile.position.set(2.7, 0, 0.8); pile.name = 'pile';
  g.add(pile);
  return g;
}
// depth in metres -> how the crater looks: deeper and darker in the middle
export function setHoleDepth(g, depth) {
  const pit = g.getObjectByName('pit');
  const pos = pit.geometry.attributes.position, base = pit.userData.base, col = pit.geometry.attributes.color;
  const k = Math.min(1, Math.log10(1 + depth) / 6);
  const deep = 0.15 + k * 2.4, open = 0.45 + k * 0.55;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3], z = base[i * 3 + 2], r = Math.hypot(x, z) / HOLE_R;
    const f = Math.max(0, 1 - r / open);
    const wobble = Math.sin(x * 5.1 + z * 3.3) * 0.04 + Math.sin(z * 7.7 - x * 2.1) * 0.03;
    pos.setY(i, -deep * Math.pow(f, 1.3) + (r < 0.98 ? wobble * f : 0));
    const shade2 = 1 - Math.pow(f, 0.8) * (0.55 + k * 0.4);
    col.setXYZ(i, shade2, shade2 * 0.95, shade2 * 0.9);
  }
  pos.needsUpdate = true; col.needsUpdate = true; pit.geometry.computeVertexNormals();
  g.getObjectByName('pile').scale.setScalar(0.4 + k * 0.7);
}

// ---------- coins & the thing ----------
const coinGeo = new THREE.CylinderGeometry(1, 1, 0.18, 16);
export function coin(r = 0.12, shadow = true, golden = false) {
  const m = new THREE.Mesh(coinGeo, mat(golden ? 0xffd34d : C.gold, { emissive: golden ? 0xb07800 : 0x5a3a00 }));
  m.scale.set(r, r, r);
  m.castShadow = shadow;
  return m;
}
export function theThing() {
  const g = group(cone(1.2, 2.3, 0xe9e1cf, 0, 1.15, 0, { seg: 7 }), cyl(1.25, 1.3, 0.25, 0xd8cfb8, 0, 0.12, 0, { seg: 7 }),
    box(0.5, 0.3, 0.02, 0xffffff, 0.7, 1.0, 0.95, { rot: [0, 0.4, 0.2] }));
  return g;
}

// ---------- text on a plane (signs, labels) ----------
export function textSprite(text, { size = 0.5, color = '#2d2118', bg = '#fffaf0', border = '#2d2118', font = 600, width = 1024 } = {}) {
  // fixed canvas size: the label is drawn centred and the rest left transparent,
  // so changing the text never reallocates the texture
  const cv = document.createElement('canvas');
  cv.width = width; cv.height = 100;
  const ctx = cv.getContext('2d');
  const draw = (t) => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    let px = 64;
    ctx.font = `${font} ${px}px Fredoka, sans-serif`;
    while (ctx.measureText(t).width > cv.width - 60 && px > 20) { px -= 4; ctx.font = `${font} ${px}px Fredoka, sans-serif`; }
    const w = Math.ceil(ctx.measureText(t).width) + 48;
    const x0 = (cv.width - w) / 2;
    if (bg) { ctx.fillStyle = bg; ctx.strokeStyle = border; ctx.lineWidth = 8; roundRect(ctx, x0 + 4, 4, w - 8, cv.height - 8, 22); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t, cv.width / 2, cv.height / 2 + 3);
  };
  draw(text);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true }));
  sp.scale.set(size * cv.width / cv.height, size, 1);
  let last = text;
  sp.userData.setText = (t) => {
    if (t === last) return;
    last = t; draw(t); tex.needsUpdate = true;
  };
  return sp;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}


// ---------- painted windows ----------
const winCache = {};
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a house window: dark glass, warm light inside, curtains
export function windowMat(lit = true, seed = 0) {
  const key = (lit ? 'L' : 'D') + (seed % 6);
  if (!winCache[key]) {
    const curtains = ['#c0504d', '#5b8bd9', '#e8d8a8', '#6aa84f', '#9b59b6', '#f2b631'][seed % 6];
    const tex = canvasTex(128, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, lit ? '#6a5040' : '#2a3a4a'); gr.addColorStop(1, lit ? '#d89850' : '#46586a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      if (lit) { const r = g.createRadialGradient(w * 0.5, h * 0.3, 2, w * 0.5, h * 0.3, 60); r.addColorStop(0, 'rgba(255,220,150,.9)'); r.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(10, h); g.lineTo(50, 0); g.lineTo(70, 0); g.lineTo(30, h); g.fill();
      g.fillStyle = curtains;
      g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 4; x < 26; x += 7) { g.fillRect(x, 0, 2, h); g.fillRect(w - 26 + x, 0, 2, h); }
    });
    winCache[key] = new THREE.MeshStandardMaterial({ map: tex, emissive: lit ? 0xffffff : 0x000000, emissiveMap: lit ? tex : null, emissiveIntensity: lit ? 0.55 : 0, roughness: 0.2 });
  }
  return winCache[key];
}
// a shop window display
export function displayMat(kind) {
  const key = 'disp-' + kind;
  if (!winCache[key]) {
    const tex = canvasTex(512, 220, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6e2b8'); gr.addColorStop(1, '#c89a68');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(80,50,30,.5)'; g.fillRect(0, h * 0.55, w, 6); g.fillRect(0, h * 0.9, w, 8);
      const rnd = (a, b) => a + Math.random() * (b - a);
      if (kind === 'bakery') for (let i = 0; i < 9; i++) { g.fillStyle = ['#c8843a', '#e8b060', '#f7a8bd', '#a8602a'][i % 4]; g.beginPath(); g.ellipse(40 + i * 54, h * 0.48, 22, 13, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(40 + i * 54, h * 0.84, 20, 16, 0, 0, 7); g.fill(); }
      if (kind === 'launderette') for (let i = 0; i < 5; i++) { g.fillStyle = '#f3f3f3'; g.fillRect(20 + i * 98, h * 0.3, 80, 120); g.fillStyle = '#4a7aa8'; g.beginPath(); g.arc(60 + i * 98, h * 0.3 + 70, 26, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(52 + i * 98, h * 0.3 + 62, 8, 0, 7); g.fill(); }
      if (kind === 'charity') for (let i = 0; i < 10; i++) { g.fillStyle = ['#c0504d', '#5b8bd9', '#6aa84f', '#f2b631', '#9b59b6'][i % 5]; g.fillRect(14 + i * 50, h * (i % 2 ? 0.25 : 0.62), 30, rnd(40, 70)); }
      if (kind === 'chippy') { g.fillStyle = '#bcc6cc'; g.fillRect(0, h * 0.6, w, h * 0.4); g.fillStyle = '#2a5a8a'; g.fillRect(w * 0.55, 20, 200, 110); g.fillStyle = '#fff'; g.font = '700 22px Fredoka, sans-serif'; ['COD £5.20', 'CHIPS £2.80', 'SAVELOY £1.90'].forEach((t, i) => g.fillText(t, w * 0.58, 50 + i * 30)); g.fillStyle = '#e8b060'; g.beginPath(); g.ellipse(120, h * 0.55, 70, 26, 0.2, 0, 7); g.fill(); }
      if (kind === 'pub') { g.fillStyle = 'rgba(140,70,20,.6)'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { g.fillStyle = ['#3a6a2a', '#8a3a1a', '#d8a040'][i % 3]; g.fillRect(20 + i * 40, h * 0.3, 16, 50); } }
      if (kind === 'post') { g.fillStyle = '#c8231f'; g.fillRect(30, 30, 180, 120); g.fillStyle = '#fff'; g.font = '700 26px Fredoka, sans-serif'; g.fillText('SEND IT!', 50, 100); for (let i = 0; i < 6; i++) { g.fillStyle = '#c8a070'; g.fillRect(260 + (i % 3) * 80, 40 + Math.floor(i / 3) * 80, 64, 56); } }
      if (kind === 'hardware') { for (let i = 0; i < 6; i++) { const x = 30 + i * 80; g.fillStyle = '#6a4a2a'; g.fillRect(x + 30, h * 0.25, 10, 110); g.fillStyle = ['#8a8a8a', '#c8231f', '#f2b631'][i % 3]; g.fillRect(x + 10, h * 0.25, 50, 24); } g.fillStyle = '#2d2118'; g.font = '700 26px Fredoka, sans-serif'; g.fillText('TOOLS!', w - 130, 40); }
      if (kind === 'barber') { for (let i = 0; i < 3; i++) { g.fillStyle = '#3a3a3a'; g.fillRect(60 + i * 150, h * 0.4, 70, 90); g.fillStyle = '#c8231f'; g.fillRect(60 + i * 150, h * 0.4, 70, 30); } }
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(40, h); g.lineTo(140, 0); g.lineTo(190, 0); g.lineTo(90, h); g.fill();
    });
    winCache[key] = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.4, roughness: 0.15 });
  }
  return winCache[key];
}

// ---------- the town ----------
// text painted on a flat panel (shop signs, house numbers): faces the street, unlike sprites
export function signPlane(text, w, h, { bg = '#2d6a4f', color = '#fffaf0', font = 700, glow = false } = {}) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(256 * w / h); cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 10; g.strokeRect(14, 14, cv.width - 28, cv.height - 28);
  let px = 150;
  g.font = `${font} ${px}px Fredoka, sans-serif`;
  while (g.measureText(text).width > cv.width - 90 && px > 30) { px -= 6; g.font = `${font} ${px}px Fredoka, sans-serif`; }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, cv.width / 2, cv.height / 2 + 8);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: glow ? 0xffffff : 0x000000, emissiveMap: glow ? tex : null, emissiveIntensity: glow ? 0.9 : 0 }));
  return m;
}
const triShape = (w, h) => new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
// a two-storey British terraced/semi house, front facing +z. Origin at the middle of the front wall, on the ground.
export function townHouse({ w = 9, d = 9, wallTex = null, wallColor = 0xb5573b, door = 0x3b6ea5, roof = M_ROOF, trim = 0xf3eee4, number = null, lit = true, hollow = false } = {}) {
  const g = new THREE.Group();
  const H = 5.4;
  // a hollow house (one you can go inside) gets its walls built separately; this adds the upstairs, roof and windows
  if (hollow) g.add(box(w, H - 2.9, d, wallTex || wallColor, 0, 2.9 + (H - 2.9) / 2, -d / 2, { sharp: true }));
  else g.add(box(w, H, d, wallTex || wallColor, 0, H / 2, -d / 2, { sharp: true }));
  // pitched roof along x, gables at the sides
  for (const s of [-1, 1]) g.add(box(w + 0.5, 0.18, d / 2 / Math.cos(0.6) + 0.4, roof, 0, H + 1.55, -d / 2 + s * d / 4, { rot: [s * -0.6 * -1, 0, 0], sharp: true }));
  const gable = new THREE.ExtrudeGeometry(triShape(d, 3.0), { depth: w - 0.02, bevelEnabled: false });
  const gm = part(gable, wallTex || wallColor, -w / 2 + 0.01, H, -d / 2, { rot: [0, Math.PI / 2, 0] });
  g.add(gm);
  g.add(box(0.7, 1.6, 0.7, 0x8a4a35, w / 2 - 1.2, H + 2.2, -d / 2 - 1, { sharp: true }), cyl(0.12, 0.12, 0.4, 0x9a6a50, w / 2 - 1.2, H + 3.1, -d / 2 - 1));
  // door, step, windows
  if (!hollow) g.add(box(1.1, 2.1, 0.12, door, -w / 4, 1.12, 0.03, { sharp: true }), ball(0.05, M_GOLD, -w / 4 + 0.38, 1.1, 0.12));
  g.add(box(1.5, 0.15, 0.6, 0xbab3a6, -w / 4, 0.075, 0.3, { sharp: true }));
  g.add(box(1.3, 0.4, 0.06, 0xd9eef7, -w / 4, 2.42, 0.05, { mat: { emissive: lit ? 0xffb860 : 0, emissiveIntensity: lit ? 0.6 : 0 }, sharp: true }));
  const win = (x, y, ww = 1.9, hh = 1.4) => {
    g.add(box(ww + 0.25, hh + 0.25, 0.1, trim, x, y, 0.02, { sharp: true }));
    g.add(box(ww, hh, 0.12, windowMat(lit && Math.random() < 0.75, Math.floor(Math.random() * 6)), x, y, 0.04, { sharp: true }));
    g.add(box(0.06, hh, 0.14, trim, x, y, 0.05, { sharp: true }), box(ww, 0.06, 0.14, trim, x, y, 0.05, { sharp: true }));
    g.add(box(ww + 0.4, 0.1, 0.25, trim, x, y - hh / 2 - 0.1, 0.1, { sharp: true }));
  };
  win(w / 4, 1.6, 2.4, 1.5);
  win(-w / 4, 4.0); win(w / 4, 4.0);
  if (number) { const n = signPlane(String(number), 0.4, 0.3, { bg: '#f3eee4', color: '#2d2118' }); n.position.set(-w / 4 + 0.85, 2.1, 0.1); g.add(n); }
  return g;
}
const M_ROOF = 0x5b4a5f, M_GOLD = 0xf2b631;
// a shop on the high street, front facing +z
export function shopFront({ w = 10, d = 8, name = 'SHOP', bg = '#2d6a4f', wallTex = null, wallColor = 0xd6c49f, awning = [0xd9534f, 0xfff6e6], lit = true, display = null, kind = 'charity' } = {}) {
  const g = new THREE.Group();
  const H = 6;
  g.add(box(w, H, d, wallTex || wallColor, 0, H / 2, -d / 2, { sharp: true }));
  g.add(box(w + 0.3, 0.4, d + 0.3, 0x6a5a5a, 0, H + 0.2, -d / 2, { sharp: true }));
  // big shop window and door
  g.add(box(w - 3.4, 2.4, 0.12, displayMat(kind), -1.0, 1.75, 0.04, { sharp: true }));
  g.add(box(w - 3.2, 0.5, 0.2, 0x3a3a3a, -1.0, 0.3, 0.06, { sharp: true }));
  g.add(box(1.2, 2.3, 0.12, 0x5a4a3a, w / 2 - 1.2, 1.15, 0.04, { sharp: true }), box(0.9, 1.4, 0.13, 0xa8cfe0, w / 2 - 1.2, 1.4, 0.05, { mat: { roughness: 0.1 }, sharp: true }));
  // sign
  const sign = signPlane(name, w - 0.6, 1.0, { bg, glow: lit });
  sign.position.set(0, 3.55, 0.1); g.add(sign);
  // striped awning
  const stripes = 8, aw = w - 0.8;
  for (let i = 0; i < stripes; i++) g.add(box(aw / stripes, 0.06, 1.3, awning[i % 2], -aw / 2 + (i + 0.5) * aw / stripes, 2.95, 0.6, { rot: [0.35, 0, 0], sharp: true }));
  // upstairs flat windows
  for (const x of [-w / 4, w / 4]) g.add(box(1.6, 1.2, 0.12, windowMat(Math.random() < 0.6, Math.floor(Math.random() * 6)), x, 4.9, 0.04, { sharp: true }), box(1.85, 1.45, 0.08, 0xf3eee4, x, 4.9, 0.0, { sharp: true }));
  if (display) { display.position.set(-1, 0.55, -0.4); g.add(display); }
  return g;
}
export function phoneBox() {
  const red = 0xc8231f;
  const g = group(box(1.1, 2.6, 1.1, red, 0, 1.3, 0), box(1.25, 0.25, 1.25, red, 0, 2.7, 0), part(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 4, 1, false, Math.PI / 4), red, 0, 2.9, 0));
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const pane = box(0.8, 1.6, 0.04, 0xbfe0f0, 0, 1.3, 0.56, { mat: { emissive: 0x806030, roughness: 0.1 } });
    const sgn = signPlane('TELEPHONE', 0.9, 0.18, { bg: '#1a1a1a', color: '#ffffff', glow: true }); sgn.position.set(0, 2.42, 0.565);
    const face = group(pane, sgn); face.rotation.y = r; g.add(face);
  }
  return g;
}
export function postbox() { return group(cyl(0.28, 0.3, 1.25, 0xc8231f, 0, 0.62, 0, { seg: 18 }), ball(0.3, 0xc8231f, 0, 1.25, 0, { scale: [1, 0.5, 1] }), box(0.3, 0.05, 0.05, 0x222222, 0, 1.0, 0.28), cyl(0.33, 0.33, 0.12, 0x222222, 0, 0.06, 0)); }
export function busStop() {
  const g = group(box(0.1, 2.5, 0.1, 0x333333, -1.4, 1.25, -0.6), box(0.1, 2.5, 0.1, 0x333333, 1.4, 1.25, -0.6), box(3.1, 0.1, 1.3, 0x3a5a7a, 0, 2.5, -0.1),
    box(3.0, 1.9, 0.05, 0xcfe8f5, 0, 1.3, -0.62, { mat: { transparent: true, opacity: 0.35, roughness: 0.1 } }), box(2.2, 0.1, 0.4, 0x8a6a4a, 0, 0.5, -0.35));
  const pole = group(cyl(0.04, 0.04, 2.8, 0x888888, 0, 1.4, 0)); const s = signPlane('BUS', 0.6, 0.6, { bg: '#c8231f' }); s.position.set(0, 2.6, 0.03); pole.add(s); pole.position.set(2.0, 0, 0.2);
  g.add(pole);
  return g;
}
export function wheelieBin(color = 0x2d4a2d) { return group(box(0.6, 0.95, 0.7, color, 0, 0.55, 0), box(0.66, 0.08, 0.76, color, 0, 1.05, 0.02), cyl(0.09, 0.09, 0.06, 0x111111, -0.25, 0.09, -0.32, { rot: [0, 0, Math.PI / 2] }), cyl(0.09, 0.09, 0.06, 0x111111, 0.25, 0.09, -0.32, { rot: [0, 0, Math.PI / 2] })); }
export function hedge(len) { const g = group(box(len, 1.1, 0.9, 0x3f7a2e, 0, 0.55, 0)); for (let x = -len / 2 + 0.4; x < len / 2; x += 0.8) g.add(ball(0.45, 0x4a8a35, x, 1.1, 0, { seg: 6, mat: { flatShading: true }, scale: [1, 0.6, 1.1] })); return g; }
export function lowWall(len, color = 0xb5573b) { return group(box(len, 0.6, 0.3, color, 0, 0.3, 0), box(len + 0.05, 0.08, 0.38, 0xd8d0c0, 0, 0.64, 0)); }
export function bench() { return group(box(1.8, 0.08, 0.5, C.wood, 0, 0.48, 0), box(1.8, 0.45, 0.06, C.wood, 0, 0.8, -0.24, { rot: [-0.15, 0, 0] }), box(0.08, 0.48, 0.5, 0x333333, -0.8, 0.24, 0), box(0.08, 0.48, 0.5, 0x333333, 0.8, 0.24, 0)); }
export function swings() {
  const g = group(box(0.1, 2.6, 0.1, 0xd9534f, -1.6, 1.25, -0.5, { rot: [0.2, 0, 0] }), box(0.1, 2.6, 0.1, 0xd9534f, -1.6, 1.25, 0.5, { rot: [-0.2, 0, 0] }),
    box(0.1, 2.6, 0.1, 0xd9534f, 1.6, 1.25, -0.5, { rot: [0.2, 0, 0] }), box(0.1, 2.6, 0.1, 0xd9534f, 1.6, 1.25, 0.5, { rot: [-0.2, 0, 0] }), box(3.4, 0.1, 0.1, 0xd9534f, 0, 2.5, 0));
  for (const x of [-0.7, 0.7]) { const seat = group(cyl(0.01, 0.01, 1.9, 0x999999, -0.22, -0.95, 0), cyl(0.01, 0.01, 1.9, 0x999999, 0.22, -0.95, 0), box(0.55, 0.05, 0.25, 0x333333, 0, -1.9, 0)); seat.position.set(x, 2.45, 0); seat.name = 'swing'; g.add(seat); }
  return g;
}
export function slide() {
  return group(box(0.8, 0.08, 3.2, 0x5bb0e0, 0, 1.0, 0.7, { rot: [0.62, 0, 0] }), box(0.8, 0.1, 0.8, 0xf2b631, 0, 1.9, -0.9), ...[[-0.35, -1.25], [0.35, -1.25], [-0.35, -0.55], [0.35, -0.55]].map(([x, z]) => box(0.08, 1.9, 0.08, 0xf2b631, x, 0.95, z)),
    ...[0.4, 0.9, 1.4].map((y) => box(0.7, 0.05, 0.12, 0x999999, 0, y, -1.35)));
}
export function fountain() {
  const g = group(cyl(2.4, 2.5, 0.6, C.stone, 0, 0.3, 0, { seg: 24 }), cyl(2.1, 2.1, 0.05, 0x4a8ac0, 0, 0.55, 0, { seg: 24, mat: { roughness: 0.1, emissive: 0x0a2a4a } }),
    cyl(0.3, 0.4, 1.4, C.stone, 0, 1.0, 0, { seg: 12 }), cyl(0.9, 0.5, 0.25, C.stone, 0, 1.75, 0, { seg: 16 }), ball(0.25, 0x9fd8f0, 0, 2.05, 0, { mat: { transparent: true, opacity: 0.6, emissive: 0x2a5a7a } }));
  for (let i = 0; i < 18; i++) g.add(coin(0.07, false).translateX(Math.random() * 3 - 1.5).translateY(0.57).translateZ(Math.random() * 3 - 1.5));
  return g;
}
export function pond(r = 5) { return group(cyl(r, r, 0.04, 0x3f7aa0, 0, 0.02, 0, { seg: 28, mat: { roughness: 0.08, emissive: 0x0a2236 }, shadow: false }), part(new THREE.TorusGeometry(r, 0.25, 6, 28), 0x8a7a5a, 0, 0.05, 0, { rot: [Math.PI / 2, 0, 0] })); }
export function duck() { return group(ball(0.16, 0x8a6a4a, 0, 0.12, 0, { scale: [0.9, 0.7, 1.3] }), ball(0.09, 0x2a6a3a, 0, 0.28, 0.14), cone(0.03, 0.08, C.orange, 0, 0.27, 0.25, { rot: [Math.PI / 2, 0, 0] })); }
export function dog(color = 0xb07a4a) {
  const g = group(box(0.25, 0.22, 0.55, color, 0, 0.32, 0), ball(0.14, color, 0, 0.48, 0.3), box(0.08, 0.06, 0.12, 0x222222, 0, 0.45, 0.44),
    box(0.06, 0.12, 0.04, color, -0.09, 0.6, 0.27), box(0.06, 0.12, 0.04, color, 0.09, 0.6, 0.27));
  const legs = [[-0.08, 0.18], [0.08, 0.18], [-0.08, -0.18], [0.08, -0.18]].map(([x, z]) => box(0.07, 0.22, 0.07, color, x, 0.11, z));
  legs[0].name = 'legL'; legs[1].name = 'legR';
  g.add(...legs);
  const tail = cyl(0.02, 0.03, 0.25, color, 0, 0.45, -0.32, { rot: [-0.8, 0, 0] }); tail.name = 'tail'; g.add(tail);
  return g;
}
export function pram() { return group(ball(0.4, 0x3b6ea5, 0, 0.75, 0, { scale: [0.8, 0.7, 1.1] }), cyl(0.1, 0.1, 0.05, 0x222222, -0.3, 0.12, 0.35, { rot: [0, 0, Math.PI / 2] }), cyl(0.1, 0.1, 0.05, 0x222222, 0.3, 0.12, 0.35, { rot: [0, 0, Math.PI / 2] }), cyl(0.1, 0.1, 0.05, 0x222222, -0.3, 0.12, -0.35, { rot: [0, 0, Math.PI / 2] }), cyl(0.1, 0.1, 0.05, 0x222222, 0.3, 0.12, -0.35, { rot: [0, 0, Math.PI / 2] }), cyl(0.02, 0.02, 0.7, 0x333333, 0, 0.95, -0.55, { rot: [Math.PI / 2, 0, 0] })); }

export function moustache() { return box(0.2, 0.05, 0.06, 0x4a3a2a, 0, 1.52, 0.16); }
export function lawnmower() { return group(box(0.5, 0.25, 0.6, 0xd9534f, 0, 0.2, 0), cyl(0.02, 0.02, 0.9, 0x333333, 0, 0.6, -0.45, { rot: [0.7, 0, 0] }), box(0.4, 0.04, 0.04, 0x333333, 0, 0.92, -0.75)); }
export function jar(label = 'THING FUND') {
  const g = group(cyl(0.22, 0.22, 0.5, 0xcfe8f5, 0, 0.25, 0, { seg: 16, mat: { transparent: true, opacity: 0.35, roughness: 0.05, map: null } }), cyl(0.2, 0.2, 0.06, 0x8a6a4a, 0, 0.52, 0, { seg: 16 }));
  for (let i = 0; i < 14; i++) g.add(coin(0.06, false).translateX(Math.random() * 0.24 - 0.12).translateY(0.05 + i * 0.02).translateZ(Math.random() * 0.24 - 0.12));
  const l = signPlane(label, 0.36, 0.12, { bg: '#f3eee4', color: '#2d2118' }); l.position.set(0, 0.3, 0.225); g.add(l);
  return g;
}
export function desk() { return group(box(1.4, 0.06, 0.7, C.wood, 0, 0.75, 0), box(0.06, 0.75, 0.66, C.woodDark, -0.65, 0.37, 0), box(0.06, 0.75, 0.66, C.woodDark, 0.65, 0.37, 0)); }
export function monitor(text) { const g = group(box(0.7, 0.45, 0.05, 0x222222, 0, 1.08, 0), box(0.08, 0.3, 0.08, 0x333333, 0, 0.85, -0.02)); const sc = signPlane(text, 0.64, 0.38, { bg: '#1f4a2f', color: '#9be38a', glow: true }); sc.position.set(0, 1.08, 0.03); g.add(sc); return g; }

// an emoji icon as a little standing picture (uses the bundled Twemoji SVGs)
const iconTexCache = {};
function emojiFile(emoji) {
  const cps = [...emoji].map((c) => c.codePointAt(0));
  const list = cps.includes(0x200d) ? cps : cps.filter((c) => c !== 0xfe0f);
  return list.map((c) => c.toString(16)).join('-');
}
export function iconSprite(emoji, size = 0.32) {
  if (!iconTexCache[emoji]) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const img = new Image();
    img.onload = () => { c.getContext('2d').drawImage(img, 4, 4, 120, 120); tex.needsUpdate = true; };
    img.src = `assets/icons/${emojiFile(emoji)}.svg`;
    iconTexCache[emoji] = tex;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexCache[emoji] }));
  sp.scale.set(size, size, 1);
  return sp;
}
export function stallTable() {
  const g = group(box(2.2, 0.06, 0.8, 0xe8e2d4, 0, 0.72, 0), box(2.25, 0.5, 0.03, 0xd9534f, 0, 0.47, 0.41), box(0.06, 0.72, 0.06, 0x8a8a8a, -1.0, 0.36, -0.3), box(0.06, 0.72, 0.06, 0x8a8a8a, 1.0, 0.36, -0.3), box(0.06, 0.72, 0.06, 0x8a8a8a, -1.0, 0.36, 0.3), box(0.06, 0.72, 0.06, 0x8a8a8a, 1.0, 0.36, 0.3));
  const cloth = signPlane('BARGAINS', 2.0, 0.42, { bg: '#d9534f', color: '#fffaf0' }); cloth.position.set(0, 0.47, 0.43); g.add(cloth);
  return g;
}

// ---------- underground ----------
export function torch() {
  return group(cyl(0.04, 0.05, 0.6, C.woodDark, 0, 0.3, 0), cone(0.09, 0.22, 0xffa040, 0, 0.7, 0, { seg: 8, mat: { emissive: 0xff7a20, emissiveIntensity: 3, map: null } }));
}
export function rat() {
  const g = group(ball(0.12, 0x8a8a8a, 0, 0.1, 0, { scale: [0.8, 0.7, 1.4] }), ball(0.07, 0x8a8a8a, 0, 0.14, 0.17), ball(0.03, 0xf7a8bd, 0, 0.13, 0.24),
    cyl(0.01, 0.015, 0.3, 0xf7a8bd, 0, 0.08, -0.25, { rot: [1.2, 0, 0] }), cyl(0.05, 0.05, 0.06, 0x2d2118, 0, 0.23, 0.15), cyl(0.07, 0.07, 0.01, 0x2d2118, 0, 0.2, 0.15));
  return g;
}
export function column(h = 3.2) { return group(cyl(0.38, 0.42, h, 0xe8e0cc, 0, h / 2, 0, { seg: 14 }), box(1, 0.25, 1, 0xd8d0bc, 0, 0.12, 0), box(1, 0.25, 1, 0xd8d0bc, 0, h - 0.12, 0)); }
export function brokenColumn() { return group(cyl(0.38, 0.42, 1.2, 0xe8e0cc, 0, 0.6, 0, { seg: 14 }), box(1, 0.25, 1, 0xd8d0bc, 0, 0.12, 0), cyl(0.38, 0.38, 1.5, 0xe8e0cc, 0.9, 0.38, 0.4, { seg: 14, rot: [0, 0, Math.PI / 2] })); }
export function chest() { return group(box(1.0, 0.55, 0.6, 0x8a5a2a, 0, 0.28, 0), box(1.02, 0.25, 0.62, 0x6e4a2a, 0, 0.62, 0), box(0.12, 0.18, 0.05, 0xf2b631, 0, 0.5, 0.31), box(1.04, 0.06, 0.06, 0xf2b631, 0, 0.56, 0.3)); }
export function junkPile() { return group(ball(0.7, 0x6a4a2a, 0, 0.1, 0, { scale: [1.2, 0.55, 1], seg: 7, mat: { flatShading: true } }), box(0.25, 0.08, 0.15, 0xc8231f, 0.2, 0.42, 0.1, { rot: [0.3, 0.5, 0] }), cyl(0.05, 0.05, 0.25, 0x5bb0e0, -0.3, 0.38, 0, { rot: [0, 0, 1.2] }), coin(0.07, false).translateY(0.45).translateX(0.05)); }
export function moleHouse(color = 0x8a5a3a) {
  const g = group(ball(1.6, 0x6a4a2a, 0, 0, 0, { scale: [1, 0.85, 1], seg: 10, mat: { flatShading: true } }), box(0.8, 1.2, 0.2, color, 0, 0.6, 1.45), ball(0.05, M_GOLD2, 0.25, 0.6, 1.56),
    box(0.5, 0.5, 0.12, 0xffd08a, 0.95, 0.9, 1.15, { rot: [0, 0.5, 0], mat: { emissive: 0xffa040, emissiveIntensity: 0.8, map: null } }), cyl(0.12, 0.12, 0.6, 0x4a3a2a, -0.6, 1.4, 0));
  return g;
}
const M_GOLD2 = 0xf2b631;
export function moleKing() {
  const g = mole(); g.scale.setScalar(3.2);
  const crown = group(cyl(0.09, 0.08, 0.06, 0xf2b631, 0, 0.27, 0.05, { mat: { emissive: 0x5a3a00 } }));
  for (let i = 0; i < 5; i++) crown.add(cone(0.02, 0.05, 0xf2b631, Math.cos(i * 1.26) * 0.08, 0.32, 0.05 + Math.sin(i * 1.26) * 0.08));
  g.add(crown);
  return g;
}
export function moleCitizen() {
  const g = mole(); g.scale.setScalar(2);
  g.add(ball(0.03, 0x111111, -0.05, 0.17, 0.18), ball(0.03, 0x111111, 0.05, 0.17, 0.18));
  return g;
}
export function throne() { return group(box(1.6, 0.5, 1.2, 0x8a2a2a, 0, 0.25, 0), box(1.6, 1.8, 0.25, 0x8a2a2a, 0, 1.15, -0.5), box(1.7, 0.2, 0.3, 0xf2b631, 0, 2.1, -0.5)); }
export function water(w, d) { return part(new THREE.BoxGeometry(w, 0.05, d), 0x3a5a4a, 0, 0, 0, { mat: { roughness: 0.05, emissive: 0x0a1a12, map: null }, shadow: false }); }

// ---------- kitchen & loft ----------
export function washingMachine() {
  const g = group(box(0.7, 0.85, 0.65, 0xf3f3f3, 0, 0.43, 0), box(0.7, 0.1, 0.65, 0xdddddd, 0, 0.9, 0), part(new THREE.TorusGeometry(0.2, 0.04, 8, 20), 0x999999, 0, 0.45, 0.33), cyl(0.18, 0.18, 0.02, 0x7ab0d8, 0, 0.45, 0.33, { rot: [Math.PI / 2, 0, 0], mat: { roughness: 0.1, map: null } }), box(0.15, 0.06, 0.02, 0x333333, 0.2, 0.8, 0.33));
  const drum = cyl(0.15, 0.15, 0.03, 0xffffff, 0, 0.45, 0.31, { rot: [Math.PI / 2, 0, 0] }); drum.name = 'drum'; g.add(drum);
  return g;
}
export function basket() { return group(cyl(0.3, 0.25, 0.45, 0xd8b878, 0, 0.23, 0, { seg: 12 }), ball(0.25, 0x5b8bd9, 0.05, 0.45, 0, { scale: [1, 0.4, 1] }), ball(0.18, 0xd9534f, -0.1, 0.5, 0.05, { scale: [1, 0.4, 1] })); }
export function rockingHorse() { return group(box(1.0, 0.06, 0.3, C.woodDark, 0, 0.1, 0, { rot: [0, 0, 0] }), box(0.7, 0.3, 0.25, 0xf3eee4, 0, 0.6, 0), box(0.25, 0.35, 0.2, 0xf3eee4, 0.4, 0.85, 0), box(0.06, 0.45, 0.06, C.woodDark, -0.25, 0.3, 0), box(0.06, 0.45, 0.06, C.woodDark, 0.25, 0.3, 0), box(0.25, 0.08, 0.26, 0xd9534f, 0, 0.78, 0)); }
export function cardboardBox(label) { const g = group(box(0.7, 0.5, 0.5, 0xc8a070, 0, 0.25, 0), box(0.72, 0.04, 0.2, 0xb08a5a, 0, 0.5, -0.12)); if (label) { const l = signPlane(label, 0.5, 0.16, { bg: '#f3eee4', color: '#2d2118' }); l.position.set(0, 0.3, 0.26); g.add(l); } return g; }

// ---------- town event props ----------
export function bunting(len) {
  const g = new THREE.Group();
  const cols = [0xd9534f, 0xf2b631, 0x5b8bd9, 0x6aa84f, 0xffffff];
  g.add(cyl(0.01, 0.01, len, 0x333333, 0, 0, 0, { rot: [0, 0, Math.PI / 2] }));
  for (let x = -len / 2 + 0.3; x < len / 2; x += 0.5) g.add(cone(0.12, 0.3, cols[Math.floor(Math.random() * 5)], x, -0.15 - Math.sin((x / len + 0.5) * Math.PI) * 0.4, 0, { seg: 3, rot: [Math.PI, 0, 0] }));
  return g;
}
export function ferrisWheel() {
  const g = new THREE.Group();
  g.add(box(0.3, 9, 0.3, 0xdddddd, -1.5, 4.5, 0, { rot: [0, 0, 0.2] }), box(0.3, 9, 0.3, 0xdddddd, 1.5, 4.5, 0, { rot: [0, 0, -0.2] }));
  const wheel = new THREE.Group(); wheel.name = 'wheel'; wheel.position.y = 8.5;
  wheel.add(part(new THREE.TorusGeometry(5, 0.15, 6, 32), 0xd9534f, 0, 0, 0));
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; wheel.add(box(0.08, 5, 0.08, 0xdddddd, Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0, { rot: [0, 0, a + Math.PI / 2] })); const car = box(0.8, 0.6, 0.6, [0xf2b631, 0x5b8bd9, 0x6aa84f][i % 3], Math.cos(a) * 5, Math.sin(a) * 5 - 0.5, 0); car.name = 'car'; wheel.add(car); }
  g.add(wheel);
  return g;
}
export function iceCreamVan() {
  const g = group(box(2.0, 1.9, 4.2, 0xf3f3f3, 0, 1.25, 0), box(1.9, 1.0, 1.2, 0xf7a8bd, 0, 1.0, 2.6), box(1.8, 0.6, 1.1, 0xbfe0f0, 0, 1.75, 2.6), box(0.05, 0.9, 1.6, 0x333333, 1.01, 1.5, -0.3));
  for (const [x, z] of [[-0.95, 2.4], [0.95, 2.4], [-0.95, -1.4], [0.95, -1.4]]) g.add(cyl(0.35, 0.35, 0.25, 0x222222, x, 0.35, z, { rot: [0, 0, Math.PI / 2] }));
  const cone1 = group(cone(0.25, 0.6, 0xe8b060, 0, 2.5, 0, { rot: [Math.PI, 0, 0] }), ball(0.28, 0xfff6e6, 0, 2.95, 0)); g.add(cone1);
  return g;
}
export function filmCamera() { return group(box(0.06, 1.3, 0.06, 0x333333, 0, 0.65, 0), box(0.5, 0.35, 0.7, 0x222222, 0, 1.45, 0), cyl(0.12, 0.14, 0.4, 0x111111, 0, 1.45, 0.5, { rot: [Math.PI / 2, 0, 0] }), cyl(0.2, 0.2, 0.1, 0x333333, 0, 1.75, 0.1, { rot: [0, 0, Math.PI / 2] })); }
export function snowman() { return group(ball(0.5, 0xffffff, 0, 0.45, 0), ball(0.35, 0xffffff, 0, 1.1, 0), ball(0.24, 0xffffff, 0, 1.55, 0), cone(0.05, 0.25, 0xf08a24, 0, 1.55, 0.3, { rot: [Math.PI / 2, 0, 0] }), cyl(0.18, 0.2, 0.3, 0x222222, 0, 1.85, 0)); }
export function redCarpet(len) { return box(len, 0.02, 1.6, 0xb81d1d, 0, 0.02, 0, { sharp: true }); }
export function xMark() { const g = group(box(1.1, 0.03, 0.22, 0xc8231f, 0, 0.03, 0, { rot: [0, 0.78, 0], mat: { emissive: 0x801010 } }), box(1.1, 0.03, 0.22, 0xc8231f, 0, 0.03, 0, { rot: [0, -0.78, 0], mat: { emissive: 0x801010 } })); return g; }
