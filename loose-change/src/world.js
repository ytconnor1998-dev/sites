// Loose Change — the 3D world: your house, the back garden, the street and the corner shop.
// First-person: WASD to walk, mouse to look, E / click to use things, Tab for your phone.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as M from './models.js';
import { tex } from './textures.js';

const LC = globalThis.LC;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const EYE = 1.25, CROUCH_EYE = 0.72, RADIUS = 0.32, WALK = 4.2, RUN = 7, GRAVITY = 18;
const BOUNDS = { x0: -62, x1: 62, z0: -26, z1: 56 };

let renderer, scene, camera, sun, hemi, canvas, composer = null, clouds = null, grainPass = null;
const colliders = [];
const interactables = [];
const agents = [];
const pickups = [];
const particles = [];
const keys = new Set();
const player = { pos: new THREE.Vector3(-3.5, 0, 0.6), vy: 0, yaw: Math.PI, pitch: -0.12, bob: 0, stepT: 0 };
let crouching = false, eye = EYE;
let locked = false, flip = 0, flipTarget = 0, holdTimer = 0, holding = false, focus = null, shake = 0;
let sensitivity = 1;

// ---------- building helpers ----------
function add(obj, x = 0, y = 0, z = 0, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; scene.add(obj); return obj; }
function collide(x0, z0, x1, z1) { const c = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }; colliders.push(c); return c; }
function collideObj(obj, pad = 0) {
  const b = new THREE.Box3().setFromObject(obj);
  collide(b.min.x - pad, b.min.z - pad, b.max.x + pad, b.max.z + pad);
}
const WALL_TEX = { 0xf3e6c8: 'wallpaper', 0xe8d9f0: 'wallpaper2', 0xe58a6b: 'brick' };
function texMat(name, rx, ry, color = 0xffffff) { return new THREE.MeshLambertMaterial({ color, map: tex(name, rx, ry) }); }
function wall(x0, z0, x1, z1, color = 0xf3e6c8, h = 2.8, t = 0.2) {
  const w = Math.abs(x1 - x0) || t, d = Math.abs(z1 - z0) || t;
  const tn = WALL_TEX[color];
  const m = M.box(w, h, d, tn ? texMat(tn, Math.max(w, d) / 2, h / 2) : color, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, { sharp: true });
  m.receiveShadow = true;
  scene.add(m);
  collide(x0 - (w === t ? t / 2 : 0), z0 - (d === t ? t / 2 : 0), x1 + (w === t ? t / 2 : 0), z1 + (d === t ? t / 2 : 0));
  return m;
}
const FLOOR_TEX = { 0xc9a27a: ['wood', 2.5], 0xd9d4c7: ['tiles', 1.2], 0x86c964: ['grass', 5], 0xbcb3a3: ['paving', 1.2], 0xcfcac0: ['paving', 1.2], 0x4a4a52: ['tarmac', 3], 0xe6e0d0: ['tiles', 1.2] };
function floor(x0, z0, x1, z1, color, y = 0.01) {
  const ft = FLOOR_TEX[color];
  const look = ft ? texMat(ft[0], (x1 - x0) / ft[1], (z1 - z0) / ft[1]) : color;
  const m = M.box(x1 - x0, 0.02, z1 - z0, look, (x0 + x1) / 2, y, (z0 + z1) / 2, { shadow: false, sharp: true });
  m.receiveShadow = true; scene.add(m); return m;
}
// small things get a bigger invisible target so they're easy to aim at
function hitbox(obj, w, h, d, y = h / 2) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  m.position.y = y; m.userData.noAO = true; obj.add(m); return obj;
}
function interact(obj, def) { obj.traverse((o) => { o.userData.interact = def; }); interactables.push(obj); def.obj = obj; return def; }

// fake volumetric light: a soft additive cone under a lamp
let coneTex = null;
const streetGlow = [];
function lightCone(x, y, z, h, r, color = 0xffd9a0, strength = 0.045) {
  if (!coneTex) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 128;
    const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    coneTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, r, h, 24, 1, true), new THREE.MeshBasicMaterial({ color, map: coneTex, transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.position.set(x, y - h / 2, z);
  m.userData.noAO = true;
  scene.add(m);
  return m;
}
// floating dust in the warm indoor light
let dust = null;
function buildDust() {
  const n = 260, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rand(-6.8, 6.8); pos[i * 3 + 1] = rand(0.2, 2.7); pos[i * 3 + 2] = rand(-4.8, 4.8); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  dust = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.035, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);
}

// ---------- the level ----------
const spots = {};
function buildLevel() {
  // ground, sky bits
  const ground = M.box(160, 0.1, 160, texMat('grass', 160 / 5, 160 / 5), 0, -0.05, 0, { shadow: false, sharp: true });
  ground.receiveShadow = true; scene.add(ground);

  // ---- house ----
  floor(-7, -5, 0, 5, 0xc9a27a);           // living room floor
  floor(0, -5, 7, 5, 0xd9d4c7);            // hall / kitchen tiles
  const wc = 0xf3e6c8, wc2 = 0xe8d9f0;
  wall(-7, -5, -6.2, -5, wc); wall(-5, -5, 0, -5, wc); wall(0, -5, 7, -5, wc2);    // back wall, back door gap at x -6.2..-5
  wall(-7, 5, 0, 5, wc); wall(0, 5, 2.4, 5, wc2); wall(3.6, 5, 7, 5, wc2);         // front wall, front door gap at x 2.4..3.6
  wall(-7, -5, -7, 5, wc); wall(7, -5, 7, 5, wc2);
  wall(0, -5, 0, -0.7, wc); wall(0, 0.7, 0, 5, wc);                                 // inside wall with a doorway
  // brick on the outside of the house
  const facade = (x0, z0, x1, z1, ox, oz) => {
    const w = Math.abs(x1 - x0) || 0.04, d = Math.abs(z1 - z0) || 0.04;
    scene.add(M.box(w, 2.8, d, texMat('brick', Math.max(w, d) / 2, 2.8 / 1.6), (x0 + x1) / 2 + ox, 1.4, (z0 + z1) / 2 + oz, { shadow: false, sharp: true }));
  };
  facade(-7.1, -5, -6.2, -5, 0, -0.12); facade(-5, -5, 7.1, -5, 0, -0.12);
  facade(-7.1, 5, 2.4, 5, 0, 0.12); facade(3.6, 5, 7.1, 5, 0, 0.12);
  facade(-7, -5.1, -7, 5.1, -0.12, 0); facade(7, -5.1, 7, 5.1, 0.12, 0);
  for (const [x, z] of [[-6.2, -5], [-5, -5], [2.4, 5], [3.6, 5]]) scene.add(M.box(0.25, 0.25, 0.25, wc, x, 2.7, z, { shadow: false }));
  scene.add(M.box(1.2, 0.6, 0.22, wc, -5.6, 2.5, -5, { shadow: false }), M.box(1.2, 0.6, 0.22, wc2, 3, 2.5, 5, { shadow: false }));
  // windows
  for (const [x, z, ry] of [[-3.5, 5.01, 0], [-3.5, -5.01, 0], [5.2, 5.01, 0], [-7.01, 2.6, Math.PI / 2]]) {
    const win = M.box(1.6, 1.1, 0.05, M.windowMat(true, 2), 0, 0, 0, { shadow: false, sharp: true });
    add(win, x, 1.6, z, ry);
  }
  // roof (doesn't cast shadows so the inside stays bright)
  const roofMat = M.mat(M.C.roof);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.2, 6.2), roofMat);
    r.position.set(0, 3.95, s * 2.75); r.rotation.x = s * 0.42; r.castShadow = true; scene.add(r);
  }
  // gable ends: triangles from the top of the walls up to the ridge
  const tri = new THREE.Shape([new THREE.Vector2(-5.1, 0), new THREE.Vector2(5.1, 0), new THREE.Vector2(0, 2.35)]);
  const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const gable = new THREE.Mesh(gableGeo, M.mat(s < 0 ? wc : wc2));
    gable.rotation.y = Math.PI / 2; gable.position.set(s * 7 - 0.1, 2.8, 0); scene.add(gable);
  }
  // ceiling, so the inside feels like a room
  const ceiling = M.box(14, 0.1, 10, new THREE.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.9 }), 0, 2.85, 0, { sharp: true });
  scene.add(ceiling);
  // ceiling lamps: glowing shades with a soft cone of light underneath
  for (const x of [-3.5, 3.5]) {
    scene.add(M.cyl(0.25, 0.32, 0.14, 0xfff2c0, x, 2.74, 0, { mat: { emissive: 0xffc880, emissiveIntensity: 2.2, map: null }, shadow: false }));
    lightCone(x, 2.68, 0, 2.2, 1.5);
  }
  spots.ridge = { x0: -6.5, x1: 6.5, y: 5.15, z: 0 };
  add(M.box(0.6, 1.6, 0.6, M.C.brick, 0, 0, 0), -4, 4.4, 1.5);

  // living room
  const sofa = add(M.sofa(), -3.5, 0, 3.9, Math.PI); collideObj(sofa, 0.05);
  spots.sofa = sofa;
  interact(sofa, { range: 3.4, hold: true, tool: 'sofa', pulse: true, prompt: () => LC.game.sofaPrompt(), use: (auto) => rummage(sofa, auto) });
  const arm = add(M.armchair(), -6.1, 0, 1.4, Math.PI / 2); collideObj(arm, 0.05); spots.armchair = arm;
  add(M.rug(texMat('carpet', 1, 1)), -3.5, 0, 1.4);
  const tbl = add(M.coffeeTable(), -3.5, 0, 2.3); collideObj(tbl);
  const tv = add(M.tv(), -3.5, 0, -4.65); collideObj(tv);
  add(M.lamp(), -0.6, 0, 4.4);
  add(M.plant(), -6.4, 0, 4.4);
  const shelf = add(M.bookshelf(), -0.35, 0, -3, -Math.PI / 2); collideObj(shelf);
  const fire = add(M.fireplace(), -6.72, 0, -2, Math.PI / 2); collideObj(fire);
  spots.pig = new THREE.Vector3(-6.45, 1.2, -2);
  // hall / kitchen
  const ctr = add(M.counter(4), 4, 0, -4.55); collideObj(ctr);
  const fr = add(M.fridge(), 6.45, 0, -4.4); collideObj(fr);
  add(M.rug(0x3b6ea5), 3, 0, 3.6).scale.set(0.5, 1, 0.35);
  const thing = add(M.theThing(), 4.8, 0, 1.6); collideObj(thing, 0.1);
  spots.thing = thing;
  // kitchen: Mum's change jar and the washing machine
  const mumJar = hitbox(add(M.jar("MUM'S CHANGE"), 3, 0.96, -4.45), 0.7, 0.9, 0.6, 0.3);
  interact(mumJar, { range: 2.6, prompt: () => LC.game.jarPrompt(), use: () => LC.game.kitchenJar() });
  const wm = add(M.washingMachine(), 6.55, 0, -2.6, -Math.PI / 2); collideObj(wm);
  spots.washer = wm;
  interact(wm, { range: 2.6, prompt: () => LC.game.washPrompt(), use: () => LC.game.washer() });
  add(M.basket(), 6.3, 0, -1.4);
  // the loft hatch in the hall ceiling
  const hatch = M.box(1.0, 0.04, 1.0, 0xe8e0d0, 2.5, 2.79, -2.6, { sharp: true }); scene.add(hatch);
  const hatchHit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hatchHit.position.set(2.5, 2.4, -2.6); hatchHit.userData.noAO = true; scene.add(hatchHit);
  interact(hatchHit, { range: 3.2, prompt: () => LC.game.hatchPrompt(), use: () => LC.game.hatch() });
  buildMuseum();
  const thingLabel = M.textSprite('???', { size: 0.42 }); thingLabel.position.set(4.8, 2.75, 1.6); scene.add(thingLabel);
  spots.thingLabel = thingLabel;
  interact(thing, { range: 3, prompt: () => LC.game.thingPrompt(), use: () => LC.game.tryBuyThing() });

  // ---- back garden (north) ----
  floor(-12, -26, 12, -5, 0x86c964, 0.005);
  for (const [x0, z0, x1, z1] of [[-12, -5, -12, -26], [12, -5, 12, -26], [-12, -26, 12, -26], [-12, -5, -7, -5], [7, -5, 12, -5]]) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const f = M.fence(len); f.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); f.rotation.y = x0 === x1 ? Math.PI / 2 : 0; scene.add(f);
    collide(x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1);
  }
  floor(-6.4, -8, -4.8, -5, 0xbcb3a3, 0.015); // patio step
  const holeG = add(M.hole(), -2, 0, -14);
  spots.hole = holeG;
  collide(-3, -15, -1, -13);
  // a bigger invisible target so the hole is easy to aim at
  const holeHit = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.2, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  holeHit.position.y = 0.6; holeG.add(holeHit);
  interact(holeG, { range: 4.5, hold: true, tool: 'dig', prompt: () => LC.game.digPrompt(), use: () => dig(holeG) });
  const sign = M.textSprite('0 m', { size: 0.45 }); sign.position.set(-2, 1.9, -12.4); scene.add(sign);
  add(M.box(0.08, 1.6, 0.08, M.C.woodDark, 0, 0, 0), -2, 0.8, -12.45);
  spots.depthSign = sign;
  // a ladder appears once the hole is deep enough to climb into
  const ladder = new THREE.Group();
  ladder.add(M.box(0.06, 1.6, 0.06, M.C.wood, -0.25, 0.4, 0), M.box(0.06, 1.6, 0.06, M.C.wood, 0.25, 0.4, 0));
  for (let i = 0; i < 4; i++) ladder.add(M.box(0.5, 0.05, 0.05, M.C.wood, 0, -0.1 + i * 0.35, 0));
  const ladderHit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  ladderHit.position.y = 0.4; ladderHit.userData.noAO = true; ladder.add(ladderHit);
  ladder.position.set(-3.3, 0, -14); ladder.rotation.set(0, Math.PI / 2, 0.25); ladder.visible = false; scene.add(ladder);
  spots.ladder = ladder;
  interact(ladder, { range: 3, prompt: () => 'Climb down into the hole<small>Mind your head</small>', use: () => goUnderground(true) });
  const shed = add(M.shed(), 8.4, 0, -22.3); collideObj(shed);
  interact(shed, { range: 3.5, prompt: () => 'Open the shed: buy diggers', use: () => LC.game.openScreen('shed') });
  for (const [x, z, h] of [[-9.5, -23, 3.6], [10, -8.5, 3], [-10, -9, 2.6], [3, -24, 3.2]]) { const t = add(M.tree(h), x, 0, z); collide(x - 0.3, z - 0.3, x + 0.3, z + 0.3); }
  for (const [x, z] of [[-11, -16], [11, -14], [-5, -25], [6, -6.2], [-11, -6.3]]) add(M.bush(), x, 0, z);
  spots.garden = { x0: -11, x1: 11, z0: -25, z1: -6 };
  spots.well = new THREE.Vector3(5, 0, -12);
  spots.mine = new THREE.Vector3(-8, 0, -19);

  // ---- front garden & street (south) ----
  floor(2.6, 5, 3.4, 8, 0xbcb3a3, 0.015); // path
  buildStall();
  for (const [x0, x1] of [[-12, 2.4], [3.6, 12]]) { const f = M.fence((x1 - x0), 0x7a6a5a); f.scale.y = 0.6; f.position.set((x0 + x1) / 2, 0, 8); scene.add(f); collide(x0, 7.9, x1, 8.1); }
  for (const s of [-1, 1]) { const f = M.fence(3, 0x7a6a5a); f.scale.y = 0.6; f.rotation.y = Math.PI / 2; f.position.set(s * 12, 0, 6.5); scene.add(f); collide(s * 12 - 0.1, 5, s * 12 + 0.1, 8); }
  floor(-70, 8, 70, 10, 0xcfcac0, 0.03);   // near pavement
  floor(-70, 10, 70, 16, 0x4a4a52, 0.02);  // road
  for (let x = -68; x < 70; x += 4) floor(x, 12.9, x + 2, 13.1, 0xf2f0e6, 0.03);
  floor(-70, 16, 70, 18, 0xcfcac0, 0.03);  // far pavement
  // the corner shop
  const sx0 = -5, sx1 = 5, sz0 = 18, sz1 = 26;
  floor(sx0, sz0, sx1, sz1, 0xe6e0d0, 0.04);
  const shopC = 0xe58a6b;
  wall(sx0, sz0, -0.9, sz0, shopC, 3.4); wall(0.9, sz0, sx1, sz0, shopC, 3.4); wall(sx0, sz1, sx1, sz1, shopC, 3.4);
  wall(sx0, sz0, sx0, sz1, shopC, 3.4); wall(sx1, sz0, sx1, sz1, shopC, 3.4);
  scene.add(M.box(2.2, 0.6, 0.25, shopC, 0, 3.1, sz0, { shadow: false }));
  scene.add(M.box(10.6, 0.25, 8.6, 0x7a5a6a, 0, 3.5, 22, { shadow: false }));
  const shopSign = M.textSprite('CORNER SHOP · SCRATCHCARDS', { size: 0.55, bg: '#2d6a4f', color: '#fffaf0', border: '#fffaf0' });
  shopSign.position.set(0, 3.9, sz0 - 0.2); scene.add(shopSign);
  for (const s of [-1, 1]) add(M.box(2.6, 1.4, 0.05, M.displayMat('charity'), 0, 0, 0, { shadow: false, sharp: true }), s * 3, 1.6, sz0 - 0.12, Math.PI);
  const counter = add(M.counter(4), 0, 0, 23.6); collideObj(counter);
  const keeper = add(M.person({ shirt: 0x2d6a4f, hair: 0x222222 }), 0, 0, 24.6, Math.PI);
  agents.push({ obj: keeper, update: (dt, t) => { keeper.rotation.y = Math.PI + Math.sin(t * 0.7) * 0.3; } });
  interact(counter, { range: 3, prompt: () => 'Shop counter<small>Treats for helpers and scratch cards</small>', use: () => LC.game.openScreen('corner') });
  interact(keeper, { range: 3.5, prompt: () => 'Talk to the shopkeeper', use: () => LC.game.openScreen('corner') });
  for (const s of [-1, 1]) {
    const sh = add(M.bookshelf(), s * 4.6, 0, 22, s * -Math.PI / 2); collideObj(sh);
  }
  const cardStand = add(M.box(0.8, 1.2, 0.3, 0xf2b631, 0, 0, 0), -1.4, 1.55, 23.6);
  void cardStand;
  buildTown();
  spots.pavement = { x0: 7, x1: 22, z: 9 };
  spots.roadside = { x0: -22, x1: -10, z: 11.4 };

  // sky things
  const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf4f1e4, fog: false }));
  moon.position.set(-70, 60, -110); scene.add(moon);
  spots.moon = moon;
}

