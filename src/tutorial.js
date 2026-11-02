// Tutorial stages: before a world's stage 1, a small puzzle played step by step. Each
// step says what to do and, where it is about one arrow, finds that arrow (the game
// lights it up, turns the cube to it and takes taps on nothing else). They first show
// what the gimmick does, then what to watch out for, by doing it. Pure logic: the
// game, tools/bake-tutorials.mjs (which picks each world's puzzle) and tools/check.mjs
// all use it.
//
// A step waits `until`:
//   'leave'  — the arrow it finds has left
//   'bump'   — the arrow it finds was tapped and bumped back
//   'charge' — the bull it finds charged
//   'next'   — the player read it (the 다음 button); `look` turns the cube to a tile
//   'clear'  — every arrow is gone
// `find` names a finder (see findTarget); `name:k` passes the arrow found in step k.
import { newState, copyState, canExit, remove, blockAt, ownerAt, pose, caughtBy, cutBy, charge, solve, clocked, deadEnd, group, inDark } from './rules.js';

const LAST = '남은 화살표도 모두 빼 보세요.';

// The usual lesson for a gimmick that changes an arrow's way out: one arrow shows it
// working, then one blocked further along that way (`blocked`) shows the whole way
// has to be clear.
const wayLesson = ({ free, blocked, show, hit, clear, open }) => [
  { say: show, find: free, until: 'leave' },
  { say: hit, find: blocked, until: 'bump' },
  { say: clear, find: 'blockerOf:1', until: 'leave' },
  { say: open, find: 'target:1', until: 'leave' },
  { say: LAST, until: 'clear' },
];

