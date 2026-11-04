// World and stage tables. Every stage is a set of generator settings plus `target`,
// the virtual player's expected wrong taps; tools/bake-stages.mjs picks the generated
// candidate closest to it and stores its seed in stage-seeds.js.
//
//  N: grid per face (on a solid, grid cells along a block's edge)
//  shape: the solid the puzzle is on (shapes.js), none for the cube
//  len: [min, max] arrow length   straight: chance to keep going
//  wrap: preference for crossing cube edges   block: how much arrows block each other
//  deep: how long the chains of arrows waiting on one another get, across faces
//  long: how strongly long arrows are preferred (fewer short ones)
//  gimmick / amount: which gimmick and how much of it (see cube.js)
import { SHAPES, blocksOf, mostCells } from './shapes.js';
import { LANDMARKS, LANDMARKS_OF } from './landmarks.js';
import { GIMMICKS, makeSolid } from './cube.js';

// Stages 1–8 of a world are cubes and the rest solids (the user, 2026-11-04). A solid
// that is harder to take in by eye plays harder than its puzzle measures, so the
// difficulty need not climb in a straight line: a stage on a medium shape aims at 85%
// of the curve's wrong taps, on a hard one at 70%.
const EASE = { easy: 1, medium: 0.85, hard: 0.7 };
const solid = (shape, stage) => ({ ...stage, shape, target: Math.round(stage.target * EASE[SHAPES[shape].level] * 10) / 10 });

// 집 안 (home): hand-tuned, no gimmick. The solids grow over 9–15 as the cube did (a
// hard one drawn coarser, which also reads better), with settings eased where a big one
// would overshoot its target; most hold more arrows than the cubes they replace.
const HOME = [
  { N: 4, len: [3, 6], straight: 0.6, wrap: 0.1, block: 0.6, deep: 0, long: 0, target: 2 },
  { N: 4, len: [3, 7], straight: 0.6, wrap: 0.15, block: 0.8, deep: 0.1, long: 0, target: 2.5 },
  { N: 5, len: [3, 7], straight: 0.6, wrap: 0.2, block: 0.8, deep: 0.2, long: 0.1, target: 4 },
  { N: 5, len: [3, 8], straight: 0.55, wrap: 0.25, block: 1, deep: 0.3, long: 0.15, target: 5 },
  { N: 6, len: [3, 8], straight: 0.55, wrap: 0.3, block: 1, deep: 0.4, long: 0.2, target: 10 },
  { N: 6, len: [3, 9], straight: 0.5, wrap: 0.3, block: 1, deep: 0.5, long: 0.3, target: 12 },
  { N: 7, len: [3, 9], straight: 0.55, wrap: 0.35, block: 1, deep: 0.6, long: 0.35, target: 20 },
  { N: 7, len: [4, 10], straight: 0.5, wrap: 0.35, block: 1, deep: 0.65, long: 0.45, target: 23 },
  solid('slab', { N: 4, len: [4, 10], straight: 0.55, wrap: 0.4, block: 1, deep: 0.7, long: 0.5, target: 38 }),
  solid('ell', { N: 4, len: [4, 11], straight: 0.5, wrap: 0.45, block: 1, deep: 0.75, long: 0.6, target: 48 }),
  solid('tower', { N: 6, len: [4, 11], straight: 0.55, wrap: 0.45, block: 0.8, deep: 0.5, long: 0.4, target: 60 }),
  solid('stairs', { N: 4, len: [4, 12], straight: 0.5, wrap: 0.5, block: 0.8, deep: 0.5, long: 0.4, target: 71 }),
  solid('cup', { N: 5, len: [4, 12], straight: 0.5, wrap: 0.5, block: 0.75, deep: 0.35, long: 0.3, target: 125 }),
  solid('heart', { N: 4, len: [4, 12], straight: 0.5, wrap: 0.55, block: 1, deep: 0.95, long: 0.9, target: 175 }),
  solid('cross', { N: 6, len: [5, 13], straight: 0.5, wrap: 0.55, block: 0.85, deep: 0.5, long: 0.4, target: 190 }),
];

