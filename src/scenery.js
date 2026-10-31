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
    `<rect y="${n(rail)}" width="${w}" height="${n(floor - rail)}" fill="#e6e1f0"/>` +
    `<rect y="${n(rail - 3)}" width="${w}" height="4" fill="#f8f6fb"/>` +
    put(sky.x * 1.15, sky.y, sky.r * 1.6, WINDOW) +
    `<path d="M${n(lamp.x)} 0V${n(lamp.y - lamp.r * 0.45)}" stroke="#6b6f86" stroke-width="1.5"/>` +
    put(lamp.x, lamp.y, lamp.r, LAMP) +
    `<rect y="${n(floor)}" width="${w}" height="${n(deep)}" fill="#e2c7a2"/>` +
    `<path d="${planks}" stroke="#d1ae86" stroke-width="1.5"/>` +
    `<rect y="${n(floor - Math.max(4, ground * 0.1))}" width="${w}" height="${n(Math.max(4, ground * 0.1))}" fill="#fbf8f3"/>` +
    `<ellipse cx="${n(w / 2)}" cy="${n(floor + deep * 0.58)}" rx="${n(w * 0.3)}" ry="${n(deep * 0.36)}" fill="#9aa3ef"/>` +
    `<ellipse cx="${n(w / 2)}" cy="${n(floor + deep * 0.58)}" rx="${n(w * 0.26)}" ry="${n(deep * 0.27)}" fill="none" stroke="#c3c9f7" stroke-width="${n(Math.max(1.5, deep * 0.05))}"/>` +
    put(big * 0.02, floor + deep * 0.3, big * 1.05, BOOKSHELF) +
    put(w - big * 0.95, floor + deep * 0.4, big * 0.95, PLANT_CAT)
  );
}

// A window with the sky and a cloud in it, curtains tied back and a sill; about 2.9
// across, centred on (0, 0).
const WINDOW =
  '<rect x="-1.1" y="-1" width="2.2" height="1.9" fill="#ffffff"/>' +
  '<rect x="-0.98" y="-0.88" width="1.96" height="1.66" fill="#cfe6f7"/>' +
  `<g transform="translate(-0.55 0.25) scale(0.85)" fill="#ffffff">${CLOUD}</g>` +
  '<path d="M0 -0.88V0.78M-0.98 -0.05H0.98" stroke="#ffffff" stroke-width="0.08"/>' +
  '<rect x="-1.25" y="0.88" width="2.5" height="0.15" rx="0.04" fill="#e9dccb"/>' +
  '<path d="M-1.35 -1.15H-0.7C-0.75 -0.6 -0.9 0.1 -1 0.3C-0.92 0.5 -0.85 0.8 -0.8 1H-1.35Z" fill="#9aa3ef"/>' +
  '<path d="M1.35 -1.15H0.7C0.75 -0.6 0.9 0.1 1 0.3C0.92 0.5 0.85 0.8 0.8 1H1.35Z" fill="#9aa3ef"/>' +
  '<path d="M-1.35 0.3H-0.98M1.35 0.3H0.98" stroke="#7d89e8" stroke-width="0.08"/>' +
  '<rect x="-1.5" y="-1.24" width="3" height="0.09" rx="0.045" fill="#b98a64"/>';

// A lamp shade in the home world's colour with its bulb glowing under it, about 1.6
// across, its middle at (0, 0).
const LAMP =
  '<circle cy="0.45" r="1.6" fill="url(#sc-lamp)"/>' +
  '<path d="M-0.35 -0.45H0.35L0.8 0.3H-0.8Z" fill="#5b6cff"/>' +
  '<path d="M-0.8 0.3H0.8" stroke="#4453d6" stroke-width="0.08"/>' +
  '<ellipse cy="0.36" rx="0.22" ry="0.16" fill="#fff4c9"/>';