// Per world: the steps, and the generator's cube size, fill, arrow lengths and gimmick
// amount for the tutorial puzzle (defaults: N 3, fill 0.75, len [2, 4], amount 1).
export const TUTORIALS = {
  home: {
    steps: [
      { say: '화살표를 누르면 머리가 가리키는 쪽으로 날아가 큐브 밖으로 나가요. 빛나는 화살표를 눌러 보세요.', find: 'free', until: 'leave' },
      { say: '이 화살표는 가는 길에 다른 화살표가 있어요. 눌러 보세요.', find: 'blockedByFree', until: 'bump' },
      { say: '막힌 화살표는 부딪혀 돌아와요. 길을 막고 있는 이 화살표를 먼저 빼 주세요.', find: 'blockerOf:1', until: 'leave' },
      { say: '길이 열렸어요! 아까 막혔던 화살표를 빼 보세요.', find: 'target:1', until: 'leave' },
      { say: '큐브를 끌어서 돌리면 다른 면도 보여요. 두 손가락으로 벌리거나 오므리면 확대·축소돼요. 남은 화살표를 모두 빼 보세요.', until: 'clear' },
    ],
  },
  gate: {
    steps: [
      { say: '색칠된 칸은 관문이에요. 이 화살표를 눌러 보세요.', find: 'gateBlocked', until: 'bump' },
      { say: '관문은 같은 색 열쇠 화살표가 큐브에 있는 동안 닫혀 있어요. 열쇠 화살표를 빼 보세요.', find: 'blockerOf:0', until: 'leave' },
      { say: '관문이 열렸어요! 이제 이 화살표가 지나갈 수 있어요.', find: 'target:0', until: 'leave' },
      { say: LAST, until: 'clear' },
    ],
  },
  pair: {
    steps: [
      { say: '같은 색 화살표 둘은 짝이에요. 하나를 누르면 둘이 함께 움직여요. 눌러 보세요.', find: 'halfPair', until: 'bump' },
      { say: '짝은 둘 다 길이 비어 있어야 나갈 수 있어요. 짝의 길을 막는 이 화살표를 먼저 빼 주세요.', find: 'blockerOf:0', until: 'leave' },
      { say: '이제 짝이 함께 나갈 수 있어요. 눌러 보세요.', find: 'target:0', until: 'leave' },
      { say: LAST, until: 'clear' },
    ],
  },
  mirror: {
    steps: wayLesson({
      free: 'through:mirrors',
      blocked: 'blockedPast:mirrors',
      show: '이 화살표의 길에 거울이 있어요. 거울을 지나면 90° 꺾여서 날아가요. 눌러 보세요.',
      hit: '이 화살표는 거울에서 꺾인 다음의 길이 막혀 있어요. 눌러 보세요.',
      clear: '꺾인 다음의 길까지 비어 있어야 나갈 수 있어요. 막고 있는 이 화살표를 먼저 빼 주세요.',
      open: '이제 거울을 지나 나갈 수 있어요.',
    }),
  },
  bell: {
    N: 4,
    fill: 0.35,
    steps: [
      { say: '근위병 칸은 두 가지 색이에요. 꽉 칠해진 색은 닫혀 있어 지나갈 수 없고, 테두리만 있는 색은 열려 있어요.', until: 'next', look: 'guard' },
      { say: '이 화살표는 지금 열린 근위병을 지나가요. 빼 보고, 근위병이 어떻게 되는지 보세요.', find: 'through:guards', until: 'leave' },
      { say: '화살표가 하나 나갈 때마다 닫힌 색이 바뀌어요! 근위병을 지나는 화살표는 길이 열렸을 때 먼저 빼 두세요.', until: 'next', look: 'guard' },
      { say: '남은 화살표를 모두 빼 보세요. 나갈 수 있는 화살표가 하나도 없게 되면 처음부터 다시 해야 하니, 평범한 화살표는 아껴 두세요.', until: 'clear' },
    ],
  },
  discus: {
    steps: wayLesson({
      free: 'kind:disc',
      blocked: 'blockedPast:disc',
      show: '색이 다른 이 화살표는 원반이에요. 면 끝에서 멈추지 않고 모서리를 넘어 옆면까지 날아가요. 눌러 보세요.',
      hit: '이 원반은 옆면으로 넘어간 다음의 길이 막혀 있어요. 눌러 보세요.',
      clear: '옆면으로 넘어간 길까지 비어 있어야 나갈 수 있어요. 막고 있는 이 화살표를 먼저 빼 주세요.',
      open: '이제 원반이 옆면을 지나 나갈 수 있어요.',
    }),
  },
  aurora: {
    amount: 0.5,
    steps: [
      { say: '색 커튼은 같은 색 화살표만 지나갈 수 있어요. 이 화살표는 색이 달라서 커튼에 막혀요. 눌러 보세요.', find: 'curtainBlocked', until: 'bump' },
      { say: '커튼과 같은 색 화살표는 커튼을 지나가요. 그 색 화살표가 모두 빠지면 커튼이 걷혀요. 이 화살표를 빼 보세요.', find: 'curtainKey:0', until: 'leave' },
      { say: '커튼이 걷혔어요! 이제 어떤 화살표든 지나갈 수 있어요.', find: 'target:0', until: 'leave' },
      { say: LAST, until: 'clear' },
    ],
  },
  wall: {
    N: 4,
    fill: 0.35,
    amount: 0,
    steps: [
      { say: '회색 칸은 장벽이라 지나갈 수 없어요. 장벽의 숫자는 이 면에서 화살표를 몇 개 더 빼야 장벽이 무너지는지 알려 줘요.', until: 'next', look: 'wall' },
      { say: '이 화살표는 장벽에 막혀 있어요. 눌러 보세요.', find: 'wallBlocked', until: 'bump' },
      { say: '장벽이 있는 면에서 화살표가 하나 빠질 때마다 숫자가 하나 줄어요. 이 화살표를 빼 보세요.', find: 'wallFace:1', until: 'leave' },
      { say: '숫자가 0이 되어 장벽이 무너졌어요! 이제 이 화살표가 지나갈 수 있어요.', find: 'target:1', until: 'leave' },
      { say: `장벽을 빨리 무너뜨리려면 그 면의 화살표부터 빼요. ${LAST}`, until: 'clear' },
    ],
  },
  tunnel: {
    amount: 0.1,
    steps: wayLesson({
      free: 'tunnel',
      blocked: 'blockedPast:tunnel',
      show: '같은 색 테두리를 두른 터널 입구 두 개는 이어져 있어요. 이 화살표는 한 입구로 들어가 짝 입구로 나와요. 눌러 보세요.',
      hit: '이 화살표는 터널을 나온 다음의 길이 막혀 있어요. 눌러 보세요.',
      clear: '터널을 나온 뒤의 길도 비어 있어야 해요. 막고 있는 이 화살표를 먼저 빼 주세요.',
      open: '이제 터널을 지나 나갈 수 있어요.',
    }),
  },
  sundial: {
    N: 4,
    fill: 0.35,
    amount: 0.5,
    steps: [
      { say: '기둥(오벨리스크)의 그림자 칸은 지나갈 수 없어요.', until: 'next', look: 'obelisk' },
      { say: '이 화살표는 지금 그림자를 피해서 나갈 수 있어요. 빼 보고, 그림자가 어떻게 되는지 보세요.', find: 'through:shadows', until: 'leave' },
      { say: '화살표가 하나 나갈 때마다 해가 돌고 그림자도 따라 움직여요! 그림자가 드리우는 칸을 지나는 화살표는 길이 열렸을 때 먼저 빼 두세요.', until: 'next', look: 'obelisk' },
      { say: '남은 화살표를 모두 빼 보세요. 나갈 수 있는 화살표가 하나도 없게 되면 처음부터 다시 해야 하니, 평범한 화살표는 아껴 두세요.', until: 'clear' },
    ],
  },
  lasso: {
    steps: [
      { say: '고리가 달린 올가미 화살표는 가는 길에 처음 만난 화살표 하나를 함께 끌고 나가요. 눌러 보세요.', find: 'lasso', until: 'leave' },
      { say: `서로 막고 있어서 그냥은 못 빼는 화살표들은 올가미로 끌어내야 해요. ${LAST}`, until: 'clear' },
    ],
  },
  dial: {
    N: 4,
    fill: 0.3,
    amount: 0.1,
    steps: [
      { say: '3×3 원판 위의 짧은 화살표들은 원판과 함께 돌아요.', until: 'next', look: 'dial' },
      { say: '이 화살표를 빼 보고, 원판이 어떻게 되는지 보세요.', find: 'near:dial', until: 'leave' },
      { say: '화살표가 하나 나갈 때마다 모든 원판이 시계방향으로 90° 돌아서, 원판 화살표의 자리와 방향이 바뀌어요!', until: 'next', look: 'dial' },
      { say: '남은 화살표를 모두 빼 보세요. 나갈 수 있는 화살표가 하나도 없게 되면 처음부터 다시 해야 해요.', until: 'clear' },
    ],
  },
  boomerang: {
    steps: wayLesson({
      free: 'kind:boom',
      blocked: 'blockedPast:boom',
      show: '갈고리가 달린 부메랑 화살표는 면 끝에 닿으면 갈고리가 휜 쪽 옆 줄로 돌아와 반대쪽 끝으로 나가요. 눌러 보세요.',
      hit: '이 부메랑은 돌아오는 길이 막혀 있어요. 눌러 보세요.',
      clear: '돌아오는 길까지 비어 있어야 나갈 수 있어요. 막고 있는 이 화살표를 먼저 빼 주세요.',
      open: '이제 부메랑이 돌아와 나갈 수 있어요.',
    }),
  },
  canal: {
    amount: 0.1,
    steps: wayLesson({
      free: 'through:canals',
      blocked: 'blockedPast:canals',
      show: '물길에 들어간 화살표는 물이 흐르는 방향을 따라가다가, 물길 끝에서 곧게 나가요. 눌러 보세요.',
      hit: '이 화살표는 물길을 따라간 다음의 길이 막혀 있어요. 눌러 보세요.',
      clear: '흘러가는 길까지 비어 있어야 나갈 수 있어요. 막고 있는 이 화살표를 먼저 빼 주세요.',
      open: '이제 물길을 따라 나갈 수 있어요.',
    }),
  },
  ice: {
    N: 4,
    fill: 0.45,
    steps: [
      { say: '얼음 속 화살표는 맞닿은 칸에 다른 화살표가 있으면 얼어붙어 나갈 수 없어요. 길이 비어 있어도요. 눌러 보세요.', find: 'iceHeld', until: 'bump' },
      { say: '얼음에 닿아 있는 이 화살표를 빼 주세요.', find: 'iceToucher:0', until: 'leave' },
      { say: '맞닿은 칸이 모두 비어서 얼음이 녹았어요! 이제 나갈 수 있어요.', find: 'target:0', until: 'leave' },
      { say: `얼음은 몸통 전체의 둘레를 봐야 해요. ${LAST}`, until: 'clear' },
    ],
  },
  encierro: {
    steps: [
      { say: '뿔이 달린 황소는 길이 막혀 있어도 누르면 장애물 바로 앞까지 돌진해요. 돌진은 실수로 치지 않아요. 눌러 보세요.', find: 'canCharge', until: 'charge' },
      { say: '황소가 떠난 자리가 비어서 이 화살표의 길이 열렸어요. 빼 보세요.', find: 'freedBy:0', until: 'leave' },
      { say: LAST, until: 'clear' },
    ],
  },
  vine: {
    steps: [
      { say: '덩굴 칸은 길을 막아요. 이 화살표를 눌러 보세요.', find: 'gateBlocked', until: 'bump' },
      { say: '덩굴을 지나는 길로 칼 화살표가 빠지면 덩굴이 잘려 사라져요. 칼 화살표를 빼 보세요.', find: 'blockerOf:0', until: 'leave' },
      { say: '덩굴이 잘렸어요! 이제 이 화살표가 지나갈 수 있어요.', find: 'target:0', until: 'leave' },
      { say: LAST, until: 'clear' },
    ],
  },
  lantern: {
    N: 4,
    fill: 0.6,
    len: [2, 5],
    amount: 0.2,
    steps: [
      { say: '그림자 속에서는 등불 화살표와 그 빛줄기만 보여요. 그림자에 완전히 숨은 화살표는 누를 수 없어요.', until: 'next', look: 'lantern' },
      { say: '등불이 나가는 길을 막고 있는 이 화살표를 먼저 빼 주세요.', find: 'lanternBlocker', until: 'leave' },
      { say: '이제 등불을 빼 보세요. 등불이 빠지면 주변의 그림자가 걷혀요.', find: 'kind:lantern', until: 'leave' },
      { say: LAST, until: 'clear' },
    ],
  },
  diagonal: {
    amount: 0.5,
    steps: wayLesson({
      free: 'kind:diag',
      blocked: 'blockedPast:diag',
      show: '머리가 비스듬한 이 화살표는 면 위에서 대각선으로 날아가요. 눌러 보세요.',
      hit: '이 대각선 화살표는 가는 길이 막혀 있어요. 눌러 보세요.',
      clear: '대각선으로 지나는 칸들이 비어 있어야 나갈 수 있어요. 막고 있는 이 화살표를 먼저 빼 주세요.',
      open: '이제 대각선으로 나갈 수 있어요.',
    }),
  },
  samurai: {
    N: 4,
    fill: 0.45,
    steps: [
      { say: '이 화살표는 길이 막혀 있어요. 눌러 보세요.', find: 'cutFrees', until: 'bump' },
      { say: '칼 머리를 한 사무라이는 길을 막는 화살표 하나를 베고 지나가요. 벤 곳부터 꼬리 쪽은 잘려 나가고 머리 쪽만 남아요. 사무라이를 빼 보세요.', find: 'cutterOf:0', until: 'leave' },
      { say: '길을 막던 몸통이 잘려 나갔어요! 이제 이 화살표가 나갈 수 있어요.', find: 'target:0', until: 'leave' },
      { say: `머리는 벨 수 없고, 하나를 벤 뒤에 또 막히면 사무라이도 못 나가요. ${LAST}`, until: 'clear' },
    ],
  },
  mondrian: {
    N: 4,
    fill: 0.35,
    amount: 0.1,
    steps: [
      { say: '검은 테두리를 두른 칸막이 안에 다른 화살표가 있으면, 그 칸막이 안으로는 들어갈 수 없어요. 이 화살표를 눌러 보세요.', find: 'panelBlocked', until: 'bump' },
      { say: '칸막이 안에 있는 이 화살표를 빼서 칸막이를 비워 주세요.', find: 'panelKeeper:0', until: 'leave' },
      { say: '칸막이가 비었어요! 이제 이 화살표가 그 안을 지나갈 수 있어요.', find: 'target:0', until: 'leave' },
      { say: `칸막이 안의 화살표는 몸통이 조금만 걸쳐 있어도 칸막이를 막아요. ${LAST}`, until: 'clear' },
    ],
  },
};

