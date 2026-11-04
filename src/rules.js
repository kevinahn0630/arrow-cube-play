// Play rules shared by the game, the solver and the virtual player. A puzzle comes
// from cube.js `generate`; a state is what changes while it is played.

export function newState(puz) {
  return {
    occ: Int32Array.from(puz.occ),
    bell: puz.bellStart ?? 0,
    // Arrows of each aurora colour still on the cube; a colour's curtains lift at 0.
    tints: [...puz.tints],
    // Where the sun stands (0..3), which way the obelisks' shadows fall.
    sun: puz.sundial?.start ?? 0,
    // How far each dial is turned (0..3 quarter turns), and which arrow rests on each
    // dial cell with its dial unturned.
    dials: puz.dials ? puz.dials.map((d) => d.start) : [],
    dialOcc: puz.dials ? Int32Array.from(puz.dialOcc) : null,
    // How many arrows have left from each face (the face their head was on): a Berlin
    // wall falls once its face's count reaches the wall's.
    gone: new Int32Array(puz.cube.faces),
    // How many cells each bull has charged forward.
    ran: new Int32Array(puz.arrows.length),
    // How many cells each arrow has lost off its tail end to samurais' cuts.
    cut: new Int32Array(puz.arrows.length),
  };
}

// A copy of state s to play on without changing s.
export const copyState = (s) => ({
  ...s,
  occ: Int32Array.from(s.occ),
  tints: [...s.tints],
  dials: [...s.dials],
  dialOcc: s.dialOcc && Int32Array.from(s.dialOcc),
  gone: Int32Array.from(s.gone),
  ran: Int32Array.from(s.ran),
  cut: Int32Array.from(s.cut),
});

// Arrow on cell c, or -1. Dial cells hold whichever arrow the dial has turned there.
export function ownerAt(puz, state, c) {
  const d = puz.dialOf?.get(c);
  if (d !== undefined) return state.dialOcc[puz.dials[d].unturn[state.dials[d]].get(c)];
  return state.occ[c];
}

// Where arrow i is now: { cells, dir, ray, exitDir, jumps }. Dial arrows turn with
// their dial, bulls move on as they charge, and an arrow a samurai has cut keeps only
// the cells on its head's side of the cut.
export function pose(puz, state, i) {
  const a = puz.arrows[i];
  if (a.dial >= 0) return a.poses[state.dials[a.dial]];
  if (a.run && state.ran[i]) {
    const r = state.ran[i];
    return { ...a, cells: [...a.cells, ...a.ray].slice(r, r + a.cells.length), ray: a.ray.slice(r) };
  }
  if (state.cut[i]) return { ...a, cells: a.cells.slice(state.cut[i]) };
  return a;
}

// First thing in the way of arrow i's exit path: { k, tile, o } where k is how many
// free cells lie before it, `tile` says it is a gate, vine, guard, curtain, shadow or
// wall (easy to see) rather than another arrow, and o is the arrow it belongs to (-1 for
// tiles of no arrow, and for a Mondrian panel: no tile either, since whether one is
// shut takes looking into it). A lasso arrow is not held up by the first arrow it meets: it
// pulls that one out along with it. A samurai cuts through the first arrow it meets,
// unless that is its head: the cut piece, from there to its tail, falls away, and
// only what is left in the way holds the samurai up. An arrow's own cells (a
// machete's vine) never block it. A frozen arrow with its way out clear is still held
// by any arrow touching it (`ice`, k 0: it does not move). An arrow wholly in the dark
// cannot be seen, so cannot be tapped at all. null when the way out is clear.
export function blockAt(puz, state, i) {
  if (inDark(puz, state, i)) return { k: 0, tile: true, o: -1 };
  const a = puz.arrows[i];
  const p = pose(puz, state, i);
  const first = blockOn(puz, state, i, p.ray, p.cells.at(-1));
  if (first || !a.ice) return first;
  for (const c of a.extra) {
    const o = ownerAt(puz, state, c);
    if (o >= 0 && o !== i) return { k: 0, tile: false, o, ice: true };
  }
  return null;
}

// Whether cell c lies in the dark: a lantern whose dark covers it is still on the cube.
export const darkCell = (puz, state, c) => !!puz.darkOf?.get(c)?.some((L) => state.occ[puz.arrows[L].cells.at(-1)] === L);

