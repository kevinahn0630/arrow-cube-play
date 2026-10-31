import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { makeCube, generate, add, scale, cross, axisOf } from './cube.js';
import { newState, blockAt, group, canExit, remove, solve, ownerAt, pose, caughtBy, darkCell, exitEnd, charge, clocked, deadEnd } from './rules.js';
import { evaluate } from './difficulty.js';
import { WORLDS, preset, STAR_AT, TIER_STARS } from './stages.js';
import { loadProgress, markCleared, isCleared, clearedCount, starsOf, totalStars, tierOpen, tutorialDone, markTutorialDone } from './progress.js';
import { STAGE_SEEDS } from './stage-seeds.js';
import { TUTORIALS, tutorialParams, findTarget, switchHint, lookCell } from './tutorial.js';
import { TUTORIAL_SEEDS } from './tutorial-seeds.js';
import { worldIcon } from './flags.js';
import { themeOf } from './themes.js';
import { scenery } from './scenery.js';
import { wakeAudio, playLeave, playBump, isMuted, setMuted } from './sound.js';
import { DEV } from './build.js';

const S = 4; // cube edge length in world units
const BOLD = 1.5; // how thick arrows and their heads are drawn, against the first design
const SPEED = 56; // doubled grid units per second (28 cells/s)
// Colours of the current world's theme (themes.js), set by applyTheme.
let COLOR;
let PALETTE; // key/gate and pair colours, one per link
let GUARD; // Big Ben's two guard colours
let AURORA; // aurora arrows and their curtains
const GLOW = new THREE.Color('#ffc21a'); // the tutorial's lit arrow or switch
const GIMMICK_DEFAULTS = { N: 8, minLen: 3, maxLen: 9, straight: 0.55, fill: 0.95, block: 1, deep: 0.6, wrap: 0.45, long: 0.4, amount: 0.5 };

const $ = (id) => document.getElementById(id);
// The build players get hides the development tools (src/build.js, index.html).
if (!DEV) document.body.classList.add('release');

// ---------- scene

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
$('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const HOME_VIEW = new THREE.Vector3(6.2, 4.6, 7.4);
camera.position.copy(HOME_VIEW);

const controls = new TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 3.2;
controls.zoomSpeed = 1.4;
controls.noPan = true;
controls.minDistance = 4.2;
controls.maxDistance = 22;
controls.dynamicDampingFactor = 0.14;

const box = new THREE.Mesh(
  new THREE.BoxGeometry(S, S, S),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }),
);
scene.add(box);
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(box.geometry),
  new THREE.LineBasicMaterial({ color: 0xb9c3e6, transparent: true, opacity: 0.8 }),
);
scene.add(edges);

// Switch to a world's look: page background, cube glass and every colour things are
// drawn in. Callers redraw afterwards.
function applyTheme(t) {
  const c = (hex) => new THREE.Color(hex);
  COLOR = {
    front: c(t.arrow.front),
    back: c(t.arrow.ghost),
    red: c(t.arrow.blocked),
    moving: c(t.arrow.moving),
    free: c(t.arrow.free),
    gateDot: c(t.gateDot),
    mirror: c(t.mirror),
    mirrorTile: c(t.mirrorTile),
    disc: c(t.disc),
    belt: c(t.belt),
    beltMark: c(t.beltMark),
    beltHint: c(t.beltHint),
    tunnel: c(t.tunnel),
    obelisk: c(t.obelisk),
    obeliskTop: c(t.obeliskTop),
    shadow: c(t.shadow),
    lasso: c(t.lasso),
    knot: c(t.knot),
    boomerang: c(t.boomerang),
    canal: c(t.canal),
    canalFlow: c(t.canalFlow),
    machete: c(t.machete),
    vine: c(t.vine),
    vineLeaf: c(t.vineLeaf),
    lantern: c(t.lantern),
    lanternGlow: c(t.lanternGlow),
    dark: c(t.dark),
    beam: c(t.beam),
    eagle: c(t.eagle),
    shojiFrame: c(t.shojiFrame),
    shojiPaper: c(t.shojiPaper),
    millHub: c(t.millHub),
    millSail: c(t.millSail),
    millFrame: c(t.millFrame),
    bull: c(t.bull),
    dialRing: c(t.dialRing),
    dialHub: c(t.dialHub),
  };
  PALETTE = t.links.map(c);
  GUARD = t.guards.map(c);
  AURORA = t.aurora.map(c);
  document.body.style.background = t.background;
  box.material.color.set(t.box.face);
  box.material.opacity = t.box.faceOpacity;
  edges.material.color.set(t.box.edge);
}

// The picture behind the cube (scenery.js) for the world whose look is on, drawn for
// the screen's size: again after a resize, and not again when nothing changed.
let sceneryWorld = '';
function showScenery(world = sceneryWorld) {
  sceneryWorld = world;
  const el = $('scenery');
  const key = `${world} ${el.clientWidth}x${el.clientHeight}`;
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  el.innerHTML = scenery(world, el.clientWidth, el.clientHeight);
}

// Zoomed in, the cube covers the picture and shows it through its glass behind the
// arrows, so the picture fades: all there from the starting view out, down to a
// quarter at the closest.
let sceneryOpacity = 1;
function fadeScenery() {
  const t = THREE.MathUtils.smoothstep(camera.position.length(), controls.minDistance, HOME_VIEW.length());
  const o = Math.round((0.25 + 0.75 * t) * 100) / 100;
  if (o === sceneryOpacity) return;
  sceneryOpacity = o;
  $('scenery').style.opacity = o;
}
const arrowMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
const decor = new THREE.Mesh(new THREE.BufferGeometry(), arrowMat); // mirrors, guards, gates
scene.add(decor);
// The tutorial's lit arrow or switch: a pulsing glow round it.
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
const glow = new THREE.Mesh(new THREE.BufferGeometry(), glowMat);
scene.add(glow);

// Faces in cube.js order: +x, -x, +y, -y, +z, -z. `facing` is a bitmask of the ones
// turned toward the camera; things on the others draw as see-through ghosts.
const FACES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const faceIdx = (n) => axisOf(n) * 2 + (n[axisOf(n)] > 0 ? 0 : 1);
const isFacing = (face) => face < 0 || ((facing >> face) & 1) === 1;
let facing = -1;

function facingMask() {
  const c = camera.position;
  let m = 0;
  FACES.forEach((n, i) => {
    const h = S / 2;
    if (n[0] * (c.x - n[0] * h) + n[1] * (c.y - n[1] * h) + n[2] * (c.z - n[2] * h) > 0) m |= 1 << i;
  });
  return m;
}

// ---------- game state

const game = {
  world: 'home', // a key of WORLDS, or 'free' for the generator panel
  stage: 1,
  lastWorld: 'home', // where ◀ ▶ lead back to from the generator
  params: null,
  puz: null, // generated puzzle (cube.js)
  state: null, // what changes while playing (rules.js)
  arrows: [], // per-arrow view state: animation, colours, mesh
  remaining: 0,
  cleared: false,
  showFree: false,
  solveTimer: 0,
  beltHintUntil: 0, // the belt glows until then: nothing can leave until it moves
  autoSolved: false, // the auto-solve button was used on this stage: clearing it is not recorded
  thick: 1, // arrows drawn this much bolder where cells are small on screen (cellPixels)
  stuck: false, // the stage is over without a clear (a clocked dead end, or no hearts left); the card starts it over
  heartsMax: 0, // wrong taps this stage forgives (country stages from 6 on); 0: no limit
  hearts: 0, // of those, how many are left
  // The tutorial being played (stage 0 of a world): its steps, the step on now (k), the
  // arrow each step was about (targets), the arrow lit now (focus, -1 for none), the
  // switch move lit now (hint) and whether it is between steps (wait).
  tut: null,
  turn: null, // the camera turning to show something: { from, to, up, upTo, len, t0 }
  screen: 'splash', // what is in front: the loading screen, the home screen or the game ('play')
  playing: false, // a stage has been picked since the game started (the home screen can go back to it)
};

function world(p) {
  const N = game.puz.cube.N;
  const k = S / (2 * N);
  return new THREE.Vector3((p[0] - N) * k, (p[1] - N) * k, (p[2] - N) * k);
}

// Flat strip from P to Q lying on the face with normal n, half-width hw, lifted off
// the face by `lift`. Ends stretch by extP/extQ so joined strips close their corners.
function strip(pos, col, P, Q, nArr, hw, lift, c, extP = 0, extQ = 0) {
  const u = Q.clone().sub(P);
  const L = u.length();
  if (L < 1e-6) return;
  u.divideScalar(L);
  const n = new THREE.Vector3(...nArr);
  const w = new THREE.Vector3().crossVectors(n, u).multiplyScalar(hw);
  const o = n.multiplyScalar(lift);
  const p0 = P.clone().addScaledVector(u, -extP).add(o);
  const q0 = Q.clone().addScaledVector(u, extQ).add(o);
  for (const v of [p0.clone().add(w), p0.clone().sub(w), q0.clone().sub(w), p0.clone().add(w), q0.clone().sub(w), q0.clone().add(w)]) {
    pos.push(v.x, v.y, v.z);
    col.push(c.r, c.g, c.b);
  }
}

function setGeometry(mesh, pos, col) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  mesh.geometry.dispose();
  mesh.geometry = g;
}