// The generator settings for a world's tutorial puzzle: a small cube of short arrows
// that wait on one another, with the gimmick.
export function tutorialParams(world, seed) {
  const { N = 3, fill = 0.75, len = [2, 4], amount = 1 } = TUTORIALS[world];
  return {
    N, minLen: len[0], maxLen: len[1], straight: 0.6, fill, block: 0.8, deep: 0, wrap: 0.2, long: 0,
    gimmick: world === 'home' ? null : world, amount, seed,
  };
}

// Cells a `through:` finder looks for on an arrow's way out.
const CELLS = {
  mirrors: (puz) => new Set(puz.mirrors.keys()),
  guards: (puz) => new Set(puz.guards.keys()),
  canals: (puz) => new Set(puz.canals.keys()),
  // Every cell a shadow falls on with the sun anywhere.
  shadows: (puz) => new Set(puz.sundial?.shadows.flatMap((s) => [...s]) ?? []),
};

// Arrow kinds a `kind:` finder looks for.
const KIND = {
  disc: (a) => a.disc,
  boom: (a) => !!a.boom,
  lantern: (a) => a.lantern,
  diag: (a) => a.diag,
};

// Whether the thing in arrow i's way, k cells along it (pose p), stands past where
// its gimmick turned it: after a mirror or a stretch of canal, out of a tunnel, over
// the edge for a discus, on the lane back for a boomerang. Diagonal arrows count
// wherever it is.
const PAST = {
  mirrors: (puz, i, p, k) => p.ray.slice(0, k).some((c) => puz.mirrors.has(c)),
  canals: (puz, i, p, k) => p.ray.slice(0, k).some((c) => puz.canals.has(c)),
  tunnel: (puz, i, p, k) => p.jumps.some((j) => j < k),
  disc: (puz, i, p, k) => puz.arrows[i].disc && puz.cube.faceOf(p.ray[k]) !== puz.cube.faceOf(p.cells.at(-1)),
  boom: (puz, i, p, k) => {
    if (!puz.arrows[i].boom) return false;
    const { cells } = puz.cube;
    const h = cells[p.cells.at(-1)].p;
    const q = cells[p.ray[k]].p;
    // Off the head's own line: some step across the way it points.
    return q.some((v, x) => v !== h[x] && !p.dir[x]);
  },
  diag: (puz, i) => puz.arrows[i].diag,
};

