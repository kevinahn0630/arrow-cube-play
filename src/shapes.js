// Solids other than the cube, for the stages after the first eight of a world (the
// user's plan, 2026-11-04): blocks joined face to face (cube.js makeSolid), from ones
// that read at a glance to ones whose faces hide each other. `u` is the grid cells
// along a block's edge: the most for which a cell still shows on screen no smaller
// than on the 15×15 cube, the game's finest grid. At about a third of these cells
// (the first sizes, u 2–4: 20 to 40 arrows) the shapes played far too easy (user,
// 2026-11-04). Pure logic.
import { makeCube, makeSolid } from './cube.js';

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
  ring: { name: '고리', level: 'hard', blocks: box(3, 1, 3).filter(([x, , z]) => !(x === 1 && z === 1)), u: 4 },
  cross: { name: '입체 십자', level: 'hard', blocks: [[1, 1, 1], [0, 1, 1], [2, 1, 1], [1, 0, 1], [1, 2, 1], [1, 1, 0], [1, 1, 2]], u: 6 },
  heart: {
    name: '하트',
    level: 'hard',
    blocks: deep([[0, 3], [1, 3], [3, 3], [4, 3], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 1], [2, 1], [3, 1], [2, 0]], 1),
    u: 4,
  },
  pyramid: { name: '계단 피라미드', level: 'hard', blocks: [...box(3, 1, 3), [1, 1, 1]], u: 4 },
};

// The surface a puzzle with these params is played on: the N×N cube, or with `shape`,
// that solid with N grid cells along each block's edge.
export const surfaceOf = (params) => (params.shape ? makeSolid(SHAPES[params.shape].blocks, params.N) : makeCube(params.N));