// Path an arrow travels when it leaves: its own cells tail→head, its exit path
// (bending at mirrors), then straight off the face edge. Points are doubled grid
// coordinates; each segment remembers the face it lies on (-1 once off the cube).
function buildTrack(cube, ar) {
  const C = cube.cells;
  const { cells } = ar;
  const head = C[cells.at(-1)];
  const pts = [{ p: C[cells[0]].p, cell: true }];
  const segs = [];
  for (let i = 1; i < cells.length; i++) {
    const a = C[cells[i - 1]];
    const b = C[cells[i]];
    if (faceIdx(a.n) !== faceIdx(b.n)) {
      pts.push({ p: add(a.p, b.n), cell: false });
      segs.push({ face: faceIdx(a.n), n: a.n });
    }
    pts.push({ p: b.p, cell: true });
    segs.push({ face: faceIdx(b.n), n: b.n });
  }
  const headAt = pts.length - 1;
  let prev = head;
  ar.ray.forEach((id, k) => {
    const b = C[id];
    if (faceIdx(prev.n) !== faceIdx(b.n)) {
      pts.push({ p: add(prev.p, b.n), cell: false });
      segs.push({ face: faceIdx(prev.n), n: prev.n });
    }
    pts.push({ p: b.p, cell: true });
    // The stretch between two tunnel mouths runs underground and is not drawn.
    segs.push({ face: faceIdx(b.n), n: b.n, hidden: ar.jumps.includes(k) });
    prev = b;
  });
  const last = prev.p;
  pts.push({ p: add(last, ar.exitDir), cell: false });
  segs.push({ face: faceIdx(prev.n), n: prev.n });
  pts.push({ p: add(last, scale(ar.exitDir, 1 + 2 * (cells.length + 3))), cell: false });
  segs.push({ face: -1, n: prev.n });

  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1].p;
    const b = pts[i].p;
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  // How far along the track each cell (body, then exit path) lies: where a bull
  // charging on comes to rest.
  const cellAt = cum.filter((_, i) => pts[i].cell);
  return { pts, segs, cum, cellAt, len: cum[headAt], total: cum.at(-1), headN: head.n };
}

// The part of a track between distances a and b, as points plus the track segment
// each piece lies on.
function slice(tr, a, b) {
  const { pts, cum } = tr;
  const at = (i, d) => {
    const t = (d - cum[i]) / (cum[i + 1] - cum[i]);
    const p = pts[i].p;
    const q = pts[i + 1].p;
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  };
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] <= a) i++;
  const out = [{ p: at(i, a), cap: true }];
  const segIdx = [];
  while (i + 1 < pts.length - 1 && cum[i + 1] < b) {
    segIdx.push(i);
    out.push({ p: pts[i + 1].p, cap: pts[i + 1].cell });
    i++;
  }
  segIdx.push(i);
  out.push({ p: at(i, b), cap: false });
  return { out, segIdx };
}

function colorOf(ar, face) {
  if (ar.state === 'exiting') return COLOR.moving;
  if (!isFacing(face)) return COLOR.back;
  if (ar.redUntil) return COLOR.red;
  if (game.showFree && ar.free) return COLOR.free;
  if (ar.tint >= 0) return AURORA[ar.tint];
  if (ar.disc) return COLOR.disc;
  if (ar.lasso) return COLOR.lasso;
  if (ar.knot >= 0) return COLOR.knot;
  if (ar.boom) return COLOR.boomerang;
  if (ar.machete) return COLOR.machete;
  if (ar.lantern) return COLOR.lantern;
  if (ar.ray2) return COLOR.eagle;
  if (ar.run) return COLOR.bull;
  return ar.hue >= 0 ? PALETTE[ar.hue % PALETTE.length] : COLOR.front;
}

// With `lit`, draws the tutorial's glow round the arrow instead: the same shape,
// lit.widen times as wide and just under it, added to lit.pos / lit.col.
function drawArrow(ar, lit = null) {
  const cs = S / game.puz.cube.N;
  // Same stroke on every grid size; only very dense grids go thinner.
  // Lines and heads half as thick again as at first (BOLD), bolder still on small cells.
  const line = Math.min(cs * 0.085 * BOLD * game.thick, 0.04 * BOLD);
  const hw = lit ? line * lit.widen : line;
  const eps = S * (lit ? 0.0016 : 0.004);
  const pos = lit?.pos ?? [];
  const col = lit?.col ?? [];

  // Nothing but lanterns shows where it lies in the dark. Whether point p (doubled
  // coordinates) on track segment sg is in the dark:
  const N = game.puz.cube.N;
  const hide = !!game.puz.darkOf && !ar.lantern;
  const inShadow = (p, sg) => {
    if (!hide || sg.face < 0) return false;
    const a = axisOf(sg.n);
    const q = p.map((v, k) => (k === a ? (sg.n[a] > 0 ? 2 * N : 0) : Math.min(2 * N - 1, Math.max(1, 2 * Math.floor(v / 2) + 1))));
    return darkCell(game.puz, game.state, game.puz.cube.index.get(q.join(',')));
  };
  const tr = ar.track;
  const { out, segIdx } = slice(tr, ar.s, ar.s + tr.len);
  let headColor = COLOR.front;
  for (let i = 0; i < segIdx.length; i++) {
    const sg = tr.segs[segIdx[i]];
    headColor = lit ? GLOW : colorOf(ar, sg.face);
    if (sg.hidden) continue;
    const A = out[i].p;
    const B = out[i + 1].p;
    // Cut the piece where it passes from one cell to the next and leave out the parts
    // in the dark.
    const ts = [0, 1];
    if (hide && sg.face >= 0) {
      for (let k = 0; k < 3; k++) {
        if (k === axisOf(sg.n)) continue;
        for (let e = 2 * Math.ceil(Math.min(A[k], B[k]) / 2); e <= Math.max(A[k], B[k]); e += 2) {
          const t = (e - A[k]) / (B[k] - A[k]);
          if (t > 0 && t < 1) ts.push(t);
        }
      }
      ts.sort((x, y) => x - y);
    }
    const at = (t) => A.map((v, k) => v + (B[k] - v) * t);
    for (let j = 0; j + 1 < ts.length; j++) {
      if (inShadow(at((ts[j] + ts[j + 1]) / 2), sg)) continue;
      const capP = j === 0 && out[i].cap ? hw : 0;
      const capQ = j + 2 === ts.length && out[i + 1].cap ? hw : 0;
      strip(pos, col, world(at(ts[j])), world(at(ts[j + 1])), sg.n, hw, eps, headColor, capP, capQ);
    }
  }
  // Underground in a tunnel, or in the dark: no head either.
  const lastSeg = tr.segs[segIdx.at(-1)];
  if (lastSeg.hidden || inShadow(out.at(-1).p, lastSeg)) {
    if (!lit) setGeometry(ar.mesh, pos, col);
    return;
  }

  // Solid triangular head whose base sits over the end of the line, so the two read
  // as one shape. It points along the last piece of line, which follows mirror turns.
  const H = world(out.at(-1).p);
  const d = H.clone().sub(world(out.at(-2).p));
  // A diagonal head points corner-wise while the body still lies behind it.
  if (d.lengthSq() < 1e-10 || (ar.diag && ar.s < 2)) d.set(...ar.dir);
  d.normalize();
  const n = new THREE.Vector3(...tr.headN);
  const side = new THREE.Vector3().crossVectors(n, d);
  // No wider than a cell, so heads side by side do not run into each other.
  const a = Math.min(cs * (0.32 + 0.13 * (game.thick - 1)) * BOLD, cs * 0.5, line * 4.5) * (lit ? 1 + 0.3 * (lit.widen - 1) : 1);
  const o = n.multiplyScalar(eps * 1.5);
  // A head-shaped triangle at `at` pointing along dir, k times the usual size.
  const triangle = (at, dir, sideV, k = 1) => {
    const tip = at.clone().addScaledVector(dir, a * 0.5 * k).add(o);
    const base = at.clone().addScaledVector(dir, -a * 0.6 * k).add(o);
    for (const v of [tip, base.clone().addScaledVector(sideV, a * 0.62 * k), base.clone().addScaledVector(sideV, -a * 0.62 * k)]) {
      pos.push(v.x, v.y, v.z);
      col.push(headColor.r, headColor.g, headColor.b);
    }
  };
  triangle(H, d, side);
  // A bull's horns.
  if (ar.run) {
    for (const sgn of [1, -1]) {
      const root = H.clone().addScaledVector(side, sgn * a * 0.45).add(o);
      const tip = H.clone().addScaledVector(side, sgn * a * 0.95).addScaledVector(d, a * 0.5).add(o);
      strip(pos, col, root, tip, tr.headN, hw * 0.55, 0, headColor);
    }
  }
  // An eagle has a head at its tail end too.
  if (ar.ray2) {
    const T = world(out[0].p);
    const d2 = T.clone().sub(world(out[1].p)).normalize();
    triangle(T, d2, new THREE.Vector3().crossVectors(new THREE.Vector3(...tr.headN), d2));
  }
  // A lasso: a small loop held out in front of the head.
  if (ar.lasso && ar.state !== 'exiting') {
    const C = H.clone().addScaledVector(d, a * 1.05).add(o);
    const r = a * 0.42;
    for (let k = 0; k < 8; k++) {
      const t0 = (k / 8) * Math.PI * 2;
      const t1 = ((k + 1) / 8) * Math.PI * 2;
      const P = C.clone().addScaledVector(d, Math.cos(t0) * r).addScaledVector(side, Math.sin(t0) * r);
      const Q = C.clone().addScaledVector(d, Math.cos(t1) * r).addScaledVector(side, Math.sin(t1) * r);
      strip(pos, col, P, Q, tr.headN, hw * 0.5, 0, headColor);
    }
  }
  // A boomerang: a hook off the tip of its head that curls round to the lane its way
  // out comes back on (`boom`), ending in a small head pointing back. It goes once the
  // head has made the turn.
  if (ar.boom && d.dot(new THREE.Vector3(...ar.dir)) > 0.5) {
    const back = new THREE.Vector3(...ar.boom);
    const r = a * 0.45;
    const C = H.clone().addScaledVector(d, a * 0.5).addScaledVector(back, r).add(o);
    const arc = (t) => C.clone().addScaledVector(d, Math.sin(t) * r).addScaledVector(back, -Math.cos(t) * r);
    for (let k = 0; k < 6; k++) {
      strip(pos, col, arc((k / 6) * Math.PI), arc(((k + 1) / 6) * Math.PI), tr.headN, hw * 0.55, 0, headColor, hw * 0.3, hw * 0.3);
    }
    const end = H.clone().addScaledVector(d, a * 0.5).addScaledVector(back, 2 * r);
    triangle(end.addScaledVector(d, -a * 0.6 * 0.45), d.clone().negate(), back, 0.45);
  }
  if (!lit) setGeometry(ar.mesh, pos, col);
}

