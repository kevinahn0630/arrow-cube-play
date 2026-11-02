// Pictures behind the cube, one per world, drawn as SVG for the screen at hand. The
// cube sits in the middle and reaches about half the shorter side out, so a portrait
// screen has room above and below it, a landscape one beside it, and the corners are
// clear on both. Each picture keeps its landmarks to the bottom corners and its sun,
// moon, clouds or lanterns to the top ones (under the HUD), and keeps whatever passes
// behind the see-through cube pale. The sky colour itself is the theme's `background`
// (themes.js). Plain string building: game.js puts it in the page.

export function scenery(world, w, h) {
  const draw = SCENES[world];
  if (!draw || !(w > 0 && h > 0)) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${draw(layout(w, h))}</svg>`;
}

// Where things go on a w × h screen.
function layout(w, h) {
  const r = Math.min(w, h) / 2; // how far out the cube reaches at the default zoom
  const tall = w < h;
  const band = Math.max(0, h / 2 - r); // portrait: the room above and below the cube
  // The biggest square in a corner of the screen that stays out of that reach.
  const k = w + h;
  const corner = (k - Math.sqrt(k * k - 8 * ((w * w + h * h) / 4 - r * r))) / 4;
  return {
    w, h, r, band, corner,
    big: Math.min(corner * 0.85, w * 0.45), // a landmark in a bottom corner
    ground: Math.max(0.06 * h, 0.3 * band), // the strip along the bottom edge
    // A sun or moon in the top-left corner, under the HUD (mirror x for the right one).
    sky: tall ? { x: w * 0.18, y: band * 0.7, r: band * 0.1 } : { x: corner * 0.45, y: corner * 0.62, r: corner * 0.1 },
  };
}

const n = (v) => Math.round(v * 10) / 10;
const u = (v) => Math.round(v * 1000) / 1000;

// A motif drawn in its own units (about 1 across, standing on y = 0) put at (x, y),
// s pixels to the unit; `flip` mirrors it left to right.
const put = (x, y, s, body, flip = false) =>
  `<g transform="translate(${n(x)} ${n(y)}) scale(${(flip ? -s : s).toFixed(3)} ${s.toFixed(3)})">${body}</g>`;

// The same numbers every time, so a picture does not change when it is drawn again.
function random(seed) {
  let s = seed;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

// ---------- shared pieces

// A sun or moon: a disc with a soft glow round it (one per colour in a picture).
function disc(x, y, r, fill, edge = fill) {
  const glow = `sc-glow-${fill.slice(1)}`;
  return (
    `<defs><radialGradient id="${glow}"><stop offset="0.45" stop-color="${fill}" stop-opacity="0.45"/><stop offset="1" stop-color="${fill}" stop-opacity="0"/></radialGradient></defs>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 2.2)}" fill="url(#${glow})"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" stroke="${edge}" stroke-width="${n(r * 0.06)}"/>`
  );
}

// A bell-shaped bump from x - hw to x + hw standing on `base`, rising to `top`.
const bell = (x, hw, top, base) =>
  `M${n(x - hw)} ${n(base)}C${n(x - hw * 0.5)} ${n(base)} ${n(x - hw * 0.6)} ${n(top)} ${n(x)} ${n(top)}` +
  `C${n(x + hw * 0.6)} ${n(top)} ${n(x + hw * 0.5)} ${n(base)} ${n(x + hw)} ${n(base)}`;

// Round hills or peaks on `base`, each [middle, half-width, height] in pixels.
const hills = (base, list, fill) => `<path d="${list.map(([x, hw, ht]) => `${bell(x, hw, base - ht, base)}Z`).join('')}" fill="${fill}"/>`;

// Pointed mountains on `base`, each [middle, half-width, height], with snow on top.
function mountains(base, list, fill, snow) {
  let d = '';
  let caps = '';
  for (const [x, hw, ht] of list) {
    const t = base - ht;
    d += `M${n(x - hw)} ${n(base)}L${n(x)} ${n(t)}L${n(x + hw)} ${n(base)}Z`;
    const k = 0.3;
    caps +=
      `M${n(x)} ${n(t)}L${n(x - hw * k)} ${n(t + ht * k)}L${n(x - hw * k * 0.4)} ${n(t + ht * k * 0.8)}` +
      `L${n(x)} ${n(t + ht * k * 1.05)}L${n(x + hw * k * 0.45)} ${n(t + ht * k * 0.8)}L${n(x + hw * k)} ${n(t + ht * k)}Z`;
  }
  return `<path d="${d}" fill="${fill}"/><path d="${caps}" fill="${snow}"/>`;
}

// Flat ground from y = top to the bottom edge.
const floor = (w, h, top, fill) => `<rect y="${n(top)}" width="${w}" height="${n(h - top)}" fill="${fill}"/>`;

// Water from y = top to the bottom edge, shading from `from` to `to`, with short
// white glints on it.
function water(w, h, top, [from, to], seed) {
  const rand = random(seed);
  const id = `sc-water-${seed}`;
  let glints = '';
  for (let i = 0; i < w / 30; i++) glints += `M${n(rand() * w)} ${n(top + (0.12 + rand() * 0.85) * (h - top))}h${n(5 + rand() * 12)}`;
  return (
    `<defs><linearGradient id="${id}" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect y="${n(top)}" width="${w}" height="${n(h - top)}" fill="url(#${id})"/>` +
    `<path d="${glints}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"/>`
  );
}

// Three birds round (x, y), s across, each a pair of little arcs.
const birds = (x, y, s, colour = '#6f86a6') =>
  `<path d="${[[-0.9, 0.2, 1], [0.3, -0.4, 0.8], [0.9, 0.5, 0.65]]
    .map(([dx, dy, k]) => {
      const gx = x + dx * s;
      const gy = y + dy * s;
      const a = s * 0.32 * k;
      return `M${n(gx - a)} ${n(gy)}Q${n(gx - a / 2)} ${n(gy - a * 0.6)} ${n(gx)} ${n(gy)}Q${n(gx + a / 2)} ${n(gy - a * 0.6)} ${n(gx + a)} ${n(gy)}`;
    })
    .join('')}" fill="none" stroke="${colour}" stroke-width="${n(Math.max(1.2, s * 0.05))}" stroke-linecap="round"/>`;

// A cloud s across with its flat bottom at (x, y).
const CLOUD =
  '<path d="M0.04 0H0.96C1.06 0 1.06 -0.17 0.94 -0.2C0.95 -0.34 0.78 -0.42 0.66 -0.33C0.6 -0.5 0.34 -0.52 0.28 -0.33C0.15 -0.38 0.04 -0.28 0.08 -0.16C-0.04 -0.15 -0.04 0 0.04 0Z"/>';
const cloud = (x, y, s, fill = '#ffffff', opacity = 0.9) => put(x, y, s, `<g fill="${fill}" opacity="${opacity}">${CLOUD}</g>`);

// Faint stars over the top part of the screen.
function stars(w, h, seed, part = 0.75) {
  const rand = random(seed);
  let out = '';
  for (let i = 0; i < (w * h) / 6000; i++) {
    out += `<circle cx="${n(rand() * w)}" cy="${n(rand() * h * part)}" r="${n(0.6 + rand())}" fill="#ffffff" opacity="${(0.25 + rand() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

// Up to `count` spots above y = bottom where the cube leaves room and the HUD does not
// sit, for things about `size` across (bigger lower down): [{x, y, s}].
function scatter({ w, h, r }, count, size, seed, bottom) {
  const rand = random(seed);
  const out = [];
  for (let i = 0; i < 600 && out.length < count; i++) {
    const x = rand() * w;
    const y = rand() * bottom;
    const s = size * (0.55 + 0.6 * (y / h)) * (0.8 + rand() * 0.4);
    const room =
      Math.hypot(x - w / 2, y - h / 2) > r + s * 2.5 &&
      !(y < 80 + s * 2 && (x < 180 || x > w - 130)) &&
      out.every((o) => Math.hypot(o.x - x, o.y - y) > (o.s + s) * 2.4);
    if (room) out.push({ x, y, s });
  }
  return out;
}

// Something hanging on a cord from the top edge, its middle at (x, y), r to the unit.
const hang = (x, y, r, body) =>
  `<path d="M${n(x)} 0V${n(y - r * 1.08)}" stroke="#8a5a3c" stroke-width="${n(Math.max(1, r * 0.05))}"/>` + put(x, y, r, body);

// A five-pointed star of radius r at (x, y), in the motif's own units.
const star = (x, y, r, fill) =>
  `<path d="${Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const k = i % 2 ? r * 0.45 : r;
    return `${i ? 'L' : 'M'}${u(x + Math.cos(a) * k)} ${u(y + Math.sin(a) * k)}`;
  }).join('')}Z" fill="${fill}"/>`;

// Flags on a cord sagging across the top-left corner, under the HUD: pennants, or
// papel picado (cut paper with a zigzag edge and holes).
function flags({ x, y, r }, colours, picado = false) {
  const x1 = x * 2.6;
  const y0 = y * 0.6;
  const y1 = y * 0.45;
  const sag = y * 0.35;
  const count = Math.max(4, Math.round(x1 / (r * 1.5)));
  let out = `<path d="M0 ${n(y0)}Q${n(x1 / 2)} ${n(y0 + sag)} ${n(x1)} ${n(y1)}" fill="none" stroke="#8a6a55" stroke-width="1"/>`;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const fx = x1 * t;
    const fy = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * (y0 + sag) + t * t * y1;
    const fw = r * 0.9;
    const fh = r * 1.1;
    const fill = colours[i % colours.length];
    if (!picado) {
      out += `<path d="M${n(fx - fw / 2)} ${n(fy)}H${n(fx + fw / 2)}L${n(fx)} ${n(fy + fh)}Z" fill="${fill}" stroke="#dccbc0" stroke-width="0.6"/>`;
      continue;
    }
    let d = `M${n(fx - fw / 2)} ${n(fy)}H${n(fx + fw / 2)}V${n(fy + fh)}`;
    for (let k = 1; k <= 5; k++) d += `L${n(fx + fw / 2 - (fw * (k - 0.5)) / 5)} ${n(fy + fh - fw * 0.12)}L${n(fx + fw / 2 - (fw * k) / 5)} ${n(fy + fh)}`;
    out +=
      `<path d="${d}Z" fill="${fill}"/>` +
      `<circle cx="${n(fx)}" cy="${n(fy + fh * 0.42)}" r="${n(fw * 0.15)}" fill="#ffffff" opacity="0.75"/>` +
      `<path d="M${n(fx - fw * 0.3)} ${n(fy + fh * 0.2)}h${n(fw * 0.12)}M${n(fx + fw * 0.18)} ${n(fy + fh * 0.2)}h${n(fw * 0.12)}" stroke="#ffffff" stroke-opacity="0.75" stroke-width="${n(Math.max(1, fw * 0.08))}"/>`;
  }
  return out;
}