// ---------- your stall in the front garden ----------
const stall = { pos: new THREE.Vector3(-2.5, 0, 7.15), items: [], ups: {}, group: null };
function buildStall() {
  const t = add(M.stallTable(), stall.pos.x, 0, stall.pos.z);
  collideObj(t);
  stall.group = t;
  interact(t, { range: 3.2, prompt: () => LC.game.stallTablePrompt(), use: () => LC.game.stallTableUse() });
  // ten spots on the table you can put things on (the first six to start with)
  stall.slots = [];
  for (let i = 0; i < 10; i++) {
    const row = Math.floor(i / 5), col = i % 5;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.36), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.position.set(-0.8 + col * 0.4, 0.92, -0.18 + row * 0.36); hit.userData.noAO = true;
    t.add(hit);
    interact(hit, { range: 3.2, slot: i, prompt: () => LC.game.slotPrompt(i), use: () => LC.game.slotUse(i), alt: () => LC.game.slotAlt(i) });
    stall.slots.push(hit);
  }
  const board = M.signPlane('STUFF 4 SALE', 1.0, 0.5, { bg: '#fffaf0', color: '#c8231f' });
  board.position.set(1.4, 0.95, 0.35); board.rotation.y = -0.3; board.visible = false; t.add(board);
  const leg = M.box(0.05, 0.9, 0.05, M.C.wood, 1.4, 0.45, 0.33); leg.visible = false; t.add(leg);
  stall.ups.sign = [board, leg];
  const pole = M.cyl(0.03, 0.03, 2.1, 0xdddddd, -0.9, 1.05, -0.2);
  const shade = M.cone(1.3, 0.5, 0xf2b631, -0.9, 2.15, -0.2, { seg: 12 });
  pole.visible = shade.visible = false; t.add(pole, shade); stall.ups.parasol = [pole, shade];
  const jug = M.cyl(0.1, 0.12, 0.28, 0xfff27a, 0.85, 0.89, -0.15, { mat: { transparent: true, opacity: 0.8 } }); jug.visible = false; t.add(jug); stall.ups.lemonade = [jug];
  const bell = M.cone(0.08, 0.12, 0xf2b631, -0.85, 0.82, 0.2, { seg: 12 }); bell.visible = false; t.add(bell); stall.ups.bell = [bell];
}
const TAG_COLORS = { cheap: '#6aa84f', fair: '#f2b631', cheeky: '#d9534f' };
// ---------- lush bits: thousands of grass tufts and flowers, drawn in one go ----------
function buildFoliage() {
  const zones = [{ x0: -11.5, x1: 11.5, z0: -25.5, z1: -6, n: 2200 }, { x0: 31, x1: 61, z0: 20, z1: 55, n: 3000 }, { x0: -70, x1: 70, z0: -40, z1: -27, n: 1600 }, { x0: 62, x1: 75, z0: 18, z1: 60, n: 500 }];
  // a tuft = three thin blades leaning out
  const blade = (a) => { const g = new THREE.ConeGeometry(0.025, 0.24, 3); g.translate(0, 0.12, 0); g.rotateZ(0.35); g.rotateY(a); return g; };
  const tuft = mergeGeometries([blade(0), blade(2.1), blade(4.2)]);
  const tufts = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), 7300);
  const flower = new THREE.SphereGeometry(0.04, 6, 4); flower.scale(1, 0.6, 1); flower.translate(0, 0.2, 0);
  const flowers = new THREE.InstancedMesh(flower, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), 900);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
  const greens = [0x5aa83a, 0x6fbf45, 0x82cf52, 0x4c9a30], petals = [0xffffff, 0xffe04a, 0xff8ab0, 0xb08aff, 0xff6a4a];
  let ti = 0, fi = 0;
  for (const z of zones) {
    for (let k = 0; k < z.n; k++) {
      const x = rand(z.x0, z.x1), zz = rand(z.z0, z.z1);
      if (blocked(x, zz, 0.15) || Math.hypot(x + 2, zz + 14) < 2.2) continue;
      if (ti < tufts.count) { e.set(rand(-0.25, 0.25), rand(0, 6), rand(-0.25, 0.25)); q.setFromEuler(e); const s2 = rand(0.6, 1.2); sc.set(s2, s2 * rand(0.8, 1.3), s2); p.set(x, 0, zz); m.compose(p, q, sc); tufts.setMatrixAt(ti, m); tufts.setColorAt(ti++, col.setHex(pick(greens))); }
      if (fi < flowers.count && Math.random() < 0.1) { q.identity(); const s2 = rand(0.8, 1.3); sc.set(s2, s2, s2); p.set(x + 0.1, 0, zz + 0.1); m.compose(p, q, sc); flowers.setMatrixAt(fi, m); flowers.setColorAt(fi++, col.setHex(pick(petals))); }
    }
  }
  tufts.count = ti; flowers.count = fi;
  tufts.receiveShadow = true; tufts.userData.noAO = true; flowers.userData.noAO = true;
  scene.add(tufts, flowers);
}

// ---------- the museum shelf in the hall: rare finds on display for good ----------
const museum = { group: null, slots: [], items: [] };
function buildMuseum() {
  const g = new THREE.Group(); g.position.set(6.62, 0, 3.4); g.rotation.y = -Math.PI / 2; scene.add(g); museum.group = g;
  const wood = 0x7a5232;
  g.add(M.box(1.9, 0.08, 0.42, wood, 0, 0.9, 0), M.box(1.9, 0.08, 0.42, wood, 0, 1.45, 0), M.box(1.9, 0.08, 0.42, wood, 0, 2.0, 0));
  g.add(M.box(0.08, 1.2, 0.42, wood, -0.95, 1.45, 0), M.box(0.08, 1.2, 0.42, wood, 0.95, 1.45, 0), M.box(1.9, 1.2, 0.04, 0x5a3a22, 0, 1.45, -0.2));
  const plaque = M.signPlane('MUSEUM OF FINDS', 1.4, 0.24, { bg: '#2d2118', color: '#f2b631' }); plaque.position.set(0, 2.25, 0.05); g.add(plaque);
  for (let i = 0; i < 6; i++) {
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.position.set(-0.6 + (i % 3) * 0.6, i < 3 ? 1.17 : 1.72, 0.02); hit.userData.noAO = true; g.add(hit);
    museum.slots.push(hit);
    interact(hit, { range: 2.8, slot: true, prompt: () => LC.game.museumPrompt(i), use: () => LC.game.museumUse(i) });
  }
  collide(6.4, 2.4, 7, 4.4);
}
function setMuseum(list) {
  for (const sp of museum.items) museum.group.remove(sp);
  museum.items = [];
  list.forEach((icon, i) => { if (!icon) return; const sp = M.iconSprite(icon, 0.32); sp.position.copy(museum.slots[i].position).setY(museum.slots[i].position.y + 0.02); museum.group.add(sp); museum.items.push(sp); });
}
function setStallItems(list) {
  for (const sp of stall.items) stall.group.remove(sp);
  stall.items = [];
  list.forEach((it, i) => {
    const hit = stall.slots[i];
    if (!hit) return;
    hit.visible = i < (stall.size || 6);
    if (!it) return;
    const sp = M.iconSprite(it.icon, 0.3);
    sp.position.copy(hit.position).setY(0.92);
    const tag = M.textSprite({ cheap: '£', fair: '££', cheeky: '£££' }[it.price], { size: 0.1, bg: TAG_COLORS[it.price], color: '#fff', border: '#2d2118' });
    tag.position.copy(hit.position).add(new THREE.Vector3(0.12, -0.1, 0.12));
    stall.group.add(sp, tag);
    stall.items.push(sp, tag);
  });
}
function setStallUps(ups) {
  for (const [k, parts] of Object.entries(stall.ups)) parts.forEach((p) => (p.visible = ups.includes(k)));
  stall.size = ups.includes('table') ? 10 : 6;
  stall.slots.forEach((h, i) => (h.visible = i < stall.size));
}
const nearStall = (r) => player.pos.z > 5.2 && player.pos.distanceTo(stall.pos) < r; // outside, not through the wall
// a passer-by comes to the stall, has a look, buys (or doesn't), and walks on.
// If you're not there they wait; if you take too long they might grab something and run.
let stallWaiter = null;
function spawnCustomer(kind) {
  const look = kind === 'collector' ? { shirt: 0x2a2a3a, legs: 0x1a1a2a, hat: 'top', height: 1.05 } : pick([
    { shirt: 0xd27a5a, legs: 0x3a3f58, hair: 0x2a1a0a }, { shirt: 0x6aa84f, legs: 0x5a4a3a, hat: 'beanie' }, { shirt: 0xb07ab8, legs: 0x5a4a6a, hat: 'bun', height: 0.92 },
    { shirt: 0x3b6ea5, legs: 0x222222, hair: 0x8a6a2a }, { shirt: 0xf2b631, legs: 0x3a3a3a, hat: 'cap' }]);
  const o = M.person(look);
  if (kind === 'collector') o.add(M.moustache());
  const fromLeft = Math.random() < 0.5;
  const start = new THREE.Vector3(fromLeft ? -26 : 26, 0, 8.9), spot = new THREE.Vector3(stall.pos.x + rand(-0.6, 0.6), 0, 8.75);
  let end = new THREE.Vector3(fromLeft ? 45 : -45, 0, 8.9);
  o.position.copy(start); scene.add(o);
  let stage = 'walk', wait = 0, label = null, speed = 1.7, loot = null;
  const say = (text) => { if (label) o.remove(label); label = M.textSprite(text, { size: 0.32 }); label.position.y = 2.1; o.add(label); setTimeout(() => { if (label) { o.remove(label); label = null; } }, 3500); };
  const done = () => { scene.remove(o); agents.splice(agents.indexOf(a), 1); if (stallWaiter === a) stallWaiter = null; };
  const a = { obj: o, update: (dt, t) => {
    if (talker && talker.obj === o) return;
    if (stage === 'walk' || stage === 'leave' || stage === 'flee') {
      const target = stage === 'walk' ? spot : end;
      const d = new THREE.Vector3(target.x - o.position.x, 0, target.z - o.position.z);
      if (stage === 'flee' && o.position.distanceTo(player.pos) < 1.3) {
        // caught!
        const line = LC.game.thiefCaught();
        if (loot) { o.remove(loot); loot = null; }
        say(line || 'Sorry!'); stage = 'leave'; speed = 2.2; end = new THREE.Vector3(o.position.x < 0 ? -45 : 45, 0, 8.9);
        return;
      }
      if (d.length() < 0.3) {
        if (stage === 'walk') {
          stage = 'browse'; wait = 2.5; say(pick(LC.STALL_LINES.browse));
        } else { if (stage === 'flee') LC.game.thiefEscaped(); done(); }
        return;
      }
      d.normalize(); o.position.addScaledVector(d, speed * dt); o.rotation.y = Math.atan2(d.x, d.z); limbs(o, Math.sin(t * (stage === 'flee' ? 16 : 9)));
      return;
    }
    o.rotation.y = Math.PI; limbs(o, 0);
    wait -= dt;
    if (stage === 'browse' && wait <= 0) {
      const r = LC.game.customerArrived(kind, o);
      if (r && r.wait) { stage = 'waiting'; wait = r.wait; stallWaiter = a; say(pick(['Hello? Anyone?', 'Is this your stall?', '*taps foot*'])); return; }
      if (r && r.say) say(r.say);
      stage = 'leave';
    } else if (stage === 'waiting') {
      if (Math.random() < dt * 0.15) say(pick(['Helloooo?', '*coughs loudly*', 'I have places to be.', '*looks at watch*']));
      if (nearStall(4.5)) {
        const r = LC.game.customerServe(kind, o);
        if (r && r.say) say(r.say);
        stage = 'leave'; stallWaiter = null;
      } else if (wait <= 0) {
        const r = LC.game.customerGaveUp(kind, o);
        stallWaiter = null;
        if (r && r.say) say(r.say);
        if (r && r.steal) { stage = 'flee'; speed = 4.2; loot = M.iconSprite(r.icon, 0.35); loot.position.set(0.3, 1.2, 0.2); o.add(loot); }
        else stage = 'leave';
      }
    }
  } };
  agents.push(a);
}

