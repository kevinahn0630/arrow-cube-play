import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { generate, add, scale, dot, cross, axisOf } from './cube.js';
import { SHAPES, surfaceOf, fitSolid, START_VIEW } from './shapes.js';
import { LANDMARKS } from './landmarks.js';
import { newState, blockAt, group, canExit, remove, solve, ownerAt, pose, caughtBy, cutBy, darkCell, charge, clocked, deadEnd } from './rules.js';
import { evaluate } from './difficulty.js';
import { WORLDS, preset, STAR_AT, TIER_STARS } from './stages.js';
import { loadProgress, markCleared, isCleared, clearedCount, starsOf, totalStars, tierOpen, tutorialDone, markTutorialDone, loadWallet, saveWallet } from './progress.js';
import { coinsFor, PRICE, PACKS, NO_ADS, AD_EVERY, AD_GAP, GIFTS, giftDay, giftReady, CLIMB_STEP, climbPoints, climbRewards, hintFor, erasable } from './economy.js';
import { rewarded, interstitial, sinceAd, native } from './ads.js';
import { canSell, startBilling, buyProduct, priceOf } from './billing.js';
import { ICON, rewardIcon } from './icons.js';
import { climbArt, climbTrail, CLIMB_W } from './climb.js';
import { calm, spot, replay, countUp, fly, confetti, sparkle, heartBreak } from './fx.js';
import { STAGE_SEEDS } from './stage-seeds.js';
import { TUTORIALS, tutorialParams, findTarget, lookCell } from './tutorial.js';
import { TUTORIAL_SEEDS } from './tutorial-seeds.js';
import { worldIcon } from './flags.js';
import { themeOf } from './themes.js';
import { scenery } from './scenery.js';
import { wakeAudio, playLeave, playBump, isMuted, setMuted } from './sound.js';
import { DEV } from './build.js';

const S = 4; // cube edge length in world units (solids are scaled to the same size: fitTo)
const BOLD = 1.5; // how thick arrows and their heads are drawn, against the first design
const SPEED = 56; // doubled grid units per second (28 cells/s)
// Colours of the current world's theme (themes.js), set by applyTheme.
let COLOR;
let PALETTE; // key/gate and pair colours, one per link
let GUARD; // Big Ben's two guard colours
let AURORA; // aurora arrows and their curtains
let PANEL; // Mondrian panels' fills
let ORN; // each country's marks on its gimmick arrows (themes.js `ornament`)
const WHITE = new THREE.Color('#ffffff');
const GLOW = new THREE.Color('#ffc21a'); // the tutorial's lit arrow
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
const HOME_VIEW = new THREE.Vector3(...START_VIEW);
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
// On a solid whose blocks hide some of its faces from some sides, what lies behind the
// glass nearest the camera draws as a ghost, as the back of the cube does: glassDepth
// puts that glass in the depth buffer first, then every arrow (and the decor) is drawn
// once more in the ghost colour where it lies behind it (arrowMesh) and the edges
// there fainter, and then as usual where it does not. The cube and the box shapes hide
// no face and skip all this.
const glassDepth = new THREE.Mesh(
  box.geometry,
  new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
);
glassDepth.renderOrder = -2;
const ghostMat = new THREE.MeshBasicMaterial({ depthFunc: THREE.GreaterDepth, depthWrite: false, side: THREE.DoubleSide });
// Blended like the edges in front, yet drawn before the arrows (so not `transparent`).
const edgesBehind = new THREE.LineSegments(
  edges.geometry,
  new THREE.LineBasicMaterial({
    blending: THREE.CustomBlending,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    depthFunc: THREE.GreaterDepth,
    depthWrite: false,
  }),
);
edgesBehind.renderOrder = -1;
let hiding = false; // the puzzle's surface has faces that can hide others

// How the surface sits in the scene (shapes.js fitSolid, scaled to the cube's S): `mid`
// is its centre in doubled grid coordinates and `k` world units per doubled grid unit,
// so a cell is 2k across (S/N on the cube).
let fit = { mid: [0, 0, 0], k: 1 };
function fitTo(cube) {
  const { mid, k } = fitSolid(cube);
  fit = { mid, k: k * S };
}
const cellSize = () => 2 * fit.k;

// The glass of the puzzle's surface: each open block face as two triangles (counter-
// clockwise seen from outside), and its edges wherever the surface bends, at an outer
// edge or an inner corner.
function shapeGlass(cube) {
  const { voxels, u } = cube;
  const solid = new Set(voxels.map((v) => v.join(',')));
  const has = (v) => solid.has(v.join(','));
  const m = 2 * u;
  const tris = [];
  const lines = [];
  const drawn = new Set();
  for (const v of voxels) {
    for (let a = 0; a < 3; a++) {
      for (const s of [1, -1]) {
        const n = [0, 0, 0];
        n[a] = s;
        if (has(add(v, n))) continue;
        const b = (a + 1) % 3;
        const c = (a + 2) % 3;
        const at = (i, j) => {
          const p = [0, 0, 0];
          p[a] = m * (v[a] + (s > 0 ? 1 : 0));
          p[b] = m * (v[b] + i);
          p[c] = m * (v[c] + j);
          return p;
        };
        const q = s > 0 ? [at(0, 0), at(1, 0), at(1, 1), at(0, 1)] : [at(0, 0), at(0, 1), at(1, 1), at(1, 0)];
        tris.push(...[q[0], q[1], q[2], q[0], q[2], q[3]].map(world));
        for (const [axis, side, p, r] of [[b, 1, at(1, 0), at(1, 1)], [b, -1, at(0, 0), at(0, 1)], [c, 1, at(0, 1), at(1, 1)], [c, -1, at(0, 0), at(1, 0)]]) {
          const t = [0, 0, 0];
          t[axis] = side;
          if (has(add(v, t)) && !has(add(add(v, t), n))) continue;
          const id = [p.join(), r.join()].sort().join(' ');
          if (drawn.has(id)) continue;
          drawn.add(id);
          lines.push(world(p), world(r));
        }
      }
    }
  }
  box.geometry.dispose();
  box.geometry = glassDepth.geometry = new THREE.BufferGeometry().setFromPoints(tris);
  edges.geometry.dispose();
  edges.geometry = edgesBehind.geometry = new THREE.BufferGeometry().setFromPoints(lines);
  hiding = !cube.convex;
  for (const o of [glassDepth, edgesBehind]) {
    if (hiding) scene.add(o);
    else scene.remove(o);
  }
  decor.userData.ghost.visible = hiding;
}

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
    ice: c(t.ice),
    iceBlock: c(t.iceBlock),
    iceEdge: c(t.iceEdge),
    samurai: c(t.samurai),

    bull: c(t.bull),
    dialRing: c(t.dialRing),
    dialHub: c(t.dialHub),
    dialArrow: c(t.dialArrow),
    diag: c(t.diag),
    wall: c(t.wall),
    panelLine: c(t.panelLine),
    panelOpen: c(t.panelOpen),
  };
  PALETTE = t.links.map(c);
  GUARD = t.guards.map(c);
  AURORA = t.aurora.map(c);
  PANEL = t.panels.map(c);
  ORN = Object.fromEntries(Object.entries(t.ornament).map(([k, v]) => [k, Array.isArray(v) ? v.map(c) : c(v)]));
  document.body.style.background = t.background;
  nightSky = darkTop(t.background);
  styleBars();
  box.material.color.set(t.box.face);
  box.material.opacity = t.box.faceOpacity;
  edges.material.color.set(t.box.edge);
  edgesBehind.material.color.set(t.box.edge);
  edgesBehind.material.opacity = edges.material.opacity;
  ghostMat.color.copy(COLOR.back);
}