// A spruce about 0.44 across and 1 tall (colour from the caller).
const SPRUCE =
  '<path d="M0 -1L0.12 -0.76H0.06L0.17 -0.53H0.09L0.21 -0.3H0.11L0.22 -0.1H0.03V0H-0.03V-0.1H-0.22L-0.11 -0.3H-0.21L-0.09 -0.53H-0.17L-0.06 -0.76H-0.12Z"/>';

// A palm about 0.9 across and 1 tall, leaning right.
const PALM = (() => {
  const leaf = 'M0 0C0.12 -0.1 0.3 -0.1 0.44 0.04C0.28 -0.02 0.14 -0.01 0 0Z';
  const fronds = [-70, -35, -5, 25].map((a) => `<path transform="rotate(${a})" d="${leaf}"/>`).join('');
  return (
    '<path d="M0 0C0.02 -0.35 0.1 -0.7 0.14 -0.92" fill="none" stroke="#9b7b55" stroke-width="0.05" stroke-linecap="round"/>' +
    `<g transform="translate(0.14 -0.92)" fill="#5b8c4a">${fronds}<g transform="scale(-1 1)">${fronds}</g></g>`
  );
})();

// A big leaf 1 long pointing up from (0, 0).
const LEAF = 'M0 0C-0.25 -0.2 -0.22 -0.7 0 -1C0.22 -0.7 0.25 -0.2 0 0Z';

// ---------- 집 안: a cosy room — a window with curtains, a lamp hanging from the
// ceiling, a bookshelf of books in the game's link colours, a sleeping cat beside a
// potted plant, and a rug on the wooden floor

function home({ w, h, band, big, ground, sky }) {
  const floor = h - ground * 0.8;
  const rail = floor - (band ? band * 0.35 : h * 0.12);
  const deep = h - floor;
  const rand = random(8);
  let planks = '';
  for (let row = 1; row < 4; row++) planks += `M0 ${n(floor + (deep * row) / 4)}H${w}`;
  for (let row = 0; row < 4; row++) {
    for (let x = rand() * 80; x < w; x += 70 + rand() * 60) planks += `M${n(x)} ${n(floor + (deep * row) / 4)}v${n(deep / 4)}`;
  }
  const lamp = { x: w - sky.x, y: sky.y * 0.8, r: sky.r * 1.3 };
  return (
    '<defs><radialGradient id="sc-lamp"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs>' +
    `<rect y="${n(rail)}" width="${w}" height="${n(floor - rail)}" fill="#f3e3df"/>` +
    `<rect y="${n(rail - 3)}" width="${w}" height="4" fill="#fbf4f1"/>` +
    put(sky.x * 1.15, sky.y, sky.r * 1.6, WINDOW) +
    `<path d="M${n(lamp.x)} 0V${n(lamp.y - lamp.r * 0.45)}" stroke="#6b6f86" stroke-width="1.5"/>` +
    put(lamp.x, lamp.y, lamp.r, LAMP) +
    `<rect y="${n(floor)}" width="${w}" height="${n(deep)}" fill="#ecd5c0"/>` +
    `<path d="${planks}" stroke="#e0c2a8" stroke-width="1.5"/>` +
    `<rect y="${n(floor - Math.max(4, ground * 0.1))}" width="${w}" height="${n(Math.max(4, ground * 0.1))}" fill="#fbf8f3"/>` +
    `<ellipse cx="${n(w / 2)}" cy="${n(floor + deep * 0.58)}" rx="${n(w * 0.3)}" ry="${n(deep * 0.36)}" fill="#dcc6e4"/>` +
    `<ellipse cx="${n(w / 2)}" cy="${n(floor + deep * 0.58)}" rx="${n(w * 0.26)}" ry="${n(deep * 0.27)}" fill="none" stroke="#efe4f3" stroke-width="${n(Math.max(1.5, deep * 0.05))}"/>` +
    put(big * 0.02, floor + deep * 0.3, big * 1.05, BOOKSHELF) +
    put(w - big * 0.95, floor + deep * 0.4, big * 0.95, PLANT_CAT)
  );
}

// A window with the sky and a cloud in it, curtains tied back and a sill; about 2.9
// across, centred on (0, 0).
const WINDOW =
  '<rect x="-1.1" y="-1" width="2.2" height="1.9" fill="#ffffff"/>' +
  '<rect x="-0.98" y="-0.88" width="1.96" height="1.66" fill="#fde3da"/>' +
  `<g transform="translate(-0.55 0.25) scale(0.85)" fill="#ffffff">${CLOUD}</g>` +
  '<path d="M0 -0.88V0.78M-0.98 -0.05H0.98" stroke="#ffffff" stroke-width="0.08"/>' +
  '<rect x="-1.25" y="0.88" width="2.5" height="0.15" rx="0.04" fill="#e9dccb"/>' +
  '<path d="M-1.35 -1.15H-0.7C-0.75 -0.6 -0.9 0.1 -1 0.3C-0.92 0.5 -0.85 0.8 -0.8 1H-1.35Z" fill="#dcc6e4"/>' +
  '<path d="M1.35 -1.15H0.7C0.75 -0.6 0.9 0.1 1 0.3C0.92 0.5 0.85 0.8 0.8 1H1.35Z" fill="#dcc6e4"/>' +
  '<path d="M-1.35 0.3H-0.98M1.35 0.3H0.98" stroke="#c8adcf" stroke-width="0.08"/>' +
  '<rect x="-1.5" y="-1.24" width="3" height="0.09" rx="0.045" fill="#b98a64"/>';

// A lamp shade in the home world's colour with its bulb glowing under it, about 1.6
// across, its middle at (0, 0).
const LAMP =
  '<circle cy="0.45" r="1.6" fill="url(#sc-lamp)"/>' +
  '<path d="M-0.35 -0.45H0.35L0.8 0.3H-0.8Z" fill="#e2786a"/>' +
  '<path d="M-0.8 0.3H0.8" stroke="#c9645a" stroke-width="0.08"/>' +
  '<ellipse cy="0.36" rx="0.22" ry="0.16" fill="#fff4c9"/>';

// A bookshelf 0.62 across and about 1 tall: books in the game's link colours, a little
// plant, a photo and a vase on top.
const BOOKSHELF = (() => {
  const rand = random(5);
  const colours = ['#e2786a', '#e09f1f', '#d6336c', '#0f9d9a', '#9b59b6', '#6b8e23', '#3a8fd6', '#e8590c'];
  let books = '';
  // [shelf top, from, to]
  for (const [y, from, to] of [[-0.03, 0.04, 0.58], [-0.33, 0.04, 0.4], [-0.63, 0.2, 0.58]]) {
    for (let x = from; x < to - 0.04; ) {
      const bw = 0.035 + rand() * 0.025;
      const bh = 0.17 + rand() * 0.08;
      books += `<rect x="${u(x)}" y="${u(y - bh)}" width="${u(bw)}" height="${u(bh)}" fill="${colours[Math.floor(rand() * colours.length)]}"/>`;
      x += bw + 0.006;
    }
  }
  return (
    '<rect x="0" y="-0.98" width="0.62" height="0.98" fill="#b98a64"/>' +
    '<rect x="0.03" y="-0.95" width="0.56" height="0.92" fill="#dcc4a4"/>' +
    '<rect x="0.03" y="-0.33" width="0.56" height="0.03" fill="#b98a64"/>' +
    '<rect x="0.03" y="-0.63" width="0.56" height="0.03" fill="#b98a64"/>' +
    books +
    '<path d="M0.45 -0.33L0.44 -0.4H0.56L0.55 -0.33Z" fill="#d98a62"/>' +
    '<ellipse cx="0.47" cy="-0.44" rx="0.035" ry="0.05" fill="#5aa66e"/><ellipse cx="0.53" cy="-0.45" rx="0.035" ry="0.06" fill="#4f9a6a"/>' +
    '<rect x="0.06" y="-0.82" width="0.11" height="0.19" fill="#f4ede2"/><rect x="0.075" y="-0.8" width="0.08" height="0.14" fill="#b9d7ee"/>' +
    '<path d="M0.075 -0.66L0.1 -0.71L0.12 -0.68L0.135 -0.7L0.155 -0.66Z" fill="#7fb08a"/>' +
    '<path d="M0.42 -0.98Q0.4 -1.06 0.44 -1.1H0.5Q0.54 -1.06 0.52 -0.98Z" fill="#dcc6e4"/>' +
    '<path d="M0.47 -1.1V-1.2" stroke="#4f9a6a" stroke-width="0.012"/><circle cx="0.47" cy="-1.22" r="0.025" fill="#e0457b"/>'
  );
})();