// Mirrors, guard tiles (filled when shut, outlined when open), gates still shut,
// curtains not yet lifted, the belt, tunnel mouths, obelisks and their shadows, and
// dials.
function drawDecor() {
  const { cube, mirrors, guards, curtains, belt, tunnels, canals, sundial, dials, doors, mills, arrows } = game.puz;
  const cs = S / cube.N;
  const eps = S * 0.004;
  const pos = [];
  const col = [];
  const cellInfo = (id) => {
    const { p, n } = cube.cells[id];
    const u = cube.tangents(id)[0];
    return { C: world(p), n, u: new THREE.Vector3(...u), v: new THREE.Vector3(...cross(n, u)), face: faceIdx(n) };
  };
  const tint = (face, c) => (isFacing(face) ? c : COLOR.back);
  const square = ({ C, n, u }, half, c, lift) =>
    strip(pos, col, C.clone().addScaledVector(u, -half), C.clone().addScaledVector(u, half), n, half, lift, c);
  const outline = ({ C, n, u, v }, half, t, c, lift) => {
    for (const [a, b] of [[u, v], [v, u]]) {
      for (const s of [1, -1]) {
        const mid = C.clone().addScaledVector(b, s * half);
        strip(pos, col, mid.clone().addScaledVector(a, -half - t), mid.clone().addScaledVector(a, half + t), n, t, lift, c);
      }
    }
  };

  // Sundial: shadow cells for where the sun stands now (only on faces toward the
  // camera, like the belt), then the obelisks on top.
  if (sundial) {
    const obelisks = new Set(sundial.obelisks);
    for (const id of sundial.shadows[game.state.sun]) {
      const info = cellInfo(id);
      if (!obelisks.has(id) && isFacing(info.face)) square(info, cs * 0.5, COLOR.shadow, eps * 0.3);
    }
    for (const id of obelisks) {
      const info = cellInfo(id);
      square(info, cs * 0.34, tint(info.face, COLOR.obelisk), eps * 0.6);
      square(info, cs * 0.12, tint(info.face, COLOR.obeliskTop), eps * 1.0);
    }
  }
  // Dials: a rim round the 3×3 block and a hub in the middle with a notch showing
  // how far it is turned.
  for (const [k, d] of (dials ?? []).entries()) {
    const info = cellInfo(d.centre);
    const c = (col_) => tint(info.face, col_);
    outline(info, cs * 1.48, cs * 0.05, c(COLOR.dialRing), eps * 0.4);
    square(info, cs * 0.3, c(COLOR.dialHub), eps * 0.6);
    let notch = new THREE.Vector3(...cube.tangents(d.centre)[0]);
    // Clockwise seen from outside, as the dial turns (cube.js turnCell).
    for (let r = 0; r < game.state.dials[k]; r++) notch = new THREE.Vector3().crossVectors(notch, new THREE.Vector3(...d.n));
    strip(pos, col, info.C, info.C.clone().addScaledVector(notch, cs * 0.3), info.n, cs * 0.06, eps * 1.0, c(COLOR.dialRing));
  }
  // Shoji: a rail along each track, and a paper panel with a frame on the cells of the
  // two places that are shut.
  for (const [k, d] of (doors ?? []).entries()) {
    const [a, b] = [d.track[0], d.track.at(-1)].map(cellInfo);
    strip(pos, col, a.C, b.C, a.n, cs * 0.03, eps * 0.4, tint(a.face, COLOR.shojiFrame), cs * 0.45, cs * 0.45);
    d.track.forEach((id, j) => {
      if (Math.floor(j / d.width) === game.state.doors[k]) return;
      const info = cellInfo(id);
      square(info, cs * 0.44, tint(info.face, COLOR.shojiPaper), eps * 0.7);
      outline(info, cs * 0.42, cs * 0.035, tint(info.face, COLOR.shojiFrame), eps * 0.9);
      strip(pos, col, info.C.clone().addScaledVector(info.u, -cs * 0.42), info.C.clone().addScaledVector(info.u, cs * 0.42), info.n, cs * 0.02, eps * 0.9, tint(info.face, COLOR.shojiFrame));
    });
  }
  // Windmills: the sails along the way they lie now, a small mark on each cell they
  // would swing to, and the hub.
  for (const [k, m] of (mills ?? []).entries()) {
    const hub = cellInfo(m.hub);
    const c = (col_) => tint(hub.face, col_);
    const now = m.sails[game.state.mills[k]];
    const ends = [now[0], now.at(-1)].map((id) => world(cube.cells[id].p));
    strip(pos, col, ends[0], ends[1], hub.n, cs * 0.2, eps * 0.7, c(COLOR.millSail), cs * 0.4, cs * 0.4);
    strip(pos, col, ends[0], ends[1], hub.n, cs * 0.035, eps * 0.9, c(COLOR.millFrame), cs * 0.4, cs * 0.4);
    for (const id of m.sails[1 - game.state.mills[k]]) square(cellInfo(id), cs * 0.06, c(COLOR.millFrame), eps * 0.5);
    square(hub, cs * 0.26, c(COLOR.millHub), eps * 1.1);
  }
  // Canals: water (on faces toward the camera only, like the belt) with a chevron
  // in each cell pointing the way it flows.
  for (const [id, f] of canals) {
    const info = cellInfo(id);
    if (isFacing(info.face)) square(info, cs * 0.5, COLOR.canal, eps * 0.3);
    const fw = new THREE.Vector3(...f);
    const sideV = new THREE.Vector3().crossVectors(new THREE.Vector3(...info.n), fw);
    const tip = info.C.clone().addScaledVector(fw, cs * 0.16);
    for (const sgn of [1, -1]) {
      const tail = info.C.clone().addScaledVector(fw, -cs * 0.12).addScaledVector(sideV, sgn * cs * 0.22);
      strip(pos, col, tail, tip, info.n, cs * 0.04, eps * 0.6, tint(info.face, COLOR.canalFlow), 0, cs * 0.04);
    }
  }
  // Lanterns: each one's shadow while it is on the cube, the beams of light their ways
  // out cut through it (on faces toward the camera), and a glow at each head.
  const present = (L) => game.state.occ[game.arrows[L].cells.at(-1)] === L;
  for (const id of game.puz.darkOf?.keys() ?? []) {
    const info = cellInfo(id);
    if (isFacing(info.face) && darkCell(game.puz, game.state, id)) square(info, cs * 0.5, COLOR.dark, eps * 0.25);
  }
  for (const [id, by] of game.puz.beams ?? []) {
    const info = cellInfo(id);
    if (isFacing(info.face) && by.some(present)) square(info, cs * 0.5, COLOR.beam, eps * 0.25);
  }
  for (const L of game.arrows) {
    if (!L.lantern || game.state.occ[L.cells.at(-1)] !== L.index) continue;
    const info = cellInfo(L.cells.at(-1));
    square(info, cs * 0.3, tint(info.face, COLOR.lanternGlow), eps * 0.35);
  }
  // A tunnel mouth: a dark hole, ringed in its pair's colour.
  let pair = 0;
  for (const [a, b] of tunnels) {
    if (a > b) continue;
    for (const id of [a, b]) {
      const info = cellInfo(id);
      square(info, cs * 0.3, tint(info.face, COLOR.tunnel), eps * 0.6);
      outline(info, cs * 0.36, cs * 0.05, tint(info.face, PALETTE[pair % PALETTE.length]), eps * 0.7);
    }
    pair++;
  }
  for (const [id, m] of mirrors) {
    const info = cellInfo(id);
    square(info, cs * 0.42, tint(info.face, COLOR.mirrorTile), eps * 0.5);
    const diag = new THREE.Vector3(...m).normalize().multiplyScalar(cs * 0.5);
    strip(pos, col, info.C.clone().sub(diag), info.C.clone().add(diag), info.n, cs * 0.09, eps * 1.2, tint(info.face, COLOR.mirror));
  }
  for (const [id, colour] of guards) {
    const info = cellInfo(id);
    const c = tint(info.face, GUARD[colour]);
    if (colour === game.state.bell) square(info, cs * 0.36, c, eps * 0.8);
    else outline(info, cs * 0.34, cs * 0.035, c, eps * 0.8);
  }
  // A curtain: three upright bands, until its colour has all gone.
  for (const [id, colour] of curtains) {
    if (!game.state.tints[colour]) continue;
    const info = cellInfo(id);
    const c = tint(info.face, AURORA[colour]);
    for (const k of [-1, 0, 1]) {
      const mid = info.C.clone().addScaledVector(info.v, k * cs * 0.28);
      strip(pos, col, mid.clone().addScaledVector(info.u, -cs * 0.42), mid.clone().addScaledVector(info.u, cs * 0.42), info.n, cs * 0.07, eps * 0.8, c);
    }
  }
  // The belt: a pale band with a mark every few cells, so it shows when it moves, and
  // a crate round each arrow riding it. Only on faces toward the camera; seen through
  // the cube the band would hide everything behind it.
  if (belt) {
    const L = belt.cells.length;
    const glow = game.beltHintUntil ? 0.5 + 0.5 * Math.sin(performance.now() / 90) : 0;
    const band = COLOR.belt.clone().lerp(COLOR.beltHint, glow);
    belt.cells.forEach((id, p) => {
      const info = cellInfo(id);
      if (!isFacing(info.face)) return;
      square(info, cs * 0.5, band, eps * 0.3);
      if ((p - game.state.shift + L) % 4 === 0) square(info, cs * 0.1, COLOR.beltMark, eps * 0.6);
      const o = ownerAt(game.puz, game.state, id);
      if (o >= 0 && game.arrows[o].state !== 'exiting') outline(info, cs * 0.34, cs * 0.04, COLOR.front, eps * 0.8);
    });
  }
  for (const ar of arrows) {
    // A vine: a green stem through its cells with a leaf on each.
    if (ar.machete) {
      if (game.state.occ[ar.gates[0]] < 0) continue;
      ar.gates.forEach((g, k) => {
        const info = cellInfo(g);
        if (k) strip(pos, col, world(cube.cells[ar.gates[k - 1]].p), info.C, info.n, cs * 0.06, eps * 0.8, tint(info.face, COLOR.vine));
        square(info, cs * 0.18, tint(info.face, COLOR.vineLeaf), eps * 0.9);
      });
      continue;
    }
    for (const g of ar.gates) {
      if (game.state.occ[g] < 0) continue;
      const info = cellInfo(g);
      square(info, cs * 0.38, tint(info.face, PALETTE[ar.hue % PALETTE.length]), eps * 0.8);
      square(info, cs * 0.12, COLOR.gateDot, eps * 1.2);
    }
  }
  setGeometry(decor, pos, col);
}