// In the app, Android draws the page under the status bar, so its icons sit on the sky:
// dark on the pastel skies and on the loading and home screens, light on the two night
// skies. In a browser there is no Capacitor and nothing to do.
let nightSky = false;
function darkTop(sky) {
  const top = /#(\w\w)(\w\w)(\w\w)/.exec(sky);
  if (!top) return false;
  const [r, g, b] = top.slice(1).map((hex) => parseInt(hex, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}
function styleBars() {
  const style = game.screen === 'play' && nightSky ? 'DARK' : 'LIGHT';
  window.Capacitor?.nativePromise?.('SystemBars', 'setStyle', { style }).catch(() => {});
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
// A mesh drawn like an arrow, with its ghost (see glassDepth): a child sharing its
// geometry, which setGeometry swaps along with it.
function arrowMesh() {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), arrowMat);
  const ghost = new THREE.Mesh(mesh.geometry, ghostMat);
  ghost.renderOrder = -1;
  ghost.visible = hiding;
  mesh.add(ghost);
  mesh.userData.ghost = ghost;
  return mesh;
}
const decor = arrowMesh(); // mirrors, guards, gates
scene.add(decor);
// The tutorial's lit arrow: a pulsing glow round it.
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
const glow = new THREE.Mesh(new THREE.BufferGeometry(), glowMat);
scene.add(glow);

// The faces of the puzzle's surface (cube.js faceOf; on the cube +x, -x, +y, -y, +z,
// -z) turned toward the camera, one entry each; things on the others draw as
// see-through ghosts. Until a puzzle is shown, every face counts as facing.
let facing = new Uint8Array(0);
const isFacing = (face) => face < 0 || facing[face] !== 0;

// Works `facing` out again; whether any face turned toward or away from the camera.
function turnFaces() {
  const planes = game.puz?.cube.planes ?? [];
  let changed = facing.length !== planes.length;
  if (changed) facing = new Uint8Array(planes.length);
  planes.forEach(({ n, at }, i) => {
    const a = axisOf(n);
    const v = n[a] * (camera.position.getComponent(a) - (at - fit.mid[a]) * fit.k) > 0 ? 1 : 0;
    if (facing[i] !== v) {
      facing[i] = v;
      changed = true;
    }
  });
  return changed;
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

  fell: [], // per Berlin wall, when it fell (0 while it stands)
  pieces: [], // what samurais have cut off, still to be shown dropping away
  falling: false, // a wall is crumbling or a cut piece dropping: the decor is drawn again every frame
  autoSolved: false, // the auto-solve button was used on this stage: clearing it is not recorded
  thick: 1, // arrows drawn this much bolder where cells are small on screen (cellPixels)
  stuck: false, // the stage is over without a clear (a clocked dead end, or no hearts left); the card starts it over
  heartsMax: 0, // wrong taps this stage forgives (country stages from 6 on); 0: no limit
  hearts: 0, // of those, how many are left
  // The tutorial being played (stage 0 of a world): its steps, the step on now (k), the
  // arrow each step was about (targets), the arrow lit now (focus, -1 for none) and
  // whether it is between steps (wait).
  tut: null,
  turn: null, // the camera turning to show something: { from, to, up, upTo, len, t0 }
  screen: 'splash', // what is in front: the loading screen, the home screen or the game ('play')
  playing: false, // a stage has been picked since the game started (the home screen can go back to it)
  hint: -1, // the arrow a hint lit (economy.js hintFor), until it leaves; -1 for none
  adHint: false, // this stage's one hint for an ad has been taken
  erasing: false, // the eraser is out: the next tap on an arrow takes it off the cube
  counts: false, // a country stage (not a tutorial): it scores up the climb and counts toward the next full-screen ad
  moved: false, // an arrow has been tapped or erased: giving the stage up now breaks the clears in a row
  misses: 0, // wrong taps (the hearts lost, where a stage has them)
  adWatched: false, // the clear card's ad was watched: no full-screen ad on the way to the next stage
};

function world(p) {
  const { mid, k } = fit;
  return new THREE.Vector3((p[0] - mid[0]) * k, (p[1] - mid[1]) * k, (p[2] - mid[2]) * k);
}

// Where a cell of the cube shows on the screen, in CSS pixels (for fx.js effects).
function screenOf(cell) {
  const v = world(game.puz.cube.cells[cell].p).project(camera);
  const r = renderer.domElement.getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
}
// Where the effect of a tap on an arrow goes: where the finger touched, or for a tap from
// code, the given cell of the arrow if its face is toward the camera (none otherwise).
let touch = { x: 0, y: 0, t: -1e9 }; // the last tap on the cube
function tapSpot(cell) {
  if (performance.now() - touch.t < 150) return touch;
  const [x, y, z] = game.puz.cube.cells[cell].n;
  return camera.position.dot(new THREE.Vector3(x, y, z)) > S / 2 ? screenOf(cell) : null;
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
  if (mesh.userData.ghost) mesh.userData.ghost.geometry = g;
}

// Where a line over the surface turns from cell a's face onto cell b's: the outer edge
// between them, or the inner corner at the foot of the wall b is on.
const turnPoint = (a, b) => add(a.p, scale(b.n, dot(b.p, b.n) < dot(a.p, b.n) ? -1 : 1));
const bent = (a, b) => dot(a.n, b.n) !== 1;

// Path an arrow travels when it leaves: its own cells tail→head, its exit path
// (bending at mirrors), then straight off where the face ends (on a solid, at an inner
// corner, through the wall). Points are doubled grid coordinates; each segment
// remembers the face it lies on (cube.js faceOf; -1 once off the surface).
function buildTrack(cube, ar) {
  const C = cube.cells;
  const { cells } = ar;
  const head = C[cells.at(-1)];
  const pts = [{ p: C[cells[0]].p, cell: true }];
  const segs = [];
  for (let i = 1; i < cells.length; i++) {
    const a = C[cells[i - 1]];
    const b = C[cells[i]];
    if (bent(a, b)) {
      pts.push({ p: turnPoint(a, b), cell: false });
      segs.push({ face: cube.faceOf(a.id), n: a.n });
    }
    pts.push({ p: b.p, cell: true });
    segs.push({ face: cube.faceOf(b.id), n: b.n });
  }
  const headAt = pts.length - 1;
  let prev = head;
  ar.ray.forEach((id, k) => {
    const b = C[id];
    if (bent(prev, b)) {
      pts.push({ p: turnPoint(prev, b), cell: false });
      segs.push({ face: cube.faceOf(prev.id), n: prev.n });
    }
    pts.push({ p: b.p, cell: true });
    // The stretch between two tunnel mouths runs underground and is not drawn.
    segs.push({ face: cube.faceOf(b.id), n: b.n, hidden: ar.jumps.includes(k) });
    prev = b;
  });
  const last = prev.p;
  pts.push({ p: add(last, ar.exitDir), cell: false });
  segs.push({ face: cube.faceOf(prev.id), n: prev.n });
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
  if (ar.samurai) return COLOR.samurai;
  if (ar.knot >= 0) return COLOR.knot;
  if (ar.boom) return COLOR.boomerang;
  if (ar.machete) return COLOR.machete;
  if (ar.lantern) return COLOR.lantern;
  if (ar.ice) return COLOR.ice;
  if (ar.run) return COLOR.bull;
  if (ar.dial >= 0) return COLOR.dialArrow;
  if (ar.diag) return COLOR.diag;
  return ar.hue >= 0 ? PALETTE[ar.hue % PALETTE.length] : COLOR.front;
}

// With `lit`, draws the tutorial's glow round the arrow instead: the same shape,
// lit.widen times as wide and just under it, added to lit.pos / lit.col.
function drawArrow(ar, lit = null) {
  const cs = cellSize();
  // Same stroke on every grid size; only very dense grids go thinner.
  // Lines and heads half as thick again as at first (BOLD), bolder still on small cells.
  const line = Math.min(cs * 0.085 * BOLD * game.thick, 0.04 * BOLD);
  const hw = lit ? line * lit.widen : line;
  const eps = S * (lit ? 0.0016 : 0.004);
  const pos = lit?.pos ?? [];
  const col = lit?.col ?? [];

  // Nothing but lanterns shows where it lies in the dark. Whether point p (doubled
  // coordinates) on track segment sg is in the dark:
  const { size, u } = game.puz.cube;
  const hide = !!game.puz.darkOf && !ar.lantern;
  const inShadow = (p, sg) => {
    if (!hide || sg.face < 0) return false;
    const a = axisOf(sg.n);
    const q = p.map((v, k) => (k === a ? game.puz.cube.planes[sg.face].at : Math.min(2 * u * size[k] - 1, Math.max(1, 2 * Math.floor(v / 2) + 1))));
    return darkCell(game.puz, game.state, game.puz.cube.index.get(q.join(',')));
  };
  const tr = ar.track;
  const { out, segIdx } = slice(tr, ar.s, ar.s + tr.len);
  // No wider than a cell, so heads side by side do not run into each other.
  const a = Math.min(cs * (0.32 + 0.13 * (game.thick - 1)) * BOLD, cs * 0.5, line * 4.5) * (lit ? 1 + 0.3 * (lit.widen - 1) : 1);
  // The line stops a little inside its head, where the triangle is wider than the
  // line, so the line's end never shows past the head's sides however bold arrows are
  // drawn. The track counts 2 to a cell.
  const toTrack = 2 / cs;
  const from = ar.s;
  const to = ar.s + tr.len - 0.3 * a * toTrack;
  const shaft = to > from ? slice(tr, from, to) : { out: [], segIdx: [] };
  for (let i = 0; i < shaft.segIdx.length; i++) {
    const sg = tr.segs[shaft.segIdx[i]];
    const color = lit ? GLOW : colorOf(ar, sg.face);
    if (sg.hidden) continue;
    const A = shaft.out[i].p;
    const B = shaft.out[i + 1].p;
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
      const capP = j === 0 && shaft.out[i].cap ? hw : 0;
      const capQ = j + 2 === ts.length && shaft.out[i + 1].cap ? hw : 0;
      strip(pos, col, world(at(ts[j])), world(at(ts[j + 1])), sg.n, hw, eps, color, capP, capQ);
    }
  }
  // Underground in a tunnel, or in the dark: no head either.
  const lastSeg = tr.segs[segIdx.at(-1)];
  const headColor = lit ? GLOW : colorOf(ar, lastSeg.face);
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
  // Some countries' gimmick arrows have a head of their own (drawMarks).
  if (lit || !(ar.dial >= 0 || ar.machete || ar.lantern || ar.diag || ar.samurai)) triangle(H, d, side);
  // A bull's horns, ivory on its black, growing out of its head.
  if (ar.run) {
    const horn = lit ? headColor : isFacing(lastSeg.face) ? ORN.horn : COLOR.back;
    for (const sgn of [1, -1]) {
      const root = H.clone().addScaledVector(side, sgn * a * 0.36).addScaledVector(d, -a * 0.3).add(o);
      const tip = H.clone().addScaledVector(side, sgn * a * 0.95).addScaledVector(d, a * 0.4).add(o);
      strip(pos, col, root, tip, tr.headN, hw * 0.55, eps * 0.1, horn);
    }
  }
  // A lasso: a lariat's loop held out in front of the head.
  if (ar.lasso && ar.state !== 'exiting') {
    const C = H.clone().addScaledVector(d, a * 1.25).add(o);
    for (let k = 0; k < 12; k++) {
      const t0 = (k / 12) * Math.PI * 2;
      const t1 = ((k + 1) / 12) * Math.PI * 2;
      const P = C.clone().addScaledVector(d, Math.cos(t0) * a * 0.64).addScaledVector(side, Math.sin(t0) * a * 0.48);
      const Q = C.clone().addScaledVector(d, Math.cos(t1) * a * 0.64).addScaledVector(side, Math.sin(t1) * a * 0.48);
      strip(pos, col, P, Q, tr.headN, hw * 0.6, 0, headColor, hw * 0.2, hw * 0.2);
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
  if (lit) return;
  drawMarks(ar, { pos, col, eps, a, hw, H, d, side, tr, out, segIdx, shaft, headColor, headFace: lastSeg.face });
  setGeometry(ar.mesh, pos, col);
}

// ---------- country marks

// Points round an ellipse at (cx, cy) with radii rx and ry, turned by `turn` radians.
const oval = (cx, cy, rx, ry = rx, turn = 0, n = 12) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI;
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    return [cx + x * Math.cos(turn) - y * Math.sin(turn), cy + x * Math.sin(turn) + y * Math.cos(turn)];
  });
// Half a disc: its rim from angle t0 to t1, closed along the chord.
const halfDisc = (cx, cy, r, t0, n = 8) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = t0 + (Math.PI * i) / n;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  });
// Points along a cubic Bézier curve, its last point left for the next curve.
const cubic = (p0, p1, p2, p3, n = 6) =>
  Array.from({ length: n }, (_, i) => {
    const t = i / n;
    const s = 1 - t;
    return [0, 1].map((k) => s * s * s * p0[k] + 3 * s * s * t * p1[k] + 3 * s * t * t * p2[k] + t * t * t * p3[k]);
  });
// 인도's paisley head: a teardrop pointing along +x, in units of the head size.
const PAISLEY = [
  ...cubic([0.62, 0], [0.25, -0.1], [0.05, -0.48], [-0.25, -0.42]),
  ...cubic([-0.25, -0.42], [-0.62, -0.36], [-0.62, 0.36], [-0.25, 0.42]),
  ...cubic([-0.25, 0.42], [0.05, 0.48], [0.25, 0.1], [0.62, 0]),
];
// 캐나다's maple leaf, the outline of the flag icon (flags.js) on a 100 box, turned so
// its tip points along +x, 1.25 head sizes tall, its stem end at x = -0.56.
const MAPLE = [[50, 2], [57, 16], [65, 12], [61, 38], [75, 24], [78, 33], [94, 30], [88, 47], [96, 51], [70, 72], [74, 82], [52, 79], [53, 98], [47, 98], [48, 79], [26, 82], [30, 72], [4, 51], [12, 47], [6, 30], [22, 33], [25, 24], [39, 38], [35, 12], [43, 16]].map(([x, y]) => [((55 - y) * 1.25) / 96, ((x - 50) * 1.25) / 96]);