// A sleeping cat curled up on its cushion beside a potted plant, about 1 across.
const PLANT_CAT =
  [[0.72, -0.22, -32, 0.5, '#4f9a6a'], [0.76, -0.22, 6, 0.64, '#3f8a5a'], [0.8, -0.22, 40, 0.48, '#5aa66e'], [0.74, -0.22, -10, 0.4, '#5aa66e']]
    .map(([x, y, a, s, fill]) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="${LEAF}" fill="${fill}"/><path d="M0 0V-0.95" stroke="#8fd08a" stroke-width="0.02"/></g>`)
    .join('') +
  '<path d="M0.62 -0.24H0.9L0.87 0H0.65Z" fill="#d98a62"/>' +
  '<rect x="0.6" y="-0.27" width="0.32" height="0.05" rx="0.015" fill="#c97a54"/>' +
  '<ellipse cx="0.28" cy="-0.05" rx="0.25" ry="0.06" fill="#dcc6e4"/>' +
  '<ellipse cx="0.28" cy="-0.08" rx="0.22" ry="0.05" fill="#efe4f3"/>' +
  '<ellipse cx="0.3" cy="-0.14" rx="0.16" ry="0.085" fill="#f0a868"/>' +
  '<path d="M0.44 -0.12C0.48 -0.06 0.36 -0.04 0.2 -0.07" fill="none" stroke="#f0a868" stroke-width="0.035" stroke-linecap="round"/>' +
  '<circle cx="0.16" cy="-0.15" r="0.065" fill="#f0a868"/>' +
  '<path d="M0.115 -0.19L0.12 -0.245L0.155 -0.205ZM0.165 -0.205L0.195 -0.245L0.205 -0.19Z" fill="#f0a868"/>' +
  '<path d="M0.26 -0.21Q0.3 -0.17 0.28 -0.12M0.33 -0.215Q0.37 -0.17 0.35 -0.12M0.4 -0.2Q0.43 -0.16 0.41 -0.12" fill="none" stroke="#d98a4e" stroke-width="0.012"/>' +
  '<path d="M0.13 -0.15Q0.145 -0.14 0.16 -0.15M0.175 -0.15Q0.19 -0.14 0.205 -0.15" fill="none" stroke="#7a4a2e" stroke-width="0.008"/>';

// ---------- calm geometric pieces (2026-11-02): landmarks built from isometric blocks
// with a lit top, a mid left face and a shaded right face, in soft pastel colours, like
// a quiet puzzle game. The skies are the themes' gradients (themes.js).

const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
// Colour c moved toward d by t (0..1).
const mix = (c, d, t) => `#${rgb(c).map((v, i) => Math.round(v + (rgb(d)[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
// A material's three faces: [top, left, right].
const tone = (c) => [mix(c, '#ffffff', 0.4), c, mix(c, '#4a3550', 0.18)];

// An isometric drawing: (x, y, z) lands at (cx + (x − y)·0.866k, cy + (x + y)·k/2 − z·k),
// so x runs down-right, y down-left and z up.
function iso(cx, cy, k) {
  const pt = (x, y, z) => [cx + (x - y) * 0.866 * k, cy + (x + y) * 0.5 * k - z * k];
  const q = (x, y, z) => pt(x, y, z).map(n).join(' ');
  const face = (pts, fill) => `<path d="M${pts.map((p) => q(...p)).join('L')}Z" fill="${fill}"/>`;
  return {
    k,
    pt,
    // a block from corner a to corner b, faces [top, left, right]
    box: ([x0, y0, z0], [x1, y1, z1], [t, l, r]) =>
      face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], t) +
      face([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], l) +
      face([[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]], r),
    // a pyramid over x0..x1 × y0..y1 from z0, ht tall, faces [left, right]
    pyramid([x0, y0, z0], [x1, y1], ht, [l, r]) {
      const a = [(x0 + x1) / 2, (y0 + y1) / 2, z0 + ht];
      return face([[x0, y1, z0], [x1, y1, z0], a], l) + face([[x1, y0, z0], [x1, y1, z0], a], r);
    },
    // a roof over x0..x1 × y0..y1 from z0, its ridge along x, ht tall, `inset` short of
    // each end (0 for a gable): faces [slope, end]
    roof([x0, y0, z0], [x1, y1], ht, inset, [s, e]) {
      const ym = (y0 + y1) / 2;
      return face([[x0 + inset, ym, z0 + ht], [x1 - inset, ym, z0 + ht], [x1, y1, z0], [x0, y1, z0]], s) +
        face([[x1, y0, z0], [x1 - inset, ym, z0 + ht], [x1, y1, z0]], e);
    },
    // drawing in the plane y = c (local x along x, local y up) or x = c (local x along y)
    onLeft: (c, body) => `<g transform="matrix(${u(0.866 * k)} ${u(0.5 * k)} 0 ${u(-k)} ${n(cx - 0.866 * c * k)} ${n(cy + 0.5 * c * k)})">${body}</g>`,
    onRight: (c, body) => `<g transform="matrix(${u(-0.866 * k)} ${u(0.5 * k)} 0 ${u(-k)} ${n(cx + 0.866 * c * k)} ${n(cy + 0.5 * c * k)})">${body}</g>`,
  };
}
// One fitted `width` across with its left edge at `left` and its lowest point on
// `bottom`: `span` is the least and most x − y in the drawing, `foot` the most x + y
// on the ground.
function isoFit(left, bottom, width, [lo, hi], foot) {
  const k = width / ((hi - lo) * 0.866);
  return iso(left - lo * 0.866 * k, bottom - foot * 0.5 * k, k);
}

// Round things shaded left to right: a cone, a dome, an onion dome and a drum (x, base
// the middle of the bottom).
const cone = (x, base, r, ht, [l, d]) =>
  `<path d="M${n(x - r)} ${n(base)}L${n(x)} ${n(base - ht)}V${n(base)}Z" fill="${l}"/><path d="M${n(x)} ${n(base)}V${n(base - ht)}L${n(x + r)} ${n(base)}Z" fill="${d}"/>`;
const dome = (x, base, r, [l, d]) =>
  `<path d="M${n(x - r)} ${n(base)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(base - r)}V${n(base)}Z" fill="${l}"/><path d="M${n(x)} ${n(base - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(base)}H${n(x)}Z" fill="${d}"/>`;
const onion = (x, base, r, [l, d]) =>
  [[-1, l], [1, d]].map(([s, fill]) => `<path d="M${n(x)} ${n(base)}H${n(x + s * r * 0.8)}C${n(x + s * r * 1.2)} ${n(base - r * 0.55)} ${n(x + s * r * 0.8)} ${n(base - r * 1.05)} ${n(x)} ${n(base - r * 1.75)}Z" fill="${fill}"/>`).join('');
const drum = (x, base, r, ht, [t, l, d]) =>
  `<ellipse cx="${n(x)}" cy="${n(base)}" rx="${n(r)}" ry="${n(r * 0.42)}" fill="${d}"/>` +
  `<rect x="${n(x - r)}" y="${n(base - ht)}" width="${n(r)}" height="${n(ht)}" fill="${l}"/><rect x="${n(x)}" y="${n(base - ht)}" width="${n(r)}" height="${n(ht)}" fill="${d}"/>` +
  `<ellipse cx="${n(x)}" cy="${n(base - ht)}" rx="${n(r)}" ry="${n(r * 0.42)}" fill="${t}"/>`;

// A flat cloud of two rounded bars, s across, sitting on (x, y).
const pill = (x, y, s, o = 0.75) =>
  `<g fill="#ffffff" opacity="${o}"><rect x="${n(x)}" y="${n(y - s * 0.2)}" width="${n(s)}" height="${n(s * 0.2)}" rx="${n(s * 0.1)}"/>` +
  `<rect x="${n(x + s * 0.22)}" y="${n(y - s * 0.3)}" width="${n(s * 0.45)}" height="${n(s * 0.2)}" rx="${n(s * 0.1)}"/></g>`;

// The sky's furniture under the HUD: a pale sun on one side, a cloud on the other and a
// small one between, and three birds.
function calmSky({ w, sky }, sun = '#fff7ef', right = true, bird = '#b4a3b1') {
  const sx = right ? w - sky.x : sky.x;
  const big = sky.r * 4.2;
  return disc(sx, sky.y, sky.r, sun) +
    pill(right ? sky.x * 0.4 : w - sky.x * 0.4 - big, sky.y + sky.r * 0.6, big) +
    pill(w * 0.5 - sky.r * 1.3, sky.y + sky.r * 3.2, sky.r * 2.6, 0.6) +
    birds(right ? sky.x * 1.4 : w - sky.x * 1.4, sky.y + sky.r * 4.6, sky.r * 1.5, bird);
}

// Two rows of low round hills on `base`, the far row paler; `top` is the tallest.
const rolling = (w, base, top, [far, near]) =>
  hills(base, [[0.12 * w, 0.32 * w, top * 0.55], [0.5 * w, 0.36 * w, top * 0.38], [0.92 * w, 0.3 * w, top * 0.6]], far) +
  hills(base, [[0.32 * w, 0.4 * w, top * 0.3], [0.78 * w, 0.34 * w, top * 0.26]], near);

// Where a picture's ground starts, and how tall its hills may be.
const groundLine = ({ h, band, ground: g }, k = 0.8) => ({ base: h - g * 0.4, top: band ? band * k : h * k * 0.2 });

// ---------- each country's own sky and ground (2026-11-02, so no two look alike)

// Red lanterns on cords from the top edge, gold caps and a tassel.
const LANTERN_RED = '<ellipse rx="0.5" ry="0.42" fill="#e8786c"/><path d="M-0.5 0H0.5" stroke="#f4a99d" stroke-width="0.06"/><rect x="-0.26" y="-0.5" width="0.52" height="0.1" fill="#e9c46a"/><rect x="-0.26" y="0.4" width="0.52" height="0.1" fill="#e9c46a"/><path d="M0 0.5V0.85" stroke="#e9c46a" stroke-width="0.06"/>';
const redLanterns = (w, sky) => [[0.12, 1.4, 1], [0.27, 0.9, 0.8], [0.73, 1.2, 0.9], [0.88, 0.7, 0.75]].map(([x, y, s]) => hang(w * x, sky.y * y + sky.r, sky.r * 0.9 * s, LANTERN_RED)).join('');
// A Korean shield kite with its round hole and a long tail.
const kite = (x, y, s) => `<path d="M${n(x + s * 0.4)} ${n(y + s * 0.6)}Q${n(x + s * 1.2)} ${n(y + s * 1.6)} ${n(x + s * 0.5)} ${n(y + s * 2.6)}" fill="none" stroke="#b9a7b4" stroke-width="1"/>` +
  `<rect x="${n(x - s * 0.4)}" y="${n(y - s * 0.6)}" width="${n(s * 0.8)}" height="${n(s * 1.2)}" fill="#fbf6ef"/><rect x="${n(x - s * 0.4)}" y="${n(y - s * 0.6)}" width="${n(s * 0.8)}" height="${n(s * 0.22)}" fill="#e98a86"/><rect x="${n(x - s * 0.4)}" y="${n(y + s * 0.44)}" width="${n(s * 0.8)}" height="${n(s * 0.16)}" fill="#8fa8d8"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(s * 0.2)}" fill="#f2d4cf"/>`;
