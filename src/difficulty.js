// Difficulty measured by play, not by puzzle shape. A simple virtual player looks at
// the cube from one corner at a time, judges arrows by eye (sometimes wrongly), and we
// count its wrong taps and turns. It plays by the same rules.js as the game, so every
// gimmick is measured the same way.
import { rng32, makeCube, generate } from './cube.js';
import { newState, blockAt, group, remove, solve, pose, inDark, darkCell, charge, stuck, stuckWithout, deadEnd } from './rules.js';

// The 8 corner views, each showing three faces (face order as in cube.js: +x,-x,+y,-y,+z,-z).
const VIEWS = [];
for (const x of [0, 1]) for (const y of [2, 3]) for (const z of [4, 5]) VIEWS.push([x, y, z]);

// How hard an arrow is to follow by eye: long bodies, ones that wrap over cube edges,
// and exit paths bent by mirrors, carried by canals, turning back (boomerangs),
// running corner-wise (diagonals), or on over an edge or through a tunnel are easy to
// lose track of; so are a samurai's (what does it cut, what is left in the way?) and a
// frozen arrow (is anything touching it?).
const tangle = (len, crossings, bends) => 0.06 * Math.max(0, len - 3) + 0.2 * crossings + 0.3 * bends;
const faceChanges = (cube, cells) => cells.slice(1).filter((c, i) => cube.faceOf(c) !== cube.faceOf(cells[i])).length;
// Chance a free arrow is recognised as free.
const spotFree = (t) => Math.max(0.6, 0.92 - 0.08 * t);
// Chance a blocked arrow is mistaken for free. A blocker right at the head (or any
// gate or guard tile, which are easy to see) is obvious; an arrow several cells away
// is easy to miss, more so on a tangled arrow, and so is one just touching a frozen
// arrow (counted as two cells away).
const misjudge = (k, t) => Math.min(0.75, 0.35 * (1 - Math.exp(-k / 2.5)) * (1 + t));

function shuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function evaluate(puz, { runs = 24, seed = 1 } = {}) {
  const { cube, arrows } = puz;
  const rnd = rng32(seed);
  const tangles = arrows.map((a) =>
    tangle(
      a.cells.length,
      faceChanges(cube, a.cells),
      a.ray.filter((c) => puz.mirrors.has(c)).length + a.jumps.length + 1.5 * faceChanges(cube, [a.cells.at(-1), ...a.ray]) +
        0.5 * a.ray.filter((c) => puz.canals?.has(c)).length + (a.boom ? 1.5 : 0) + (a.diag ? 2 : 0) + (a.samurai ? 1.5 : 0) + (a.ice ? 1 : 0),
    ),
  );
  let wrong = 0;
  let turns = 0;
  let deadEnds = 0;

  for (let r = 0; r < runs; r++) {
    const state = newState(puz);
    // Dial arrows move, so which face shows their head is looked up as they are.
    const headFace = (i) => cube.faceOf(pose(puz, state, i).cells.at(-1));
    // Whether the dark leaves arrow i in doubt: its head is hidden (it could point
    // anywhere), or its way out runs into the dark before any blocker in plain sight
    // (something could stand there). Such an arrow can only be guessed at.
    const inDoubt = (i) => {
      if (!puz.darkOf || arrows[i].lantern) return false;
      const { cells, ray } = pose(puz, state, i);
      if (darkCell(puz, state, cells.at(-1))) return true;
      const b = blockAt(puz, state, i);
      for (let k = 0; k <= (b ? b.k : ray.length - 1); k++) if (darkCell(puz, state, ray[k])) return true;
      return false;
    };
    const alive = new Set(arrows.keys());
    const known = new Set(); // arrows this player already found blocked, until something moves
    let restarts = 0;
    let view = Math.floor(rnd() * VIEWS.length);
    for (let guard = 0; alive.size && guard < 100000; guard++) {
      // Arrows the dark leaves in doubt come last: the player only guesses at them when
      // nothing in plain sight looks free.
      const seen = shuffle(
        [...alive].filter((i) => !known.has(i) && VIEWS[view].includes(headFace(i))),
        rnd,
      ).sort((x, y) => inDoubt(x) - inDoubt(y));
      let acted = false;
      for (const i of seen) {
        // A linked pair has to look free on both ends before the player taps it.
        let looksFree = true;
        let blocked = false;
        for (const j of group(puz, i)) {
          // An arrow wholly in the dark is not seen at all.
          if (inDark(puz, state, j)) {
            looksFree = false;
            break;
          }
          const b = blockAt(puz, state, j);
          const k = !b ? -1 : b.tile ? 0 : b.ice ? 2 : b.k;
          if (b) blocked = true;
          const p = inDoubt(j) ? 0.35 : k < 0 ? spotFree(tangles[j]) : misjudge(k, tangles[j]);
          if (!(rnd() < p)) {
            looksFree = false;
            break;
          }
        }
        if (!looksFree) continue;
        if (!blocked) {
          for (const j of remove(puz, state, i)) alive.delete(j);
          known.clear();
          // A clocked switch can leave nothing able to leave: the player starts over,
          // which counts as ten wrong taps. After three times they find the way.
          if (deadEnd(puz, state, [...alive])) {
            wrong += 10;
            deadEnds++;
            if (++restarts > 3) alive.clear();
            else {
              Object.assign(state, newState(puz));
              for (const k of arrows.keys()) alive.add(k);
            }
          }
        } else if (charge(puz, state, i)) {
          // A bull charging on is progress, not a mistake.
          known.clear();
        } else {
          wrong++;
          known.add(i);
        }
        acted = true;
        break;
      }
      if (!acted) {
        // Stuck in this view: turn the cube. (The sun, the dials and the bell move by
        // themselves; nothing else needs a hand.)
        view = (view + 1 + Math.floor(rnd() * (VIEWS.length - 1))) % VIEWS.length;
        turns++;
      }
    }
  }

  // Share of the remaining arrows that are free, averaged over the solve rounds.
  const { layers } = solve(puz);
  let left = arrows.length;
  let ratio = 0;
  for (const l of layers) {
    ratio += l.arrows.length / left;
    left -= l.arrows.length;
  }
  return {
    wrong: wrong / runs,
    turns: turns / runs,
    // Dead ends run into per play (clocked worlds only).
    stuck: deadEnds / runs,
    depth: layers.length,
    freeRatio: layers.length ? ratio / layers.length : 1,
  };
}

// Whether the gimmick failed to take in a puzzle: a lasso, samurai or stampede puzzle
// that is solvable without it, a lantern puzzle where no lantern fitted, a wall puzzle
// left without walls, a Mondrian one where no way out runs into a panel someone else
// sits in, or an ice one where nothing touches any frozen arrow.
export function lacksGimmick(puz) {
  const { gimmick } = puz;
  if (gimmick === 'lasso' || gimmick === 'samurai' || gimmick === 'encierro') return !stuckWithout(puz);
  if (gimmick === 'lantern') return !puz.arrows.some((a) => a.lantern);
  if (gimmick === 'wall') return !puz.walls.length;
  if (gimmick === 'mondrian' || gimmick === 'ice') return !puz.arrows.some((a, i) => a.extra.some((c) => puz.occ[c] >= 0 && puz.occ[c] !== i));
  return false;
}

