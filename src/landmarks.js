// Each country's two landmarks (or things it is known for), the solids of its stages
// 35 and 40, played after its second star (the user, 2026-11-04: landmarks late on and
// especially hard; every other stage from 9 is a sculpture of its own, shapes.js
// sculpt). The first of a country's two is its last stage, the one that can be made
// harder (Greece's Santorini house and Japan's Fuji hold more than the Parthenon and the
// torii, so close their countries). Chosen from
// dist/samples/gallery-landmarks.jpg, those first drawn wide or thin since drawn about
// five blocks each way: a wide or thin solid shows big cells on screen, so holds few
// and could not be made hard. Pure data.
//
// Blocks are [x, y, z], y up, z towards the starting view. `lay(...layers)` builds a
// solid from horizontal layers, bottom first; each layer is rows from back (z = 0) to
// front, columns left to right, '#' a block.
const lay = (...layers) =>
  layers.flatMap((rows, y) => rows.flatMap((row, z) => [...row].flatMap((ch, x) => (ch === '#' ? [[x, y, z]] : []))));
const box = (X, Y, Z, [ox, oy, oz] = [0, 0, 0]) => {
  const v = [];
  for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) for (let z = 0; z < Z; z++) v.push([ox + x, oy + y, oz + z]);
  return v;
};
const join = (...parts) => [...new Map(parts.flat().map((v) => [v.join(), v])).values()];
const rep = (row, n) => Array(n).fill(row);
const sq = (n) => rep('#'.repeat(n), n);
const ring = (n) => ['#'.repeat(n), ...rep(`#${'.'.repeat(n - 2)}#`, n - 2), '#'.repeat(n)];
const round5 = ['.###.', '#####', '#####', '#####', '.###.'];
const mid3in5 = ['.....', '.###.', '.###.', '.###.', '.....'];
const plus5 = ['.....', '..#..', '.###.', '..#..', '.....'];
const dot5 = ['.....', '.....', '..#..', '.....', '.....'];
const plus3 = ['.#.', '###', '.#.'];
const dot3 = ['...', '.#.', '...'];
const corners5 = ['#...#', '.....', '.....', '.....', '#...#'];
const hall5 = ['#...#', '.###.', '.###.', '.###.', '#...#']; // a 3×3 hall with a tower at each corner