// A small sailing boat on the water at (x, y).
const sailboat = (x, y, s) => `<path d="M${n(x - s * 0.5)} ${n(y)}H${n(x + s * 0.5)}L${n(x + s * 0.35)} ${n(y + s * 0.18)}H${n(x - s * 0.35)}Z" fill="#7a8fb0"/><path d="M${n(x)} ${n(y - s * 0.05)}V${n(y - s)}L${n(x + s * 0.42)} ${n(y - s * 0.12)}Z" fill="#ffffff"/><path d="M${n(x - s * 0.04)} ${n(y - s * 0.1)}V${n(y - s * 0.8)}L${n(x - s * 0.36)} ${n(y - s * 0.12)}Z" fill="#f4ede4"/>`;
// Long soft rays round a sun.
const rays = (x, y, r, fill) => Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<path d="M${n(x + Math.cos(a - 0.08) * r * 1.3)} ${n(y + Math.sin(a - 0.08) * r * 1.3)}L${n(x + Math.cos(a) * r * 2.2)} ${n(y + Math.sin(a) * r * 2.2)}L${n(x + Math.cos(a + 0.08) * r * 1.3)} ${n(y + Math.sin(a + 0.08) * r * 1.3)}Z" fill="${fill}" opacity="0.5"/>`; }).join('');
// A kangaroo about s tall standing on (x, y), facing right.
const kangaroo = (x, y, s, fill) => `<path transform="translate(${n(x)} ${n(y)}) scale(${u(s)})" d="M-0.55 0Q-0.2 -0.05 -0.05 -0.1Q0.05 -0.45 0.12 -0.62Q0.16 -0.78 0.2 -0.88L0.17 -1L0.24 -0.95L0.28 -1L0.3 -0.9Q0.4 -0.88 0.4 -0.82Q0.3 -0.8 0.26 -0.74Q0.34 -0.6 0.3 -0.45L0.4 -0.38L0.28 -0.36Q0.25 -0.2 0.2 -0.06L0.32 0H-0.05Q-0.3 -0.04 -0.55 0Z" fill="${fill}"/>`;
// Rows of colour from y = top to the bottom edge (fields), each row deeper than the last.
const fieldRows = (w, h, top, rows, between) => {
  let y = top;
  let out = '';
  const weight = (i) => 1 + i * 0.4;
  const total = rows.reduce((t, _, i) => t + weight(i), 0);
  rows.forEach((fill, i) => {
    const hh = ((h - top) * weight(i)) / total;
    out += `<rect y="${n(y)}" width="${w}" height="${n(hh)}" fill="${between}"/><rect y="${n(y + hh * 0.22)}" width="${w}" height="${n(hh * 0.78)}" fill="${fill}"/>`;
    y += hh;
  });
  return out;
};
// A gondola on the canal at (x, y), with its oarsman.
const gondola = (x, y, s) => `<path d="M${n(x - s * 0.6)} ${n(y - s * 0.12)}Q${n(x)} ${n(y + s * 0.16)} ${n(x + s * 0.62)} ${n(y - s * 0.2)}L${n(x + s * 0.5)} ${n(y - s * 0.04)}Q${n(x)} ${n(y + s * 0.08)} ${n(x - s * 0.5)} ${n(y - s * 0.02)}Z" fill="#4a3f5c"/>` +
  `<rect x="${n(x + s * 0.22)}" y="${n(y - s * 0.42)}" width="${n(s * 0.07)}" height="${n(s * 0.3)}" fill="#e98a86"/><circle cx="${n(x + s * 0.255)}" cy="${n(y - s * 0.47)}" r="${n(s * 0.05)}" fill="#4a3f5c"/><path d="M${n(x + s * 0.3)} ${n(y - s * 0.35)}L${n(x + s * 0.05)} ${n(y + s * 0.1)}" stroke="#a68e86" stroke-width="1.2"/>`;
// Snow falling over the whole picture, or rain in fine slanting lines.
const snowfall = (w, h, seed) => { const rand = random(seed); let d = ''; for (let i = 0; i < (w * h) / 5000; i++) d += `<circle cx="${n(rand() * w)}" cy="${n(rand() * h)}" r="${n(1 + rand() * 1.8)}"/>`; return `<g fill="#ffffff" opacity="0.85">${d}</g>`; };
const rain = (w, h, seed) => { const rand = random(seed); let d = ''; for (let i = 0; i < (w * h) / 9000; i++) { const x = rand() * w, y = rand() * h * 0.8; d += `M${n(x)} ${n(y)}l-4 12`; } return `<path d="${d}" stroke="#8f9ab3" stroke-opacity="0.35" stroke-width="1.2" stroke-linecap="round"/>`; };
// Marigold garlands swagged across the top, under the HUD.
const garlands = (w, sky) => [[0, 0.48, sky.y * 1.3], [0.52, 1, sky.y * 1.05]].map(([a, b, y]) => {
  let out = '';
  for (let t = 0; t <= 1; t += 0.06) { const x = w * (a + (b - a) * t); const yy = y + Math.sin(t * Math.PI) * sky.r * 1.6; out += `<circle cx="${n(x)}" cy="${n(yy)}" r="${n(sky.r * 0.28)}" fill="${t * 20 % 2 < 1 ? '#f6b04a' : '#f28c5b'}"/>`; }
  return out;
}).join('');
// A round tree: an olive (silver-green) or a lime on the lawn.
const roundTree = (x, base, s, [l, d], trunk = '#a68e86') => `<rect x="${n(x - s * 0.06)}" y="${n(base - s * 0.55)}" width="${n(s * 0.12)}" height="${n(s * 0.55)}" fill="${trunk}"/>` + dome(x, base - s * 0.45, s * 0.42, [l, d]);
// ---------- 중국: misty karst peaks, a pagoda, and a moon gate in a white wall

function china(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.95);
  const pg = isoFit(4, base, big * 0.62, [-5, 5], 10);
  const body = tone('#e98f80');
  const tiles = tone('#5f8f7a');
  let pagoda = pg.box([0, 0, 0], [5, 5, 0.6], tone('#e7ddd6'));
  let z = 0.6;
  for (let i = 0; i < 4; i++) {
    const s = i * 0.36;
    pagoda += pg.box([0.9 + s, 0.9 + s, z], [4.1 - s, 4.1 - s, z + 1.45], body) + pg.box([0.1 + s, 0.1 + s, z + 1.45], [4.9 - s, 4.9 - s, z + 1.8], tiles);
    z += 1.8;
  }
  pagoda += pg.pyramid([1.9, 1.9, z], [3.1, 3.1], 1.6, [tiles[1], tiles[2]]);
  const gt = isoFit(w - 4 - big * 0.78, base, big * 0.78, [-5.4, 9.4], 14.8);
  const gate = gt.box([0, 0, 0], [9, 5, 2.6], tone('#e08c7f')) + gt.onLeft(5, '<path d="M3.6 0V1.3A0.9 0.9 0 0 1 5.4 1.3V0Z" fill="#7a4f5a"/>') +
    gt.box([1, 1, 2.6], [8, 4, 4.2], body) + gt.roof([0.4, 0.4, 4.2], [8.6, 4.6], 1.9, 2.1, [tiles[1], tiles[2]]);
  return disc(w / 2, sky.y + sky.r, sky.r * 1.2, '#f7b4a5') + redLanterns(w, sky) +
    hills(base, [[0.08, 0.08, 0.95], [0.22, 0.1, 0.65], [0.6, 0.08, 0.8], [0.78, 0.11, 1.05], [0.95, 0.07, 0.6]].map(([x, hw, k]) => [x * w, hw * w, top * k]), '#cfe5d6') +
    hills(base, [[0.34 * w, 0.3 * w, top * 0.32], [0.86 * w, 0.24 * w, top * 0.26]], '#a9d3bb') +
    pagoda + gate + water(w, h, base, ['#b4dccb', '#8cc5ae'], 21);
}

// ---------- 한국: a palace pavilion on its terraces and a stone pagoda, celadon hills

function korea(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.85);
  const stone = tone('#ddd2cd');
  const p = isoFit(4, base, big, [-7, 11], 18);
  const pavilion = p.box([0, 0, 0], [11, 7, 1.3], stone) + p.box([1, 1, 1.3], [10, 6, 2.4], stone) +
    [[1.6, 1.6], [1.6, 5], [9, 1.6], [9, 5]].map(([x, y]) => p.box([x, y, 2.4], [x + 0.55, y + 0.55, 5.4], tone('#c9706c'))).join('') +
    p.box([1.2, 1.2, 5.3], [10, 6, 5.8], tone('#7fb3a3')) + p.roof([0.2, 0.2, 5.8], [11, 6.8], 2.6, 2.6, ['#5d5872', '#4a465e']);
  const g = isoFit(w - 4 - big * 0.62, base, big * 0.62, [-6, 6], 12);
  const granite = tone('#dad1cd');
  const pagoda = [[0, 6, 0, 1.4], [1.1, 4.9, 1.4, 3.6], [0.3, 5.7, 3.6, 4.2], [1.5, 4.5, 4.2, 5.8], [0.8, 5.2, 5.8, 6.3], [1.9, 4.1, 6.3, 7.6], [1.3, 4.7, 7.6, 8.05], [2.7, 3.3, 8.05, 9.6]]
    .map(([a, b, z0, z1]) => g.box([a, a, z0], [b, b, z1], granite)).join('');
  return disc(w - sky.x, sky.y, sky.r * 1.1, '#fffaf2') + kite(sky.x * 1.2, sky.y + sky.r * 1.5, sky.r * 1.4) + birds(w * 0.55, sky.y + sky.r * 4, sky.r * 1.3, '#9a8fa6') +
    hills(base, [[0.1 * w, 0.3 * w, top * 0.75], [0.45 * w, 0.32 * w, top * 0.55], [0.85 * w, 0.32 * w, top * 0.8]], '#d3e8df') +
    hills(base, [[0.3 * w, 0.4 * w, top * 0.4], [0.75 * w, 0.34 * w, top * 0.32]], '#aed6c6') + pavilion + pagoda + floor(w, h, base, '#94c6b2');
}

// ---------- 그리스: a temple of columns, white houses with a blue dome, a calm sea

function greece(L) {
  const { w, h, big, sky } = L;
  const { base } = groundLine(L);
  const marble = tone('#eee7de');
  const t = isoFit(4, base, big * 1.05, [-7, 12], 19);
  const cols = [...[1, 3, 5, 7, 9, 10.8].map((x) => [x, 5.8]), [10.8, 1], [10.8, 2.9], [10.8, 4.1]].sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  const temple = t.box([0, 0, 0], [12, 7, 0.9], marble) + t.box([0.5, 0.5, 0.9], [11.5, 6.5, 1.6], marble) +
    cols.map(([x, y]) => t.box([x, y, 1.6], [x + 0.7, y + 0.7, 6.4], tone('#f6f1ea'))).join('') +
    t.box([0.5, 0.5, 6.4], [11.5, 6.5, 7.2], marble) + t.roof([0.5, 0.5, 7.2], [11.5, 6.5], 1.9, 0, ['#e6c1ab', marble[2]]);
  const s = isoFit(w - 4 - big * 0.6, base, big * 0.6, [-3.5, 6], 9.5);
  const white = tone('#f6f3ef');
  const [dx, dy] = s.pt(1.5, 1.8, 4.4);
  const houses = s.box([0, 0, 0], [3, 3.5, 3.2], white) + s.box([3, 0.6, 0], [6, 3.5, 2.2], white) +
    s.onLeft(3.5, '<rect x="0.7" y="0" width="0.8" height="1.5" rx="0.4" fill="#5f8fd0"/><rect x="3.8" y="0.9" width="0.6" height="0.6" fill="#5f8fd0"/>') +
    s.box([0.5, 0.8, 3.2], [2.5, 2.8, 4.4], white) + dome(dx, dy + s.k * 0.4, s.k * 1.15, ['#6f9ee0', '#4f7fc4']);
  const sea = base + (h - base) * 0.05;
  return disc(sky.x, sky.y, sky.r, '#ffffff') + birds(w * 0.62, sky.y + sky.r * 1.5, sky.r * 1.6, '#ffffff') + birds(w * 0.3, sky.y + sky.r * 4, sky.r * 1.2, '#ffffff') +
    temple + houses + water(w, h, sea, ['#8fc3e8', '#5f9fd6'], 3) + sailboat(w * 0.5, sea + (h - sea) * 0.45, big * 0.22);
}

// ---------- 이집트: the pyramids and an obelisk on soft dunes

function egypt(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.55);
  const py = isoFit(4, base, big * 1.5, [-12, 23], 24);
  const pyramids = py.pyramid([9, -7, 0], [16, 0], 6, ['#f6d39a', '#dca46a']) + py.pyramid([0, 0, 0], [12, 12], 10, ['#f8d79f', '#dfa767']);
  const ob = isoFit(w - 4 - big * 0.37, base, big * 0.37, [-4, 4], 8);
  const sand = tone('#e8bf86');
  const obelisk = ob.box([0, 0, 0], [4, 4, 1.1], sand) + ob.box([1.2, 1.2, 1.1], [2.8, 2.8, 14], sand) + ob.pyramid([1.2, 1.2, 14], [2.8, 2.8], 1.7, ['#f7d66e', '#d9a93c']);
  const sx = w - sky.x;
  return rays(sx, sky.y + sky.r, sky.r * 1.4, '#ffd27a') + disc(sx, sky.y + sky.r, sky.r * 1.4, '#ffd98a') +
    hills(base, [[0.18 * w, 0.4 * w, top * 0.7], [0.62 * w, 0.42 * w, top * 0.5], [1.02 * w, 0.3 * w, top * 0.8]], '#f8e0b8') +
    pyramids + obelisk + put(w * 0.55, base + 2, big * 0.42, PALM) + floor(w, h, base, '#f0cd94');
}

// ---------- 미국: red buttes and a mesa in the desert, a saguaro

function usa(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const rock = tone('#d9805f');
  const b = isoFit(4, base, big * 0.95, [-6, 10], 16);
  const buttes = b.box([0, 0, 0], [10, 6, 1.6], rock) + b.box([1.5, 1.2, 1.6], [6.5, 4.8, 9], rock) + b.box([7.4, 1.8, 1.6], [8.6, 3, 6.4], rock);
  const m = isoFit(w - 4 - big * 0.62, base, big * 0.62, [-4, 7], 11);
  const mesa = m.box([0, 0, 0], [7, 4, 3.2], tone('#e0906f'));
  const cx = w - big * 0.78;
  const s = big * 0.34;
  const cactus = `<g fill="none" stroke="#6f9f80" stroke-width="${n(s * 0.13)}" stroke-linecap="round" stroke-linejoin="round"><path d="M${n(cx)} ${n(base)}V${n(base - s)}"/><path d="M${n(cx)} ${n(base - s * 0.45)}H${n(cx - s * 0.2)}V${n(base - s * 0.75)}"/><path d="M${n(cx)} ${n(base - s * 0.55)}H${n(cx + s * 0.2)}V${n(base - s * 0.85)}"/></g>`;
  return disc(w / 2, base - top * 0.35, sky.r * 2.1, '#ffb98f') + birds(sky.x * 1.4, sky.y + sky.r * 2, sky.r * 1.6, '#a77a78') +
    hills(base, [[0.2 * w, 0.4 * w, top * 0.3], [0.8 * w, 0.4 * w, top * 0.25]], '#efb79a') + buttes + mesa + cactus + floor(w, h, base, '#e6a585');
}

// ---------- 호주: the opera house's sails on the harbour, Uluru far off

function australia(L) {
  const { w, h, big, sky } = L;
  const { base } = groundLine(L);
  const harbour = base + (h - base) * 0.35;
  const p = isoFit(4, harbour, big * 1.05, [-5, 12], 17);
  let house = p.box([0, 0, 0], [12, 5, 1.4], tone('#e8d8c8'));
  for (const [x, s] of [[2, 3.8], [5.2, 3.2], [8.2, 2.6]]) {
    const [sx, sy] = p.pt(x, 2.5, 1.4);
    const S = s * p.k;
    house += `<path d="M${n(sx)} ${n(sy)}Q${n(sx + S * 0.1)} ${n(sy - S * 1.05)} ${n(sx + S * 0.8)} ${n(sy - S * 0.95)}Q${n(sx + S * 0.55)} ${n(sy - S * 0.45)} ${n(sx + S * 0.7)} ${n(sy)}Z" fill="#fbf7f0"/>` +
      `<path d="M${n(sx + S * 0.8)} ${n(sy - S * 0.95)}Q${n(sx + S * 0.55)} ${n(sy - S * 0.45)} ${n(sx + S * 0.7)} ${n(sy)}H${n(sx + S * 0.9)}Q${n(sx + S * 0.86)} ${n(sy - S * 0.5)} ${n(sx + S * 0.8)} ${n(sy - S * 0.95)}Z" fill="#e2d6c6"/>`;
  }
  const ux = w - big * 1.0;
  const uw = big * 0.95;
  const ut = base - big * 0.26;
  const uluru = `<path d="M${n(ux)} ${n(base)}C${n(ux + uw * 0.02)} ${n(ut)} ${n(ux + uw * 0.2)} ${n(ut)} ${n(ux + uw * 0.5)} ${n(ut)}S${n(ux + uw)} ${n(ut + big * 0.02)} ${n(ux + uw)} ${n(base)}Z" fill="#d07a58"/>` +
    `<path d="M${n(ux + uw * 0.08)} ${n(ut + big * 0.05)}C${n(ux + uw * 0.2)} ${n(ut)} ${n(ux + uw * 0.6)} ${n(ut)} ${n(ux + uw * 0.85)} ${n(ut + big * 0.04)}" fill="none" stroke="#e8a283" stroke-width="${n(big * 0.03)}" stroke-linecap="round"/>`;
  return disc(w - sky.x, sky.y, sky.r, '#fffbe8') + birds(sky.x * 1.4, sky.y + sky.r * 2.5, sky.r * 1.5, '#7f8fa6') +
    uluru + floor(w, h, base, '#e3a07c') + kangaroo(w - big * 0.25, base + (harbour - base) * 0.6, big * 0.3, '#a8604a') + water(w, h, harbour, ['#9fd0e6', '#78b8d8'], 4) + house;
}

// ---------- 프랑스: a glass pyramid and the iron tower, lavender morning

function france(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const g = isoFit(4, base, big * 0.85, [-8, 8], 16);
  let glass = g.box([-0.6, -0.6, 0], [8.6, 8.6, 0.25], tone('#e6e1ea')) + g.pyramid([0, 0, 0.25], [8, 8], 5.6, ['#dbe7f3', '#bccfe3']);
  const [ax, ay] = g.pt(4, 4, 5.85);
  glass += '<path d="' + [0.25, 0.5, 0.75].map((t) => { const [lx, ly] = g.pt(t * 8, 8, 0.25); const [rx, ry] = g.pt(8, 8 - t * 8, 0.25); return `M${n(ax)} ${n(ay)}L${n(lx)} ${n(ly)}M${n(ax)} ${n(ay)}L${n(rx)} ${n(ry)}`; }).join('') + '" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1"/>';
  const s = big * 1.15;
  const x = w - big * 0.32;
  const edge = [[-0.5, 0], [-0.3, -0.27], [-0.17, -0.45], [-0.1, -0.62], [-0.06, -0.8], [-0.015, -1]];
  const side = (sgn) => `M${n(x)} ${n(base)}` + edge.map(([dx, dy]) => `L${n(x + sgn * dx * s * 0.38)} ${n(base + dy * s)}`).join('') + `L${n(x)} ${n(base - s)}Z`;
  const tower = `<path d="${side(1)}" fill="#a596ba"/><path d="${side(-1)}" fill="#86779c"/>` +
    `<path d="M${n(x - s * 0.085)} ${n(base)}A${n(s * 0.085)} ${n(s * 0.11)} 0 0 1 ${n(x + s * 0.085)} ${n(base)}Z" fill="#c9b5e2"/>` +
    [0.27, 0.62].map((t, i) => `<rect x="${n(x - s * (i ? 0.05 : 0.13))}" y="${n(base - s * t - 2)}" width="${n(s * (i ? 0.1 : 0.26))}" height="${n(Math.max(2.5, s * 0.02))}" fill="#efe8f4"/>`).join('');
  return disc(sky.x, sky.y, sky.r, '#fff6fb') + pill(w - sky.x - sky.r * 3, sky.y + sky.r * 0.6, sky.r * 3.6) + birds(w * 0.4, sky.y + sky.r * 3.5, sky.r * 1.3, '#8f86a8') +
    hills(base, [[0.3 * w, 0.45 * w, top * 0.3], [0.85 * w, 0.4 * w, top * 0.26]], '#e2d8ee') + glass + tower +
    fieldRows(w, h, base, ['#b9a3dc', '#a88fd3', '#9a7fcc', '#8c70c4'], '#9cc29a');
}

// ---------- 이탈리아: houses along a canal and a bell tower

function italy(L) {
  const { w, h, big, sky } = L;
  const { base } = groundLine(L);
  const c = isoFit(4, base, big * 1.0, [-4, 10], 14);
  const win = (x0, n0, z0) => Array.from({ length: n0 }, (_, i) => `<rect x="${x0 + i * 0.9}" y="${z0}" width="0.45" height="0.8" rx="0.22" fill="#8f7a86"/>`).join('');
  const houses = c.box([0, 0, 0], [3, 4, 5.4], tone('#f0b77e')) + c.onLeft(4, win(0.5, 3, 3.6) + win(0.5, 3, 1.8)) +
    c.box([3, 0, 0], [6, 4, 4.4], tone('#ec9c8a')) + c.onLeft(4, win(3.5, 3, 2.6)) +
    c.box([6, 0, 0], [10, 4, 6.2], tone('#f3cf8f')) + c.onLeft(4, win(6.6, 4, 4.4) + win(6.6, 4, 2.4));
  const t = isoFit(w - 4 - big * 0.3, base, big * 0.3, [-2.6, 2.6], 5.2);
  const tower = t.box([0, 0, 0], [2.4, 2.4, 11], tone('#e2917c')) + t.box([-0.1, -0.1, 11], [2.5, 2.5, 12.6], tone('#f3e6d6')) +
    t.onLeft(2.5, '<rect x="0.4" y="0.3" width="0.6" height="1" rx="0.3" fill="#8f7a86"/><rect x="1.4" y="0.3" width="0.6" height="1" rx="0.3" fill="#8f7a86"/>') +
    t.pyramid([-0.1, -0.1, 12.6], [2.5, 2.5], 2.8, ['#86b4a6', '#6c9a8d']);
  return disc(w - sky.x, sky.y, sky.r, '#fff3d6') + birds(sky.x * 1.3, sky.y + sky.r * 2, sky.r * 1.5, '#ffffff') +
    houses + tower + water(w, h, base, ['#9fd6d6', '#74bfc4'], 10) + gondola(w * 0.52, base + (h - base) * 0.5, big * 0.42);
}

// ---------- 러시아: onion domes on brick towers, snowy pines

function russia(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.6);
  const brick = tone('#d9817a');
  let church = '';
  for (const [x, ht, r, d] of [[0.16, 0.5, 0.075, ['#7fcab4', '#5eae98']], [0.58, 0.46, 0.07, ['#f4c76a', '#dba948']], [0.38, 0.78, 0.095, ['#e98aa8', '#cc6e8c']]]) {
    const cx = big * x;
    const R = big * r;
    church += drum(cx, base, R, big * ht, brick) + onion(cx, base - big * ht + R * 0.2, R * 1.25, d) + `<path d="M${n(cx)} ${n(base - big * ht - R * 2)}v${n(-R * 0.6)}" stroke="#d9b36a" stroke-width="1.5"/>`;
  }
  let pines = '';
  for (const [x, s] of [[0.9, 0.5], [0.76, 0.38], [0.98, 0.32], [0.66, 0.26]]) {
    const px = w - big + big * x - big * 0.1;
    pines += cone(px, base, big * s * 0.32, big * s, ['#6f9a9a', '#557f80']) + cone(px, base - big * s * 0.55, big * s * 0.14, big * s * 0.45, ['#ffffff', '#e6edf2']);
  }
  return disc(w - sky.x, sky.y, sky.r, '#f4f6ff') + rolling(w, base, top, ['#e3e8f6', '#d7def0']) + church + pines + floor(w, h, base, '#f3f6fb') + snowfall(w, h, 29);
}

// ---------- 스페인: an aqueduct of arches and white houses with terracotta roofs

function spain(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const a = isoFit(4, base, big * 1.1, [-1.8, 12.4], 13.8);
  const arches = Array.from({ length: 5 }, (_, i) => { const x = 0.55 + i * 2.3; return `<path d="M${x} 0V2.4A0.75 0.75 0 0 0 ${x + 1.5} 2.4V0Z" fill="#fde2c8"/>`; }).join('');
  const aqueduct = a.box([0, 0, 0], [12, 1.4, 4.4], tone('#e3b088')) + a.onLeft(1.4, arches) + a.box([-0.2, -0.2, 4.4], [12.2, 1.6, 4.8], tone('#ecc59f'));
  const s = isoFit(w - 4 - big * 0.62, base, big * 0.62, [-3, 6.2], 9.2);
  const white = tone('#f7f3ec');
  const roofs = ['#e88b62', '#c96f4c'];
  const houses = s.box([0, 0, 0], [4, 3, 2.6], white) + s.roof([-0.2, -0.2, 2.6], [4.2, 3.2], 1.2, 0.9, roofs) + s.onLeft(3, '<rect x="1.6" y="0" width="0.8" height="1.4" rx="0.4" fill="#5f8fd0"/>') +
    s.box([4, 0.6, 0], [6, 3, 2], white) + s.roof([3.9, 0.4, 2], [6.2, 3.2], 0.9, 0.6, roofs);
  let olives = '';
  for (const x of [0.42, 0.56, 0.7]) olives += roundTree(w * x, base + (h - base) * 0.45, big * 0.2, ['#b3c29a', '#98a982']);
  return disc(w - sky.x, sky.y + sky.r * 0.6, sky.r * 1.5, '#ffcf9a') + birds(sky.x * 1.4, sky.y + sky.r * 2.6, sky.r * 1.5, '#b37a6a') +
    hills(base, [[0.25 * w, 0.4 * w, top * 0.35], [0.8 * w, 0.36 * w, top * 0.3]], '#f1c7a2') + aqueduct + houses + floor(w, h, base, '#e9b58b') + olives;
}

// ---------- 멕시코: a stepped pyramid with a temple, agaves, papel picado overhead

function mexico(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const p = isoFit(4, base, big * 1.0, [-10, 10], 20);
  const stone = tone('#e8c39a');
  let pyramid = '';
  for (let i = 0; i < 5; i++) pyramid += p.box([i, i, i * 1.3], [10 - i, 10 - i, (i + 1) * 1.3], stone) + p.onLeft(10 - i, `<rect x="4.2" y="${i * 1.3}" width="1.6" height="1.3" fill="${stone[2]}"/>`);
  pyramid += p.box([3.8, 3.8, 6.5], [6.2, 6.2, 8.3], tone('#e3a090')) + p.onLeft(6.2, '<rect x="4.6" y="6.5" width="0.8" height="1.1" fill="#8f6f78"/>');
  let agaves = '';
  for (const [x, s] of [[0.86, 0.3], [0.7, 0.22]]) {
    const cx = w - big + big * x;
    const R = big * s;
    agaves += [-60, -30, 0, 30, 60].map((deg) => `<path d="M${n(cx)} ${n(base)}l${n(Math.sin((deg * Math.PI) / 180) * R * 0.9)} ${n(-Math.cos((deg * Math.PI) / 180) * R)}l${n(R * 0.08)} ${n(R * 0.1)}Z" fill="${deg < 0 ? '#a8c8ad' : '#8eb397'}"/>`).join('');
  }
  return flags(sky, ['#f4a7b9', '#a8d8c8', '#f6d48b', '#b9a7e0', '#f6b48f'], true) + disc(w - sky.x, sky.y, sky.r, '#fff6e8') + pill(w * 0.5 - sky.r, sky.y + sky.r * 3.2, sky.r * 2.6, 0.6) +
    rolling(w, base, top, ['#f6e3cb', '#f1d6b7']) + pyramid + agaves + floor(w, h, base, '#f1d5b2');
}

// ---------- 브라질: Sugarloaf by the sea with its cable car, a hillside of coloured houses

function brazil(L) {
  const { w, h, big } = L;
  const { base } = groundLine(L);
  const peaks = hills(base, [[big * 0.32, big * 0.3, big * 0.95], [big * 0.85, big * 0.26, big * 0.58]], '#a9cbb0') +
    hills(base, [[big * 0.26, big * 0.2, big * 0.88]], '#bcd8c1') +
    `<path d="M${n(big * 0.32)} ${n(base - big * 0.95)}L${n(big * 0.85)} ${n(base - big * 0.58)}" stroke="#8f8597" stroke-width="1"/>` +
    `<rect x="${n(big * 0.56)}" y="${n(base - big * 0.8)}" width="${n(big * 0.05)}" height="${n(big * 0.035)}" rx="1" fill="#e9a6a0"/>`;
  const f = isoFit(w - 4 - big * 0.7, base, big * 0.7, [-3, 7], 10);
  const houses = [[[0, 0, 0], [3, 3, 2], '#a9d8c8'], [[3, 0.5, 0], [7, 3, 2.4], '#f3b9a0'], [[0.4, 0.6, 2], [3, 3, 3.8], '#c9b6e2'], [[3.4, 1, 2.4], [6.2, 3, 4.1], '#f4d98e'], [[1, 1.2, 3.8], [3, 3, 5.2], '#f2aebc']]
    .map(([a, b, c]) => f.box(a, b, tone(c)) + f.onLeft(b[1], `<rect x="${a[0] + 0.6}" y="${a[2] + 0.5}" width="0.6" height="0.7" fill="#8f8597" opacity="0.7"/>`)).join('');
  return calmSky(L, '#fff8ea') + peaks + houses + water(w, h, base, ['#c1e4e3', '#9fd1d3'], 14);
}

// ---------- 영국: the clock tower, a red phone box and a round tree on the lawn

function uk(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const t = isoFit(4 + big * 0.06, base, big * 0.34, [-2.4, 2.4], 4.8);
  const clock = '<circle cx="1.2" cy="10" r="0.72" fill="#fbf6ec" stroke="#c9a96e" stroke-width="0.1"/><path d="M1.2 10v0.45M1.2 10h0.35" stroke="#4a3f5c" stroke-width="0.08"/>';
  const tower = t.box([0, 0, 0], [2.4, 2.4, 9], tone('#d9bf98')) + t.box([-0.15, -0.15, 9], [2.55, 2.55, 11], tone('#e8d5b5')) +
    t.onLeft(2.55, clock) + t.onRight(2.55, clock) + t.box([0.25, 0.25, 11], [2.15, 2.15, 12.2], tone('#d9bf98')) +
    t.pyramid([0.25, 0.25, 12.2], [2.15, 2.15], 3, ['#6f7a94', '#5b6680']);
  const b = isoFit(w - 4 - big * 0.2, base, big * 0.2, [-1.3, 1.3], 2.6);
  const box = b.box([0, 0, 0], [1.3, 1.3, 3.1], tone('#e2665e')) + b.onLeft(1.3, '<rect x="0.25" y="0.8" width="0.8" height="1.6" fill="#f6dcd6" opacity="0.8"/>') + b.box([-0.05, -0.05, 3.1], [1.35, 1.35, 3.35], tone('#e2665e'));
  const bus = isoFit(w * 0.4, base + (h - base) * 0.55, big * 0.5, [-1.6, 6], 7.6);
  const red = tone('#e2665e');
  const decker = bus.box([0, 0, 0.3], [6, 1.6, 2.2], red) + bus.box([0, 0, 2.3], [6, 1.6, 4], red) + bus.onLeft(1.6, '<rect x="0.5" y="1.2" width="4.8" height="0.6" fill="#f6e6e0"/><rect x="0.5" y="2.9" width="5" height="0.6" fill="#f6e6e0"/>');
  return pill(sky.x * 0.3, sky.y + sky.r * 0.4, sky.r * 4.6, 0.9) + pill(w - sky.x * 0.3 - sky.r * 4, sky.y + sky.r * 1.4, sky.r * 4, 0.85) + pill(w * 0.35, sky.y + sky.r * 3.6, sky.r * 3, 0.7) + rain(w, h, 33) +
    rolling(w, base, top, ['#dfe6dc', '#cfdcc9']) + tower + roundTree(w - big * 0.62, base, big * 0.42, ['#a9c79e', '#8db384']) + box + floor(w, h, base, '#c4d8bb') + decker;
}

// ---------- 독일: the city gate of columns and a piece of the old wall in soft colours

function germany(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.6);
  const g = isoFit(4, base, big * 1.05, [-3, 12], 15);
  const sand = tone('#e7d6bd');
  let gate = g.box([0, 0, 0], [12, 3, 0.6], sand);
  for (const y of [0.3, 2.1]) for (const x of [0.6, 2.6, 4.6, 6.6, 8.6, 10.6]) gate += g.box([x, y, 0.6], [x + 0.8, y + 0.6, 5], tone('#efe1cc'));
  gate += g.box([0, 0, 5], [12, 3, 6], sand) + g.box([2, 0.5, 6], [10, 2.5, 7], sand) + g.box([5.2, 1, 7], [6.8, 2, 8], tone('#7fa89f'));
  const s = isoFit(w - 4 - big * 0.66, base, big * 0.66, [-1, 8], 9);
  const stripes = ['#f2a8a0', '#f6cf6f', '#8fd0bd', '#c3a8e6'].map((c, i) => `<rect x="${0.6 + i * 1.9}" y="0.6" width="1.4" height="${1.2 + (i % 2) * 0.9}" rx="0.3" fill="${c}"/>`).join('');
  const wall = s.box([0, 0, 0], [8, 1, 3.6], tone('#cfd1d7')) + s.onLeft(1, stripes + [2, 4, 6].map((x) => `<path d="M${x} 0V3.6" stroke="#b6b8c1" stroke-width="0.06"/>`).join(''));
  let forest = '';
  for (const [x, k] of [[0.06, 0.9], [0.14, 1.1], [0.22, 0.8], [0.8, 1], [0.9, 1.2], [0.97, 0.85]]) forest += cone(w * x, base - top * 0.15, top * 0.14 * k, top * 0.5 * k, ['#6f9a86', '#5a8571']);
  return disc(w - sky.x, sky.y, sky.r, '#fffaf0') + pill(sky.x * 0.4, sky.y + sky.r * 0.6, sky.r * 4) + birds(w * 0.5, sky.y + sky.r * 3.6, sky.r * 1.3, '#8f9aa8') +
    hills(base, [[0.2 * w, 0.42 * w, top * 0.35], [0.8 * w, 0.4 * w, top * 0.3]], '#cfe2cf') + forest + gate + wall + floor(w, h, base, '#b9d4b6');
}

// ---------- 튀르키예: a domed mosque and minarets, balloons over the fairy chimneys

function turkiye(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const m = isoFit(4 + big * 0.08, base, big * 0.8, [-7, 7], 14);
  const wall = tone('#efe2d4');
  const [dx, dy] = m.pt(3.5, 3.5, 2.6);
  const minaret = (x, y) => { const [mx, my] = m.pt(x, y, 0); return drum(mx, my, m.k * 0.32, m.k * 7.6, wall) + cone(mx, my - m.k * 7.6, m.k * 0.36, m.k * 1.6, ['#8fa8c8', '#7590b3']); };
  const mosque = m.box([0.6, 0.6, 0], [6.4, 6.4, 2.6], wall) + drum(dx, dy, m.k * 1.9, m.k * 0.5, wall) + dome(dx, dy - m.k * 0.5, m.k * 1.9, ['#9db4d3', '#7f98bd']) + minaret(-0.2, 7.2) + minaret(7.2, -0.2);
  let rocks = '';
  for (const [x, s] of [[0.68, 0.42], [0.86, 0.55], [0.98, 0.36]]) {
    const cx = w - big + big * x - big * 0.06;
    rocks += cone(cx, base, big * s * 0.28, big * s, ['#ecceae', '#d6b392']) + dome(cx, base - big * s + big * 0.03, big * s * 0.11, ['#b0928a', '#987b75']);
  }
  const balloon = (x, y, r, [a, b]) => `<path d="M${n(x - r)} ${n(y)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Q${n(x + r * 0.7)} ${n(y + r * 0.9)} ${n(x + r * 0.2)} ${n(y + r * 1.25)}H${n(x - r * 0.2)}Q${n(x - r * 0.7)} ${n(y + r * 0.9)} ${n(x - r)} ${n(y)}Z" fill="${a}"/>` +
    `<path d="M${n(x)} ${n(y - r)}Q${n(x + r * 0.45)} ${n(y)} ${n(x + r * 0.12)} ${n(y + r * 1.25)}H${n(x - r * 0.12)}Q${n(x - r * 0.45)} ${n(y)} ${n(x)} ${n(y - r)}Z" fill="${b}"/>` +
    `<rect x="${n(x - r * 0.15)}" y="${n(y + r * 1.4)}" width="${n(r * 0.3)}" height="${n(r * 0.22)}" fill="#a68e86"/>`;
  return disc(sky.x, sky.y, sky.r, '#fff6ea') + balloon(w - sky.x, sky.y + sky.r * 0.4, sky.r * 0.9, ['#f2aeb0', '#f6d48b']) + balloon(w * 0.52, sky.y + sky.r * 3.2, sky.r * 0.6, ['#a8d8c8', '#c9b6e2']) +
    rolling(w, base, top, ['#f5e4d4', '#efd9c3']) + mosque + rocks + floor(w, h, base, '#eed8c0');
}

// ---------- 인도: the white mausoleum with its dome and four minarets, cypresses

function india(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const t = isoFit(4, base, big * 1.0, [-8, 8], 16);
  const marble = tone('#f3ece6');
  const minaret = (x, y) => { const [mx, my] = t.pt(x, y, 1); return drum(mx, my, t.k * 0.3, t.k * 5, marble) + dome(mx, my - t.k * 5, t.k * 0.38, ['#fcf8f3', '#e5dcd5']); };
  const [dx, dy] = t.pt(4, 4, 4.8);
  const tomb = t.box([0, 0, 0], [8, 8, 1], tone('#e8d2c6')) + minaret(0.4, 0.4) + minaret(7.6, 0.4) + minaret(0.4, 7.6) +
    t.box([1.6, 1.6, 1], [6.4, 6.4, 4.8], tone('#f7f1ec')) + t.onLeft(6.4, '<rect x="3.2" y="1" width="1.6" height="2.4" rx="0.8" fill="#e6d4cb"/>') +
    drum(dx, dy, t.k * 1.3, t.k * 0.6, marble) + onion(dx, dy - t.k * 0.6, t.k * 1.6, ['#fcf8f3', '#e5dcd5']) + minaret(7.6, 7.6);
  let trees = '';
  for (const [x, s] of [[0.74, 0.62], [0.9, 0.5]]) {
    const cx = w - big + big * x;
    trees += `<ellipse cx="${n(cx)}" cy="${n(base - big * s * 0.5)}" rx="${n(big * s * 0.12)}" ry="${n(big * s * 0.5)}" fill="#7fb68f"/><path d="M${n(cx)} ${n(base)}V${n(base - big * s)}A${n(big * s * 0.12)} ${n(big * s * 0.5)} 0 0 1 ${n(cx)} ${n(base)}Z" fill="#679f78"/>`;
  }
  const pool = base + (h - base) * 0.3;
  return garlands(w, sky) + disc(w / 2, sky.y + sky.r * 3.2, sky.r * 1.3, '#ffd2a6') +
    hills(base, [[0.2 * w, 0.42 * w, top * 0.4], [0.8 * w, 0.4 * w, top * 0.32]], '#f4cfc2') + tomb + trees + floor(w, h, base, '#f1d0b8') + water(w, h, pool, ['#b7dcd8', '#93c8c4'], 12);
}

// ---------- 캐나다: the northern lights over snowy peaks, spruce forests and a still lake

function canada({ w, h, band, big, ground }) {
  const lake = h - ground * 0.55;
  const top = band ? band * 0.9 : h * 0.24;
  const lights = band ? band * 0.75 : h * 0.32;
  const rand = random(3);
  // A row of spruces from x0 to x1 on the shore, `size` tall give or take.
  const forest = (x0, x1, size) => {
    let out = '';
    for (let x = x0; x < x1; x += size * (0.16 + rand() * 0.1)) out += put(x, lake + 2, size * (0.6 + rand() * 0.5), SPRUCE);
    return `<g fill="#3a5a66">${out}</g>`;
  };
  let glow = '';
  for (let i = 0; i < w / 40; i++) glow += `M${n(rand() * w)} ${n(lake + (0.1 + rand() * 0.8) * (h - lake))}h${n(8 + rand() * 20)}`;
  return (
    '<defs>' +
    '<linearGradient id="sc-aurora-1" x2="0" y2="1"><stop offset="0" stop-color="#8fe6c6" stop-opacity="0"/><stop offset="0.75" stop-color="#8fe6c6" stop-opacity="0.5"/><stop offset="1" stop-color="#8fe6c6" stop-opacity="0.15"/></linearGradient>' +
    '<linearGradient id="sc-aurora-2" x2="0" y2="1"><stop offset="0" stop-color="#c9a6f2" stop-opacity="0"/><stop offset="0.7" stop-color="#c9a6f2" stop-opacity="0.35"/><stop offset="1" stop-color="#eaa0c8" stop-opacity="0.1"/></linearGradient>' +
    '</defs>' +
    stars(w, h, 9, 0.6) +
    curtain(w, lights, top * 0.55, 'sc-aurora-1', 0.4) +
    curtain(w, lights - top * 0.18, top * 0.4, 'sc-aurora-2', 2.1) +
    mountains(lake, [[0.12, 0.2, 0.75], [0.38, 0.22, 1], [0.66, 0.2, 0.85], [0.92, 0.18, 0.7]].map(([x, hw, k]) => [x * w, hw * w, top * k]), '#4a6482', '#e1e9f3') +
    forest(0, w, ground * 0.9) +
    forest(-big * 0.1, big * 1.0, big * 0.55) +
    forest(w - big * 0.9, w + big * 0.1, big * 0.5) +
    water(w, h, lake, ['#2e4862', '#22374f'], 7) +
    `<path d="${glow}" stroke="#8fe6c6" stroke-opacity="0.22" stroke-width="2" stroke-linecap="round"/>`
  );
}

// A curtain of the northern lights across the screen: its foot waves about y, it is
// `height` tall and fades out upward (gradient `id`).
function curtain(w, y, height, id, phase) {
  const steps = 24;
  const at = (i, lift) =>
    `${n((i / steps) * w)} ${n(y - lift + Math.sin((i / steps) * Math.PI * 2.4 + phase) * height * 0.22)}`;
  let d = `M${at(0, 0)}`;
  for (let i = 1; i <= steps; i++) d += `L${at(i, 0)}`;
  for (let i = steps; i >= 0; i--) d += `L${at(i, height * (0.75 + 0.25 * Math.sin(i * 0.9 + phase)))}`;
  return `<path d="${d}Z" fill="url(#${id})"/>`;
}

// ---------- 일본: Mount Fuji, a red torii standing in the water, a cherry tree in
// bloom, and petals drifting

function japan(L) {
  const { w, h, band, big, ground, sky, corner } = L;
  const lake = h - ground * 0.6;
  const petals = scatter(L, 22, Math.max(3, corner * 0.02), 31, lake)
    .map(({ x, y, s }, i) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(s)}" ry="${n(s * 0.6)}" transform="rotate(${(i * 47) % 180} ${n(x)} ${n(y)})" fill="#f4b6c6" opacity="0.85"/>`)
    .join('');
  return (
    disc(w - sky.x, sky.y, sky.r, '#f6b3b0') +
    petals +
    fuji(w / 2, lake, band ? w * 0.6 : w * 0.32, band ? band * 0.85 : h * 0.2) +
    put(w - big * 0.95, lake, big * 0.95, SAKURA) +
    water(w, h, lake, ['#e1e9f0', '#bccbd9'], 18) +
    put(big * 0.05, lake + (h - lake) * 0.35, big * 0.85, TORII)
  );
}