// How much of a puzzle its gimmick takes up: the share of arrows that are gimmick
// arrows themselves (keys, pairs, discs, lassos, samurais, bulls, frozen arrows, …,
// and those whose way out runs into a Mondrian panel), whose way out runs into the
// gimmick's cells (gates, mirrors, curtains, shadows, dials, canals, vines, walls) or
// into a gimmick arrow (so they wait on it), that sit in the dark, that touch a frozen
// arrow (it waits on them), or that cannot leave without lassos, cuts or charges.
export function gimmickShare(puz) {
  const { arrows, gimmick } = puz;
  if (!gimmick || !arrows.length) return 0;
  const keys = (m) => new Set(m.keys());
  const intoPanel = (a) => a.ray.some((c, k) => puz.panelOf.has(c) && puz.panelOf.get(c) !== puz.panelOf.get(k ? a.ray[k - 1] : a.cells.at(-1)));
  // [is a gimmick arrow, the gimmick's cells]
  const [own, cells] = {
    gate: [(a) => a.gates.length > 0, () => new Set(arrows.flatMap((a) => a.gates))],
    pair: [(a) => a.partner >= 0],
    mirror: [null, () => keys(puz.mirrors)],
    bell: [null, () => keys(puz.guards)],
    discus: [(a) => a.disc],
    aurora: [(a) => a.tint >= 0, () => keys(puz.curtains)],
    tunnel: [(a) => a.jumps.length > 0],
    sundial: [null, () => new Set([...puz.sundial.obelisks, ...puz.sundial.shadows.flatMap((s) => [...s])])],
    lasso: [(a) => a.lasso || a.knot >= 0],
    dial: [(a) => a.dial >= 0, () => keys(puz.dialOf)],
    boomerang: [(a) => !!a.boom],
    canal: [null, () => keys(puz.canals)],
    ice: [(a) => a.ice],
    encierro: [(a) => a.run],
    vine: [(a) => a.machete, () => new Set(arrows.filter((a) => a.machete).flatMap((a) => a.gates))],
    lantern: [(a) => a.lantern, () => {
      const state = newState(puz);
      return new Set([...puz.darkOf.keys()].filter((c) => darkCell(puz, state, c)));
    }],
    diagonal: [(a) => a.diag],
    samurai: [(a) => a.samurai || a.knot >= 0],
    wall: [null, () => keys(puz.wallOf)],
    mondrian: [intoPanel],
  }[gimmick];
  const set = new Set(cells?.());
  for (const a of arrows) if (own?.(a)) for (const c of a.cells) set.add(c);
  const held = gimmick === 'lasso' || gimmick === 'samurai' || gimmick === 'encierro' ? stuck(puz) : null;
  const touch = gimmick === 'ice' ? new Set(arrows.filter((a) => a.ice).flatMap((a) => a.extra)) : null;
  const meets = (cs) => cs.some((c) => set.has(c));
  const n = arrows.filter(
    (a, i) =>
      own?.(a) || held?.has(i) || meets(a.ray) || (gimmick === 'lantern' && meets(a.cells)) || (touch && a.cells.some((c) => touch.has(c))),
  ).length;
  return n / arrows.length;
}

// Generates `candidates` puzzles from consecutive seeds and returns one as { seed,
// wrong }: of those whose expected wrong taps land near `target` (within 5%, at least
// one tap), the one the virtual player runs into the fewest dead ends on (clocked
// worlds: hard to read rather than easy to get stuck in), then the one whose arrows
// wait on one another in the longest chain (most solve rounds); if none lands near,
// the closest. Puzzles where the gimmick did not take are skipped.
export function pickSeed(params, target, candidates = 12) {
  const cube = makeCube(params.N);
  const better = (a, b) =>
    a.near !== b.near
      ? a.near
      : a.near && a.stuck !== b.stuck
        ? a.stuck < b.stuck
        : a.near && a.depth !== b.depth
          ? a.depth > b.depth
          : a.off < b.off;
  let best = null;
  for (let k = 0; k < candidates; k++) {
    const seed = params.seed + k;
    const puz = generate(cube, { ...params, seed });
    if (lacksGimmick(puz)) continue;
    const { wrong, depth, stuck } = evaluate(puz, { seed });
    const off = Math.abs(wrong - target);
    const c = { off, near: off <= Math.max(1, 0.05 * target), stuck, depth, seed, wrong };
    if (!best || better(c, best)) best = c;
  }
  return { seed: best.seed, wrong: best.wrong };
}
