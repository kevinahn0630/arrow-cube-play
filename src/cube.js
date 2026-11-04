// Surface topology of the cube and of solids built from blocks, and the puzzle
// generator. Pure logic, no rendering; the rules for playing a generated puzzle live in
// rules.js.
//
// Coordinates are doubled so every cell center is an integer point: on the cube a face
// lies on x, y or z = 0 or 2N, and its cell centers use odd values 1..2N-1 on the other
// two axes.

import { solve, newState, blockAt } from './rules.js';

export function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const axisOf = (v) => (v[0] ? 0 : v[1] ? 1 : 2);
const key = (p) => p.join(',');

// Gimmicks a generated puzzle can carry (see rules.js for how each one plays).
//   gate   — 🇨🇳 a key arrow holds a gate cell shut until it leaves
//   pair   — 🇰🇷 two linked arrows only leave together
//   mirror — 🇫🇷 mirror cells turn a passing arrow by 90°
//   bell   — 🇬🇧 guard cells of two colours; the bell swaps which colour is closed
//   discus — 🇬🇷 a discus arrow's way out runs over one cube edge onto the next face
//   aurora — 🇨🇦 a curtain lets only its own colour through, and lifts once every
//            arrow of that colour is gone
//   wall   — 🇩🇪 Berlin walls: a wall stands in the way until as many arrows as its
//            number have left from its face
//   tunnel — 🇹🇷 a path entering one tunnel mouth comes out of the other
//   sundial — 🇪🇬 obelisks cast shadows no path can cross; the player turns the sun
//   lasso  — 🇺🇸 a lasso arrow pulls the first arrow in its way out along with it
//   dial   — 🇲🇽 3×3 dials the player turns a quarter at a time, arrows and all
//   boomerang — 🇦🇺 a boomerang's way out turns back at the face edge, one lane over,
//            and leaves by the opposite edge
//   canal  — 🇮🇹 a path entering a canal flows along it and carries on straight
//            from its end
//   diagonal — 🇮🇳 some heads point diagonally; their way out runs corner-wise
//   vine   — 🇧🇷 a vine (a strand of cells) blocks until the machete arrow whose way
//            out crosses it leaves and cuts it down
//   lantern — 🇹🇭 a lantern casts a winding shadow round its head until it leaves:
//            only lanterns show in the dark (their ways out are beams of light), and
//            an arrow wholly in the dark cannot be tapped
//   ice    — 🇷🇺 Siberian ice: a frozen arrow can only leave once no other arrow
//            touches it
//   samurai — 🇯🇵 a samurai cuts through the first arrow in its way out (not its
//            head): that arrow's cells from the cut to its tail fall away
//   mondrian — 🇳🇱 Mondrian panels: a way out may run into a panel only while no
//            other arrow sits in it
//   encierro — 🇪🇸 a bull tapped while something stands in its way charges up to it
//            instead of bumping, and its tail clears the cells it leaves
export const GIMMICKS = [
  'gate', 'pair', 'mirror', 'bell', 'discus', 'aurora', 'wall', 'tunnel', 'sundial', 'lasso', 'dial',
  'boomerang', 'canal', 'diagonal', 'vine', 'lantern', 'ice', 'samurai', 'mondrian', 'encierro',
];

// Keys and pairs are told apart by colour, so a puzzle holds at most this many
// links: one colour each. The game's palette has exactly this many colours.
export const MAX_LINKS = 8;

// The surface of a solid made of unit blocks [x, y, z] joined face to face, each
// block `u` grid cells along an edge (the cube is one block: makeCube). Every block
// face not against another block is cut into u×u cells. Coordinates are doubled as
// for the cube: block v spans 2u·v to 2u·(v + 1) on each axis, so a cell centre is
// even across its face and odd along it.
//
// Besides the cube's outer edges, blocks standing on a face make inner corners, where
// the face meets a wall. A step over either is `wrapped`: a way out ends at both (an
// arrow leaves an inner corner straight on, through the wall), and a discus climbing
// on goes up the wall as it goes round an outer edge.
export function makeSolid(blocks, u) {
  const lo = [0, 1, 2].map((k) => Math.min(...blocks.map((v) => v[k])));
  const voxels = blocks.map((v) => v.map((x, k) => x - lo[k]));
  const size = [0, 1, 2].map((k) => 1 + Math.max(...voxels.map((v) => v[k])));
  const solid = new Set(voxels.map(key));
  const has = (v) => solid.has(key(v));
  const cells = [];
  const index = new Map();
  for (const v of voxels) {
    for (let a = 0; a < 3; a++) {
      for (const s of [1, -1]) {
        const n = [0, 0, 0];
        n[a] = s;
        if (has(add(v, n))) continue;
        const b = (a + 1) % 3;
        const c = (a + 2) % 3;
        for (let i = 0; i < u; i++) {
          for (let j = 0; j < u; j++) {
            const p = [0, 0, 0];
            p[a] = 2 * u * (v[a] + (s > 0 ? 1 : 0));
            p[b] = 2 * u * v[b] + 2 * i + 1;
            p[c] = 2 * u * v[c] + 2 * j + 1;
            index.set(key(p), cells.length);
            cells.push({ id: cells.length, p, n });
          }
        }
      }
    }
  }
  // The cell centred on p whose face looks along n, if there is one.
  const cellAt = (p, n) => {
    const id = index.get(key(p));
    return id !== undefined && dot(cells[id].n, n) === 1 ? id : undefined;
  };

  // Move one cell from `id` along tangent `t`. Where the face ends, the step lands on
  // the face round an outer edge, travelling away from the old face, or on the wall at
  // an inner corner, travelling up it. Where two blocks only meet along an edge, it
  // keeps to its own block. Generating takes steps very often, so each (cell, tangent)
  // is worked out once; the results are shared, so callers must not change them.
  const steps = [];
  function step(id, t) {
    const ax = axisOf(t);
    const k = 6 * id + 2 * ax + (t[ax] > 0 ? 0 : 1);
    if (steps[k]) return steps[k];
    const { p, n } = cells[id];
    const edge = add(p, t);
    const flat = cellAt(add(edge, t), n);
    const down = scale(n, -1);
    const outer = flat === undefined ? cellAt(add(edge, down), t) : undefined;
    steps[k] =
      flat !== undefined
        ? { id: flat, dir: t, wrapped: false }
        : outer !== undefined
          ? { id: outer, dir: down, wrapped: true }
          : { id: cellAt(add(edge, n), scale(t, -1)), dir: n, wrapped: true, inner: true };
    return steps[k];
  }

  // Exit path of a head moving along `d`: the cells it crosses, nearest first, the
  // direction it finally leaves a face in, and `jumps`: the ray indices reached
  // through a tunnel rather than by a step. On the way, mirror cells (cell → diagonal
  // vector) turn it, canal cells (cell → flow direction) send it along the flow, and
  // a tunnel mouth (cell → other mouth) moves it to the other mouth. Arrows leave
  // where the face ends, except that the path may carry on over `wraps` edges first
  // (a discus), or a boomerang (`boomerang`: the side to come back on) turns back one
  // lane over. A diagonal `d` runs corner-wise within the face. null if the path
  // never gets out.
  const longest = (2 * cells.length) / 3; // 4·N² on the cube
  function trace(id, d, { mirrors, tunnels, canals, wraps = 0, boomerang = null } = {}) {
    const ray = [];
    const jumps = [];
    let cur = id;
    let dir = d;
    if (d.filter(Boolean).length === 2) {
      for (;;) {
        const next = cellAt(add(cells[cur].p, scale(d, 2)), cells[cur].n);
        if (next === undefined) return { ray, exitDir: d, jumps };
        ray.push(next);
        cur = next;
      }
    }
    for (let guard = 0; guard <= longest; guard++) {
      const r = step(cur, dir);
      if (r.wrapped && boomerang) {
        const s = step(cur, boomerang);
        if (s.wrapped) return null;
        ray.push(s.id);
        cur = s.id;
        dir = scale(dir, -1);
        boomerang = null;
        continue;
      }
      if (r.wrapped && wraps-- <= 0) return { ray, exitDir: dir, jumps };
      if (r.wrapped) dir = r.dir;
      ray.push(r.id);
      cur = r.id;
      const m = mirrors?.get(r.id);
      if (m) dir = add(scale(m, dot(dir, m)), scale(dir, -1));
      dir = canals?.get(r.id) ?? dir;
      const exit = tunnels?.get(r.id);
      if (exit !== undefined) {
        ray.push(exit);
        jumps.push(ray.length - 1);
        cur = exit;
      }
    }
    return null;
  }

  // The four directions along a cell's face, the same for every cell of a face pair
  // (shared too: not to be changed).
  const tangentsBy = [0, 1, 2].map((ax) => {
    const out = [];
    for (let k = 0; k < 3; k++) {
      if (k === ax) continue;
      for (const s of [1, -1]) {
        const t = [0, 0, 0];
        t[k] = s;
        out.push(t);
      }
    }
    return out;
  });
  const tangents = (id) => tangentsBy[axisOf(cells[id].n)];

  // Faces: the flat stretches of surface, numbered in cell order (on the cube +x, −x,
  // +y, −y, +z, −z), each with its plane: the normal, and where it crosses that axis.
  const faceIds = new Int32Array(cells.length).fill(-1);
  const planes = [];
  for (const { id, p, n } of cells) {
    if (faceIds[id] >= 0) continue;
    faceIds[id] = planes.length;
    const todo = [id];
    while (todo.length) {
      const c = todo.pop();
      for (const t of tangents(c)) {
        const r = step(c, t);
        if (r.wrapped || faceIds[r.id] >= 0) continue;
        faceIds[r.id] = planes.length;
        todo.push(r.id);
      }
    }
    planes.push({ n, at: p[axisOf(n)] });
  }
  const faceOf = (id) => faceIds[id];
  // The way a cell's face looks, numbered like the cube's faces.
  const sideOf = (id) => {
    const { n } = cells[id];
    const a = axisOf(n);
    return 2 * a + (n[a] > 0 ? 0 : 1);
  };

  // Whether a cell shows from far off in each of the 8 corner directions (difficulty.js
  // views, in the order x, y, z each + then −): its face looks that way and no block
  // stands in front of it. Worked out for a direction the first time it is asked. A
  // cell no corner sees past the blocks (the middle of the floor between a U's arms)
  // shows from those its face looks toward: a player turns the solid until it does.
  const corners = [];
  for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) corners.push([x, y, z]);
  const shown = [];
  const look = (v) => (shown[v] ??= Uint8Array.from(cells, (c) => dot(c.n, corners[v]) > 0 && clear(c.p, corners[v])));
  let blind;
  function seen(view, id) {
    if (look(view)[id]) return true;
    blind ??= Uint8Array.from(cells, (c, i) => corners.every((d, v) => !look(v)[i]));
    return blind[id] === 1 && dot(cells[id].n, corners[view]) > 0;
  }
  // Whether the line from surface point p along d (each ±1) meets no block: it is
  // followed from one block boundary it crosses to the next.
  function clear(p, d) {
    const m = 2 * u;
    for (let t = 0; ; ) {
      let next = Infinity;
      for (let k = 0; k < 3; k++) {
        const x = p[k] + t * d[k];
        const bound = d[k] > 0 ? (Math.floor(x / m) + 1) * m : (Math.ceil(x / m) - 1) * m;
        next = Math.min(next, (bound - p[k]) / d[k]);
      }
      const v = p.map((x, k) => Math.floor((x + ((t + next) / 2) * d[k]) / m));
      if (v.some((x, k) => x < 0 || x >= size[k])) return true;
      if (has(v)) return false;
      t = next;
    }
  }

  return {
    // N: the side of a cube with as many cells, which sizes gimmicks
    N: Math.round(Math.sqrt(cells.length / 6)),
    u,
    voxels,
    size, // blocks along x, y and z
    convex: voxels.length === size[0] * size[1] * size[2], // a box: no face hides another
    cells,
    index,
    count: cells.length,
    faces: planes.length,
    planes,
    step,
    trace,
    tangents,
    faceOf,
    sideOf,
    seen,
  };
}

