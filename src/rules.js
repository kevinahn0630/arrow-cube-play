// Play rules shared by the game, the solver and the virtual player. A puzzle comes
// from cube.js `generate`; a state is what changes while it is played.

export function newState(puz) {
  return {
    occ: Int32Array.from(puz.occ),
    bell: puz.bellStart ?? 0,
    // Arrows of each aurora colour still on the cube; a colour's curtains lift at 0.
    tints: [...puz.tints],
    // Belt position and which arrow rides each belt slot.
    shift: puz.belt?.start ?? 0,
    slots: puz.belt ? Int32Array.from(puz.belt.slots) : null,
    // Where the sun stands (0..3), which way the obelisks' shadows fall.
    sun: puz.sundial?.start ?? 0,
    // How far each dial is turned (0..3 quarter turns), and which arrow rests on each
    // dial cell with its dial unturned.
    dials: puz.dials ? puz.dials.map((d) => d.start) : [],
    dialOcc: puz.dials ? Int32Array.from(puz.dialOcc) : null,
    // Which track cell of each shoji is open (0..2), and which way each windmill's
    // sails lie (0 or 1).
    doors: puz.doors ? puz.doors.map((d) => d.start) : [],
    mills: puz.mills ? puz.mills.map((m) => m.start) : [],
    // How many cells each bull has charged forward.
    ran: new Int32Array(puz.arrows.length),
  };
}

const copyState = (s) => ({
  ...s,
  occ: Int32Array.from(s.occ),
  tints: [...s.tints],
  slots: s.slots && Int32Array.from(s.slots),
  dials: [...s.dials],
  dialOcc: s.dialOcc && Int32Array.from(s.dialOcc),
  doors: [...s.doors],
  mills: [...s.mills],
  ran: Int32Array.from(s.ran),
});

// Arrow on cell c, or -1. Belt cells hold whichever arrow the belt has carried there,
// dial cells whichever arrow the dial has turned there.
export function ownerAt(puz, state, c) {
  const p = puz.belt?.index.get(c);
  if (p !== undefined) {
    const L = puz.belt.cells.length;
    return state.slots[(p - state.shift + L) % L];
  }
  const d = puz.dialOf?.get(c);
  if (d !== undefined) return state.dialOcc[puz.dials[d].unturn[state.dials[d]].get(c)];
  return state.occ[c];
}

// Where arrow i is now: { cells, dir, ray, exitDir, jumps }. Belt arrows move with
// the belt, dial arrows turn with their dial, bulls move on as they charge.
export function pose(puz, state, i) {
  const a = puz.arrows[i];
  if (a.dial >= 0) return a.poses[state.dials[a.dial]];
  if (a.run && state.ran[i]) {
    const r = state.ran[i];
    return { ...a, cells: [...a.cells, ...a.ray].slice(r, r + a.cells.length), ray: a.ray.slice(r) };
  }
  if (a.slot < 0) return a;
  const { cells, rays } = puz.belt;
  const p = (a.slot + state.shift) % cells.length;
  return { cells: [cells[p]], ...rays[p][a.up] };
}

// First thing in the way of arrow i's exit path: { k, tile, o } where k is how many
// free cells lie before it, `tile` says it is a gate, vine, guard, curtain or shadow
// (easy to see) rather than another arrow, and o is the arrow it belongs to (-1 for
// tiles of no arrow). A lasso arrow is not held up by the first arrow it meets: it
// pulls that one out along with it. An arrow's own cells (a machete's vine) never
// block it. An eagle is held up only if both its ways out are; then the nearer
// blocker of the two is the one it would bump into, but a player has to see both.
// An arrow wholly in the dark cannot be seen, so cannot be tapped at all. null when
// the way out is clear.
export function blockAt(puz, state, i) {
  if (inDark(puz, state, i)) return { k: 0, tile: true, o: -1 };
  const a = puz.arrows[i];
  const first = blockOn(puz, state, i, pose(puz, state, i).ray);
  if (!first || !a.ray2) return first;
  const second = blockOn(puz, state, i, a.ray2);
  return second && { ...first, k: Math.max(first.k, second.k) };
}

// Whether cell c lies in the dark: a lantern whose dark covers it is still on the cube.
export const darkCell = (puz, state, c) => !!puz.darkOf?.get(c)?.some((L) => state.occ[puz.arrows[L].cells.at(-1)] === L);