// ---------- underground (reached by climbing down your hole) ----------
const UX = 400; // the caves are built far away from the town and lit separately
const gates = [];
function buildUnderground() {
  const dirt = (x0, z0, x1, z1, h = 3.4) => {
    const m = M.box(Math.abs(x1 - x0) || 0.4, h, Math.abs(z1 - z0) || 0.4, 0x5a3e28, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, { sharp: true, mat: { flatShading: true } });
    scene.add(m); collide(Math.min(x0, x1) - 0.2, Math.min(z0, z1) - 0.2, Math.max(x0, x1) + 0.2, Math.max(z0, z1) + 0.2);
  };
  const ground = (x0, z0, x1, z1, color) => { const m = M.box(x1 - x0, 0.1, z1 - z0, color, (x0 + x1) / 2, -0.05, (z0 + z1) / 2, { sharp: true }); m.receiveShadow = true; scene.add(m); };
  const roof = (x0, z0, x1, z1) => scene.add(M.box(x1 - x0, 0.3, z1 - z0, 0x3a2818, (x0 + x1) / 2, 3.45, (z0 + z1) / 2, { sharp: true }));
  const light = (x, z, color = 0xffa050, i = 9, d = 11) => { const l = new THREE.PointLight(color, i * 2.4, d * 1.5, 1.5); l.position.set(x, 2.6, z); l.userData.area = 'under'; l.visible = false; scene.add(l); };
  const torchAt = (x, z, ry = 0) => { const t = add(M.torch(), x, 1.2, z, ry); t.rotation.z = 0.3; };
  // arrival chamber + tunnels
  ground(UX - 6, -6, UX + 40, 6, 0x4a3420); roof(UX - 6, -6, UX + 40, 6);
  dirt(UX - 6, -6, UX - 6, 6); dirt(UX - 6, -6, UX + 40, -6); dirt(UX - 6, 6, UX + 40, 6);
  for (const [x, z] of [[UX + 8, -4.5], [UX + 16, 4.5], [UX + 26, -4.6], [UX + 33, 4.4]]) scene.add(M.box(2.5, 3.4, 1.8, 0x5a3e28, x, 1.7, z, { sharp: true, mat: { flatShading: true } })), collide(x - 1.3, z - 0.9, x + 1.3, z + 0.9);
  const rope = add(M.cyl(0.04, 0.04, 3.4, 0xc8a070, 0, 1.7, 0), UX - 3, 0, 0);
  interact(rope, { range: 2.6, prompt: () => 'Climb back up the ladder', use: () => goUnderground(false) });
  add(M.box(0.5, 0.3, 0.5, 0xffe9b0, 0, 0, 0, { mat: { emissive: 0xffe9b0, emissiveIntensity: 2, map: null } }), UX - 3, 3.3, 0);
  light(UX - 3, 0, 0xfff0c0, 14, 12);
  torchAt(UX + 6, -5.6); torchAt(UX + 20, 5.6, Math.PI); torchAt(UX + 34, -5.6);
  light(UX + 10, -2); light(UX + 25, 2); light(UX + 37, 0);
  const piles = [[UX + 12, -3.5], [UX + 22, 3.6], [UX + 36, -3.4], [UX + 52, 3.2], [UX + 82, -4.5], [UX + 110, 12], [UX + 135, -12]];
  piles.forEach(([x, z], i) => { const p = add(M.junkPile(), x, 0, z); interact(p, { range: 2.8, prompt: () => LC.game.pilePrompt(i), use: () => LC.game.searchPile(i, x > UX + 100 ? 3 : x > UX + 70 ? 2 : x > UX + 40 ? 1 : 0) }); });
  const gary = add(M.cyl(0.07, 0.08, 0.5, 0xd88a9a, 0, 0.25, 0), UX + 17, 0, -2.4);
  gary.add(M.ball(0.03, 0x2d2118, -0.03, 0.42, 0.06), M.ball(0.03, 0x2d2118, 0.03, 0.42, 0.06));
  agents.push({ obj: gary, update: (dt, t) => { gary.rotation.z = Math.sin(t * 2) * 0.3; } });
  interact(gary, { range: 2.4, prompt: () => 'Talk to Gary the worm', use: () => LC.game.chatUnder('gary') });
  // gate 1 -> the sewer
  gate(UX + 40, 40);
  ground(UX + 40, -6, UX + 72, 6, 0x4a4a42); roof(UX + 40, -6, UX + 72, 6);
  dirt(UX + 40, -6, UX + 72, -6); dirt(UX + 40, 6, UX + 72, 6);
  const wat = M.water(32, 2.4); wat.position.set(UX + 56, 0.03, 0); scene.add(wat);
  scene.add(M.box(32, 0.25, 0.25, 0x6a6a62, UX + 56, 0.12, -1.3, { sharp: true }), M.box(32, 0.25, 0.25, 0x6a6a62, UX + 56, 0.12, 1.3, { sharp: true }));
  for (let x = UX + 42; x < UX + 72; x += 6) scene.add(M.cyl(0.5, 0.5, 0.4, 0x5a5a52, x, 3.0, -5.5, { rot: [Math.PI / 2, 0, 0] }));
  light(UX + 48, 0, 0x9ad0a0, 7, 11); light(UX + 64, 0, 0x9ad0a0, 7, 11);
  for (let i = 0; i < 12; i++) { const c = M.coin(0.08, false); c.position.set(UX + 42 + Math.random() * 28, 0.07, (Math.random() - 0.5) * 2); c.rotation.x = Math.PI / 2; scene.add(c); }
  for (let i = 0; i < 4; i++) {
    const r = add(M.rat(), UX + 45 + i * 6, 0, (i % 2 ? 3 : -3)); const base = r.position.clone(), sp = 0.6 + i * 0.2;
    agents.push({ obj: r, update: (dt, t) => { r.position.x = base.x + Math.sin(t * sp + i) * 2.5; r.rotation.y = Math.cos(t * sp + i) > 0 ? Math.PI / 2 : -Math.PI / 2; } });
    interact(r, { range: 2.2, prompt: () => 'Talk to the rat', use: () => LC.game.chatUnder('rat') });
  }
  const ring = add(M.part(new THREE.TorusGeometry(0.08, 0.025, 8, 16), 0xf2b631, 0, 0, 0, { mat: { emissive: 0x8a6a00, emissiveIntensity: 1.5, metalness: 0.8, roughness: 0.2 } }), UX + 66, 0.1, 0.4);
  ring.rotation.x = Math.PI / 2; spots.ring = ring;
  agents.push({ obj: ring, update: (dt, t) => { ring.rotation.z = t; } });
  interact(ring, { range: 2.4, prompt: () => 'Something shiny in the water...', use: () => LC.game.findRing() });
  // gate 2 -> Roman ruins
  gate(UX + 72, 350);
  ground(UX + 72, -8, UX + 100, 8, 0xd8c8a8); roof(UX + 72, -8, UX + 100, 8);
  dirt(UX + 72, -8, UX + 100, -8); dirt(UX + 72, 8, UX + 100, 8); dirt(UX + 72, -8, UX + 72, -6); dirt(UX + 72, 6, UX + 72, 8);
  const mosaic = M.signPlane('SPQR · SOFA PER QVAERENDA', 10, 6, { bg: '#c8823a', color: '#f3eee4' }); mosaic.rotation.x = -Math.PI / 2; mosaic.position.set(UX + 86, 0.02, 0); scene.add(mosaic);
  for (const [x, z] of [[UX + 77, -5], [UX + 77, 5], [UX + 86, -5.5], [UX + 95, -5]]) { add(M.column(), x, 0, z); collide(x - 0.45, z - 0.45, x + 0.45, z + 0.45); }
  add(M.brokenColumn(), UX + 92, 0, 5);
  const chest = add(M.chest(), UX + 97, 0, 0, -Math.PI / 2); collideObj(chest);
  interact(chest, { range: 2.6, prompt: () => LC.game.chestPrompt(), use: () => LC.game.openChest() });
  light(UX + 80, 0, 0xffc880, 10, 13); light(UX + 94, 0, 0xffc880, 10, 13);
  torchAt(UX + 82, -7.6); torchAt(UX + 90, 7.6, Math.PI);
  // gate 3 -> the Mole Kingdom: a whole town underground
  gate(UX + 100, 1000);
  ground(UX + 100, -20, UX + 150, 20, 0x3a2a1a); roof(UX + 100, -20, UX + 150, 20);
  dirt(UX + 100, -20, UX + 150, -20); dirt(UX + 100, 20, UX + 150, 20); dirt(UX + 150, -20, UX + 150, 20); dirt(UX + 100, -20, UX + 100, -6); dirt(UX + 100, 6, UX + 100, 20);
  const houses = [[UX + 110, -14], [UX + 120, -15], [UX + 130, -14], [UX + 112, 14], [UX + 124, 15], [UX + 136, 14]];
  houses.forEach(([x, z], i) => { add(M.moleHouse([0x8a5a3a, 0x3b6ea5, 0x6aa84f, 0xd9534f][i % 4]), x, 0, z, z > 0 ? Math.PI : 0); collide(x - 1.5, z - 1.4, x + 1.5, z + 1.4); });
  const throne = add(M.throne(), UX + 146, 0, 0, -Math.PI / 2); collideObj(throne);
  const king = add(M.moleKing(), UX + 145.4, 0.5, 0, -Math.PI / 2);
  interact(king, { range: 3.5, prompt: () => 'Speak to the Mole King', use: () => LC.game.moleKing(king) });
  const market = add(M.stallTable(), UX + 125, 0, -6); collideObj(market);
  interact(market, { range: 3, prompt: () => LC.game.moleMarketPrompt(), use: () => LC.game.moleMarket() });
  for (let i = 0; i < 6; i++) {
    const m = add(M.moleCitizen(), UX + 110 + i * 5, 0, (i % 2 ? 5 : -5));
    walker(m, [{ x0: UX + 104, x1: UX + 140, z0: -10, z1: 10 }], 0.8, { pause: 4 });
    interact(m, { range: 2.4, prompt: () => 'Talk to the mole', use: () => LC.game.chatUnder('mole') });
  }
  for (const [x, z] of [[UX + 108, 0], [UX + 125, 8], [UX + 140, -8], [UX + 140, 8], [UX + 125, -10]]) light(x, z, 0xffb060, 10, 15);
  // glowing mushrooms light the Mole Kingdom
  for (let i = 0; i < 26; i++) {
    const x = UX + 103 + Math.random() * 44, z = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 11);
    const m = new THREE.Group();
    const col = [0x7ae0ff, 0xb07aff, 0x7aff9a][i % 3];
    m.add(M.cyl(0.05, 0.07, 0.35, 0xe8e0cc, 0, 0.17, 0), M.ball(0.22, col, 0, 0.38, 0, { scale: [1, 0.5, 1], mat: { emissive: col, emissiveIntensity: 2, map: null } }));
    m.position.set(x, 0, z); m.scale.setScalar(0.7 + Math.random() * 1.4); scene.add(m);
  }
  light(UX + 115, 14, 0x9a7aff, 8, 14); light(UX + 132, -14, 0x7ad0ff, 8, 14);
  for (const [x, z] of [[UX + 115, -19.6], [UX + 128, 19.6], [UX + 142, -19.6]]) torchAt(x, z, z > 0 ? Math.PI : 0);
}
function gate(x, minDepth) {
  const rock = M.box(0.9, 3.4, 12, 0x6a5a4a, x, 1.7, 0, { sharp: true, mat: { flatShading: true } });
  scene.add(rock);
  const c = collide(x - 0.45, -6, x + 0.45, 6);
  interact(rock, { range: 3, prompt: () => 'Solid rock<small>Dig your hole deeper to break through here</small>', use: () => LC.game.say('Solid rock. Your hole up top needs to go deeper.') });
  gates.push({ rock, c, minDepth });
}
function updateGates(depth) { for (const g of gates) { const open = depth >= g.minDepth; g.c.off = open; g.rock.visible = !open; } }
let area = 'town';
const AREAS = {
  town: { sun: 3.4, hemi: 0.9, sky: [0xa8bce0, 0x4a3a2e], fog: [0xd89c78, 22, 120], bg: 0xe0a882, outdoors: true },
  under: { sun: 0, hemi: 0.65, sky: [0x8a6a4a, 0x3a2a1a], fog: [0x1a120c, 14, 60], bg: 0x0c0806 },
  loft: { sun: 0, hemi: 0.55, sky: [0xb89a7a, 0x4a3a2a], fog: [0x2a2018, 10, 30], bg: 0x1a1410 },
};
function goArea(to, spawn, yaw = 0) {
  const f = document.getElementById('fade');
  f.classList.add('show');
  LC.audio.sfx(to === 'loft' || area === 'loft' ? 'click' : 'dig');
  setTimeout(() => {
    area = to;
    const A = AREAS[to];
    player.pos.set(spawn[0], 0, spawn[1]); player.yaw = yaw; player.pitch = 0;
    scene.traverse((o) => { if (o.isPointLight) o.visible = (o.userData.area || 'town') === to; });
    sun.intensity = A.sun; hemi.intensity = A.hemi; hemi.color.set(A.sky[0]); hemi.groundColor.set(A.sky[1]);
    scene.fog.color.set(A.fog[0]); scene.fog.near = A.fog[1]; scene.fog.far = A.fog[2];
    scene.background.set(A.bg);
    scene.userData.sky.visible = !!A.outdoors; if (clouds) clouds.visible = !!A.outdoors; if (dust) dust.visible = to !== 'under';
    LC.game.onArea(to);
    setTimeout(() => f.classList.remove('show'), 150);
  }, 380);
}
function goUnderground(down) { if (down) goArea('under', [UX - 1.5, 0], -Math.PI / 2); else goArea('town', [-4.6, -14], -Math.PI / 2); }

// ---------- the loft (up the ladder from the hall) ----------
const LX = -400;
const loftPigs = [];
function buildLoft() {
  const floorM = M.box(12, 0.1, 8, texMat('wood', 5, 3), LX, -0.05, 0, { sharp: true }); floorM.receiveShadow = true; scene.add(floorM);
  for (const s2 of [-1, 1]) { const r = M.box(12.4, 0.2, 5.4, 0x8a6a4a, LX, 1.9, s2 * 2.3, { sharp: true }); r.rotation.x = s2 * 0.75; scene.add(r); }
  scene.add(M.box(0.2, 3.4, 8, 0x9a7a5a, LX - 6, 1.7, 0, { sharp: true }), M.box(0.2, 3.4, 8, 0x9a7a5a, LX + 6, 1.7, 0, { sharp: true }));
  collide(LX - 6.2, -4, LX - 5.9, 4); collide(LX + 5.9, -4, LX + 6.2, 4); collide(LX - 6, -4.1, LX + 6, -2.7); collide(LX - 6, 2.7, LX + 6, 4.1);
  for (let x = -5; x <= 5; x += 2.5) scene.add(M.box(0.18, 0.18, 6.5, M.C.woodDark, LX + x, 2.55, 0, { sharp: true }));
  const bulb = M.ball(0.08, 0xfff2c0, 0, 0, 0, { mat: { emissive: 0xffe0a0, emissiveIntensity: 4, map: null } }); bulb.position.set(LX, 2.5, 0); scene.add(bulb);
  const l = new THREE.PointLight(0xffd9a0, 22, 16, 1.5); l.position.set(LX, 2.4, 0); l.userData.area = 'loft'; l.visible = false; scene.add(l);
  const l2 = new THREE.PointLight(0xffb070, 8, 9, 1.5); l2.position.set(LX + 4, 1.5, -1.5); l2.userData.area = 'loft'; l2.visible = false; scene.add(l2);
  // the hatch back down
  const hole = M.box(1.0, 0.02, 1.0, 0x1a1410, LX - 4.5, 0.01, 0, { sharp: true }); scene.add(hole);
  const down = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  down.position.set(LX - 4.5, 0.3, 0); down.userData.noAO = true; scene.add(down);
  interact(down, { range: 2.6, prompt: () => 'Climb back down to the hall', use: () => goArea('town', [2.5, -1.2], 0) });
  // Grandad's boxes
  [[LX - 2.5, -2.2], [LX - 1.2, 2.2], [LX + 1.5, -2.3], [LX + 3, 2.2]].forEach(([x, z], i) => {
    const b = add(M.cardboardBox(['KEN - PRIVATE', 'KEN - SOFA STUFF', 'KEN - BRIAN', 'KEN - MARGARET'][i]), x, 0, z, z > 0 ? Math.PI : 0); collideObj(b);
    hitbox(b, 0.9, 1.1, 0.8);
    interact(b, { range: 2.4, prompt: () => LC.game.boxPrompt(i), use: () => LC.game.grandadBox(i) });
  });
  // a shelf of old piggy banks
  scene.add(M.box(4.5, 0.08, 0.5, M.C.wood, LX + 2, 0.95, -2.3, { sharp: true }));
  for (let i = 0; i < 6; i++) {
    const p = add(M.piggy(['normal', 'golden', 'kevin', 'nesting', 'normal', 'owl'][i]), LX + 0.2 + i * 0.72, 1.0, -2.25);
    p.scale.setScalar(0.5);
    hitbox(p, 1.3, 1.6, 1.3, 0.4);
    loftPigs.push(p);
    interact(p, { range: 2.6, tool: 'pig', prompt: () => LC.game.loftPigPrompt(i), use: () => { const r = LC.game.loftPig(i); if (r === 'smash') { burstAt(p.position.clone().setY(1.2), 14, 0xf7a8bd); burstAt(p.position.clone().setY(1.2), 10); p.visible = false; } } });
  }
  // the locked trunk and a rocking horse
  const trunk = add(M.chest(), LX + 4.6, 0, 1.6, -Math.PI / 2); collideObj(trunk);
  interact(trunk, { range: 2.6, prompt: () => LC.game.trunkPrompt(), use: () => LC.game.trunk() });
  add(M.rockingHorse(), LX - 2, 0, 1.3, 0.5);
}
function setLoftPigs(smashed) { loftPigs.forEach((p, i) => (p.visible = !smashed.includes(i))); }

// ---------- town events: things that turn up in town for a few minutes ----------
const ev = { group: null, id: null, rain: null, snow: null, geese: [] };
function townEvent(id, on) {
  if (ev.group) {
    for (let i = interactables.length - 1; i >= 0; i--) { let o = interactables[i]; while (o && o !== ev.group) o = o.parent; if (o) interactables.splice(i, 1); }
    scene.remove(ev.group); ev.group = null;
  }
  if (brian.bbq && id === 'bbq' && !on) brianBBQ(false);
  for (const gz of ev.geese) { scene.remove(gz.obj); agents.splice(agents.indexOf(gz), 1); }
  ev.geese = [];
  if (ev.rain) { scene.remove(ev.rain); ev.rain = null; }
  ev.id = on ? id : null;
  setSkyMood(on && (id === 'storm' || id === 'powercut' || id === 'snow') ? id : null);
  if (!on) return;
  const g = new THREE.Group(); ev.group = g; scene.add(g);
  const put = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };
  const crowd = (n, zone, speed = 1.2) => { for (let i = 0; i < n; i++) { const p = M.person({ shirt: pick([0xd9534f, 0xf2b631, 0x5b8bd9, 0x6aa84f, 0x9b59b6, 0xf7a8bd]), legs: pick([0x3a3f58, 0x222222, 0x5a4a3a]), hat: pick([null, 'cap', 'beanie', null]) }); const pos = randomIn(zone); put(p, pos.x, 0, pos.z); ev.geese.push(walker(p, zone, speed, { pause: 2 })); } };
  if (id === 'party') {
    for (let x = -50; x <= 50; x += 10) put(M.bunting(10), x + 5, 4.2, 13, 0);
    crowd(10, [{ x0: -40, x1: 40, z0: 10.5, z1: 15.5 }], 1.0);
  }
  if (id === 'funfair') {
    const fw = put(M.ferrisWheel(), 45, 0, 50, 0);
    const wheel = fw.getObjectByName('wheel');
    g.userData.spin = (dt) => { wheel.rotation.z += dt * 0.25; wheel.children.forEach((c) => { if (c.name === 'car') c.rotation.z = -wheel.rotation.z; }); };
    const duck = put(M.stallTable(), 38, 0, 38, Math.PI);
    const dsign = M.signPlane('HOOK-A-DUCK', 2.0, 0.42, { bg: '#f2b631', color: '#2d2118' }); dsign.position.set(0, 0.47, 0.44); duck.add(dsign);
    for (let i = 0; i < 5; i++) duck.add(M.ball(0.09, 0xffd23a, -0.7 + i * 0.35, 1.02, 0, { mat: { emissive: 0x403000 } }));
    interact(duck, { range: 3, prompt: () => 'Hook-a-duck<small>Every duck wins a prize!</small>', use: () => LC.game.hookADuck() });
    crowd(8, spots.park, 1.0);
  }
  if (id === 'bins') {
    for (let x = -50; x <= 50; x += 8) { if (Math.abs(x - 3) < 3) continue; const b = put(M.wheelieBin(pick([0x3f8a3f, 0x6a6a6a, 0x3b6ab8, 0x8a5a2a])), x + rand(-1, 1), 0, 9.8, Math.PI); const key = 'bin' + x; interact(b, { range: 2.5, prompt: () => LC.game.binPrompt(key), use: () => LC.game.bin(key) }); }
  }
  if (id === 'marathon') {
    for (let i = 0; i < 9; i++) {
      const r = M.person({ shirt: pick([0xf2b631, 0xd9534f, 0x5bb0e0]), legs: 0x222222, hat: i % 3 ? null : 'cap' });
      const ry = rand(10.8, 15.2), sp = rand(3.2, 4.5), x0 = rand(-60, 60);
      put(r, x0, 0, ry, Math.PI / 2);
      const num = M.textSprite(String(100 + i * 7), { size: 0.18 }); num.position.set(0, 1.05, 0.2); r.add(num);
      const a = { obj: r, update: (dt, t) => { r.position.x += sp * dt; if (r.position.x > 62) r.position.x = -62; limbs(r, Math.sin(t * 16 + i)); } };
      agents.push(a); ev.geese.push(a);
      interact(r, { range: 3, prompt: () => 'Cheer for the runner!', use: () => LC.game.cheer() });
    }
  }
  if (id === 'film') {
    put(M.filmCamera(), -1, 0, 11.5, Math.PI);
    put(M.filmCamera(), 6, 0, 12, Math.PI * 1.2);
    const dir = put(M.person({ shirt: 0x222222, legs: 0x222222, hat: 'beanie' }), 1.5, 0, 12.5, Math.PI);
    interact(dir, { range: 3, prompt: () => 'Talk to the film director', use: () => LC.game.filmExtra(dir) });
    const x = put(M.xMark(), 2.8, 0.02, 10.6);
    g.userData.xmark = x.position;
  }
  if (id === 'heatwave') {
    const van = put(M.iceCreamVan(), -10, 0, 11.6, Math.PI / 2);
    interact(van, { range: 3.5, prompt: () => 'Buy an ice cream<small>Brain freeze gives you powers</small>', use: () => LC.game.iceCream() });
  }
  if (id === 'storm') makeRain(0x9ab8d0, 0.05, 30);
  if (id === 'snow') {
    makeRain(0xffffff, 0.08, 4);
    const sm = put(M.snowman(), 9, 0, 12.5);
    interact(sm, { range: 2.6, prompt: () => 'Look inside the snowman', use: () => LC.game.snowman() });
  }
  if (id === 'mayor') {
    put(M.redCarpet(40), -30, 0.12, 17.2);
    const mayor = put(M.person({ shirt: 0x1a1a3a, legs: 0x1a1a3a, hat: 'top', height: 1.08 }), -40, 0, 17.2, Math.PI / 2);
    mayor.add(M.part(new THREE.TorusGeometry(0.25, 0.04, 6, 16), 0xf2b631, 0, 1.3, 0.1, { rot: [0.3, 0, 0] }));
    const a = { obj: mayor, update: (dt, t) => { if (talker && talker.obj === mayor) return; mayor.position.x = -30 + Math.sin(t * 0.15) * 18; mayor.rotation.y = Math.cos(t * 0.15) > 0 ? Math.PI / 2 : -Math.PI / 2; limbs(mayor, Math.sin(t * 6)); } };
    agents.push(a); ev.geese.push(a);
    interact(mayor, { range: 3, prompt: () => 'Shake hands with the Mayor', use: () => LC.game.mayor(mayor) });
  }
  if (id === 'treasure') {
    ev.spot = Math.floor(Math.random() * 5);
    const spot = [[1.6, 9.3], [-30, 10.2], [41.2, 40], [-38, 7.6], [19.5, 15.8]][ev.spot];
    const x = put(M.xMark(), spot[0], 0.02, spot[1]); x.visible = false; g.userData.treasureX = x;
    interact(x, { range: 2.8, prompt: () => 'Dig here!', use: () => LC.game.treasureDig() });
  }
  if (id === 'geese') {
    for (let i = 0; i < 10; i++) {
      const gz = M.goose(); const p = randomIn([{ x0: Math.max(-55, player.pos.x - 18), x1: Math.min(55, player.pos.x + 18), z0: 9.5, z1: 16 }]);
      put(gz, p.x, 0, p.z);
      let cd = rand(0, 3);
      const a = { obj: gz, update: (dt, t) => {
        cd -= dt;
        const to = new THREE.Vector3(player.pos.x - gz.position.x, 0, player.pos.z - gz.position.z); const d = to.length();
        if (d < 14 && cd <= 0 && !LC.game.isBlocked()) { to.normalize(); const nx = gz.position.x + to.x * 3.6 * dt, nz = gz.position.z + to.z * 3.6 * dt; if (!blocked(nx, nz, 0.2)) { gz.position.x = nx; gz.position.z = nz; } gz.rotation.y = Math.atan2(to.x, to.z); }
        if (d < 0.8 && cd <= 0) { cd = 4; LC.audio.sfx('honk'); shake = 0.25; LC.game.gooseBite(0.01); }
      } };
      agents.push(a); ev.geese.push(a);
    }
  }
  if (id === 'pigeons') {
    const don = M.pigeon(); don.scale.setScalar(4); put(don, 1.0, 1.35, 9.3, Math.PI);
    don.add(M.box(0.1, 0.06, 0.02, 0x222222, 0, 0.12, 0.1));
    interact(don, { range: 3, prompt: () => 'Negotiate with Don Coo-leone', use: () => LC.game.pigeonStrike(don) });
  }
  if (id === 'sofasale') {
    for (let i = 0; i < 5; i++) {
      const so = put(M.sofa(pick([0xd9534f, 0x5b8bd9, 0x9b59b6, 0xf2b631, 0x6aa84f]), 0x6a5a5a, 2.0), -40 + i * 16, 0, 16.9, Math.PI);
      interact(so, { range: 3, hold: true, tool: 'sofa', prompt: () => 'Rummage down a sale sofa<small>Sofa sale! Full of other people\'s change</small>', use: () => { const r = LC.game.saleSofa(); if (r) { burstAt(so.position.clone().setY(0.8), 4); LC.game.floatAt(project(so.position.clone().setY(0.9)), r.value); } } });
    }
  }
  if (id === 'bbq') {
    brianBBQ(true);
    const bx = brianSpots.doorX + 2.2;
    const grill = put(M.group ? M.group() : new THREE.Group(), bx, 0, 6.6);
    grill.add(M.cyl(0.35, 0.3, 0.3, 0x222222, 0, 0.85, 0), M.cyl(0.03, 0.03, 0.7, 0x333333, 0, 0.35, 0), M.box(0.6, 0.02, 0.6, 0x888888, 0, 1.0, 0));
    for (let i = 0; i < 4; i++) grill.add(M.cyl(0.035, 0.035, 0.35, 0xb5573b, -0.18 + i * 0.12, 1.03, 0, { rot: [Math.PI / 2, 0, 0] }));
    interact(grill, { range: 2.6, prompt: () => 'Pinch a sausage<small>Brian\'s BBQ. Everyone\'s here. Even you, apparently</small>', use: () => LC.game.bbqSausage() });
    crowd(6, [{ x0: bx - 3, x1: bx + 3, z0: 5.8, z1: 8.2 }], 0.6);
  }
}
function makeRain(color, size, speed) {
  const n = 1500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rand(-25, 25); pos[i * 3 + 1] = rand(0, 18); pos[i * 3 + 2] = rand(-25, 25); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  ev.rain = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.8 }));
  ev.rain.userData.speed = speed; scene.add(ev.rain);
}
function updateEvent(dt) {
  if (ev.rain) {
    const a = ev.rain.geometry.attributes.position, sp = ev.rain.userData.speed;
    for (let i = 0; i < a.count; i++) { let y = a.getY(i) - sp * dt; if (y < 0) y += 18; a.setY(i, y); if (sp < 10) a.setX(i, a.getX(i) + Math.sin(time + i) * dt * 0.3); }
    a.needsUpdate = true; ev.rain.position.set(player.pos.x, 0, player.pos.z);
  }
  if (ev.group && ev.group.userData.spin) ev.group.userData.spin(dt);
}
// storms, power cuts and snow tint the day cycle (see updateSky)
let skyMood = null;
function setSkyMood(mood) {
  skyMood = mood;
  scene.traverse((o) => { if (o.isPointLight && !o.userData.area && !streetGlow.includes(o)) o.visible = mood !== 'powercut'; });
}
function brianBBQ(on) {
  brian.bbq = on;
  if (on) { brian.obj.position.set(brianSpots.doorX + 2.2, 0, 7.4); brian.path = []; brian.sitting = false; }
  else setBrianState('home');
}
function treasureReveal() { if (ev.group && ev.group.userData.treasureX) ev.group.userData.treasureX.visible = true; }