// Gimmick worlds: 40 stages along one curve, t from 0 to 1. The cube grows from 6 to
// 15, arrows get longer (fewer short ones) and wait on one another in longer chains
// across faces, the gimmick shows up more, and the target climbs from `start` to `top`
// wrong taps along t^k, slowly at first and faster as the cube grows. Gimmicks make
// big cubes harder by different amounts, so each world's ends and bend follow its own
// generated puzzles (about a third of the way up their spread at points 1, 5, 10, …,
// 40 of the curve), with point 40 well above the old 20-stage curve's last. Worlds
// tuned after play (2026-11-02, fitted with tools/calibrate.mjs on stages 1–30) sit
// higher or lower in their spread: 브라질 along its hardest tenth, 튀르키예 at three
// quarters, 영국 at four fifths, 태국 under a third. Such a curve's `start` (point 1,
// before stage 1) can come out below zero.
const GIMMICK_STAGES = 40;
// Where on that curve each stage now sits (user request 2026-10-31: harder from the
// start): stage 1 plays like point 10, stage 5 like 20, 15 like 25, 25 like 35, and on
// at that pace past the end (stage 40 like a point 50). Past point 40 the puzzles keep
// the settings of 40 and only the target climbs on, so harder candidates are picked.
// The gimmick's amount still follows the stage itself, so its share of the puzzle keeps
// growing over all 40 stages.
const PLAYS_LIKE = [[1, 10], [5, 20], [15, 25], [25, 35], [40, 50]];
const playsLike = (s) => {
  const j = PLAYS_LIKE.findIndex(([at]) => at >= s);
  const [[s0, p0], [s1, p1]] = [PLAYS_LIKE[Math.max(0, j - 1)], PLAYS_LIKE[j]];
  return s1 === s0 ? p1 : p0 + ((p1 - p0) * (s - s0)) / (s1 - s0);
};
// Hearts (wrong taps a stage forgives) from stage 6 on: 3, rising to 5 by stage 40.
const heartsAt = (s) => (s < 6 ? 0 : 3 + Math.round((2 * (s - 6)) / (GIMMICK_STAGES - 6)));
// Stages 9–40 of a country are solids (the user, 2026-11-04): a sculpture of its own
// for every stage (shapes.js sculpt, growing from 16 blocks to 39), but for 35 and 40,
// after the country's second star, which are its two landmarks (landmarks.js) and its
// hardest stages: the gimmick at its fullest and a target 30% over the curve. The user
// also asked for harder gimmicks, more of them and bigger shapes than the cubes had: a
// solid grows to about as many cells as the cube it takes the place of (preset), and
// the gimmick's amount starts higher. Where a solid cannot reach its target even at
// its biggest, baking takes the hardest it can.
const CUBES = 8;
const LANDMARK_AT = { 40: 0, 35: 1 }; // stage → which of the country's two landmarks
const LANDMARK_RAISE = 1.3;
function gimmickStages(gimmick, start, top, k) {
  return Array.from({ length: GIMMICK_STAGES }, (_, i) => {
    const t = (playsLike(i + 1) - 1) / (GIMMICK_STAGES - 1);
    const u = Math.min(1, t);
    const curve = start + (top - start) * t ** k;
    const stage = {
      N: Math.round(6 + 9 * u),
      len: [Math.round(3 + 2 * u), Math.round(6 + 9 * u)],
      straight: 0.6 - 0.1 * u,
      wrap: 0.3 + 0.35 * u,
      block: 0.8 + 0.2 * u,
      deep: 0.3 + 0.7 * u,
      long: u,
      gimmick,
      amount: 0.1 + (0.9 * i) / (GIMMICK_STAGES - 1),
      target: Math.round(curve * 10) / 10,
      hearts: heartsAt(i + 1),
    };
    if (i < CUBES) return stage;
    const s = i + 1;
    const { N, ...rest } = stage;
    const solid = { ...rest, cubeN: N, amount: 0.4 + (0.6 * i) / (GIMMICK_STAGES - 1) };
    if (s in LANDMARK_AT) {
      return { ...solid, shape: LANDMARKS_OF[gimmick][LANDMARK_AT[s]], amount: 1, target: Math.round(curve * LANDMARK_RAISE * 10) / 10 };
    }
    return { ...solid, shape: 'sculpt', form: 1000 * (GIMMICKS.indexOf(gimmick) + 1) + s, blocks: Math.round(16 + (24 * (s - 9)) / 31) };
  });
}