// The arrow step `find` points at now, or -1. `targets` are the earlier steps' arrows.
export function findTarget(puz, state, alive, find, targets) {
  const [name, arg] = find.split(':');
  const free = (i) => canExit(puz, state, i);
  const live = [...alive];
  const first = (test) => live.find(test) ?? -1;
  // What stands first in arrow i's way, if it is another arrow (not a tile) that can
  // leave now, so taking it out is the lesson's next step.
  const freeBlocker = (i) => {
    const b = blockAt(puz, state, i);
    return b && b.o >= 0 && b.o !== i && !b.tile && free(b.o) ? b : null;
  };
  const t = Number(arg);
  // The panel holding arrow i up, if that is what stops it, and the arrows other than
  // i sitting in panel p.
  const panelHolding = (i) => {
    if (free(i)) return undefined;
    const b = blockAt(puz, state, i);
    return b && b.o < 0 && !b.tile ? puz.panelOf?.get(pose(puz, state, i).ray[b.k]) : undefined;
  };
  const sitters = (p, i) => [...new Set(puz.panels[p].cells.map((c) => state.occ[c]).filter((o) => o >= 0 && o !== i))];
  // The arrows touching frozen arrow i.
  const touching = (i) => [...new Set(puz.arrows[i].extra.map((c) => ownerAt(puz, state, c)).filter((o) => o >= 0 && o !== i))];
  // A samurai that can leave now and whose cut lets arrow i leave.
  const cutterFor = (i) =>
    live.find((s) => {
      if (!puz.arrows[s].samurai || !free(s) || !cutBy(puz, state, s)) return false;
      const after = copyState(state);
      remove(puz, after, s);
      return canExit(puz, after, i);
    }) ?? -1;
  switch (name) {
    case 'free':
      return first(free);
    case 'blockedByFree':
      return first((i) => !free(i) && group(puz, i).length === 1 && !!freeBlocker(i));
    case 'blockedPast':
      return first((i) => {
        if (free(i) || group(puz, i).length > 1) return false;
        const b = freeBlocker(i);
        return !!b && PAST[arg](puz, i, pose(puz, state, i), b.k);
      });
    case 'gateBlocked':
      // Held by a gate (or vine) whose key (or machete) can leave now.
      return first((i) => {
        if (free(i)) return false;
        const b = blockAt(puz, state, i);
        return !!b && b.tile && b.o >= 0 && b.o !== i && free(b.o);
      });
    case 'blockerOf': {
      // What holds up step t's arrow (or its pair partner), if it can leave now.
      if (!alive.has(targets[t])) return -1;
      for (const j of group(puz, targets[t])) {
        const b = blockAt(puz, state, j);
        if (b && b.o >= 0 && b.o !== j && free(b.o)) return b.o;
      }
      return -1;
    }
    case 'target':
      return alive.has(targets[t]) && free(targets[t]) ? targets[t] : -1;
    case 'halfPair':
      // A pair one of whose arrows is held up by an arrow that can leave now.
      return first((i) => puz.arrows[i].partner >= 0 && !free(i) && !blockAt(puz, state, i) && !!freeBlocker(puz.arrows[i].partner));
    case 'through': {
      const cells = CELLS[arg](puz);
      // The longest way out first, so the turn is easy to follow.
      const ok = live.filter((i) => free(i) && pose(puz, state, i).ray.some((c) => cells.has(c)));
      return ok.sort((x, y) => pose(puz, state, y).ray.length - pose(puz, state, x).ray.length)[0] ?? -1;
    }
    case 'kind':
      return first((i) => KIND[arg](puz.arrows[i]) && free(i));
    case 'near': {
      // A free arrow with its head on the same face as the first dial.
      const face = puz.cube.faceOf(lookCell(puz, arg));
      return first((i) => free(i) && puz.cube.faceOf(pose(puz, state, i).cells.at(-1)) === face);
    }
    case 'tunnel':
      return first((i) => free(i) && pose(puz, state, i).jumps.length > 0);
    case 'lasso':
      return first((i) => puz.arrows[i].lasso && free(i) && !!caughtBy(puz, state, i));
    case 'iceHeld':
      // A frozen arrow with its way out clear, held by one arrow touching it that can
      // leave now.
      return first((i) => {
        if (!blockAt(puz, state, i)?.ice) return false;
        const by = touching(i);
        return by.length === 1 && free(by[0]);
      });
    case 'iceToucher': {
      // The one arrow touching step t's frozen arrow, if it can leave now.
      if (!alive.has(targets[t])) return -1;
      const by = touching(targets[t]);
      return by.length === 1 && free(by[0]) ? by[0] : -1;
    }
    case 'cutFrees':
      // Held up by another arrow, until a samurai's cut sets it free.
      return first((i) => !free(i) && !puz.arrows[i].samurai && blockAt(puz, state, i)?.o >= 0 && cutterFor(i) >= 0);
    case 'cutterOf':
      return alive.has(targets[t]) ? cutterFor(targets[t]) : -1;
    case 'canCharge':
      return first((i) => {
        if (!puz.arrows[i].run || free(i)) return false;
        const b = blockAt(puz, state, i);
        return !!b && b.k > 0;
      });
    case 'freedBy': {
      // An arrow that can leave now through cells step t's bull has charged off.
      const was = new Set(puz.arrows[targets[t]].cells);
      return first((i) => i !== targets[t] && free(i) && pose(puz, state, i).ray.some((c) => was.has(c)));
    }
    case 'curtainBlocked':
      // Held by a curtain whose colour's arrows can all leave now.
      return first((i) => {
        if (free(i)) return false;
        const b = blockAt(puz, state, i);
        const colour = b?.tile && b.o < 0 ? puz.curtains.get(pose(puz, state, i).ray[b.k]) : undefined;
        return colour !== undefined && live.filter((j) => puz.arrows[j].tint === colour).every(free);
      });
    case 'curtainKey': {
      // An arrow of the colour of the curtain holding up step t's arrow, through a
      // curtain of its own colour if one can.
      if (!alive.has(targets[t])) return -1;
      const b = blockAt(puz, state, targets[t]);
      const colour = b?.tile && b.o < 0 ? puz.curtains.get(pose(puz, state, targets[t]).ray[b.k]) : undefined;
      const ok = live.filter((i) => puz.arrows[i].tint === colour && free(i));
      const own = (i) => pose(puz, state, i).ray.some((c) => puz.curtains.get(c) === colour);
      return ok.find(own) ?? ok[0] ?? -1;
    }
    case 'wallBlocked':
      // Held up by a wall.
      return first((i) => {
        if (free(i)) return false;
        const b = blockAt(puz, state, i);
        return !!b && b.tile && b.o < 0 && !!puz.wallOf?.has(pose(puz, state, i).ray[b.k]);
      });
    case 'wallFace': {
      // An arrow that can leave now from the face of the wall holding step t's arrow up.
      if (!alive.has(targets[t])) return -1;
      const b = blockAt(puz, state, targets[t]);
      const w = b?.tile ? puz.wallOf?.get(pose(puz, state, targets[t]).ray[b.k]) : undefined;
      if (w === undefined) return -1;
      return first((i) => i !== targets[t] && free(i) && puz.cube.faceOf(pose(puz, state, i).cells.at(-1)) === puz.walls[w].face);
    }
    case 'panelBlocked':
      // Held up by a panel only one arrow sits in, which can leave now.
      return first((i) => {
        const p = panelHolding(i);
        if (p === undefined) return false;
        const inside = sitters(p, i);
        return inside.length === 1 && free(inside[0]);
      });
    case 'panelKeeper': {
      // The one arrow in the panel holding step t's arrow up, if it can leave now.
      if (!alive.has(targets[t])) return -1;
      const p = panelHolding(targets[t]);
      const inside = p === undefined ? [] : sitters(p, targets[t]);
      return inside.length === 1 && free(inside[0]) ? inside[0] : -1;
    }
    case 'lanternBlocker':
      // What stands first in a lantern's way, if it can leave now.
      for (const L of live) {
        if (!puz.arrows[L].lantern) continue;
        const b = blockAt(puz, state, L);
        if (b && b.o >= 0 && b.o !== L && free(b.o)) return b.o;
      }
      return -1;
    default:
      throw new Error(`unknown tutorial finder ${find}`);
  }
}