// ---------- the town: Acacia Road, the high street and the park ----------
function buildTown() {
  const brick = (shade = 1) => texMat('brick', 4, 3, new THREE.Color(shade, shade, shade).getHex());
  // our side of the road: a row of houses (ours is the one in the middle, built separately)
  const houses = [
    { x: -54, w: 10, door: 0x2d6a4f, n: 1, tex: brick(0.9) },
    { x: -42, w: 10, door: 0xf2b631, n: 3, color: 0xe8dcc8 },
    { x: -30, w: 10, door: 0x9b59b6, n: 5, tex: brick(1.05) },
    { x: -18, w: 12, door: 0xc8231f, n: 7, color: 0xf3eee4, brian: true },
    { x: 18, w: 12, door: 0x3b6ea5, n: 11, tex: brick(0.95) },
    { x: 30, w: 10, door: 0x6aa84f, n: 13, color: 0xd9c2a8 },
    { x: 42, w: 10, door: 0xd27a5a, n: 15, tex: brick(1.1) },
    { x: 54, w: 10, door: 0x2d2118, n: 17, color: 0xc8d8e0 },
  ];
  for (const h of houses) {
    if (h.brian) { buildBrianHouse(h); } else {
      add(M.townHouse({ w: h.w, d: 10, wallTex: h.tex, wallColor: h.color, door: h.door, number: h.n }), h.x, 0, 5);
      collide(h.x - h.w / 2, -5, h.x + h.w / 2, 5);
    }
    // front garden: low wall with a gap for the path, bins, a hedge or a gnome
    const gw = h.w;
    add(M.lowWall(gw / 2 - 1, h.brian ? 0xf3eee4 : 0xb5573b), h.x - gw / 4 - 0.5, 0, 7.9);
    add(M.lowWall(gw / 2 - 1, h.brian ? 0xf3eee4 : 0xb5573b), h.x + gw / 4 + 0.5, 0, 7.9);
    collide(h.x - gw / 2, 7.75, h.x - 1, 8.05); collide(h.x + 1, 7.75, h.x + gw / 2, 8.05);
    floor(h.x - gw / 4 - 0.6, 5, h.x - gw / 4 + 0.6, 7.9, 0xbcb3a3, 0.015);
    add(M.wheelieBin(pick([0x2d4a2d, 0x3a3a3a, 0x3b5a8a])), h.x + gw / 2 - 1, 0, 6.6, Math.PI);
    if (h.brian) {
      // Brian's lawn is perfect. There is a gnome. The gnome is watching.
      floor(h.x - gw / 2 + 0.3, 5.2, h.x + gw / 2 - 0.3, 7.7, 0x86c964, 0.016);
      const gn = add(M.gnome(), h.x + 2.5, 0, 6.6, Math.PI * 0.1);
      interact(gn, { range: 3.4, prompt: () => LC.game.gnomePrompt(), use: () => LC.game.gnome() });
      const sign = M.signPlane('KEEP OFF THE GRASS', 1.4, 0.35, { bg: '#f3eee4', color: '#c8231f' }); sign.position.set(h.x - 2.5, 0.9, 7.6); scene.add(sign);
      const lawn = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 2.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      lawn.position.set(h.x - 3.2, 0.3, 6.6); lawn.userData.noAO = true; scene.add(lawn);
      interact(lawn, { range: 3, prompt: () => LC.game.brianLawnPrompt(), use: () => LC.game.brianLawn() });
    } else add(M.hedge(gw / 2 - 1.6), h.x + gw / 4 - 0.2, 0, 5.8);
  }
  // nobody goes round the back of the other houses
  collide(-62, -26, -24.1, 5); collide(-24.1, -26, -11.9, -5.1); collide(12, -26, 62, 5);
  // street furniture
  for (let x = -54; x <= 54; x += 12) {
    add(M.lampPost(), x, 0, 9.6, Math.PI / 2); collide(x - 0.15, 9.45, x + 0.15, 9.75); streetGlow.push(lightCone(x, 3.85, 9.1, 3.2, 1.3, 0xffd9a0, 0.035));
    add(M.lampPost(), x + 6, 0, 16.4, -Math.PI / 2); collide(x + 5.85, 16.25, x + 6.15, 16.55); streetGlow.push(lightCone(x + 6, 3.85, 16.9, 3.2, 1.3, 0xffd9a0, 0.035));
  }
  add(M.postbox(), 1.0, 0, 9.3); collide(0.7, 9.0, 1.3, 9.6);
  const board = new THREE.Group();
  board.add(M.box(2.2, 1.5, 0.12, 0xb08050, 0, 1.55, 0, { sharp: true }), M.box(0.1, 2.3, 0.1, 0x5a4a3a, -1.0, 1.15, -0.05), M.box(0.1, 2.3, 0.1, 0x5a4a3a, 1.0, 1.15, -0.05));
  const head = M.signPlane('HELP WANTED', 2.0, 0.3, { bg: '#c8231f' }); head.position.set(0, 2.45, 0.07); board.add(head);
  for (let i = 0; i < 6; i++) { const c = M.box(0.42, 0.32, 0.02, [0xfffdf2, 0xfff7d6, 0xe8f4ff][i % 3], -0.7 + (i % 3) * 0.7, 1.85 - Math.floor(i / 3) * 0.6, 0.07, { rot: [0, 0, (Math.random() - 0.5) * 0.2] }); board.add(c); }
  board.position.set(19.5, 0, 16.9); board.rotation.y = Math.PI; scene.add(board);
  collide(18.3, 16.75, 20.7, 17.05);
  interact(board, { range: 3, prompt: () => 'Read the notice board<small>Hire helpers</small>', use: () => LC.game.openScreen('board') });
  const pb = add(M.phoneBox(), -15.6, 0, 17.2); collide(-16.2, 16.6, -15, 17.8);
  interact(pb, { range: 2.6, prompt: () => 'Check the coin return', use: () => LC.game.phoneBox() });
  add(M.busStop(), -30, 0, 9.4); collide(-31.5, 8.7, -28.5, 9.0);
  const busSign = M.signPlane('ACACIA ROAD', 2.4, 0.4, { bg: '#3a5a7a' }); busSign.position.set(-30, 2.25, 8.79); scene.add(busSign);
  for (const [x, z, ry, c] of [[-47, 11, Math.PI / 2, 0xd9534f], [-36, 11, Math.PI / 2, 0x6aa84f], [24, 11, Math.PI / 2, 0x3a3a3a], [48, 11, Math.PI / 2, 0xf2b631], [-38, 15, -Math.PI / 2, 0x3b6ea5], [-2, 15, -Math.PI / 2, 0x9b59b6], [16, 15, -Math.PI / 2, 0xd27a5a], [36, 15, -Math.PI / 2, 0x8f8f8f]]) {
    const car = add(M.car(c), x, 0, z, ry);
    car.children.filter((k) => k.isGroup).forEach((k) => (k.visible = false)); // parked cars, no car-boot table
    collideObj(car);
  }
  const bcar = add(M.car(0xb8c0c8), -18, 0, 11, Math.PI / 2);
  bcar.children.filter((k) => k.isGroup).forEach((k) => (k.visible = false));
  collideObj(bcar);
  const plate = M.signPlane('BR1 AN', 0.7, 0.18, { bg: '#f2d23a', color: '#111' }); plate.position.set(-16.1, 0.55, 11); plate.rotation.y = Math.PI / 2; scene.add(plate);
  interact(bcar, { range: 3, prompt: () => LC.game.brianCarPrompt(), use: () => LC.game.brianCar() });
  spots.brianCar = bcar;

  // the high street (across the road). Fronts face our side.
  const shops = [
    { x: -54, w: 12, name: 'THE RUSTY ANCHOR', kind: 'pub', bg: '#3a2a1a', wall: brick(0.8), awning: [0x2d4a2d, 0xe8dcc8], line: 'The pub. You are not allowed in. You are nine.' },
    { x: -41.5, w: 11, name: 'BUN IN THE OVEN', kind: 'bakery', bg: '#d27a5a', color: 0xf3e2c8, awning: [0xf7a8bd, 0xfff6e6], line: 'The bakery. It smells like heaven and sausage rolls.' },
    { x: -29.5, w: 11, name: 'SPIN CITY LAUNDERETTE', kind: 'launderette', bg: '#3b6ea5', color: 0xc8d8e8, awning: [0x3b6ea5, 0xffffff], line: 'The launderette. People leave coins in their pockets. Interesting.' },
    { x: -19, w: 8, name: 'NAILED IT HARDWARE', kind: 'hardware', bg: '#3a4a5a', wall: brick(1), awning: [0x3a4a5a, 0xf2b631], shop: 'hardware' },
    { x: -9.5, w: 8, name: 'SECOND CHANCES CHARITY SHOP', kind: 'charity', bg: '#6a3a7a', color: 0xe8d8e8, awning: [0x9b59b6, 0xfff6e6], shop: 'charity' },
    { x: 11, w: 10, name: 'THE CODFATHER', kind: 'chippy', bg: '#2a5a8a', color: 0xf6f0d8, awning: [0x2a5a8a, 0xfff6e6], line: 'The chippy. Smells like vinegar and dreams.' },
    { x: 22.5, w: 11, name: 'POST OFFICE', kind: 'post', bg: '#c8231f', wall: brick(0.9), awning: [0xc8231f, 0xf2b631], line: 'The post office. There is always a queue. Always.' },
  ];
  for (const sh of shops) {
    const o = add(M.shopFront({ w: sh.w, d: 9, name: sh.name, kind: sh.kind, bg: sh.bg, wallTex: sh.wall, wallColor: sh.color, awning: sh.awning }), sh.x, 0, 18, Math.PI);
    collide(sh.x - sh.w / 2, 18, sh.x + sh.w / 2, 27);
    const door = new THREE.Mesh(new THREE.BoxGeometry(sh.w, 3, 0.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    door.position.set(sh.x, 1.5, 17.8); door.userData.noAO = true; scene.add(door);
    interact(door, { range: 3, prompt: () => (sh.shop ? `Go into ${sh.name.charAt(0) + sh.name.slice(1).toLowerCase()}` : sh.name.charAt(0) + sh.name.slice(1).toLowerCase()), use: () => (sh.shop ? LC.game.openScreen(sh.shop) : LC.game.say(sh.line)) });
    void o;
  }
  collide(-62, 26, 28, 56); collide(-62, 18, -60, 26); collide(-5.5, 18, -5, 26); collide(5, 18, 6, 26);
  // houses peeking over the back fences, and a church spire on the skyline
  for (let x = -40; x <= 40; x += 11) add(M.townHouse({ w: 10, d: 8, wallColor: pick([0xd9c2a8, 0xe8dcc8, 0xc8b8a0]), lit: false }), x, 0, -32, Math.PI);
  const spire = add(new THREE.Group(), -35, 0, 70);
  spire.add(M.box(5, 12, 5, 0xbab3a6, 0, 6, 0, { sharp: true }), M.cone(3.2, 9, 0x6a6a72, 0, 16.5, 0, { seg: 8 }), M.ball(0.3, 0xf2b631, 0, 21.2, 0));

  // ---- the park ----
  floor(28, 18, 62, 56, 0x86c964, 0.012);
  add(M.hedge(30), 46, 0, 18.3); collide(31, 18, 62, 18.8);   // front hedge with a gap at the gate (x 28-31)
  const gate = M.signPlane('ACACIA PARK', 2.6, 0.5, { bg: '#2d6a4f' }); gate.position.set(29.5, 2.2, 17.9); gate.rotation.y = Math.PI; scene.add(gate);
  add(M.box(0.2, 2.4, 0.2, 0x333333, 0, 0, 0), 28.2, 1.2, 18); add(M.box(0.2, 2.4, 0.2, 0x333333, 0, 0, 0), 30.8, 1.2, 18);
  collide(62, 18, 63, 56); collide(28, 55.5, 62, 56.5); collide(27.5, 26, 28, 56);
  const pondAt = new THREE.Vector3(49, 0, 43);
  add(M.pond(6), pondAt.x, 0, pondAt.z); collide(pondAt.x - 5.5, pondAt.z - 5.5, pondAt.x + 5.5, pondAt.z + 5.5);
  for (let i = 0; i < 5; i++) {
    const d = add(M.duck(), pondAt.x + rand(-3, 3), 0.03, pondAt.z + rand(-3, 3));
    const a0 = rand(0, 6), r0 = rand(1.5, 4.5), sp = rand(0.1, 0.25) * (i % 2 ? 1 : -1);
    agents.push({ obj: d, update: (dt, t) => { const a = a0 + t * sp; d.position.set(pondAt.x + Math.cos(a) * r0, 0.03 + Math.sin(t * 2 + i) * 0.01, pondAt.z + Math.sin(a) * r0); d.rotation.y = -a + (sp > 0 ? 0 : Math.PI); } });
  }
  const ft = add(M.fountain(), 40, 0, 30); collide(37.6, 27.6, 42.4, 32.4);
  interact(ft, { range: 4, prompt: () => LC.game.fountainPrompt(), use: () => LC.game.fountain() });
  spots.fountain = ft;
  const sw = add(M.swings(), 55, 0, 25); collide(53.3, 24.3, 56.7, 25.7);
  agents.push({ obj: sw, update: (dt, t) => { sw.children.filter((c) => c.name === 'swing').forEach((c, i) => (c.rotation.x = Math.sin(t * 1.6 + i * 2) * 0.35)); } });
  add(M.slide(), 57, 0, 32, -Math.PI / 2); collide(55.5, 31.4, 58.6, 32.6);
  for (const [x, z, ry] of [[34, 36, Math.PI / 2], [44, 50, Math.PI], [36, 46, Math.PI / 2], [52, 34, 0]]) { const b = add(M.bench(), x, 0, z, ry); collideObj(b); interact(b, { range: 2.5, prompt: () => 'Check under the bench', use: () => LC.game.checkBench() }); }
  for (const [x, z, h] of [[33, 22, 5], [59, 21, 4.5], [32, 52, 6], [58, 52, 5], [42, 40, 4], [60, 40, 5.5], [36, 42, 4.5]]) { add(M.tree(h), x, 0, z); collide(x - 0.3, z - 0.3, x + 0.3, z + 0.3); }
  spots.park = [{ x0: 31, x1: 60, z0: 20, z1: 54 }];

  // ---- townsfolk, wandering about ----
  const pave = [{ x0: -60, x1: 60, z0: 8.5, z1: 9.4 }, { x0: -60, x1: 60, z0: 16.6, z1: 17.4 }];
  const folk = [
    { look: { shirt: 0xd9534f, legs: 0x222222, hat: 'cap' }, speed: 3.2, zone: pave, lines: 'jogger' },
    { look: { shirt: 0x6a8a4a, legs: 0x5a4a3a, hair: 0xcccccc }, speed: 0.9, zone: spots.park, lines: 'oldman', dog: true },
    { look: { shirt: 0xc8231f, legs: 0x2a3a5a, hat: 'cap' }, speed: 1.6, zone: pave, lines: 'postman' },
    { look: { shirt: 0xf7a8bd, legs: 0x3a3f58, hair: 0x8a4a2a }, speed: 1.1, zone: pave, lines: 'mum', pram: true },
    { look: { shirt: 0x3a7bd5, legs: 0x3a3f58, hair: 0x222222, height: 0.7 }, speed: 1.8, zone: spots.park, lines: 'kid' },
    { look: { shirt: 0x9b59b6, legs: 0x5a4a6a, hat: 'bun', height: 0.92 }, speed: 0.7, zone: pave, lines: 'lady' },
  ];
  for (const f of folk) {
    const o = add(M.person(f.look), 0, 0, 0);
    o.position.copy(randomIn(f.zone));
    if (f.pram) { const pr = M.pram(); pr.position.set(0, 0, 0.8); o.add(pr); }
    walker(o, f.zone, f.speed, { pause: 4 });
    interact(o, { range: 2.6, slot: true, prompt: () => LC.game.friendPrompt(f.lines), use: () => LC.game.chat(f.lines, o), alt: () => LC.game.gift(f.lines, o) });
    if (f.dog) {
      const dg = add(M.dog(), o.position.x + 1, 0, o.position.z);
      agents.push({ obj: dg, update: (dt, t) => {
        const target = o.position.clone().add(new THREE.Vector3(Math.sin(t * 0.7) * 1.2, 0, Math.cos(t * 0.7) * 1.2));
        const d = target.sub(dg.position); d.y = 0;
        if (d.length() > 0.2) { dg.position.addScaledVector(d.normalize(), Math.min(2.5, d.length() * 2) * dt); dg.rotation.y = Math.atan2(d.x, d.z); limbs(dg, Math.sin(t * 14)); }
        const tail = dg.getObjectByName('tail'); if (tail) tail.rotation.z = Math.sin(t * 18) * 0.6;
      } });
      interact(dg, { range: 2.2, prompt: () => 'Pat the dog', use: () => { LC.audio.sfx('woof'); LC.game.say(pick(['Good dog.', 'The dog has found a coin. The dog gives it to you. Best dog.', 'The dog licks your hand. Your hand is now worth slightly less.'])); if (Math.random() < 0.3) LC.game.tip(20, 'dog'); } });
    }
  }
}

// ---------- Brian's house (you can go inside) ----------
const brianSpots = {};
function buildBrianHouse(h) {
  const x0 = h.x - h.w / 2, x1 = h.x + h.w / 2, mid = h.x; // -24, -12, -18
  add(M.townHouse({ w: h.w, d: 10, wallColor: 0xf3eee4, door: h.door, number: h.n, hollow: true }), h.x, 0, 5.12);
  const doorX = h.x - h.w / 4; // -21
  floor(x0, -5, x1, 5, 0xc9a27a);
  const wcB = 0xe8d9f0;
  wall(x0, 5, doorX - 0.6, 5, wcB); wall(doorX + 0.6, 5, x1, 5, wcB);
  wall(x0, -5, x1, -5, wcB); wall(x0, -5, x0, 5, wcB); wall(x1, -5, x1, 5, wcB);
  wall(mid, -5, mid, -1, wcB); wall(mid, 1, mid, 5, wcB);
  scene.add(M.box(1.2, 0.6, 0.22, 0xf3eee4, doorX, 2.5, 5, { shadow: false }));
  // outside skin
  for (const [a, b, c, d2, ox, oz] of [[x0 - 0.1, 5, doorX - 0.6, 5, 0, 0.12], [doorX + 0.6, 5, x1 + 0.1, 5, 0, 0.12], [x0, -5.1, x0, 5.1, -0.12, 0], [x1, -5.1, x1, 5.1, 0.12, 0]]) {
    const w = Math.abs(c - a) || 0.04, d = Math.abs(d2 - b) || 0.04;
    scene.add(M.box(w, 2.9, d, 0xf3eee4, (a + c) / 2 + ox, 1.45, (b + d2) / 2 + oz, { shadow: false, sharp: true }));
  }
  scene.add(M.box(h.w, 0.1, 10, new THREE.MeshStandardMaterial({ color: 0xf3ece0 }), mid, 2.85, 0, { sharp: true }));
  const l = new THREE.PointLight(0xffd29a, 12, 10, 1.8); l.position.set(mid - 3, 2.5, 0); scene.add(l);
  const l2 = new THREE.PointLight(0xffd29a, 10, 9, 1.8); l2.position.set(mid + 3, 2.5, 0); scene.add(l2);
  // the front door: locked until you find the spare key
  const door = new THREE.Group();
  door.add(M.box(1.1, 2.1, 0.1, h.door, 0.55, 1.05, 0, { sharp: true }), M.ball(0.05, 0xf2b631, 0.95, 1.05, 0.08), M.box(0.3, 0.06, 0.04, 0x9a8a5a, 0.55, 1.35, 0.07));
  door.position.set(doorX - 0.55, 0, 5.02); scene.add(door);
  brianSpots.door = door;
  brianSpots.doorCol = collide(doorX - 0.6, 4.85, doorX + 0.6, 5.15);
  interact(door, { range: 2.8, prompt: () => LC.game.brianDoorPrompt(), use: () => LC.game.brianDoor() });
  // living room: Brian's leather sofa, telly, and the Thing Fund jar
  const sofa = add(M.sofa(0xd8c4a0, 0xb49a78, 2.3), x0 + 0.75, 0, -0.2, Math.PI / 2); collideObj(sofa, 0.05);
  interact(sofa, { range: 3.2, hold: true, tool: 'sofa', prompt: () => LC.game.brianSofaPrompt(), use: () => { const r = LC.game.raidBrianSofa(); if (r) { burstAt(sofa.position.clone().setY(0.8), 4); LC.game.floatAt(project(sofa.position.clone().setY(0.9)), r.value); } } });
  brianSpots.sofa = sofa;
  brianSpots.seat = new THREE.Vector3(x0 + 0.95, 0, -0.2);
  const tv = add(M.tv(), mid - 0.4, 0, -0.2, -Math.PI / 2); collideObj(tv);
  add(M.rug(texMat('carpet', 1, 1)), x0 + 3, 0, -0.2);
  const side = add(M.box(0.7, 0.7, 0.5, M.C.woodDark, 0, 0, 0), x0 + 0.6, 0.35, -3.6); collideObj(side);
  const jar = add(M.jar('THING FUND'), x0 + 0.6, 0.7, -3.6, Math.PI / 2);
  interact(jar, { range: 2.6, prompt: () => LC.game.fundPrompt(), use: () => LC.game.raidFund() });
  brianSpots.jar = jar;
  const photo = M.signPlane('ME & GNORMAN', 0.9, 0.6, { bg: '#d8c8a8', color: '#5a4a3a' }); photo.position.set(x0 + 0.12, 1.7, 2.2); photo.rotation.y = Math.PI / 2; scene.add(photo);
  // the other room: his desk and the spreadsheet, the fridge, his gnome collection
  const desk = add(M.desk(), x1 - 0.6, 0, -3.4, -Math.PI / 2); collideObj(desk);
  const mon = add(M.monitor('BEAT THE KID.xls'), x1 - 0.75, 0, -3.4, -Math.PI / 2);
  interact(mon, { range: 2.6, prompt: () => "Read Brian's spreadsheet", use: () => LC.game.brianComputer() });
  const fr = add(M.fridge(), x1 - 0.45, 0, 4.4, -Math.PI / 2); collideObj(fr);
  const shelf = add(M.box(0.4, 0.06, 2.4, M.C.wood, 0, 0, 0), mid + 0.25, 1.4, 3.2); void shelf;
  for (let i = 0; i < 5; i++) { const g = add(M.gnome(), mid + 0.25, 1.43, 2.2 + i * 0.5, Math.PI / 2); g.scale.setScalar(0.35); }
  brianSpots.inside = { x0, x1, z0: -5, z1: 5, mid };
  brianSpots.doorX = doorX;
  // Brian himself
  buildBrian();
}

// Brian's day: at home (sofa, desk, fridge), out mowing the front lawn, then off to the shops and back.
const brian = { obj: null, state: 'home', t: 0, path: [], speed: 1.6, sitting: false, suspicion: 0, mower: null, busy: false };
function buildBrian() {
  const o = M.person({ shirt: 0x8a9a6a, legs: 0x5a5a6a, hair: 0x6a5a4a, height: 1.08 });
  o.add(M.moustache());
  o.position.set(brianSpots.seat.x + 1.5, 0, 0);
  scene.add(o);
  brian.obj = o;
  brian.mower = M.lawnmower(); brian.mower.visible = false; scene.add(brian.mower);
  interact(o, { range: 2.5, prompt: () => 'Say hello to Brian', use: () => LC.game.chatBrian() });
  brian.homeSpots = [brianSpots.seat, new THREE.Vector3(brianSpots.inside.x1 - 1.4, 0, -3.4), new THREE.Vector3(brianSpots.inside.x1 - 1.3, 0, 3.6), new THREE.Vector3(brianSpots.inside.x0 + 3, 0, 2)];
  setBrianState('home');
  agents.push({ obj: o, update: brianUpdate });
}
function doorPath(outwards) {
  const dx = brianSpots.doorX;
  const inside = [new THREE.Vector3(dx, 0, 2.5), new THREE.Vector3(dx, 0, 4.4)];
  const outside = [new THREE.Vector3(dx, 0, 5.8), new THREE.Vector3(dx, 0, 8.6)];
  return outwards ? [...inside, ...outside] : [...outside.reverse(), ...inside.reverse()];
}
function setBrianState(st) {
  brian.state = st; brian.t = 0; brian.sitting = false; brian.mower.visible = false;
  const o = brian.obj;
  if (st === 'home') { brian.path = []; brian.dwell = 0; }
  if (st === 'toGarden') brian.path = doorPath(true).slice(0, 3);
  if (st === 'garden') { brian.path = []; brian.mower.visible = true; }
  if (st === 'toShops') brian.path = [...doorPath(true), new THREE.Vector3(-14, 0, 8.9), new THREE.Vector3(26, 0, 8.9)];
  if (st === 'shops') brian.path = [];
  if (st === 'goHome') brian.path = [new THREE.Vector3(-14, 0, 8.9), ...doorPath(false)];
  if (st === 'gardenHome') brian.path = doorPath(false).slice(2);
  void o;
}
const BRIAN_TIMES = { home: 150, garden: 60, shops: 110 };
function brianUpdate(dt, t) {
  const o = brian.obj;
  if (talker && talker.obj === o) return; // talking to you
  if (brian.bbq) { o.rotation.y = Math.sin(t) * 0.5; limbs(o, 0); LC.game.setSuspicion(0, false); return; }
  brian.t += dt;
  // follow the current path
  if (brian.path.length) {
    const tgt = brian.path[0];
    const d = new THREE.Vector3(tgt.x - o.position.x, 0, tgt.z - o.position.z);
    if (d.length() < 0.15) {
      brian.path.shift();
      if (brian.state === 'toShops' && brian.path.length === 2) LC.game.brianEvent('passCar');
      if (brian.state === 'goHome' && brian.path.length === 2) LC.game.brianEvent('enterDoor');
      if (!brian.path.length) {
        if (brian.state === 'toGarden') setBrianState('garden');
        else if (brian.state === 'toShops') setBrianState('shops');
        else if (brian.state === 'goHome' || brian.state === 'gardenHome') setBrianState('home');
        else if (brian.state === 'investigate') { brian.state = 'home'; brian.dwell = 3; }
      }
    } else {
      d.normalize();
      o.position.x += d.x * brian.speed * dt; o.position.z += d.z * brian.speed * dt;
      o.rotation.y = Math.atan2(d.x, d.z);
      o.position.y = 0;
      limbs(o, Math.sin(t * 9));
    }
  } else if (brian.state === 'home') {
    brian.dwell -= dt;
    if (brian.dwell <= 0) {
      const spot = pick(brian.homeSpots);
      brian.path = [spot.clone()];
      brian.dwell = 12 + Math.random() * 14;
      brian.sitting = false;
    } else if (brian.homeSpots[0].distanceTo(o.position) < 0.3) {
      // sitting on the sofa watching telly
      if (!brian.sitting) { brian.sitting = true; LC.game.brianEvent('sit'); }
      o.rotation.y = Math.PI / 2; o.position.y = -0.25; limbs(o, 0);
    } else limbs(o, 0);
    if (brian.t > BRIAN_TIMES.home) setBrianState(Math.random() < 0.4 ? 'toGarden' : 'toShops');
  } else if (brian.state === 'garden') {
    // mowing stripes into the perfect lawn
    const x = -18 + Math.sin(brian.t * 0.4) * 4.5, z = 6.4 + Math.sin(brian.t * 0.13) * 0.9;
    const d = new THREE.Vector3(x - o.position.x, 0, z - o.position.z);
    if (d.length() > 0.02) o.rotation.y = Math.atan2(d.x, d.z);
    o.position.set(x, 0, z); limbs(o, Math.sin(t * 8));
    brian.mower.position.copy(o.position).add(new THREE.Vector3(Math.sin(o.rotation.y) * 0.8, 0, Math.cos(o.rotation.y) * 0.8));
    brian.mower.rotation.y = o.rotation.y + Math.PI;
    if (Math.random() < dt * 0.6) LC.audio.sfx('mower');
    if (brian.t > BRIAN_TIMES.garden) setBrianState('gardenHome');
  } else if (brian.state === 'shops') {
    limbs(o, 0);
    if (brian.t > BRIAN_TIMES.shops) setBrianState('goHome');
  }
  // does Brian spot you inside his house?
  const I = brianSpots.inside;
  const p = player.pos;
  const playerInside = p.x > I.x0 && p.x < I.x1 && p.z > I.z0 && p.z < I.z1;
  const brianInside = o.position.x > I.x0 && o.position.x < I.x1 && o.position.z > I.z0 && o.position.z < I.z1;
  let seeing = false;
  if (playerInside && brianInside && !LC.game.isBlocked()) {
    const to = new THREE.Vector3(p.x - o.position.x, 0, p.z - o.position.z);
    const dist = to.length();
    const facing = new THREE.Vector3(Math.sin(o.rotation.y), 0, Math.cos(o.rotation.y));
    const sameRoom = (p.x < I.mid) === (o.position.x < I.mid) || Math.abs(p.x - I.mid) < 1.2 && Math.abs(p.z) < 1;
    const range = crouching ? 3.2 : 6.5;
    const angle = to.clone().normalize().dot(facing);
    seeing = sameRoom && dist < range && (angle > 0.35 || dist < 1.4) && !(brian.sitting && crouching && dist > 1.6);
  }
  brian.suspicion = Math.max(0, Math.min(1, brian.suspicion + (seeing ? dt * (crouching ? 0.9 : 1.8) : -dt * 0.5)));
  LC.game.setSuspicion(playerInside ? brian.suspicion : 0, seeing);
  if (brian.suspicion >= 1) { brian.suspicion = 0; caught(); }
}
function caught() {
  brian.sitting = false; brian.obj.position.y = 0;
  LC.game.caughtByBrian();
}
// rummaging is noisy: Brian might come and look
function brianNoise() {
  const I = brianSpots.inside, o = brian.obj;
  const home = o.position.x > I.x0 && o.position.x < I.x1 && o.position.z > I.z0 && o.position.z < I.z1;
  if (!home || brian.state !== 'home' || Math.random() > 0.12) return false;
  brian.state = 'investigate'; brian.sitting = false; o.position.y = 0;
  brian.path = [new THREE.Vector3(player.pos.x, 0, player.pos.z)];
  return true;
}
function setDoorOpen(open) {
  brianSpots.door.rotation.y = open ? -1.6 : 0;
  brianSpots.doorCol.off = open;
}
function throwOut() {
  player.pos.set(brianSpots.doorX, 0, 9.2); player.yaw = 0; player.pitch = 0;
  setDoorOpen(false);
}

// ---------- characters & helpers that appear as you buy them ----------
const helpers = {}; // gen id -> array of objects
const ZONES = {
  house: [{ x0: -6.5, x1: -0.6, z0: -4.4, z1: 3 }, { x0: 0.6, x1: 6.5, z0: -3.8, z1: 4.4 }],
  garden: [{ x0: -11, x1: 11, z0: -25, z1: -6.5 }],
};
function randomIn(zone) { const r = pick(zone); return new THREE.Vector3(rand(r.x0, r.x1), 0, rand(r.z0, r.z1)); }
function blocked(x, z, r = RADIUS) { return colliders.some((c) => !c.off && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r); }

function walker(obj, zone, speed, opts = {}) {
  const a = { obj, zone, speed, target: randomIn(zone), wait: rand(0, 2), t: Math.random() * 10, ...opts };
  a.update = (dt) => {
    a.t += dt;
    if (talker && talker.obj === obj) { limbs(obj, 0); return; }
    if (a.custom && a.custom(a, dt)) return;
    if (a.wait > 0) { a.wait -= dt; limbs(obj, 0); return; }
    const d = new THREE.Vector3().subVectors(a.target, obj.position); d.y = 0;
    const dist = d.length();
    if (dist < 0.3) { a.target = randomIn(zone); a.wait = rand(0.5, opts.pause || 3); return; }
    d.normalize();
    const nx = obj.position.x + d.x * a.speed * dt, nz = obj.position.z + d.z * a.speed * dt;
    if (blocked(nx, nz, 0.25)) { a.target = randomIn(zone); return; }
    obj.position.x = nx; obj.position.z = nz;
    obj.rotation.y = Math.atan2(d.x, d.z);
    limbs(obj, Math.sin(a.t * a.speed * 5));
  };
  agents.push(a);
  return a;
}
function limbs(obj, s) {
  const l = obj.getObjectByName('legL'), r = obj.getObjectByName('legR');
  if (l) { l.rotation.x = s * 0.6; r.rotation.x = -s * 0.6; }
  const al = obj.getObjectByName('armL'), ar = obj.getObjectByName('armR');
  if (al && !obj.userData.armBusy) { al.rotation.x = -s * 0.5; ar.rotation.x = s * 0.5; }
  const tail = obj.getObjectByName('tail');
  if (tail) tail.rotation.z = s * 0.4;
}
function safeSpot(zone) { for (let i = 0; i < 30; i++) { const p = randomIn(zone); if (!blocked(p.x, p.z, 0.4)) return p; } return randomIn(zone); }

const QUOTES = {
  cat: ['The cat ignores you. Correct.', 'Mrrp.', 'The cat knocks a coin off the table while maintaining eye contact.', 'The cat purrs. Then bites you.'],
  brother: ['"I\'m BUSY."', '"There\'s a whole world down here."', '"Found a crisp. Eating it."', '"Don\'t tell Mum."'],
  detectorist: ['"Beep. Beep. Ooh. No, that\'s a bottle cap."', '"Found a Roman nail once. Probably."', '"Mind the sandals."', '"BEEEEP. Sorry, that was me."'],
  pigeon: ['Coo.', 'The pigeon wants a cut.', 'Coo coo. (Threatening.)'],
  goose: ['HONK.', 'The goose accepts your patting.', 'The goose looks at you like it knows something.'],
  gnome: ['"I have been awake for 400 years."', '"Dig. Dig. Dig."'],
};
const CAPS = { cat: 6, brother: 3, detectorist: 4, well: 1, pusher: 7, pigeons: 12, carboot: 4, mine: 1, factory: 1, moon: 1, multiverse: 5 };
function makeHelper(id, i) {
  let o;
  switch (id) {
    case 'cat': {
      o = add(M.cat(pick([0xf08a24, 0x444444, 0xdddddd, 0x8a6a4a])), 0, 0, 0);
      o.position.copy(safeSpot(ZONES.house));
      walker(o, ZONES.house, 0.9, { pause: 6 });
      interact(o, { range: 2.5, prompt: () => 'Stroke the cat', use: () => { LC.audio.sfx('meow'); if (LC.game.helperUse('cat')) return; LC.game.say(pick(QUOTES.cat)); if (Math.random() < 0.3) LC.game.tip(10); } });
      break;
    }
    case 'brother': {
      // legs sticking out of the sofa / armchair, kicking
      const seats = [[-3.9, 3.75, Math.PI], [-2.9, 3.75, Math.PI], [-6, 1.4, Math.PI / 2]];
      const [x, z, ry] = seats[i % seats.length];
      o = M.person({ shirt: 0xf2b631, legs: 0x3b6ea5, height: 0.6 });
      o.rotation.set(Math.PI - 0.5, ry + Math.PI, 0); o.position.set(x, 0.85, z);
      scene.add(o);
      agents.push({ obj: o, update: (dt, t) => { limbs(o, Math.sin(t * 9 + i)); } });
      interact(o, { range: 2.5, prompt: () => 'Pull your brother out', use: () => { if (LC.game.helperUse('brother')) return; LC.audio.sfx('nope'); LC.game.say(pick(QUOTES.brother)); } });
      break;
    }
    case 'detectorist': {
      o = add(M.person({ shirt: 0x6a8a4a, legs: 0x7a6a5a, hair: 0xcccccc, hat: 'cap' }), 0, 0, 0);
      o.position.copy(safeSpot(ZONES.garden));
      const det = M.detector(); det.position.set(0.32, 0.85, 0.35); det.rotation.x = 0.6; o.add(det);
      o.userData.armBusy = true;
      o.getObjectByName('armR').rotation.x = -0.9;
      walker(o, ZONES.garden, 0.7, { pause: 4 });
      agents.push({ obj: o, update: (dt, t) => { det.rotation.z = Math.sin(t * 2 + i) * 0.5; } });
      interact(o, { range: 2.5, prompt: () => 'Chat to the detectorist', use: () => { if (LC.game.helperUse('detectorist')) return; LC.audio.sfx('beep'); LC.game.say(pick(QUOTES.detectorist)); } });
      break;
    }
    case 'well': o = add(M.well(), spots.well.x, 0, spots.well.z); collideObj(o); break;
    case 'pusher': {
      o = add(M.coinPusher(), spots.pavement.x0 + i * 2, 0, spots.pavement.z, Math.PI);
      collideObj(o);
      break;
    }
    case 'pigeons': {
      o = add(M.pigeon(), rand(spots.ridge.x0, spots.ridge.x1), spots.ridge.y - 0.05, spots.ridge.z + rand(-0.1, 0.1), rand(0, 6));
      if (i % 3 === 2) o.position.set(rand(-11, 11), 1.2, -26);
      const base = o.position.y;
      agents.push({ obj: o, update: (dt, t) => { o.position.y = base + Math.max(0, Math.sin(t * 3 + i * 7)) * 0.06; if (Math.random() < dt * 0.2) o.rotation.y += rand(-1, 1); } });
      break;
    }
    case 'carboot': {
      o = add(M.car(pick([0x3b6ea5, 0xd9534f, 0x6aa84f, 0xf2b631, 0x9b59b6])), spots.roadside.x0 + i * 4, 0, spots.roadside.z, Math.PI / 2);
      collideObj(o);
      break;
    }
    case 'mine': {
      o = add(M.headframe(), spots.mine.x, 0, spots.mine.z);
      collide(spots.mine.x - 1.2, spots.mine.z - 1.2, spots.mine.x + 1.2, spots.mine.z + 1.2);
      const wheel = o.getObjectByName('wheel');
      agents.push({ obj: o, update: (dt) => { wheel.rotation.z += dt * 1.5; } });
      break;
    }
    case 'factory': o = add(M.factory(), 0, 0, 42, Math.PI); break;
    case 'moon': {
      o = M.sofa(0x9b59b6, 0x6a3a86, 2.3); o.scale.setScalar(3.2);
      o.position.set(0, 8.3, 0); o.rotation.set(0.3, 0.5, 0);
      o.traverse((m) => { if (m.material) m.material = new THREE.MeshBasicMaterial({ color: m.material.color, fog: false }); });
      spots.moon.add(o);
      break;
    }
    case 'multiverse': {
      o = add(M.portal(pick([0xa070ff, 0x40c0ff, 0xff70c0])), -25 + i * 14, 18 + (i % 2) * 6, -45);
      agents.push({ obj: o, update: (dt, t) => { o.rotation.z = t * 0.5 + i; } });
      break;
    }
    default: return null;
  }
  return o;
}
let evolved = {};
function evolve(id) {
  evolved[id] = true;
  for (const o of helpers[id] || []) o.traverse((m) => { if (m.material && m.material.color) m.material = M.mat(0xb8c4d0, { metalness: 0.8, roughness: 0.25, emissive: 0x203040 }); });
}
function syncHelpers(gens) {
  for (const id of Object.keys(CAPS)) {
    const want = Math.min(CAPS[id], gens[id] || 0);
    helpers[id] = helpers[id] || [];
    while (helpers[id].length < want) {
      const o = makeHelper(id, helpers[id].length);
      if (!o) break;
      helpers[id].push(o);
      if (evolved[id]) { evolved[id] = false; evolve(id); }
    }
  }
}

// ---------- the goose ----------
let goose = null, gooseMode = 'none', gooseCooldown = 0;
function setGoose(mode) {
  gooseMode = mode;
  if (mode === 'none') { if (goose) goose.visible = false; return; }
  if (!goose) {
    goose = add(M.goose(), -4, 0, -10);
    interact(goose, { range: 2.5, prompt: () => (gooseMode === 'friend' ? 'Pat the goose' : 'Shoo the goose'), use: () => { LC.audio.sfx('honk'); LC.game.say(pick(QUOTES.goose)); } });
    agents.push({ update: gooseUpdate });
  }
  goose.visible = true;
}
function gooseUpdate(dt, t) {
  if (!goose || !goose.visible) return;
  gooseCooldown -= dt;
  const to = new THREE.Vector3().subVectors(player.pos, goose.position); to.y = 0;
  const dist = to.length();
  let speed = 0;
  if (gooseMode === 'friend') { if (dist > 2.2) speed = Math.min(6.5, dist * 1.6); }
  else if (gooseMode === 'enemy') {
    if (dist < 11 && gooseCooldown <= 0) speed = 4.6;
    else if (gooseCooldown > 0 && dist < 6) { to.negate(); speed = 3; }
    if (dist < 0.8 && gooseCooldown <= 0) {
      gooseCooldown = 5;
      LC.audio.sfx('honk');
      shake = 0.35;
      const push = to.clone().normalize().multiplyScalar(1.6);
      tryMove(push.x, push.z);
      LC.game.gooseBite();
    }
    if (Math.random() < dt * 0.15) LC.audio.sfx('honk');
  }
  if (speed > 0) {
    to.normalize();
    const nx = goose.position.x + to.x * speed * dt, nz = goose.position.z + to.z * speed * dt;
    if (!blocked(nx, goose.position.z, 0.25)) goose.position.x = nx;
    if (!blocked(goose.position.x, nz, 0.25)) goose.position.z = nz;
    goose.rotation.y = Math.atan2(to.x, to.z);
    goose.position.y = Math.abs(Math.sin(t * 14)) * 0.05;
  }
}

// ---------- visitors for random events ----------
// Characters that come and talk to you: they walk (or fly) up, chat in a speech bubble, then leave.
const VOICES = { nan: 'babbleHigh', badger: 'babbleLow', fox: 'fox', seagull: 'squawk', goose: 'honk', icecream: 'babble', man: 'babble', buttonman: 'babbleLow', coin: 'babbleTiny', brian: 'babbleLow', director: 'babble', mayor: 'babbleLow', pigeon: 'squawk' };
function makeVisitor(kind) {
  if (kind === 'nan') return M.person({ shirt: 0xb07ab8, legs: 0x5a4a6a, hat: 'bun', height: 0.92 });
  if (kind === 'badger') { const o = M.badger(); o.scale.setScalar(1.4); const tie = M.box(0.06, 0.18, 0.02, 0xc8231f, 0, 0.28, 0.62); o.add(tie); return o; }
  if (kind === 'fox') { const o = M.cat(0xe0662a); o.scale.setScalar(1.6); return o; }
  if (kind === 'seagull') { const o = M.pigeon(); o.scale.setScalar(3.2); o.traverse((m) => { if (m.material && m.material.color && m.material.color.getHex() === 0x8d93a3) m.material = M.mat(0xffffff); }); return o; }
  if (kind === 'goose') return M.goose();
  if (kind === 'buttonman') return M.person({ shirt: 0x333355, legs: 0x333355, height: 1.25, hat: 'cap' });
  if (kind === 'icecream') return M.person({ shirt: 0xffffff, legs: 0xf7a8bd, hat: 'cap' });
  if (kind === 'brian') return M.person({ shirt: 0x8a9a6a, legs: 0x5a5a6a, hair: 0x6a5a4a, height: 1.08 });
  if (kind === 'coin') { const g = new THREE.Group(); const c = M.coin(0.35); c.rotation.x = Math.PI / 2; c.position.y = 0.5; g.add(c, M.ball(0.05, 0x2d2118, -0.1, 0.58, 0.07), M.ball(0.05, 0x2d2118, 0.1, 0.58, 0.07)); return g; }
  return M.person({ shirt: 0x7a7a7a, legs: 0x333333, hat: 'beanie' });
}
let talker = null;
function talkStart(kind, npc) {
  talkEnd(true);
  if ((kind === 'brian' && brian.obj) || npc) {
    // someone already in the world: they just turn to face you
    const o = npc || brian.obj;
    talker = { kind, obj: o, persistent: true, head: 2.05, state: 'talk' };
    talker.update = () => {
      if (!talker || talker.obj !== o) return;
      o.rotation.y = Math.atan2(player.pos.x - o.position.x, player.pos.z - o.position.z);
      const p = project(o.position.clone().setY(o.position.y + talker.head));
      const b = document.getElementById('bubble');
      if (p && b.classList.contains('show')) b.style.transform = `translate(${Math.max(160, Math.min(innerWidth - 160, p.x))}px, ${Math.max(90, Math.min(innerHeight - 260, p.y))}px) translate(-50%, -100%)`;
    };
    agents.push(talker);
    return;
  }
  const o = makeVisitor(kind);
  const flying = kind === 'seagull';
  const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  // stand about 2.2 m in front of the player, arriving from further away
  let stand = player.pos.clone().addScaledVector(fwd, 2.2);
  if (blocked(stand.x, stand.z, 0.3)) stand = player.pos.clone().addScaledVector(fwd, 1.4);
  const side = new THREE.Vector3(fwd.z, 0, -fwd.x).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
  const from = stand.clone().addScaledVector(fwd, 5).addScaledVector(side, 4);
  o.position.set(from.x, flying ? 7 : 0, from.z);
  scene.add(o);
  talker = { kind, obj: o, stand, flying, state: 'arrive', t: 0, head: kind === 'nan' || kind === 'icecream' || kind === 'man' || kind === 'buttonman' || kind === 'brian' ? 1.95 : kind === 'goose' ? 1.15 : 1.0 };
  talker.update = (dt, t) => {
    const T = talker; if (!T || T.obj !== o) return;
    T.t += dt;
    const target = T.state === 'leave' ? T.exit : T.stand;
    const d = new THREE.Vector3(target.x - o.position.x, 0, target.z - o.position.z);
    const dist = d.length();
    if (dist > 0.15) {
      d.normalize();
      const sp = T.state === 'leave' ? 3.5 : 3;
      o.position.x += d.x * sp * dt; o.position.z += d.z * sp * dt;
      o.rotation.y = Math.atan2(d.x, d.z);
      limbs(o, Math.sin(t * 10));
    } else {
      if (T.state === 'leave') { scene.remove(o); talker = null; bubble(false); return; }
      o.rotation.y = Math.atan2(player.pos.x - o.position.x, player.pos.z - o.position.z);
      limbs(o, 0);
      const arm = o.getObjectByName('armR'); if (arm) arm.rotation.x = -0.4 + Math.sin(t * 5) * 0.25;
    }
    if (T.flying) o.position.y += ((T.state === 'leave' ? 9 : 0.9 + Math.sin(t * 6) * 0.15) - o.position.y) * Math.min(1, dt * 2.5);
    if (kind === 'coin') o.position.y = Math.abs(Math.sin(t * 6)) * 0.3;
    // keep the speech bubble over their head
    const p = project(o.position.clone().setY(o.position.y + T.head));
    const b = document.getElementById('bubble');
    if (p && b.classList.contains('show')) {
      const x = Math.max(160, Math.min(innerWidth - 160, p.x)), y = Math.max(90, Math.min(innerHeight - 260, p.y));
      b.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
  };
  agents.push(talker);
}
function talkSay(text, name) {
  if (!talker) return;
  const b = document.getElementById('bubble');
  b.querySelector('.who').textContent = name || '';
  b.querySelector('.line').innerHTML = text;
  bubble(true);
  LC.audio.sfx(VOICES[talker.kind] || 'babble');
}
function bubble(on) { document.getElementById('bubble').classList.toggle('show', on); }
function talkEnd(now) {
  if (!talker) return;
  bubble(false);
  if (talker.persistent) { agents.splice(agents.indexOf(talker), 1); talker = null; return; }
  if (now) { scene.remove(talker.obj); agents.splice(agents.indexOf(talker), 1); talker = null; return; }
  const away = talker.obj.position.clone().sub(player.pos).setY(0).normalize();
  talker.exit = talker.obj.position.clone().addScaledVector(away, 25);
  talker.state = 'leave';
}

// ---------- pickups (coins on the floor, golden coins, coin rain, piglets) ----------
function spawnPickup(kind, pos, opts = {}) {
  let obj;
  if (kind === 'piglet') { obj = M.piggy('normal'); obj.scale.setScalar(0.45); }
  else obj = M.coin(kind === 'golden' ? 0.32 : 0.14, true, kind === 'golden');
  obj.position.copy(pos);
  scene.add(obj);
  let glow = null;
  if (kind === 'golden') {
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffd34d, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(2.2, 2.2, 1); obj.add(glow); glow.scale.set(7, 7, 1);
  }
  const p = { kind, obj, vel: opts.vel || new THREE.Vector3(), life: opts.life ?? 40, t: Math.random() * 6, ground: opts.ground ?? 0.18, dir: rand(0, 6.28) };
  pickups.push(p);
  return p;
}
let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(1, 'rgba(255,200,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _glow = new THREE.CanvasTexture(c); return _glow;
}
function randomWalkable(minD, maxD) {
  for (let i = 0; i < 40; i++) {
    const a = rand(0, Math.PI * 2), d = rand(minD, maxD);
    const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
    if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) continue;
    if (!blocked(x, z, 0.5)) return new THREE.Vector3(x, 0.18, z);
  }
  return null;
}
let floorCoinTimer = 5;
function updatePickups(dt) {
  floorCoinTimer -= dt;
  if (floorCoinTimer <= 0) {
    floorCoinTimer = rand(5, 11);
    if (pickups.filter((p) => p.kind === 'floor').length < 8) { const p = randomWalkable(3, 14); if (p) spawnPickup('floor', p, { life: 60 }); }
  }
  const magnet = LC.game.magnet();
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.t += dt; p.life -= dt;
    const o = p.obj;
    if (p.kind === 'piglet') {
      // run away from the player
      const away = new THREE.Vector3().subVectors(o.position, player.pos); away.y = 0;
      if (away.length() < 6) { away.normalize(); p.dir = Math.atan2(away.x, away.z) + rand(-0.6, 0.6); }
      const nx = o.position.x + Math.sin(p.dir) * 3.2 * dt, nz = o.position.z + Math.cos(p.dir) * 3.2 * dt;
      if (blocked(nx, nz, 0.2)) p.dir += 2; else { o.position.x = nx; o.position.z = nz; }
      o.rotation.y = p.dir; o.position.y = Math.abs(Math.sin(p.t * 12)) * 0.12;
    } else {
      if (o.position.y > p.ground || p.vel.y > 0) {
        p.vel.y -= GRAVITY * dt; o.position.addScaledVector(p.vel, dt);
        if (o.position.y < p.ground) { o.position.y = p.ground; p.vel.set(0, 0, 0); }
      } else o.position.y = p.ground + Math.sin(p.t * 3) * 0.05;
      o.rotation.set(Math.PI / 2, 0, p.t * 3);
      // magnet pull
      const d = o.position.distanceTo(player.pos.clone().setY(0.4));
      if (d < magnet && p.kind !== 'golden') o.position.lerp(player.pos.clone().setY(0.4), Math.min(1, dt * 6));
    }
    if (p.life < 3) o.visible = Math.floor(p.t * 8) % 2 === 0;
    const reach = p.kind === 'golden' ? 1.6 : 1.1;
    const dx = o.position.x - player.pos.x, dz = o.position.z - player.pos.z;
    if (dx * dx + dz * dz < reach * reach) { collect(p, i); continue; }
    if (p.life <= 0) { scene.remove(o); pickups.splice(i, 1); }
  }
}
function collect(p, i) {
  scene.remove(p.obj); pickups.splice(i, 1);
  const v = LC.game.collect(p.kind);
  burstAt(p.obj.position, p.kind === 'golden' ? 16 : 4);
  if (v != null) LC.game.floatAt(project(p.obj.position), v, p.kind === 'golden' ? 'big' : '');
}

// ---------- particles ----------
function burstAt(pos, n = 6, color = null) {
  for (let i = 0; i < n; i++) {
    const m = color ? M.box(0.08, 0.08, 0.08, color, 0, 0, 0, { shadow: false }) : M.coin(0.07, false);
    m.position.copy(pos);
    scene.add(m);
    particles.push({ m, vel: new THREE.Vector3(rand(-2, 2), rand(2.5, 5), rand(-2, 2)), life: rand(0.6, 1), spin: rand(5, 15) });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt; p.vel.y -= GRAVITY * dt; p.m.position.addScaledVector(p.vel, dt);
    p.m.rotation.x += p.spin * dt; p.m.rotation.y += p.spin * dt;
    if (p.life <= 0 || p.m.position.y < 0) { scene.remove(p.m); particles.splice(i, 1); }
  }
}

// ---------- using things ----------
function rummage(sofa, auto) {
  const r = LC.game.rummage(auto);
  if (!r) return;
  const p = sofa.position.clone().add(new THREE.Vector3(rand(-0.8, 0.8), 0.75, rand(-0.2, 0.2)));
  burstAt(p, r.burst || 3);
  if (r.grade === 'PERFECT!') shake = Math.max(shake, 0.08);
  LC.game.floatAt(project(p), r.value, r.grade === 'PERFECT!' ? 'big' : '');
  sofa.scale.set(1.03, 0.96, 1.03);
  setTimeout(() => sofa.scale.set(1, 1, 1), 90);
}
function dig(holeG) {
  const r = LC.game.dig();
  if (!r) return;
  const p = holeG.position.clone().setY(0.3);
  burstAt(p, 6, 0x7a4f2c);
  LC.game.floatAt(project(p), r.text, 'dirt');
  shake = Math.max(shake, 0.06);
}
let pig = null, pigKind = null, pigBusy = false;
function setPig(kind, scale = 1) {
  if (pig) { scene.remove(pig); interactables.splice(interactables.indexOf(pig), 1); }
  pigKind = kind;
  pig = M.piggy(kind);
  pig.position.copy(spots.pig);
  pig.rotation.y = Math.PI / 2;
  pig.scale.setScalar(scale * 0.9);
  pig.userData.base = scale * 0.9;
  scene.add(pig);
  interact(pig, { range: 3.2, hold: true, tool: 'pig', prompt: () => LC.game.pigPrompt(), use: hitPig });
  pig.position.y += 0.6;
  pigDrop = 0.6;
}
let pigDrop = 0, pigWobble = 0;
function hitPig() {
  if (pigBusy) return;
  const r = LC.game.hitPig();
  if (!r) return;
  if (r.type === 'hit') { pigWobble = 1; burstAt(pig.position.clone().setY(pig.position.y + 0.4), 2, 0xf7a8bd); }
  if (r.type === 'smash') {
    pigBusy = true;
    const at = pig.position.clone().setY(pig.position.y + 0.4);
    burstAt(at, 14, pigKind === 'golden' ? 0xf2b631 : 0xf7a8bd);
    burstAt(at, 12);
    LC.game.floatAt(project(at), r.payout, 'big');
    pig.visible = false;
    shake = 0.25;
    setTimeout(() => { pigBusy = false; LC.game.nextPig(); }, 800);
  }
  if (r.type === 'real') {
    // it was a real pig: it hops off the mantelpiece and leaves through the back door
    pigBusy = true;
    const realPig = pig; pig = null;
    interactables.splice(interactables.indexOf(realPig), 1);
    const path = [new THREE.Vector3(-5.6, 0, -2), new THREE.Vector3(-5.6, 0, -4.4), new THREE.Vector3(-5.6, 0, -9), new THREE.Vector3(-1, 0, -24)];
    let leg = 0, t = 0;
    const a = { update: (dt) => {
      t += dt;
      const target = path[leg];
      const d = new THREE.Vector3().subVectors(target, realPig.position); d.y = 0;
      if (d.length() < 0.2) { leg++; if (leg >= path.length) { scene.remove(realPig); agents.splice(agents.indexOf(a), 1); } return; }
      d.normalize();
      realPig.position.addScaledVector(d, dt * 2.2);
      realPig.position.y = Math.max(0, realPig.position.y - dt * 4) + Math.abs(Math.sin(t * 10)) * 0.08;
      realPig.rotation.y = Math.atan2(d.x, d.z);
    } };
    agents.push(a);
    setTimeout(() => { pigBusy = false; LC.game.nextPig(); }, 3000);
  }
}

// ---------- scratch cards, held in your hands ----------
const card = { group: null, mesh: null, base: null, silver: null, out: null, tex: null, cursor: { x: 0.5, y: 0.55 }, coin: null, active: false, done: false, scratching: false, moves: 0 };
const CW = 512, CH = 768, GRID = { x: 46, y: 250, w: 420, h: 420 };
const iconImgs = {};
function iconImg(emoji) {
  if (!iconImgs[emoji]) {
    const cps = [...emoji].map((c) => c.codePointAt(0));
    const list = cps.includes(0x200d) ? cps : cps.filter((c) => c !== 0xfe0f);
    const img = new Image(); img.src = `assets/icons/${list.map((c) => c.toString(16)).join('-')}.svg`;
    iconImgs[emoji] = img;
  }
  return iconImgs[emoji];
}
function drawCardBase(def, cells) {
  const g = card.base.getContext('2d');
  const gold = def.id === 'gold';
  const bg = g.createLinearGradient(0, 0, CW, CH);
  bg.addColorStop(0, gold ? '#ffd34d' : '#6ad04f'); bg.addColorStop(1, gold ? '#e08a12' : '#2d8a4f');
  g.fillStyle = bg; g.fillRect(0, 0, CW, CH);
  g.fillStyle = 'rgba(255,255,255,.12)';
  for (let i = -CH; i < CW; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + CH, CH); g.lineTo(i + CH + 18, CH); g.lineTo(i + 18, 0); g.fill(); }
  g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(14, 14, CW - 28, CH - 28);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#2d2118'; g.lineWidth = 10;
  let px = 74; g.font = `700 ${px}px Fredoka, sans-serif`;
  while (g.measureText(def.name.toUpperCase()).width > CW - 70) { px -= 4; g.font = `700 ${px}px Fredoka, sans-serif`; }
  g.strokeText(def.name.toUpperCase(), CW / 2, 110); g.fillText(def.name.toUpperCase(), CW / 2, 110);
  g.font = '700 30px Fredoka, sans-serif'; g.lineWidth = 6;
  g.strokeText('MATCH 3 TO WIN!', CW / 2, 160); g.fillText('MATCH 3 TO WIN!', CW / 2, 160);
  g.font = '600 22px Fredoka, sans-serif'; g.fillStyle = '#2d2118';
  g.fillText('JACKPOT x50 · GEESE · SOCKS · FROGS', CW / 2, 205);
  g.fillStyle = '#fffaf0'; g.fillRect(GRID.x - 10, GRID.y - 10, GRID.w + 20, GRID.h + 20);
  const cw = GRID.w / 3;
  cells.forEach((c, i) => {
    const x = GRID.x + (i % 3) * cw, y = GRID.y + Math.floor(i / 3) * cw;
    g.strokeStyle = '#d8c8a8'; g.lineWidth = 3; g.setLineDash([8, 6]); g.strokeRect(x + 6, y + 6, cw - 12, cw - 12); g.setLineDash([]);
    const img = iconImg(c.icon);
    const draw = () => { g.drawImage(img, x + cw / 2 - 42, y + 18, 84, 84); g.fillStyle = '#2d2118'; g.font = '700 18px Fredoka, sans-serif'; g.fillText(c.label, x + cw / 2, y + cw - 18); composeCard(); };
    if (img.complete && img.naturalWidth) draw(); else img.addEventListener('load', draw, { once: true });
  });
  g.font = '500 16px Fredoka, sans-serif'; g.fillStyle = '#fff';
  g.fillText('Play responsibly. Do not scratch the goose.', CW / 2, CH - 40);
}
function drawSilver() {
  const g = card.silver.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  const gr = g.createLinearGradient(0, GRID.y, CW, GRID.y + GRID.h);
  gr.addColorStop(0, '#b8b8b8'); gr.addColorStop(0.5, '#f0f0f0'); gr.addColorStop(1, '#a8a8a8');
  g.fillStyle = gr; g.fillRect(GRID.x - 10, GRID.y - 10, GRID.w + 20, GRID.h + 20);
  g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 600; i++) g.fillRect(GRID.x + Math.random() * GRID.w, GRID.y + Math.random() * GRID.h, 3, 3);
  g.fillStyle = '#8a8a8a'; g.font = '700 30px Fredoka, sans-serif'; g.textAlign = 'center';
  for (let r = 0; r < 3; r++) g.fillText('SCRATCH', CW / 2, GRID.y + 80 + r * 140);
}
function composeCard() {
  const g = card.out.getContext('2d');
  g.clearRect(0, 0, CW, CH); g.drawImage(card.base, 0, 0); g.drawImage(card.silver, 0, 0);
  card.tex.needsUpdate = true;
}
function buildCard() {
  card.base = document.createElement('canvas'); card.base.width = CW; card.base.height = CH;
  card.silver = document.createElement('canvas'); card.silver.width = CW; card.silver.height = CH;
  card.out = document.createElement('canvas'); card.out.width = CW; card.out.height = CH;
  card.tex = new THREE.CanvasTexture(card.out); card.tex.colorSpace = THREE.SRGBColorSpace; card.tex.anisotropy = 8;
  card.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.3), new THREE.MeshBasicMaterial({ map: card.tex, toneMapped: false }));
  card.coin = M.coin(0.011, false); card.coin.rotation.x = Math.PI / 2; card.coin.position.z = 0.01;
  card.group = new THREE.Group(); card.group.add(card.mesh, card.coin);
  card.group.position.set(0, -0.015, -0.33); card.group.rotation.x = -0.12;
  card.group.visible = false; camera.add(card.group);
  for (const sym of Object.values(LC.SCRATCH_SYMBOLS)) iconImg(sym.icon);
}
function startCard(def, cells) {
  drawCardBase(def, cells); drawSilver(); composeCard();
  card.cursor = { x: 0.5, y: 0.6 }; card.done = false; card.moves = 0; card.active = true; card.group.visible = true;
  placeCoin();
}
function placeCoin() { card.coin.position.set((card.cursor.x - 0.5) * 0.2, (0.5 - card.cursor.y) * 0.3, 0.008); }
function scratchAt() {
  const g = card.silver.getContext('2d');
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.arc(card.cursor.x * CW, card.cursor.y * CH, 30, 0, Math.PI * 2); g.fill();
  composeCard();
  if (++card.moves % 8 === 0) {
    LC.audio.sfx('scratch');
    const d = g.getImageData(GRID.x, GRID.y, GRID.w, GRID.h).data;
    let clear = 0, n = 0;
    for (let i = 3; i < d.length; i += 4 * 53) { n++; if (d[i] === 0) clear++; }
    if (clear / n > 0.62) finishCard();
  }
}
function finishCard() {
  if (card.done) return;
  card.done = true;
  card.silver.getContext('2d').clearRect(0, 0, CW, CH); composeCard();
  LC.game.resolveCard();
}
function endCard() { card.active = false; card.group.visible = false; card.scratching = false; }