// A bookshelf 0.62 across and about 1 tall: books in the game's link colours, a little
// plant, a photo and a vase on top.
const BOOKSHELF = (() => {
  const rand = random(5);
  const colours = ['#5b6cff', '#e09f1f', '#d6336c', '#0f9d9a', '#9b59b6', '#6b8e23', '#3a8fd6', '#e8590c'];
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
    '<path d="M0.42 -0.98Q0.4 -1.06 0.44 -1.1H0.5Q0.54 -1.06 0.52 -0.98Z" fill="#9aa3ef"/>' +
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
  '<ellipse cx="0.28" cy="-0.05" rx="0.25" ry="0.06" fill="#9aa3ef"/>' +
  '<ellipse cx="0.28" cy="-0.08" rx="0.22" ry="0.05" fill="#c3c9f7"/>' +
  '<ellipse cx="0.3" cy="-0.14" rx="0.16" ry="0.085" fill="#f0a868"/>' +
  '<path d="M0.44 -0.12C0.48 -0.06 0.36 -0.04 0.2 -0.07" fill="none" stroke="#f0a868" stroke-width="0.035" stroke-linecap="round"/>' +
  '<circle cx="0.16" cy="-0.15" r="0.065" fill="#f0a868"/>' +
  '<path d="M0.115 -0.19L0.12 -0.245L0.155 -0.205ZM0.165 -0.205L0.195 -0.245L0.205 -0.19Z" fill="#f0a868"/>' +
  '<path d="M0.26 -0.21Q0.3 -0.17 0.28 -0.12M0.33 -0.215Q0.37 -0.17 0.35 -0.12M0.4 -0.2Q0.43 -0.16 0.41 -0.12" fill="none" stroke="#d98a4e" stroke-width="0.012"/>' +
  '<path d="M0.13 -0.15Q0.145 -0.14 0.16 -0.15M0.175 -0.15Q0.19 -0.14 0.205 -0.15" fill="none" stroke="#7a4a2e" stroke-width="0.008"/>';

// ---------- 중국: Guilin's misty peaks, the Great Wall over a ridge, a gate tower, and
// red lanterns hanging from the top.

function china({ w, h, band, big, ground, sky }) {
  const foot = h - ground * 0.45;
  const top = band ? band * 1.05 : h * 0.24;
  const karst = (list, fill) => hills(foot, list.map(([x, k]) => [x * w, top * k * 0.42, top * k]), fill);
  return (
    hang(sky.x, sky.y, sky.r * 1.1, RED_LANTERN) +
    hang(w - sky.x, sky.y * 0.82, sky.r, RED_LANTERN) +
    hang(w - sky.x - sky.r * 3.2, sky.y * 1.08, sky.r * 0.8, RED_LANTERN) +
    karst([[0.06, 0.7], [0.25, 1], [0.44, 0.65], [0.64, 0.92], [0.85, 0.78], [1, 0.6]], '#d6e0db') +
    karst([[0.15, 0.48], [0.52, 0.42], [0.93, 0.5]], '#bccdc6') +
    put(w - big, foot, big, WALL) +
    put(0, foot, big, GATE) +
    water(w, h, foot, ['#d3e3de', '#a7c5bd'], 2)
  );
}

// A red lantern of radius 1 round (0, 0), with golden caps and a tassel.
const RED_LANTERN =
  '<rect x="-0.35" y="-1.08" width="0.7" height="0.16" rx="0.04" fill="#e2a93b"/>' +
  '<ellipse rx="0.9" ry="0.95" fill="#d9443b"/>' +
  '<path d="M0 -0.95V0.95M-0.5 -0.78Q-0.64 0 -0.5 0.78M0.5 -0.78Q0.64 0 0.5 0.78" fill="none" stroke="#b5332b" stroke-width="0.06"/>' +
  '<rect x="-0.35" y="0.92" width="0.7" height="0.16" rx="0.04" fill="#e2a93b"/>' +
  '<path d="M0 1.08v0.5" stroke="#e2a93b" stroke-width="0.12" stroke-linecap="round"/>';

// A gate tower, 1 across: a red wall with an arched gate, and a hall on top under two
// golden roofs with upturned eaves.
const GATE = [
  '<path d="M0.02 0L0.07 -0.34H0.93L0.98 0Z" fill="#c84b3c"/>',
  '<path d="M0.43 0V-0.15A0.07 0.07 0 0 1 0.57 -0.15V0Z" fill="#6b2b25"/>',
  '<rect x="0.06" y="-0.37" width="0.88" height="0.03" fill="#ead9b5"/>',
  '<rect x="0.17" y="-0.55" width="0.66" height="0.18" fill="#b53a2e"/>',
  '<path d="M0.24 -0.37V-0.55M0.36 -0.37V-0.55M0.5 -0.37V-0.55M0.64 -0.37V-0.55M0.76 -0.37V-0.55" stroke="#8f2b22" stroke-width="0.012"/>',
  '<path d="M0.05 -0.6Q0.12 -0.54 0.2 -0.55H0.8Q0.88 -0.54 0.95 -0.6L0.78 -0.68H0.22Z" fill="#d8a53f"/>',
  '<rect x="0.27" y="-0.76" width="0.46" height="0.09" fill="#b53a2e"/>',
  '<path d="M0.17 -0.79Q0.23 -0.74 0.3 -0.75H0.7Q0.77 -0.74 0.83 -0.79L0.68 -0.87H0.32Z" fill="#d8a53f"/>',
  '<path d="M0.32 -0.87H0.68M0.22 -0.68H0.78" stroke="#b9862a" stroke-width="0.014"/>',
].join('');

// The Great Wall coming down a ridge from a watchtower, about 1 across; the dashed top
// line is its battlements.
const WALL = (() => {
  const ridge = 'M-0.05 0.04C0.15 -0.06 0.35 -0.26 0.6 -0.39C0.75 -0.47 0.9 -0.51 1.1 -0.53';
  return (
    `<path d="${ridge}V0.05H-0.05Z" fill="#a7bfb3"/>` +
    `<path d="${ridge}" transform="translate(0 -0.025)" fill="none" stroke="#d2bf9c" stroke-width="0.045"/>` +
    `<path d="${ridge}" transform="translate(0 -0.06)" fill="none" stroke="#d2bf9c" stroke-width="0.025" stroke-dasharray="0.022 0.018"/>` +
    '<rect x="0.66" y="-0.66" width="0.14" height="0.18" fill="#c9b28c"/>' +
    '<path d="M0.66 -0.66v-0.03h0.03v0.03h0.025v-0.03h0.03v0.03h0.025v-0.03h0.03v0.03" fill="#c9b28c"/>' +
    '<path d="M0.715 -0.5v-0.06a0.015 0.015 0 0 1 0.03 0v0.06z" fill="#7d6a52"/>'
  );
})();

// ---------- 한국: 일월오봉도
// The white moon and the red sun (a pair, like the world's gimmick) over five peaks,
// with red pines at the sides and rows of waves below.

function korea({ w, h, band, big, ground, sky }) {
  const wave = Math.max(9, ground * 0.26);
  const sea = h - wave * 2.6; // top of the first row of waves
  // Lower on a landscape screen, where the middle peaks pass behind the cube.
  const tallest = band ? band * 0.95 : h * 0.2;
  const pine = [big * 0.95, big * 0.8];
  return (
    disc(sky.x, sky.y, sky.r, '#ffffff', '#c8d4e6') +
    disc(w - sky.x, sky.y, sky.r, '#e0533f') +
    peaks(-0.06 * w, 1.06 * w, sea + wave, tallest * 0.8, '#d4e4e9', 0.5) +
    peaks(-0.06 * w, 1.06 * w, sea + wave, tallest, '#a5c8d1', 0) +
    put(pine[0] * 0.3, sea + wave * 0.6, pine[0], PINE) +
    put(w - pine[1] * 0.3, sea + wave * 0.6, pine[1], PINE, true) +
    waves(w, h, sea, wave, ['#c3e0e8', '#a8d2de', '#8dc3d3'])
  );
}

// Five round peaks between x0 and x1 standing on `base`, the middle one `height`
// tall, each with white ridge lines; `shift` moves the row along by that many peaks.
function peaks(x0, x1, base, height, fill, shift) {
  const step = (x1 - x0) / 5;
  const tall = [0.55, 0.8, 1, 0.8, 0.55];
  // Outer peaks first, so the middle one stands in front.
  return [0, 4, 1, 3, 2]
    .map((i) => {
      const x = x0 + (i + 0.5 + shift) * step;
      const hw = step * 0.8;
      const ht = height * tall[i];
      const ridges = [0.66, 0.36].map((f) => bell(x, hw * f, base - ht * f, base)).join('');
      return (
        `<path d="${bell(x, hw, base - ht, base)}Z" fill="${fill}"/>` +
        `<path d="${ridges}" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="${n(Math.max(1.2, ht * 0.014))}"/>`
      );
    })
    .join('');
}

// A red pine about 0.5 across and 1 tall, leaning right, its needles in flat clusters.
const PINE =
  '<path d="M0.03 0 C-0.01 -0.3 0.17 -0.52 0.09 -0.92" fill="none" stroke="#9e4b36" stroke-width="0.07" stroke-linecap="round"/>' +
  '<path d="M0.12 -0.66 L0.34 -0.72 M0.08 -0.56 L-0.1 -0.64 M0.1 -0.42 L0.3 -0.47" fill="none" stroke="#9e4b36" stroke-width="0.03" stroke-linecap="round"/>' +
  [[0.1, -0.94, 0.24], [0.36, -0.73, 0.2], [-0.12, -0.65, 0.17], [0.32, -0.48, 0.15]]
    .map(
      ([x, y, r]) =>
        `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${u(r * 0.34)}" fill="#3d7857"/>` +
        `<ellipse cx="${x}" cy="${u(y - r * 0.1)}" rx="${u(r * 0.72)}" ry="${u(r * 0.15)}" fill="#62a079"/>`,
    )
    .join('');

// Rows of round crests from y = top down to the bottom edge, each crest with two
// white lines in it; every other row is offset by half a crest.
function waves(w, h, top, r, fills) {
  return fills
    .map((fill, row) => {
      const y = top + row * r * 0.85;
      let x = row % 2 ? -r : 0;
      let d = `M${n(x)} ${n(h)}V${n(y)}`;
      let crests = '';
      for (; x < w + r; x += 2 * r) {
        d += `A${n(r)} ${n(r)} 0 0 1 ${n(x + 2 * r)} ${n(y)}`;
        for (const f of [0.7, 0.38]) crests += `M${n(x + r - r * f)} ${n(y)}A${n(r * f)} ${n(r * f)} 0 0 1 ${n(x + r + r * f)} ${n(y)}`;
      }
      return (
        `<path d="${d}V${n(h)}Z" fill="${fill}"/>` +
        `<path d="${crests}" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="${n(r * 0.09)}"/>`
      );
    })
    .join('');
}

// ---------- 그리스: an Aegean noon
// A temple on its hill and white houses with blue domes on a cliff, the sea along the
// bottom with islands far out, the sun and a few gulls.

function greece({ w, h, big, ground, sky }) {
  const sea = h - ground * 1.5;
  // Islands on the horizon, between the two landmarks: [from, to, height] in screen
  // widths and grounds.
  const islands = [[0.27, 0.5, 0.32], [0.46, 0.7, 0.2]]
    .map(([a, b, k]) => `M${n(a * w)} ${n(sea)}Q${n(((a + b) / 2) * w)} ${n(sea - ground * k * 2)} ${n(b * w)} ${n(sea)}Z`)
    .join('');
  return (
    disc(w - sky.x, sky.y, sky.r, '#ffd166') +
    birds(sky.x, sky.y, sky.r * 1.6) +
    `<path d="${islands}" fill="#b9d2e4"/>` +
    water(w, h, sea, ['#93cfec', '#3d8ccb'], 5) +
    `<path d="M0 ${n(sea)}H${w}" stroke="#d4eef9" stroke-width="2"/>` +
    put(0, sea + ground * 0.45, big, TEMPLE) +
    put(w - big * 0.9, sea + ground * 0.45, big * 0.9, HOUSES)
  );
}

// A temple on its hill, 1 across; y = 0 is the foot of the hill.
const TEMPLE = [
  '<path d="M-0.08 0.06 C0.08 -0.15 0.27 -0.29 0.5 -0.29 C0.73 -0.29 0.92 -0.15 1.08 0.06Z" fill="#d9caa0"/>',
  '<path d="M-0.08 0.06 C0.12 -0.06 0.3 -0.12 0.5 -0.11 C0.72 -0.1 0.9 -0.04 1.08 0.06Z" fill="#c9b789"/>',
  '<circle cx="0.1" cy="-0.1" r="0.055" fill="#93a667"/><circle cx="0.17" cy="-0.13" r="0.04" fill="#a8b978"/><circle cx="0.88" cy="-0.09" r="0.05" fill="#93a667"/>',
  // three steps, the hall behind the columns, the columns with their shaded side
  '<rect x="0.13" y="-0.31" width="0.74" height="0.04" fill="#e2d7c0"/>',
  '<rect x="0.15" y="-0.35" width="0.7" height="0.04" fill="#f4efe3"/>',
  '<rect x="0.17" y="-0.39" width="0.66" height="0.04" fill="#e2d7c0"/>',
  '<rect x="0.2" y="-0.64" width="0.6" height="0.25" fill="#cbbd9d"/>',
  ...[0.23, 0.338, 0.446, 0.554, 0.662, 0.77].map(
    (x) =>
      `<rect x="${u(x - 0.03)}" y="-0.64" width="0.06" height="0.25" fill="#fbf8f1"/>` +
      `<rect x="${u(x + 0.012)}" y="-0.64" width="0.018" height="0.25" fill="#ddd0b5"/>`,
  ),
  // the beam across the columns and the pediment on top
  '<rect x="0.17" y="-0.7" width="0.66" height="0.06" fill="#f4efe3"/>',
  '<rect x="0.17" y="-0.725" width="0.66" height="0.025" fill="#e2d7c1"/>',
  '<path d="M0.15 -0.725 L0.85 -0.725 L0.5 -0.86Z" fill="#f7f3ea"/>',
  '<path d="M0.24 -0.738 L0.76 -0.738 L0.5 -0.838Z" fill="#e9e1cf"/>',
].join('');

// White houses with blue doors and domes stepping up a cliff to the right, about 1
// across; the top house stands on the roof of the one below it.
const HOUSES = [
  '<path d="M-0.06 0.06 C0.12 -0.08 0.26 -0.28 0.42 -0.34 L0.62 -0.38 L1.12 -0.44 L1.12 0.06Z" fill="#e9dcc1"/>',
  '<path d="M0.16 -0.1 C0.34 -0.18 0.56 -0.22 1.12 -0.24 M0.34 -0.24 C0.52 -0.29 0.74 -0.32 1.12 -0.34" fill="none" stroke="#d8c6a1" stroke-width="0.012"/>',
  // [left, foot, width, height]
  ...[[0.36, -0.33, 0.17, 0.12], [0.55, -0.37, 0.2, 0.17], [0.77, -0.41, 0.22, 0.12], [0.84, -0.53, 0.18, 0.15]].map(
    ([x, y, bw, bh]) =>
      `<rect x="${x}" y="${u(y - bh)}" width="${bw}" height="${bh}" fill="#ffffff"/>` +
      `<rect x="${u(x + bw * 0.74)}" y="${u(y - bh)}" width="${u(bw * 0.26)}" height="${bh}" fill="#e2e9f1"/>` +
      `<rect x="${u(x + bw * 0.3)}" y="${u(y - bh * 0.55)}" width="${u(bw * 0.16)}" height="${u(bh * 0.55)}" fill="#2f6db5"/>`,
  ),
  // [middle, foot, radius]: a dome with a small cross
  ...[[0.65, -0.54, 0.075], [0.93, -0.68, 0.065]].map(
    ([x, y, r]) =>
      `<path d="M${u(x - r)} ${y} A${r} ${r} 0 0 1 ${u(x + r)} ${y}Z" fill="#2f6db5"/>` +
      `<path d="M${x} ${u(y - r)} v${u(-r * 0.6)} M${u(x - r * 0.2)} ${u(y - r * 1.35)} h${u(r * 0.4)}" stroke="#2f6db5" stroke-width="0.012"/>`,
  ),
].join('');

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
    return `<g fill="#132230">${out}</g>`;
  };
  let glow = '';
  for (let i = 0; i < w / 40; i++) glow += `M${n(rand() * w)} ${n(lake + (0.1 + rand() * 0.8) * (h - lake))}h${n(8 + rand() * 20)}`;
  return (
    '<defs>' +
    '<linearGradient id="sc-aurora-1" x2="0" y2="1"><stop offset="0" stop-color="#3fe0a0" stop-opacity="0"/><stop offset="0.75" stop-color="#3fe0a0" stop-opacity="0.5"/><stop offset="1" stop-color="#3fe0a0" stop-opacity="0.15"/></linearGradient>' +
    '<linearGradient id="sc-aurora-2" x2="0" y2="1"><stop offset="0" stop-color="#b37cf0" stop-opacity="0"/><stop offset="0.7" stop-color="#b37cf0" stop-opacity="0.35"/><stop offset="1" stop-color="#e070b0" stop-opacity="0.1"/></linearGradient>' +
    '</defs>' +
    stars(w, h, 9, 0.6) +
    curtain(w, lights, top * 0.55, 'sc-aurora-1', 0.4) +
    curtain(w, lights - top * 0.18, top * 0.4, 'sc-aurora-2', 2.1) +
    mountains(lake, [[0.12, 0.2, 0.75], [0.38, 0.22, 1], [0.66, 0.2, 0.85], [0.92, 0.18, 0.7]].map(([x, hw, k]) => [x * w, hw * w, top * k]), '#2c405a', '#c6d3e6') +
    forest(0, w, ground * 0.9) +
    forest(-big * 0.1, big * 1.0, big * 0.55) +
    forest(w - big * 0.9, w + big * 0.1, big * 0.5) +
    water(w, h, lake, ['#16293c', '#0e1b29'], 7) +
    `<path d="${glow}" stroke="#3fe0a0" stroke-opacity="0.22" stroke-width="2" stroke-linecap="round"/>`
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

// ---------- 이집트: the pyramids of Giza and an obelisk among palms by the Nile, under
// a big sun, with dunes behind

function egypt({ w, h, band, big, ground, sky }) {
  const nile = h - ground * 0.5;
  const top = band ? band * 0.45 : h * 0.1;
  return (
    disc(w - sky.x, sky.y, sky.r * 1.3, '#ffcf6e') +
    birds(sky.x, sky.y, sky.r * 1.6, '#a4825a') +
    hills(nile, [[0.2, 0.35, 0.8], [0.6, 0.4, 0.55], [0.98, 0.3, 0.9]].map(([x, hw, k]) => [x * w, hw * w, top * k]), '#f0dbaf') +
    put(0, nile, big * 1.05, PYRAMIDS) +
    put(w - big * 0.85, nile, big * 0.85, OBELISK) +
    water(w, h, nile, ['#a6d5df', '#5fa8c2'], 6)
  );
}

// The pyramids of Giza, about 1 across, lit from the left: [left, right, apex x,
// apex y, foot of the edge between the two faces], the farthest first.
const PYRAMIDS = [
  [0.7, 1.06, 0.9, -0.24, 0.94],
  [0.5, 0.98, 0.76, -0.4, 0.82],
  [0.02, 0.82, 0.4, -0.66, 0.53],
]
  .map(([a, b, x, y, e]) => `<path d="M${a} 0L${x} ${y}L${e} 0Z" fill="#ecd39f"/><path d="M${e} 0L${x} ${y}L${b} 0Z" fill="#cfae74"/>`)
  .join('');

// An obelisk between two palms, about 1 across.
const OBELISK =
  `<g transform="translate(0.22 0) scale(-0.78 0.78)">${PALM}</g>` +
  '<rect x="0.4" y="-0.03" width="0.2" height="0.03" fill="#c9a86d"/>' +
  '<path d="M0.45 -0.03L0.475 -0.84L0.5 -0.9L0.525 -0.84L0.55 -0.03Z" fill="#dcbb80"/>' +
  '<path d="M0.5 -0.03V-0.9L0.525 -0.84L0.55 -0.03Z" fill="#c39d5f"/>' +
  '<path d="M0.483 -0.72h0.02M0.481 -0.62h0.024M0.479 -0.52h0.026M0.477 -0.42h0.028M0.475 -0.32h0.03" stroke="#a9874f" stroke-width="0.01"/>' +
  `<g transform="translate(0.86 0) scale(0.62)">${PALM}</g>`;

// ---------- 미국: buttes of Monument Valley and saguaro cacti in the red desert

function usa({ w, h, band, big, ground, sky }) {
  const foot = h - ground * 0.55;
  const top = band ? band * 0.4 : h * 0.1;
  const mesas = [[0.18, 0.16, 0.7], [0.5, 0.22, 0.5], [0.8, 0.14, 0.85]]
    .map(([x, hw, k]) => {
      const a = (x - hw) * w;
      const b = (x + hw) * w;
      const s = hw * w * 0.18;
      return `M${n(a)} ${n(foot)}L${n(a + s)} ${n(foot - top * k)}H${n(b - s)}L${n(b)} ${n(foot)}Z`;
    })
    .join('');
  return (
    disc(w - sky.x, sky.y, sky.r, '#ffd98a') +
    birds(sky.x, sky.y, sky.r * 1.4, '#8c6a55') +
    `<path d="${mesas}" fill="#eec7a6"/>` +
    put(0, foot, big * 1.05, BUTTE) +
    put(w - big * 0.85, foot, big * 0.85, SAGUAROS) +
    floor(w, h, foot, '#e8c096') +
    tufts(w, h, foot, '#b9a36c', 15)
  );
}

// Little clumps of grass or scrub scattered on the ground below y = top.
function tufts(w, h, top, colour, seed) {
  const rand = random(seed);
  let d = '';
  for (let i = 0; i < w / 45; i++) {
    const x = rand() * w;
    const y = top + (0.15 + rand() * 0.75) * (h - top);
    const s = 3 + rand() * 4;
    d += `M${n(x - s)} ${n(y - s * 0.6)}L${n(x)} ${n(y)}L${n(x + s)} ${n(y - s * 0.6)}M${n(x)} ${n(y - s)}V${n(y)}`;
  }
  return `<path d="${d}" fill="none" stroke="${colour}" stroke-width="1.4" stroke-linecap="round"/>`;
}

// A butte of Monument Valley, about 1 across: a sheer tower with a thumb beside it,
// on a slope of scree.
const BUTTE =
  '<path d="M-0.04 0C0.08 -0.08 0.18 -0.17 0.28 -0.21H0.8C0.88 -0.16 0.96 -0.08 1.04 0Z" fill="#dc9c6e"/>' +
  '<path d="M0.3 -0.2L0.32 -0.64H0.62L0.64 -0.2Z" fill="#cc744c"/>' +
  '<path d="M0.52 -0.2L0.53 -0.64H0.62L0.64 -0.2Z" fill="#b45f3c"/>' +
  '<path d="M0.69 -0.2L0.7 -0.5Q0.72 -0.53 0.74 -0.5L0.76 -0.2Z" fill="#c26a45"/>' +
  '<path d="M0.38 -0.25V-0.6M0.45 -0.24V-0.62" stroke="#b9653f" stroke-width="0.008"/>' +
  '<path d="M0.31 -0.64H0.63" stroke="#e3a57a" stroke-width="0.012"/>';

// A saguaro, 1 tall: a column with two arms, and the light down its ribs.
const SAGUARO =
  '<path d="M0 0V-0.92M0 -0.4H-0.15V-0.68M0 -0.55H0.14V-0.8" fill="none" stroke="#6b9858" stroke-width="0.11" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M0.02 -0.05V-0.88M-0.13 -0.45V-0.66M0.16 -0.6V-0.78" fill="none" stroke="#86b06f" stroke-width="0.02" stroke-linecap="round"/>';
const SAGUAROS = `<g transform="translate(0.24 0) scale(0.5)">${SAGUARO}</g><g transform="translate(0.66 0) scale(0.9)">${SAGUARO}</g>`;

// ---------- 호주: Uluru glowing red at dusk, a gum tree and a kangaroo on the red
// earth, the sun ringed with dots as in Aboriginal paintings, and a boomerang

function australia({ w, h, big, ground, sky }) {
  const foot = h - ground * 0.5;
  let dots = '';
  for (const [k, count, fill] of [[1.55, 14, '#d2593a'], [1.95, 18, '#f0a54c']]) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      dots += `<circle cx="${n(w - sky.x + Math.cos(a) * sky.r * k)}" cy="${n(sky.y + Math.sin(a) * sky.r * k)}" r="${n(Math.max(1, sky.r * 0.08))}" fill="${fill}"/>`;
    }
  }
  return (
    disc(w - sky.x, sky.y, sky.r, '#f6a24a') +
    dots +
    put(sky.x, sky.y, sky.r * 1.8, BOOMERANG) +
    put(0, foot, big * 1.15, ULURU) +
    put(w - big * 0.9, foot, big * 0.9, GUM) +
    floor(w, h, foot, '#d97a4c') +
    tufts(w, h, foot, '#c9b25a', 23)
  );
}