// Whether arrow i is hidden: in the dark from head to tail. Lanterns always show.
export const inDark = (puz, state, i) =>
  !!puz.darkOf && !puz.arrows[i].lantern && puz.arrows[i].cells.every((c) => darkCell(puz, state, c));

// What stops arrow i on way out `ray`, which starts next to cell `from` (its head).
function blockOn(puz, state, i, ray, from) {
  const { tint, lasso, samurai } = puz.arrows[i];
  const shadow = puz.sundial?.shadows[state.sun];
  let caught = -1;
  let cut = -1; // a samurai: where along the arrow it caught it cuts (its cells up to there fall away)
  for (let k = 0; k < ray.length; k++) {
    const c = ray[k];
    const o = ownerAt(puz, state, c);
    if (samurai && o >= 0 && o === caught) {
      // Past the cut, the arrow's head side still stands in the way.
      if (pose(puz, state, o).cells.indexOf(c) > cut) return { k, tile: false, o };
      continue;
    }
    if (o >= 0 && o !== caught && o !== i) {
      const gate = puz.arrows[o].gates.includes(c);
      if (samurai && caught < 0 && !gate) {
        const cells = pose(puz, state, o).cells;
        cut = cells.indexOf(c);
        if (cut < cells.length - 1) {
          caught = o;
          continue;
        }
      }
      if (!lasso || caught >= 0 || gate) return { k, tile: gate, o };
      caught = o;
    }
    if (o >= 0) continue;
    if (puz.guards.get(c) === state.bell) return { k, tile: true, o: -1 };
    const curtain = puz.curtains.get(c);
    if (curtain !== undefined && curtain !== tint && state.tints[curtain] > 0) return { k, tile: true, o: -1 };
    if (shadow?.has(c)) return { k, tile: true, o: -1 };
    const wall = puz.wallOf?.get(c);
    if (wall !== undefined && state.gone[puz.walls[wall].face] < puz.walls[wall].count) return { k, tile: true, o: -1 };
    // A way out may run into a panel from outside only while no other arrow sits in it.
    const panel = puz.panelOf?.get(c);
    if (
      panel !== undefined &&
      panel !== puz.panelOf.get(k ? ray[k - 1] : from) &&
      puz.panels[panel].cells.some((x) => state.occ[x] >= 0 && state.occ[x] !== i)
    ) {
      return { k, tile: false, o: -1 };
    }
  }
  return null;
}

// The arrow a lasso arrow i would pull out with it, and how many cells along its
// path it first meets it, or null.
export function caughtBy(puz, state, i) {
  if (!puz.arrows[i].lasso) return null;
  const { ray } = pose(puz, state, i);
  for (let k = 0; k < ray.length; k++) {
    const o = ownerAt(puz, state, ray[k]);
    if (o >= 0) return { arrow: o, k };
  }
  return null;
}

// The arrow a samurai i would cut on its way out, `at` how many of that arrow's cells
// (counted from its tail) fall away less one, and `k` how many cells along its path
// the cut is; or null. The first arrow on its way, unless that is the arrow's head.
export function cutBy(puz, state, i) {
  if (!puz.arrows[i].samurai) return null;
  const { ray } = pose(puz, state, i);
  for (let k = 0; k < ray.length; k++) {
    const o = ownerAt(puz, state, ray[k]);
    if (o < 0 || o === i) continue;
    const cells = pose(puz, state, o).cells;
    const at = cells.indexOf(ray[k]);
    return at < cells.length - 1 ? { arrow: o, at, k } : null;
  }
  return null;
}

// Arrows that leave together when i is tapped.
export const group = (puz, i) => (puz.arrows[i].partner >= 0 ? [i, puz.arrows[i].partner] : [i]);

export const canExit = (puz, state, i) => group(puz, i).every((j) => !blockAt(puz, state, j));

