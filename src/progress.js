// Progress: the stages cleared in each world, kept on the device. Stars and tier
// unlocks follow from it (see STAR_AT and TIER_STARS in stages.js). Uses localStorage
// for now (Capacitor Preferences later); every access is guarded, since storage can
// be missing, blocked or full.
import { WORLDS, STAR_AT, TIER_STARS } from './stages.js';
import { START } from './economy.js';

const KEY = 'arrowCube.progress.v1';

// world → Set of cleared stage numbers.
export function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return Object.fromEntries(Object.entries(raw).filter(([w]) => WORLDS[w]).map(([w, list]) => [w, new Set(list)]));
  } catch {
    return {};
  }
}

function save(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(Object.entries(progress).map(([w, s]) => [w, [...s]]))));
  } catch {
    // Storage full or blocked: progress then lasts as long as the page.
  }
}

// Records a stage as cleared.
export function markCleared(progress, world, stage) {
  progress[world] ??= new Set();
  if (progress[world].has(stage)) return;
  progress[world].add(stage);
  save(progress);
}

export const isCleared = (progress, world, stage) => !!progress[world]?.has(stage);
export const clearedCount = (progress, world) => progress[world]?.size ?? 0;

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

// The wallet: coins, hints and erasers kept, and whether the player has been told that
// a stage cleared again pays a fifth (`told`). A new player starts with economy.js START.
const WALLET_KEY = 'arrowCube.wallet.v1';
export function loadWallet() {
  try {
    const w = JSON.parse(localStorage.getItem(WALLET_KEY));
    if (w) return { coins: w.coins | 0, hint: w.hint | 0, eraser: w.eraser | 0, told: !!w.told };
  } catch {}
  return { ...START, told: false };
}
export function saveWallet(wallet) {
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  } catch {
    // Storage full or blocked: the wallet then lasts as long as the page.
  }
}
