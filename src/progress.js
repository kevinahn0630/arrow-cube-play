// Progress: the stages cleared in each world, kept on the device. Stars and tier
// unlocks follow from it (see STAR_AT and TIER_STARS in stages.js). Uses localStorage
// for now (Capacitor Preferences later); every access is guarded, since storage can
// be missing, blocked or full.
import { WORLDS, STAR_AT, TIER_STARS } from './stages.js';

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

// Worlds whose rules card has been shown on this device (it comes up by itself only
// the first time their stage 1 opens).
const INTRO_KEY = 'arrowCube.intro.v1';
const introsSeen = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(INTRO_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
};
export const introSeen = (world) => introsSeen().has(world);
export function markIntroSeen(world) {
  const seen = introsSeen().add(world);
  try {
    localStorage.setItem(INTRO_KEY, JSON.stringify([...seen]));
  } catch {
    // Storage full or blocked: the card comes up again next time.
  }
}

// Whether a tier of countries is open: enough stars collected.
export const tierOpen = (progress, tier) => totalStars(progress) >= TIER_STARS[tier];