// ---------- what you're holding (first-person view model) ----------
const view = { group: null, meshes: {}, current: null, swing: 0, sway: 0 };
function buildViewModel() {
  view.group = new THREE.Group();
  view.group.position.set(0.24, -0.22, -0.42);
  camera.add(view.group);
  scene.add(camera);
}
function viewMesh(kind, tier) {
  const key = kind + tier;
  if (!view.meshes[key]) {
    const m = kind === 'hand' ? M.glove() : M.heldTool(kind, tier);
    if (kind !== 'hand' && !(kind === 'sofa' && tier === 0)) {
      const hand = M.glove(); hand.position.set(0, 0, 0.02); hand.rotation.x = -0.4; m.add(hand);
    }
    m.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
    m.visible = false;
    view.group.add(m);
    view.meshes[key] = m;
  }
  return view.meshes[key];
}
let heldSprite = null, heldIcon = null;
function updateViewModel(dt, moving) {
  view.group.visible = !card.active;
  const kind = focus && focus.tool ? focus.tool : 'hand';
  // holding something from your pockets while looking at the stall
  const want = focus && focus.slot != null ? LC.game.heldIcon() : null;
  if (want !== heldIcon) {
    if (heldSprite) { view.group.remove(heldSprite); heldSprite = null; }
    heldIcon = want;
    if (want) { heldSprite = M.iconSprite(want, 0.12); heldSprite.position.set(-0.02, 0.06, -0.08); view.group.add(heldSprite); }
  }
  const tier = kind === 'hand' ? 0 : LC.game.toolTier(kind);
  const m = viewMesh(kind, tier);
  if (view.current !== m) { if (view.current) view.current.visible = false; m.visible = true; view.current = m; view.swing = 0; }
  view.swing = Math.max(0, view.swing - dt * 4.5);
  const sw = Math.sin(view.swing * Math.PI);
  view.sway += dt * (moving ? 9 : 1.5);
  const bobX = Math.sin(view.sway) * (moving ? 0.018 : 0.004), bobY = Math.abs(Math.cos(view.sway)) * (moving ? 0.02 : 0.005);
  m.position.set(bobX, bobY - sw * 0.08, sw * -0.12);
  const base = kind === 'dig' ? [0.5, 0, 0.2] : kind === 'pig' ? [0.3, 0.1, 0.25] : [0.2, 0.2, 0];
  m.rotation.set(base[0] - sw * 1.1, base[1], base[2]);
}

