// Loose Change — the 3D world: your house, the back garden, the street and the corner shop.
// First-person: WASD to walk, mouse to look, E / click to use things, Tab for your phone.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as M from './models.js';
import { tex } from './textures.js';

const LC = globalThis.LC;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const EYE = 1.6, RADIUS = 0.32, WALK = 4.2, RUN = 7, GRAVITY = 18;
const BOUNDS = { x0: -24, x1: 24, z0: -26, z1: 27 };

let renderer, scene, camera, sun, canvas, composer = null, clouds = null;
const colliders = [];
const interactables = [];
const agents = [];
const pickups = [];
const particles = [];
const keys = new Set();
const player = { pos: new THREE.Vector3(-3.5, 0, 0.6), vy: 0, yaw: Math.PI, pitch: -0.12, bob: 0, stepT: 0 };
let locked = false, flip = 0, flipTarget = 0, holdTimer = 0, holding = false, focus = null, shake = 0;
let sensitivity = 1;

// ---------- building helpers ----------
function add(obj, x = 0, y = 0, z = 0, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; scene.add(obj); return obj; }
function collide(x0, z0, x1, z1) { colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }
function collideObj(obj, pad = 0) {
  const b = new THREE.Box3().setFromObject(obj);
  collide(b.min.x - pad, b.min.z - pad, b.max.x + pad, b.max.z + pad);
}
const WALL_TEX = { 0xf3e6c8: 'wallpaper', 0xe8d9f0: 'wallpaper2', 0xe58a6b: 'brick' };
function texMat(name, rx, ry, color = 0xffffff) { return new THREE.MeshLambertMaterial({ color, map: tex(name, rx, ry) }); }
function wall(x0, z0, x1, z1, color = 0xf3e6c8, h = 2.8, t = 0.2) {
  const w = Math.abs(x1 - x0) || t, d = Math.abs(z1 - z0) || t;
  const tn = WALL_TEX[color];
  const m = M.box(w, h, d, tn ? texMat(tn, Math.max(w, d) / 2, h / 2) : color, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, { shadow: false, sharp: true });
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
function interact(obj, def) { obj.traverse((o) => { o.userData.interact = def; }); interactables.push(obj); def.obj = obj; return def; }

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
    const win = M.box(1.6, 1.1, 0.05, 0xbfe7ff, 0, 0, 0, { mat: { emissive: 0x3a5a70 }, shadow: false });
    add(win, x, 1.6, z, ry);
  }
  // roof (doesn't cast shadows so the inside stays bright)
  const roofMat = M.mat(M.C.roof);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.2, 6.2), roofMat);
    r.position.set(0, 3.95, s * 2.75); r.rotation.x = s * 0.42; scene.add(r);
  }
  // gable ends: triangles from the top of the walls up to the ridge
  const tri = new THREE.Shape([new THREE.Vector2(-5.1, 0), new THREE.Vector2(5.1, 0), new THREE.Vector2(0, 2.35)]);
  const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const gable = new THREE.Mesh(gableGeo, M.mat(s < 0 ? wc : wc2));
    gable.rotation.y = Math.PI / 2; gable.position.set(s * 7 - 0.1, 2.8, 0); scene.add(gable);
  }
  // ceiling, so the inside feels like a room
  const ceiling = M.box(14, 0.1, 10, new THREE.MeshLambertMaterial({ color: 0xfbf6ea, emissive: 0x6a6458 }), 0, 2.85, 0, { shadow: false, sharp: true });
  ceiling.receiveShadow = false; scene.add(ceiling);
  for (const x of [-3.5, 3.5]) scene.add(M.cyl(0.25, 0.3, 0.12, 0xfff2c0, x, 2.75, 0, { mat: { emissive: 0xa08a40 }, shadow: false }));
  spots.ridge = { x0: -6.5, x1: 6.5, y: 5.15, z: 0 };
  add(M.box(0.6, 1.6, 0.6, M.C.brick, 0, 0, 0), -4, 4.4, 1.5);

  // living room
  const sofa = add(M.sofa(), -3.5, 0, 3.9, Math.PI); collideObj(sofa, 0.05);
  spots.sofa = sofa;
  interact(sofa, { range: 3.4, hold: true, prompt: () => LC.game.sofaPrompt(), use: () => rummage(sofa) });
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
  const holeHit = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.2, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  holeHit.position.y = 0.6; holeG.add(holeHit);
  interact(holeG, { range: 4.5, hold: true, prompt: () => LC.game.digPrompt(), use: () => dig(holeG) });
  const sign = M.textSprite('0 m', { size: 0.45 }); sign.position.set(-2, 1.9, -12.4); scene.add(sign);
  add(M.box(0.08, 1.6, 0.08, M.C.woodDark, 0, 0, 0), -2, 0.8, -12.45);
  spots.depthSign = sign;
  const shed = add(M.shed(), 8.4, 0, -22.3); collideObj(shed);
  interact(shed, { range: 3.5, prompt: () => 'Open the shed: buy diggers', use: () => LC.game.openScreen('shed') });
  for (const [x, z, h] of [[-9.5, -23, 3.6], [10, -8.5, 3], [-10, -9, 2.6], [3, -24, 3.2]]) { const t = add(M.tree(h), x, 0, z); collide(x - 0.3, z - 0.3, x + 0.3, z + 0.3); }
  for (const [x, z] of [[-11, -16], [11, -14], [-5, -25], [6, -6.2], [-11, -6.3]]) add(M.bush(), x, 0, z);
  spots.garden = { x0: -11, x1: 11, z0: -25, z1: -6 };
  spots.well = new THREE.Vector3(5, 0, -12);
  spots.mine = new THREE.Vector3(-8, 0, -19);

  // ---- front garden & street (south) ----
  floor(2.6, 5, 3.4, 8, 0xbcb3a3, 0.015); // path
  for (const [x0, x1] of [[-12, 2.4], [3.6, 12]]) { const f = M.fence((x1 - x0), 0x7a6a5a); f.scale.y = 0.6; f.position.set((x0 + x1) / 2, 0, 8); scene.add(f); collide(x0, 7.9, x1, 8.1); }
  for (const s of [-1, 1]) { const f = M.fence(3, 0x7a6a5a); f.scale.y = 0.6; f.rotation.y = Math.PI / 2; f.position.set(s * 12, 0, 6.5); scene.add(f); collide(s * 12 - 0.1, 5, s * 12 + 0.1, 8); }
  floor(-40, 8, 40, 10, 0xcfcac0, 0.03);   // near pavement
  floor(-40, 10, 40, 16, 0x4a4a52, 0.02);  // road
  for (let x = -38; x < 40; x += 4) floor(x, 12.9, x + 2, 13.1, 0xf2f0e6, 0.03);
  floor(-40, 16, 40, 18, 0xcfcac0, 0.03);  // far pavement
  // neighbours (Brian is on the left)
  for (const [x0, x1, col, name] of [[-24, -12, 0xd8b7a0, "BRIAN'S HOUSE"], [12, 24, 0xa8c8b8, 'NUMBER 9']]) {
    const h = add(M.box(x1 - x0, 4.2, 10, col, 0, 0, 0, { shadow: false }), (x0 + x1) / 2, 2.1, 0);
    collide(x0, -5, x1, 5);
    const roof = add(M.box(x1 - x0 + 0.4, 0.3, 10.6, M.C.roof, 0, 0, 0), (x0 + x1) / 2, 4.3, 0);
    const lbl = M.textSprite(name, { size: 0.5 }); lbl.position.set((x0 + x1) / 2, 3.2, 5.2); scene.add(lbl);
    for (const s of [-1, 1]) add(M.box(1.4, 1, 0.05, 0xbfe7ff, 0, 0, 0, { mat: { emissive: 0x3a5a70 }, shadow: false }), (x0 + x1) / 2 + s * 3, 1.8, 5.03);
    void roof; void h;
  }
  for (const s of [-1, 1]) collide(s * 12 - 0.2, -26, s * 12 + 0.2, -5);
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
  for (const s of [-1, 1]) add(M.box(2.6, 1.4, 0.05, 0xbfe7ff, 0, 0, 0, { mat: { emissive: 0x3a5a70 }, shadow: false }), s * 3, 1.6, sz0 - 0.12);
  const counter = add(M.counter(4), 0, 0, 23.6); collideObj(counter);
  const keeper = add(M.person({ shirt: 0x2d6a4f, hair: 0x222222 }), 0, 0, 24.6, Math.PI);
  agents.push({ obj: keeper, update: (dt, t) => { keeper.rotation.y = Math.PI + Math.sin(t * 0.7) * 0.3; } });
  interact(counter, { range: 3, prompt: () => 'Buy scratch cards', use: () => LC.game.openScreen('scratch') });
  interact(keeper, { range: 3.5, prompt: () => 'Buy scratch cards', use: () => LC.game.openScreen('scratch') });
  for (const s of [-1, 1]) {
    const sh = add(M.bookshelf(), s * 4.6, 0, 22, s * -Math.PI / 2); collideObj(sh);
  }
  const cardStand = add(M.box(0.8, 1.2, 0.3, 0xf2b631, 0, 0, 0), -1.4, 1.55, 23.6);
  void cardStand;
  // the rest of the street
  for (const [x0, x1, col, name] of [[-24, -7, 0x9fb7d6, 'LAUNDERETTE'], [7, 24, 0xd6c49f, 'CHIPPY']]) {
    add(M.box(x1 - x0, 5, 8, col, 0, 0, 0, { shadow: false }), (x0 + x1) / 2, 2.5, 22);
    collide(x0, 18, x1, 26);
    const lbl = M.textSprite(name, { size: 0.6 }); lbl.position.set((x0 + x1) / 2, 4, 17.9); scene.add(lbl);
  }
  collide(-7, 18, -5, 26); collide(5, 18, 7, 26);
  for (let x = -20; x <= 20; x += 10) { add(M.lampPost(), x, 0, 9.6, Math.PI / 2); collide(x - 0.15, 9.45, x + 0.15, 9.75); }
  for (const [x, z] of [[-30, 30], [30, 30], [0, 48], [-45, -10], [45, 0], [-35, -38], [30, -40]]) add(M.tree(rand(4, 6)), x, 0, z);
  // invisible edges of the world
  collide(BOUNDS.x0 - 1, BOUNDS.z0, BOUNDS.x0, BOUNDS.z1); collide(BOUNDS.x1, BOUNDS.z0, BOUNDS.x1 + 1, BOUNDS.z1);
  collide(BOUNDS.x0, BOUNDS.z1, BOUNDS.x1, BOUNDS.z1 + 1); collide(BOUNDS.x0, BOUNDS.z0 - 1, BOUNDS.x1, BOUNDS.z0);
  spots.pavement = { x0: 7, x1: 22, z: 9 };
  spots.roadside = { x0: -23, x1: -8, z: 11.4 };

  // sky things
  const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf4f1e4, fog: false }));
  moon.position.set(-70, 60, -110); scene.add(moon);
  spots.moon = moon;
}

