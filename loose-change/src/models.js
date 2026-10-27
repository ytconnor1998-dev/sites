// Loose Change — every 3D model in the game, built from simple shapes in code.
// No downloaded models: all original, chunky low-poly style.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
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
  const screen = box(1.5, 0.85, 0.04, 0x1a2a3a, 0, 1.15, 0.05, { mat: { emissive: 0x2a5070 } });
  screen.name = 'screen';
  return group(box(1.6, 0.5, 0.45, C.woodDark, 0, 0.25, 0), box(1.6, 0.95, 0.06, C.ink, 0, 1.15, 0), screen);
}
export function lamp() {
  const shade = cone(0.28, 0.35, 0xf8b04a, 0, 1.55, 0, { seg: 10, mat: { emissive: 0x5a3a10 } });
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
    box(0.5, 0.18, 0.12, 0xf08a24, 0, 0.15, 0.2, { mat: { emissive: 0xc04a00 } }));
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
  if (hat === 'bun') g.add(ball(0.12, 0xd9d9d9, 0, 1.8, -0.08), box(0.36, 0.12, 0.36, 0xd9d9d9, 0, 1.72, -0.02));
  g.scale.setScalar(s);
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
export function tree(h = 3) {
  return group(cyl(0.15, 0.22, h * 0.5, C.woodDark, 0, h * 0.25, 0, { seg: 7 }), ball(h * 0.32, 0x4f9a3a, 0, h * 0.65, 0, { seg: 7, mat: { flatShading: true } }), ball(h * 0.22, 0x5fb046, h * 0.15, h * 0.85, 0.1, { seg: 6, mat: { flatShading: true } }));
}
export function bush() { return group(ball(0.5, 0x4f9a3a, 0, 0.35, 0, { seg: 6, scale: [1.3, 0.8, 1], mat: { flatShading: true } }), ball(0.35, 0x5fb046, 0.35, 0.45, 0.1, { seg: 6, mat: { flatShading: true } })); }
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
  return group(cyl(0.07, 0.09, 4, 0x333333, 0, 2, 0), box(0.6, 0.08, 0.08, 0x333333, 0.25, 4, 0), box(0.3, 0.15, 0.3, 0xfff2b0, 0.5, 3.92, 0, { mat: { emissive: 0x8a7a30 } }));
}
export function hole() {
  const g = new THREE.Group();
  const pit = part(new THREE.CylinderGeometry(1, 1, 0.02, 20), 0x140c06, 0, 0.012, 0, { shadow: false, mat: { flatShading: false } });
  pit.name = 'pit';
  const ring = part(new THREE.TorusGeometry(1.02, 0.12, 6, 20), C.soil, 0, 0.02, 0, { rot: [Math.PI / 2, 0, 0] });
  ring.name = 'ring';
  const pile = cone(0.9, 0.6, 0x8b5a33, 1.9, 0.3, 0.6, { seg: 9 });
  pile.name = 'pile';
  g.add(pit, ring, pile);
  return g;
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
export function textSprite(text, { size = 0.5, color = '#2d2118', bg = '#fffaf0', border = '#2d2118', font = 600 } = {}) {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  const draw = (t) => {
    const px = 64;
    ctx.font = `${font} ${px}px Fredoka, sans-serif`;
    const w = Math.ceil(ctx.measureText(t).width) + 48;
    cv.width = w; cv.height = px + 36;
    ctx.font = `${font} ${px}px Fredoka, sans-serif`;
    if (bg) { ctx.fillStyle = bg; ctx.strokeStyle = border; ctx.lineWidth = 8; roundRect(ctx, 4, 4, w - 8, cv.height - 8, 22); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t, w / 2, cv.height / 2 + 3);
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
    sp.scale.set(size * cv.width / cv.height, size, 1);
  };
  return sp;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
