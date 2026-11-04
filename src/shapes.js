// Solids other than the cube, for the stages after the first eight of a world (the
// user's plan, 2026-11-04): blocks joined face to face (cube.js makeSolid). 집 안 uses
// the shapes of SHAPES, from ones that read at a glance to ones whose faces hide each
// other; a country's stages are sculptures grown for each stage (sculpt), but for its
// two landmarks (landmarks.js). `u` is the grid cells along a block's edge the
// generator panel starts a shape at: the most for which a cell still shows on screen
// no smaller than on the 15×15 cube, the finest grid of the cube stages (fitSolid). At
// about a third of these cells (the first sizes, u 2–4: 20 to 40 arrows) the shapes
// played far too easy (user, 2026-11-04). Pure logic.
import { makeCube, makeSolid, rng32 } from './cube.js';
import { LANDMARKS } from './landmarks.js';

// X×Y×Z blocks.
const box = (X, Y, Z) => {
  const out = [];
  for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) for (let z = 0; z < Z; z++) out.push([x, y, z]);
  return out;
};
// A flat outline of [x, y] squares, d blocks deep along z.
const deep = (flat, d) => flat.flatMap(([x, y]) => Array.from({ length: d }, (_, z) => [x, y, z]));

export const SHAPES = {
  // easy: boxes, no face hides another
  slab: { name: '납작한 판', level: 'easy', blocks: box(3, 1, 2), u: 5 },
  tower: { name: '높은 탑', level: 'easy', blocks: box(1, 3, 1), u: 7 },
  bar: { name: '긴 막대', level: 'easy', blocks: box(4, 1, 1), u: 5 },
  // medium: an inner corner or two
  ell: { name: 'L자', level: 'medium', blocks: deep([[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], 1), u: 5 },
  stairs: { name: '계단', level: 'medium', blocks: deep([[0, 0], [1, 0], [2, 0], [1, 1], [2, 1], [2, 2]], 2), u: 5 },
  tee: { name: 'T자', level: 'medium', blocks: deep([[0, 2], [1, 2], [2, 2], [1, 1], [1, 0]], 1), u: 6 },
  cup: { name: 'U자', level: 'medium', blocks: deep([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]], 2), u: 5 },
  // hard: holes, or parts that hide others
  arch: { name: '다리', level: 'hard', blocks: deep([[0, 0], [0, 1], [2, 0], [2, 1], [0, 2], [1, 2], [2, 2]], 1), u: 5 },
  ring: { name: '고리', level: 'hard', blocks: box(3, 1, 3).filter(([x, , z]) => !(x === 1 && z === 1)), u: 5 },
  cross: { name: '입체 십자', level: 'hard', blocks: [[1, 1, 1], [0, 1, 1], [2, 1, 1], [1, 0, 1], [1, 2, 1], [1, 1, 0], [1, 1, 2]], u: 7 },
  heart: {
    name: '하트',
    level: 'hard',
    blocks: deep([[0, 3], [1, 3], [3, 3], [4, 3], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 1], [2, 1], [3, 1], [2, 0]], 1),
    u: 4,
  },
  pyramid: { name: '계단 피라미드', level: 'hard', blocks: [...box(3, 1, 3), [1, 1, 1]], u: 5 },
};

// A sculpture of about `blocks` blocks, the same from `seed` every time (the user,
// 2026-11-04: from stage 9 no shape twice in a country, and sculptures like those of
// dist/samples/shapes2.html). It grows block by block from the middle of the floor of
// its space, mirrored left to right; each new block goes where it touches the most
// blocks already there of a few places tried. The seed picks the space and how many
// places: a 5×5×5 lump (four tried), a tower or a wide piece (two), or an airy one with
// arms (one, and growing upward twice as readily). Any room the blocks shut in is
// filled: no face inside could be seen.
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const STYLES = [
  { size: [5, 5, 5], tries: 4 },
  { size: [5, 7, 4], tries: 2 },
  { size: [7, 4, 5], tries: 2 },
  { size: [5, 5, 5], tries: 1, up: true },
];
export function sculpt(seed, blocks) {
  const rnd = rng32(seed);
  const { size, tries, up } = STYLES[Math.floor(rnd() * STYLES.length)];
  const ways = up ? [...DIRS, [0, 1, 0]] : DIRS;
  const key = (v) => v.join(',');
  const set = new Map();
  const put = (v) => {
    set.set(key(v), v);
    const m = [size[0] - 1 - v[0], v[1], v[2]];
    set.set(key(m), m);
  };
  const near = (v, d) => [v[0] + d[0], v[1] + d[1], v[2] + d[2]];
  const inside = (v) => v.every((x, a) => x >= 0 && x < size[a]);
  put([(size[0] - 1) / 2, 0, Math.floor(size[2] / 2)]);
  for (let guard = 0; set.size < blocks && guard < 20000; guard++) {
    const list = [...set.values()];
    let best = null;
    let most = -1;
    for (let t = 0; t < tries; t++) {
      const w = near(list[Math.floor(rnd() * list.length)], ways[Math.floor(rnd() * ways.length)]);
      if (!inside(w) || set.has(key(w))) continue;
      const score = DIRS.filter((d) => set.has(key(near(w, d)))).length + rnd();
      if (score > most) {
        most = score;
        best = w;
      }
    }
    if (best) put(best);
  }
  const outside = new Set([key([-1, -1, -1])]);
  for (const stack = [[-1, -1, -1]]; stack.length; ) {
    const v = stack.pop();
    for (const d of DIRS) {
      const w = near(v, d);
      if (w.some((x, a) => x < -1 || x > size[a]) || set.has(key(w)) || outside.has(key(w))) continue;
      outside.add(key(w));
      stack.push(w);
    }
  }
  for (const v of box(...size)) if (!set.has(key(v)) && !outside.has(key(v))) set.set(key(v), v);
  return [...set.values()];
}