// Countries come in three tiers (`tier` 1–3; home is 0). A country gives a star for
// 25, 30 and 40 of its stages cleared, and a tier opens once all countries together
// have given TIER_STARS[tier] stars. `about` says in a line what the gimmick does; the
// world's tutorial (src/tutorial.js), played before its stage 1, teaches it.
export const STAR_AT = [25, 30, 40];
export const TIER_STARS = [0, 0, 15, 30];

// Plain-text names: flag emoji show up as two letters on Windows.
export const WORLDS = {
  home: {
    name: '집 안', tier: 0, about: '기믹 없이 기본 규칙 익히기',
    stages: HOME, seedBase: 0,
  },
  gate: {
    name: '중국 · 관문', tier: 1, about: '같은 색 열쇠 화살표가 빠지면 관문이 열림',
    stages: gimmickStages('gate', 15.5, 295, 1.85), seedBase: 1_000_000,
  },
  pair: {
    name: '한국 · 짝', tier: 1, about: '같은 색 둘이 함께 빠짐',
    stages: gimmickStages('pair', 14, 240, 1.65), seedBase: 2_000_000,
  },
  mirror: {
    name: '프랑스 · 거울', tier: 2, about: '거울을 지나면 90° 꺾임',
    stages: gimmickStages('mirror', 17, 395, 2), seedBase: 3_000_000,
  },
  bell: {
    name: '영국 · 빅벤', tier: 3, about: '화살표가 하나 나갈 때마다 닫힌 색이 바뀜',
    stages: gimmickStages('bell', -66.5, 201, 0.6), seedBase: 4_000_000,
  },
  discus: {
    name: '그리스 · 원반', tier: 1, about: '모서리를 넘어 옆면까지 날아감',
    stages: gimmickStages('discus', 14.5, 445, 1.7), seedBase: 5_000_000,
  },
  aurora: {
    name: '캐나다 · 오로라', tier: 1, about: '같은 색만 통과, 그 색이 다 빠지면 커튼이 걷힘',
    stages: gimmickStages('aurora', 12.5, 325, 1.75), seedBase: 6_000_000,
  },
  wall: {
    name: '독일 · 베를린 장벽', tier: 3, about: '장벽은 그 면에서 화살표가 숫자만큼 빠지면 무너짐',
    stages: gimmickStages('wall', -5, 282, 1.4), seedBase: 7_000_000,
  },
  tunnel: {
    name: '튀르키예 · 터널', tier: 3, about: '한 입구로 들어가 짝 입구로 나옴',
    stages: gimmickStages('tunnel', -14.5, 409, 1.35), seedBase: 10_000_000,
  },
  sundial: {
    name: '이집트 · 해시계', tier: 1, about: '화살표가 하나 나갈 때마다 해가 돌고 기둥 그림자도 따라 움직임',
    stages: gimmickStages('sundial', 17.5, 165, 1.1), seedBase: 12_000_000,
  },
  lasso: {
    name: '미국 · 올가미', tier: 1, about: '서로 막힌 화살표는 올가미로만 끌어낼 수 있음',
    stages: gimmickStages('lasso', 18.5, 245, 1.7), seedBase: 13_000_000,
  },
  dial: {
    name: '멕시코 · 태양 달력', tier: 2, about: '화살표가 하나 나갈 때마다 원판이 시계방향으로 90° 돌아감',
    stages: gimmickStages('dial', 7, 240, 1.85), seedBase: 14_000_000,
  },
  boomerang: {
    name: '호주 · 부메랑', tier: 1, about: '면 끝에서 머리 갈고리가 휜 쪽 옆 줄로 돌아와 반대쪽으로 나감',
    stages: gimmickStages('boomerang', 19, 410, 1.75), seedBase: 15_000_000,
  },
  canal: {
    name: '이탈리아 · 운하', tier: 2, about: '물길에 들어가면 흐름을 따라감',
    stages: gimmickStages('canal', 8, 270, 1.75), seedBase: 16_000_000,
  },
  ice: {
    name: '러시아 · 시베리아 얼음', tier: 2, about: '얼음 속 화살표는 맞닿은 칸에 다른 화살표가 하나도 없어야 나갈 수 있음',
    stages: gimmickStages('ice', -3, 313, 1.5), seedBase: 17_000_000,
  },
  encierro: {
    name: '스페인 · 소몰이', tier: 2, about: '막힌 황소는 장애물 앞까지 돌진해 꼬리 자리를 비움',
    stages: gimmickStages('encierro', 17, 235, 1.85), seedBase: 18_000_000,
  },
  vine: {
    name: '브라질 · 덩굴', tier: 2, about: '칼 화살표가 지나가는 덩굴은 칼이 빠지면 잘려 나감',
    stages: gimmickStages('vine', -34, 330, 1), seedBase: 19_000_000,
  },
  lantern: {
    name: '태국 · 등불', tier: 2, about: '그림자 속은 등불과 그 빛줄기만 보이고, 등불이 빠지면 그림자가 걷힘',
    stages: gimmickStages('lantern', 4.5, 534, 2), seedBase: 20_000_000,
  },
  diagonal: {
    name: '인도 · 차투랑가', tier: 3, about: '대각선으로 나가는 화살표',
    stages: gimmickStages('diagonal', 12, 335, 1.8), seedBase: 21_000_000,
  },
  samurai: {
    name: '일본 · 사무라이', tier: 3, about: '사무라이는 길을 막는 화살표 하나를 베고 지나가고, 벤 곳부터 꼬리 쪽은 사라짐',
    stages: gimmickStages('samurai', 2, 291, 1.4), seedBase: 22_000_000,
  },
  mondrian: {
    name: '네덜란드 · 몬드리안', tier: 3, about: '다른 화살표가 남은 칸막이 안으로는 들어갈 수 없음',
    stages: gimmickStages('mondrian', -16, 256, 1.25), seedBase: 23_000_000,
  },
};

