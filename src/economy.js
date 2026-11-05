// Coins and items (2026-11-03, HANDOFF.md): what clearing a stage pays, what the hint
// and the eraser cost, which arrow a hint shows and which arrows the eraser may take.
// Like rules.js, no DOM: the wallet itself is kept by progress.js.
import { WORLDS } from './stages.js';
import { STAGE_SEEDS } from './stage-seeds.js';
import { LANDMARKS } from './landmarks.js';
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
// A stage cleared perfectly for the first time (no blocked arrow tapped, no hint, no
// eraser; 2026-11-05, the user's pick of dist/samples/perfect.html 안 B) pays half its
// first clear's coins more, once.
export const perfectBonus = (world, stage) => Math.round(coinsFor(world, stage) / 2);

// Hard stages, told ahead (2026-11-05, the user's pick of dist/samples/hard.html 안 B):
// in each country the hardest of stages 11-20 and of 21-30 by the baked expected wrong
// taps is 어려움 (1), and its two landmarks (35, 40) are 매우 어려움 (2). They pay
// HARD_PAY times their coins (stageCoins; the perfect bonus stays half the plain
// coins). 집 안 and stages 1-10 have none.
export const HARD_PAY = [1, 1.5, 2];
const HARD = {};
for (const [world, { tier, stages }] of Object.entries(WORLDS)) {
  if (!tier) continue;
  const wrong = (s) => STAGE_SEEDS[world][s - 1].wrong;
  const top = (a, b) => Array.from({ length: b - a }, (_, i) => a + 1 + i).reduce((best, s) => (wrong(s) > wrong(best) ? s : best), a);
  HARD[world] = stages.map((s) => (LANDMARKS[s.shape] ? 2 : 0));
  for (const s of [top(11, 20), top(21, 30)]) HARD[world][s - 1] ||= 1;
}
export const hardness = (world, stage) => HARD[world]?.[stage - 1] ?? 0;
export const stageCoins = (world, stage, again = false) => Math.round(coinsFor(world, stage, again) * HARD_PAY[hardness(world, stage)]);

export const PRICE = { hint: 200, eraser: 500 };
// What a new player starts with.
export const START = { coins: 0, hint: 3, eraser: 0 };

// What the shop sells for money in the app (Google Play product ids; the user's
// prices): three coin packs, the dearer the more coins a won, and taking the full-screen
// ads out for good. `won` shows until Play gives its own price.
export const PACKS = [
  { id: 'coins_1000', coins: 1000, won: 1200 },
  { id: 'coins_6000', coins: 6000, won: 5900, bonus: 20 },
  { id: 'coins_15000', coins: 15000, won: 12000, bonus: 50 },
];
export const NO_ADS = { id: 'remove_ads', won: 5900 };

// A full-screen ad between stages: after every third stage cleared in a country, on
// the way to the next one, and not within two minutes of the last ad or after a stage
// whose card's ad was watched (those wait for the next clear).
export const AD_EVERY = 3;
export const AD_GAP = 120000;

// The daily gift (출석 보상): a week of gifts in turn, one a day. A day missed is not
// lost: the next visit gets the next gift, and after the seventh they start over.
// `gift` is the wallet's { n: gifts taken so far, last: the day of the last, 'YYYY-MM-DD' }.
export const GIFTS = [['coins', 50], ['coins', 100], ['hint', 1], ['coins', 150], ['hint', 1], ['coins', 200], ['eraser', 1]];
export const giftDay = (gift) => gift.n % GIFTS.length;
// One a day: the next is ready on a day after the last one's, not on an earlier one (a
// clock turned back; game.js today() does not go back anyway).
export const giftReady = (gift, today) => gift.last < today;

// The climb (이벤트 tab), a season a month: every stage cleared in a country scores 10,
// 10 more for each clear in a row before it (up to 40 more), and 10 for each of three
// hearts kept (wrong taps counted the same where a stage has no hearts); a stage cleared
// again scores a fifth. A clear that does not come is what breaks the row: a stage given
// up or started over after a move (game.js). Every 200 points up the climb, from a tree
// through the sky and the stratosphere into space, pays one of these.
export const CLIMB_STEP = 200;
export const CLIMB = [
  ['coins', 100], ['hint', 1], ['coins', 150], ['hint', 1], ['eraser', 1],
  ['coins', 150], ['hint', 1], ['coins', 200], ['hint', 2], ['eraser', 1],
  ['coins', 200], ['hint', 2], ['coins', 250], ['eraser', 1], ['coins', 500],
  ['coins', 250], ['hint', 3], ['coins', 300], ['eraser', 2], ['coins', 1000],
];
export function climbPoints({ row, misses, again = false }) {
  const points = 10 + 10 * Math.min(4, Math.max(0, row - 1)) + 10 * Math.max(0, 3 - misses);
  return again ? Math.round(points / 5) : points;
}
// The rewards passed going from `before` points to `after`.
export const climbRewards = (before, after) =>
  CLIMB.slice(Math.min(CLIMB.length, Math.floor(before / CLIMB_STEP)), Math.min(CLIMB.length, Math.floor(after / CLIMB_STEP)));

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