// The blocks of the solid a puzzle with these params is on: a shape, a landmark, or
// (`shape: 'sculpt'`) the sculpture grown from `form`.
export const blocksOf = (params) =>
  params.shape === 'sculpt' ? sculpt(params.form, params.blocks) : (SHAPES[params.shape] ?? LANDMARKS[params.shape]).blocks;
// The surface a puzzle with these params is played on: the N×N cube, or with `shape`,
// that solid with N grid cells along each block's edge.
export const surfaceOf = (params) => (params.shape ? makeSolid(blocksOf(params), params.N) : makeCube(params.N));

// How a solid sits on screen, as game.js draws it from the camera's starting place:
// centred on the smallest ball round its blocks, no wider than the cube looks from
// there and at most a quarter taller (a phone screen has the room), yet never past the
// ball the cube turns in, whichever way it is turned. A shape whose box has empty
// corners (the cross) turns in a smaller ball than its box's and so shows bigger.
// For a cube of edge 1 (game.js scales by its S): `mid` is the centre in doubled grid
// coordinates and `k` units per doubled grid unit, so a cell is 2k across (1/N on the
// N×N cube).
export const START_VIEW = [6.2, 4.6, 7.4];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => {
  const l = Math.hypot(...a);
  return a.map((x) => x / l);
};
const SCREEN_X = unit(cross3([0, 1, 0], START_VIEW));
const SCREEN_Y = unit(cross3(START_VIEW, SCREEN_X));
// How far points (about the centre) reach across and up the screen from there.
function spread(points) {
  let wide = 0;
  let tall = 0;
  for (const p of points) {
    wide = Math.max(wide, Math.abs(p[0] * SCREEN_X[0] + p[1] * SCREEN_X[1] + p[2] * SCREEN_X[2]));
    tall = Math.max(tall, Math.abs(p[0] * SCREEN_Y[0] + p[1] * SCREEN_Y[1] + p[2] * SCREEN_Y[2]));
  }
  return { wide, tall };
}
const CUBE_SPREAD = spread([[-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1]]);
// The centre of the smallest ball round some points: step towards the farthest point by
// less and less (Bădoiu–Clarkson: after n steps within radius/√n of it), then snap to
// an eighth of a block (u/4 doubled units), so a symmetric shape gets its exact middle.
function ballCentre(points, u, steps) {
  let c = points[0];
  for (let i = 1; i <= steps; i++) {
    let far = c;
    let most = -1;
    for (const p of points) {
      const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
      if (d > most) {
        most = d;
        far = p;
      }
    }
    c = c.map((x, a) => x + (far[a] - x) / (i + 1));
  }
  return c.map((x) => (Math.round((4 * x) / u) * u) / 4);
}
export function fitSolid(cube, steps = 10000) {
  const { voxels, u } = cube;
  if (voxels.length === 1) {
    const mid = cube.size.map((n) => n * u);
    return { mid, k: Math.sqrt(3) / 2 / Math.hypot(...mid) };
  }
  const corners = new Map();
  for (const v of voxels) {
    for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) {
      const p = [x, y, z].map((e, a) => 2 * u * (v[a] + e));
      corners.set(p.join(), p);
    }
  }
  const mid = ballCentre([...corners.values()], u, steps);
  const away = [...corners.values()].map((p) => p.map((x, a) => x - mid[a]));
  const ball = Math.sqrt(3) / 2 / Math.max(...away.map((p) => Math.hypot(...p)));
  const { wide, tall } = spread(away);
  return { mid, k: Math.min(ball, (CUBE_SPREAD.wide / 2) / wide, (1.25 * CUBE_SPREAD.tall) / 2 / tall) };
}
// The most grid cells along a block's edge for which a cell of these blocks shows no
// smaller than on an n×n cube (the fit scales with u, so one look at u = 1 does).
export const mostCells = (blocks, n) => Math.max(2, Math.floor(2 * n * fitSolid(makeSolid(blocks, 1), 2000).k));
