// World and stage tables. Every stage is a set of generator settings plus `target`,
// the virtual player's expected wrong taps; tools/bake-stages.mjs picks the generated
// candidate closest to it and stores its seed in stage-seeds.js.
//
//  N: grid per face   len: [min, max] arrow length   straight: chance to keep going
//  wrap: preference for crossing cube edges   block: how much arrows block each other
//  deep: how long the chains of arrows waiting on one another get, across faces
//  long: how strongly long arrows are preferred (fewer short ones)
//  gimmick / amount: which gimmick and how much of it (see cube.js)

// 집 안 (home): hand-tuned, no gimmick.
const HOME = [
  { N: 4, len: [3, 6], straight: 0.6, wrap: 0.1, block: 0.6, deep: 0, long: 0, target: 2 },
  { N: 4, len: [3, 7], straight: 0.6, wrap: 0.15, block: 0.8, deep: 0.1, long: 0, target: 2.5 },
  { N: 5, len: [3, 7], straight: 0.6, wrap: 0.2, block: 0.8, deep: 0.2, long: 0.1, target: 4 },
  { N: 5, len: [3, 8], straight: 0.55, wrap: 0.25, block: 1, deep: 0.3, long: 0.15, target: 5 },
  { N: 6, len: [3, 8], straight: 0.55, wrap: 0.3, block: 1, deep: 0.4, long: 0.2, target: 10 },
  { N: 6, len: [3, 9], straight: 0.5, wrap: 0.3, block: 1, deep: 0.5, long: 0.3, target: 12 },
  { N: 7, len: [3, 9], straight: 0.55, wrap: 0.35, block: 1, deep: 0.6, long: 0.35, target: 20 },
  { N: 7, len: [4, 10], straight: 0.5, wrap: 0.35, block: 1, deep: 0.65, long: 0.45, target: 23 },
  { N: 8, len: [4, 10], straight: 0.55, wrap: 0.4, block: 1, deep: 0.7, long: 0.5, target: 38 },
  { N: 8, len: [4, 11], straight: 0.5, wrap: 0.45, block: 1, deep: 0.75, long: 0.6, target: 48 },
  { N: 9, len: [4, 11], straight: 0.55, wrap: 0.45, block: 1, deep: 0.8, long: 0.65, target: 60 },
  { N: 10, len: [4, 12], straight: 0.5, wrap: 0.5, block: 1, deep: 0.85, long: 0.75, target: 71 },
  { N: 11, len: [4, 12], straight: 0.5, wrap: 0.5, block: 1, deep: 0.9, long: 0.8, target: 125 },
  { N: 12, len: [4, 12], straight: 0.5, wrap: 0.55, block: 1, deep: 0.95, long: 0.9, target: 175 },
  { N: 13, len: [5, 13], straight: 0.5, wrap: 0.55, block: 1, deep: 1, long: 1, target: 190 },
];

// Gimmick worlds: 40 stages along one curve, t from 0 to 1. The cube grows from 6 to
// 15, arrows get longer (fewer short ones) and wait on one another in longer chains
// across faces, the gimmick shows up more, and the target climbs from `start` to `top`
// wrong taps along t^k, slowly at first and faster as the cube grows. Gimmicks make
// big cubes harder by different amounts, so each world's ends and bend follow its own
// generated puzzles (about a third of the way up their spread at points 1, 5, 10, …,
// 40 of the curve), with point 40 well above the old 20-stage curve's last.
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
function gimmickStages(gimmick, start, top, k) {
  return Array.from({ length: GIMMICK_STAGES }, (_, i) => {
    const t = (playsLike(i + 1) - 1) / (GIMMICK_STAGES - 1);
    const u = Math.min(1, t);
    return {
      N: Math.round(6 + 9 * u),
      len: [Math.round(3 + 2 * u), Math.round(6 + 9 * u)],
      straight: 0.6 - 0.1 * u,
      wrap: 0.3 + 0.35 * u,
      block: 0.8 + 0.2 * u,
      deep: 0.3 + 0.7 * u,
      long: u,
      gimmick,
      amount: 0.1 + (0.9 * i) / (GIMMICK_STAGES - 1),
      target: Math.round((start + (top - start) * t ** k) * 10) / 10,
      hearts: heartsAt(i + 1),
    };
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
    stages: gimmickStages('bell', 19, 135, 1), seedBase: 4_000_000,
  },
  discus: {
    name: '그리스 · 원반', tier: 1, about: '모서리를 넘어 옆면까지 날아감',
    stages: gimmickStages('discus', 14.5, 445, 1.7), seedBase: 5_000_000,
  },
  aurora: {
    name: '캐나다 · 오로라', tier: 1, about: '같은 색만 통과, 그 색이 다 빠지면 커튼이 걷힘',
    stages: gimmickStages('aurora', 12.5, 325, 1.75), seedBase: 6_000_000,
  },
  belt: {
    name: '독일 · 벨트', tier: 3, about: '벨트를 돌려 화살표 위치를 맞춤',
    stages: gimmickStages('belt', 16, 555, 1.8), seedBase: 7_000_000,
  },
  tunnel: {
    name: '튀르키예 · 터널', tier: 3, about: '한 입구로 들어가 짝 입구로 나옴',
    stages: gimmickStages('tunnel', 14.5, 375, 1.95), seedBase: 10_000_000,
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
  eagle: {
    name: '러시아 · 쌍두독수리', tier: 2, about: '양쪽 끝 중 열린 쪽으로 나감',
    stages: gimmickStages('eagle', 13.5, 100, 1.3), seedBase: 17_000_000,
  },
  encierro: {
    name: '스페인 · 소몰이', tier: 2, about: '막힌 황소는 장애물 앞까지 돌진해 꼬리 자리를 비움',
    stages: gimmickStages('encierro', 17, 235, 1.85), seedBase: 18_000_000,
  },
  vine: {
    name: '브라질 · 덩굴', tier: 2, about: '칼 화살표가 지나가는 덩굴은 칼이 빠지면 잘려 나감',
    stages: gimmickStages('vine', 8.5, 280, 1.65), seedBase: 19_000_000,
  },
  lantern: {
    name: '태국 · 등불', tier: 2, about: '그림자 속은 등불과 그 빛줄기만 보이고, 등불이 빠지면 그림자가 걷힘',
    stages: gimmickStages('lantern', 19.5, 660, 2.15), seedBase: 20_000_000,
  },
  diagonal: {
    name: '인도 · 차투랑가', tier: 3, about: '대각선으로 나가는 화살표',
    stages: gimmickStages('diagonal', 12, 335, 1.8), seedBase: 21_000_000,
  },
  shoji: {
    name: '일본 · 장지문', tier: 3, about: '레일 칸을 눌러 그 칸의 문을 엶',
    stages: gimmickStages('shoji', 23, 790, 2.2), seedBase: 22_000_000,
  },
  windmill: {
    name: '네덜란드 · 풍차', tier: 3, about: '축을 눌러 날개를 가로↔세로로 돌림',
    stages: gimmickStages('windmill', 19, 1135, 2.1), seedBase: 23_000_000,
  },
};

export function preset(world, stage) {
  const w = WORLDS[world];
  const { len, ...rest } = w.stages[stage - 1];
  return { ...rest, minLen: len[0], maxLen: len[1], fill: 0.95, seed: w.seedBase + stage * 7919 };
}