// The cell a step's `look` (or a `near:` finder) turns the cube to.
export function lookCell(puz, look) {
  switch (look) {
    case 'guard':
      return puz.guards.keys().next().value;
    case 'obelisk':
      return puz.sundial.obelisks[0];
    case 'dial':
      return puz.dials[0].centre;
    case 'lantern':
      return puz.arrows.find((a) => a.lantern).cells.at(-1);
    case 'wall':
      return puz.walls[0].cells[Math.floor(puz.walls[0].cells.length / 2)];
    default:
      throw new Error(`unknown tutorial look ${look}`);
  }
}


// Whether every arrow in `alive` can still be taken out from `state`. A clocked puzzle
// is searched through (its switch moves on with every arrow, so the greedy solver's
// order is not the only way, nor always one), with `memo` holding the arrow sets known
// to get stuck.
export function solvable(puz, state, alive, memo = new Set()) {
  if (!clocked(puz)) return solve(puz, state, [...alive]).solvable;
  if (!alive.size) return true;
  const key = [...alive].sort((a, b) => a - b).join(',');
  if (memo.has(key)) return false;
  for (const i of alive) {
    if (!canExit(puz, state, i)) continue;
    const s = copyState(state);
    remove(puz, s, i);
    const rest = new Set(alive);
    rest.delete(i);
    if (solvable(puz, s, rest, memo)) return true;
  }
  memo.add(key);
  return false;
}