// A boomerang about 1 across, centred on (0, 0), with dots painted along it.
const BOOMERANG =
  '<g transform="rotate(-18)">' +
  '<path d="M-0.5 0.12C-0.3 -0.04 -0.12 -0.2 0 -0.3C0.12 -0.2 0.3 -0.04 0.5 0.12C0.46 0.19 0.39 0.17 0.34 0.12C0.2 0.01 0.08 -0.09 0 -0.15C-0.08 -0.09 -0.2 0.01 -0.34 0.12C-0.39 0.17 -0.46 0.19 -0.5 0.12Z" fill="#b9682f"/>' +
  [[-0.38, 0.08], [-0.25, -0.02], [-0.12, -0.12], [0.12, -0.12], [0.25, -0.02], [0.38, 0.08]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.022" fill="#fbe9d2"/>`).join('') +
  '</g>';

// Uluru, about 1 across and a third as tall, with grooves down its sides.
const ULURU =
  '<path d="M-0.02 0C0 -0.1 0.05 -0.25 0.17 -0.3C0.38 -0.37 0.68 -0.36 0.85 -0.29C0.95 -0.24 0.99 -0.1 1.02 0Z" fill="#c9562f"/>' +
  '<path d="M0.17 -0.3C0.38 -0.37 0.68 -0.36 0.85 -0.29" fill="none" stroke="#dd7442" stroke-width="0.02"/>' +
  '<path d="M0.12 -0.24Q0.1 -0.12 0.12 0M0.3 -0.32Q0.27 -0.15 0.3 0M0.5 -0.34Q0.48 -0.18 0.5 0M0.68 -0.33Q0.7 -0.16 0.67 0M0.86 -0.27Q0.9 -0.12 0.87 0" fill="none" stroke="#a9442a" stroke-width="0.012"/>';

// A kangaroo about 0.5 across, facing left.
const KANGAROO =
  '<g fill="#7a3f2a" stroke="#7a3f2a" stroke-linecap="round" stroke-linejoin="round">' +
  '<ellipse cx="0.2" cy="-0.2" rx="0.085" ry="0.13" transform="rotate(-28 0.2 -0.2)" stroke="none"/>' +
  '<path d="M0.15 -0.29Q0.12 -0.36 0.07 -0.36Q0.03 -0.35 0.04 -0.33L0.1 -0.31Z" stroke-width="0.03"/>' +
  '<path d="M0.1 -0.36l0.012 -0.05l0.012 0.045" stroke-width="0.012"/>' +
  '<path d="M0.27 -0.12Q0.38 -0.03 0.48 -0.01" fill="none" stroke-width="0.035"/>' +
  '<path d="M0.22 -0.1L0.15 -0.01H0.06" fill="none" stroke-width="0.03"/>' +
  '<path d="M0.14 -0.25L0.1 -0.19" fill="none" stroke-width="0.015"/>' +
  '</g>';

// A gum tree with pale bark and a kangaroo at its foot, about 1 across.
const GUM =
  '<path d="M0.55 0C0.56 -0.25 0.52 -0.4 0.46 -0.55M0.53 -0.32C0.62 -0.42 0.7 -0.5 0.74 -0.62M0.48 -0.5C0.4 -0.56 0.34 -0.6 0.3 -0.66" fill="none" stroke="#ece6dc" stroke-width="0.045" stroke-linecap="round"/>' +
  [[0.44, -0.66, 0.13], [0.3, -0.7, 0.1], [0.62, -0.7, 0.12], [0.76, -0.66, 0.1], [0.54, -0.78, 0.11]]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${u(r * 0.6)}" fill="#8fa47e"/>`)
    .join('') +
  `<g transform="translate(0.04 0) scale(0.9)">${KANGAROO}</g>`;

// ---------- 프랑스: the Eiffel Tower, Paris rooftops along the Seine, soft clouds

function france({ w, h, big, ground, sky }) {
  const quay = h - ground * 0.55;
  return (
    cloud(sky.x - sky.r * 2.2, sky.y + sky.r * 0.4, sky.r * 4.4) +
    cloud(w - sky.x - sky.r * 1.4, sky.y - sky.r * 0.2, sky.r * 3.4, '#ffffff', 0.85) +
    put(big * 0.05, quay, big * 1.5, `<g fill="#8f89a8">${EIFFEL}</g>`) +
    put(w - big, quay, big, ROOFTOPS) +
    `<rect y="${n(quay - 2)}" width="${w}" height="${n(Math.max(4, ground * 0.08))}" fill="#d8cdbb"/>` +
    water(w, h, quay + 2, ['#b5cadf', '#86a2c4'], 8)
  );
}

// The Eiffel Tower, 0.5 across and 1 tall (colour from the caller), with a little of
// its lattice drawn in.
const EIFFEL =
  '<path d="M0 0Q0.07 -0.1 0.1 -0.27H0.4Q0.43 -0.1 0.5 0H0.42Q0.36 -0.14 0.25 -0.14Q0.14 -0.14 0.08 0Z"/>' +
  '<rect x="0.07" y="-0.305" width="0.36" height="0.04"/>' +
  '<path d="M0.12 -0.27L0.19 -0.56H0.31L0.38 -0.27Z"/>' +
  '<rect x="0.16" y="-0.59" width="0.18" height="0.035"/>' +
  '<path d="M0.205 -0.56L0.24 -0.93L0.25 -1L0.26 -0.93L0.295 -0.56Z"/>' +
  '<path d="M0.14 -0.29L0.25 -0.4L0.36 -0.29M0.2 -0.5L0.25 -0.45L0.3 -0.5" fill="none" stroke="#c4c0d6" stroke-width="0.01"/>';

// Paris buildings along the river, about 1 across: cream fronts with rows of windows,
// grey mansard roofs and chimneys.
const ROOFTOPS = [[0, 0.3, 0.42], [0.3, 0.36, 0.52], [0.66, 0.36, 0.44]]
  .map(([x, bw, ht]) => {
    let windows = '';
    for (let row = 0; row < 3; row++) {
      for (let c = 0; c < Math.floor((bw - 0.02) / 0.075); c++) {
        windows += `<rect x="${u(x + 0.03 + c * 0.075)}" y="${u(-ht + 0.06 + row * 0.12)}" width="0.035" height="0.06" fill="#b9c3d3"/>`;
      }
    }
    return (
      `<rect x="${x}" y="${-ht}" width="${bw}" height="${ht}" fill="#efe6d6"/>` +
      `<path d="M${u(x - 0.01)} ${-ht}L${u(x + 0.035)} ${u(-ht - 0.12)}H${u(x + bw - 0.035)}L${u(x + bw + 0.01)} ${-ht}Z" fill="#8d9bb6"/>` +
      `<rect x="${u(x + bw * 0.7)}" y="${u(-ht - 0.17)}" width="0.03" height="0.06" fill="#c98a6f"/>` +
      windows
    );
  })
  .join('');

// ---------- 이탈리아: Venice — houses in warm colours on a canal, the campanile of San
// Marco, and a gondola

function italy({ w, h, big, ground, sky }) {
  const canal = h - ground * 0.6;
  return (
    disc(w - sky.x, sky.y, sky.r, '#ffd37a') +
    birds(sky.x, sky.y, sky.r * 1.5, '#7f8aa0') +
    put(0, canal, big, VENICE) +
    put(w - big * 0.42, canal, big * 1.35, CAMPANILE) +
    water(w, h, canal, ['#8fd0d3', '#4f9fae'], 10) +
    put(w - big * 1.25, canal + (h - canal) * 0.5, big * 0.55, GONDOLA)
  );
}

// Venetian houses on the water in warm colours, with arched windows and funnel
// chimneys, about 0.9 across.
const VENICE = [[0, 0.3, 0.6, '#e8b26a'], [0.3, 0.26, 0.74, '#d97c5d'], [0.56, 0.3, 0.55, '#eab0a5']]
  .map(([x, bw, ht, fill]) => {
    let windows = '';
    for (let row = 0; row < 3; row++) {
      for (const c of [0.25, 0.6]) {
        const wx = x + bw * c;
        const wy = -ht + 0.1 + row * 0.16;
        windows += `<path d="M${u(wx)} ${u(wy + 0.08)}V${u(wy + 0.025)}A0.025 0.025 0 0 1 ${u(wx + 0.05)} ${u(wy + 0.025)}V${u(wy + 0.08)}Z" fill="#fbf4ea"/>`;
      }
    }
    return (
      `<rect x="${x}" y="${-ht}" width="${bw}" height="${ht}" fill="${fill}"/>` +
      `<rect x="${u(x - 0.01)}" y="${u(-ht - 0.02)}" width="${u(bw + 0.02)}" height="0.025" fill="#b8644a"/>` +
      `<path d="M${u(x + bw * 0.75)} ${u(-ht - 0.02)}v-0.06l-0.015 -0.03h0.06l-0.015 0.03v0.06z" fill="#b8644a"/>` +
      windows
    );
  })
  .join('');

// The campanile of San Marco, 0.3 across and 1 tall: brick shaft, white belfry, green
// spire with a golden tip.
const CAMPANILE =
  '<rect x="0.04" y="-0.62" width="0.22" height="0.62" fill="#c8735a"/>' +
  '<path d="M0.09 -0.02V-0.6M0.15 -0.02V-0.6M0.21 -0.02V-0.6" stroke="#d68d72" stroke-width="0.012"/>' +
  '<rect x="0.03" y="-0.73" width="0.24" height="0.11" fill="#efe6d8"/>' +
  '<path d="M0.06 -0.63V-0.69A0.02 0.02 0 0 1 0.1 -0.69V-0.63ZM0.13 -0.63V-0.69A0.02 0.02 0 0 1 0.17 -0.69V-0.63ZM0.2 -0.63V-0.69A0.02 0.02 0 0 1 0.24 -0.69V-0.63Z" fill="#8f6a58"/>' +
  '<rect x="0.04" y="-0.79" width="0.22" height="0.06" fill="#c8735a"/>' +
  '<path d="M0.04 -0.79L0.15 -0.97L0.26 -0.79Z" fill="#7fae8f"/>' +
  '<path d="M0.15 -0.97V-1.02" stroke="#e2b04a" stroke-width="0.02"/>';

// A gondola with its gondolier, about 1 across, floating on y = 0.
const GONDOLA =
  '<path d="M0 -0.12Q0.08 0 0.3 0H0.78Q0.95 0 1.03 -0.17L0.99 -0.15Q0.93 -0.05 0.78 -0.05H0.3Q0.1 -0.05 0.03 -0.14Z" fill="#26262e"/>' +
  '<path d="M1.03 -0.17V-0.24M1 -0.2H1.05M1 -0.225H1.05" stroke="#d9d2c2" stroke-width="0.012"/>' +
  '<path d="M0.2 -0.05V-0.26" stroke="#26262e" stroke-width="0.05" stroke-linecap="round"/>' +
  '<circle cx="0.2" cy="-0.31" r="0.035" fill="#26262e"/>' +
  '<path d="M0.17 -0.2H0.23M0.17 -0.16H0.23" stroke="#f4f0e6" stroke-width="0.012"/>' +
  '<path d="M0.08 0.02L0.3 -0.32" stroke="#8a6a4a" stroke-width="0.014"/>';

// ---------- 러시아: Saint Basil's onion domes and the Kremlin's Spasskaya Tower in the
// snow, with snowflakes falling

function russia(L) {
  const { w, h, big, ground, sky, corner } = L;
  const snow = h - ground * 0.6;
  const flakes = scatter(L, 26, Math.max(3, corner * 0.02), 41, snow)
    .map(({ x, y, s }) => `M${n(x - s)} ${n(y)}H${n(x + s)}M${n(x - s / 2)} ${n(y - s * 0.87)}L${n(x + s / 2)} ${n(y + s * 0.87)}M${n(x - s / 2)} ${n(y + s * 0.87)}L${n(x + s / 2)} ${n(y - s * 0.87)}`)
    .join('');
  return (
    disc(w - sky.x, sky.y, sky.r, '#fff3dc', '#eadcc6') +
    `<path d="${flakes}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.95"/>` +
    hills(snow, [[0.15 * w, 0.3 * w, ground * 0.6], [0.6 * w, 0.4 * w, ground * 0.45], [0.95 * w, 0.3 * w, ground * 0.7]], '#e2e8f3') +
    put(0, snow, big * 1.05, ST_BASIL) +
    put(w - big * 0.45, snow, big * 1.3, SPASSKAYA) +
    floor(w, h, snow, '#f3f5fb')
  );
}

// An onion dome 1 across standing on y = 0, with a spike on top.
const ONION = 'M-0.5 0C-0.56 -0.3 -0.45 -0.55 -0.2 -0.78C-0.08 -0.9 -0.02 -1.02 0 -1.15C0.02 -1.02 0.08 -0.9 0.2 -0.78C0.45 -0.55 0.56 -0.3 0.5 0Z';
const dome = (x, y, s, fill, stripe) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="${ONION}" fill="${fill}"/>` +
  `<path d="M-0.3 -0.12C-0.1 -0.4 0.1 -0.5 0.25 -0.72M0.05 -0.05C0.2 -0.3 0.35 -0.45 0.42 -0.5" fill="none" stroke="${stripe}" stroke-width="0.09"/>` +
  '<path d="M0 -1.15V-1.4" stroke="#e2b04a" stroke-width="0.06"/></g>';

// Saint Basil's Cathedral, about 1 across: a tower with a tent roof in the middle and
// striped onion domes round it on brick drums, over an arched front.
const ST_BASIL =
  '<rect x="0.43" y="-0.5" width="0.14" height="0.5" fill="#e9dccb"/>' +
  '<path d="M0.41 -0.5L0.5 -0.84L0.59 -0.5Z" fill="#6fa37f"/>' +
  dome(0.5, -0.84, 0.05, '#e2b04a', '#f6d77c') +
  // [middle, height, width, dome colour, stripe colour]
  [[0.18, 0.36, 0.15, '#d0554a', '#f3e2c9'], [0.32, 0.46, 0.13, '#5e9b74', '#e8d27a'], [0.68, 0.46, 0.14, '#4f7fc1', '#f1f1f1'], [0.84, 0.34, 0.15, '#e0b04b', '#c4583f']]
    .map(
      ([x, ht, dw, fill, stripe]) =>
        `<rect x="${u(x - dw * 0.42)}" y="${-ht}" width="${u(dw * 0.84)}" height="${ht}" fill="#d47a62"/>` +
        `<rect x="${u(x - dw * 0.48)}" y="${u(-ht - 0.02)}" width="${u(dw * 0.96)}" height="0.02" fill="#f3e9db"/>` +
        dome(x, u(-ht - 0.02), dw, fill, stripe),
    )
    .join('') +
  '<rect x="0.06" y="-0.16" width="0.88" height="0.16" fill="#c9604c"/>' +
  [0.14, 0.26, 0.38, 0.62, 0.74, 0.86].map((x) => `<path d="M${u(x - 0.03)} 0V-0.07A0.03 0.03 0 0 1 ${u(x + 0.03)} -0.07V0Z" fill="#8f3e33"/>`).join('');

// The Kremlin's Spasskaya Tower, 0.3 across and 1 tall: red brick, a clock, a green
// spire and a red star.
const SPASSKAYA =
  '<rect x="0" y="-0.42" width="0.3" height="0.42" fill="#c45a4c"/>' +
  '<rect x="0.04" y="-0.6" width="0.22" height="0.18" fill="#c45a4c"/>' +
  '<rect x="-0.01" y="-0.44" width="0.32" height="0.025" fill="#f1e7d8"/>' +
  '<circle cx="0.15" cy="-0.52" r="0.055" fill="#f7f1e4" stroke="#e2b04a" stroke-width="0.01"/>' +
  '<path d="M0.15 -0.52V-0.555M0.15 -0.52H0.175" stroke="#3a3330" stroke-width="0.008"/>' +
  '<rect x="0.035" y="-0.62" width="0.23" height="0.02" fill="#f1e7d8"/>' +
  '<rect x="0.07" y="-0.7" width="0.16" height="0.08" fill="#c45a4c"/>' +
  '<path d="M0.06 -0.7L0.15 -0.94L0.24 -0.7Z" fill="#5e8f6e"/>' +
  star(0.15, -0.97, 0.03, '#d0403a') +
  '<path d="M0.12 0V-0.1A0.03 0.03 0 0 1 0.18 -0.1V0Z" fill="#7d3a31"/>';

// ---------- 스페인: a bullring, the black bull on a golden hill, the hot sun and the
// red and white flags of San Fermín

function spain({ w, h, big, ground, sky }) {
  const foot = h - ground * 0.5;
  return (
    disc(w - sky.x, sky.y, sky.r * 1.2, '#ffc552') +
    flags(sky, ['#c8323c', '#ffffff']) +
    hills(foot, [[w - big * 0.45, big * 0.75, big * 0.28]], '#e2bf7a') +
    put(w - big * 0.92, foot - big * 0.26, big * 0.95, `<g fill="#231b22">${BULL}</g>`) +
    put(0, foot, big * 1.1, BULLRING) +
    floor(w, h, foot, '#edd39c')
  );
}

// A bullring, about 1 across: two tiers of arches in cream and ochre under a red rim,
// with flags on top.
const BULLRING =
  '<rect x="0" y="-0.24" width="1" height="0.24" rx="0.03" fill="#f1e2c4"/>' +
  [0.07, 0.19, 0.31, 0.69, 0.81, 0.93].map((x) => `<path d="M${u(x - 0.04)} 0V-0.12A0.04 0.04 0 0 1 ${u(x + 0.04)} -0.12V0Z" fill="#c96a45"/>`).join('') +
  '<path d="M0.42 0V-0.15A0.08 0.08 0 0 1 0.58 -0.15V0Z" fill="#a94f35"/>' +
  '<rect x="0.04" y="-0.37" width="0.92" height="0.13" fill="#f6ead3"/>' +
  [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((x) => `<path d="M${u(x - 0.025)} -0.26V-0.32A0.025 0.025 0 0 1 ${u(x + 0.025)} -0.32V-0.26Z" fill="#d98a62"/>`).join('') +
  '<rect x="0.02" y="-0.4" width="0.96" height="0.035" fill="#b85238"/>' +
  [0.2, 0.5, 0.8]
    .map((x) => `<path d="M${x} -0.4V-0.52" stroke="#7a5a48" stroke-width="0.008"/><path d="M${x} -0.52h0.06l-0.02 0.025l0.02 0.025h-0.06z" fill="${x === 0.5 ? '#c8323c' : '#f2b632'}"/>`)
    .join('');

// The black bull of the roadside hills, about 0.62 across, facing left (fill from the
// caller).
const BULL =
  '<path d="M0.12 -0.12C0.12 -0.24 0.2 -0.31 0.3 -0.31C0.38 -0.31 0.44 -0.27 0.5 -0.25C0.57 -0.24 0.61 -0.2 0.61 -0.14C0.61 -0.1 0.59 -0.08 0.56 -0.08H0.14C0.12 -0.08 0.12 -0.1 0.12 -0.12Z"/>' +
  '<path d="M0.17 -0.27C0.11 -0.27 0.05 -0.23 0.02 -0.18C0.01 -0.15 0.03 -0.13 0.06 -0.14C0.1 -0.16 0.14 -0.17 0.18 -0.17Z"/>' +
  '<path d="M0.13 -0.26C0.09 -0.33 0.12 -0.37 0.17 -0.37M0.15 -0.26C0.14 -0.32 0.18 -0.35 0.22 -0.34" fill="none" stroke="#231b22" stroke-width="0.018" stroke-linecap="round"/>' +
  '<path d="M0.18 -0.09L0.17 0M0.25 -0.09L0.26 0M0.48 -0.09L0.47 0M0.55 -0.09L0.56 0" stroke="#231b22" stroke-width="0.035" stroke-linecap="round"/>' +
  '<path d="M0.6 -0.2C0.66 -0.16 0.64 -0.08 0.66 -0.03" fill="none" stroke="#231b22" stroke-width="0.012"/>';

// ---------- 멕시코: El Castillo at Chichén Itzá, agave and prickly pear, the Aztec sun
// stone (the world's dial) in the sky and papel picado

function mexico({ w, h, big, ground, sky }) {
  const foot = h - ground * 0.5;
  return (
    disc(w - sky.x, sky.y, sky.r, '#f5c96a') +
    put(w - sky.x, sky.y, sky.r * 1.05, SUN_STONE) +
    flags(sky, ['#e0457b', '#13a39a', '#f2b632', '#f07a26', '#8b52d6'], true) +
    put(0, foot, big * 1.05, CASTILLO) +
    put(w - big * 0.85, foot, big * 0.85, CACTI) +
    floor(w, h, foot, '#e9c99c') +
    tufts(w, h, foot, '#b9a46a', 29)
  );
}

// The Aztec sun stone, centred on (0, 0) with radius 1: rings, rays and a face.
const SUN_STONE =
  '<circle r="1" fill="#dcb67f"/>' +
  '<circle r="0.84" fill="none" stroke="#b98a4f" stroke-width="0.05"/>' +
  '<circle r="0.56" fill="none" stroke="#b98a4f" stroke-width="0.05"/>' +
  Array.from({ length: 8 }, (_, k) => `<path transform="rotate(${k * 45})" d="M-0.1 -0.58L0 -0.82L0.1 -0.58Z" fill="#b98a4f"/>`).join('') +
  Array.from({ length: 16 }, (_, k) => `<circle transform="rotate(${k * 22.5})" cy="-0.92" r="0.035" fill="#b98a4f"/>`).join('') +
  '<circle r="0.24" fill="#c99a5c"/>' +
  '<circle cx="-0.08" cy="-0.05" r="0.035" fill="#8a6235"/><circle cx="0.08" cy="-0.05" r="0.035" fill="#8a6235"/>' +
  '<path d="M-0.07 0.09H0.07" stroke="#8a6235" stroke-width="0.035" stroke-linecap="round"/>';

// El Castillo, about 1 across: stepped terraces with their right side in shade, a
// stair up the middle and the temple on top.
const CASTILLO =
  Array.from({ length: 7 }, (_, i) => {
    const a = 0.03 + i * 0.05;
    const b = 0.97 - i * 0.05;
    const y = -i * 0.075;
    return (
      `<path d="M${u(a)} ${u(y)}L${u(a + 0.012)} ${u(y - 0.075)}H${u(b - 0.012)}L${u(b)} ${u(y)}Z" fill="${i % 2 ? '#d2bb92' : '#c8b087'}"/>` +
      `<path d="M0.58 ${u(y)}V${u(y - 0.075)}H${u(b - 0.012)}L${u(b)} ${u(y)}Z" fill="#6e5a3e" opacity="0.12"/>`
    );
  }).join('') +
  '<path d="M0.43 0L0.455 -0.525H0.545L0.57 0Z" fill="#e3d2ab"/>' +
  '<path d="M0.43 0L0.455 -0.525M0.57 0L0.545 -0.525" stroke="#a88e62" stroke-width="0.012"/>' +
  '<rect x="0.37" y="-0.66" width="0.26" height="0.135" fill="#c8b087"/>' +
  '<rect x="0.35" y="-0.69" width="0.3" height="0.035" fill="#b39a6c"/>' +
  '<rect x="0.465" y="-0.63" width="0.07" height="0.105" fill="#6e5a3e"/>';

// Agave and prickly pear with its red fruit, about 1 across.
const CACTI =
  [-75, -55, -35, -15, 0, 15, 35, 55, 75]
    .map((a, i) => `<path transform="translate(0.3 0) rotate(${a}) scale(${u(0.9 - Math.abs(a) / 150)})" d="M-0.035 0Q-0.025 -0.3 0 -0.48Q0.025 -0.3 0.035 0Z" fill="${i % 2 ? '#6f9e8a' : '#5d8a77'}"/>`)
    .join('') +
  [[0.72, -0.14, 0.09, 0.13, 0], [0.64, -0.36, 0.08, 0.12, -20], [0.8, -0.38, 0.08, 0.12, 18], [0.72, -0.55, 0.07, 0.1, 5]]
    .map(([x, y, rx, ry, a]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${x} ${y})" fill="#7aa35c"/>`)
    .join('') +
  [[0.6, -0.47], [0.86, -0.49], [0.7, -0.65], [0.76, -0.64]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="0.022" ry="0.03" fill="#e0457b"/>`).join('');

// ---------- 브라질: Sugarloaf Mountain over the bay with Christ the Redeemer behind,
// jungle leaves and a toucan, and vines hanging from the top (the world's gimmick)

function brazil(L) {
  const { w, h, big, ground } = L;
  const bay = h - ground * 0.55;
  return (
    vines(L) +
    put(w - big * 1.1, bay, big * 1.1, SUGARLOAF) +
    water(w, h, bay, ['#8fd3dc', '#4da2b8'], 12) +
    put(0, h, big * 1.05, JUNGLE)
  );
}

// Lianas hanging from the top edge near both sides, with leaves along them.
function vines({ w, sky }) {
  const rand = random(17);
  const leaf = sky.r * 0.32;
  let out = '';
  for (const [x, len] of [[0.05, 1.5], [0.12, 1.1], [0.88, 1.25], [0.95, 1.6]]) {
    const vx = x * w;
    const end = sky.y * len + sky.r * 2;
    const sway = sky.r * 0.6;
    out += `<path d="M${n(vx)} 0C${n(vx + sway)} ${n(end * 0.3)} ${n(vx - sway)} ${n(end * 0.65)} ${n(vx + sway * 0.4)} ${n(end)}" fill="none" stroke="#3d7a3a" stroke-width="${n(Math.max(1.5, sky.r * 0.08))}"/>`;
    for (let t = 0.12, side = 1; t < 1; t += 0.14, side = -side) {
      const ly = end * t;
      const lx = vx + Math.sin(t * 6) * sway * 0.4 + side * leaf;
      out += `<ellipse cx="${n(lx)}" cy="${n(ly)}" rx="${n(leaf)}" ry="${n(leaf * 0.45)}" transform="rotate(${side * 30} ${n(lx)} ${n(ly)})" fill="${rand() < 0.5 ? '#4fa356' : '#6cbf5c'}"/>`;
    }
  }
  return out;
}

// Sugarloaf Mountain and Urca by the bay with the cable car between them, and
// Corcovado behind with Christ the Redeemer on top; about 1 across.
const SUGARLOAF =
  '<path d="M0 0C0.06 -0.3 0.16 -0.62 0.26 -0.66C0.36 -0.62 0.44 -0.3 0.52 0Z" fill="#b5cfbf"/>' +
  '<path d="M0.26 -0.66V-0.74M0.235 -0.71H0.285" stroke="#fbfbf7" stroke-width="0.014" stroke-linecap="round"/>' +
  '<path d="M0.38 0C0.42 -0.3 0.5 -0.56 0.62 -0.58C0.74 -0.56 0.8 -0.3 0.84 0Z" fill="#6f9a7a"/>' +
  '<path d="M0.62 -0.58C0.7 -0.56 0.76 -0.3 0.8 0H0.84C0.8 -0.3 0.74 -0.56 0.62 -0.58Z" fill="#5f8a6a"/>' +
  '<path d="M0.8 0C0.84 -0.16 0.9 -0.24 0.98 -0.25C1.06 -0.24 1.1 -0.14 1.12 0Z" fill="#7fa888"/>' +
  '<path d="M0.98 -0.25L0.62 -0.58" stroke="#5b6b6b" stroke-width="0.005"/>';

// A toucan about 0.6 tall perched on (0, 0), facing left.
const TOUCAN =
  '<ellipse cx="0.05" cy="-0.42" rx="0.2" ry="0.36" fill="#1f1f24"/>' +
  '<path d="M0.15 -0.1L0.3 0.1L0.2 0.12Z" fill="#1f1f24"/>' +
  '<ellipse cx="-0.06" cy="-0.6" rx="0.11" ry="0.15" fill="#fff3c4"/>' +
  '<path d="M-0.08 -0.74C-0.3 -0.8 -0.52 -0.7 -0.6 -0.62C-0.45 -0.62 -0.25 -0.62 -0.08 -0.64Z" fill="#f2a03d"/>' +
  '<path d="M-0.6 -0.62C-0.55 -0.66 -0.5 -0.68 -0.46 -0.69L-0.48 -0.62Z" fill="#e0453b"/>' +
  '<circle cx="-0.03" cy="-0.72" r="0.04" fill="#ffffff"/><circle cx="-0.035" cy="-0.72" r="0.02" fill="#1f1f24"/>';

// Jungle leaves rising from the bottom-left corner (0, 0), with a toucan on a branch;
// about 1 across.
const JUNGLE =
  [[0.05, 0, -20, 0.62, '#2f7a42'], [0.18, 0, 10, 0.5, '#3e8e4a'], [0, -0.08, 35, 0.58, '#5aab5a'], [0.3, 0, 40, 0.38, '#2f7a42'], [-0.05, 0, -50, 0.5, '#3e8e4a'], [0.42, 0, 60, 0.3, '#5aab5a']]
    .map(([x, y, a, s, fill]) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="${LEAF}" fill="${fill}"/><path d="M0 0V-0.95" stroke="#8fd08a" stroke-width="0.02"/></g>`)
    .join('') +
  '<path d="M0.02 -0.42C0.2 -0.44 0.38 -0.4 0.55 -0.34" fill="none" stroke="#6b4a32" stroke-width="0.025" stroke-linecap="round"/>' +
  `<g transform="translate(0.42 -0.38) scale(0.22)">${TOUCAN}</g>`;