// Whether arrow i is hidden: in the dark from head to tail. Lanterns always show.
export const inDark = (puz, state, i) =>
  !!puz.darkOf && !puz.arrows[i].lantern && puz.arrows[i].cells.every((c) => darkCell(puz, state, c));

// Which end of eagle i leaves by: 0 its head, 1 its tail.
export const exitEnd = (puz, state, i) => (puz.arrows[i].ray2 && blockOn(puz, state, i, pose(puz, state, i).ray) ? 1 : 0);

function blockOn(puz, state, i, ray) {
  const { tint, lasso } = puz.arrows[i];
  const shadow = puz.sundial?.shadows[state.sun];
  let caught = -1;
  for (let k = 0; k < ray.length; k++) {
    const c = ray[k];
    const o = ownerAt(puz, state, c);
    if (o >= 0 && o !== caught && o !== i) {
      const gate = puz.arrows[o].gates.includes(c);
      if (!lasso || caught >= 0 || gate) return { k, tile: gate, o };
      caught = o;
    }
    if (o >= 0) continue;
    if (puz.guards.get(c) === state.bell) return { k, tile: true, o: -1 };
    const curtain = puz.curtains.get(c);
    if (curtain !== undefined && curtain !== tint && state.tints[curtain] > 0) return { k, tile: true, o: -1 };
    if (shadow?.has(c)) return { k, tile: true, o: -1 };
    const door = puz.doorOf?.get(c);
    if (door && state.doors[door[0]] !== door[1]) return { k, tile: true, o: -1 };
    const sail = puz.sailOf?.get(c);
    if (sail && state.mills[sail[0]] === sail[1]) return { k, tile: true, o: -1 };
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

// Arrows that leave together when i is tapped.
export const group = (puz, i) => (puz.arrows[i].partner >= 0 ? [i, puz.arrows[i].partner] : [i]);

export const canExit = (puz, state, i) => group(puz, i).every((j) => !blockAt(puz, state, j));

// Takes arrow i out (with its pair partner, or the arrow its lasso caught) and
// returns every arrow that left.
export function remove(puz, state, i) {
  const out = group(puz, i);
  const caught = caughtBy(puz, state, i);
  if (caught) out.push(caught.arrow);
  for (const j of out) {
    const a = puz.arrows[j];
    if (a.slot >= 0) state.slots[a.slot] = -1;
    else if (a.dial >= 0) for (const c of a.cells) state.dialOcc[c] = -1;
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

// Every setting of a row of switches with `n` positions each, starting from `now`.
const combos = (now, n) =>
  Array.from({ length: n ** now.length }, (_, code) => now.map((r, d) => (r + Math.floor(code / n ** d)) % n));

// The arrows that never get out if lassos act as plain arrows and bulls never charge:
// the ones only those gimmicks set free. Lasso and stampede puzzles need some.
export function stuck(puz) {
  const plain = { ...puz, arrows: puz.arrows.map((a) => ({ ...a, lasso: false, run: false })) };
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

// Settings the player can change at any time: the belt position, the shoji doors or
// the windmill sails (every combination).
function settings(puz, state) {
  if (puz.belt) {
    const L = puz.belt.cells.length;
    return Array.from({ length: L }, (_, k) => ({ shift: (state.shift + k) % L }));
  }
  if (puz.doors) return combos(state.doors, 3).map((doors) => ({ doors }));
  if (puz.mills) return combos(state.mills, 2).map((mills) => ({ mills }));
  return [{}];
}

// Greedy solve from `state` (default: the start). Removing arrows only ever frees
// cells (and lifts curtains), and the belt, doors and sails can be moved at any time,
// so taking every free arrow under each setting in turn finds a solution whenever one
// exists. Returns the rounds as { setting, arrows } and whether everything got out.
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
      layers.push({ setting: {}, arrows: [i], charged: [] });
    }
    return { layers, solvable: left.size === 0 };
  }
  for (let progressed = true; progressed && left.size; ) {
    progressed = false;
    for (const setting of settings(puz, state)) {
      Object.assign(state, setting);
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
      if (!out.length && !charged.length) continue;
      layers.push({ setting, arrows: out, charged });
      progressed = true;
    }
  }
  return { layers, solvable: left.size === 0 };
}