const LIST = [
  ['gate', 'pagoda', '탑', lay(mid3in5, sq(5), mid3in5, sq(5), mid3in5, dot5, dot5)],
  ['gate', 'greatwall', '만리장성', lay(
    ['##...', '##...', '.###.', '...##', '...##'],
    ['##...', '##...', '.###.', '...##', '...##'],
    ['##...', '##...', '.#.#.', '...##', '...##'],
    ['##...', '##...', '.....', '...##', '...##'],
  )],
  ['pair', 'cheomseongdae', '첨성대', lay(sq(5), round5, round5, mid3in5, mid3in5, ['.....', '.###.', '.#.#.', '.###.', '.....'])],
  ['pair', 'namdaemun', '숭례문', lay(rep('##.##', 3), rep('#####', 3), rep('.###.', 3), rep('#####', 3), rep('.###.', 3))],
  ['mirror', 'eiffel', '에펠탑', lay(['##.##', '##.##', '.....', '##.##', '##.##'], sq(5), ['.....', '.#.#.', '.....', '.#.#.', '.....'], mid3in5, plus5, dot5, dot5)],
  ['mirror', 'arc', '개선문', lay(rep('##.##', 2), rep('##.##', 2), rep('#####', 2), rep('#####', 2))],
  ['bell', 'bigben', '빅벤', join(box(5, 2, 3), box(3, 3, 3, [1, 2, 0]), [[2, 5, 0], [1, 5, 1], [2, 5, 1], [3, 5, 1], [2, 5, 2], [2, 6, 1]])],
  ['bell', 'towerbridge', '타워 브리지', lay(rep('##..##', 3), rep('######', 3), rep('##..##', 3), ['######', '##..##', '##..##'], rep('##..##', 3))],
  ['discus', 'santorini', '산토리니 집', join(box(3, 2, 3), lay([], [], plus3, dot3), box(2, 1, 2, [3, 0, 1]))],
  ['discus', 'parthenon', '파르테논', lay(rep('#######', 4), ['#.#.#.#', '#.....#', '#.....#', '#.#.#.#'], ['#.#.#.#', '#.....#', '#.....#', '#.#.#.#'], rep('#######', 4), rep('..###..', 4))],
  ['aurora', 'cntower', 'CN 타워', lay(sq(5), mid3in5, plus5, plus5, round5, mid3in5, plus5, dot5)],
  ['aurora', 'inuksuk', '이누크슈크', join(box(1, 2, 2, [1, 0, 0]), box(1, 2, 2, [3, 0, 0]), box(3, 1, 2, [1, 2, 0]), box(1, 1, 2, [2, 3, 0]), box(5, 1, 2, [0, 4, 0]), box(1, 1, 2, [2, 5, 0]))],
  ['wall', 'brandenburg', '브란덴부르크 문', lay(rep('#.#.#.#', 2), rep('#.#.#.#', 2), rep('#.#.#.#', 2), rep('#######', 2), rep('..###..', 2))],
  ['wall', 'neuschwanstein', '노이슈반슈타인 성', join(box(5, 3, 4), box(2, 3, 2, [3, 3, 0]), box(1, 2, 1, [0, 3, 3]), box(3, 1, 2, [0, 3, 1]), box(1, 1, 1, [4, 6, 0]))],
  ['tunnel', 'bluemosque', '블루 모스크', lay(sq(5), sq(5), hall5, ['#...#', '.....', '..#..', '.....', '#...#'], corners5)],
  ['tunnel', 'galata', '갈라타 탑', lay(round5, round5, round5, round5, round5, mid3in5, dot5)],
  ['sundial', 'gizapyramid', '피라미드', lay(sq(5), sq(5), mid3in5, mid3in5, dot5)],
  ['sundial', 'sphinx', '스핑크스', lay(['###', '###', '###', '###', '###', '#.#'], ['###', '###', '###', '###', '###', '...'], ['...', '...', '...', '###', '###', '...'], ['...', '...', '...', '.#.', '.#.', '...'])],
  ['lasso', 'empirestate', '엠파이어 스테이트', lay(sq(5), sq(5), sq(5), mid3in5, mid3in5, mid3in5, dot5, dot5)],
  ['lasso', 'goldengate', '금문교', lay(rep('.#...#.', 3), rep('#######', 3), rep('.#...#.', 3), rep('.#...#.', 3), rep('.#####.', 3))],
  ['dial', 'chichenitza', '치첸이트사', lay(sq(5), sq(5), mid3in5, ['.....', '.###.', '.###.', '.#.#.', '.....'], mid3in5)],
  ['dial', 'sombrero', '솜브레로', lay(round5, mid3in5, mid3in5, mid3in5, dot5)],
  ['boomerang', 'operahouse', '오페라하우스', lay(sq(5), ['#####', '#####', '#####', '##.##', '##.##'], ['#####', '#####', '##.##', '##.##', '.....'], ['##.##', '##.##', '##.##', '.....', '.....'], ['##.##', '##.##', '.....', '.....', '.....'])],
  ['boomerang', 'harbourbridge', '하버 브리지', lay(rep('#######', 3), rep('##...##', 3), rep('.##.##.', 3), rep('..###..', 3))],
  ['canal', 'pisa', '피사의 사탑', join(box(3, 2, 3), box(3, 2, 3, [1, 2, 0]), box(3, 2, 3, [2, 4, 0]), box(1, 1, 1, [3, 6, 1]))],
  ['canal', 'colosseum', '콜로세움', lay(ring(5), ['#.#.#', '.....', '#...#', '.....', '#.#.#'], ring(5), ['#####', '#...#', '#...#', '#...#', '###..'])],
  ['ice', 'basil', '성 바실리 성당', lay(sq(5), sq(5), ['#...#', '.###.', '.###.', '.###.', '#...#'], ['#...#', '.###.', '.###.', '.###.', '#...#'], mid3in5, dot5, dot5)],
  ['ice', 'matryoshka', '마트료시카', lay(round5, round5, round5, mid3in5, mid3in5, mid3in5, dot5)],
  ['encierro', 'sagrada', '사그라다 파밀리아', join(box(5, 2, 3), box(1, 3, 1, [0, 2, 1]), box(1, 4, 1, [1, 2, 1]), box(1, 5, 1, [2, 2, 1]), box(1, 4, 1, [3, 2, 1]), box(1, 3, 1, [4, 2, 1]))],
  ['encierro', 'bull', '황소', join([[0, 0, 0], [2, 0, 0], [0, 0, 4], [2, 0, 4]], box(3, 2, 5, [0, 1, 0]), box(1, 2, 2, [1, 1, 5]), [[0, 2, 5], [0, 3, 5], [2, 2, 5], [2, 3, 5]])],
  ['vine', 'redeemer', '예수상', join(box(3, 2, 2, [2, 0, 0]), box(1, 4, 2, [3, 2, 0]), box(7, 1, 2, [0, 5, 0]), box(1, 1, 2, [3, 6, 0]))],
  ['vine', 'sugarloaf', '슈가로프 산', lay(sq(5), round5, ['.....', '.###.', '.###.', '.##..', '.....'], ['.....', '..##.', '..##.', '.....', '.....'], ['.....', '...#.', '.....', '.....', '.....'])],
  ['lantern', 'watarun', '왓 아룬', lay(sq(5), hall5, hall5, mid3in5, plus5, dot5, dot5)],
  ['lantern', 'elephant', '코끼리', join([[0, 0, 0], [2, 0, 0], [0, 0, 3], [2, 0, 3]], box(3, 2, 4, [0, 1, 0]), box(3, 2, 1, [0, 2, 4]), [[1, 2, 5], [1, 1, 5], [1, 0, 5], [-1, 2, 4], [3, 2, 4]])],
  ['diagonal', 'tajmahal', '타지마할', lay(sq(5), hall5, hall5, hall5, ['#...#', '..#..', '.###.', '..#..', '#...#'], dot5)],
  ['diagonal', 'indiagate', '인도 문', lay(rep('##.##', 2), rep('##.##', 2), rep('##.##', 2), rep('#####', 2), rep('.###.', 2))],
  ['samurai', 'fuji', '후지산', lay(sq(5), round5, mid3in5, ['.....', '.###.', '.#.#.', '.###.', '.....'])],
  ['samurai', 'torii', '도리이', lay(rep('.#...#.', 2), rep('.#...#.', 2), rep('.#####.', 2), rep('#######', 2))],
  ['mondrian', 'windmill', '풍차', join(box(3, 4, 3), box(5, 1, 1, [-1, 3, 3]), box(1, 5, 1, [1, 1, 3]))],
  ['mondrian', 'canalhouses', '운하 집', join(box(2, 3, 3), box(1, 1, 3, [0, 3, 0]), box(2, 4, 3, [2, 0, 0]), box(1, 1, 3, [3, 4, 0]), box(2, 3, 3, [4, 0, 0]), box(1, 1, 3, [4, 3, 0]), box(2, 5, 3, [6, 0, 0]), box(1, 1, 3, [7, 5, 0]))],
];

// key → { name, country (its gimmick), blocks }.
export const LANDMARKS = Object.fromEntries(LIST.map(([country, key, name, blocks]) => [key, { name, country, blocks }]));
// country → its two landmark keys: [the one for stage 40, the one for stage 35].
export const LANDMARKS_OF = LIST.reduce((m, [country, key]) => ({ ...m, [country]: [...(m[country] ?? []), key] }), {});