// ---------- prank effects you can see ----------
const prankBits = {};
function prankFx(kind) {
  if (prankBits[kind]) { scene.remove(prankBits[kind]); prankBits[kind] = null; }
  if (kind === 'whoopee') { const c = M.ball(0.22, 0xf7a8bd, 0, 0, 0, { scale: [1, 0.25, 1] }); c.position.copy(brianSpots.seat).setY(0.62); scene.add(c); prankBits[kind] = c; }
  if (kind === 'ticket') { const t = M.signPlane('PENALTY £80', 0.5, 0.3, { bg: '#f2d23a', color: '#111' }); t.position.set(-18.9, 1.45, 11); t.rotation.set(-0.9, -Math.PI / 2, 0); scene.add(t); prankBits[kind] = t; }
  if (kind === 'stink' || kind === 'glitter') {
    const at = kind === 'stink' ? spots.brianCar.position.clone().setY(1.2) : new THREE.Vector3(brianSpots.doorX, 1.2, 5.6);
    burstAt(at, 30, kind === 'stink' ? 0x8ab84a : 0xffd0f0);
  }
}
function clearPrank(kind) { if (prankBits[kind]) { scene.remove(prankBits[kind]); prankBits[kind] = null; } }

// ---------- player movement ----------
function tryMove(dx, dz) {
  const nx = player.pos.x + dx, nz = player.pos.z + dz;
  if (!blocked(nx, player.pos.z)) player.pos.x = nx;
  if (!blocked(player.pos.x, nz)) player.pos.z = nz;
}
function updatePlayer(dt) {
  const frozen = LC.game.isBlocked() || card.active;
  let fx = 0, fz = 0;
  if (!frozen && locked) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) fz -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) fz += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) fx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) fx += 1;
  }
  const moving = fx || fz;
  if (moving) {
    const len = Math.hypot(fx, fz); fx /= len; fz /= len;
    const sp = (crouching ? WALK * 0.45 : keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * LC.game.speedMult() * dt;
    const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
    tryMove((fx * c + fz * s) * sp, (-fx * s + fz * c) * sp);
    player.bob += dt * (sp / dt) * 2.2;
    player.stepT -= dt;
    if (player.stepT <= 0 && player.pos.y <= 0.001) { player.stepT = keys.has('ShiftLeft') ? 0.3 : 0.42; LC.audio.sfx('step'); }
  }
  // jumping
  if (player.pos.y > 0 || player.vy > 0) { player.vy -= GRAVITY * dt; player.pos.y = Math.max(0, player.pos.y + player.vy * dt); if (player.pos.y === 0) player.vy = 0; }
  flip += (flipTarget - flip) * Math.min(1, dt * 3);
  eye += ((crouching ? CROUCH_EYE : EYE) - eye) * Math.min(1, dt * 10);
  shake = Math.max(0, shake - dt);
  camera.position.set(
    player.pos.x + (shake ? rand(-shake, shake) * 0.3 : 0),
    player.pos.y + eye + (moving ? Math.sin(player.bob) * 0.04 : 0) + (shake ? rand(-shake, shake) * 0.3 : 0),
    player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, flip * Math.PI, 'YXZ');
  sun.position.set(player.pos.x + sunDir.x * 40, sunDir.y * 40, player.pos.z + sunDir.z * 40);
  sun.target.position.set(player.pos.x, 0, player.pos.z);
}