// ---------- 영국: Big Ben and the Palace of Westminster, the London Eye, the Thames
// under soft grey clouds

function uk({ w, h, big, ground, sky }) {
  const river = h - ground * 0.55;
  return (
    cloud(sky.x - sky.r * 2.4, sky.y + sky.r * 0.5, sky.r * 4.6, '#ffffff', 0.85) +
    cloud(w - sky.x - sky.r * 2.8, sky.y - sky.r * 0.5, sky.r * 2.6, '#e3e8ef', 0.9) +
    cloud(w - sky.x - sky.r * 1.6, sky.y + sky.r * 0.2, sky.r * 3.6, '#f3f5f8', 0.95) +
    put(w - big * 0.95, river, big * 0.95, EYE) +
    put(0, river, big * 1.2, WESTMINSTER) +
    water(w, h, river, ['#b8c6d6', '#8ea2b8'], 14)
  );
}

// Big Ben with part of the Palace of Westminster, about 0.85 across.
const WESTMINSTER =
  '<rect x="0.18" y="-0.27" width="0.66" height="0.27" fill="#d9c59e"/>' +
  Array.from({ length: 12 }, (_, i) => `<path d="M${u(0.2 + i * 0.055)} -0.27l0.012 -0.05l0.012 0.05z" fill="#cdb78d"/><rect x="${u(0.205 + i * 0.055)}" y="-0.22" width="0.018" height="0.12" fill="#bfa77b"/>`).join('') +
  '<rect x="0.05" y="-0.62" width="0.16" height="0.62" fill="#d9c59e"/>' +
  '<path d="M0.085 -0.02V-0.6M0.13 -0.02V-0.6M0.175 -0.02V-0.6" stroke="#c6b088" stroke-width="0.008"/>' +
  '<rect x="0.035" y="-0.75" width="0.19" height="0.13" fill="#d2bc93"/>' +
  '<circle cx="0.13" cy="-0.685" r="0.055" fill="#f7f3e8" stroke="#b49a6c" stroke-width="0.008"/>' +
  '<path d="M0.13 -0.685V-0.72M0.13 -0.685L0.155 -0.675" stroke="#3f3a33" stroke-width="0.008"/>' +
  '<rect x="0.05" y="-0.8" width="0.16" height="0.05" fill="#cdb78d"/>' +
  '<path d="M0.07 -0.75V-0.79M0.11 -0.75V-0.79M0.15 -0.75V-0.79M0.19 -0.75V-0.79" stroke="#8a7a5c" stroke-width="0.01"/>' +
  '<path d="M0.045 -0.8L0.13 -0.98L0.215 -0.8Z" fill="#5d6b7a"/>' +
  '<path d="M0.13 -0.98V-1.03" stroke="#5d6b7a" stroke-width="0.01"/>';