// Each country's mark on its gimmick arrows (colours in themes.js `ornament`), over
// the line and head drawArrow has drawn, or in place of its head. Sizes are in units
// of the head size `a`, so they grow with bolder arrows; a mark on a far face shows
// white like the arrow.
function drawMarks(ar, { pos, col, eps, a, hw, H, d, side, tr, out, segIdx, shaft, headColor, headFace }) {
  const tone = (c, face) => (isFacing(face) ? c : COLOR.back);
  const V = (arr) => new THREE.Vector3(...arr);
  // A flat shape: `pts` as [along, across] pairs in the frame at `at` (u along, v
  // across) on the face with normal n, lifted `lift` eps. Fanned from its first point
  // (convex shapes), or cut into triangles whatever its outline with `any`.
  const shape = (at, u, v, n, lift, pts, c, any = false) => {
    const W = ([x, y]) => at.clone().addScaledVector(u, x * a).addScaledVector(v, y * a).addScaledVector(n, eps * lift);
    const P = pts.map(W);
    const tris = [];
    if (any) for (const f of THREE.ShapeUtils.triangulateShape(pts.map(([x, y]) => new THREE.Vector2(x, y)), [])) tris.push(...f.map((i) => P[i]));
    else for (let i = 1; i + 1 < P.length; i++) tris.push(P[0], P[i], P[i + 1]);
    for (const p of tris) {
      pos.push(p.x, p.y, p.z);
      col.push(c.r, c.g, c.b);
    }
  };
  // A straight stroke from p to q (frame units), `half` its half-width.
  const bar = (at, u, v, n, lift, p, q, half, c) => {
    const W = ([x, y]) => at.clone().addScaledVector(u, x * a).addScaledVector(v, y * a);
    strip(pos, col, W(p), W(q), n.toArray(), half * a, eps * lift, c);
  };
  // The drawn line as world points: its length, and the point `dist` along it with its
  // direction and face, for marks spread along it.
  const P = shaft.out.map((q) => world(q.p));
  const lens = P.slice(1).map((p, i) => p.distanceTo(P[i]));
  const total = lens.reduce((s, l) => s + l, 0);
  const pointAt = (dist, fn) => {
    for (let i = 0, run = 0; i < lens.length; run += lens[i++]) {
      if (dist > run + lens[i] || lens[i] < 1e-9) continue;
      const sg = tr.segs[shaft.segIdx[i]];
      if (sg.hidden) return;
      const u = P[i + 1].clone().sub(P[i]).normalize();
      const n = V(sg.n);
      fn(P[i].clone().lerp(P[i + 1], (dist - run) / lens[i]), u, new THREE.Vector3().crossVectors(n, u), n, sg.face);
      return;
    }
  };
  const along = (step, start, stop, fn) => {
    for (let dist = start, k = 0; dist <= total - stop; dist += step) pointAt(dist, (...m) => fn(...m, k++));
  };
  // The tail: where the line starts, the way away from the body, and its face.
  const tailSeg = tr.segs[segIdx[0]];
  const T = world(out[0].p);
  const back = T.clone().sub(world(out[1].p));
  if (back.lengthSq() < 1e-12) back.copy(d).negate();
  back.normalize();
  const tn = V(tailSeg.n);
  const tv = new THREE.Vector3().crossVectors(tn, back);
  const tail = (dist) => T.clone().addScaledVector(back, dist);
  const hn = V(tr.headN);

  // 중국: a red knot with a tassel on each key's tail.
  if (ar.gates.length && !ar.machete && !tailSeg.hidden) {
    const at = tail(hw + 0.36 * a);
    const red = tone(ORN.knot, tailSeg.face);
    const gold = tone(ORN.knotGold, tailSeg.face);
    for (const y of [-0.21, 0, 0.21]) bar(at, back, tv, tn, 1.7, [0.375, y * 0.3], [1.04, y], 0.05, red);
    shape(at, back, tv, tn, 1.8, [[-0.42, 0], [0, -0.42], [0.42, 0], [0, 0.42]], red);
    const q = [[-0.19, 0], [0, -0.19], [0.19, 0], [0, 0.19]];
    for (let i = 0; i < 4; i++) bar(at, back, tv, tn, 1.9, q[i], q[(i + 1) % 4], 0.04, gold);
    shape(at, back, tv, tn, 2.0, oval(0.42, 0, 0.094), gold);
  }
  // 한국: a taegeuk on each pair arrow's tail.
  if (ar.partner >= 0 && !tailSeg.hidden) {
    const at = tail(hw + 0.42 * a);
    const r = 0.46;
    const [red, blue] = ORN.taegeuk.map((c) => tone(c, tailSeg.face));
    shape(at, back, tv, tn, 1.7, oval(0, 0, r, r, 0, 18), blue);
    shape(at, back, tv, tn, 1.8, halfDisc(0, 0, r, Math.PI, 10), red);
    shape(at, back, tv, tn, 1.9, halfDisc(-r / 2, 0, r / 2, 0), red);
    shape(at, back, tv, tn, 2.0, halfDisc(r / 2, 0, r / 2, Math.PI), blue);
    const rim = oval(0, 0, r, r, 0, 18);
    for (let i = 0; i < rim.length; i++) bar(at, back, tv, tn, 2.1, rim[i], rim[(i + 1) % rim.length], 0.04, tone(WHITE, tailSeg.face));
  }
  // 캐나다: a maple leaf in the arrow's colour on each aurora arrow's tail.
  if (ar.tint >= 0 && !tailSeg.hidden) {
    shape(tail(hw + 0.49 * a), back, tv, tn, 1.7, MAPLE, tone(AURORA[ar.tint], tailSeg.face), true);
  }
  // 그리스: laurel leaves along a discus, angled back.
  if (ar.disc) {
    along(0.875 * a, 0.62 * a, 1.46 * a, (p, u, v, n, face) => {
      for (const sg of [1, -1]) shape(p, u, v, n, 1.7, oval(-0.104, sg * (hw / a + 0.15), 0.333, 0.135, -sg * 0.61, 10), tone(ORN.laurel, face));
    });
  }
  // 미국: the twist of the lasso's rope, and the knot that closes its loop.
  if (ar.lasso) {
    const k = (0.86 * hw) / a;
    along(0.417 * a, 0.21 * a, 0.94 * a, (p, u, v, n, face) => bar(p, u, v, n, 1.7, [-0.146, -k], [0.146, k], 0.047, tone(ORN.rope, face)));
    if (ar.state !== 'exiting') shape(H, d, side, hn, 1.7, oval(0.65, 0, 0.19), tone(ORN.honda, headFace));
  }
  // 호주: dot painting along a boomerang and on its hook.
  if (ar.boom) {
    along(0.396 * a, 0.04 * a, 0.94 * a, (p, u, v, n, face, k) => shape(p, u, v, n, 1.7, oval(0, 0, 0.094, 0.094, 0, 8), tone(ORN.dots[k % 2], face)));
    if (d.dot(V(ar.dir)) > 0.5) {
      const bk = V(ar.boom);
      const r = 0.45 * a;
      const C = H.clone().addScaledVector(d, 0.5 * a).addScaledVector(bk, r);
      for (const t of [Math.PI / 3, (2 * Math.PI) / 3]) {
        shape(C.clone().addScaledVector(d, Math.sin(t) * r).addScaledVector(bk, -Math.cos(t) * r), d, side, hn, 1.8, oval(0, 0, 0.0625, 0.0625, 0, 8), tone(ORN.dots[0], headFace));
      }
    }
  }
  // 러시아: a snowflake on each frozen arrow's tail.
  if (ar.ice && !tailSeg.hidden) {
    const at = tail(hw + 0.44 * a);
    const c = tone(ORN.frost, tailSeg.face);
    for (let k = 0; k < 3; k++) {
      const [x, y] = [0.44 * Math.cos((k * Math.PI) / 3), 0.44 * Math.sin((k * Math.PI) / 3)];
      bar(at, back, tv, tn, 1.7, [-x, -y], [x, y], 0.06, c);
    }
    shape(at, back, tv, tn, 1.8, oval(0, 0, 0.11), c);
  }
  // 일본: the white braid of a katana's grip along a samurai.
  if (ar.samurai) {
    const k = (0.75 * hw) / a;
    along(0.38 * a, 0.2 * a, 0.75 * a, (p, u, v, n, face) => shape(p, u, v, n, 1.7, [[-0.13, 0], [0, -k], [0.13, 0], [0, k]], tone(ORN.tsukaIto, face)));
  }
  // 스페인: the red scarf round a bull's neck, just behind its head.
  if (ar.run && total > 0.51 * a) {
    const w = Math.max(0.52, hw / a + 0.12);
    pointAt(total - 0.51 * a, (p, u, v, n, face) => {
      const c = tone(ORN.scarf, face);
      shape(p, u, v, n, 1.7, [[-0.167, -w], [0.167, -w], [0.167, w], [-0.167, w]], c);
      shape(p, u, v, n, 1.7, [[-0.083, w - 0.06], [-0.75, w + 0.355], [-0.458, w - 0.145]], c);
    });
  }
  // 인도: henna dots along a diagonal arrow.
  if (ar.diag) {
    along(0.417 * a, 0.17 * a, 1.15 * a, (p, u, v, n, face) => {
      for (const sg of [1, -1]) shape(p, u, v, n, 1.7, oval(0, (sg * 0.5 * hw) / a, 0.058, 0.058, 0, 8), tone(ORN.henna, face));
    });
  }

  // Heads of their own, in place of the triangle.
  if (ar.dial >= 0) {
    // 멕시코: a stepped pyramid.
    for (const [x0, x1, w] of [[-0.6, -0.23, 0.62], [-0.23, 0.13, 0.4], [0.13, 0.5, 0.18]]) {
      shape(H, d, side, hn, 1.5, [[x0, -w], [x1, -w], [x1, w], [x0, w]], headColor);
    }
  } else if (ar.machete) {
    // 브라질: a machete's blade on a dark hilt.
    shape(H, d, side, hn, 1.5, [[-0.32, -0.5], [-0.15, -0.5], [-0.15, 0.5], [-0.32, 0.5]], tone(ORN.hilt, headFace));
    shape(H, d, side, hn, 1.5, [[-0.15, -0.3], [0.85, -0.3], [1.2, 0.02], [0.95, 0.34], [0.1, 0.4], [-0.15, 0.34]], tone(ORN.blade, headFace));
    shape(H, d, side, hn, 1.6, [[-0.15, -0.3], [0.85, -0.3], [0.85, -0.2], [-0.15, -0.2]], tone(ORN.bladeBack, headFace));
  } else if (ar.lantern) {
    // 태국: a paper lantern with a light inside.
    const edge = tone(ORN.lanternEdge, headFace);
    shape(H, d, side, hn, 1.5, [[-0.6, -0.44], [0.35, -0.44], [0.35, 0.44], [-0.6, 0.44]], headColor);
    shape(H, d, side, hn, 1.5, [[0.35, -0.22], [0.78, 0], [0.35, 0.22]], edge);
    for (const x of [-0.38, 0.13]) shape(H, d, side, hn, 1.6, [[x - 0.03, -0.44], [x + 0.03, -0.44], [x + 0.03, 0.44], [x - 0.03, 0.44]], edge);
    shape(H, d, side, hn, 1.7, oval(-0.12, 0, 0.2, 0.15), tone(ORN.flame, headFace));
  } else if (ar.samurai) {
    // 일본: a katana's blade, its back darker, out of a round gold guard.
    shape(H, d, side, hn, 1.5, [[-0.22, -0.16], [0.6, -0.16], [1.1, 0.05], [0.66, 0.16], [-0.22, 0.16]], tone(ORN.katana, headFace));
    shape(H, d, side, hn, 1.6, [[-0.22, 0.09], [0.66, 0.09], [0.66, 0.16], [-0.22, 0.16]], tone(ORN.katanaBack, headFace));
    shape(H, d, side, hn, 1.7, oval(-0.3, 0, 0.1, 0.46), tone(ORN.tsuba, headFace));
  } else if (ar.diag) {
    // 인도: a paisley edged dark, with a ring and a dot of henna inside.
    const scaled = (k, dx) => PAISLEY.map(([x, y]) => [x * k + dx, y * k]);
    shape(H, d, side, hn, 1.45, scaled(1.12, 0.03), tone(ORN.hennaEdge, headFace));
    shape(H, d, side, hn, 1.5, PAISLEY, headColor);
    shape(H, d, side, hn, 1.6, scaled(0.5, -0.02), tone(ORN.henna, headFace));
    shape(H, d, side, hn, 1.7, scaled(0.4, -0.03), headColor);
    shape(H, d, side, hn, 1.8, oval(-0.17, 0, 0.07), tone(ORN.henna, headFace));
  }
}