// A country's solid (`cubeN` set) grows to about as many cells as the cubeN×cubeN cube
// that would have been there (rounded), its grid no finer than a cell as big as on a
// 20×20 cube: the user found bigger shapes fine, and at the 15×15 cube's cells a solid
// holds a third to four fifths of that cube's cells, too few for the late stages.
const FINEST = 20;
function sizeFor(blocks, cubeN, most) {
  const faces = makeSolid(blocks, 1).count;
  return Math.min(most, Math.max(2, Math.round(cubeN * Math.sqrt(6 / faces))));
}
export function preset(world, stage) {
  const w = WORLDS[world];
  const { len, cubeN, ...rest } = w.stages[stage - 1];
  const p = { ...rest, minLen: len[0], maxLen: len[1], fill: 0.95, seed: w.seedBase + stage * 7919 };
  if (cubeN) {
    // A landmark, the hardest stage of its country, is as big as it goes. A solid plays
    // harder or easier than its cells say by how much it twists, so baking also tries a
    // block edge a cell shorter or longer (a landmark one or two shorter), whichever lands
    // nearest the target, and bakes the size it picks with the seed (stage-seeds.js N).
    const blocks = blocksOf(p);
    const most = mostCells(blocks, FINEST);
    p.N = LANDMARKS[p.shape] ? most : sizeFor(blocks, cubeN, most);
    p.sizes = (LANDMARKS[p.shape] ? [-2, -1, 0] : [-1, 0, 1]).map((d) => p.N + d).filter((n) => n >= 2 && n <= most);
  }
  return p;
}

