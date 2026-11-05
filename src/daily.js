// 오늘의 큐브 (2026-11-05, the user's pick of dist/samples/daily.html 안 A): one puzzle a
// day, the same for everyone. Plain arrows (no gimmick) on a sculpture of the day's own
// (shapes.js sculpt), Monday easy and the weekend hard (LEVEL: 1-5 dots by weekday,
// Sunday first), in a country's look, the countries in turn. A day's seed and grid are
// baked from DAILY_FROM on (tools/bake-daily.mjs → daily-seeds.js); a day past the
// baked ones plays its first candidate. Days are 'YYYY-MM-DD'. No DOM.
import { WORLDS } from './stages.js';
import { makeSolid } from './cube.js';
import { blocksOf, mostCells } from './shapes.js';
import { DAILY_SEEDS } from './daily-seeds.js';

export const DAILY_FROM = '2026-11-01';
export const LEVEL = [5, 1, 2, 3, 3, 4, 5];
// A day cleared on the day pays DAILY_COINS (a day before it, this month, only its
// stamp); a month with every day stamped pays MONTH_COINS with its cup.
export const DAILY_COINS = 100;
export const MONTH_COINS = 1000;

// By level: a sculpture of `blocks` grown to about the cells of a cubeN×cubeN cube, and
// the virtual player's expected wrong taps to aim at.
const BY_LEVEL = {
  1: { cubeN: 11, blocks: 18, len: [4, 11], straight: 0.55, wrap: 0.5, block: 0.9, deep: 0.6, long: 0.6, target: 30 },
  2: { cubeN: 12, blocks: 21, len: [4, 12], straight: 0.55, wrap: 0.55, block: 0.95, deep: 0.7, long: 0.7, target: 50 },
  3: { cubeN: 13, blocks: 24, len: [4, 13], straight: 0.52, wrap: 0.6, block: 1, deep: 0.8, long: 0.8, target: 75 },
  4: { cubeN: 14, blocks: 27, len: [5, 14], straight: 0.5, wrap: 0.62, block: 1, deep: 0.9, long: 0.9, target: 105 },
  5: { cubeN: 15, blocks: 30, len: [5, 15], straight: 0.5, wrap: 0.65, block: 1, deep: 1, long: 1, target: 140 },
};

const parts = (day) => day.split('-').map(Number);
const utc = (day) => {
  const [y, m, d] = parts(day);
  return Date.UTC(y, m - 1, d);
};
export const dayNumber = (day) => Math.round(utc(day) / 86400000);
export const weekday = (day) => new Date(utc(day)).getUTCDay();
export const levelOf = (day) => LEVEL[weekday(day)];
export const dayFrom = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
const COUNTRIES = Object.keys(WORLDS).filter((w) => WORLDS[w].tier);
export const lookOf = (day) => COUNTRIES[dayNumber(day) % COUNTRIES.length];

// The day's generator settings, before baking (its first candidate's seed, the grid its
// sculpture would get and the grids baking tries).
export function dailyParams(day) {
  const n = dayNumber(day);
  const { cubeN, blocks, len, ...rest } = BY_LEVEL[levelOf(day)];
  const p = { ...rest, shape: 'sculpt', form: 700000 + n, blocks, minLen: len[0], maxLen: len[1], fill: 0.95, gimmick: null, amount: 0, seed: 50_000_000 + n * 7919 };
  const b = blocksOf(p);
  const most = mostCells(b, 20);
  p.N = Math.min(most, Math.max(2, Math.round(cubeN * Math.sqrt(6 / makeSolid(b, 1).count))));
  p.sizes = [-1, 0, 1].map((d) => p.N + d).filter((x) => x >= 2 && x <= most);
  return p;
}
// The day's puzzle as baked.
export function dailyStage(day) {
  const { sizes, ...p } = dailyParams(day);
  const baked = DAILY_SEEDS[dayNumber(day) - dayNumber(DAILY_FROM)];
  return baked ? { ...p, seed: baked.seed, N: baked.N } : p;
}

// The days of a month ('YYYY-MM'), and whether all of them are stamped in `days`.
export const monthDays = (month) => {
  const [y, m] = parts(month);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
};
export const monthDone = (month, days) => monthDays(month).every((d) => days[d]);