// The London Eye, about 1 across: the rim with its capsules and spokes on an A-frame.
const EYE = (() => {
  const [cx, cy, r] = [0.5, -0.52, 0.42];
  let spokes = '';
  let pods = '';
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const x = u(cx + Math.cos(a) * r);
    const y = u(cy + Math.sin(a) * r);
    spokes += `M${cx} ${cy}L${x} ${y}`;
    pods += `<ellipse cx="${x}" cy="${y}" rx="0.022" ry="0.016" fill="#eef2f7" stroke="#9eb0c7" stroke-width="0.006"/>`;
  }
  return (
    `<path d="M0.36 0L${cx} ${cy}L0.62 0" fill="none" stroke="#8a9cb4" stroke-width="0.025"/>` +
    `<path d="${spokes}" stroke="#c3cfdd" stroke-width="0.005"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#9eb0c7" stroke-width="0.018"/>` +
    `<circle cx="${cx}" cy="${cy}" r="0.03" fill="#8a9cb4"/>` +
    pods
  );
})();

// ---------- 독일: Neuschwanstein on its crag above the forest, half-timbered houses,
// rolling green hills

function germany({ w, h, band, big, ground, sky }) {
  const foot = h - ground * 0.5;
  const top = band ? band * 0.4 : h * 0.1;
  return (
    cloud(sky.x - sky.r * 2, sky.y + sky.r * 0.4, sky.r * 4) +
    cloud(w - sky.x - sky.r * 1.5, sky.y, sky.r * 3) +
    hills(foot, [[0.2 * w, 0.35 * w, top], [0.65 * w, 0.4 * w, top * 0.8], [w, 0.3 * w, top * 1.1]], '#c9dcb0') +
    put(0, foot, big * 1.1, CASTLE) +
    put(w - big * 0.92, foot, big * 0.92, FACHWERK) +
    floor(w, h, foot, '#b8d49a')
  );
}