function redrawAll() {
  for (const ar of game.arrows) if (ar.state !== 'gone') drawArrow(ar);
  drawDecor();
}

function refreshFree() {
  for (const ar of game.arrows) ar.free = ar.state === 'idle' && canExit(game.puz, game.state, ar.index);
}

// ---------- levels

function load(params) {
  clearTimeout(game.solveTimer);
  for (const ar of game.arrows) {
    if (ar.state === 'gone') continue;
    scene.remove(ar.mesh);
    ar.mesh.geometry.dispose();
  }

  const t0 = performance.now();
  const cube = makeCube(params.N);
  const puz = generate(cube, params);
  const ms = performance.now() - t0;

  game.params = params;
  game.puz = puz;
  game.state = newState(puz);
  // The generator panel borrows the look of the world its gimmick comes from.
  const look = game.world === 'free' ? (params.gimmick ?? 'home') : game.world;
  applyTheme(themeOf(look));
  showScenery(look);
  game.cleared = false;
  game.autoSolved = false;
  game.remaining = puz.arrows.length;
  game.thick = thickness();
  game.arrows = puz.arrows.map((a, index) => ({
    ...a,
    index,
    state: 'idle',
    s: 0,
    rest: 0, // where along its track it sits; a bull moves on as it charges
    redUntil: 0,
    free: false,
    track: buildTrack(cube, a),
    mesh: new THREE.Mesh(new THREE.BufferGeometry(), arrowMat),
  }));
  for (const ar of game.arrows) {
    if (ar.slot >= 0 || ar.dial >= 0) seat(ar);
    scene.add(ar.mesh);
  }

  const res = solve(puz);
  const m = evaluate(puz, { seed: params.seed });
  const cells = puz.arrows.reduce((s, a) => s + a.cells.length, 0);
  $('stats').textContent =
    `화살표 ${puz.arrows.length}개 · 채움 ${Math.round((100 * cells) / cube.count)}% · ` +
    `${res.solvable ? '풀이 가능' : '풀 수 없음!'} · ${ms.toFixed(1)}ms\n` +
    `예상 오답 ${m.wrong.toFixed(1)}회` +
    (params.target !== undefined ? ` (목표 ${params.target})` : '') +
    ` · 회전 ${m.turns.toFixed(1)}회 · 풀이 단계 ${m.depth}\n` +
    `뺄 수 있는 비율 ${Math.round(m.freeRatio * 100)}%` +
    (params.hearts ? ` · 하트 ${params.hearts}개` : '');

  $('beltL').hidden = $('beltR').hidden = !puz.belt;
  game.stuck = false;
  game.tut = null;
  game.turn = null;
  game.beltHintUntil = 0;
  $('guide').hidden = true;
  game.heartsMax = game.hearts = params.hearts ?? 0;
  syncPanel(params);
  refreshFree();
  redrawAll();
  hud();
  drawHearts();
  $('clear').hidden = true;
}

function loadStage(world, stage) {
  const count = WORLDS[world].stages.length;
  game.world = game.lastWorld = world;
  // Stage 0 is the world's tutorial, which stage 1 opens instead until it is done.
  game.stage = Math.min(Math.max(stage, 0), count);
  if (game.stage === 1 && !tutorialDone(world)) game.stage = 0;
  if (!game.stage) return loadTutorial(world);
  // Stage puzzles are fixed; tools/bake-stages.mjs picks their seeds offline.
  load({ ...preset(world, game.stage), seed: STAGE_SEEDS[world][game.stage - 1].seed });
}

// Starts the stage on now over; a tutorial from its first step.
const restart = () => (game.tut ? loadTutorial(game.world) : load(game.params));

function loadCustom() {
  game.world = 'free';
  load(readPanel());
}

// ---------- play

function tap(ar) {
  if (!ar || ar.state === 'exiting' || ar.state === 'gone') return;
  // With no hearts left the stage is over.
  if (game.heartsMax && game.hearts <= 0) return;
  // A tutorial step about one arrow takes taps on that one only.
  if (!tutAllows(ar)) return nudgeGuide();
  const { puz, state } = game;
  const members = group(puz, ar.index).map((j) => game.arrows[j]);
  if (canExit(puz, state, ar.index)) {
    const catchK = caughtBy(puz, state, ar.index)?.k;
    // An eagle whose head is blocked leaves tail first.
    if (exitEnd(puz, state, ar.index)) {
      Object.assign(ar, { cells: [...ar.cells].reverse(), ray: ar.ray2, exitDir: ar.exitDir2, dir: ar.dir2, jumps: [] });
      ar.track = buildTrack(puz.cube, ar);
    }
    const out = remove(puz, state, ar.index).map((j) => game.arrows[j]);
    for (const a of out) {
      a.redUntil = 0;
      game.remaining--;
      if (members.includes(a)) {
        a.state = 'exiting';
      } else {
        // Caught by a lasso: it goes when the loop gets to it.
        a.state = 'caught';
        a.caughtBy = ar;
        a.catchAt = 2 * (catchK + 1);
      }
    }
    playLeave(out.length);
    refreshFree();
    // A lantern leaving lights up the arrows round it.
    if (game.showFree || out.some((a) => a.lantern)) redrawAll();
    if (out.some((a) => a.gates.length || a.tint >= 0 || a.slot >= 0 || a.disc)) drawDecor();
    hud();
    tutDid('leave', ar.index);
    // A clocked switch has moved on: the shadows, guards and dial arrows follow, and
    // if nothing can leave now the stage is stuck for good.
    if (clocked(puz)) {
      for (const a of game.arrows) {
        if (a.dial < 0 || (a.state !== 'idle' && a.state !== 'bumping')) continue;
        // A dial arrow still bouncing back from a bump stops short and turns with the rest.
        Object.assign(a, { state: 'idle', s: a.rest });
        seat(a);
      }
      refreshFree();
      redrawAll();
      const alive = game.arrows.filter((a) => a.state === 'idle' || a.state === 'bumping').map((a) => a.index);
      if (deadEnd(puz, state, alive)) game.solveTimer = setTimeout(showStuck, 700);
    }
    return;
  }
  // A bull with room ahead charges up to whatever is in its way.
  if (ar.run && ar.state === 'idle' && charge(puz, state, ar.index)) {
    ar.state = 'charging';
    ar.rest = ar.track.cellAt[state.ran[ar.index]];
    playLeave(1, 0.5);
    refreshFree();
    tutDid('charge', ar.index);
    return;
  }
  // Blocked: every member slides up to whatever is in its way and back. A pair
  // member that is itself free still flashes, so it is clear the pair is stuck. A tap
  // on an arrow still bouncing back from the last one does not count again.
  if (members.every((a) => a.state !== 'idle')) return;
  const now = performance.now();
  for (const a of members) {
    if (a.state !== 'idle') continue;
    const b = blockAt(puz, state, a.index);
    a.state = 'bumping';
    a.bumpDir = 1;
    a.bumpTo = a.rest + (b ? b.k * 2 + 0.6 : 0.6);
    a.redUntil = now + 1400;
  }
  playBump();
  loseHeart();
  tutDid('bump', ar.index);
  if (puz.belt && !game.arrows.some((a) => a.state === 'idle' && a.free)) game.beltHintUntil = now + 1600;
}