export const makeCube = (N) => makeSolid([[0, 0, 0]], N);

// Builds arrows in reverse play order: each new arrow's exit path must be clear of
// every arrow placed before it. Removing them last-placed-first then always works,
// so every generated puzzle is solvable. After that, fillGaps fills the space left
// with arrows whose way out may be blocked, each checked to keep the puzzle solvable.
// Each gimmick keeps the promise:
//   gate   — the gate cell is placed as an extra cell of its key, so it only ever
//            blocks arrows placed before the key (removed after it)
//   pair   — the second arrow is placed right after the first, clear of its path
//   mirror — mirrors are fixed before arrows, so paths are known at placement
//   bell   — a path may cross guards of one colour only; the bell can always open it
//   discus — only the path's shape changes
//   aurora — a path may cross another colour's curtain only while no arrow of that
//            colour has been placed yet: all of them are placed later, so they are
//            gone (and the curtain lifted) by the time this arrow leaves
//   tunnel — only the path's shape changes
//   sundial — shadows do not depend on the arrows, so a path just has to keep clear
//            of them under at least one position of the sun
//   lasso  — knots: an arrow, then a "bull" sitting on its exit path whose own path
//            crosses it (the two block each other for good), then a lasso whose
//            path crosses exactly one of the two. Only the lasso can break the knot;
//            pulling is never a waste (a lasso fires only when one arrow is left in
//            its way, the one it could ever pull), so the greedy solver stays valid
//   samurai — knots too: an arrow, then one whose way out crosses its body (not its
//            head, which no blade cuts) and whose own body lies across the first
//            one's way out (the two block each other for good), then a samurai whose
//            way out first meets the first arrow at or nearer its head than every
//            cell the other crosses, so the cut takes those away (and nothing else
//            may stand on the samurai's way). A cut only ever takes cells away, so the
//            greedy solver stays valid
//   dial   — arrows are placed with the dials at rest, and the puzzle starts with
//            them turned
//   boomerang, diagonal — only the path's shape changes
//   canal  — canals are fixed before arrows, like mirrors
//   vine   — like a gate: the strand is placed as extra cells of its machete, so it
//            only blocks arrows placed before the machete
//   lantern — a lantern is kept only if the puzzle stays solvable with its dark, so
//            no arrow hidden in the dark is ever needed out of the way before some
//            lantern can light it (the dark only ever lifts, so the solver decides it)
//   ice    — a frozen arrow is placed only where no earlier arrow touches it (those
//            are still there when it leaves); the cells round it count as part of
//            its way out (`extra`), so later arrows sit there and it waits on them
//   encierro — stampedes: a bull whose way out no other path crosses (so where it
//            charges to never blocks anyone: charging is never a waste), an arrow
//            standing on that way, and then an arrow whose way out crosses only the
//            bull's tail, the part a charge clears. That last arrow cannot leave until
//            the bull has charged. Nothing else may sit on the stretch it charges over.
//   wall   — walls are fixed before arrows and paths may cross them; each wall's
//            number is set at the end from how many arrows can leave its face while
//            it stands (countWalls), so it always falls, and with every wall down
//            the puzzle is a plain one
//   mondrian — a way out may not run into a panel an earlier arrow sits in (that
//            arrow is still there when this one leaves). The cells of the panels a
//            way out runs into count as part of it (`extra`), so blocking, chains and
//            gap fillers' loop check all see what a panel holds up
//
// `block` (0..1) makes puzzles harder: each placement tries several candidates and
// keeps the one lying across the most exit paths of earlier arrows, so fewer arrows
// start free and more of them wait on one another.
// `deep` (0..1) makes them wait on one another in longer chains that run across
// faces: more candidates, and extra credit for standing in the way of arrows nothing
// blocks yet, at the end of the longest chains, with their heads on other faces, and
// for long ways out of its own (which later arrows can then block). It also keeps out
// most arrows whose way out is under three cells: those sit at a face edge, free from
// the start, and were most of the arrows a player could take right away.
// `wrap` (0..1) makes bodies prefer crossing cube edges, and with `block` also
// favours long, edge-crossing candidates, so arrows get harder to follow by eye.
// `long` (0..1) favours long bodies: more credit for length when picking a candidate,
// and gap fillers picked as the longest of a few rather than the first that fits.
// `amount` (0..1) sets how much of the gimmick appears.
//
// Tiles (mirrors, guards, curtains, gates) are spread over the cube: no face ever holds more
// than a quarter of them (at least one is always allowed), and no two gates touch.
export function generate(
  cube,
  { seed, minLen, maxLen, straight, fill, block = 0, deep = 0, wrap = 0, long = 0, gimmick = null, amount = 0.5 },
) {
  const rnd = rng32(seed);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const occ = new Int32Array(cube.count).fill(-1);
  const fixed = new Uint8Array(cube.count); // tile cells (mirrors, guards, curtains, walls, …): no body may sit there
  const rayOwners = Array.from({ length: cube.count }, () => []);
  // How the arrows so far wait on one another: the earlier arrows each one stands in
  // the way of, how many later arrows stand in its own way, and the longest chain of
  // arrows waiting one behind another that it heads (itself included).
  const under = [];
  const blockedBy = [];
  const height = [];
  const headFaces = []; // the face each arrow's head is on
  const mirrors = new Map(); // cell → diagonal vector in the face plane
  const guards = new Map(); // cell → colour 0 or 1
  const curtains = new Map(); // cell → aurora colour
  const tunnels = new Map(); // tunnel mouth → the other mouth
  const tints = []; // arrows of each aurora colour
  const arrows = [];
  const goal = Math.floor(cube.count * fill);
  const tries = 1 + Math.round(block * 12 + deep * 12);
  let budget = cube.count * (40 + 8 * (tries - 1));
  let filled = 0;
  let hues = 0;
  const tilesOnFace = new Int32Array(cube.faces);
  let tiles = 0;
  // Whether one more tile fits on cell c's face without that face going over a
  // quarter of all tiles.
  const roomOnFace = (c) => tilesOnFace[cube.faceOf(c)] < Math.max(1, Math.ceil((tiles + 1) / 4));
  const addTile = (c) => {
    tilesOnFace[cube.faceOf(c)]++;
    tiles++;
  };

  // Aurora: two colours on small cubes, three later; curtain cells and arrows of each
  // colour in step with the cube's size and `amount`.
  const colours = gimmick === 'aurora' ? (amount < 0.55 ? 2 : 3) : 0;
  const tintQuota = 1 + Math.round(cube.count * 0.01 * amount);
  for (let k = 0; k < colours; k++) tints.push(0);
  if (colours) {
    const want = colours * (2 + Math.round(cube.count * 0.012 * amount));
    for (let k = 0; k < want * 20 && tiles < want; k++) {
      const c = Math.floor(rnd() * cube.count);
      if (fixed[c] || !roomOnFace(c)) continue;
      fixed[c] = 1;
      curtains.set(c, tiles % colours);
      addTile(c);
    }
  }

  // How much of each gimmick: counts grow with `amount`, and those not capped by the
  // solver or by the colours also grow with the cube, so the gimmick's share of a
  // puzzle rises from stage to stage.
  // Tunnels and canals take one face each, two on bigger cubes. Tunnels come two more
  // than canals at every amount (user request 2026-11-02: lean on them more).
  const perFace = cube.N >= 9 ? 2 : 1;
  if (gimmick === 'tunnel') addTunnels(Math.min(6 * perFace, 2 + Math.round(amount * 10)));
  const sundial = gimmick === 'sundial' ? makeSundial() : null;
  const canals = new Map(); // cell → flow direction
  if (gimmick === 'canal') makeCanals(Math.min(6 * perFace, 1 + Math.round(amount * 9)));
  // Berlin walls, as many as canals.
  const walls = gimmick === 'wall' ? makeWalls(Math.min(6 * perFace, 1 + Math.round(amount * 9))) : null;
  const wallOf = new Map(); // wall cell → its wall
  walls?.forEach((w, k) => w.cells.forEach((c) => wallOf.set(c, k)));
  // Mondrian panels, covering from about a twelfth of the cube to a third of it.
  const panels = gimmick === 'mondrian' ? makePanels(cube.count * (0.08 + 0.27 * amount)) : null;
  const panelOf = new Map(); // panel cell → its panel
  panels?.forEach((p, k) => p.cells.forEach((c) => panelOf.set(c, k)));
  const dials = gimmick === 'dial' ? makeDials(1 + Math.round(amount * 4)) : null;
  let dialArrows = 0;
  let knots = 0;
  let vines = 0;
  let stampedes = 0;
  const stampedeGoal = gimmick === 'encierro' ? Math.max(1, Math.round(cube.count * 0.024 * amount)) : 0;
  const reserved = new Set(); // bulls' ways out: no other path may cross them
  // Vines: half as many again as at first, and longer (addVine), since the world played
  // too easy (2026-11-02).
  const vineGoal = gimmick === 'vine' ? 1 + Math.round(cube.count * 0.035 * amount) : 0;
  const knotGoal = gimmick === 'lasso' || gimmick === 'samurai' ? Math.max(1, Math.round(cube.count * 0.02 * amount)) : 0;
  // Frozen arrows, spread through the build too (fewer fit later on, as few places
  // with nothing round them are left).
  const iceGoal = gimmick === 'ice' ? Math.max(1, Math.round(cube.count * 0.015 * amount)) : 0;
  let ices = 0;
  // Pairs and keys (one colour each), spread through the build like knots.
  const linkGoal = gimmick === 'pair' || gimmick === 'gate' ? Math.min(MAX_LINKS, Math.max(1, Math.round(cube.count * 0.012 * amount))) : 0;

  // Crossing gimmick cells counts towards picking a candidate, more on later stages.
  // The dials lie across so many ways out by themselves on a small cube that early
  // stages steer round them.
  const usesWeight = gimmick === 'dial' ? 14 * amount - 4 : 2 + 8 * amount;
  // How hard the build works at making arrows wait on other faces, so that a face lets
  // only two or three arrows out before others elsewhere have to go: arrows that leave
  // straight off an edge are dropped, some candidates bridge over from another face,
  // and picks and gap fillers count which faces they hold (bestOf, fillGaps). Full
  // from about the middle stages on.
  const turn = Math.min(1, 1.5 * deep);
  // Clocked worlds (sundial, dial, bell): the switch moves on one step each time an
  // arrow leaves, so the arrow placed j-th (in reverse play order) leaves with it at
  // (−j) mod its period, and the start setting is fixed at the end to match. `stepNow`
  // is that setting for the arrow being placed now.
  const period = gimmick === 'bell' ? 2 : gimmick === 'sundial' || gimmick === 'dial' ? 4 : 0;
  const stepNow = () => (period - (arrows.length % period)) % period;
  // The arrows placed first are the last ones left on the cube. With a sun or a bell,
  // the arrows placed until the cube is a fifth full are calm: their way out crosses
  // no shadow of any sun and no guard, so they may leave whatever the switch says.
  // Near the end there is then nearly always one to take while the others wait for
  // their turn, and a player who takes the gimmick arrows while their way is open
  // and keeps the plain ones for later almost never runs into a dead end. Dials get
  // stuck rarely enough without. Big Ben keeps fewer calm arrows (an eighth) so that
  // more of its arrows wait on the guards (2026-11-02).
  const calmUntil = gimmick === 'sundial' ? goal * 0.2 : gimmick === 'bell' ? goal * 0.12 : 0;
  // Who stands on cell c when the arrow placed now leaves: with clocked dials, dial
  // arrows turned with their dials to that step.
  let dialView = null;
  let dialViewAt = -1;
  const ownerNow = (c) => {
    if (!dials) return occ[c];
    if (dialViewAt !== arrows.length) {
      dialViewAt = arrows.length;
      dialView = new Map();
      arrows.forEach((a, i) => {
        if (a.dial >= 0) for (const x of a.cells) dialView.set(turnCell(dials[a.dial], x, stepNow()), i);
      });
    }
    const o = occ[c];
    return o >= 0 && arrows[o].dial < 0 ? o : (dialView.get(c) ?? -1);
  };
  // Cells of the switch and path gimmicks, and the curtains, that plain arrows may be
  // aimed through. (Without them a bridge, which seldom crosses a curtain, would take
  // the aurora's place on later stages.)
  const aims = [
    ...(dials ?? []).flatMap((d) => d.ring),
    ...canals.keys(),
    ...tunnels.keys(),
    ...curtains.keys(),
    ...wallOf.keys(),
    ...panelOf.keys(),
  ];

  // Mirrors, and Big Ben's guards (more of them than mirrors, so more ways out run
  // through one).
  if (gimmick === 'mirror' || gimmick === 'bell') {
    const want = Math.round(cube.count * (gimmick === 'bell' ? 0.2 : 0.12) * amount);
    for (let k = 0; k < want * 20 && tiles < want; k++) {
      const c = Math.floor(rnd() * cube.count);
      if (fixed[c] || !roomOnFace(c)) continue;
      fixed[c] = 1;
      addTile(c);
      if (gimmick === 'mirror') {
        const [u, v] = cube.tangents(c).filter((t) => t.some((x) => x > 0));
        mirrors.set(c, add(u, scale(v, rnd() < 0.5 ? 1 : -1)));
      } else {
        guards.set(c, rnd() < 0.5 ? 0 : 1);
      }
    }
    // Arrows are aimed through guards like through the switch and path gimmicks.
    if (gimmick === 'bell') aims.push(...guards.keys());
  }

  // The cells that must be empty for arrow o to leave: its way out and `extra`, the
  // rest of any panel it runs into or the cells round a frozen arrow.
  const needs = (o) => (arrows[o].extra.length ? [...arrows[o].ray, ...arrows[o].extra] : arrows[o].ray);
  // Whether something stands in arrow o's way now, and something whose head is on
  // another face.
  const faceOfHead = (o) => headFaces[o];
  const heldNow = (o) => needs(o).some((c) => occ[c] >= 0 && occ[c] !== o);
  const heldAcrossNow = (o) => needs(o).some((c) => occ[c] >= 0 && occ[c] !== o && faceOfHead(occ[c]) !== faceOfHead(o));
  // The cells where a way out from `from` runs into a panel from outside it.
  const intoPanels = (from, ray) => ray.filter((c, k) => panelOf.has(c) && panelOf.get(c) !== panelOf.get(k ? ray[k - 1] : from));

  while (filled < goal && budget > 0) {
    // On later stages more arrows are aimed through a dial, canal, tunnel mouth,
    // guard, wall or panel, so that more ways out run into the gimmick; through
    // tunnels many from the first stage on.
    const aim = aims.length > 0 && rnd() < (gimmick === 'tunnel' ? 0.35 + 0.6 * amount : 0.7 * amount);
    // With `turn`, some candidates are bridges: their body lies across the way out of an
    // arrow nothing on another face holds yet, from a head on another face.
    const loose = [];
    if (turn) for (let o = 0; o < arrows.length; o++) if (arrows[o].ray.length && !heldAcrossNow(o)) loose.push(o);
    const bridge = () => (loose.length && rnd() < 0.6 * turn ? { bridge: pick(arrows[pick(loose)].ray) } : null);
    const best = bestOf(() => grow(null, aim ? { aim } : bridge()));
    if (!best) continue;
    const a = place(best);
    // Keep the dials filling at the same pace as the cube, up to most of each dial's
    // ring.
    while (dials && dialArrows < dials.length * (2 + 5 * amount) * (filled / goal) && addDialArrow());
    // Knots likewise, spread through the build.
    if (knots < knotGoal * (filled / goal)) addKnot(a);
    if (ices < iceGoal * (filled / goal)) addIce();
    if (vines < vineGoal * (filled / goal)) addVine(a);
    if (stampedes < stampedeGoal * (filled / goal)) addStampede();

    if (hues >= linkGoal * (filled / goal)) continue;
    if (gimmick === 'pair') {
      const mate = bestOf(() => grow(arrows[a].ray), 20);
      if (mate) {
        const b = place(mate);
        arrows[a].partner = b;
        arrows[b].partner = a;
        arrows[a].hue = arrows[b].hue = hues++;
      }
    } else if (gimmick === 'gate') {
      // A key shuts more gates of its colour on bigger stages.
      addGate(a, 1 + Math.round(amount * 3));
    }
  }
  fillGaps();
  // A clocked switch starts where the last arrow placed (the first to leave) needs it.
  const startStep = period ? (((1 - arrows.length) % period) + period) % period : 0;
  if (sundial) sundial.start = startStep;
  let dialOf = null;
  let dialOcc = null;
  if (dials) {
    // Dial arrows live in dialOcc (by their resting cells), not in occ; each knows its
    // way out for every turn of its dial, and the dials start turned.
    dialOf = new Map();
    dialOcc = new Int32Array(cube.count).fill(-1);
    dials.forEach((d, k) => {
      const all = [d.centre, ...d.ring];
      for (const c of all) dialOf.set(c, k);
      d.unturn = [0, 1, 2, 3].map((r) => new Map(all.map((c) => [turnCell(d, c, r), c])));
    });
    arrows.forEach((ar, i) => {
      if (ar.dial < 0) return;
      for (const c of ar.cells) {
        dialOcc[c] = i;
        occ[c] = -1;
      }
      const d = dials[ar.dial];
      ar.poses = [0, 1, 2, 3].map((r) => {
        const cells = ar.cells.map((c) => turnCell(d, c, r));
        const dir = turnDir(d, ar.dir, r);
        return { cells, dir, ...cube.trace(cells.at(-1), dir) };
      });
    });
    for (const d of dials) d.start = startStep;
  }
  const puz = {
    cube, arrows, occ, mirrors, guards, curtains, tints, tunnels, canals, sundial, dials, dialOf, dialOcc,
    bellStart: guards.size ? startStep : 0,
    walls, wallOf, panels, panelOf, darkOf: null, beams: null, gimmick,
  };
  if (walls) countWalls(puz);
  if (gimmick === 'lantern') {
    // More lanterns as stages get harder (one at amount 0.1, six at 1), whose shadows
    // together cover from about a tenth of the cube to over a third of it (80% of what
    // they first did, which played too hard: 2026-11-02).
    const n = Math.max(1, Math.min(6, 1 + Math.round(amount * 5)));
    addLanterns(puz, n, Math.round((cube.count * (0.12 + 0.33 * amount) * 0.8) / n));
  }
  return puz;

  // Canals: runs of three cells or more (longer on bigger cubes), `perFace` to a face,
  // turning now and then. Each cell sends a path on to the next; the last one sends it
  // straight on.
  function makeCanals(n) {
    const used = new Map(); // face → canals on it
    let made = 0;
    for (let k = 0; k < n * 40 && made < n; k++) {
      let cur = Math.floor(rnd() * cube.count);
      const face = cube.faceOf(cur);
      if ((used.get(face) ?? 0) >= perFace || fixed[cur]) continue;
      let dir = pick(cube.tangents(cur));
      const run = [cur];
      const flows = [];
      const want = 3 + Math.floor(rnd() * (2 + cube.N * 0.4));
      while (run.length < want) {
        if (run.length > 1 && rnd() < 0.35) dir = pick(cube.tangents(cur).filter((t) => !dot(t, dir)));
        const r = cube.step(cur, dir);
        if (r.wrapped || fixed[r.id] || run.includes(r.id)) break;
        flows.push(dir);
        run.push(r.id);
        cur = r.id;
      }
      if (run.length < 3) continue;
      flows.push(flows.at(-1));
      run.forEach((c, i) => {
        fixed[c] = 1;
        canals.set(c, flows[i]);
      });
      used.set(face, (used.get(face) ?? 0) + 1);
      made++;
    }
  }

  // Berlin walls: straight runs of three cells or more (longer on bigger cubes),
  // `perFace` to a face. No body may sit on one; ways out cross them while the cube is
  // built (countWalls sets when each one falls).
  function makeWalls(n) {
    const out = [];
    const used = new Map(); // face → walls on it
    for (let k = 0; k < n * 40 && out.length < n; k++) {
      const first = Math.floor(rnd() * cube.count);
      const face = cube.faceOf(first);
      if ((used.get(face) ?? 0) >= perFace) continue;
      const t = pick(cube.tangents(first));
      const want = 3 + Math.floor(rnd() * (1 + cube.N / 4));
      const cells = [first];
      while (cells.length < want) {
        const r = cube.step(cells.at(-1), t);
        if (r.wrapped) break;
        cells.push(r.id);
      }
      if (cells.length < want || cells.some((c) => fixed[c])) continue;
      for (const c of cells) fixed[c] = 1;
      used.set(face, (used.get(face) ?? 0) + 1);
      out.push({ cells, face, count: 0 });
    }
    return out;
  }

  // Each wall falls once its face has let out `count` arrows. The walls fall in a
  // random order, each at as many as can leave its face with the walls before it down
  // and itself and those after it standing (the solver says how many), so the
  // numbers on one face differ and every wall is sure to fall; with them all down the
  // rest is a plain puzzle. Walls no way out crosses, or with nothing able to leave
  // their face first, are left out.
  function countWalls(puz) {
    const crossed = new Set(arrows.flatMap((a) => a.ray.filter((c) => wallOf.has(c)).map((c) => wallOf.get(c))));
    const order = walls.filter((_, k) => crossed.has(k));
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(rnd() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }
    for (const w of walls) w.count = Infinity;
    const kept = [];
    for (const w of order) {
      const left = new Int32Array(6);
      for (const l of solve(puz).layers) for (const i of l.arrows) left[cube.faceOf(arrows[i].cells.at(-1))]++;
      if (!left[w.face]) continue;
      w.count = left[w.face];
      kept.push(w);
    }
    walls.splice(0, walls.length, ...kept);
    wallOf.clear();
    walls.forEach((w, k) => w.cells.forEach((c) => wallOf.set(c, k)));
  }

  // Mondrian panels: rectangles two cells or more on a side (up to five on the biggest
  // cubes), apart from one another (they may touch, in different colours), until they
  // cover about `area` cells. Arrows sit in them like anywhere else.
  function makePanels(area) {
    const out = [];
    const taken = new Set();
    const most = 2 + Math.floor(cube.N / 4);
    let covered = 0;
    for (let k = 0; k < 400 && covered < area; k++) {
      const corner = Math.floor(rnd() * cube.count);
      const [u, , v] = cube.tangents(corner);
      const w = 2 + Math.floor(rnd() * (most - 1));
      const h = 2 + Math.floor(rnd() * (most - 1));
      const P = cube.cells[corner].p;
      const cells = [];
      for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) cells.push(cube.index.get(add(P, add(scale(u, 2 * a), scale(v, 2 * b))).join(',')));
      if (cells.some((c) => c === undefined || taken.has(c))) continue;
      for (const c of cells) taken.add(c);
      const near = new Set(cells.flatMap((c) => cube.tangents(c).map((t) => cube.step(c, t).id)));
      const touching = new Set(out.filter((p) => p.cells.some((c) => near.has(c))).map((p) => p.hue));
      const hue = [0, 1, 2].map((j) => (out.length + j) % 3).find((h) => !touching.has(h)) ?? out.length % 3;
      out.push({ cells, hue });
      covered += cells.length;
    }
    return out;
  }

  // Sundial: obelisks (tiles) and, for each of the four sun positions, the cells in
  // shadow: each obelisk and the cells away from the sun on its face, out to the
  // edge. The sun goes round in turn, so the shadows sweep round too.
  function makeSundial() {
    const want = 1 + Math.round(cube.count * 0.012 * amount);
    const len = cube.N;
    const obelisks = [];
    for (let k = 0; k < want * 30 && obelisks.length < want; k++) {
      const c = Math.floor(rnd() * cube.count);
      if (fixed[c] || !roomOnFace(c)) continue;
      fixed[c] = 1;
      addTile(c);
      obelisks.push(c);
    }
    const shadows = [0, 2, 1, 3].map((t) => {
      const shade = new Set();
      for (const o of obelisks) {
        shade.add(o);
        let cur = o;
        for (let j = 0; j < len; j++) {
          const r = cube.step(cur, cube.tangents(o)[t]);
          if (r.wrapped) break;
          shade.add(r.id);
          cur = r.id;
        }
      }
      return shade;
    });
    return { obelisks, shadows, start: 0 };
  }

  // Dials: 3×3 blocks on faces of their own. The centre is the hub the player taps;
  // arrows ride the ring of eight cells round it.
  function makeDials(n) {
    const out = [];
    const used = new Set();
    for (let k = 0; k < n * 40 && out.length < n; k++) {
      const centre = Math.floor(rnd() * cube.count);
      const face = cube.faceOf(centre);
      if (used.has(face)) continue;
      const [u, , v] = cube.tangents(centre);
      const P = cube.cells[centre].p;
      const ring = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].map(([a, b]) =>
        cube.index.get(add(add(P, scale(u, 2 * a)), scale(v, 2 * b)).join(',')),
      );
      if (ring.some((c) => c === undefined || cube.faceOf(c) !== face) || [centre, ...ring].some((c) => fixed[c])) continue;
      for (const c of [centre, ...ring]) fixed[c] = 1;
      used.add(face);
      out.push({ centre, ring, n: cube.cells[centre].n, start: 0 });
    }
    return out;
  }

  // Cell c of dial d after r quarter turns, and a direction turned the same way. A
  // quarter turn is clockwise as seen from outside the cube.
  function turnCell(d, c, r) {
    const P = cube.cells[d.centre].p;
    let rel = cube.cells[c].p.map((x, i) => x - P[i]);
    for (let k = 0; k < r; k++) rel = cross(rel, d.n);
    return cube.index.get(add(P, rel).join(','));
  }
  function turnDir(d, dir, r) {
    for (let k = 0; k < r; k++) dir = cross(dir, d.n);
    return dir;
  }

  // One short arrow (one or two cells) on a free spot of a dial's ring, if one fits.
  function addDialArrow() {
    for (let t = 0; t < 24; t++) {
      const d = Math.floor(rnd() * dials.length);
      const head = dials[d].ring[Math.floor(rnd() * 8)];
      const dir = pick(cube.tangents(head));
      if (occ[head] >= 0) continue;
      const way = cube.trace(head, dir);
      // It leaves with its dial turned to this arrow's step: that way out must be clear.
      const r = stepNow();
      const off = cube.trace(turnCell(dials[d], head, r), turnDir(dials[d], dir, r));
      if (off.ray.some((c) => ownerNow(c) >= 0)) continue;
      const tail = cube.step(head, scale(dir, -1)).id;
      const long = dials[d].ring.includes(tail) && occ[tail] < 0 && rnd() < 0.5;
      place({ body: long ? [tail, head] : [head], dir, ...way, dial: d });
      dialArrows++;
      return true;
    }
    return false;
  }

  // Tunnels: pairs of mouths on one face, at least two cells apart, `perFace` pairs to
  // a face. Mouths are not tiles for the spread rule; no body may sit on one.
  function addTunnels(pairs) {
    const used = new Map(); // face → pairs on it
    let made = 0;
    for (let k = 0; k < pairs * 40 && made < pairs; k++) {
      const a = Math.floor(rnd() * cube.count);
      const b = Math.floor(rnd() * cube.count);
      const face = cube.faceOf(a);
      if ((used.get(face) ?? 0) >= perFace || cube.faceOf(b) !== face || fixed[a] || fixed[b]) continue;
      const p = cube.cells[a].p;
      const q = cube.cells[b].p;
      if (Math.max(...p.map((v, i) => Math.abs(v - q[i]))) < 4) continue;
      fixed[a] = fixed[b] = 1;
      tunnels.set(a, b).set(b, a);
      used.set(face, (used.get(face) ?? 0) + 1);
      made++;
    }
  }


  function bestOf(make, n = tries) {
    let best = null;
    let bestScore = -Infinity;
    // Arrows nothing stands in the way of yet, by the face their head is on.
    const freeOn = new Int32Array(cube.faces);
    if (turn) for (let o = 0; o < arrows.length; o++) if (!heldNow(o)) freeOn[faceOfHead(o)]++;
    for (let t = 0; t < n && budget > 0; t++, budget--) {
      const cand = make();
      if (!cand) continue;
      const owners = new Set();
      for (const c of cand.body) for (const o of rayOwners[c]) owners.add(o);
      // With `deep`, standing in the way of arrows nothing else blocks yet, at the end
      // of the longest chains, and with their heads on other faces counts extra.
      let open = 0;
      let top = 0;
      let across = 0;
      const face = cube.faceOf(cand.body.at(-1));
      // With `turn`: being the first arrow from another face in an arrow's way counts
      // extra; standing alone in the way of one on its own face (taking it out would
      // free the next one there) and leaving its face with more than three free arrows
      // count against.
      let first = 0;
      let alone = 0;
      let freed = 0;
      for (const o of owners) {
        if (!blockedBy[o]) open++;
        top = Math.max(top, height[o]);
        if (faceOfHead(o) !== face) across++;
        if (!turn) continue;
        const otherFace = heldAcrossNow(o);
        if (faceOfHead(o) !== face) first += otherFace ? 0 : 1;
        else {
          if (!otherFace) alone++;
          if (!heldNow(o)) freed++;
        }
      }
      const crowd = turn ? Math.max(0, freeOn[face] + 1 - freed - 3) : 0;
      const score =
        owners.size + cand.ray.length + wrap * (3 * cand.crossings + 0.3 * cand.body.length) + usesWeight * cand.uses +
        3 * long * cand.body.length +
        deep * (5 * open + top + 4 * across + 2 * cand.ray.length) +
        6 * turn * (first - alone - 2 * crowd);
      if (score > bestScore) {
        best = cand;
        bestScore = score;
      }
    }
    return best;
  }

  function place({
    body, dir, ray, exitDir, jumps = [], disc = false, tint = -1, lasso = false, samurai = false, dial = -1,
    boom = null, diag = false, run = false, ice = false, extra = [],
  }) {
    const i = arrows.length;
    const below = [...new Set(body.flatMap((c) => rayOwners[c]))];
    under.push(below);
    blockedBy.push(0);
    for (const o of below) blockedBy[o]++;
    height.push(1 + Math.max(0, ...below.map((o) => height[o])));
    headFaces.push(cube.faceOf(body.at(-1)));
    for (const c of body) occ[c] = i;
    for (const c of ray) rayOwners[c].push(i);
    for (const c of extra) rayOwners[c].push(i);
    if (tint >= 0) tints[tint]++;
    arrows.push({
      cells: body, dir, ray, exitDir, jumps, gates: [], partner: -1, hue: -1, disc, tint, lasso, samurai, dial, knot: -1, boom, diag,
      machete: false, lantern: false, run, ice, extra,
    });
    filled += body.length;
    return i;
  }

  // Shut up to `count` gates behind key arrow `k`: each time the empty cell crossed by
  // the most earlier exit paths, on a face with room and not next to (or diagonal
  // from) another gate.
  function addGate(k, count) {
    const own = new Set(arrows[k].ray);
    for (let g = 0; g < count; g++) {
      const gates = arrows.flatMap((a) => a.gates).map((c) => cube.cells[c].p);
      const touchesGate = (c) => {
        const p = cube.cells[c].p;
        return gates.some((q) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])) <= 2);
      };
      let best = -1;
      for (let c = 0; c < cube.count; c++) {
        if (occ[c] >= 0 || fixed[c] || own.has(c) || !rayOwners[c].length) continue;
        if (!roomOnFace(c) || touchesGate(c)) continue;
        if (best < 0 || rayOwners[c].length > rayOwners[best].length) best = c;
      }
      if (best < 0) break;
      addTile(best);
      occ[best] = k;
      arrows[k].gates.push(best);
    }
    if (arrows[k].gates.length) arrows[k].hue = hues++;
  }

  // A vine cut by machete arrow a: a strand of 4–8 empty cells on one face, starting
  // on a's way out, picked (of a few tries) to lie across the most earlier exit paths.
  // Its cells count as a's, like a gate.
  function addVine(a) {
    const own = arrows[a].ray;
    if (!own.length) return;
    let best = null;
    let bestScore = 0;
    for (let t = 0; t < 12; t++) {
      let cur = pick(own);
      const strand = [cur];
      const want = 4 + Math.floor(rnd() * 5);
      let dir = pick(cube.tangents(cur));
      for (let k = 0; k < 20 && strand.length < want; k++) {
        if (rnd() < 0.3) dir = pick(cube.tangents(cur));
        const r = cube.step(cur, dir);
        if (r.wrapped || occ[r.id] >= 0 || fixed[r.id] || own.includes(r.id) || strand.includes(r.id)) continue;
        strand.push(r.id);
        cur = r.id;
      }
      if (strand.length < 3) continue;
      const blocked = new Set(strand.flatMap((c) => rayOwners[c]).filter((o) => o !== a));
      if (blocked.size > bestScore) {
        best = strand;
        bestScore = blocked.size;
      }
    }
    if (!best) return;
    for (const c of best) occ[c] = a;
    arrows[a].gates.push(...best);
    arrows[a].machete = true;
    vines++;
  }

  // Lanterns: arrows from the middle of the build, so other arrows stand in their way
  // and the player has to dig a lantern out before its shadow lifts. Each casts a
  // shadow of up to `size` cells spreading from its head (see spreadShadow), a group of
  // its own: shadows keep a cell apart, so the dark lies in separate patches and each
  // patch shows which lantern lifts it. A lantern's way out is
  // a beam of light through any shadow, so whatever stands in a lantern's way always
  // shows at least in part. `darkOf`: cell → lanterns whose shadow darkens it; `beams`:
  // the lantern way cells a shadow would have covered. A lantern is kept only if it
  // cannot leave at the start, its shadow hides at least one more arrow completely and
  // the heads of at least three more, and the whole puzzle stays solvable (nothing
  // hidden is ever needed out of the way before some lantern can light it).
  function addLanterns(puz, n, size) {
    const shadows = new Map(); // lantern → the cells its shadow spreads over
    const darkOf = (puz.darkOf = new Map());
    const beams = (puz.beams = new Map());
    const rebuild = () => {
      const ways = new Set([...shadows.keys()].flatMap((L) => arrows[L].ray));
      darkOf.clear();
      beams.clear();
      for (const [L, cells] of shadows) {
        for (const c of cells) {
          const m = ways.has(c) ? beams : darkOf;
          m.set(c, [...(m.get(c) ?? []), L]);
        }
      }
    };
    const hidden = () => arrows.filter((a) => !a.lantern && a.cells.every((c) => darkOf.has(c))).length;
    const heads = () => arrows.filter((a) => !a.lantern && darkOf.has(a.cells.at(-1))).length;
    let lit = 0;
    for (let t = 0; t < n * 20 && lit < n; t++) {
      const L = Math.floor(arrows.length * (0.2 + 0.5 * rnd()));
      if (arrows[L].lantern) continue;
      // Cells in or next to another shadow: this one may not reach them.
      const apart = new Set();
      for (const cells of shadows.values()) {
        for (const c of cells) {
          apart.add(c);
          for (const t of cube.tangents(c)) apart.add(cube.step(c, t).id);
        }
      }
      if (apart.has(arrows[L].cells.at(-1))) continue;
      const before = [hidden(), heads()];
      arrows[L].lantern = true;
      shadows.set(L, spreadShadow(arrows[L].cells.at(-1), size, apart));
      rebuild();
      const stuck = blockAt(puz, newState(puz), L);
      if (stuck && hidden() > before[0] && heads() >= before[1] + 3 && solve(puz).solvable) {
        lit++;
        continue;
      }
      arrows[L].lantern = false;
      shadows.delete(L);
      rebuild();
    }
  }

  // A shadow of up to `size` cells round a head: short winding walks, mostly from
  // anywhere in the shadow so far (it thickens) and sometimes on from its newest cell
  // (it reaches out in fingers), crossing cube edges like any path, and stopping short
  // of the cells in `apart`.
  function spreadShadow(head, size, apart) {
    const cells = [head];
    const seen = new Set(cells);
    for (let t = 0; t < size * 10 && cells.length < size; t++) {
      let cur = cells[rnd() < 0.3 ? cells.length - 1 : Math.floor(rnd() * cells.length)];
      let dir = pick(cube.tangents(cur));
      for (let k = 2 + Math.floor(rnd() * 4); k > 0 && cells.length < size; k--) {
        const r = cube.step(cur, dir);
        if (apart.has(r.id)) break;
        cur = r.id;
        dir = rnd() < 0.25 ? pick(cube.tangents(cur)) : r.dir;
        if (seen.has(cur)) continue;
        seen.add(cur);
        cells.push(cur);
      }
    }
    return cells;
  }

  // Gaps: once arrows with a clear way out stop fitting, fill the space left with
  // arrows whose way out may run into arrows already there. With `deep` the filler is
  // more often one that does (it waits on others rather than starting free). A filler is kept only if it leaves no
  // loop of arrows each waiting on the next: nothing it runs into may wait, however
  // indirectly, on an arrow it stands in the way of. Where pairs, lassos, samurais,
  // bulls or curtains change who waits on whom, the solver checks each filler instead.
  // Dial arrows count where they rest.
  function fillGaps() {
    const bySolver = ['pair', 'lasso', 'samurai', 'encierro', 'aurora'].includes(gimmick);
    const waits = arrows.map((a, i) => new Set(needs(i).map((c) => occ[c]).filter((o) => o >= 0 && o !== i)));
    const loops = (ahead, behind) => {
      const seen = new Set();
      const stack = [...ahead];
      while (stack.length) {
        const o = stack.pop();
        if (behind.has(o)) return true;
        if (seen.has(o)) continue;
        seen.add(o);
        stack.push(...waits[o]);
      }
      return false;
    };
    const snapshot = () => ({
      cube, arrows, occ, mirrors, guards, curtains, tints, tunnels, canals, sundial, dials: null,
      dialOf: null, dialOcc: null, walls: null, wallOf: null, panels, panelOf,
      darkOf: null, beams: null, gimmick,
    });
    // Fillers at least `shortest` cells long, until `tries` attempts in a row fail.
    // With `turn`, a filler held by an arrow whose head is on another face, or holding one
    // there that nothing on another face holds yet, counts for it; holding one on its
    // own face that nothing elsewhere holds counts against. Free fillers (nothing could
    // ever hold them) are left out when a held one is wanted, except in clocked worlds,
    // whose fillers all have a clear way out.
    const crossScore = (cand, ahead, behind) => {
      if (!turn) return 0;
      const f = cube.faceOf(cand.body.at(-1));
      let score = [...ahead].some((o) => faceOfHead(o) !== f) ? 2 : 0;
      for (const o of behind) if (!heldAcrossNow(o)) score += faceOfHead(o) !== f ? 1 : -1;
      return score;
    };
    const pass = (shortest, tries) => {
      for (let misses = 0; filled < goal && misses < tries; ) {
        const empty = [];
        for (let c = 0; c < cube.count; c++) if (occ[c] < 0 && !fixed[c]) empty.push(c);
        if (empty.length < 2) break;
        let free = null;
        let held = null;
        const wantHeld = rnd() < deep;
        // Without `long`, take the first held filler, or the first free one unless a
        // held one is wanted. With it, look at a few that fit and keep the longest.
        const enough = 1 + Math.round(long * 7) + (turn ? 4 : 0);
        let seen = 0;
        for (let t = 0; t < 40 + Math.round(long * 40); t++) {
          if (!long && !turn ? held || (free && !wantHeld) : seen >= enough && (held || !wantHeld)) break;
          const cand = grow(null, { fill: empty, shortest });
          if (!cand) continue;
          const ahead = period ? new Set() : new Set([...cand.ray, ...cand.extra].map((c) => occ[c]).filter((o) => o >= 0));
          const behind = new Set(cand.body.flatMap((c) => rayOwners[c]));
          if (loops(ahead, behind)) continue;
          seen++;
          const found = { cand, ahead, behind, score: (long ? cand.body.length : 0) + 6 * turn * crossScore(cand, ahead, behind) };
          if (ahead.size) {
            if (!held || found.score > held.score) held = found;
          } else if (!free || found.score > free.score) {
            free = found;
          }
        }
        const pickd =
          wantHeld || !long ? (held ?? (turn && wantHeld && !period ? null : free)) : [held, free].filter(Boolean).sort((a, b) => b.cand.body.length - a.cand.body.length)[0];
        if (!pickd) {
          misses++;
          continue;
        }
        const i = place(pickd.cand);
        if (bySolver && !solve(snapshot()).solvable) {
          unplace(1);
          misses++;
          continue;
        }
        waits[i] = pickd.ahead;
        for (const b of pickd.behind) waits[b].add(i);
        misses = 0;
      }
    };
    // Longer fillers fit fewer gaps, so with `long` it keeps trying for longer; and
    // where arrows are five cells or more, a last pass lets three-cell fillers into the
    // gaps nothing longer fits.
    pass(minLen - 1, 4 + Math.round(long * 8));
    if (long && minLen - 1 > 3) pass(3, 4);
  }

  // Takes the last n arrows placed back off.
  function unplace(n) {
    for (let k = 0; k < n; k++) {
      const a = arrows.pop();
      for (const o of under.pop()) blockedBy[o]--;
      blockedBy.pop();
      height.pop();
      headFaces.pop();
      for (const c of a.cells) occ[c] = -1;
      for (const c of [...a.ray, ...a.extra]) rayOwners[c].pop();
      if (a.run) for (const c of a.ray) reserved.delete(c);
      filled -= a.cells.length;
    }
  }

  // A stampede: a bull, an arrow standing k ≥ 1 cells down its way out, and an arrow
  // waiting on the bull's last k cells (the ones a charge clears) whose body stands on
  // the blocker's way out. Without a charge the three hold each other up for good.
  // The k cells the bull charges over stay empty. Undone if any part does not fit.
  function addStampede() {
    const bull = bestOf(() => grow(null, { run: true }), 20);
    if (!bull) return;
    const b = place(bull);
    for (const c of arrows[b].ray) reserved.add(c);
    const blocker = bestOf(() => grow(null, { block: b }), 20);
    if (!blocker) return unplace(1);
    const h = place(blocker);
    const k = arrows[b].ray.findIndex((c) => occ[c] >= 0);
    if (k < 1) return unplace(2);
    const stretch = arrows[b].ray.slice(0, k);
    for (const c of stretch) fixed[c] = 1;
    // First try heads on the blocker's way out facing a line through the bull's tail;
    // then heads aimed back along a line through the tail, whose body happens to
    // stand on the blocker's way out.
    const tail = arrows[b].cells.slice(0, k);
    const starts = arrows[h].ray.flatMap((c) =>
      occ[c] >= 0 || fixed[c] ? [] : cube.tangents(c).filter((t) => cube.trace(c, t).ray.some((r) => tail.includes(r))).map((t) => [c, t]),
    );
    const waiter =
      (starts.length && bestOf(() => grow(null, { wait: { bull: b, k, hold: h, starts } }), 40)) ||
      bestOf(() => grow(null, { wait: { bull: b, k, hold: h } }), 150);
    if (!waiter) {
      for (const c of stretch) fixed[c] = 0;
      return unplace(2);
    }
    place(waiter);
    stampedes++;
  }

  // A head and direction whose way out runs back over `target`: a few cells away from
  // it along a line through it, on the same face (a way out ends at the face edge),
  // pointing at it.
  // A bridge over `target`: walk from it to the edge of its face and one to three
  // cells on over the next face; the head goes there, pointing on, so a body grown
  // straight back from it lies across the target. Returns [head, direction, body
  // cells from the head back to the target], or [] if the walk runs into anything.
  function bridgeAt(target) {
    let cur = target;
    let dir = pick(cube.tangents(target));
    let reach = 1;
    let over = 0;
    for (const stop = 1 + Math.floor(rnd() * 3); over < stop; reach++) {
      const r = cube.step(cur, dir);
      if (r.id === undefined || occ[r.id] >= 0 || fixed[r.id] || (r.wrapped && over)) return [];
      if (r.wrapped || over) over++;
      cur = r.id;
      dir = r.dir;
    }
    return [cur, dir, reach];
  }

  function aimAt(target) {
    const back = scale(pick(cube.tangents(target)), -1);
    let head = target;
    for (let s = 1 + Math.floor(rnd() * cube.N); s > 0; s--) {
      const r = cube.step(head, back);
      if (r.wrapped) break;
      head = r.id;
    }
    return [head, scale(back, -1)];
  }

  // A knot round arrow a: a bull on a's way out whose own way out crosses a, then a
  // lasso to pull one of the two. With samurais, an arrow whose way out crosses a's
  // body and whose body lies across a's way out, then a samurai to cut away every
  // cell of a that arrow's way out crosses (`from`: the one of them nearest a's head,
  // counted from its tail). Undone if no lasso or samurai fits.
  function addKnot(a) {
    const blades = gimmick === 'samurai';
    const bull = bestOf(() => grow(null, blades ? { tie: a } : { bull: a }), blades ? 60 : 20);
    if (!bull) return;
    const y = place(bull);
    const blade = blades && { arrow: a, from: Math.max(...arrows[y].ray.map((c) => arrows[a].cells.indexOf(c))) };
    const rope = bestOf(() => grow(null, blade ? { cut: blade } : { rope: [a, y] }), blades ? 80 : 40);
    if (!rope) return unplace(1);
    place(rope);
    arrows[a].knot = arrows[y].knot = knots++;
  }

  // A frozen arrow, if one fits anywhere with nothing round it yet.
  function addIce() {
    const ice = bestOf(() => grow(null, { ice: true }), 30);
    if (!ice) return;
    place(ice);
    ices++;
  }

  // One candidate arrow, or null. `avoid` lists cells the arrow must stay off (a
  // partner's exit path). `knot.bull`: the head sits on that arrow's way out and the
  // way out crosses it. `knot.rope`: a lasso aimed back along a line through one of
  // those arrows, crossing it and nothing else. `knot.cut`: a samurai aimed back along
  // a line through that arrow's cells from `from` on (not its head), meeting it there
  // first, so its cut takes away that cell and every one of it the way crosses after.
  // `knot.tie`: aimed back along a line through that arrow's body (not its head), its
  // way crossing that arrow and nothing else, and its body across that arrow's way.
  // `knot.run`: a bull, whose way out no earlier path crosses. `knot.block`: the head
  // sits on that bull's way out. `knot.wait`: crossing the bull's last k cells and
  // nothing else, with its body on the blocker's way out; started at one of `starts`
  // ([cell, direction]) if given, else aimed like a lasso. `knot.ice`: a frozen arrow,
  // with no arrow round it yet.
  function grow(avoid, knot = null) {
    let head = Math.floor(rnd() * cube.count);
    let dir;
    let reach = 0;
    if (knot?.bull !== undefined) {
      if (!arrows[knot.bull].ray.length) return null;
      head = pick(arrows[knot.bull].ray);
    }
    if (knot?.block !== undefined) head = pick(arrows[knot.block].ray.slice(1));
    if (knot?.fill) head = pick(knot.fill);
    if (knot?.wait?.starts) [head, dir] = pick(knot.wait.starts);
    if (knot?.rope || (knot?.wait && !knot.wait.starts)) {
      [head, dir] = aimAt(pick(knot.rope ? arrows[pick(knot.rope)].cells : arrows[knot.wait.bull].cells.slice(0, knot.wait.k)));
    } else if (knot?.cut) {
      [head, dir] = aimAt(pick(arrows[knot.cut.arrow].cells.slice(knot.cut.from, -1)));
    } else if (knot?.tie !== undefined) {
      [head, dir] = aimAt(pick(arrows[knot.tie].cells.slice(0, -1)));
    } else if (knot?.aim) {
      [head, dir] = aimAt(pick(aims));
    } else if (knot?.bridge !== undefined) {
      [head, dir, reach] = bridgeAt(knot.bridge);
    }
    if (head === undefined || occ[head] >= 0 || fixed[head] || avoid?.includes(head)) return null;
    dir ??= pick(cube.tangents(head));
    // The body comes in from behind `dir`; a diagonal head then turns half aside.
    let back = scale(dir, -1);
    // Only these gimmicks draw a side, so other puzzles keep their random stream.
    const side = gimmick === 'diagonal' || gimmick === 'boomerang' ? pick(cube.tangents(head).filter((t) => !dot(t, dir))) : null;
    const diag = gimmick === 'diagonal' && rnd() < 0.05 + amount * 0.6;
    if (diag) dir = add(dir, side);
    const boom = gimmick === 'boomerang' && rnd() < 0.05 + amount * 0.5 ? side : null;
    const disc = gimmick === 'discus' && rnd() < amount * 0.6;
    const lasso = !!knot?.rope;
    const samurai = !!knot?.cut;
    const path = cube.trace(head, dir, { mirrors, tunnels, canals, wraps: disc ? 1 : 0, boomerang: boom });
    if (!path || path.ray.includes(head)) return null;
    // Tunnels could send a path back over itself; keep those out.
    if (tunnels.size && new Set(path.ray).size < path.ray.length) return null;
    const { ray, exitDir, jumps } = path;
    // A way out of under three cells can hardly be stood in, so such an arrow would be
    // free from the start: with `turn` they are dropped (all of them from the middle
    // stages on).
    if (deep && (!knot || knot.aim) && ray.length < 3 && rnd() < turn) return null;
    // A lasso's, a samurai's or a bull's path crosses exactly one earlier arrow, one of
    // its knot (the lasso pulls it out, the samurai cuts it; the bull is stuck behind
    // it); any other path crosses none.
    const crossed = [...new Set(ray.map(ownerNow).filter((o) => o >= 0))];
    const mates =
      knot?.rope ??
      (knot?.bull !== undefined ? [knot.bull] : knot?.wait ? [knot.wait.bull] : knot?.cut ? [knot.cut.arrow] : knot?.tie !== undefined ? [knot.tie] : null);
    // A filler's way out may run into anything (fillGaps checks it).
    // In a clocked world fillers keep to the reverse order too: their way must be clear.
    if (!mates && (!knot?.fill || period > 0) && crossed.length > 0) return null;
    if (mates && (crossed.length !== 1 || !mates.includes(crossed[0]))) return null;
    // No blade cuts a head, so in a samurai's knot the other arrow keeps off its head.
    if (knot?.tie !== undefined && ray.includes(arrows[knot.tie].cells.at(-1))) return null;
    if (knot?.cut) {
      const own = arrows[knot.cut.arrow].cells;
      const at = own.indexOf(ray.find((c) => ownerNow(c) >= 0));
      if (at < knot.cut.from || at >= own.length - 1 || ray.some((c) => own.indexOf(c) > at)) return null;
    }
    if (knot?.wait) {
      const tail = new Set(arrows[knot.wait.bull].cells.slice(0, knot.wait.k));
      if (ray.some((c) => occ[c] === knot.wait.bull && !tail.has(c))) return null;
    }
    if (reserved.size && ray.some((c) => reserved.has(c))) return null;
    if (knot?.run && (ray.length < 2 || ray.some((c) => rayOwners[c].length))) return null;
    // Clear of the shadows of the sun where it will stand when this arrow leaves.
    if (sundial && ray.some((c) => sundial.shadows[stepNow()].has(c))) return null;
    // Into a panel only where no earlier arrow sits (it is still there when this one
    // leaves); a filler may wait on one like on anything in its way.
    const entries = panels ? intoPanels(head, ray) : [];
    const rooms = [...new Set(entries.flatMap((c) => panels[panelOf.get(c)].cells))].filter((c) => !ray.includes(c));
    if (!knot?.fill && rooms.some((c) => occ[c] >= 0)) return null;
    // Only guards that will stand open when this arrow leaves (the shut colour then is
    // the bell's setting at its step).
    if (guards.size && ray.some((c) => guards.get(c) === stepNow())) return null;
    // The calm arrows placed first keep off every shadow and every guard.
    if (filled < calmUntil && ray.some((c) => guards.has(c) || sundial?.shadows.some((sh) => sh.has(c)))) return null;
    // Coloured arrows only come in the last part of the build (they leave early), so
    // the many arrows placed before them may cross any curtain and wait for it to lift.
    let tint = -1;
    if (curtains.size) {
      const seen = new Set(ray.filter((c) => curtains.has(c)).map((c) => curtains.get(c)));
      if (filled >= goal * 0.6 && !knot?.fill) {
        const open = [...tints.keys()].filter((c) => tints[c] < tintQuota);
        if (seen.size === 1 && open.includes([...seen][0]) && rnd() < 0.7) tint = [...seen][0];
        else if (!seen.size && open.length && rnd() < 0.2) tint = pick(open);
      }
      for (const c of seen) if (c !== tint && tints[c] > 0) return null;
    }

    // Grow the body backwards from the head. It may not sit on its own exit path,
    // or the head would run into its own tail.
    const banned = new Set(ray);
    banned.add(head);
    if (avoid) for (const c of avoid) banned.add(c);
    const body = [head];
    // Fillers squeeze into gaps, so they may be shorter (`shortest`, two at least).
    const lo = knot?.fill ? Math.max(2, knot.shortest) : minLen;
    const want = Math.max(lo + Math.floor(rnd() * (maxLen - lo + 1)), reach);
    if (want > maxLen) return null;
    let cur = head;
    const open = (t) => {
      const r = cube.step(cur, t);
      return occ[r.id] < 0 && !fixed[r.id] && !banned.has(r.id) ? r : null;
    };
    let crossings = 0;
    while (body.length < want) {
      let next = open(back);
      // A bridge runs straight back until it lies across its target.
      if (body.length > 1 && !(knot?.bridge !== undefined && !body.includes(knot.bridge))) {
        const side = cross(cube.cells[cur].n, back);
        const turns = [open(side), open(scale(side, -1))].filter(Boolean);
        const edges = [next, ...turns].filter((r) => r && r.wrapped);
        if (edges.length && rnd() < wrap) next = pick(edges);
        else if (turns.length && (!next || rnd() > straight)) next = pick(turns);
      }
      if (!next) break;
      if (next.wrapped) crossings++;
      body.push(next.id);
      banned.add(next.id);
      cur = next.id;
      back = next.dir;
    }
    if (body.length < lo) return null;
    if (knot?.bridge !== undefined && !body.includes(knot.bridge)) return null;
    if (knot?.wait && !body.some((c) => arrows[knot.wait.hold].ray.includes(c))) return null;
    if (knot?.tie !== undefined && !body.some((c) => arrows[knot.tie].ray.includes(c))) return null;
    // A frozen arrow: nothing may touch it yet, and the cells round it (but on its way
    // out) are what it waits on besides.
    let around = [];
    if (knot?.ice) {
      const own = new Set(body);
      around = [...new Set(body.flatMap((c) => cube.tangents(c).map((t) => cube.step(c, t).id)))].filter((c) => !own.has(c));
      if (around.some((c) => occ[c] >= 0)) return null;
      around = around.filter((c) => !ray.includes(c));
    }
    // Tiles crossed (and, with a sundial, shadows crossed, or panels run into) make an
    // arrow more interesting, so they count towards picking it.
    const shaded = sundial ? sundial.shadows.filter((shade) => ray.some((c) => shade.has(c))).length : 0;
    const uses = ray.reduce((s, c) => s + fixed[c], 0) + shaded + entries.length;
    return {
      body: body.reverse(), dir, ray, exitDir, jumps, crossings, uses, disc, tint, lasso, samurai, boom, diag, run: !!knot?.run,
      ice: !!knot?.ice, extra: knot?.ice ? around : rooms.filter((c) => !body.includes(c)),
    };
  }
}