// Neuschwanstein on its crag with forest at its foot, about 1 across.
const CASTLE =
  '<path d="M-0.04 0C0.05 -0.15 0.2 -0.34 0.36 -0.4H0.78C0.88 -0.3 0.96 -0.14 1.04 0Z" fill="#a4ad94"/>' +
  [0.02, 0.12, 0.22, 0.8, 0.9, 1].map((x, i) => `<g transform="translate(${x} 0) scale(${u(0.22 + (i % 3) * 0.04)})" fill="#4f7a52">${SPRUCE}</g>`).join('') +
  '<rect x="0.38" y="-0.62" width="0.34" height="0.22" fill="#f3efe7"/>' +
  '<path d="M0.37 -0.62L0.55 -0.76L0.73 -0.62Z" fill="#6f86a6"/>' +
  '<rect x="0.6" y="-0.86" width="0.08" height="0.46" fill="#ece6db"/>' +
  '<path d="M0.59 -0.86L0.64 -0.98L0.69 -0.86Z" fill="#6f86a6"/>' +
  '<rect x="0.34" y="-0.72" width="0.06" height="0.32" fill="#f3efe7"/>' +
  '<path d="M0.33 -0.72L0.37 -0.83L0.41 -0.72Z" fill="#6f86a6"/>' +
  '<rect x="0.72" y="-0.66" width="0.05" height="0.26" fill="#ece6db"/>' +
  '<path d="M0.715 -0.66L0.745 -0.75L0.775 -0.66Z" fill="#6f86a6"/>' +
  [[0.43, -0.56], [0.48, -0.56], [0.53, -0.56], [0.43, -0.48], [0.48, -0.48], [0.53, -0.48], [0.63, -0.76], [0.63, -0.66], [0.355, -0.64]]
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="0.022" height="0.04" rx="0.01" fill="#8d99ab"/>`)
    .join('');

// Half-timbered houses with steep red roofs, about 1 across.
const FACHWERK = [[0.04, 0.42, 0.34, 0.24], [0.5, 0.46, 0.4, 0.28]]
  .map(([x, bw, ht, rh]) => {
    const r = u(x + bw);
    const m = u(x + bw / 2);
    const t = -ht;
    const mid = u(t / 2);
    return (
      `<rect x="${x}" y="${t}" width="${bw}" height="${ht}" fill="#f4ead6"/>` +
      `<path d="M${x} ${t}H${r}M${x} ${mid}H${r}M${x} 0V${t}M${r} 0V${t}M${m} 0V${t}M${x} ${mid}L${m} ${t}M${r} ${mid}L${m} ${t}" stroke="#6b4a36" stroke-width="0.014"/>` +
      `<path d="M${u(x - 0.03)} ${t}L${m} ${u(t - rh)}L${u(r + 0.03)} ${t}Z" fill="#c4583f"/>` +
      `<rect x="${u(x + bw * 0.14)}" y="${u(mid + 0.035)}" width="0.06" height="0.07" fill="#a9c0d3"/>` +
      `<rect x="${u(x + bw * 0.66)}" y="${u(mid + 0.035)}" width="0.06" height="0.07" fill="#a9c0d3"/>` +
      `<rect x="${u(x + bw * 0.42)}" y="-0.11" width="0.065" height="0.11" fill="#7a5640"/>`
    );
  })
  .join('');

// ---------- 튀르키예: fairy chimneys of Cappadocia with the cave rooms of its
// underground cities (the world's tunnels), hot-air balloons at dawn, a mosque

function turkiye(L) {
  const { w, h, big, ground, corner } = L;
  const foot = h - ground * 0.5;
  const colours = ['#e0533f', '#f2b632', '#13a39a', '#8b52d6', '#f07a26'];
  const balloons = scatter(L, 9, Math.max(8, corner * 0.1), 21, h - ground * 2.6)
    .map(({ x, y, s }, i) => put(x, y, s, balloon(colours[i % colours.length])))
    .join('');
  return balloons + put(0, foot, big * 1.05, CHIMNEYS) + put(w - big * 0.95, foot, big * 0.95, MOSQUE) + floor(w, h, foot, '#e9cca6');
}

// A hot-air balloon about 1 across, centred on its envelope.
const balloon = (fill) =>
  `<path d="M0 0.42C-0.25 0.25 -0.52 0 -0.5 -0.3C-0.47 -0.68 0.47 -0.68 0.5 -0.3C0.52 0 0.25 0.25 0 0.42Z" fill="${fill}"/>` +
  '<path d="M0 0.42C-0.12 0.2 -0.2 -0.1 0 -0.6C0.2 -0.1 0.12 0.2 0 0.42Z" fill="#ffffff" opacity="0.35"/>' +
  '<path d="M-0.1 0.38L-0.07 0.58M0.1 0.38L0.07 0.58" stroke="#7a5a48" stroke-width="0.03"/>' +
  '<rect x="-0.08" y="0.56" width="0.16" height="0.1" fill="#8a6a4a"/>';

// Fairy chimneys with a cap of darker rock and the doors and windows of cave rooms,
// about 1 across: [middle, half-width, height].
const CHIMNEYS = [[0.14, 0.12, 0.62], [0.36, 0.1, 0.48], [0.56, 0.13, 0.7], [0.8, 0.11, 0.44]]
  .map(([x, hw, ht]) => {
    const t = -ht;
    return (
      `<path d="M${u(x - hw)} 0C${u(x - hw * 0.6)} ${u(t * 0.5)} ${u(x - hw * 0.5)} ${u(t * 0.9)} ${x} ${u(t)}C${u(x + hw * 0.5)} ${u(t * 0.9)} ${u(x + hw * 0.6)} ${u(t * 0.5)} ${u(x + hw)} 0Z" fill="#e8c69e"/>` +
      `<path d="M${x} ${u(t)}C${u(x + hw * 0.5)} ${u(t * 0.9)} ${u(x + hw * 0.6)} ${u(t * 0.5)} ${u(x + hw)} 0H${u(x + hw * 0.35)}C${u(x + hw * 0.3)} ${u(t * 0.5)} ${u(x + hw * 0.2)} ${u(t * 0.85)} ${x} ${u(t)}Z" fill="#d6ad83"/>` +
      `<ellipse cx="${x}" cy="${u(t + 0.01)}" rx="${u(hw * 0.75)}" ry="${u(hw * 0.4)}" fill="#a87b5a"/>` +
      `<path d="M${u(x - 0.02)} 0V-0.05A0.02 0.02 0 0 1 ${u(x + 0.02)} -0.05V0Z" fill="#7b5640"/>` +
      `<rect x="${u(x - hw * 0.35)}" y="${u(t * 0.55)}" width="0.025" height="0.03" rx="0.01" fill="#7b5640"/>` +
      `<rect x="${u(x + hw * 0.1)}" y="${u(t * 0.35)}" width="0.025" height="0.03" rx="0.01" fill="#7b5640"/>`
    );
  })
  .join('');

// A mosque with a great dome, half-domes and two minarets, about 1 across.
const MOSQUE =
  [0.08, 0.885]
    .map(
      (x) =>
        `<rect x="${x}" y="-0.66" width="0.035" height="0.66" fill="#e6dccb"/>` +
        `<path d="M${u(x - 0.005)} -0.66L${u(x + 0.0175)} -0.78L${u(x + 0.04)} -0.66Z" fill="#8392ab"/>` +
        `<rect x="${u(x - 0.01)}" y="-0.5" width="0.055" height="0.015" fill="#cfc3ae"/>`,
    )
    .join('') +
  '<rect x="0.18" y="-0.22" width="0.64" height="0.22" fill="#e6dccb"/>' +
  '<path d="M0.2 -0.22A0.1 0.08 0 0 1 0.4 -0.22ZM0.6 -0.22A0.1 0.08 0 0 1 0.8 -0.22Z" fill="#97a4ba"/>' +
  '<rect x="0.34" y="-0.28" width="0.32" height="0.06" fill="#ddd1bc"/>' +
  '<path d="M0.33 -0.28A0.17 0.15 0 0 1 0.67 -0.28Z" fill="#8392ab"/>' +
  '<path d="M0.5 -0.43V-0.49" stroke="#e2b04a" stroke-width="0.012"/>' +
  [0.25, 0.32, 0.4, 0.6, 0.68, 0.75].map((x) => `<path d="M${u(x - 0.015)} -0.04V-0.12A0.015 0.015 0 0 1 ${u(x + 0.015)} -0.12V-0.04Z" fill="#a99a82"/>`).join('');

// ---------- 인도: the Taj Mahal over its long pool, an elephant under a palm, kites
// flying, and a chaturanga board along the bottom (the world's game)

function india({ w, h, big, ground, sky }) {
  const pool = h - ground * 0.62;
  return (
    put(sky.x, sky.y, sky.r * 1.5, kite('#e0457b', '#f6a8c4')) +
    put(sky.x + sky.r * 2.6, sky.y + sky.r * 1.2, sky.r * 0.9, kite('#f2b632', '#fbe08a')) +
    put(w - sky.x, sky.y * 0.85, sky.r * 1.3, kite('#13a39a', '#8fdccf')) +
    put(0, pool, big * 1.08, TAJ) +
    put(w - big * 0.9, pool, big * 0.9, ELEPHANT) +
    water(w, h, pool, ['#d2e5ef', '#a3c7d9'], 16) +
    chequer(w, h, Math.max(6, ground * 0.22))
  );
}

// A kite about 1 tall, centred on (0, 0) and tilted, with a tail of little bows.
const kite = (fill, light) =>
  '<g transform="rotate(18)">' +
  `<path d="M0 -0.55L0.38 0L0 0.55L-0.38 0Z" fill="${fill}"/>` +
  `<path d="M0 -0.55L0.38 0L0 0Z" fill="${light}"/>` +
  '<path d="M0 -0.55V0.55M-0.38 0H0.38" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.02"/>' +
  '<path d="M0 0.55C0.1 0.75 -0.1 0.9 0 1.1" fill="none" stroke="#8a6a55" stroke-width="0.015"/>' +
  `<path d="M-0.06 0.78L0.06 0.72L0.06 0.84ZM-0.05 0.98L0.07 0.94L0.06 1.04Z" fill="${fill}"/>` +
  '</g>';

// A strip of light and dark squares along the bottom edge, like a chaturanga board.
function chequer(w, h, size) {
  let d = '';
  for (let x = 0, i = 0; x < w; x += size, i++) if (i % 2) d += `M${n(x)} ${n(h - size)}h${n(size)}v${n(size)}h${n(-size)}Z`;
  return `<rect y="${n(h - size)}" width="${w}" height="${n(size)}" fill="#f1e6d4"/><path d="${d}" fill="#cdb48c"/>`;
}

// The Taj Mahal, about 1 across: the great dome and two little ones, the arched front
// and the minarets.
const TAJ =
  '<g stroke="#d3c3a6" stroke-width="0.008">' +
  '<rect x="0" y="-0.06" width="1" height="0.06" fill="#e2d6c0"/>' +
  [0.05, 0.95]
    .map((x) => `<rect x="${u(x - 0.02)}" y="-0.56" width="0.04" height="0.5" fill="#f3ede2"/><path d="M${u(x - 0.03)} -0.56Q${x} -0.63 ${u(x + 0.03)} -0.56Z" fill="#ebe2d2"/>`)
    .join('') +
  '<rect x="0.2" y="-0.42" width="0.6" height="0.36" fill="#f4eee4"/>' +
  '<rect x="0.62" y="-0.42" width="0.18" height="0.36" fill="#e9e0d1" stroke="none"/>' +
  '<path d="M0.42 -0.06V-0.28Q0.42 -0.35 0.5 -0.39Q0.58 -0.35 0.58 -0.28V-0.06Z" fill="#d5c6ad"/>' +
  [0.27, 0.33, 0.67, 0.73]
    .map((x) => `<path d="M${u(x - 0.022)} -0.08V-0.17Q${x} -0.21 ${u(x + 0.022)} -0.17V-0.08Z" fill="#dccfb9"/><path d="M${u(x - 0.022)} -0.22V-0.3Q${x} -0.34 ${u(x + 0.022)} -0.3V-0.22Z" fill="#dccfb9"/>`)
    .join('') +
  '<rect x="0.38" y="-0.47" width="0.24" height="0.05" fill="#efe8dc"/>' +
  '<path d="M0.36 -0.47C0.3 -0.58 0.38 -0.72 0.5 -0.78C0.62 -0.72 0.7 -0.58 0.64 -0.47Z" fill="#f7f2ea"/>' +
  '<path d="M0.5 -0.78C0.62 -0.72 0.7 -0.58 0.64 -0.47H0.56C0.6 -0.58 0.56 -0.7 0.5 -0.78Z" fill="#e6dccb" stroke="none"/>' +
  [0.27, 0.73].map((x) => `<rect x="${u(x - 0.035)}" y="-0.5" width="0.07" height="0.08" fill="#efe8dc"/><path d="M${u(x - 0.045)} -0.5Q${x} -0.6 ${u(x + 0.045)} -0.5Z" fill="#f7f2ea"/>`).join('') +
  '</g>' +
  '<path d="M0.05 -0.63V-0.66M0.95 -0.63V-0.66M0.5 -0.78V-0.86" stroke="#c9b48c" stroke-width="0.012"/>';

// An elephant in a red saddle cloth under a palm, about 1 across, facing left.
const ELEPHANT =
  `<g transform="translate(0.78 0) scale(0.85)">${PALM}</g>` +
  '<g fill="#9d93a6">' +
  '<ellipse cx="0.42" cy="-0.24" rx="0.2" ry="0.14"/>' +
  '<circle cx="0.22" cy="-0.28" r="0.1"/>' +
  '<path d="M0.15 -0.26C0.1 -0.2 0.11 -0.1 0.13 -0.04L0.16 -0.04C0.15 -0.1 0.15 -0.18 0.2 -0.22Z"/>' +
  [0.27, 0.36, 0.48, 0.55].map((x) => `<rect x="${x}" y="-0.16" width="0.06" height="0.16" rx="0.02"/>`).join('') +
  '</g>' +
  '<ellipse cx="0.26" cy="-0.28" rx="0.05" ry="0.07" fill="#8b8194"/>' +
  '<path d="M0.36 -0.37H0.52L0.54 -0.24H0.34Z" fill="#d9443b"/>' +
  '<path d="M0.34 -0.24H0.54" stroke="#e2b04a" stroke-width="0.012"/>' +
  '<circle cx="0.19" cy="-0.3" r="0.01" fill="#3a3340"/>' +
  '<path d="M0.62 -0.27Q0.66 -0.2 0.64 -0.14" fill="none" stroke="#9d93a6" stroke-width="0.012"/>';

// ---------- 일본: Mount Fuji, a red torii standing in the water, a cherry tree in
// bloom, and petals drifting

function japan(L) {
  const { w, h, band, big, ground, sky, corner } = L;
  const lake = h - ground * 0.6;
  const petals = scatter(L, 22, Math.max(3, corner * 0.02), 31, lake)
    .map(({ x, y, s }, i) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(s)}" ry="${n(s * 0.6)}" transform="rotate(${(i * 47) % 180} ${n(x)} ${n(y)})" fill="#f4b6c6" opacity="0.85"/>`)
    .join('');
  return (
    disc(w - sky.x, sky.y, sky.r, '#ef7d7d') +
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
  `<g fill="#d24a3a">${TORII_SHAPE}</g>` +
  '<path d="M0 -0.72Q0.4 -0.65 0.8 -0.72L0.81 -0.75Q0.4 -0.68 -0.01 -0.75Z" fill="#2b2b30"/>' +
  `<g fill="#d24a3a" opacity="0.22" transform="scale(1 -0.6)">${TORII_SHAPE}</g>`;

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
    '<path d="M0.03 0H0.43M0.13 -0.035V0.035M0.23 -0.035V0.035M0.33 -0.035V0.035" stroke="#8a6b52" stroke-width="0.01"/>';
  return (
    '<path d="M0.12 0L0.2 -0.56H0.4L0.48 0Z" fill="#5f7466"/>' +
    '<rect x="0.06" y="-0.27" width="0.48" height="0.03" fill="#3f4f46"/>' +
    '<path d="M0.26 0V-0.1A0.04 0.04 0 0 1 0.34 -0.1V0Z" fill="#3f4f46"/>' +
    '<rect x="0.28" y="-0.42" width="0.04" height="0.05" fill="#f3ecdc"/>' +
    '<path d="M0.17 -0.56Q0.3 -0.7 0.43 -0.56Z" fill="#3f4f46"/>' +
    `<g transform="translate(0.3 -0.6) rotate(${45 + turn})">${[0, 90, 180, 270].map((a) => `<g transform="rotate(${a})">${sail}</g>`).join('')}</g>` +
    '<circle cx="0.3" cy="-0.6" r="0.025" fill="#3f4f46"/>'
  );
}