// ---------- characters & helpers that appear as you buy them ----------
const helpers = {}; // gen id -> array of objects
const ZONES = {
  house: [{ x0: -6.5, x1: -0.6, z0: -4.4, z1: 3 }, { x0: 0.6, x1: 6.5, z0: -3.8, z1: 4.4 }],
  garden: [{ x0: -11, x1: 11, z0: -25, z1: -6.5 }],
};
function randomIn(zone) { const r = pick(zone); return new THREE.Vector3(rand(r.x0, r.x1), 0, rand(r.z0, r.z1)); }
function blocked(x, z, r = RADIUS) { return colliders.some((c) => x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r); }

function walker(obj, zone, speed, opts = {}) {
  const a = { obj, zone, speed, target: randomIn(zone), wait: rand(0, 2), t: Math.random() * 10, ...opts };
  a.update = (dt) => {
    a.t += dt;
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
      interact(o, { range: 2.5, prompt: () => 'Stroke the cat', use: () => { LC.audio.sfx('meow'); LC.game.say(pick(QUOTES.cat)); if (Math.random() < 0.3) LC.game.tip(10); } });
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
      interact(o, { range: 2.5, prompt: () => 'Pull your brother out', use: () => { LC.audio.sfx('nope'); LC.game.say(pick(QUOTES.brother)); } });
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
      interact(o, { range: 2.5, prompt: () => 'Chat to the detectorist', use: () => { LC.audio.sfx('beep'); LC.game.say(pick(QUOTES.detectorist)); } });
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
function syncHelpers(gens) {
  for (const id of Object.keys(CAPS)) {
    const want = Math.min(CAPS[id], gens[id] || 0);
    helpers[id] = helpers[id] || [];
    while (helpers[id].length < want) {
      const o = makeHelper(id, helpers[id].length);
      if (!o) break;
      helpers[id].push(o);
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
function visitor(kind, secs = 14) {
  let o;
  if (kind === 'nan') o = M.person({ shirt: 0xb07ab8, legs: 0x5a4a6a, hat: 'bun', height: 0.92 });
  else if (kind === 'badger') { o = M.badger(); o.scale.setScalar(1.4); }
  else if (kind === 'fox') { o = M.cat(0xe0662a); o.scale.setScalar(1.6); }
  else if (kind === 'seagull') { o = M.pigeon(); o.scale.setScalar(3); o.traverse((m) => { if (m.material && m.material.color.getHex() === 0x8d93a3) m.material = M.mat(0xffffff); }); }
  else if (kind === 'buttonman') o = M.person({ shirt: 0x333355, legs: 0x333355, height: 1.25, hat: 'cap' });
  else if (kind === 'icecream') o = M.person({ shirt: 0xffffff, legs: 0xf7a8bd, hat: 'cap' });
  else o = M.person({ shirt: 0x7a7a7a, legs: 0x333333, hat: 'beanie' });
  const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  let p = player.pos.clone().addScaledVector(fwd, 3);
  for (let i = 0; i < 8 && blocked(p.x, p.z, 0.4); i++) p = player.pos.clone().addScaledVector(fwd.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.8), 2.5);
  o.position.set(p.x, 0, p.z);
  o.rotation.y = Math.atan2(player.pos.x - p.x, player.pos.z - p.z);
  scene.add(o);
  const a = { update: (dt, t) => { o.rotation.y = Math.atan2(player.pos.x - o.position.x, player.pos.z - o.position.z); const al = o.getObjectByName('armR'); if (al) al.rotation.z = Math.sin(t * 6) * 0.4 + 2.6; } };
  agents.push(a);
  setTimeout(() => { scene.remove(o); agents.splice(agents.indexOf(a), 1); }, secs * 1000);
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
function rummage(sofa) {
  const r = LC.game.rummage();
  if (!r) return;
  const p = sofa.position.clone().add(new THREE.Vector3(rand(-0.8, 0.8), 0.75, rand(-0.2, 0.2)));
  burstAt(p, 3);
  LC.game.floatAt(project(p), r.value);
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
  interact(pig, { range: 3.2, hold: true, prompt: () => LC.game.pigPrompt(), use: hitPig });
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

// ---------- player movement ----------
function tryMove(dx, dz) {
  const nx = player.pos.x + dx, nz = player.pos.z + dz;
  if (!blocked(nx, player.pos.z)) player.pos.x = nx;
  if (!blocked(player.pos.x, nz)) player.pos.z = nz;
}
function updatePlayer(dt) {
  const frozen = LC.game.isBlocked();
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
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * dt;
    const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
    tryMove((fx * c + fz * s) * sp, (-fx * s + fz * c) * sp);
    player.bob += dt * (sp / dt) * 2.2;
    player.stepT -= dt;
    if (player.stepT <= 0 && player.pos.y <= 0.001) { player.stepT = keys.has('ShiftLeft') ? 0.3 : 0.42; LC.audio.sfx('step'); }
  }
  // jumping
  if (player.pos.y > 0 || player.vy > 0) { player.vy -= GRAVITY * dt; player.pos.y = Math.max(0, player.pos.y + player.vy * dt); if (player.pos.y === 0) player.vy = 0; }
  flip += (flipTarget - flip) * Math.min(1, dt * 3);
  shake = Math.max(0, shake - dt);
  camera.position.set(
    player.pos.x + (shake ? rand(-shake, shake) * 0.3 : 0),
    player.pos.y + EYE + (moving ? Math.sin(player.bob) * 0.04 : 0) + (shake ? rand(-shake, shake) * 0.3 : 0),
    player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, flip * Math.PI, 'YXZ');
  sun.position.set(player.pos.x + 18, 30, player.pos.z + 12);
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
  LC.game.setPrompt(f && !LC.game.isBlocked() ? f.prompt() : '');
}
function useFocus() { if (focus && !LC.game.isBlocked()) focus.use(); }

// ---------- projection for floating text ----------
function project(v) {
  const p = v.clone().project(camera);
  if (p.z > 1) return null;
  return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
}

// ---------- golden coin compass ----------
function goldenBearing() {
  const g = pickups.find((p) => p.kind === 'golden');
  if (!g) return null;
  const dx = g.obj.position.x - player.pos.x, dz = g.obj.position.z - player.pos.z;
  const ang = Math.atan2(-dx, -dz) - player.yaw;
  return { angle: -ang, dist: Math.hypot(dx, dz) };
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
    if (!locked || LC.game.isBlocked()) return;
    const k = 0.0022 * sensitivity * (flipTarget ? -1 : 1);
    player.yaw -= e.movementX * k;
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * k));
  });
  document.addEventListener('mousedown', (e) => { if (locked && e.button === 0) { holding = true; holdTimer = 0.25; useFocus(); } });
  document.addEventListener('mouseup', (e) => { if (e.button === 0) holding = false; });
  addEventListener('keydown', (e) => {
    if (e.code === 'Tab') { e.preventDefault(); LC.game.togglePhone(); return; }
    if (!locked) return;
    keys.add(e.code);
    if (e.code === 'KeyE' && !e.repeat) { holding = true; holdTimer = 0.25; useFocus(); }
    if (e.code === 'Space' && player.pos.y === 0 && !LC.game.isBlocked()) player.vy = 6;
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
  ao.blendIntensity = 0.85;
  composer.addPass(ao);
  composer.addPass(new OutputPass());
  composer.setSize(innerWidth, innerHeight);
}
// a soft gradient sky dome with a few slow clouds
function buildSky() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x4fa8e0) }, bottom: { value: new THREE.Color(0xd8f0f7) } },
    vertexShader: 'varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main() { float h = clamp(vP.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0); }',
  }));
  sky.renderOrder = -1;
  scene.add(sky);
  scene.userData.sky = sky;
  clouds = new THREE.Group();
  const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa8b0, fog: false });
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
  if (holding && focus && focus.hold) { holdTimer -= dt; if (holdTimer <= 0) { holdTimer = 0.2; useFocus(); } }
  for (const a of [...agents]) a.update(dt, time);
  updatePickups(dt);
  updateParticles(dt);
  if (pig) {
    pigWobble = Math.max(0, pigWobble - dt * 4);
    pig.rotation.z = Math.sin(time * 40) * 0.15 * pigWobble;
    if (pigDrop > 0) { pigDrop = Math.max(0, pigDrop - dt * 3); pig.position.y = spots.pig.y + pigDrop; }
  }
  const hole = spots.hole;
  if (hole) {
    const d = LC.game.depth();
    const k = Math.min(1, Math.log10(1 + d) / 7);
    hole.getObjectByName('pit').scale.set(0.35 + k * 0.75, 1, 0.35 + k * 0.75);
    hole.getObjectByName('ring').scale.set(0.35 + k * 0.75, 0.35 + k * 0.75, 1);
    hole.getObjectByName('pile').scale.setScalar(0.2 + k * 1.6);
  }
  LC.game.setCompass(goldenBearing());
  if (clouds) clouds.rotation.y += dt * 0.004;
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
  renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9dcf2);
  scene.fog = new THREE.Fog(0xcbe8f2, 40, 140);
  buildSky();
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 400);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x7a8a5a, 2.3));
  sun = new THREE.DirectionalLight(0xffeccc, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const indoor = new THREE.PointLight(0xffe2b0, 18, 14, 1.6); indoor.position.set(-3.5, 2.6, 0); scene.add(indoor);
  const indoor2 = new THREE.PointLight(0xffe2b0, 14, 12, 1.6); indoor2.position.set(3.5, 2.6, 0); scene.add(indoor2);
  const shopLight = new THREE.PointLight(0xfff6e0, 14, 12, 1.6); shopLight.position.set(0, 3, 22); scene.add(shopLight);
  buildLevel();
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
  visitor,
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
  debug: { view: (x, z, yaw, pitch = -0.1) => { player.pos.set(x, 0, z); player.yaw = yaw; player.pitch = pitch; }, use: () => useFocus(), focus: () => focus && focus.prompt() },
  teleportHome: () => { player.pos.set(-3.5, 0, 0.6); player.yaw = Math.PI; player.pitch = -0.12; },
};