// Mount Fuji standing on `base` round x: a pale cone with a jagged cap of snow.
function fuji(x, base, hw, ht) {
  const t = base - ht;
  const tip = `M${n(x - hw * 0.16)} ${n(t)}Q${n(x)} ${n(t - ht * 0.02)} ${n(x + hw * 0.16)} ${n(t)}`;
  const snow = [[0.39, 0.28], [0.22, 0.22], [0.1, 0.32], [-0.05, 0.22], [-0.2, 0.3], [-0.39, 0.28]]
    .map(([dx, dy]) => `L${n(x + hw * dx)} ${n(t + ht * dy)}`)
    .join('');
  return `<path d="${tip}L${n(x + hw)} ${n(base)}H${n(x - hw)}Z" fill="#b9c7dc"/><path d="${tip}${snow}Z" fill="#ffffff"/>`;
}

// A red torii, about 0.8 across, standing in the water with its reflection under it.
const TORII_SHAPE =
  '<rect x="0.17" y="-0.64" width="0.06" height="0.64"/><rect x="0.57" y="-0.64" width="0.06" height="0.64"/>' +
  '<rect x="0.1" y="-0.52" width="0.6" height="0.045"/>' +
  '<rect x="0.38" y="-0.62" width="0.04" height="0.1"/>' +
  '<path d="M0.02 -0.66Q0.4 -0.6 0.78 -0.66L0.8 -0.72Q0.4 -0.65 0 -0.72Z"/>';