// ---------- looking at things ----------
const ray = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
function updateFocus() {
  ray.setFromCamera(center, camera);
  ray.far = 4;
  const hits = ray.intersectObjects(interactables, true);
  let f = null;
  for (const h of hits) {
    const def = h.object.userData.interact;
    if (!def || !h.object.visible) continue;
    if (h.distance <= def.range) f = def;
    break;
  }
  focus = f;
  LC.game.setPrompt(f && !LC.game.isBlocked() && !card.active ? f.prompt() : '');
}
function useFocus(auto) { if (focus && !LC.game.isBlocked()) { view.swing = 1; focus.use(auto); } }

// ---------- projection for floating text ----------
function project(v) {
  const p = v.clone().project(camera);
  if (p.z > 1) return null;
  return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
}

// ---------- golden coin compass ----------
function goldenBearing() {
  const g = pickups.find((p) => p.kind === 'golden');
  const target = g ? g.obj.position : stallWaiter ? stall.pos : null;
  if (!target) return null;
  const dx = target.x - player.pos.x, dz = target.z - player.pos.z;
  const ang = Math.atan2(-dx, -dz) - player.yaw;
  return { angle: -ang, dist: Math.hypot(dx, dz), kind: g ? 'golden' : 'stall' };
}

// ---------- input ----------
function setupInput() {
  canvas.addEventListener('click', () => { if (!locked && LC.game.canLock()) requestLock(); });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    LC.game.onLockChange(locked);
    if (!locked) { keys.clear(); holding = false; }
  });
  document.addEventListener('mousemove', (e) => {
    if (locked && card.active) {
      card.cursor.x = Math.max(0.06, Math.min(0.94, card.cursor.x + e.movementX * 0.0012));
      card.cursor.y = Math.max(0.06, Math.min(0.94, card.cursor.y + e.movementY * 0.0012));
      placeCoin();
      if (card.scratching && !card.done) scratchAt();
      return;
    }
    if (!locked || LC.game.isBlocked()) return;
    const k = 0.0022 * sensitivity * (flipTarget ? -1 : 1);
    player.yaw -= e.movementX * k;
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * k));
  });
  document.addEventListener('mousedown', (e) => {
    if (locked && card.active && e.button === 0) { if (card.done) { endCard(); return; } card.scratching = true; scratchAt(); return; }
    if (locked && e.button === 0) { holding = true; holdTimer = 0.25; useFocus(); }
  });
  document.addEventListener('mouseup', (e) => { if (e.button === 0) { holding = false; card.scratching = false; } });
  document.addEventListener('wheel', (e) => { if (locked && !LC.game.isBlocked()) LC.game.cycleHeld(e.deltaY > 0 ? 1 : -1); }, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.code === 'Tab') { e.preventDefault(); LC.game.togglePhone(); return; }
    if (!locked) return;
    keys.add(e.code);
    if (e.code === 'KeyE' && !e.repeat && card.active) { if (card.done) endCard(); else { finishCard(); } return; }
    if (e.code === 'KeyE' && !e.repeat) { holding = true; holdTimer = 0.25; useFocus(); }
    if (e.code === 'Space' && player.pos.y === 0 && !LC.game.isBlocked() && !crouching) player.vy = 6;
    if ((e.code === 'KeyC' || e.code === 'ControlLeft') && !e.repeat) crouching = !crouching;
    if (e.code === 'KeyR' && !e.repeat && focus && focus.alt && !LC.game.isBlocked()) focus.alt();
    if (/^Digit[1-9]$/.test(e.code) && !LC.game.isBlocked()) LC.game.selectHeld(+e.code.slice(5) - 1);
  });
  addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyE') holding = false; });
  addEventListener('blur', () => { keys.clear(); holding = false; });
  addEventListener('resize', resize);
}
function requestLock() {
  try { const p = canvas.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(() => canvas.requestPointerLock()); } catch (e) { canvas.requestPointerLock(); }
}
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (composer) composer.setSize(innerWidth, innerHeight);
}
// high quality adds ambient occlusion (soft contact shadows); low skips it for slower PCs
function setQuality(high) {
  if (!high) { composer = null; return; }
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 12 });
  ao.blendIntensity = 1.0;
  // also keep signs, glows and see-through light cones out of the occlusion pass (they'd go black)
  ao._overrideVisibility = function () {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      if ((o.isPoints || o.isLine || o.isSprite || o.userData.noAO) && o.visible) { o.visible = false; cache.push(o); }
    });
  };
  composer.addPass(ao);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.5, 1.0));
  composer.addPass(new OutputPass());
  // vignette and film grain, after tone mapping
  grainPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: 0.55 }, grain: { value: 0.045 }, sat: { value: 1.0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float vig; uniform float grain; uniform float sat; varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 d = vUv - 0.5;
        float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        c.rgb = mix(vec3(l), c.rgb, sat);
        c.rgb *= 1.0 - smoothstep(0.35, 0.95, length(d * vec2(1.15, 1.0))) * vig;
        c.rgb += (hash(vUv * 1000.0) - 0.5) * grain;
        gl_FragColor = c;
      }`,
  });
  composer.addPass(grainPass);
  composer.setSize(innerWidth, innerHeight);
}
// ---------- time of day: bright summer day, golden evening, dusk, then Mum calls you in ----------
// keyframes: t, sun power, sun colour, sun height, hemi power, hemi sky, hemi ground, sky top, sky bottom, fog, cloud, cloud glow, exposure, vignette, grain, saturation, street lamps
const SKY_KEYS = [
  [0.00, 2.8, 0xffe6c8, 0.35, 1.15, 0xcfe0ff, 0x8aa06a, 0x5f9ee8, 0xf5dcc0, 0xe8dccc, 0xffffff, 0x705a50, 1.0, 0.3, 0.025, 1.12, 0],
  [0.10, 3.8, 0xfff4e2, 0.85, 1.4, 0xd4e8ff, 0x8fb070, 0x2f86ec, 0xbfe0ff, 0xcfe4f6, 0xffffff, 0x808a9a, 1.02, 0.25, 0.02, 1.18, 0],
  [0.55, 3.8, 0xfff0d8, 0.75, 1.35, 0xd4e8ff, 0x8fb070, 0x3a8cec, 0xc6e2ff, 0xd2e4f2, 0xffffff, 0x808a9a, 1.02, 0.25, 0.02, 1.16, 0],
  [0.72, 3.4, 0xffc890, 0.3, 1.0, 0xb8c6e0, 0x5a4a3a, 0x3d64a0, 0xf6c49a, 0xe0b08a, 0xffe6cc, 0xa0705a, 0.97, 0.45, 0.035, 1.05, 0.4],
  [0.84, 3.0, 0xffaa70, 0.16, 0.9, 0xa8bce0, 0x4a3a2e, 0x36588f, 0xf6b98a, 0xd89c78, 0xffe2c8, 0xb0705a, 0.95, 0.55, 0.045, 1.0, 1],
  [1.00, 1.0, 0xff7a50, 0.05, 0.5, 0x5a6a9a, 0x2a2430, 0x141e48, 0xc0706a, 0x5a4a6a, 0x9a7a9a, 0x402a40, 0.9, 0.6, 0.05, 0.95, 1],
];
const MOODS = {
  storm: { sun: 0.35, hemi: 0.75, top: 0x3a4250, bottom: 0x7a8290, fog: 0x6a7280, cloud: 0x8a8f9a, sat: 0.8, lamps: 1 },
  powercut: { sun: 0.05, hemi: 0.3, top: 0x0a0f24, bottom: 0x1a2040, fog: 0x10142a, cloud: 0x2a2a3a, sat: 0.85, lamps: 0 },
  snow: { sun: 0.65, hemi: 1.1, top: 0x9aa8c0, bottom: 0xe8eef6, fog: 0xd8e0ea, cloud: 0xf4f6fa, sat: 0.9, lamps: 0.3 },
};
const sunDir = new THREE.Vector3(-0.75, 0.37, 0.5);
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const lerpHex = (target, a, b, f) => target.set(_c1.setHex(a).lerp(_c2.setHex(b), f));
function updateSky(tod) {
  if (area !== 'town') return;
  let i = 0; while (i < SKY_KEYS.length - 2 && tod > SKY_KEYS[i + 1][0]) i++;
  const A = SKY_KEYS[i], B = SKY_KEYS[i + 1], f = Math.min(1, Math.max(0, (tod - A[0]) / (B[0] - A[0])));
  const n = (k) => A[k] + (B[k] - A[k]) * f;
  const sky = scene.userData.sky.material.uniforms, mood = skyMood && MOODS[skyMood];
  sun.intensity = n(1) * (mood ? mood.sun : 1); lerpHex(sun.color, A[2], B[2], f);
  const el = n(3), az = -2.2 + tod * 2.6;
  sunDir.set(Math.cos(az) * Math.cos(el * 1.4), Math.sin(el * 1.4) + 0.08, Math.sin(az) * Math.cos(el * 1.4)).normalize();
  hemi.intensity = n(4) * (mood ? mood.hemi : 1); lerpHex(hemi.color, A[5], B[5], f); lerpHex(hemi.groundColor, A[6], B[6], f);
  if (mood) { sky.top.value.setHex(mood.top); sky.bottom.value.setHex(mood.bottom); scene.fog.color.setHex(mood.fog); }
  else { lerpHex(sky.top.value, A[7], B[7], f); lerpHex(sky.bottom.value, A[8], B[8], f); lerpHex(scene.fog.color, A[9], B[9], f); }
  scene.fog.near = 30; scene.fog.far = mood ? 70 : 160;
  scene.background.copy(scene.fog.color);
  const cm = scene.userData.cloudMat; lerpHex(cm.color, A[10], B[10], f); lerpHex(cm.emissive, A[11], B[11], f); if (mood) cm.color.setHex(mood.cloud);
  renderer.toneMappingExposure = n(12);
  if (grainPass) { grainPass.uniforms.vig.value = n(13); grainPass.uniforms.grain.value = n(14); grainPass.uniforms.sat.value = mood ? mood.sat : n(15); }
  const lamps = mood ? mood.lamps : n(16);
  for (const g of streetGlow) { if (g.isPointLight) { g.visible = lamps > 0.05; g.intensity = 4 * lamps; } else g.material.opacity = 0.035 * lamps; }
}

// a soft gradient sky dome with a few slow clouds
function buildSky() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x36588f) }, bottom: { value: new THREE.Color(0xf6b98a) } },
    vertexShader: 'varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main() { float h = clamp(vP.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0); }',
  }));
  sky.renderOrder = -1;
  scene.add(sky);
  scene.userData.sky = sky;
  clouds = new THREE.Group();
  const cm = new THREE.MeshLambertMaterial({ color: 0xffe2c8, emissive: 0xb0705a, fog: false });
  scene.userData.cloudMat = cm;
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(rand(4, 7), 10, 8), cm); b.position.set(k * 5 - 10, rand(-1, 1.5), rand(-2, 2)); b.scale.y = 0.55; c.add(b); }
    const a = rand(0, Math.PI * 2), d = rand(90, 170);
    c.position.set(Math.cos(a) * d, rand(45, 70), Math.sin(a) * d);
    c.rotation.y = rand(0, 3);
    clouds.add(c);
  }
  scene.add(clouds);
}

// ---------- main loop ----------
let last = performance.now(), time = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;
  updatePlayer(dt);
  updateFocus();
  updateViewModel(dt, keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD'));
  if (holding && focus && focus.hold) { holdTimer -= dt; if (holdTimer <= 0) { holdTimer = 0.2; useFocus(true); } }
  LC.game.setPulse(!!(focus && focus.pulse) && !LC.game.isBlocked());
  for (const a of [...agents]) a.update(dt, time);
  updatePickups(dt);
  updateParticles(dt);
  updateEvent(dt);
  if (pig) {
    pigWobble = Math.max(0, pigWobble - dt * 4);
    pig.rotation.z = Math.sin(time * 40) * 0.15 * pigWobble;
    if (pigDrop > 0) { pigDrop = Math.max(0, pigDrop - dt * 3); pig.position.y = spots.pig.y + pigDrop; }
  }
  const hole = spots.hole;
  if (hole) {
    const d = LC.game.depth();
    spots.ladder.visible = d >= 2;
    updateGates(d);
    const k = Math.min(1, Math.log10(1 + d) / 7);
    hole.getObjectByName('pit').scale.set(0.35 + k * 0.75, 1, 0.35 + k * 0.75);
    hole.getObjectByName('ring').scale.set(0.35 + k * 0.75, 0.35 + k * 0.75, 1);
    hole.getObjectByName('pile').scale.setScalar(0.2 + k * 1.6);
  }
  if (spots.washer && spots.washer.userData.shake) { spots.washer.position.x = 6.55 + Math.sin(time * 40) * 0.015; const dr = spots.washer.getObjectByName('drum'); if (dr) dr.rotation.y += dt * 12; }
  LC.game.setCompass(goldenBearing());
  if (clouds) clouds.rotation.y += dt * 0.004;
  if (grainPass) grainPass.uniforms.time.value = time % 10;
  updateSky(LC.game.timeOfDay());
  if (dust) { dust.rotation.y += dt * 0.01; dust.position.y = Math.sin(time * 0.2) * 0.05; }
  scene.userData.sky.position.copy(camera.position);
  if (composer) composer.render(dt); else renderer.render(scene, camera);
}

// ---------- public API ----------
function init() {
  canvas = document.getElementById('view');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe0a882);
  scene.fog = new THREE.Fog(0xd89c78, 22, 120);
  buildSky();
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 400);
  hemi = new THREE.HemisphereLight(0xa8bce0, 0x4a3a2e, 0.9);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffbf86, 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  // warm practical lights: the lamps do the work indoors
  const lamp = (color, intensity, dist, x, y, z) => { const l = new THREE.PointLight(color, intensity, dist, 1.8); l.position.set(x, y, z); scene.add(l); return l; };
  lamp(0xffc27a, 16, 11, -3.5, 2.55, 0);
  lamp(0xffc27a, 12, 10, 3.5, 2.55, 0);
  lamp(0xffa850, 5, 5, -0.6, 1.5, 4.3);          // floor lamp
  lamp(0xff8a40, 4, 4, -6.3, 0.6, -2);           // fireplace glow
  lamp(0x6ab0ff, 3, 4, -3.5, 1.2, -4.0);         // TV glow
  lamp(0xfff0d0, 14, 12, 0, 3, 22);              // corner shop
  lightCone(0, 3.4, 22, 2.8, 1.8, 0xfff0d0, 0.04);
  for (let x = -20; x <= 20; x += 10) streetGlow.push(lamp(0xffc27a, 4, 7, x + 0.5, 3.7, 9.6));
  buildDust();
  buildLevel();
  buildFoliage();
  buildUnderground();
  buildLoft();
  buildViewModel();
  buildCard();
  setQuality(true);
  resize();
  setupInput();
  requestAnimationFrame(frame);
}

LC.world = {
  init,
  lock: requestLock,
  unlock: () => { if (document.pointerLockElement) document.exitPointerLock(); },
  isLocked: () => locked,
  syncHelpers,
  setPig,
  setGoose,
  talkStart, talkSay, talkEnd, evolve,
  townEvent, treasureReveal, treasureSpot: () => ev.spot, eventId: () => ev.id, onFilmMark: () => !!(ev.group && ev.group.userData.xmark && player.pos.distanceTo(ev.group.userData.xmark) < 1.2),
  startCard, cardActive: () => card.active,
  isUnderground: () => area === 'under',
  area: () => area,
  goLoft: () => goArea('loft', [LX - 3.4, 0], -Math.PI / 2),
  setLoftPigs,
  washerShake: (on) => { if (spots.washer) spots.washer.userData.shake = on; },
  hideRing: () => { if (spots.ring) spots.ring.visible = false; },
  setStallItems, setStallUps, nearStall, spawnCustomer, setMuseum,
  stallScreenPos: () => project(stall.pos.clone().setY(1.2)),
  stallWaiting: () => !!stallWaiter,
  brianState: () => (brian.bbq ? 'bbq' : brian.state),
  brianBBQ,
  brianSitting: () => brian.sitting,
  brianNoise, setDoorOpen, throwOut,
  brianNear: (r = 4) => brian.obj && brian.obj.position.distanceTo(player.pos) < r,
  playerInBrians: () => { const I = brianSpots.inside; const p = player.pos; return p.x > I.x0 && p.x < I.x1 && p.z > I.z0 && p.z < I.z1; },
  prankFx: (kind) => prankFx(kind),
  clearPrank,
  isCrouching: () => crouching,
  setFlip: (on) => { flipTarget = on ? 1 : 0; },
  setSensitivity: (s) => { sensitivity = s; },
  setQuality: (high) => { setQuality(high); resize(); },
  setDepthText: (t) => spots.depthSign && spots.depthSign.userData.setText(t),
  setThingText: (t) => spots.thingLabel && spots.thingLabel.userData.setText(t),
  spawnGolden: () => { const p = randomWalkable(10, 32); if (p) { p.y = 1; spawnPickup('golden', p, { life: 45, ground: 1 }); return true; } return false; },
  coinRain: (n = 30) => {
    for (let i = 0; i < n; i++) setTimeout(() => {
      const p = randomWalkable(0.5, 9); if (!p) return;
      p.y = rand(6, 10);
      spawnPickup('rain', p, { life: 14, vel: new THREE.Vector3(0, -2, 0) });
    }, i * 90);
  },
  piglets: (n = 3) => { for (let i = 0; i < n; i++) { const p = randomWalkable(3, 7); if (p) { p.y = 0; spawnPickup('piglet', p, { life: 20 }); } } },
  shake: (s = 0.3) => { shake = s; },
  reset: () => {
    for (const list of Object.values(helpers)) for (const o of list) { if (o.parent) o.parent.remove(o); const i = interactables.indexOf(o); if (i >= 0) interactables.splice(i, 1); }
    for (const id of Object.keys(helpers)) helpers[id] = [];
    for (const p of pickups) scene.remove(p.obj);
    pickups.length = 0;
    // drop agents that belonged to helpers (they reference removed objects); keep the shopkeeper and goose
    for (let i = agents.length - 1; i >= 0; i--) if (agents[i].obj && !agents[i].obj.parent) agents.splice(i, 1);
    if (goose) goose.position.set(-4, 0, -10);
    setGoose('none');
    flipTarget = 0;
    player.pos.set(-3.5, 0, 0.6); player.yaw = Math.PI; player.pitch = -0.12;
  },
  // for testing: put the camera somewhere and use whatever is in front of it
  debug: {
    evProps: () => (ev.group ? ev.group.children.map((c) => [+c.position.x.toFixed(1), +c.position.z.toFixed(1)]) : []),
    lookAt: (fx, fz, tx, tz, pitch = -0.05) => { player.pos.set(fx, 0, fz); player.yaw = Math.atan2(-(tx - fx), -(tz - fz)); player.pitch = pitch; updatePlayer(0); camera.updateMatrixWorld(); updateFocus(); return focus && focus.prompt(); },
    view: (x, z, yaw, pitch = -0.1) => { player.pos.set(x, 0, z); player.yaw = yaw; player.pitch = pitch; updatePlayer(0); camera.updateMatrixWorld(); updateFocus(); },
    use: () => { camera.updateMatrixWorld(); updateFocus(); useFocus(); },
    focus: () => { camera.updateMatrixWorld(); updateFocus(); return focus && focus.prompt(); },
    scratch: (rows = 3) => { for (let r = 0; r < rows; r++) for (let i = 0; i <= 20; i++) { card.cursor.x = 0.1 + (r % 2 ? 20 - i : i) * 0.04; card.cursor.y = 0.36 + r * 0.09; placeCoin(); if (!card.done) scratchAt(); } },
    hits: () => { camera.updateMatrixWorld(); ray.setFromCamera(center, camera); ray.far = 6; return ray.intersectObjects(interactables, true).map((h) => `${h.distance.toFixed(2)} ${h.object.userData.interact ? h.object.userData.interact.prompt().slice(0, 30) : '-'} vis:${h.object.visible}`); },
  },
  teleportHome: () => { player.pos.set(-3.5, 0, 0.6); player.yaw = Math.PI; player.pitch = -0.12; },
};