// A canal along y = top, then rows of tulips in bands of colour down to the bottom
// edge, each row deeper than the one behind it.
function tulips(w, h, top) {
  const canal = Math.max(4, (h - top) * 0.12);
  const rows = ['#e4574f', '#f2c94c', '#ef8fb0', '#f08a3c', '#ffffff', '#b07cc6'];
  const weight = (i) => 1 + i * 0.35;
  const total = rows.reduce((sum, _, i) => sum + weight(i), 0);
  let y = top + canal;
  let out = `<rect y="${n(top)}" width="${w}" height="${n(canal)}" fill="#9cc9e2"/>`;
  rows.forEach((fill, i) => {
    const hh = ((h - top - canal) * weight(i)) / total;
    out += `<rect y="${n(y)}" width="${w}" height="${n(hh)}" fill="#7fae5f"/><rect y="${n(y + hh * 0.25)}" width="${w}" height="${n(hh * 0.75)}" fill="${fill}"/>`;
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
    `<rect y="${n(river)}" width="${w}" height="${n(h - river)}" fill="#1b1533"/>` +
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
  mirror: france, canal: italy, eagle: russia, encierro: spain, dial: mexico, vine: brazil, lantern: thailand,
  bell: uk, belt: germany, tunnel: turkiye, diagonal: india, shoji: japan, windmill: netherlands,
};