const TORII =
  `<g fill="#e48a78">${TORII_SHAPE}</g>` +
  '<path d="M0 -0.72Q0.4 -0.65 0.8 -0.72L0.81 -0.75Q0.4 -0.68 -0.01 -0.75Z" fill="#5a5068"/>' +
  `<g fill="#e48a78" opacity="0.22" transform="scale(1 -0.6)">${TORII_SHAPE}</g>`;

// A cherry tree in bloom, about 1 across.
const SAKURA =
  '<path d="M0.5 0C0.52 -0.18 0.46 -0.3 0.4 -0.42M0.48 -0.22C0.58 -0.3 0.66 -0.36 0.74 -0.46M0.44 -0.34C0.34 -0.4 0.26 -0.44 0.2 -0.52" fill="none" stroke="#6b4a4a" stroke-width="0.04" stroke-linecap="round"/>' +
  [[0.4, -0.56, 0.16, '#f6bccb'], [0.22, -0.56, 0.12, '#f9d3dd'], [0.6, -0.6, 0.15, '#f9d3dd'], [0.76, -0.52, 0.12, '#f6bccb'], [0.5, -0.72, 0.14, '#f2a7bb'], [0.3, -0.68, 0.11, '#f6bccb'], [0.68, -0.74, 0.1, '#f6bccb'], [0.14, -0.46, 0.08, '#f2a7bb'], [0.86, -0.42, 0.08, '#f9d3dd']]
    .map(([x, y, r, fill]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`)
    .join('');

// ---------- 네덜란드: windmills by a canal and rows of tulips under big clouds

function netherlands({ w, h, big, ground, sky }) {
  const canal = h - ground;
  return (
    cloud(sky.x - sky.r * 2.2, sky.y + sky.r * 0.4, sky.r * 4.4) +
    cloud(w - sky.x - sky.r * 2, sky.y, sky.r * 3.8, '#ffffff', 0.85) +
    put(0, canal, big * 1.15, windmill(12)) +
    put(w - big * 0.62, canal, big * 0.78, windmill(-8)) +
    tulips(w, h, canal)
  );
}

// A windmill about 0.6 across and 1 tall with its sails: a tapered tower with a
// balcony, a cap, and four lattice sails turned by `turn` degrees.
function windmill(turn) {
  const sail =
    '<rect x="0.03" y="-0.035" width="0.4" height="0.07" fill="#f3ecdc" opacity="0.92"/>' +
    '<path d="M0.03 0H0.43M0.13 -0.035V0.035M0.23 -0.035V0.035M0.33 -0.035V0.035" stroke="#a8907c" stroke-width="0.01"/>';
  return (
    '<path d="M0.12 0L0.2 -0.56H0.4L0.48 0Z" fill="#94aa9d"/>' +
    '<rect x="0.06" y="-0.27" width="0.48" height="0.03" fill="#6f8578"/>' +
    '<path d="M0.26 0V-0.1A0.04 0.04 0 0 1 0.34 -0.1V0Z" fill="#6f8578"/>' +
    '<rect x="0.28" y="-0.42" width="0.04" height="0.05" fill="#f3ecdc"/>' +
    '<path d="M0.17 -0.56Q0.3 -0.7 0.43 -0.56Z" fill="#6f8578"/>' +
    `<g transform="translate(0.3 -0.6) rotate(${45 + turn})">${[0, 90, 180, 270].map((a) => `<g transform="rotate(${a})">${sail}</g>`).join('')}</g>` +
    '<circle cx="0.3" cy="-0.6" r="0.025" fill="#6f8578"/>'
  );
}

// A canal along y = top, then rows of tulips in bands of colour down to the bottom
// edge, each row deeper than the one behind it.
function tulips(w, h, top) {
  const canal = Math.max(4, (h - top) * 0.12);
  const rows = ['#f0a6a0', '#f6d98b', '#f4b9cf', '#f6b98a', '#ffffff', '#cdb2e0'];
  const weight = (i) => 1 + i * 0.35;
  const total = rows.reduce((sum, _, i) => sum + weight(i), 0);
  let y = top + canal;
  let out = `<rect y="${n(top)}" width="${w}" height="${n(canal)}" fill="#bfdcec"/>`;
  rows.forEach((fill, i) => {
    const hh = ((h - top - canal) * weight(i)) / total;
    out += `<rect y="${n(y)}" width="${w}" height="${n(hh)}" fill="#a9c99a"/><rect y="${n(y + hh * 0.25)}" width="${w}" height="${n(hh * 0.75)}" fill="${fill}"/>`;
    y += hh;
  });
  return out;
}

// ---------- 태국: a Yi Peng night
// Sky lanterns rising past the full moon, a temple hall and a chedi against the glow
// on the horizon, and the river below with lights floating on it.

function thailand(L) {
  const { w, h, big, ground, sky, corner } = L;
  const unit = Math.max(8, corner * 0.09);
  const river = h - ground * 0.5;
  const rand = random(11);
  let lights = '';
  for (let i = 0; i < w / 60; i++) {
    const x = rand() * w;
    const y = river + (0.2 + rand() * 0.7) * (h - river);
    lights += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(unit * 0.6)}" fill="url(#sc-halo)"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(unit * 0.12)}" fill="#ffe3a0"/>`;
  }
  return (
    '<defs>' +
    '<radialGradient id="sc-halo"><stop offset="0" stop-color="#ffb04d" stop-opacity="0.5"/><stop offset="1" stop-color="#ffb04d" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="sc-paper" cx="0.5" cy="0.85" r="0.9"><stop offset="0" stop-color="#fff3c4"/><stop offset="0.5" stop-color="#ffbf66"/><stop offset="1" stop-color="#e8732e"/></radialGradient>' +
    '<radialGradient id="sc-glow" cy="1" r="1"><stop offset="0" stop-color="#f59a52" stop-opacity="0.5"/><stop offset="1" stop-color="#f59a52" stop-opacity="0"/></radialGradient>' +
    '</defs>' +
    stars(w, h, 12) +
    disc(sky.x, sky.y, sky.r * 1.1, '#fff1c9') +
    `<rect y="${n(h * 0.55)}" width="${w}" height="${n(h * 0.45)}" fill="url(#sc-glow)"/>` +
    scatter(L, 16, unit, 13, h - ground * 2.2).map((l) => put(l.x, l.y, l.s, LANTERN)).join('') +
    put(0, river, big, WAT) +
    put(w - big * 0.7, river, big * 1.05, CHEDI) +
    `<rect y="${n(river)}" width="${w}" height="${n(h - river)}" fill="#2a2450"/>` +
    lights
  );
}