// A wrong tap costs a heart on stages that have them; with none left, the card says
// so and starts the stage over.
function loseHeart() {
  if (!game.heartsMax || game.cleared || game.stuck) return;
  game.hearts--;
  drawHearts(true);
  if (game.hearts <= 0) game.solveTimer = setTimeout(showNoHearts, 700);
}

// The hearts in the top bar: those left, then those lost, faded. `lost` shakes them.
function drawHearts(lost = false) {
  const el = $('hearts');
  el.hidden = !game.heartsMax;
  el.innerHTML = '♥'.repeat(Math.max(0, game.hearts)) + `<i>${'♥'.repeat(game.heartsMax - Math.max(0, game.hearts))}</i>`;
  el.setAttribute('aria-label', `하트 ${game.heartsMax}개 중 ${Math.max(0, game.hearts)}개 남음`);
  if (!lost) return;
  el.classList.remove('lost');
  void el.offsetWidth; // restart the shake
  el.classList.add('lost');
}

// A belt or dial arrow takes the cells and way out of wherever its belt or dial has
// carried it.
function seat(ar) {
  const { cells, dir, ray, exitDir, jumps } = pose(game.puz, game.state, ar.index);
  Object.assign(ar, { cells, dir, ray, exitDir, jumps });
  ar.track = buildTrack(game.puz.cube, ar);
}

// Open track cell j of shoji d.
function slideDoor(d, j) {
  if (game.state.doors[d] === j) return;
  game.state.doors[d] = j;
  refreshFree();
  redrawAll();
  tutDid('switch');
}

// Swing windmill m's sails round to the other axis.
function turnMill(m) {
  game.state.mills[m] = 1 - game.state.mills[m];
  refreshFree();
  redrawAll();
  tutDid('switch');
}

// What a tap at a screen point works, if it lands on a shoji track or a windmill hub:
// a function doing it, or null. Dials turn by themselves.
function switchAt(x, y) {
  const { doorOf, mills } = game.puz;
  const h = (doorOf?.size || mills) && hitFace(x, y);
  const N = game.puz.cube.N;
  if (!h || h.ib < 0 || h.ic < 0 || h.ib >= N || h.ic >= N) return null;
  const cell = cellId(h.n, h.a, h.b, h.c, h.ib, h.ic);
  const door = doorOf?.get(cell);
  if (door) return () => slideDoor(...door);
  const m = mills?.findIndex((ml) => ml.hub === cell) ?? -1;
  if (m >= 0) return () => turnMill(m);
  return null;
}

function moveBelt(d) {
  const { puz, state } = game;
  if (!puz.belt || game.arrows.some((a) => a.slot >= 0 && a.state === 'bumping')) return false;
  const L = puz.belt.cells.length;
  state.shift = (state.shift + d + L) % L;
  for (const ar of game.arrows) if (ar.slot >= 0 && ar.state === 'idle') seat(ar);
  game.beltHintUntil = 0;
  refreshFree();
  redrawAll();
  return true;
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

// Only the face toward the camera can be hit. Within it, take the nearest arrow cell
// up to 0.9 cells away so near-misses on thin lines still count. Gate tiles belong to
// their key but are not part of it, so they do not count.
// Where a screen point lands on the face toward the camera: the face normal n, the
// point in doubled grid coordinates d, the two in-face axes b and c and the grid
// cell (ib, ic) under it. null off the cube.
function hitFace(x, y) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  // Controls may have moved the camera since the last render.
  camera.updateMatrixWorld();
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(box)[0];
  if (!hit) return null;
  const { N } = game.puz.cube;
  const n = [hit.face.normal.x, hit.face.normal.y, hit.face.normal.z].map(Math.round);
  const s = (2 * N) / S;
  const d = [hit.point.x * s + N, hit.point.y * s + N, hit.point.z * s + N];
  const a = axisOf(n);
  const b = (a + 1) % 3;
  const c = (a + 2) % 3;
  return { n, d, a, b, c, ib: Math.floor(d[b] / 2), ic: Math.floor(d[c] / 2) };
}

const cellId = (n, a, b, c, i, j) => {
  const N = game.puz.cube.N;
  const p = [0, 0, 0];
  p[a] = n[a] > 0 ? 2 * N : 0;
  p[b] = 2 * i + 1;
  p[c] = 2 * j + 1;
  return game.puz.cube.index.get(p.join(','));
};

// How many screen pixels a cell spans with the camera `dist` from the cube's centre.
function cellPixels(dist = camera.position.length()) {
  const unit = renderer.domElement.clientHeight / 2 / (Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist);
  return (S / game.puz.cube.N) * unit;
}

// How bold to draw arrows: small cells on screen (a big cube on a phone) get bolder
// ones, up to 1.45 times, judged at the starting view.
const thickness = () => Math.min(1.45, Math.max(1, 22 / cellPixels(HOME_VIEW.length())));

function pick(x, y) {
  const h = hitFace(x, y);
  if (!h) return null;
  const { N } = game.puz.cube;
  const { n, d, a, b, c, ib, ic } = h;
  // A fingertip covers more than a small cell, so a tap reaches further then.
  const reach = Math.min(1.6, Math.max(0.9, 18 / cellPixels()));
  const R = Math.ceil(reach);
  let best = null;
  let bestD = reach;
  let lit = null; // the tutorial's lit arrow, taken over a nearer one when within reach
  for (let i = ib - R; i <= ib + R; i++) {
    for (let j = ic - R; j <= ic + R; j++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const cell = cellId(n, a, b, c, i, j);
      const p = game.puz.cube.cells[cell].p;
      const owner = ownerAt(game.puz, game.state, cell);
      if (owner < 0 || game.arrows[owner].gates.includes(cell)) continue;
      // What lies in the dark cannot be seen, so cannot be tapped there (lanterns can).
      if (!game.arrows[owner].lantern && darkCell(game.puz, game.state, cell)) continue;
      const dist = Math.hypot(d[b] - p[b], d[c] - p[c]) / 2;
      if (owner === game.tut?.focus && dist < reach) lit = game.arrows[owner];
      if (dist < bestD) {
        bestD = dist;
        best = game.arrows[owner];
      }
    }
  }
  return lit ?? best;
}

// Belt slot under a screen point, or undefined.
function beltSlotAt(x, y) {
  const h = game.puz.belt && hitFace(x, y);
  if (!h) return undefined;
  const N = game.puz.cube.N;
  if (h.ib < 0 || h.ic < 0 || h.ib >= N || h.ic >= N) return undefined;
  return game.puz.belt.index.get(cellId(h.n, h.a, h.b, h.c, h.ib, h.ic));
}

// Screen pixels for one belt step forward at slot p: how far a one-step drag goes.
// Measured between two slots on the same face, since a step over a cube edge looks
// much shorter on screen.
function beltStepOnScreen(p) {
  const { cells } = game.puz.belt;
  const L = cells.length;
  const C = game.puz.cube.cells;
  const r = renderer.domElement.getBoundingClientRect();
  camera.updateMatrixWorld();
  const px = (slot) => {
    const v = world(C[cells[(slot + L) % L]].p).project(camera);
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
  };
  const face = (slot) => game.puz.cube.faceOf(cells[(slot + L) % L]);
  const q = face(p + 1) === face(p) ? p : p - 1;
  const a = px(q);
  const b = px(q + 1);
  return { x: b.x - a.x, y: b.y - a.y };
}

// Dragging along the belt turns it, one step per cell dragged, and holds the cube
// still meanwhile. Registered as a capture listener so it runs before the controls
// start a rotation. A press on the belt that does not move is still a tap.
let beltDrag = null;
renderer.domElement.addEventListener(
  'pointerdown',
  (e) => {
    if (!e.isPrimary) return;
    const p = beltSlotAt(e.clientX, e.clientY);
    if (p === undefined || !tutSwitchOk()) return;
    controls.enabled = false;
    beltDrag = { x: e.clientX, y: e.clientY, v: beltStepOnScreen(p), steps: 0 };
    renderer.domElement.style.cursor = 'grabbing';
  },
  { capture: true },
);
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!e.isPrimary) return;
  if (!beltDrag) {
    if (!e.buttons) renderer.domElement.style.cursor = beltSlotAt(e.clientX, e.clientY) === undefined ? '' : 'grab';
    return;
  }
  const { v } = beltDrag;
  const len2 = v.x * v.x + v.y * v.y;
  if (len2 < 1) return;
  const want = Math.round(((e.clientX - beltDrag.x) * v.x + (e.clientY - beltDrag.y) * v.y) / len2);
  while (beltDrag.steps < want && moveBelt(1)) beltDrag.steps++;
  while (beltDrag.steps > want && moveBelt(-1)) beltDrag.steps--;
});
const endBeltDrag = () => {
  if (!beltDrag) return;
  const moved = beltDrag.steps !== 0;
  beltDrag = null;
  controls.enabled = true;
  renderer.domElement.style.cursor = 'grab';
  if (moved) tutDid('switch');
};
window.addEventListener('pointerup', endBeltDrag);
window.addEventListener('pointercancel', endBeltDrag);
// Sound may only start from a touch, and phones put it to sleep: every touch wakes it.
window.addEventListener('pointerdown', wakeAudio, true);