// Mirrors, guard tiles (filled when shut, outlined when open), gates still shut,
// curtains not yet lifted, tunnel mouths, obelisks and their shadows, dials, walls,
// panels, ice, and the pieces samurais cut off.
function drawDecor() {
  const { cube, mirrors, guards, curtains, tunnels, canals, sundial, dials, walls, panels, arrows } = game.puz;
  const cs = cellSize();
  const eps = S * 0.004;
  const pos = [];
  const col = [];
  const now = performance.now();
  game.falling = false;
  const cellInfo = (id) => {
    const { p, n } = cube.cells[id];
    const u = cube.tangents(id)[0];
    return { C: world(p), n, u: new THREE.Vector3(...u), v: new THREE.Vector3(...cross(n, u)), face: cube.faceOf(id) };
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
  // camera: seen through the cube they would hide everything behind them), then the
  // obelisks on top.
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
  // Siberian ice: a block of pale ice under each frozen arrow, with a frosty rim round
  // its cells, while any arrow touches it; once nothing does, only the rim is left (it
  // can melt out). The ice on faces toward the camera only, like shadows.
  const rim = cs * 0.035;
  for (const ar of game.arrows) {
    if (!ar.ice || (ar.state !== 'idle' && ar.state !== 'bumping')) continue;
    const held = ar.extra.some((c) => {
      const o = ownerAt(game.puz, game.state, c);
      return o >= 0 && o !== ar.index;
    });
    const own = new Set(ar.cells);
    for (const id of ar.cells) {
      const info = cellInfo(id);
      if (!isFacing(info.face)) continue;
      if (held) square(info, cs * 0.5, COLOR.iceBlock, eps * 0.2);
      for (const t of cube.tangents(id)) {
        if (own.has(cube.step(id, t).id)) continue;
        const out = new THREE.Vector3(...t);
        const along = new THREE.Vector3().crossVectors(new THREE.Vector3(...info.n), out);
        const mid = info.C.clone().addScaledVector(out, cs * 0.5 - rim);
        strip(pos, col, mid.clone().addScaledVector(along, -cs * 0.5), mid.clone().addScaledVector(along, cs * 0.5), info.n, rim, eps * 0.3, COLOR.iceEdge);
      }
    }
  }
  // Pieces samurais have cut off: where they were, in their arrow's colour, until the
  // samurai passes the cut, then thinning away with a white slash across the cut. An
  // erased arrow (`wipe`) thins away at once, with no slash.
  const line = Math.min(cs * 0.085 * BOLD * game.thick, 0.04 * BOLD);
  game.pieces = game.pieces.filter((pc) => now < pc.t0 + CUT_MS);
  for (const pc of game.pieces) {
    const u = Math.max(0, (now - pc.t0) / CUT_MS);
    game.falling = true;
    for (let i = 1; i < pc.pts.length; i++) {
      const c = isFacing(pc.pts[i].face) ? pc.color : COLOR.back;
      strip(pos, col, world(pc.pts[i - 1].p), world(pc.pts[i].p), pc.pts[i].n, line * (1 - u), eps, c, line * (1 - u), line * (1 - u));
    }
    if (now < pc.t0 || pc.wipe) continue;
    const info = cellInfo(pc.cell);
    const slant = info.u.clone().add(info.v).normalize().multiplyScalar(cs * 0.48);
    strip(pos, col, info.C.clone().sub(slant), info.C.clone().add(slant), info.n, cs * 0.05 * (1 - u), eps * 1.8, tint(info.face, WHITE));
  }
  // Mondrian panels: while an arrow sits in one, a pale fill in its colour (on faces
  // toward the camera only, like shadows) inside a thick black frame; once it is
  // empty, a thin grey frame. Frames lie just inside their panel.
  for (const pnl of panels ?? []) {
    const shut = pnl.cells.some((id) => game.state.occ[id] >= 0);
    const { p: p0, n } = cube.cells[pnl.cells[0]];
    const face = cube.faceOf(pnl.cells[0]);
    if (shut && isFacing(face)) for (const id of pnl.cells) square(cellInfo(id), cs * 0.5, PANEL[pnl.hue], eps * 0.2);
    const hw = cs * (shut ? 0.055 : 0.02);
    const a = axisOf(n);
    const [b, d] = [0, 1, 2].filter((x) => x !== a);
    const inset = hw / fit.k; // in doubled grid units
    const span = (x) => {
      const vs = pnl.cells.map((id) => cube.cells[id].p[x]);
      return [Math.min(...vs) - 1 + inset, Math.max(...vs) + 1 - inset];
    };
    const [[b0, b1], [d0, d1]] = [span(b), span(d)];
    const corner = (x, y) => {
      const q = [...p0];
      q[b] = x;
      q[d] = y;
      return world(q);
    };
    const ring = [corner(b0, d0), corner(b1, d0), corner(b1, d1), corner(b0, d1)];
    const c = tint(face, shut ? COLOR.panelLine : COLOR.panelOpen);
    for (let k = 0; k < 4; k++) strip(pos, col, ring[k], ring[(k + 1) % 4], n, hw, eps * 0.5, c, hw, hw);
  }
  // Berlin walls: a concrete slab on each cell, a thin joint between them, while the
  // wall stands (its number is a label of its own, placeLabels). When it falls, the
  // slabs crumble one after another along it.
  for (const [k, w] of (walls ?? []).entries()) {
    const standing = w.count > game.state.gone[w.face];
    if (standing) game.fell[k] = 0;
    else game.fell[k] ||= now;
    w.cells.forEach((id, j) => {
      const u = standing ? 0 : Math.min(1, Math.max(0, (now - game.fell[k] - 70 * j) / FALL_MS));
      if (u >= 1) return;
      if (!standing) game.falling = true;
      const info = cellInfo(id);
      square(info, cs * 0.465 * (1 - u * u), tint(info.face, COLOR.wall), eps * 0.7);
    });
  }
  // Canals: water (on faces toward the camera only, like shadows) with a chevron in
  // each cell pointing the way it flows.
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

// How long a fallen wall takes to crumble, per slab, and a cut piece to drop away (ms).
const FALL_MS = 420;
const CUT_MS = 380;

// Berlin walls' numbers, on each wall's middle cell: how many more arrows have to leave
// the wall's face before it falls. Each is a small canvas, drawn again when its
// number changes.
const labels = [];
function makeLabels() {
  for (const l of labels.splice(0)) {
    scene.remove(l.mesh);
    l.mesh.geometry.dispose();
    l.mesh.material.map.dispose();
    l.mesh.material.dispose();
  }
  const { cube, walls } = game.puz;
  const cs = cellSize();
  for (const w of walls ?? []) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cs, cs), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
    mesh.matrixAutoUpdate = false;
    const cell = w.cells[Math.floor(w.cells.length / 2)];
    const { p, n } = cube.cells[cell];
    const normal = new THREE.Vector3(...n);
    labels.push({ mesh, canvas, wall: w, n: normal, face: cube.faceOf(cell), at: world(p).addScaledVector(normal, S * 0.004 * 1.3), text: '' });
    scene.add(mesh);
  }
}

