// A landmark's blocks (landmarks.js: [x, y, z], y up, z towards the viewer) drawn as a
// little isometric toy: each block's top light, its front (+z) side in the colour, its
// right (+x) side darker, no outline; faces against another block are left out and
// blocks are drawn far to near. Locked, the same shape in grey. Returns an SVG string.
const mix = (a, b, k) => `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')}`;

export function miniature(blocks, color, { locked = false, size = 120 } = {}) {
  const has = new Set(blocks.map((b) => b.join()));
  const at = (x, y, z) => has.has(`${x},${y},${z}`);
  const C = 0.866, S = 0.5;
  const P = (x, y, z) => [(x - z) * C, (x + z) * S - y];
  const shade = locked
    ? { top: '#ece6ec', left: '#ddd4dd', right: '#cbc0cb' }
    : { top: mix(color, '#ffffff', 0.5), left: mix(color, '#ffffff', 0.12), right: mix(color, '#000000', 0.16) };
  const faces = [];
  const sorted = [...blocks].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]) || a[1] - b[1]);
  for (const [x, y, z] of sorted) {
    if (!at(x, y + 1, z)) faces.push([shade.top, [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)]]);
    if (!at(x, y, z + 1)) faces.push([shade.left, [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)]]);
    if (!at(x + 1, y, z)) faces.push([shade.right, [P(x + 1, y, z), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z)]]);
  }
  const pts = faces.flatMap(([, q]) => q);
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  const pad = 0.35;
  const w = maxX - minX + 2 * pad, h = maxY - minY + 2 * pad;
  const f = (n) => n.toFixed(3);
  const body = faces.map(([fill, q]) => `<path d="M${q.map(([a, b]) => `${f(a)} ${f(b)}`).join('L')}Z" fill="${fill}" stroke="${fill}" stroke-width="0.09" stroke-linejoin="round"/>`).join('');
  return `<svg class="mini" viewBox="${f(minX - pad)} ${f(minY - pad)} ${f(w)} ${f(h)}" width="${size}" height="${Math.round((size * h) / w)}" aria-hidden="true">${body}</svg>`;
}