let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  game.turn = null;
  if (e.isPrimary) down = { x: e.clientX, y: e.clientY, t: performance.now(), multi: false };
  else if (down) down.multi = true;
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || !e.isPrimary) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  if (!down.multi && moved < 8 && performance.now() - down.t < 450) {
    const flip = switchAt(e.clientX, e.clientY);
    if (flip && !tutSwitchOk()) nudgeGuide();
    else if (flip) flip();
    else tap(pick(e.clientX, e.clientY));
  }
  down = null;
});

function autoSolve() {
  clearTimeout(game.solveTimer);
  const living = () => game.arrows.filter((ar) => ar.state === 'idle' || ar.state === 'bumping' || ar.state === 'charging').map((ar) => ar.index);
  // A clocked stage can only be finished the generator's way; if the player has
  // strayed from it, start over first.
  if (clocked(game.puz) && !solve(game.puz, game.state, living()).solvable) load(game.params);
  game.autoSolved = true;
  const alive = living();
  const steps = [];
  for (const l of solve(game.puz, game.state, alive).layers) {
    steps.push({ setting: l.setting });
    // A lasso's catch leaves with it, so it is not tapped on its own.
    for (const i of l.arrows) steps.push({ tap: i });
    // Tapping a bull that cannot leave yet makes it charge.
    for (const i of l.charged ?? []) steps.push({ tap: i });
  }
  const next = () => {
    const step = steps.shift();
    if (!step) return;
    const s = step.setting;
    if (s) {
      if ('shift' in s && game.state.shift !== s.shift) moveBelt(s.shift - game.state.shift);
      if ('doors' in s) s.doors.forEach((j, d) => slideDoor(d, j));
      if ('mills' in s) s.mills.forEach((w, m) => game.state.mills[m] !== w && turnMill(m));
    } else if (game.arrows[step.tap].state === 'idle') {
      tap(game.arrows[step.tap]);
    }
    game.solveTimer = setTimeout(next, s ? 0 : 70);
  };
  next();
}

// ---------- tutorial

// A world's tutorial (stage 0): a small puzzle (tools/bake-tutorials.mjs) played step by
// step (tutorial.js) with the guide box under the cube.
function loadTutorial(world) {
  load(tutorialParams(world, TUTORIAL_SEEDS[world]));
  // From the starting view, so the turns to what each step is about are easy to follow.
  camera.position.copy(HOME_VIEW);
  camera.up.set(0, 1, 0);
  game.tut = { steps: TUTORIALS[world].steps, k: 0, targets: [], focus: -1, hint: null, wait: false };
  $('guide').style.setProperty('--accent', themeOf(world).accent);
  tutStep(0);
}

// The arrows still on the cube.
const aliveNow = () =>
  new Set(game.arrows.filter((a) => a.state === 'idle' || a.state === 'bumping' || a.state === 'charging').map((a) => a.index));

// Starts tutorial step k: the guide says it, the arrow it is about lights up (or the
// switch move to make, or the arrow the belt is to bring round) and the cube turns to
// show it, or the tile the step talks about.
function tutStep(k) {
  const tut = game.tut;
  const step = tut.steps[k];
  const { puz, state } = game;
  Object.assign(tut, { k, focus: -1, hint: null, wait: false });
  if (step.find) tut.focus = findTarget(puz, state, aliveNow(), step.find, tut.targets);
  if (step.until === 'switch') {
    tut.hint = switchHint(puz, state, aliveNow(), tut.steps[k + 1].find, tut.targets);
    if (step.mark !== undefined) tut.focus = tut.targets[step.mark];
    // The belt glows until it moves.
    if (puz.belt) game.beltHintUntil = Infinity;
  }
  const cell = step.look ? lookCell(puz, step.look) : (tut.hint?.cell ?? (tut.focus >= 0 ? pose(puz, state, tut.focus).cells.at(-1) : undefined));
  if (cell !== undefined) turnTo(cell);
  $('guideStep').textContent = `튜토리얼 ${k + 1} / ${tut.steps.length}`;
  $('guideText').textContent = step.say;
  $('guideNext').hidden = step.until !== 'next';
  $('guide').hidden = false;
}

// Whether a tap on arrow ar counts now: in a step about one arrow only that one (or its
// pair) does, and none while the guide is only saying something or wants a switch
// moved. The last step (free play) and auto-solve take any.
function tutAllows(ar) {
  const tut = game.tut;
  if (!tut || game.autoSolved || game.cleared) return true;
  const step = tut.steps[tut.k];
  if (step.until === 'clear' && !tut.wait) return true;
  return !tut.wait && !!step.find && tut.focus >= 0 && group(game.puz, tut.focus).includes(ar.index);
}

// Whether the belt, doors and windmills may move now: in a step that asks for it and in
// the last one, so the arrow a step lights up stays the one it means.
function tutSwitchOk() {
  const tut = game.tut;
  if (!tut || game.autoSolved) return true;
  const { until } = tut.steps[tut.k];
  return !tut.wait && (until === 'switch' || until === 'clear');
}

// The player did something (`what` as a step's `until`, to arrow i): on to the next
// step if it is what this one waits for, after a moment to see what it did and once a
// bumped arrow is back (the belt cannot move before) or a bull has stopped. A switch
// step goes on once the move lets the next step find its arrow; until then it lights
// the move that would.
function tutDid(what, i = -1) {
  const tut = game.tut;
  if (!tut || tut.wait || game.autoSolved) return;
  const step = tut.steps[tut.k];
  if (step.until !== what) return;
  if (what === 'switch') {
    const next = tut.steps[tut.k + 1].find;
    if (findTarget(game.puz, game.state, aliveNow(), next, tut.targets) < 0) {
      tut.hint = switchHint(game.puz, game.state, aliveNow(), next, tut.targets);
      return;
    }
  } else if (tut.focus < 0 || !group(game.puz, tut.focus).includes(i)) {
    return;
  }
  tut.targets[tut.k] = what === 'switch' ? -1 : tut.focus;
  Object.assign(tut, { wait: true, focus: -1, hint: null });
  const next = () => {
    if (tut !== game.tut || game.stuck) return;
    if (game.arrows.some((a) => a.state === 'bumping' || a.state === 'charging')) return setTimeout(next, 100);
    tutStep(tut.k + 1);
  };
  setTimeout(next, 700);
}

// The guide box shakes: that is not what the step asks for.
function nudgeGuide() {
  const el = $('guide');
  if (el.hidden) return;
  el.classList.remove('nudge');
  void el.offsetWidth; // restart the shake
  el.classList.add('nudge');
}

// Turns the camera round the cube, keeping its distance, until cell's face is in plain
// view (unless it already is), the cube upright on screen where the view allows.
// frame() moves it there over a moment.
function turnTo(cell) {
  const n = new THREE.Vector3(...game.puz.cube.cells[cell].n);
  const from = camera.position.clone().normalize();
  if (from.dot(n) > 0.55) return;
  const side = from.clone().addScaledVector(n, -from.dot(n));
  if (side.lengthSq() < 1e-4) side.copy(camera.up).addScaledVector(n, -camera.up.dot(n));
  if (side.lengthSq() < 1e-4) side.set(n.y, n.z, n.x);
  const to = n.clone().addScaledVector(side.normalize(), 0.7).normalize();
  const sky = new THREE.Vector3(0, 1, 0);
  const upTo =
    Math.abs(to.dot(sky)) < 0.9
      ? sky.addScaledVector(to, -to.dot(sky)).normalize()
      : camera.up.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(from, to));
  game.turn = { from, to, up: camera.up.clone(), upTo, len: camera.position.length(), t0: performance.now() };
}

function turnCamera(now) {
  const t = game.turn;
  if (!t) return;
  const u = Math.min(1, (now - t.t0) / 700);
  const k = u * u * (3 - 2 * u);
  const along = (a, b) => new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(a, b), k);
  camera.position.copy(t.from).applyQuaternion(along(t.from, t.to)).multiplyScalar(t.len);
  camera.up.copy(t.up).applyQuaternion(along(t.up, t.upTo));
  if (u >= 1) game.turn = null;
}

// The tutorial's lit arrow, or the door or windmill hub to tap, glows and pulses.
function drawGlow(now) {
  const tut = game.tut;
  const ar = tut && tut.focus >= 0 ? game.arrows[tut.focus] : null;
  const lit = ar && (ar.state === 'idle' || ar.state === 'bumping' || ar.state === 'charging') ? ar : null;
  const cell = tut?.hint?.cell;
  glow.visible = !!lit || cell !== undefined;
  if (!glow.visible) return;
  const pulse = 0.5 + 0.5 * Math.sin(now / 170);
  glowMat.opacity = 0.3 + 0.45 * pulse;
  const pos = [];
  const col = [];
  if (lit) drawArrow(lit, { pos, col, widen: 2.6 + 0.9 * pulse });
  if (cell !== undefined) {
    const cs = S / game.puz.cube.N;
    const { p, n } = game.puz.cube.cells[cell];
    const t0 = game.puz.cube.tangents(cell)[0];
    const C = world(p);
    const u = new THREE.Vector3(...t0);
    const v = new THREE.Vector3(...cross(n, t0));
    const half = cs * (0.46 + 0.06 * pulse);
    const w = cs * 0.08;
    for (const [a, b] of [[u, v], [v, u]]) {
      for (const sgn of [1, -1]) {
        const mid = C.clone().addScaledVector(b, sgn * half);
        strip(pos, col, mid.clone().addScaledVector(a, -half - w), mid.clone().addScaledVector(a, half + w), n, w, S * 0.006, GLOW);
      }
    }
  }
  setGeometry(glow, pos, col);
}