// Shows each standing wall's number on a face toward the camera, turned upright on
// screen (to the nearest grid direction).
const screenUp = new THREE.Vector3();
function placeLabels() {
  if (!labels.length) return;
  screenUp.setFromMatrixColumn(camera.matrixWorld, 1);
  for (const l of labels) {
    const left = l.wall.count - game.state.gone[l.wall.face];
    l.mesh.visible = left > 0 && isFacing(l.face);
    if (!l.mesh.visible) continue;
    const text = String(left);
    if (text !== l.text) {
      l.text = text;
      const g = l.canvas.getContext('2d');
      g.clearRect(0, 0, 128, 128);
      g.font = `800 ${text.length > 1 ? 84 : 104}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = 10;
      g.strokeStyle = 'rgba(38, 40, 48, 0.5)';
      g.strokeText(text, 64, 70);
      g.fillStyle = '#ffffff';
      g.fillText(text, 64, 70);
      l.mesh.material.map.needsUpdate = true;
    }
    const up = screenUp.clone().addScaledVector(l.n, -screenUp.dot(l.n));
    const axis = [0, 1, 2].filter((x) => !l.n.getComponent(x)).sort((x, y) => Math.abs(up.getComponent(y)) - Math.abs(up.getComponent(x)))[0];
    up.set(0, 0, 0).setComponent(axis, Math.sign(screenUp.getComponent(axis)) || 1);
    const right = new THREE.Vector3().crossVectors(up, l.n);
    l.mesh.matrix.makeBasis(right, up, l.n).setPosition(l.at);
  }
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
  // A country stage given up or started over after a move breaks the clears in a row.
  if (game.counts && game.moved && !game.cleared && wallet.climb.row) {
    wallet.climb.row = 0;
    saveWallet(wallet);
  }
  game.counts = game.world !== 'free' && WORLDS[game.world].tier > 0;
  game.moved = false;
  game.misses = 0;
  game.adWatched = false;
  for (const ar of game.arrows) {
    if (ar.state === 'gone') continue;
    scene.remove(ar.mesh);
    ar.mesh.geometry.dispose();
  }

  const t0 = performance.now();
  const cube = surfaceOf(params);
  const puz = generate(cube, params);
  const ms = performance.now() - t0;

  game.params = params;
  game.puz = puz;
  fitTo(cube);
  shapeGlass(cube);
  turnFaces();
  game.state = newState(puz);
  game.fell = [];
  game.pieces = [];
  makeLabels();
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
    mesh: arrowMesh(),
  }));
  for (const ar of game.arrows) {
    if (ar.dial >= 0) seat(ar);
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

  game.stuck = false;
  game.tut = null;
  game.turn = null;
  game.hint = -1;
  game.adHint = false;
  game.erasing = false;
  $('guide').hidden = true;
  game.heartsMax = game.hearts = params.hearts ?? 0;
  syncPanel(params);
  refreshFree();
  redrawAll();
  hud();
  drawHearts();
  showWallet();
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
  const baked = STAGE_SEEDS[world][game.stage - 1];
  load({ ...preset(world, game.stage), seed: baked.seed, ...(baked.N ? { N: baked.N } : {}) });
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
  // With the eraser out, the tap picks what to erase.
  if (game.erasing) return erase(ar);
  // A tutorial step about one arrow takes taps on that one only.
  if (!tutAllows(ar)) return nudgeGuide();
  const { puz, state } = game;
  const members = group(puz, ar.index).map((j) => game.arrows[j]);
  if (!game.tut) game.moved = true;
  if (canExit(puz, state, ar.index)) {
    const at = tapSpot(pose(puz, state, ar.index).cells.at(-1));
    if (at) sparkle(at);
    const catchK = caughtBy(puz, state, ar.index)?.k;
    const cut = cutBy(puz, state, ar.index);
    const out = remove(puz, state, ar.index).map((j) => game.arrows[j]);
    if (cut) slash(game.arrows[cut.arrow], cut);
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
    settle(out, cut);
    tutDid('leave', ar.index);
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
  game.misses++;
  loseHeart();
  tutDid('bump', ar.index);
}

// After arrows have left the cube (`out`; with a samurai's `cut`): which can leave now,
// the decor that changed and the count; on a clocked stage the switch has moved on, so
// the shadows, guards and dial arrows follow, and if nothing can leave now the stage is
// stuck for good. A hint's arrow that can no longer leave goes dark.
function settle(out, cut = null) {
  const { puz, state } = game;
  replay($('remain').parentElement, 'bump');
  refreshFree();
  // A lantern leaving lights up the arrows round it.
  if (game.showFree || out.some((a) => a.lantern)) redrawAll();
  if (puz.walls || puz.panels || cut || puz.gimmick === 'ice' || out.some((a) => a.gates.length || a.tint >= 0 || a.disc)) drawDecor();
  hud();
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
  if (game.hint >= 0 && !game.arrows[game.hint].free) game.hint = -1;
}

// A wrong tap costs a heart on stages that have them; with none left, the card says
// so and starts the stage over.
function loseHeart() {
  if (!game.heartsMax || game.cleared || game.stuck) return;
  // The heart going breaks off where it was (fx.js) before the row shows it faded.
  const going = [...$('hearts').querySelectorAll('span')].at(-1);
  if (going) heartBreak(spot(going));
  game.hearts--;
  drawHearts(true);
  if (game.hearts <= 0) game.solveTimer = setTimeout(showNoHearts, 700);
}

// The hearts in the top bar: those left, then those lost, faded. `lost` shakes them.
function drawHearts(lost = false) {
  const el = $('hearts');
  el.hidden = !game.heartsMax;
  el.innerHTML = '<span>♥</span>'.repeat(Math.max(0, game.hearts)) + `<i>${'♥'.repeat(game.heartsMax - Math.max(0, game.hearts))}</i>`;
  el.setAttribute('aria-label', `하트 ${game.heartsMax}개 중 ${Math.max(0, game.hearts)}개 남음`);
  if (!lost) return;
  el.classList.remove('lost');
  void el.offsetWidth; // restart the shake
  el.classList.add('lost');
}

// A dial arrow takes the cells and way out of wherever its dial has turned it.
function seat(ar) {
  const { cells, dir, ray, exitDir, jumps } = pose(game.puz, game.state, ar.index);
  Object.assign(ar, { cells, dir, ray, exitDir, jumps });
  ar.track = buildTrack(game.puz.cube, ar);
}

// A samurai's cut: arrow x keeps its cells past the cut, and the piece cut off (`at`
// + 1 cells from its tail) is left to drawDecor, to stay where it was until the
// samurai's head gets there (k cells along its way) and then drop away.
function slash(x, { at, k }) {
  const piece = x.cells.slice(0, at + 1);
  game.pieces.push({ ...pieceOf(x, piece), t0: performance.now() + (2000 * (k + 1)) / SPEED });
  x.cells = x.cells.slice(at + 1);
  x.track = buildTrack(game.puz.cube, x);
  drawArrow(x);
}

// The line through cells of arrow x, for drawDecor to thin away: points along it, each
// with the face the stretch up to it lies on (where a face ends, a point on the edge
// as well), in the arrow's colour.
function pieceOf(x, cells) {
  const { cube } = game.puz;
  const C = cube.cells;
  const pts = [];
  cells.forEach((id, i) => {
    const prev = C[cells[i - 1]];
    if (i && bent(prev, C[id])) pts.push({ p: turnPoint(prev, C[id]), n: prev.n, face: cube.faceOf(prev.id) });
    pts.push({ p: C[id].p, n: C[id].n, face: cube.faceOf(id) });
  });
  return { pts, color: colorOf(x, cube.faceOf(cells[0])), cell: cells.at(-1) };
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
  const n = [hit.face.normal.x, hit.face.normal.y, hit.face.normal.z].map(Math.round);
  const { mid, k } = fit;
  const d = [hit.point.x / k + mid[0], hit.point.y / k + mid[1], hit.point.z / k + mid[2]];
  const a = axisOf(n);
  const b = (a + 1) % 3;
  const c = (a + 2) % 3;
  return { n, d, a, b, c, ib: Math.floor(d[b] / 2), ic: Math.floor(d[c] / 2) };
}

// The cell (i, j) of the plane a face with normal n lies in, crossing axis a at `at`;
// undefined where the surface has no such cell.
const cellId = (n, a, b, c, i, j, at) => {
  const { cells, index } = game.puz.cube;
  const p = [0, 0, 0];
  p[a] = at;
  p[b] = 2 * i + 1;
  p[c] = 2 * j + 1;
  const id = index.get(p.join(','));
  return id !== undefined && dot(cells[id].n, n) === 1 ? id : undefined;
};

// How many screen pixels a cell spans with the camera `dist` from the cube's centre.
function cellPixels(dist = camera.position.length()) {
  const unit = renderer.domElement.clientHeight / 2 / (Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist);
  return cellSize() * unit;
}

// How bold to draw arrows: small cells on screen (a big cube on a phone) get bolder
// ones, up to 1.45 times, judged at the starting view.
const thickness = () => Math.min(1.45, Math.max(1, 22 / cellPixels(HOME_VIEW.length())));

function pick(x, y) {
  const h = hitFace(x, y);
  if (!h) return null;
  const { n, d, a, b, c, ib, ic } = h;
  const at = Math.round(d[a]);
  // A fingertip covers more than a small cell, so a tap reaches further then.
  const reach = Math.min(1.6, Math.max(0.9, 18 / cellPixels()));
  const R = Math.ceil(reach);
  let best = null;
  let bestD = reach;
  let lit = null; // the tutorial's lit arrow, taken over a nearer one when within reach
  for (let i = ib - R; i <= ib + R; i++) {
    for (let j = ic - R; j <= ic + R; j++) {
      const cell = cellId(n, a, b, c, i, j, at);
      if (cell === undefined) continue;
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
    touch = { x: e.clientX, y: e.clientY, t: performance.now() };
    tap(pick(e.clientX, e.clientY));
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
    // A lasso's catch leaves with it, so it is not tapped on its own.
    for (const i of l.arrows) steps.push(i);
    // Tapping a bull that cannot leave yet makes it charge.
    for (const i of l.charged) steps.push(i);
  }
  const next = () => {
    if (!steps.length) return;
    const i = steps.shift();
    if (game.arrows[i].state === 'idle') tap(game.arrows[i]);
    game.solveTimer = setTimeout(next, 70);
  };
  next();
}

// ---------- tutorial

// A world's tutorial (stage 0): a small puzzle (tools/bake-tutorials.mjs) played step by
// step (tutorial.js) with the guide box under the cube.
function loadTutorial(world) {
  load(tutorialParams(world, TUTORIAL_SEEDS[world]));
  game.counts = false;
  // From the starting view, so the turns to what each step is about are easy to follow.
  camera.position.copy(HOME_VIEW);
  camera.up.set(0, 1, 0);
  game.tut = { steps: TUTORIALS[world].steps, k: 0, targets: [], focus: -1, wait: false };
  $('guide').style.setProperty('--accent', themeOf(world).accent);
  showWallet();
  tutStep(0);
}

// The arrows still on the cube.
const aliveNow = () =>
  new Set(game.arrows.filter((a) => a.state === 'idle' || a.state === 'bumping' || a.state === 'charging').map((a) => a.index));

// Starts tutorial step k: the guide says it, the arrow it is about lights up and the
// cube turns to show it, or the tile the step talks about.
function tutStep(k) {
  const tut = game.tut;
  const step = tut.steps[k];
  const { puz, state } = game;
  Object.assign(tut, { k, focus: -1, wait: false });
  if (step.find) tut.focus = findTarget(puz, state, aliveNow(), step.find, tut.targets);
  const cell = step.look ? lookCell(puz, step.look) : tut.focus >= 0 ? pose(puz, state, tut.focus).cells.at(-1) : undefined;
  if (cell !== undefined) turnTo(cell);
  $('guideStep').textContent = `튜토리얼 ${k + 1} / ${tut.steps.length}`;
  $('guideText').textContent = step.say;
  $('guideNext').hidden = step.until !== 'next';
  $('guide').hidden = false;
}

// Whether a tap on arrow ar counts now: in a step about one arrow only that one (or its
// pair) does, and none while the guide is only saying something. The last step (free
// play) and auto-solve take any.
function tutAllows(ar) {
  const tut = game.tut;
  if (!tut || game.autoSolved || game.cleared) return true;
  const step = tut.steps[tut.k];
  if (step.until === 'clear' && !tut.wait) return true;
  return !tut.wait && !!step.find && tut.focus >= 0 && group(game.puz, tut.focus).includes(ar.index);
}

// The player did something (`what` as a step's `until`, to arrow i): on to the next
// step if it is what this one waits for, after a moment to see what it did and once a
// bumped arrow is back or a bull has stopped.
function tutDid(what, i = -1) {
  const tut = game.tut;
  if (!tut || tut.wait || game.autoSolved) return;
  const step = tut.steps[tut.k];
  if (step.until !== what || tut.focus < 0 || !group(game.puz, tut.focus).includes(i)) return;
  tut.targets[tut.k] = tut.focus;
  Object.assign(tut, { wait: true, focus: -1 });
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

// The tutorial's lit arrow, or a hint's, glows and pulses.
function drawGlow(now) {
  const i = game.tut ? game.tut.focus : game.hint;
  const ar = i >= 0 ? game.arrows[i] : null;
  const lit = ar &&(ar.state === 'idle' || ar.state === 'bumping' || ar.state === 'charging') ? ar : null;
  glow.visible = !!lit;
  if (!lit) return;
  const pulse = 0.5 + 0.5 * Math.sin(now / 170);
  glowMat.opacity = 0.3 + 0.45 * pulse;
  const pos = [];
  const col = [];
  drawArrow(lit, { pos, col, widen: 2.6 + 0.9 * pulse });
  setGeometry(glow, pos, col);
}

// ---------- frame loop

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  turnCamera(now);
  controls.update();

  if (turnFaces()) redrawAll();
  fadeScenery();
  if (game.falling) drawDecor();
  placeLabels();

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
    $('world').textContent = shortName(game.world);
    $('stageLabel').textContent = game.stage ? `스테이지 ${game.stage} / ${WORLDS[game.world].stages.length} ▾` : '튜토리얼 ▾';
  }
  $('remain').textContent = game.remaining;
}

// The card over the stage or the home screen, holding top to bottom what `parts` names:
// a close button, an icon (an ICON key), the title and a line under it, a `body` (an
// element), coins `won` (+n), what the stage scored up the `climb`, a coin price to `pay`
// (or nothing if the wallet is short), the coins the player `has`, `buyCoins` (opens the
// shop), a `tip`, an `ad` for a reward (in the bottom row if `primary`) and the bottom
// row: a round `restart` button and the `next` step (greyed if `next.off`). Words are kept
// few (2026-11-03 user request).
// A clear (`celebrate`) puts the title on a ribbon with sun rays turning behind the card
// and confetti bursting from it, and the coins count up from `wonFrom` (fx.js). A card
// that comes up pops in with its parts rising one after another.
function showCard({ close, icon, title, celebrate, note, body, won, wonFrom = 0, climb, pay, has, buyCoins, tip, ad, restart, next }) {
  const card = $('card');
  const fresh = $('clear').hidden || $('clear').classList.contains('closing');
  clearTimeout(closing);
  $('clear').classList.remove('closing');
  const button = (cls, html, onclick) => {
    const b = node('button', cls);
    b.innerHTML = html;
    b.onclick = onclick;
    return b;
  };
  card.replaceChildren();
  if (close) card.append(button('close-x', ICON.close, closeCard));
  if (icon) {
    const ic = node('div', `badge-ic ${icon}`);
    ic.innerHTML = ICON[icon];
    card.append(ic);
  }
  card.append(node('h2', celebrate ? 'ribbon' : '', title));
  if (note) card.append(node('p', 'clear-stars', note));
  if (body) card.append(body);
  if (won !== undefined) {
    const r = node('div', 'reward');
    r.innerHTML = `${ICON.coin}<span>+${wonFrom}</span>`;
    card.append(r);
    setTimeout(() => countUp(r.querySelector('span'), wonFrom, won, 700, (n) => `+${n}`), fresh ? 380 : 0);
  }
  if (climb) {
    const c = node('p', 'climb-won');
    c.innerHTML = `${ICON.flag}+${climb.points}${climb.row > 1 ? `<small>${ICON.flame}${climb.row}연속</small>` : ''}`;
    for (const [kind, n] of climb.got) c.insertAdjacentHTML('beforeend', `<span class="got">${rewardIcon(kind)}${kind === 'coins' ? `+${n}` : `×${n}`}</span>`);
    card.append(c);
  }
  if (pay) {
    const b = button('primary pay', `${ICON.coin}<span>${pay.price}</span>`, pay.then);
    b.disabled = wallet.coins < pay.price;
    card.append(b);
  }
  if (has !== undefined) card.append(node('p', 'have', `${digits(has)}코인`));
  if (buyCoins) card.append(button('buy-coins', `${ICON.coin}<span>코인 사기</span>`, buyCoins));
  if (tip) {
    const t = node('p', 'tip');
    t.innerHTML = `${ICON.info}<span>${tip}</span>`;
    card.append(t);
  }
  // An ad's reward comes once it has been watched; a button pressed once does not take another.
  const adButton = (cls) => {
    const b = button(cls, `${ICON.ad}<span>${ad.text}</span>`, async () => {
      b.disabled = true;
      const how = await rewarded();
      if (how === 'earned') return ad.then();
      b.disabled = false;
      if (how === 'failed') say('광고를 불러오지 못했어요');
    });
    return b;
  };
  if (ad && !ad.primary) card.append(adButton('ad'));
  if (restart || next || ad?.primary) {
    const row = node('div', 'row-btns');
    if (restart) {
      const b = button('restart', ICON.restart, restart);
      b.setAttribute('aria-label', '재시작');
      row.append(b);
    }
    if (ad?.primary) row.append(adButton('primary ad'));
    if (next) {
      const b = button('primary wide', next.text, next.then);
      b.disabled = !!next.off;
      row.append(b);
    }
    card.append(row);
  }
  if (fresh) [...card.children].forEach((el, i) => el.classList.contains('close-x') || (el.classList.add('rise'), el.style.setProperty('--i', i)));
  $('rays').hidden = !celebrate;
  $('clear').hidden = false;
  if (celebrate && fresh) setTimeout(() => confetti(card.querySelector('h2')), 160);
}
// The card shrinks away, unless another comes up first.
let closing = 0;
function closeCard() {
  const clear = $('clear');
  if (clear.hidden || clear.classList.contains('closing')) return;
  clear.classList.add('closing');
  closing = setTimeout(() => {
    clear.hidden = true;
    clear.classList.remove('closing');
  }, 160);
}

// A stage that is over without a clear (game.stuck): a clocked stage where nothing
// left can leave starts over; with every heart lost, Game Over!, or one heart more for
// an ad.
function showOver(parts) {
  if (game.cleared) return;
  game.stuck = true;
  stopErase();
  showCard(parts);
}
const showStuck = () => showOver({ title: '막혔어요', note: '지금 상태로는 나갈 수 있는 화살표가 없어요', next: { text: '처음부터 다시', then: restart } });
const showNoHearts = () =>
  showOver({
    icon: 'heart',
    title: 'Game Over!',
    restart,
    ad: {
      text: '하트 하나 더!',
      primary: true,
      then: () => {
        game.hearts = 1;
        game.stuck = false;
        drawHearts();
        replay($('hearts'), 'bump');
        closeCard();
      },
    },
  });

// The clear card. A world stage cleared by hand is recorded and pays its coins
// (economy.js coinsFor; a fifth if it was cleared before), which an ad doubles once; the
// card says where the world stands, and when a star was just earned. That a stage
// cleared again pays a fifth is told once: on 집 안's first stage, or the first time it
// happens.
function showClear() {
  if (game.tut) return showTutorialDone();
  const inWorld = game.world !== 'free';
  const w = WORLDS[game.world];
  const last = inWorld && game.stage === w.stages.length;
  const parts = {
    title: last ? `${shortName(game.world)} 완료!` : '스테이지 클리어!',
    celebrate: true,
    next: { text: !inWorld ? '새 퍼즐' : last ? '처음부터' : '다음 스테이지', then: nextStage },
  };
  const coins = wallet.coins;
  if (inWorld && game.autoSolved) {
    parts.note = '자동 풀이로 깬 스테이지는 기록하지 않아요';
  } else if (inWorld) {
    const again = isCleared(progress, game.world, game.stage);
    const before = starsOf(progress, game.world);
    markCleared(progress, game.world, game.stage);
    const stars = starsOf(progress, game.world);
    parts.note = `${w.tier ? `${starText(stars)} · ` : ''}${clearedCount(progress, game.world)} / ${w.stages.length} 클리어`;
    if (stars > before) parts.note += ' · 별을 얻었어요!';
    const won = coinsFor(game.world, game.stage, again);
    if (!wallet.told && (again || (game.world === 'home' && game.stage === 1))) {
      wallet.told = true;
      parts.tip = '다시 깬 스테이지는 코인 1/5';
    }
    earn(won);
    if (game.counts) parts.climb = climbUp(again);
    Object.assign(parts, { won, has: wallet.coins });
    parts.ad = {
      text: '광고 보면 두 배!',
      then: () => {
        game.adWatched = true;
        const before = wallet.coins;
        earn(won);
        showCard({ ...parts, won: 2 * won, wonFrom: won, has: wallet.coins, ad: null });
        payOut(before, $('card').querySelector('.reward'));
      },
    };
  }
  showCard(parts);
  // Once the card is up, the coins fly from it to the bar, and rewards from the climb
  // to theirs.
  if (wallet.coins > coins || parts.climb?.got.length)
    setTimeout(() => {
      if (wallet.coins > coins) payOut(coins, $('card').querySelector('.reward'));
      for (const [kind, n] of parts.climb?.got ?? []) {
        if (kind !== 'coins') fly(ICON[kind], $('card').querySelector('.climb-won'), $(kind === 'hint' ? 'hintBtn' : 'eraserBtn'), { n: Math.min(n, 3), size: 30, land: () => replay($(kind === 'hint' ? 'hintBtn' : 'eraserBtn'), 'bump') });
      }
    }, 520);
}

// Coins paid out fly from where they came (an element or a point) to the coins showing
// (the shop page's, the home screen's or the bar's), whose number counts up from
// `before` as they land.
function payOut(before, from) {
  const pill = [$('shopCoins'), $('homeCoins'), $('coins')].find((el) => el.getClientRects().length);
  const n = pill?.querySelector('.n');
  if (!pill || !from || !n) return;
  const after = wallet.coins;
  n.textContent = digits(before);
  const many = Math.min(8, 3 + Math.floor(Math.log2(1 + (after - before) / 40)));
  fly(ICON.coin, from, pill, {
    n: many,
    land: (last) => {
      replay(pill, 'bump');
      if (last) countUp(n, before, after, 450, digits);
    },
  });
}

// A country stage cleared: its points up the climb (economy.js climbPoints), the
// rewards passed on the way, paid at once, and one more clear toward the next
// full-screen ad.
function climbUp(again) {
  newSeason();
  const c = wallet.climb;
  c.row++;
  const points = climbPoints({ row: c.row, misses: game.misses, again });
  const got = climbRewards(c.points, c.points + points);
  c.points += points;
  for (const [kind, n] of got) give(kind, n);
  wallet.adClears++;
  saveWallet(wallet);
  showWallet();
  return { points, row: c.row, got };
}

// A tutorial played through: noted on the device, so stage 1 opens from now on. A
// country's card says that hearts start at stage 6.
function showTutorialDone() {
  if (!game.autoSolved) markTutorialDone(game.world);
  $('guide').hidden = true;
  showCard({
    title: '튜토리얼 완료!',
    celebrate: true,
    note: WORLDS[game.world].tier ? '6스테이지부터는 하트가 있어요. 막힌 화살표를 누를 때마다 하나씩 줄어요.' : '',
    next: { text: '1스테이지 시작', then: nextStage },
  });
}

// The card's next step: the next stage (from the last, the first again), or a new
// puzzle in the generator. In the app, every AD_EVERY country stages a full-screen ad
// comes first, unless the ads were bought out; one that is not due yet (an ad watched on
// the card, or the last ad under AD_GAP ago) waits for the next clear.
async function nextStage() {
  closeCard();
  if (native && !wallet.noAds && wallet.adClears >= AD_EVERY && !game.adWatched && sinceAd() >= AD_GAP) {
    wallet.adClears = 0;
    saveWallet(wallet);
    await interstitial();
  }
  if (game.world === 'free') {
    $('seed').value = Number($('seed').value) + 1;
    return loadCustom();
  }
  loadStage(game.world, game.stage === WORLDS[game.world].stages.length ? 1 : game.stage + 1);
}

// ---------- coins and items

// The wallet (progress.js): coins, the hints and erasers kept, and the rest of what the
// player has been given or has bought.
const wallet = loadWallet();
const digits = (n) => n.toLocaleString('ko-KR');
function earn(coins) {
  wallet.coins += coins;
  saveWallet(wallet);
  showWallet();
}
// A reward (economy.js: ['coins' | 'hint' | 'eraser', n]) into the wallet, not yet saved.
function give(kind, n) {
  wallet[kind === 'coins' ? 'coins' : kind] += n;
}
const rewardText = (kind, n) => (kind === 'coins' ? `+${digits(n)}코인` : `${kind === 'hint' ? '힌트' : '지우개'} +${n}`);

// The coins and items wherever they show: the bar under the cube (in a world's stages,
// not in a tutorial or the generator, and not while picking what to erase), the home
// screen and the shop. An item with none kept shows its price.
function showWallet() {
  const coins = `${ICON.coin}<span class="n">${digits(wallet.coins)}</span>`;
  const tag = (n, price) => (n ? `<b>${n}</b>` : `<span class="cost">${ICON.coin}${price}</span>`);
  $('coins').innerHTML = $('homeCoins').innerHTML = $('shopCoins').innerHTML = coins;
  $('hintBtn').innerHTML = `${ICON.hint}힌트 ${tag(wallet.hint, PRICE.hint)}`;
  $('eraserBtn').innerHTML = `${ICON.eraser}지우개 ${tag(wallet.eraser, PRICE.eraser)}`;
  $('items').hidden = game.world === 'free' || !!game.tut || game.erasing;
  $('eraseBar').hidden = !game.erasing;
  renderShop();
}

// Buys one of an item for coins.
function buy(item) {
  if (wallet.coins < PRICE[item]) return false;
  wallet.coins -= PRICE[item];
  wallet[item]++;
  saveWallet(wallet);
  showWallet();
  return true;
}

// Out of an item: the card offers one for coins, used at once (in the app, with a way
// to the shop when the wallet is short), and a hint once a stage for an ad.
function offer(item) {
  const use = item === 'hint' ? useHint : startErase;
  showCard({
    close: true,
    icon: item,
    title: item === 'hint' ? '힌트가 없어요' : '지우개가 없어요',
    pay: { price: PRICE[item], then: () => buy(item) && (closeCard(), use()) },
    has: wallet.coins,
    buyCoins: canSell() && wallet.coins < PRICE[item] ? () => (closeCard(), openShopPage()) : null,
    ad:
      item === 'hint' && !game.adHint
        ? {
            text: '광고 보면 1개!',
            then: () => {
              game.adHint = true;
              closeCard();
              lightHint();
            },
          }
        : null,
  });
}

// Items work in a world's stages while they are being played.
const playingStage = () => game.world !== 'free' && !game.tut && !game.cleared && !game.stuck;

// A hint: the arrow economy.js hintFor picks glows (as a tutorial's does) until it
// leaves or can no longer leave, and the cube turns to show it. Tapped again while one
// glows, the cube turns back to it for nothing.
function useHint() {
  if (!playingStage()) return;
  if (game.hint >= 0) return turnTo(pose(game.puz, game.state, game.hint).cells.at(-1));
  if (!wallet.hint) return offer('hint');
  if (!lightHint()) return;
  wallet.hint--;
  saveWallet(wallet);
  showWallet();
}
function lightHint() {
  const i = hintFor(game.puz, game.state, [...aliveNow()]);
  if (i < 0) {
    say('지금은 뺄 수 있는 화살표가 없어요');
    return false;
  }
  game.hint = i;
  turnTo(pose(game.puz, game.state, i).cells.at(-1));
  return true;
}

// The eraser: once out, the next tap on a plain arrow takes it off the cube, blocked or
// not, and counts as its leaving (economy.js erasable). A gimmick arrow, or on a clocked
// stage one whose going would leave the rest unable to finish, stays, and the note
// under the cube says so.
function startErase() {
  if (!playingStage()) return;
  if (!wallet.eraser) return offer('eraser');
  game.erasing = true;
  $('eraseText').textContent = '지울 화살표를 누르세요';
  showWallet();
}
function stopErase() {
  game.erasing = false;
  showWallet();
}
function erase(ar) {
  const { puz, state } = game;
  if (ar.state === 'charging' || !erasable(puz, state, [...aliveNow()], ar.index)) {
    $('eraseText').textContent = '이 화살표는 못 지워요';
    shake($('eraseBar'));
    return;
  }
  wallet.eraser--;
  saveWallet(wallet);
  game.moved = true;
  const at = tapSpot(ar.cells.at(-1));
  if (at) sparkle(at, 9);
  remove(puz, state, ar.index);
  game.remaining--;
  // It thins away where it lay.
  game.pieces.push({ ...pieceOf(ar, ar.cells), t0: performance.now(), wipe: true });
  ar.state = 'gone';
  scene.remove(ar.mesh);
  ar.mesh.geometry.dispose();
  drawDecor();
  playLeave(1, 0.5);
  stopErase();
  settle([ar]);
}

// The shop: a hint or an eraser at a time for coins, and in the app the coin packs and
// taking the ads out for money (billing.js), with Play's prices once it has given them.
// It is the home screen's 상점 tab, or a page over a stage; #shopList moves to whichever
// shows.
let buying = ''; // the product being bought: its button waits
function renderShop() {
  const list = $('shopList');
  const row = (icon, name, own, button) => {
    const r = node('div', 'shop-row');
    r.innerHTML = `<span class="ic">${icon}</span><div class="tx"><b>${name}</b>${own ? `<span class="own">${own}</span>` : ''}</div>`;
    r.append(button);
    return r;
  };
  const press = (cls, html, onclick, off = false) => {
    const b = node('button', cls);
    b.innerHTML = html;
    b.onclick = onclick;
    b.disabled = off;
    return b;
  };
  // Bought for coins, the item's count bumps.
  const buyHere = (item) => buy(item) && replay(list.querySelector(`[data-item="${item}"] .own`), 'bump');
  const rows = ['hint', 'eraser'].map((item) => {
    const r = row(ICON[item], item === 'hint' ? '힌트' : '지우개', `${wallet[item]}개`, press('', `${ICON.coin}${PRICE[item]}`, () => buyHere(item), wallet.coins < PRICE[item]));
    r.dataset.item = item;
    return r;
  });
  list.replaceChildren(...rows);
  if (canSell()) {
    const packs = node('div', 'packs');
    PACKS.forEach((p, i) => {
      const b = press(`pack${buying === p.id ? ' buying' : ''}`, `${p.bonus ? `<span class="bonus">+${p.bonus}%</span>` : ''}<span class="pk">${ICON.packs[i]}</span><b>${digits(p.coins)}</b><span class="won">${priceOf(p.id) ?? `${digits(p.won)}원`}</span>`, () => purchase(p.id), !!buying);
      b.setAttribute('aria-label', `${digits(p.coins)}코인`);
      packs.append(b);
    });
    list.append(packs);
  }
  if (wallet.noAds) {
    const owned = node('span', 'owned');
    owned.innerHTML = `${ICON.check}구매함`;
    list.append(row(ICON.noads, '광고 제거', '', owned));
  } else if (canSell()) {
    list.append(row(ICON.noads, '광고 제거', '', press('won', priceOf(NO_ADS.id) ?? `${digits(NO_ADS.won)}원`, () => purchase(NO_ADS.id), !!buying)));
  }
}
async function purchase(id) {
  buying = id;
  renderShop();
  const how = await buyProduct(id);
  buying = '';
  renderShop();
  if (how === 'failed') say('결제를 하지 못했어요');
}
// What a purchase brings (billing.js): coins once per transaction, flying from the pack
// bought (or the middle of the screen) in a burst of confetti; or no more ads.
function paidCoins(coins, tx) {
  if (wallet.paid.includes(tx)) return;
  wallet.paid = [...wallet.paid, tx].slice(-50);
  const before = wallet.coins;
  const from = spot($('shopList').querySelector('.pack.buying') ?? { x: innerWidth / 2, y: innerHeight / 2 });
  earn(coins);
  say(rewardText('coins', coins));
  confetti(from, 28);
  payOut(before, from);
}
function paidNoAds() {
  if (wallet.noAds) return;
  wallet.noAds = true;
  saveWallet(wallet);
  renderShop();
}

// The shop as a page over a stage: from the coins in the bar, or 코인 사기.
function openShopPage() {
  stopErase();
  $('shopPageBody').append($('shopList'));
  $('shopPage').hidden = false;
}
const closeShopPage = () => ($('shopPage').hidden = true);

// The home screen's tabs (2026-11-03): the shop, the worlds (with the daily gift's box)
// and the climb. A tab picked slides in from its side, its button popping up.
const TABS = { shop: ['tabShop', 'shopTab'], home: ['tabHome', 'homeBody'], climb: ['tabClimb', 'climbTab'] };
let tabOn = 'home';
function showTab(tab) {
  const order = Object.keys(TABS);
  const turn = Math.sign(order.indexOf(tab) - order.indexOf(tabOn));
  tabOn = tab;
  for (const [t, [button, pane]] of Object.entries(TABS)) {
    $(button).classList.toggle('on', t === tab);
    $(pane).hidden = t !== tab;
  }
  $('giftBtn').hidden = tab !== 'home';
  if (tab === 'home') layoutOrbs();
  if (tab === 'shop') $('shopTab').append($('shopList'));
  if (tab === 'climb') renderClimb();
  if (!turn) return;
  replay($(TABS[tab][0]).querySelector('i'), 'pop');
  if (!calm) $(TABS[tab][1]).animate([{ transform: `translateX(${turn * 56}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

// Today on this device, 'YYYY-MM-DD'.
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The daily gift (economy.js GIFTS): the box shows a dot while today's is waiting; its
// card shows the week, those taken faded and the one to take now (or tomorrow) marked.
const showGift = () => $('giftBtn').classList.toggle('ready', giftReady(wallet.gift, today()));
function openGift() {
  const ready = giftReady(wallet.gift, today());
  // Taken today and the week done: it shows full until tomorrow starts the next.
  const taken = !ready && wallet.gift.n && !giftDay(wallet.gift) ? GIFTS.length : giftDay(wallet.gift);
  const days = node('div', 'days');
  GIFTS.forEach(([kind, n], i) => {
    const d = node('div', `day${i < taken ? ' got' : i === taken ? (ready ? ' now' : ' soon') : ''}${i === GIFTS.length - 1 ? ' big' : ''}`);
    d.innerHTML = `<span>${i + 1}일</span>${rewardIcon(kind)}<b>${kind === 'coins' ? n : `×${n}`}</b>${i < taken ? `<i class="ok">${ICON.check}</i>` : ''}`;
    days.append(d);
  });
  showCard({ close: true, icon: 'gift', title: '출석 보상', body: days, next: { text: ready ? '받기' : '내일 또 받아요', off: !ready, then: takeGift } });
}
// Taking it: confetti from today's square, and coins fly from it to the wallet.
function takeGift() {
  if (!giftReady(wallet.gift, today())) return;
  const from = spot($('card').querySelector('.day.now') ?? $('giftBtn'));
  const before = wallet.coins;
  const [kind, n] = GIFTS[giftDay(wallet.gift)];
  give(kind, n);
  wallet.gift = { n: wallet.gift.n + 1, last: today() };
  saveWallet(wallet);
  showWallet();
  showGift();
  closeCard();
  say(rewardText(kind, n));
  confetti(from, 24);
  if (kind === 'coins') payOut(before, from);
}

// The climb's season is the month: a new one starts its points over (the clears in a
// row carry on).
function newSeason() {
  const season = today().slice(0, 7);
  if (wallet.climb.season === season) return;
  wallet.climb = { season, points: 0, row: wallet.climb.row, seen: 0 };
  saveWallet(wallet);
}
// The 이벤트 tab: the season and the days it has left, its points, how points are scored,
// and the climb (climb.js) with the cube in view. Points scored since the tab last showed
// walk the cube up to where they reach.
function renderClimb() {
  newSeason();
  const c = wallet.climb;
  const [y, m] = c.season.split('-').map(Number);
  const left = Math.round((new Date(y, m, 1) - new Date(new Date().toDateString())) / 86400000);
  $('climbSeason').textContent = `${m}월`;
  $('climbLeft').textContent = `${left}일 남음`;
  $('climbPoints').innerHTML = `${ICON.flag}<span class="n">${digits(c.points)}</span>`;
  $('climbRules').innerHTML = `<span>${ICON.check}클리어 10</span><span>${ICON.flame}연속 +10</span><span>${ICON.heart}하트 +10</span>`;
  const { svg, y: at } = climbArt(c.points);
  const scroll = $('climbScroll');
  scroll.innerHTML = svg;
  scroll.scrollTop = (at * scroll.clientWidth) / CLIMB_W - scroll.clientHeight * 0.55;
  if (c.seen < c.points && !calm) climbFrom(c.seen, c.points);
  c.seen = c.points;
  saveWallet(wallet);
}
// The cube walks up the path from `from` points to `to`, hopping, with the path behind
// it drawn in, the view following, the points counting, and each reward it passes ticked
// with a pop.
function climbFrom(from, to) {
  const scroll = $('climbScroll');
  const svg = scroll.querySelector('svg');
  const trail = svg.querySelector('.walked');
  const cube = svg.querySelector('.climber');
  const lengthAt = (points) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', climbTrail(points));
    svg.append(p);
    const l = p.getTotalLength();
    p.remove();
    return l;
  };
  const total = trail.getTotalLength();
  const start = from > 0 ? lengthAt(from) : 0;
  const stops = [...svg.querySelectorAll('.stop')]
    .filter((s) => s.dataset.i >= Math.floor(from / CLIMB_STEP) && s.dataset.i < Math.floor(to / CLIMB_STEP))
    .map((s) => (s.classList.add('fresh'), [s, lengthAt((+s.dataset.i + 1) * CLIMB_STEP)]));
  trail.style.strokeDasharray = `${total} ${total}`;
  countUp($('climbPoints').querySelector('.n'), from, to, 1200, digits);
  const k = scroll.clientWidth / CLIMB_W;
  const ms = Math.min(2400, 1000 + (to - from) * 3);
  const hops = Math.max(2, Math.round((total - start) / 60));
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / ms);
    const l = start + (total - start) * (1 - (1 - t) ** 3);
    const p = trail.getPointAtLength(l);
    cube.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - Math.abs(Math.sin(t * Math.PI * hops)) * 9 * (1 - t)).toFixed(1)})`);
    trail.style.strokeDashoffset = `${total - l}`;
    scroll.scrollTop = p.y * k - scroll.clientHeight * 0.55;
    for (const [s, at] of stops) if (l >= at - 0.5 && !s.classList.contains('pop')) s.classList.replace('fresh', 'pop');
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// A few words in the middle of the screen for a moment.
let sayTimer = 0;
function say(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => ($('toast').hidden = true), 1600);
}

// An element shakes, as the guide box does at a tap it did not ask for.
function shake(el) {
  el.classList.remove('nudge');
  void el.offsetWidth; // restart the shake
  el.classList.add('nudge');
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

// A world's name as the player sees it, without its gimmick: 한국 · 짝 → 한국.
function shortName(key) {
  return WORLDS[key].name.split(' · ')[0];
}

// The home screen, with 이어서 하기 back into the stage the player left (if it is
// still going).
function showHome() {
  closeWorld();
  closeShopPage();
  $('clear').hidden = true;
  game.screen = 'home';
  styleBars();
  renderHome();
  $('home').hidden = false;
  showTab('home');
  showGift();
}

// Into the game: the home screen and the menu put away.
function play() {
  closeWorld();
  $('home').hidden = true;
  game.screen = 'play';
  styleBars();
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
    text.append(node('b', '', '이어서 하기'), node('small', '', `${shortName(game.world)} · ${game.stage ? `스테이지 ${game.stage}` : '튜토리얼'}`));
    back.append(flagOf(game.world), text);
    back.onclick = play;
    body.append(back);
  }
  // The groups as chapters Ⅰ to Ⅳ, each a winding path of worlds (laid out by layoutOrbs).
  for (const tier of [0, 1, 2, 3]) {
    const need = TIER_STARS[tier];
    const open = tierOpen(progress, tier);
    const head = node('div', 'chapter');
    const name = node('b', '', `${'ⅠⅡⅢⅣ'[tier]} · ${GROUPS[tier]}`);
    if (tier) name.append(node('span', 'stars', '★'.repeat(tier)));
    const note = !tier ? '기본 규칙 익히기' : !need ? '처음부터' : open ? `별 ${need}개 · 열림` : `🔒 별 ${need - total}개 더 · 개발 중에는 열려 있음`;
    head.append(node('i'), name, node('i'));
    const path = node('div', 'orb-path');
    for (const key of Object.keys(WORLDS)) if (WORLDS[key].tier === tier) path.append(worldOrb(key, !open));
    body.append(head, node('p', 'chapter-note', note), path);
  }
  body.scrollTop = 0;
}

// A world as a glowing orb: a window onto the bottom of its picture (scenery.js) under
// its sky, a ring that fills with the stages cleared, and its name and stars below.
function worldOrb(key, locked = false) {
  const w = WORLDS[key];
  const n = w.stages.length;
  const done = clearedCount(progress, key);
  const orb = node('button', `world-orb${game.playing && key === game.world ? ' current' : ''}${locked ? ' locked' : ''}`);
  orb.style.setProperty('--bob', `${(-Math.random() * 4.4).toFixed(2)}s`); // the orbs bob out of step
  const ball = node('span', 'orb-ball');
  ball.style.background = themeOf(key).background;
  ball.innerHTML = scenery(key, 375, 812).replace('viewBox="0 0 375 812"', 'viewBox="0 470 375 342" preserveAspectRatio="xMidYMax slice"');
  orb.append(ball);
  const arc = done ? `<circle class="orb-done" cx="50" cy="50" r="47" stroke-dasharray="${((295.3 * done) / n).toFixed(1)} 400" transform="rotate(-90 50 50)"/>` : '';
  orb.insertAdjacentHTML('beforeend', `<svg class="orb-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47"/>${arc}</svg>`);
  const foot = node('span', 'orb-foot');
  if (w.tier) foot.append(node('span', 'stars', locked && !done ? '🔒' : starText(starsOf(progress, key))), ' ');
  foot.append(`${done}/${n}`);
  orb.append(node('b', 'orb-name', shortName(key)), foot);
  orb.setAttribute('aria-label', `${shortName(key)}, ${done}/${n} 클리어${w.tier ? `, 별 ${starsOf(progress, key)}개` : ''}${locked ? ', 잠김' : ''}`);
  orb.onclick = () => openWorld(key);
  return orb;
}

// Each chapter's orbs along a winding path: rows that snake left to right and back,
// every other column a little lower, joined by a dotted line. It needs the screen's
// width, so it runs once the home screen shows, and again on a resize.
function layoutOrbs() {
  for (const path of $('home').querySelectorAll('.orb-path')) {
    const width = path.clientWidth;
    if (!width) continue;
    const orbs = [...path.querySelectorAll('.world-orb')];
    const cols = Math.max(3, Math.min(6, Math.floor(width / 112)));
    const cell = width / cols;
    const at = orbs.map((orb, i) => {
      const row = Math.floor(i / cols);
      const col = row % 2 ? cols - 1 - (i % cols) : i % cols;
      const x = (col + 0.5) * cell;
      const y = row * 142 + (col % 2) * 36;
      orb.style.left = `${x - 52}px`;
      orb.style.top = `${y}px`;
      return [x, y + 46];
    });
    path.style.height = `${Math.max(...at.map(([, y]) => y)) + 90}px`;
    let trail = path.querySelector('.orb-trail');
    if (!trail) {
      trail = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      trail.setAttribute('class', 'orb-trail');
      trail.setAttribute('aria-hidden', 'true');
      path.prepend(trail);
    }
    trail.innerHTML = at.length > 1 ? `<path d="M${at.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L')}"/>` : '';
  }
}

// A world's page (2026-11-04, the user's pick of dist/samples/world.html 안 B), from the
// home screen's orbs or a stage's title; from the generator, the home screen. Its sky and
// landmarks (scenery.js) stay behind while its stages, round buttons in its colour once
// cleared, wind up a path from the tutorial; a pin stands on the stage to play (the one
// being played, else the first not cleared) and the view starts there. Over it: the way
// back, the flag and name, the stars, and a bar with a star at each stage that earns one.
let worldOn = '';
function openWorld(key = game.world) {
  if (key === 'free') return showHome();
  $('worldPage').hidden = false;
  showWorld(key);
}
const closeWorld = () => ($('worldPage').hidden = true);

// A colour (#rrggbb) moved part of the way to another.
const mixColor = (a, b, k) => `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')}`;
const STEP_Y = 92; // between stages along the path
function showWorld(key) {
  worldOn = key;
  const w = WORLDS[key];
  const n = w.stages.length;
  const page = $('worldPage');
  const { background, accent } = themeOf(key);
  page.style.background = background;
  page.style.cssText += `;--acc:${accent};--acc-l:${mixColor(accent, '#ffffff', 0.32)};--acc-d:${mixColor(accent, '#000000', 0.22)};--acc-g:${accent}88`;
  $('worldBg').innerHTML = scenery(key, page.clientWidth, page.clientHeight);
  $('worldPageFlag').innerHTML = worldIcon(key);
  $('worldPageName').textContent = shortName(key);
  const done = clearedCount(progress, key);
  $('worldPageSub').innerHTML = `${w.tier ? `<span class="stars">${starText(starsOf(progress, key))}</span> · ` : ''}${done} / ${n}`;
  $('worldBar').innerHTML =
    `<i style="width:${(100 * done) / n}%"></i>` + (w.tier ? STAR_AT.map((s) => `<span class="star" style="left:${(100 * s) / n}%">${done >= s ? ICON.starOn : ICON.starOff}</span>`).join('') : '');

  // The path: the tutorial at the bottom (0), then stages 1 to n swinging side to side,
  // dotted, and drawn in the world's colour as far as the stages are cleared in a row.
  const map = $('worldMap');
  const width = map.clientWidth;
  const height = 120 + n * STEP_Y + 210;
  const swing = Math.min(110, width / 2 - 48);
  const at = Array.from({ length: n + 1 }, (_, k) => [width / 2 + swing * Math.sin(k * 0.9), height - 120 - k * STEP_Y]);
  const line = (to) => at.slice(0, to + 1).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  let run = 0;
  while (run < n && isCleared(progress, key, run + 1)) run++;
  const path = $('worldPath');
  path.style.height = `${height}px`;
  path.innerHTML = `<svg width="${width}" height="${height}" aria-hidden="true"><path d="${line(n)}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 14" opacity="0.95"/>${
    run ? `<path d="${line(run)}" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>` : ''
  }</svg>`;
  const first = Array.from({ length: n }, (_, i) => i + 1).find((s) => !isCleared(progress, key, s)) ?? n;
  const here = game.playing && key === game.world ? game.stage : tutorialDone(key) ? first : 0;
  const place = (el, [x, y]) => Object.assign(el.style, { left: `${x.toFixed(1)}px`, top: `${y.toFixed(1)}px` });
  const go = (s) => () => {
    play();
    loadStage(key, s);
  };
  // The tutorial comes before stage 1, and can be played again any time.
  const tutDone = tutorialDone(key);
  const tut = node('button', `tut-btn${here === 0 ? ' here' : ''}`);
  tut.innerHTML = `${ICON.play}튜토리얼${tutDone ? `<i class="ok">${ICON.check}</i>` : ''}`;
  tut.setAttribute('aria-label', `튜토리얼${tutDone ? ', 끝냄' : ''}`);
  tut.onclick = go(0);
  const tutAt = node('span', 'tut-at');
  tutAt.append(tut);
  place(tutAt, at[0]);
  path.append(tutAt);
  for (let s = 1; s <= n; s++) {
    const cleared = isCleared(progress, key, s);
    const b = node('button', `node${cleared ? ' done' : ''}${s === here ? ' here' : ''}`, s);
    if (w.tier && STAR_AT.includes(s)) b.insertAdjacentHTML('beforeend', `<span class="badge">${cleared ? ICON.starOn : ICON.starOff}</span>`);
    if (DEV) b.title = `예상 오답 ${STAGE_SEEDS[key][s - 1].wrong}회`;
    b.setAttribute('aria-label', `스테이지 ${s}${cleared ? ', 클리어' : ''}${game.playing && key === game.world && s === game.stage ? ', 지금 스테이지' : ''}`);
    b.onclick = go(s);
    place(b, at[s]);
    path.append(b);
  }
  const pin = node('span', 'wp-pin');
  pin.innerHTML = ICON.pin;
  place(pin, at[here]);
  path.append(pin);
  map.scrollTop = at[here][1] - map.clientHeight * 0.55;
}