// A sky lantern about 1 across, centred on (0, 0), glowing from the flame inside.
const LANTERN =
  '<circle r="2" fill="url(#sc-halo)"/>' +
  '<path d="M-0.5 -0.45 C-0.52 -0.72 0.52 -0.72 0.5 -0.45 L0.36 0.5 C0.2 0.58 -0.2 0.58 -0.36 0.5Z" fill="url(#sc-paper)"/>' +
  '<ellipse cy="0.5" rx="0.36" ry="0.07" fill="#b5542a" opacity="0.7"/>' +
  '<ellipse cy="0.36" rx="0.1" ry="0.14" fill="#fffbe6"/>';

// A temple hall, 1 across: steep layered gables edged in gold with horns (chofa) at
// their tips, and a lit doorway and windows.
const WAT = [
  '<rect x="0.03" y="-0.07" width="0.94" height="0.07" fill="#251d42"/>',
  '<rect x="0.15" y="-0.3" width="0.7" height="0.23" fill="#2c2350"/>',
  '<path d="M0.04 -0.27 L0.96 -0.27 L0.83 -0.4 L0.17 -0.4Z" fill="#251d42"/>',
  '<path d="M0.08 -0.38 L0.5 -0.84 L0.92 -0.38 L0.86 -0.4 L0.5 -0.78 L0.14 -0.4Z" fill="#d9a441"/>',
  '<path d="M0.14 -0.4 L0.5 -0.78 L0.86 -0.4Z" fill="#30265a"/>',
  '<path d="M0.26 -0.33 L0.5 -0.62 L0.74 -0.33Z" fill="#3b2f69" stroke="#d9a441" stroke-width="0.014"/>',
  '<path d="M0.5 -0.84 C0.49 -0.92 0.55 -0.96 0.6 -0.92 M0.08 -0.38 C0.04 -0.37 0.02 -0.41 0.03 -0.45 M0.92 -0.38 C0.96 -0.37 0.98 -0.41 0.97 -0.45" fill="none" stroke="#d9a441" stroke-width="0.016" stroke-linecap="round"/>',
  '<path d="M0.45 -0.07 V-0.19 Q0.5 -0.25 0.55 -0.19 V-0.07Z" fill="#ffc96a"/>',
  '<rect x="0.24" y="-0.22" width="0.06" height="0.08" fill="#ffc96a" opacity="0.85"/>',
  '<rect x="0.7" y="-0.22" width="0.06" height="0.08" fill="#ffc96a" opacity="0.85"/>',
].join('');

