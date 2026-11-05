// 주간 도전 코스 (2026-11-05, the user's pick of dist/samples/weekly.html 안 A): seven
// stages a week, Monday to Sunday, a trip through seven countries the player has
// opened. Each stop is its country's gimmick on a sculpture of the course's own
// (shapes.js sculpt), and plays like a later stage of that country (STAGE_LIKE), so the
// stops grow harder one after another and the seventh plays like its landmark. A stop
// is played as often as needed; all seven win the week's medal.
//
// Which seven countries depends on the tiers open (progress.js tierOpen), fixed for the
// week once its course is first shown: with only the first tier, its seven countries in
// the week's order; with the second, four of their places go to the second tier's
// countries; with the third, three places more to the third's. So a week has fourteen
// stops to bake, not twenty-one (tools/bake-weekly.mjs → weekly-seeds.js, from
// WEEKLY_FROM on); a week past the baked ones plays first candidates. Days are
// 'YYYY-MM-DD'. No DOM.
import { WORLDS } from './stages.js';
import { makeSolid } from './cube.js';
import { blocksOf, mostCells } from './shapes.js';
import { dayNumber, dayFrom } from './daily.js';
import { WEEKLY_SEEDS } from './weekly-seeds.js';

export const WEEKLY_FROM = '2026-11-02'; // a Monday
export const STOPS = 7;
// A stop cleared for the first time pays STOP_COINS; the seventh of the week's stops
// cleared pays COURSE_COINS with the week's medal.
export const STOP_COINS = 100;
export const COURSE_COINS = 1000;
// Stop k plays like stage STAGE_LIKE[k - 1] of its country: that stage's gimmick and its
// amount, arrows, hearts and target (the last one a landmark's: the gimmick at its
// fullest and a target 30% over the curve), on a sculpture as big as that stage's would
// be.
export const STAGE_LIKE = [10, 14, 18, 22, 26, 30, 35];

// The week a day falls in (0 from WEEKLY_FROM), its Monday, and the days left in it
// counting that day (7 on a Monday, 1 on a Sunday).
const FROM = dayNumber(WEEKLY_FROM);
export const weekOf = (day) => Math.floor((dayNumber(day) - FROM) / 7);
export const weekStart = (week) => dayFrom(FROM + 7 * week);
export const daysLeft = (day) => 7 - ((((dayNumber(day) - FROM) % 7) + 7) % 7);
// A week by its Monday: 11월 1주 for the first Monday of November.
export function weekName(week) {
  const monday = weekStart(week);
  return `${Number(monday.slice(5, 7))}월 ${Math.ceil(Number(monday.slice(8)) / 7)}주`;
}

const TIERS = [1, 2, 3].map((t) => Object.keys(WORLDS).filter((w) => WORLDS[w].tier === t));
const range = (n) => Array.from({ length: n }, (_, i) => i);
// A week's own random stream (xorshift).
function stream(week) {
  let s = (0x9e3779b9 ^ Math.imul(week + 1, 2654435761)) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
// The week's three courses, for a player with the first tier open, the second, the
// third: seven countries each, stop by stop.
export function courses(week) {
  const r = stream(week);
  const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const one = shuffle(TIERS[0]);
  const two = [...one];
  const seconds = shuffle(TIERS[1]);
  shuffle(range(STOPS)).slice(0, 4).forEach((k, i) => (two[k] = seconds[i]));
  // Of the third course's places, one of the first tier's and two of the second's go to
  // the third tier: two, two and three countries.
  const three = [...two];
  const thirds = shuffle(TIERS[2]);
  const firstAt = shuffle(range(STOPS).filter((k) => WORLDS[two[k]].tier === 1)).slice(0, 1);
  const secondAt = shuffle(range(STOPS).filter((k) => WORLDS[two[k]].tier === 2)).slice(0, 2);
  [...firstAt, ...secondAt].forEach((k, i) => (three[k] = thirds[i]));
  return { 1: one, 2: two, 3: three };
}
export const courseOf = (week, tier) => courses(week)[Math.min(3, Math.max(1, tier))];

// Stop `stop` (1-7) of a week in `world`, before baking: its first candidate's seed, the
// grid its sculpture gets and the grids baking tries.
export function stopParams(week, stop, world) {
  const like = STAGE_LIKE[stop - 1];
  const { len, cubeN, shape, form, blocks, ...rest } = WORLDS[world].stages[like - 1];
  const n = week * 200 + stop * 25 + Object.keys(WORLDS).indexOf(world);
  const p = {
    ...rest,
    shape: 'sculpt',
    form: 900_000 + n,
    blocks: Math.round(16 + (24 * (like - 9)) / 31),
    minLen: len[0],
    maxLen: len[1],
    fill: 0.95,
    seed: 70_000_000 + n * 7919,
  };
  const b = blocksOf(p);
  const most = mostCells(b, 20);
  p.N = Math.min(most, Math.max(2, Math.round(cubeN * Math.sqrt(6 / makeSolid(b, 1).count))));
  p.sizes = [-1, 0, 1].map((d) => p.N + d).filter((x) => x >= 2 && x <= most);
  return p;
}
// The stop as baked.
export const stopKey = (stop, world) => `${stop}-${world}`;
export function weeklyStage(week, stop, world) {
  const { sizes, ...p } = stopParams(week, stop, world);
  const baked = WEEKLY_SEEDS[week]?.[stopKey(stop, world)];
  return baked ? { ...p, seed: baked.seed, N: baked.N } : p;
}
// The stops a week bakes: each place's countries over the three courses, once each.
export function weekStops(week) {
  const c = courses(week);
  const list = [];
  for (let k = 0; k < STOPS; k++) for (const w of new Set([c[1][k], c[2][k], c[3][k]])) list.push([k + 1, w]);
  return list;
}