// ---------- frame loop

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  turnCamera(now);
  controls.update();

  const m = facingMask();
  if (m !== facing) {
    facing = m;
    redrawAll();
  }
  fadeScenery();
  if (game.beltHintUntil) {
    if (now > game.beltHintUntil) game.beltHintUntil = 0;
    drawDecor();
  }

  for (const ar of game.arrows) {
    if (ar.state === 'caught') {
      if (ar.caughtBy.state === 'gone' || ar.caughtBy.s >= ar.catchAt) {
        ar.state = 'gone';
        scene.remove(ar.mesh);
        ar.mesh.geometry.dispose();
      }
    } else if (ar.state === 'exiting') {
      ar.s += SPEED * dt;
      if (ar.s >= ar.track.total - ar.track.len) {
        ar.state = 'gone';
        scene.remove(ar.mesh);
        ar.mesh.geometry.dispose();
      } else {
        drawArrow(ar);
      }
    } else if (ar.state === 'bumping') {
      ar.s += ar.bumpDir * SPEED * 0.6 * dt;
      if (ar.bumpDir > 0 && ar.s >= ar.bumpTo) {
        ar.s = ar.bumpTo;
        ar.bumpDir = -1;
      } else if (ar.bumpDir < 0 && ar.s <= ar.rest) {
        ar.s = ar.rest;
        ar.state = 'idle';
      }
      drawArrow(ar);
    } else if (ar.state === 'charging') {
      ar.s = Math.min(ar.rest, ar.s + SPEED * dt);
      if (ar.s >= ar.rest) {
        ar.state = 'idle';
        if (game.showFree) redrawAll();
      }
      drawArrow(ar);
    } else if (ar.state === 'idle' && ar.redUntil && now > ar.redUntil) {
      ar.redUntil = 0;
      drawArrow(ar);
    }
  }

  drawGlow(now);

  if (!game.cleared && game.remaining === 0 && game.arrows.every((a) => a.state === 'gone')) {
    game.cleared = true;
    showClear();
  }

  // Behind the loading and home screens nothing shows: no need to draw.
  if (game.screen === 'play') renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- UI

function hud() {
  // The world's flag, drawn again only when the world changes.
  const look = game.world === 'free' ? (game.params.gimmick ?? 'home') : game.world;
  if ($('worldFlag').dataset.world !== look) {
    $('worldFlag').dataset.world = look;
    $('worldFlag').innerHTML = worldIcon(look);
  }
  if (game.world === 'free') {
    $('world').textContent = `🧪 생성기${game.params.gimmick ? ` · ${WORLDS[game.params.gimmick].name}` : ''}`;
    $('stageLabel').textContent = `시드 ${game.params.seed}`;
  } else {
    $('world').textContent = WORLDS[game.world].name;
    $('stageLabel').textContent = game.stage ? `스테이지 ${game.stage} / ${WORLDS[game.world].stages.length} ▾` : '튜토리얼 ▾';
  }
  $('remain').textContent = game.remaining;
}

// A stage that is over without a clear: the same card says why and offers to start over.
function showOver(title, why) {
  if (game.cleared) return;
  game.stuck = true;
  $('clearTitle').textContent = title;
  $('clearStars').textContent = why;
  $('clearNext').textContent = '처음부터 다시';
  $('clear').hidden = false;
}
// A clocked stage where nothing left can leave.
const showStuck = () => showOver('막혔어요', '지금 상태로는 나갈 수 있는 화살표가 없어요');
// Every heart lost to wrong taps.
const showNoHearts = () => showOver('하트를 다 썼어요', '막힌 화살표를 누를 때마다 하트가 하나씩 줄어요');

// The clear card. A world stage cleared by hand is recorded; the card says where the
// world stands, and when a star was just earned.
function showClear() {
  if (game.tut) return showTutorialDone();
  const inWorld = game.world !== 'free';
  const w = WORLDS[game.world];
  const last = inWorld && game.stage === w.stages.length;
  let note = '';
  if (inWorld && game.autoSolved) {
    note = '자동 풀이로 깬 스테이지는 기록하지 않아요';
  } else if (inWorld) {
    const before = starsOf(progress, game.world);
    markCleared(progress, game.world, game.stage);
    const stars = starsOf(progress, game.world);
    note = `${w.tier ? `${starText(stars)} · ` : ''}${clearedCount(progress, game.world)} / ${w.stages.length} 클리어`;
    if (stars > before) note += ' · 별을 얻었어요!';
  }
  $('clearTitle').textContent = last ? `${w.name} 완료!` : '스테이지 클리어!';
  $('clearStars').textContent = note;
  $('clearNext').textContent = !inWorld ? '새 퍼즐' : last ? '처음부터' : '다음 스테이지';
  $('clear').hidden = false;
}

// A tutorial played through: noted on the device, so stage 1 opens from now on. A
// country's card says that hearts start at stage 6.
function showTutorialDone() {
  if (!game.autoSolved) markTutorialDone(game.world);
  $('guide').hidden = true;
  $('clearTitle').textContent = '튜토리얼 완료!';
  $('clearStars').textContent = WORLDS[game.world].tier
    ? '6스테이지부터는 하트가 있어요. 막힌 화살표를 누를 때마다 하나씩 줄고, 다 쓰면 처음부터 다시 해요.'
    : '';
  $('clearNext').textContent = '1스테이지 시작';
  $('clear').hidden = false;
}

// ---------- home screen and stage menu

// The home screen lists the worlds in groups by difficulty (home, then the countries
// by tier), each card with its flag, its stars and how many stages are cleared. A tier
// short of the stars it needs shows its lock but stays open while the game is being
// built. A world opens its stage menu, a sheet over the home screen or the game.
// Hovering a stage shows its expected wrong taps, for tuning.
const progress = loadProgress();
const COUNTRIES = Object.keys(WORLDS).filter((w) => WORLDS[w].tier);
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const GROUPS = ['입문', '쉬움', '보통', '어려움']; // by tier

