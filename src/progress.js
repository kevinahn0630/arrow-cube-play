// Progress: the stages cleared in each world, kept on the device. Stars and tier
// unlocks follow from it (see STAR_AT and TIER_STARS in stages.js). Uses localStorage
// for now (Capacitor Preferences later); every access is guarded, since storage can
// be missing, blocked or full.
import { WORLDS, STAR_AT, TIER_STARS } from './stages.js';
import { START } from './economy.js';

const KEY = 'arrowCube.progress.v1';
const PERFECT_KEY = 'arrowCube.perfect.v1';

// world → Set of stage numbers, as kept under a storage key.
function loadSets(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '{}');
    return Object.fromEntries(Object.entries(raw).filter(([w]) => WORLDS[w]).map(([w, list]) => [w, new Set(list)]));
  } catch {
    return {};
  }
}
function saveSets(key, sets) {
  try {
    localStorage.setItem(key, JSON.stringify(Object.fromEntries(Object.entries(sets).map(([w, s]) => [w, [...s]]))));
  } catch {
    // Storage full or blocked: it then lasts as long as the page.
  }
}

// world → Set of cleared stage numbers.
export const loadProgress = () => loadSets(KEY);

// Records a stage as cleared.
export function markCleared(progress, world, stage) {
  progress[world] ??= new Set();
  if (progress[world].has(stage)) return;
  progress[world].add(stage);
  saveSets(KEY, progress);
}

export const isCleared = (progress, world, stage) => !!progress[world]?.has(stage);
export const clearedCount = (progress, world) => progress[world]?.size ?? 0;

// The stages cleared perfectly, each wearing a crown (2026-11-05: no blocked arrow
// tapped, no hint, no eraser), world → Set of stage numbers. markPerfect says whether
// the stage is new to it, as its coin bonus is paid once.
export const loadPerfect = () => loadSets(PERFECT_KEY);
export function markPerfect(perfect, world, stage) {
  perfect[world] ??= new Set();
  if (perfect[world].has(stage)) return false;
  perfect[world].add(stage);
  saveSets(PERFECT_KEY, perfect);
  return true;
}
export const isPerfect = (perfect, world, stage) => !!perfect[world]?.has(stage);
export const perfectCount = (perfect, world) => perfect[world]?.size ?? 0;

// Stars a country has earned (0–3); home gives none.
export const starsOf = (progress, world) =>
  WORLDS[world].tier ? STAR_AT.filter((n) => clearedCount(progress, world) >= n).length : 0;
export const totalStars = (progress) => Object.keys(WORLDS).reduce((sum, w) => sum + starsOf(progress, w), 0);

// Worlds whose tutorial (stage 0) has been played through or skipped on this device;
// until then their stage 1 opens the tutorial instead.
const TUTORIAL_KEY = 'arrowCube.tutorial.v1';
const tutorialsDone = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(TUTORIAL_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
};
export const tutorialDone = (world) => tutorialsDone().has(world);
export function markTutorialDone(world) {
  const done = tutorialsDone().add(world);
  try {
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify([...done]));
  } catch {
    // Storage full or blocked: the tutorial comes up again next time.
  }
}

// Whether a tier of countries is open: enough stars collected.
export const tierOpen = (progress, tier) => totalStars(progress) >= TIER_STARS[tier];

// The wallet: coins, hints and erasers kept; whether the player has been told that a
// stage cleared again pays a fifth (`told`); whether the ads have been bought out
// (`noAds`) and the purchases already paid out (`paid`, Play transaction ids); stages
// cleared since the last full-screen ad (`adClears`); the daily gift (`gift`) and the
// climb (`climb`: its season, 'YYYY-MM', its points, the clears in a row, and the points
// the 이벤트 tab last showed, `seen`, so it can walk the cube up from there). A new player
// starts with economy.js START.
const WALLET_KEY = 'arrowCube.wallet.v1';
export function loadWallet() {
  let w = null;
  try {
    w = JSON.parse(localStorage.getItem(WALLET_KEY));
  } catch {}
  const has = (v) => (w ? v | 0 : 0);
  return {
    coins: w ? w.coins | 0 : START.coins,
    hint: w ? w.hint | 0 : START.hint,
    eraser: w ? w.eraser | 0 : START.eraser,
    told: !!w?.told,
    noAds: !!w?.noAds,
    paid: Array.isArray(w?.paid) ? w.paid.slice(-50) : [],
    adClears: has(w?.adClears),
    gift: { n: has(w?.gift?.n), last: String(w?.gift?.last ?? '') },
    climb: { season: String(w?.climb?.season ?? ''), points: has(w?.climb?.points), row: has(w?.climb?.row), seen: has(w?.climb?.seen) },
  };
}
export function saveWallet(wallet) {
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  } catch {
    // Storage full or blocked: the wallet then lasts as long as the page.
  }
}