// For a clocked puzzle, the chance that a player taking any arrow that can leave, at
// random, runs into a dead end from `state`.
export function deadEndChance(puz, state, alive, memo = new Map()) {
  if (!clocked(puz) || !alive.size) return 0;
  const key = [...alive].sort((a, b) => a - b).join(',');
  if (memo.has(key)) return memo.get(key);
  const out = [...alive].filter((i) => canExit(puz, state, i));
  let p = 1;
  if (out.length) {
    p = 0;
    for (const i of out) {
      const s = copyState(state);
      remove(puz, s, i);
      const rest = new Set(alive);
      rest.delete(i);
      p += deadEndChance(puz, s, rest, memo) / out.length;
    }
  }
  memo.set(key, p);
  return p;
}

// Plays a world's tutorial through as a player following it would, on its puzzle:
// each step finds its arrow when it should, and what is left for the last step can
// all be taken out. Returns { ok, why } and, when ok, the state and arrows left when
// the last step begins.
export function rehearse(puz, world) {
  const state = newState(puz);
  const alive = new Set(puz.arrows.keys());
  const targets = [];
  const steps = TUTORIALS[world].steps;
  for (const [k, step] of steps.entries()) {
    const fail = (why) => ({ ok: false, why: `step ${k + 1}: ${why}` });
    if (step.until === 'clear') return solvable(puz, state, alive) ? { ok: true, state, alive } : fail('the rest cannot be solved');
    if (step.until === 'next') {
      targets.push(-1);
      continue;
    }
    const t = findTarget(puz, state, alive, step.find, targets);
    if (t < 0) return fail(`nothing for ${step.find}`);
    if (inDark(puz, state, t)) return fail(`${step.find} found an arrow in the dark`);
    targets.push(t);
    if (step.until === 'leave') {
      for (const j of remove(puz, state, t)) alive.delete(j);
      if (deadEnd(puz, state, [...alive])) return fail('a dead end');
    } else if (step.until === 'charge') {
      if (!charge(puz, state, t)) return fail('the bull did not charge');
    } else if (step.until === 'bump' && canExit(puz, state, t)) {
      return fail(`${step.find} found an arrow that can leave`);
    }
  }
  return { ok: false, why: 'no clear step' };
}