// Takes arrow i out (with its pair partner, or the arrow its lasso caught) and
// returns every arrow that left. A samurai cuts away the tail end of the arrow it
// meets, which stays.
export function remove(puz, state, i) {
  const out = group(puz, i);
  const caught = caughtBy(puz, state, i);
  if (caught) out.push(caught.arrow);
  const cut = cutBy(puz, state, i);
  if (cut) {
    for (const c of pose(puz, state, cut.arrow).cells.slice(0, cut.at + 1)) state.occ[c] = -1;
    state.cut[cut.arrow] += cut.at + 1;
  }
  for (const j of out) {
    const a = puz.arrows[j];
    if (puz.walls) state.gone[puz.cube.faceOf(pose(puz, state, j).cells.at(-1))]++;
    if (a.dial >= 0) for (const c of a.cells) state.dialOcc[c] = -1;
    else for (const c of pose(puz, state, j).cells) state.occ[c] = -1;
    for (const c of a.gates) state.occ[c] = -1;
    if (a.tint >= 0) state.tints[a.tint]--;
  }
  if (clocked(puz)) tick(puz, state);
  return out;
}

// Worlds whose switch moves on by itself each time an arrow leaves, with no hand on
// it: the sun turns to its next side, every dial turns a quarter, the bell flips.
export const clocked = (puz) => puz.gimmick === 'sundial' || puz.gimmick === 'dial' || puz.gimmick === 'bell';

// Moves a clocked puzzle's switch on one step.
export function tick(puz, state) {
  if (puz.sundial) state.sun = (state.sun + 1) % 4;
  if (puz.guards.size) state.bell = 1 - state.bell;
  if (puz.dials) state.dials = state.dials.map((r) => (r + 1) % 4);
}

// Whether a clocked puzzle is stuck for good: arrows left, none of them can leave
// now, and nothing else will move the switch.
export const deadEnd = (puz, state, alive) => clocked(puz) && alive.length > 0 && alive.every((i) => !canExit(puz, state, i));

// The arrows that never get out if lassos and samurais act as plain arrows and bulls
// never charge: the ones only those gimmicks set free. Lasso, samurai and stampede
// puzzles need some.
export function stuck(puz) {
  const plain = { ...puz, arrows: puz.arrows.map((a) => ({ ...a, lasso: false, samurai: false, run: false })) };
  const out = new Set(solve(plain).layers.flatMap((l) => l.arrows));
  return new Set(puz.arrows.map((_, i) => i).filter((i) => !out.has(i)));
}
export const stuckWithout = (puz) => stuck(puz).size;

// Bull i, tapped with something in its way, charges up to it. Returns how many cells
// it charged (0 if it is not a bull, its way is clear, or the blocker is right there).
export function charge(puz, state, i) {
  if (!puz.arrows[i].run) return 0;
  const b = blockAt(puz, state, i);
  if (!b || !b.k) return 0;
  for (const c of pose(puz, state, i).cells) state.occ[c] = -1;
  state.ran[i] += b.k;
  for (const c of pose(puz, state, i).cells) state.occ[c] = i;
  return b.k;
}

// Greedy solve from `state` (default: the start). Removing arrows only ever frees
// cells (and lifts curtains, brings walls down, empties panels and thaws ice; a
// samurai's cut only takes cells away too), so taking every free arrow in turn finds a
// solution whenever one exists. Returns the rounds as { arrows, charged } and whether
// everything got out.
export function solve(puz, state = newState(puz), alive = [...puz.arrows.keys()]) {
  state = copyState(state);
  const left = new Set(alive);
  const layers = [];
  if (clocked(puz)) {
    // The switch moves on with every arrow, so taking whatever is free can lead into
    // a dead end; the generator's order (the last placed first) works from the start.
    for (const i of [...left].sort((a, b) => b - a)) {
      if (!canExit(puz, state, i)) break;
      remove(puz, state, i);
      left.delete(i);
      layers.push({ arrows: [i], charged: [] });
    }
    return { layers, solvable: left.size === 0 };
  }
  while (left.size) {
    const out = [];
    for (const i of [...left].filter((j) => canExit(puz, state, j))) {
      if (!left.has(i) || !canExit(puz, state, i)) continue;
      for (const j of remove(puz, state, i)) {
        left.delete(j);
        out.push(j);
      }
    }
    // Bulls that cannot leave yet charge as far as they can.
    const charged = [...left].filter((i) => charge(puz, state, i));
    if (!out.length && !charged.length) break;
    layers.push({ arrows: out, charged });
  }
  return { layers, solvable: left.size === 0 };
}