// A chedi, 0.6 across: a stepped base, the bell and a ringed spire, edged in gold.
const CHEDI = [
  '<rect x="0" y="-0.06" width="0.6" height="0.06" fill="#251d42"/>',
  '<rect x="0.06" y="-0.12" width="0.48" height="0.06" fill="#2c2350"/>',
  '<rect x="0.11" y="-0.18" width="0.38" height="0.06" fill="#251d42"/>',
  '<path d="M0.1 -0.18 C0.08 -0.38 0.18 -0.52 0.3 -0.54 C0.42 -0.52 0.52 -0.38 0.5 -0.18Z" fill="#2c2350" stroke="#d9a441" stroke-width="0.012"/>',
  '<rect x="0.25" y="-0.6" width="0.1" height="0.06" fill="#251d42"/>',
  '<path d="M0.265 -0.6 L0.3 -1.08 L0.335 -0.6Z" fill="#2c2350"/>',
  '<path d="M0.268 -0.66 H0.332 M0.274 -0.73 H0.326 M0.28 -0.8 H0.32 M0.286 -0.87 H0.314" stroke="#d9a441" stroke-width="0.012"/>',
].join('');

// World key → picture.
const SCENES = {
  home,
  gate: china, pair: korea, discus: greece, aurora: canada, sundial: egypt, lasso: usa, boomerang: australia,
  mirror: france, canal: italy, ice: russia, encierro: spain, dial: mexico, vine: brazil, lantern: thailand,
  bell: uk, wall: germany, tunnel: turkiye, diagonal: india, samurai: japan, mondrian: netherlands,
};