function node(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// A flag (flags.js) in a span.
function flagOf(key) {
  const f = node('span', 'flag');
  f.innerHTML = worldIcon(key);
  return f;
}

// The home screen, with 이어서 하기 back into the stage the player left (if it is
// still going).
function showHome() {
  closeMenu();
  $('clear').hidden = true;
  game.screen = 'home';
  renderHome();
  $('home').hidden = false;
}

// Into the game: the home screen and the menu put away.
function play() {
  closeMenu();
  $('home').hidden = true;
  game.screen = 'play';
  game.playing = true;
}

function renderHome() {
  const total = totalStars(progress);
  $('homeStars').innerHTML = `<span class="stars">★</span> ${total} / ${COUNTRIES.length * STAR_AT.length}`;
  const body = $('homeBody');
  body.replaceChildren();
  if (game.playing && game.world !== 'free' && !game.cleared && !game.stuck) {
    const back = node('button', 'continue');
    const text = node('span', 'continue-text');
    text.append(node('b', '', '이어서 하기'), node('small', '', `${WORLDS[game.world].name} · ${game.stage ? `스테이지 ${game.stage}` : '튜토리얼'}`));
    back.append(flagOf(game.world), text);
    back.onclick = play;
    body.append(back);
  }
  for (const tier of [0, 1, 2, 3]) {
    const need = TIER_STARS[tier];
    const open = tierOpen(progress, tier);
    const head = node('div', 'group-head');
    const name = node('b', '', GROUPS[tier]);
    if (tier) name.append(node('span', 'stars', '★'.repeat(tier)));
    const note = !tier ? '기본 규칙 익히기' : !need ? '처음부터' : open ? `별 ${need}개 · 열림` : `🔒 별 ${need - total}개 더 · 개발 중에는 열려 있음`;
    head.append(name, node('span', 'note', note));
    const grid = node('div', 'world-grid');
    for (const key of Object.keys(WORLDS)) if (WORLDS[key].tier === tier) grid.append(worldCard(key, !open));
    body.append(head, grid);
  }
  body.scrollTop = 0;
}

function worldCard(key, locked = false) {
  const w = WORLDS[key];
  const [name, gimmick = '기믹 없음'] = w.name.split(' · ');
  const n = w.stages.length;
  const done = clearedCount(progress, key);
  const card = node('button', `world-card${game.playing && key === game.world ? ' current' : ''}${locked ? ' locked' : ''}`);
  card.style.setProperty('--accent', themeOf(key).accent);
  const main = node('span', 'wc-main');
  main.append(node('span', 'wc-name', name), node('span', 'wc-gimmick', gimmick));
  const foot = node('span', 'wc-foot');
  const bar = node('span', 'wc-bar');
  const fill = node('i');
  fill.style.width = `${(100 * done) / n}%`;
  bar.append(fill);
  foot.append(bar);
  if (w.tier) foot.append(node('span', 'stars', locked && !done ? '🔒' : starText(starsOf(progress, key))));
  foot.append(node('span', 'wc-count', `${done} / ${n}`));
  card.append(flagOf(key), main, foot);
  card.setAttribute('aria-label', `${w.name}, ${done}/${n} 클리어${w.tier ? `, 별 ${starsOf(progress, key)}개` : ''}${locked ? ', 잠김' : ''}`);
  card.onclick = () => openMenu(key);
  return card;
}

// World key's stage menu; from the generator, the home screen.
function openMenu(key = game.world) {
  if (key === 'free') return showHome();
  showStages(key);
  $('menu').hidden = false;
}

const closeMenu = () => ($('menu').hidden = true);

function showStages(key) {
  const w = WORLDS[key];
  const n = w.stages.length;
  $('menuFlag').innerHTML = worldIcon(key);
  $('menuTitle').textContent = w.name;
  $('menuSub').textContent = `${w.tier ? `${starText(starsOf(progress, key))} · ` : ''}${clearedCount(progress, key)} / ${n} 클리어`;
  const body = $('menuBody');
  body.style.setProperty('--accent', themeOf(key).accent);
  const about = node('p', 'about', w.about);
  if (w.tier) about.textContent += ` · ${STAR_AT.join(', ')}스테이지까지 깨면 별을 하나씩 얻어요`;
  const grid = node('div', 'stage-grid');
  for (let s = 1; s <= n; s++) {
    const done = isCleared(progress, key, s);
    const here = key === game.world && s === game.stage;
    const b = node('button', `stage${done ? ' cleared' : ''}${here ? ' current' : ''}`, s);
    if (w.tier && STAR_AT.includes(s)) b.append(node('span', 'mark', '★'));
    if (DEV) b.title = `예상 오답 ${STAGE_SEEDS[key][s - 1].wrong}회`;
    b.setAttribute('aria-label', `스테이지 ${s}${done ? ', 클리어' : ''}${here ? ', 지금 스테이지' : ''}`);
    b.onclick = () => {
      play();
      loadStage(key, s);
    };
    grid.append(b);
  }
  // The tutorial comes before stage 1, and can be played again any time.
  const done = tutorialDone(key);
  const tutorial = node('button', `tutorial-btn${done ? ' done' : ''}${key === game.world && game.stage === 0 ? ' current' : ''}`, done ? '튜토리얼 ✓' : '튜토리얼');
  tutorial.setAttribute('aria-label', `튜토리얼${done ? ', 끝냄' : ''}`);
  tutorial.onclick = () => {
    play();
    loadStage(key, 0);
  };
  body.replaceChildren(about, tutorial, grid);
  body.scrollTop = 0;
  // On a long list, bring the current stage into view.
  grid.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
}

const SLIDERS = ['N', 'minLen', 'maxLen', 'straight', 'fill', 'block', 'deep', 'wrap', 'long', 'amount'];
const PERCENT = ['straight', 'fill', 'block', 'deep', 'wrap', 'long', 'amount'];

function readPanel() {
  const v = (id) => Number($(id).value);
  const minLen = v('minLen');
  return {
    N: v('N'),
    minLen,
    maxLen: Math.max(minLen, v('maxLen')),
    straight: v('straight') / 100,
    fill: v('fill') / 100,
    block: v('block') / 100,
    deep: v('deep') / 100,
    wrap: v('wrap') / 100,
    long: v('long') / 100,
    gimmick: $('gimmick').value || null,
    amount: v('amount') / 100,
    seed: v('seed') || 1,
  };
}

function syncPanel(p) {
  $('N').value = p.N;
  $('minLen').value = p.minLen;
  $('maxLen').value = p.maxLen;
  $('straight').value = Math.round(p.straight * 100);
  $('fill').value = Math.round(p.fill * 100);
  $('block').value = Math.round((p.block ?? 0) * 100);
  $('deep').value = Math.round((p.deep ?? 0) * 100);
  $('wrap').value = Math.round((p.wrap ?? 0) * 100);
  $('long').value = Math.round((p.long ?? 0) * 100);
  $('gimmick').value = p.gimmick ?? '';
  $('amount').value = Math.round((p.amount ?? 0.5) * 100);
  $('seed').value = p.seed;
  showSliderValues();
}

function showSliderValues() {
  for (const id of SLIDERS) $(`o_${id}`).textContent = $(id).value + (PERCENT.includes(id) ? '%' : '');
}

for (const id of SLIDERS) $(id).addEventListener('input', showSliderValues);
$('gimmick').onchange = () => {
  // Coming from a home stage, start the gimmick on a mid-sized cube rather than
  // whatever that stage happened to use.
  if (game.world !== 'free') syncPanel({ ...GIMMICK_DEFAULTS, gimmick: $('gimmick').value || null, seed: 1 });
  loadCustom();
};
$('gen').onclick = loadCustom;
$('dice').onclick = () => {
  $('seed').value = 1 + Math.floor(Math.random() * 999999);
  loadCustom();
};
$('showFree').onchange = (e) => {
  game.showFree = e.target.checked;
  refreshFree();
  redrawAll();
};
// The belt buttons turn it one step, when the tutorial lets switches move.
const beltButton = (d) => () => {
  if (!tutSwitchOk()) return nudgeGuide();
  if (moveBelt(d)) tutDid('switch');
};
$('beltL').onclick = beltButton(-1);
$('beltR').onclick = beltButton(1);
// ◀ ▶ step through the current world; from the generator they return to the last world.
$('prev').onclick = () => loadStage(game.lastWorld, game.world === 'free' ? game.stage : game.stage - 1);
$('next').onclick = () => loadStage(game.lastWorld, game.world === 'free' ? game.stage : game.stage + 1);
$('retry').onclick = restart;
// The guide box: 다음 on a step that only says something, and 건너뛰기, which counts the
// tutorial as done and goes to stage 1.
$('guideNext').onclick = () => {
  const tut = game.tut;
  if (!tut || tut.wait || tut.steps[tut.k].until !== 'next') return;
  tut.targets[tut.k] = -1;
  tutStep(tut.k + 1);
};
$('guideSkip').onclick = () => {
  markTutorialDone(game.world);
  loadStage(game.world, 1);
};
$('solve').onclick = autoSolve;
$('panelToggle').onclick = () => ($('panel').hidden = !$('panel').hidden);
$('worldBtn').onclick = () => openMenu();
$('homeBtn').onclick = showHome;
$('menuClose').onclick = closeMenu;
$('menuBack').onclick = showHome;
// A tap on the dimmed backdrop, or Escape, closes the menu.
$('menu').onclick = (e) => e.target === $('menu') && closeMenu();
addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

// The generator panel's gimmick list, from the worlds (by tier).
for (const key of [...COUNTRIES].sort((a, b) => WORLDS[a].tier - WORLDS[b].tier)) {
  $('gimmick').append(new Option(`${WORLDS[key].name} — ${WORLDS[key].about}`, key));
}
$('clearNext').onclick = () => {
  if (game.stuck) {
    restart();
  } else if (game.world === 'free') {
    $('seed').value = Number($('seed').value) + 1;
    loadCustom();
  } else {
    loadStage(game.world, game.stage === WORLDS[game.world].stages.length ? 1 : game.stage + 1);
  }
};

const zoomBy = (f) => {
  const len = THREE.MathUtils.clamp(camera.position.length() * f, controls.minDistance, controls.maxDistance);
  camera.position.setLength(len);
};
$('zoomIn').onclick = () => zoomBy(0.85);
$('zoomOut').onclick = () => zoomBy(1 / 0.85);
$('resetView').onclick = () => {
  camera.position.copy(HOME_VIEW);
  camera.up.set(0, 1, 0);
};
// Sound effects on or off, in the game and on the home screen (sound.js keeps the
// choice on the device).
const showSound = () => {
  for (const id of ['sound', 'homeSound']) {
    $(id).textContent = isMuted() ? '🔇' : '🔊';
    $(id).title = isMuted() ? '효과음 켜기' : '효과음 끄기';
  }
};
showSound();
$('sound').onclick = $('homeSound').onclick = () => {
  setMuted(!isMuted());
  showSound();
};

// The loading screen's 눌러서 시작 (a tap anywhere on it, once shown) opens the home
// screen. The tap also lets the browser play sound from then on.
$('splash').onclick = () => {
  if ($('start').hidden || $('splash').classList.contains('gone')) return;
  $('splash').classList.add('gone');
  setTimeout(() => ($('splash').hidden = true), 450);
  showHome();
};

function resize() {
  const el = $('stage');
  const w = el.clientWidth;
  const h = el.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // Keep the whole cube in view on tall phone screens by widening the vertical FOV.
  const half = THREE.MathUtils.degToRad(19);
  camera.fov = w < h ? Math.min(75, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / camera.aspect))) : 38;
  camera.updateProjectionMatrix();
  controls.handleResize();
  showScenery();
  if (game.puz && Math.abs(thickness() - game.thick) > 0.01) {
    game.thick = thickness();
    redrawAll();
  }
}
addEventListener('resize', resize);
resize();

// Handle for poking at the game from the browser console.
window.arrowCube = { game, pick, tap, camera, box, raycaster };

loadStage('home', 1);
requestAnimationFrame(frame);
// Ready: the loading screen (index.html) fills its bar and shows 눌러서 시작.
window.splash?.ready();