const SLIDERS = ['N', 'minLen', 'maxLen', 'straight', 'fill', 'block', 'deep', 'wrap', 'long', 'amount'];
const PERCENT = ['straight', 'fill', 'block', 'deep', 'wrap', 'long', 'amount'];

function readPanel() {
  const v = (id) => Number($(id).value);
  const minLen = v('minLen');
  return {
    shape: $('shape').value || null,
    // A sculpture keeps the stage's own form, else grows from the seed.
    ...($('shape').value === 'sculpt' ? { form: game.params?.form ?? (v('seed') || 1), blocks: game.params?.blocks ?? 24 } : {}),
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
  $('shape').value = p.shape ?? '';
  sizeSlider();
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

// On a solid the size slider sets the grid cells along a block's edge.
function sizeSlider() {
  const solid = !!$('shape').value;
  $('nLabel').textContent = solid ? '블록 한 변 칸 수' : '격자 크기 (한 면 N×N)';
  $('N').min = solid ? 2 : 3;
  $('N').max = solid ? 10 : 16;
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
// A new shape starts at the size it is drawn at best (the cube at the gimmick default).
$('shape').onchange = () => {
  sizeSlider();
  $('N').value = $('shape').value ? (SHAPES[$('shape').value]?.u ?? 3) : GIMMICK_DEFAULTS.N;
  showSliderValues();
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
$('worldBtn').onclick = () => openWorld();
$('homeBtn').onclick = showHome;
// A world's page goes back to what was under it, the home screen or the stage; so does Escape.
$('worldBack').innerHTML = ICON.back;
$('worldBack').onclick = closeWorld;
addEventListener('keydown', (e) => e.key === 'Escape' && (closeWorld(), closeShopPage()));

// The generator panel's shapes, easy to hard.
const LEVEL = { easy: '쉬움', medium: '보통', hard: '어려움' };
for (const [key, { name, level }] of Object.entries(SHAPES)) $('shape').append(new Option(`${name} (${LEVEL[level]})`, key));
$('shape').append(new Option('자동 조형 (나라 스테이지)', 'sculpt'));
for (const [key, { name, country }] of Object.entries(LANDMARKS)) $('shape').append(new Option(`${name} (${WORLDS[country].name.split(' · ')[0]} 랜드마크)`, key));
// The generator panel's gimmick list, from the worlds (by tier).
for (const key of [...COUNTRIES].sort((a, b) => WORLDS[a].tier - WORLDS[b].tier)) {
  $('gimmick').append(new Option(`${WORLDS[key].name} — ${WORLDS[key].about}`, key));
}
// Coins and items: the bar under the cube, the note while erasing, the shop.
$('eraseIcon').innerHTML = ICON.eraser;
$('eraseCancel').innerHTML = ICON.close;
$('hintBtn').onclick = useHint;
$('eraserBtn').onclick = startErase;
$('eraseCancel').onclick = stopErase;
$('coins').onclick = openShopPage;
$('homeCoins').onclick = () => showTab('shop');
$('shopBack').innerHTML = ICON.back;
$('shopBack').onclick = closeShopPage;
// The home screen's tabs and the daily gift's box.
for (const [id, tab, icon] of [['tabShop', 'shop', ICON.stall], ['tabHome', 'home', ICON.house], ['tabClimb', 'climb', ICON.rocket]]) {
  $(id).querySelector('i').innerHTML = icon;
  $(id).onclick = () => showTab(tab);
}
$('giftBtn').insertAdjacentHTML('afterbegin', ICON.gift);
$('giftBtn').onclick = openGift;
// Purchases: paid out as they come, and Play's prices into the shop once it has them.
startBilling({ coins: paidCoins, noAds: paidNoAds, change: renderShop });
newSeason();

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
    $(id).innerHTML = isMuted() ? ICON.soundOff : ICON.soundOn;
    $(id).title = isMuted() ? '효과음 켜기' : '효과음 끄기';
    $(id).setAttribute('aria-label', $(id).title);
  }
};
$('homeBtn').innerHTML = ICON.house;
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
  if (!$('home').hidden) layoutOrbs();
  if (!$('worldPage').hidden) showWorld(worldOn);
  if (game.puz && Math.abs(thickness() - game.thick) > 0.01) {
    game.thick = thickness();
    redrawAll();
  }
}
addEventListener('resize', resize);
resize();

// Handle for poking at the game from the browser console.
window.arrowCube = { game, wallet, pick, tap, camera, box, raycaster, screenOf, world };

loadStage('home', 1);
requestAnimationFrame(frame);
// Ready: the loading screen (index.html) fills its bar and shows 눌러서 시작.
window.splash?.ready();
