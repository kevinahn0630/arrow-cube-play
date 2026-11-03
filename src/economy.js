// Coins and items (2026-11-03, HANDOFF.md): what clearing a stage pays, what the hint
// and the eraser cost, which arrow a hint shows and which arrows the eraser may take.
// Like rules.js, no DOM: the wallet itself is kept by progress.js.
import { WORLDS } from './stages.js';
import { canExit, blockAt, copyState, remove, clocked, pose } from './rules.js';

// Coins for a stage's first clear, by tier, the same for each block of ten stages
// (the user's table). 집 안 pays 20 for stages 1-10 and 50 for 11-15. A stage cleared
// again pays a fifth.
const COINS = { 1: [50, 100, 150, 200], 2: [50, 150, 200, 250], 3: [50, 200, 250, 300] };
export function coinsFor(world, stage, again = false) {
  const tier = WORLDS[world]?.tier;
  if (tier === undefined || stage < 1) return 0;
  const full = tier ? COINS[tier][Math.min(3, Math.floor((stage - 1) / 10))] : stage <= 10 ? 20 : 50;
  return again ? Math.round(full / 5) : full;
}

export const PRICE = { hint: 200, eraser: 500 };
// What a new player starts with.
export const START = { coins: 0, hint: 3, eraser: 0 };

// An arrow with nothing of a gimmick about it, drawn in the plain colour: the only
// kind the eraser takes.
export const plain = (a) =>
  !a.gates.length && !(a.partner >= 0) && !(a.hue >= 0) && !(a.tint >= 0) && !(a.dial >= 0) && !(a.knot >= 0) &&
  !a.disc && !a.lasso && !a.samurai && !a.boom && !a.diag && !a.machete && !a.lantern && !a.run && !a.ice;

// Whether a clocked stage can still be finished from `state` with the arrows `alive`
// left. Its switch moves on with every arrow that leaves, so it is a search over orders:
// the generator's (last placed first) first, giving up after `budget.n` steps.
export function finishes(puz, state, alive, budget = { n: 3000 }) {
  if (!alive.length) return true;
  if (--budget.n < 0) return false;
  for (const i of alive.filter((j) => canExit(puz, state, j)).sort((a, b) => b - a)) {
    const s = copyState(state);
    const out = new Set(remove(puz, s, i));
    if (finishes(puz, s, alive.filter((j) => !out.has(j)), budget)) return true;
    if (budget.n < 0) return false;
  }
  return false;
}

// How easy arrow i is to overlook, as the virtual player reads arrows (difficulty.js
// `tangle`): long, over cube edges, and a way out that turns a corner.
function hidden(puz, state, i) {
  const { cube } = puz;
  const { cells, ray } = pose(puz, state, i);
  const edges = (list) => list.slice(1).filter((c, k) => cube.faceOf(c) !== cube.faceOf(list[k])).length;
  return 0.06 * Math.max(0, cells.length - 3) + 0.2 * edges(cells) + 0.3 * edges([cells.at(-1), ...ray]);
}

// The arrow a hint shows, or -1: of the arrows that can leave now, the one whose
// leaving changes the least (sets the fewest others free), the easier to overlook of
// equals. A clocked stage takes the first move of a way to finish instead. With
// nothing able to leave, a bull that can charge.
export function hintFor(puz, state, alive) {
  const free = alive.filter((i) => canExit(puz, state, i));
  if (clocked(puz)) {
    const budget = { n: 4000 };
    for (const i of [...free].sort((a, b) => b - a)) {
      const s = copyState(state);
      const out = new Set(remove(puz, s, i));
      if (finishes(puz, s, alive.filter((j) => !out.has(j)), budget)) return i;
      if (budget.n < 0) break;
    }
  }
  if (!free.length) return alive.find((i) => puz.arrows[i].run && blockAt(puz, state, i)?.k > 0) ?? -1;
  const before = new Set(free);
  let best = -1;
  let bestScore = Infinity;
  for (const i of free) {
    const s = copyState(state);
    const out = new Set(remove(puz, s, i));
    const freed = alive.filter((j) => !out.has(j) && !before.has(j) && canExit(puz, s, j)).length;
    const score = freed - 0.01 * hidden(puz, state, i);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

// Whether the eraser may take arrow i: a plain arrow still on the cube, and on a
// clocked stage only if the rest can still all leave after it. It counts as leaving
// (walls, curtains and the switch go on as if it had).
export function erasable(puz, state, alive, i) {
  if (!plain(puz.arrows[i]) || !alive.includes(i)) return false;
  if (!clocked(puz)) return true;
  const s = copyState(state);
  remove(puz, s, i);
  return finishes(puz, s, alive.filter((j) => j !== i));
}
