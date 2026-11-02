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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${SHADE}${draw(layout(w, h))}</svg>`;
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
    // A landmark in a bottom corner: on a portrait screen no taller than the room under
    // the cube's lower edges allows.
    big: tall ? Math.min(corner * 0.85, w * 0.45, band * 0.62) : Math.min(corner * 0.85, w * 0.45),
    // The strip along the bottom edge; on a portrait screen deep enough that the ground
    // clears a phone's home indicator.
    ground: tall ? Math.max(0.06 * h, 0.75 * band) : Math.max(0.06 * h, 0.3 * band),
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

// Pointed mountains on `base`, each [middle, half-width, height], with snow on top and
// their right flanks in shade; later ones stand in front of earlier ones.
function mountains(base, list, fill, snow) {
  const [dark, cold] = [mix(fill, '#1e2638', 0.22), mix(snow, '#8fa3bf', 0.3)];
  const k = 0.3;
  return list.map(([x, hw, ht]) => {
    const t = base - ht;
    return `<path d="M${n(x - hw)} ${n(base)}L${n(x)} ${n(t)}L${n(x + hw)} ${n(base)}Z" fill="${fill}"/>` +
      `<path d="M${n(x)} ${n(t)}L${n(x + hw)} ${n(base)}H${n(x + hw * 0.08)}Z" fill="${dark}"/>` +
      `<path d="M${n(x)} ${n(t)}L${n(x - hw * k)} ${n(t + ht * k)}L${n(x - hw * k * 0.4)} ${n(t + ht * k * 0.8)}` +
      `L${n(x)} ${n(t + ht * k * 1.05)}L${n(x + hw * k * 0.45)} ${n(t + ht * k * 0.8)}L${n(x + hw * k)} ${n(t + ht * k)}Z" fill="${snow}"/>` +
      `<path d="M${n(x)} ${n(t)}L${n(x + hw * k)} ${n(t + ht * k)}L${n(x + hw * k * 0.45)} ${n(t + ht * k * 0.8)}L${n(x + hw * 0.02)} ${n(t + ht * k * 1.03)}Z" fill="${cold}"/>`;
  }).join('');
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
    `<g fill="#3d2a45" opacity="0.1"><ellipse cx="${n(big * 0.02 + big * 1.05 * 0.31)}" cy="${n(floor + deep * 0.3)}" rx="${n(big * 1.05 * 0.36)}" ry="${n(big * 0.035)}"/>` +
    `<ellipse cx="${n(w - big * 0.95 + big * 0.95 * 0.5)}" cy="${n(floor + deep * 0.4)}" rx="${n(big * 0.95 * 0.45)}" ry="${n(big * 0.03)}"/></g>` +
    put(big * 0.02, floor + deep * 0.3, big * 1.05, BOOKSHELF) +
    put(w - big * 0.95, floor + deep * 0.4, big * 0.95, PLANT_CAT)
  );
}

// A window with the sky and a cloud in it, the frame's shadow along the top and left of
// the glass, curtains in soft folds tied back, and a sill; about 2.9 across, centred on
// (0, 0).
const WINDOW =
  '<rect x="-1.1" y="-1" width="2.2" height="1.9" fill="#ffffff"/>' +
  '<rect x="-0.98" y="-0.88" width="1.96" height="1.66" fill="#fde3da"/>' +
  '<path d="M-0.98 -0.88H0.98V-0.8H-0.9V0.78H-0.98Z" fill="#f3cdc2"/>' +
  `<g transform="translate(-0.55 0.25) scale(0.85)" fill="#ffffff">${CLOUD}</g>` +
  '<path d="M0 -0.88V0.78M-0.98 -0.05H0.98" stroke="#ffffff" stroke-width="0.08"/>' +
  '<rect x="-1.25" y="0.88" width="2.5" height="0.15" rx="0.04" fill="#e9dccb"/><rect x="-1.25" y="0.98" width="2.5" height="0.05" fill="#d8c7b2"/>' +
  '<path d="M-1.35 -1.15H-0.7C-0.75 -0.6 -0.9 0.1 -1 0.3C-0.92 0.5 -0.85 0.8 -0.8 1H-1.35Z" fill="#dcc6e4"/>' +
  '<path d="M1.35 -1.15H0.7C0.75 -0.6 0.9 0.1 1 0.3C0.92 0.5 0.85 0.8 0.8 1H1.35Z" fill="#dcc6e4"/>' +
  '<path d="M-1.15 -1.12C-1.13 -0.6 -1.15 -0.1 -1.18 0.3M-0.92 -1.12C-0.94 -0.6 -1.02 -0.1 -1.08 0.28M1.15 -1.12C1.13 -0.6 1.15 -0.1 1.18 0.3M0.92 -1.12C0.94 -0.6 1.02 -0.1 1.08 0.28" fill="none" stroke="#cbb2d3" stroke-width="0.035" stroke-linecap="round"/>' +
  '<path d="M-1.35 0.3H-0.98M1.35 0.3H0.98" stroke="#c8adcf" stroke-width="0.08"/>' +
  '<rect x="-1.5" y="-1.24" width="3" height="0.09" rx="0.045" fill="#b98a64"/>';

// A lamp shade in the home world's colour with its bulb glowing under it, lit down its
// left side and banded at the rim, about 1.6 across, its middle at (0, 0).
const LAMP =
  '<circle cy="0.45" r="1.6" fill="url(#sc-lamp)"/>' +
  '<path d="M-0.35 -0.45H0.35L0.8 0.3H-0.8Z" fill="#e2786a"/>' +
  '<path d="M-0.35 -0.45H-0.2L-0.5 0.3H-0.8Z" fill="#ea9488"/>' +
  '<rect x="-0.08" y="-0.56" width="0.16" height="0.12" rx="0.03" fill="#c9645a"/>' +
  '<path d="M-0.8 0.3H0.8" stroke="#c9645a" stroke-width="0.08"/>' +
  '<ellipse cy="0.36" rx="0.22" ry="0.16" fill="#fff4c9"/>';

// A bookshelf 0.62 across and about 1 tall: books in the game's link colours with bands
// on some spines, a shadow under each shelf and down the right side, a little plant, a
// photo and a vase on top.
const BOOKSHELF = (() => {
  const rand = random(5);
  const colours = ['#e2786a', '#e09f1f', '#d6336c', '#0f9d9a', '#9b59b6', '#6b8e23', '#3a8fd6', '#e8590c'];
  let books = '';
  let count = 0;
  // [shelf top, from, to]
  for (const [y, from, to] of [[-0.03, 0.04, 0.58], [-0.33, 0.04, 0.4], [-0.63, 0.2, 0.58]]) {
    for (let x = from; x < to - 0.04; ) {
      const bw = 0.035 + rand() * 0.025;
      const bh = 0.17 + rand() * 0.08;
      books += `<rect x="${u(x)}" y="${u(y - bh)}" width="${u(bw)}" height="${u(bh)}" fill="${colours[Math.floor(rand() * colours.length)]}"/>`;
      if (count++ % 3 === 1) books += `<rect x="${u(x)}" y="${u(y - bh * 0.78)}" width="${u(bw)}" height="0.014" fill="#ffffff" opacity="0.55"/>`;
      x += bw + 0.006;
    }
  }
  return (
    '<rect x="0" y="-0.98" width="0.62" height="0.98" fill="#b98a64"/>' +
    '<rect x="0.03" y="-0.95" width="0.56" height="0.92" fill="#dcc4a4"/>' +
    '<rect x="0.03" y="-0.95" width="0.56" height="0.025" fill="#c9ad8a"/><rect x="0.03" y="-0.3" width="0.56" height="0.02" fill="#c9ad8a"/><rect x="0.03" y="-0.6" width="0.56" height="0.02" fill="#c9ad8a"/>' +
    '<rect x="0.03" y="-0.33" width="0.56" height="0.03" fill="#b98a64"/>' +
    '<rect x="0.03" y="-0.63" width="0.56" height="0.03" fill="#b98a64"/>' +
    '<rect x="0.59" y="-0.98" width="0.03" height="0.98" fill="#a37553"/>' +
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

// The soft shade at the foot of every wall (iso's box). Walls are drawn in their own
// planes with y up, so offset 0 is the foot.
const SHADE = '<defs><linearGradient id="sc-foot" x2="0" y2="1"><stop offset="0" stop-color="#3d2a45" stop-opacity="0.16"/><stop offset="0.65" stop-color="#3d2a45" stop-opacity="0"/></linearGradient></defs>';

// An isometric drawing: (x, y, z) lands at (cx + (x − y)·0.866k, cy + (x + y)·k/2 − z·k),
// so x runs down-right, y down-left and z up. The light comes from the front left: a
// block's walls darken a little toward their foot and the front edges of its top shine.
function iso(cx, cy, k) {
  const pt = (x, y, z) => [cx + (x - y) * 0.866 * k, cy + (x + y) * 0.5 * k - z * k];
  const q = (x, y, z) => pt(x, y, z).map(n).join(' ');
  const face = (pts, fill) => `<path d="M${pts.map((p) => q(...p)).join('L')}Z" fill="${fill}"/>`;
  // drawing in the plane y = c (local x along x, local y up) or x = c (local x along y)
  const onLeft = (c, body) => `<g transform="matrix(${u(0.866 * k)} ${u(0.5 * k)} 0 ${u(-k)} ${n(cx - 0.866 * c * k)} ${n(cy + 0.5 * c * k)})">${body}</g>`;
  const onRight = (c, body) => `<g transform="matrix(${u(-0.866 * k)} ${u(0.5 * k)} 0 ${u(-k)} ${n(cx + 0.866 * c * k)} ${n(cy + 0.5 * c * k)})">${body}</g>`;
  // a lit edge through the given points, paler than `colour`
  const rim = (pts, colour) =>
    `<path d="M${pts.map((p) => q(...p)).join('L')}" fill="none" stroke="${mix(colour, '#ffffff', 0.6)}" stroke-width="${n(Math.max(0.6, k * 0.07))}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // the shade at a wall's foot, over a..b of its plane from z0 up to z1
  const foot = (a, b, z0, z1) => `<rect x="${u(a)}" y="${u(z0)}" width="${u(b - a)}" height="${u(z1 - z0)}" fill="url(#sc-foot)"/>`;
  // a block from corner a to corner b, faces [top, left, right]
  const box = ([x0, y0, z0], [x1, y1, z1], [t, l, r]) =>
    face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], t) +
    face([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], l) +
    face([[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]], r) +
    (z1 - z0 >= 0.5 ? onLeft(y1, foot(x0, x1, z0, z1)) + onRight(x1, foot(y0, y1, z0, z1)) : '') +
    rim([[x0, y1, z1], [x1, y1, z1], [x1, y0, z1]], t);
  return {
    k,
    pt,
    onLeft,
    onRight,
    box,
    // a pyramid over x0..x1 × y0..y1 from z0, ht tall, faces [left, right]
    pyramid([x0, y0, z0], [x1, y1], ht, [l, r]) {
      const a = [(x0 + x1) / 2, (y0 + y1) / 2, z0 + ht];
      return face([[x0, y1, z0], [x1, y1, z0], a], l) + face([[x1, y0, z0], [x1, y1, z0], a], r) + rim([a, [x1, y1, z0]], l);
    },
    // a roof over x0..x1 × y0..y1 from z0, its ridge along x, ht tall, `inset` short of
    // each end (0 for a gable): faces [slope, end]
    roof([x0, y0, z0], [x1, y1], ht, inset, [s, e]) {
      const ym = (y0 + y1) / 2;
      return face([[x0 + inset, ym, z0 + ht], [x1 - inset, ym, z0 + ht], [x1, y1, z0], [x0, y1, z0]], s) +
        face([[x1, y0, z0], [x1 - inset, ym, z0 + ht], [x1, y1, z0]], e) + rim([[x0 + inset, ym, z0 + ht], [x1 - inset, ym, z0 + ht]], s);
    },
    // the shadow under an overhang at height z on the two walls of x0..x1 × y0..y1, d deep
    under: ([x0, y0], [x1, y1], z, d) =>
      `<g fill="#3d2a45" fill-opacity="0.16">${onLeft(y1, `<rect x="${u(x0)}" y="${u(z - d)}" width="${u(x1 - x0)}" height="${u(d)}"/>`)}` +
      `${onRight(x1, `<rect x="${u(y0)}" y="${u(z - d)}" width="${u(y1 - y0)}" height="${u(d)}"/>`)}</g>`,
    // an eave: a slab whose left and right corners curl up, as in China and Korea, the
    // curls `size` units tall
    eave(a, b, tones, size = 0.9) {
      const th = (b[2] - a[2]) * k;
      const lit = mix(tones[0], '#ffffff', 0.6);
      return box(a, b, tones) +
        horn(...pt(a[0], b[1], b[2]), th, k * size, -1, [0.866, 0.5], tones[1], lit) + horn(...pt(b[0], a[1], b[2]), th, k * size, 1, [-0.866, 0.5], tones[2], lit);
    },
    // rows of tiles down the front slope of a roof (as roof), one every `step`
    tiles([x0, y0, z0], [x1, y1], ht, inset, colour, step = 0.45) {
      const ym = (y0 + y1) / 2;
      let d = '';
      for (let x = x0 + step; x < x1 - step / 2; x += step) {
        const t = inset ? Math.min(1, (x - x0) / inset, (x1 - x) / inset) : 1;
        d += `M${q(x, y1, z0)}L${q(x, y1 - (y1 - ym) * t, z0 + ht * t)}`;
      }
      return `<path d="${d}" stroke="${colour}" stroke-width="${n(Math.max(0.5, k * 0.05))}"/>`;
    },
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

// The end of an eave or a ridge curling up: its top corner at (x, y), th thick below it,
// its top edge running back along the unit vector `back`; it rises s, out to the left
// (dir −1) or the right (1). Its root covers the end it grows from in the same colour,
// and its top edge is lit in `lit`.
const horn = (x, y, th, s, dir, [bx, by], fill, lit) => {
  const [ax, ay] = [x + bx * s, y + by * s];
  const top = `M${n(ax)} ${n(ay)}Q${n(x + dir * s * 0.04)} ${n(y + s * 0.02)} ${n(x + dir * s * 0.3)} ${n(y - s * 0.55)}`;
  return `<path d="${top}Q${n(x + dir * s * 0.22)} ${n(y + th * 0.7)} ${n(x)} ${n(y + th)}L${n(ax)} ${n(ay + th)}Z" fill="${fill}"/>` +
    (lit ? `<path d="${top}" fill="none" stroke="${lit}" stroke-width="${n(Math.max(0.6, s * 0.08))}" stroke-linecap="round"/>` : '');
};

// A finial standing on (x, y), ht tall and s to the unit: a rod with three rings and a
// pearl on top, in gold unless told [rod, rings, pearl].
const finial = (x, y, ht, s, [rod, ring, pearl] = ['#d6a84e', '#e9c46a', '#f3d78e']) =>
  `<path d="M${n(x)} ${n(y)}V${n(y - ht)}" stroke="${rod}" stroke-width="${n(Math.max(1, s * 0.12))}"/>` +
  [0.28, 0.46, 0.64].map((t) => `<ellipse cx="${n(x)}" cy="${n(y - ht * t)}" rx="${n(s * 0.24)}" ry="${n(s * 0.09)}" fill="${ring}"/>`).join('') +
  `<circle cx="${n(x)}" cy="${n(y - ht)}" r="${n(Math.max(1, s * 0.15))}" fill="${pearl}"/>`;

// A gold spike with a crescent on top, standing on (x, y), s to the unit, for the domes
// and minarets of India and Türkiye.
const crescent = (x, y, s) =>
  `<path d="M${n(x)} ${n(y)}V${n(y - s * 0.75)}" stroke="#d9b36a" stroke-width="${n(Math.max(1, s * 0.08))}"/>` +
  `<path d="M${n(x - s * 0.13)} ${n(y - s * 0.9)}A${n(s * 0.13)} ${n(s * 0.13)} 0 0 0 ${n(x + s * 0.13)} ${n(y - s * 0.9)}" fill="none" stroke="#d9b36a" stroke-width="${n(Math.max(1, s * 0.06))}"/>`;

// An arch in screen space standing on (x, y): w wide, rising h before its round head.
const archAt = (x, y, w, h, fill) => `<path d="M${n(x)} ${n(y)}V${n(y - h)}A${n(w / 2)} ${n(w / 2)} 0 0 1 ${n(x + w)} ${n(y - h)}V${n(y)}Z" fill="${fill}"/>`;

// An arched opening drawn in a wall's own plane (iso's onLeft / onRight): w wide from x,
// rising h from z to where its round head starts; dark, with a pale frame along its
// sides and head.
const arch = (x, z, w, h, dark, frame) => {
  const d = `M${u(x)} ${u(z)}V${u(z + h)}A${u(w / 2)} ${u(w / 2)} 0 0 0 ${u(x + w)} ${u(z + h)}V${u(z)}`;
  return `<path d="${d}Z" fill="${dark}"/>` + (frame ? `<path d="${d}" fill="none" stroke="${frame}" stroke-width="${u(w * 0.12)}"/>` : '');
};
// The same with a pointed head (Mughal, Gothic), its point 0.75 w above where it starts.
const pointed = (x, z, w, h, dark, frame) => {
  const [s, p] = [z + h, z + h + w * 0.75];
  const d = `M${u(x)} ${u(z)}V${u(s)}C${u(x)} ${u(s + w * 0.42)} ${u(x + w * 0.32)} ${u(p - w * 0.15)} ${u(x + w / 2)} ${u(p)}` +
    `C${u(x + w * 0.68)} ${u(p - w * 0.15)} ${u(x + w)} ${u(s + w * 0.42)} ${u(x + w)} ${u(s)}V${u(z)}`;
  return `<path d="${d}Z" fill="${dark}"/>` + (frame ? `<path d="${d}" fill="none" stroke="${frame}" stroke-width="${u(w * 0.1)}"/>` : '');
};

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
    pill(w * 0.5 - sky.r * 1.3, sky.y + sky.r * 1.2, sky.r * 2.6, 0.6) +
    birds(right ? sky.x * 1.5 : w - sky.x * 1.5, sky.y + sky.r * 2.6, sky.r * 1.4, bird);
}

// Two rows of low round hills on `base`, the far row paler; `top` is the tallest.
const rolling = (w, base, top, [far, near]) =>
  hills(base, [[0.12 * w, 0.32 * w, top * 0.55], [0.5 * w, 0.36 * w, top * 0.38], [0.92 * w, 0.3 * w, top * 0.6]], far) +
  hills(base, [[0.32 * w, 0.4 * w, top * 0.3], [0.78 * w, 0.34 * w, top * 0.26]], near);

// Where a picture's ground starts, and how tall its hills may be.
const groundLine = ({ h, band, ground: g }, k = 0.8) => ({ base: h - g * 0.4, top: band ? band * k * 0.62 : h * k * 0.2 });

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
const rays = (x, y, r, fill) => Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<path d="M${n(x + Math.cos(a - 0.08) * r * 1.3)} ${n(y + Math.sin(a - 0.08) * r * 1.3)}L${n(x + Math.cos(a) * r * 1.9)} ${n(y + Math.sin(a) * r * 1.9)}L${n(x + Math.cos(a + 0.08) * r * 1.3)} ${n(y + Math.sin(a + 0.08) * r * 1.3)}Z" fill="${fill}" opacity="0.5"/>`; }).join('');
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
const garlands = (w, sky) => [[0, 0.48, sky.y * 0.95], [0.52, 1, sky.y * 0.82]].map(([a, b, y]) => {
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
  const pg = isoFit(4, base, big * 0.68, [-5.8, 5.8], 10.6);
  const body = tone('#e98f80');
  const tiles = tone('#5f8f7a');
  const stone = tone('#e7ddd6');
  const [dark, pale] = ['#8f5b63', '#f8d8cb'];
  // a framed door on the ground floor and a small round-headed window on each floor
  // above, low enough to clear the eave in front of it
  const opening = (a, b, z, door) => (door ? arch((a + b) / 2 - 0.36, z, 0.72, 0.4, dark, pale) : arch((a + b) / 2 - 0.24, z + 0.2, 0.48, 0.22, dark));
  let pagoda = pg.box([-0.3, -0.3, 0], [5.3, 5.3, 0.3], stone) + pg.box([0, 0, 0.3], [5, 5, 0.6], stone);
  let z = 0.6;
  for (let i = 0; i < 4; i++) {
    const s = i * 0.36;
    const [a, b] = [0.9 + s, 4.1 - s];
    pagoda += pg.box([a, a, z], [b, b, z + 1.45], body) + pg.onLeft(b, opening(a, b, z, !i)) + pg.onRight(b, opening(a, b, z, !i)) +
      pg.under([a, a], [b, b], z + 1.45, 0.3) + pg.eave([0.1 + s, 0.1 + s, z + 1.45], [4.9 - s, 4.9 - s, z + 1.8], tiles);
    z += 1.8;
  }
  pagoda += pg.pyramid([1.9, 1.9, z], [3.1, 3.1], 1.6, [tiles[1], tiles[2]]) + finial(...pg.pt(2.5, 2.5, z + 1.6), pg.k * 1.1, pg.k);
  // the hall: a round moon gate between lattice windows, a round window round the side,
  // a painted band with gold under the eaves, and a roof curling up at its corners
  const gt = isoFit(w - 4 - big * 0.78, base, big * 0.78, [-5.6, 9.6], 14.8);
  const lattice = (x) => `<rect x="${x}" y="1.2" width="1.2" height="1" fill="${dark}"/><path d="M${x + 0.4} 1.2V2.2M${x + 0.8} 1.2V2.2M${x} 1.7H${x + 1.2}" stroke="${pale}" stroke-width="0.08"/>`;
  const band = (a, b) => `<rect x="${a}" y="3.4" width="${b - a}" height="0.4" fill="${tiles[1]}"/>` +
    Array.from({ length: Math.floor((b - a) / 0.7) }, (_, i) => `<rect x="${u(a + 0.25 + i * 0.7)}" y="3.52" width="0.2" height="0.16" fill="#e9c46a"/>`).join('');
  const [p1, p2] = [gt.pt(2.3, 2.5, 6.1), gt.pt(6.7, 2.5, 6.1)];
  const cap = gt.k * 0.24;
  const lit = mix(tiles[0], '#ffffff', 0.6);
  const ridge = `<path d="M${n(p1[0])} ${n(p1[1])}L${n(p2[0])} ${n(p2[1])}" stroke="${tiles[2]}" stroke-width="${n(cap)}" stroke-linecap="round"/>` +
    horn(...gt.pt(0.2, 4.8, 4.2), 0, gt.k * 1.1, -1, [0.866, 0.5], tiles[1], lit) + horn(...gt.pt(8.8, 0.2, 4.2), 0, gt.k * 1.1, 1, [-0.866, 0.5], tiles[2], lit) +
    horn(p1[0], p1[1] - cap / 2, cap, gt.k * 0.8, -1, [0.866, 0.5], tiles[2]) + horn(p2[0], p2[1] - cap / 2, cap, gt.k * 0.8, 1, [-0.866, -0.5], tiles[2]);
  const gate = gt.box([0, 0, 0], [9, 5, 0.45], stone) + gt.box([0.4, 0.4, 0.45], [8.6, 4.6, 3], tone('#e08c7f')) +
    gt.onLeft(4.6, `<circle cx="4.5" cy="1.6" r="0.95" fill="${dark}" stroke="${pale}" stroke-width="0.14"/>` + lattice(1.4) + lattice(6.4)) +
    gt.onRight(8.6, `<circle cx="2.5" cy="1.75" r="0.5" fill="${dark}" stroke="${pale}" stroke-width="0.1"/>`) +
    gt.box([1, 1, 3], [8, 4, 4.2], body) + gt.onLeft(4, band(1, 8)) + gt.onRight(8, band(1, 4)) + gt.under([1, 1], [8, 4], 4.2, 0.3) +
    gt.roof([0.2, 0.2, 4.2], [8.8, 4.8], 1.9, 2.1, [tiles[1], tiles[2]]) + ridge;
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
  const slate = ['#5d5872', '#4a465e'];
  const p = isoFit(4, base, big, [-7, 11], 18);
  // the hall: stone terraces and steps, lattice doors between red posts, a painted band
  // under the eaves, and a tiled roof with white ridges whose corners curl up
  const doors = (a, b) => Array.from({ length: Math.round((b - a) / 1.15) }, (_, i) => {
    const x = a + ((b - a) - Math.round((b - a) / 1.15) * 1.15) / 2 + 0.1 + i * 1.15;
    return `<rect x="${u(x)}" y="2.6" width="0.95" height="2.3" fill="#f4ead6"/>` +
      `<path d="M${u(x + 0.32)} 2.6V4.9M${u(x + 0.63)} 2.6V4.9M${u(x)} 3.37H${u(x + 0.95)}M${u(x)} 4.13H${u(x + 0.95)}" stroke="#c9b79a" stroke-width="0.05"/>`;
  }).join('');
  const paint = (a, b) => Array.from({ length: Math.floor((b - a) / 0.5) }, (_, i) => `<rect x="${u(a + 0.12 + i * 0.5)}" y="5.42" width="0.26" height="0.26" fill="${['#e98a86', '#f4ead6', '#e9c46a'][i % 3]}"/>`).join('');
  const steps = [[8.05, 0, 0.43], [7.7, 0.43, 0.87], [7.35, 0.87, 1.3]].map(([y, z0, z1]) => p.box([4.7, 7, z0], [6.3, y, z1], stone)).join('');
  const [r1, r2] = [p.pt(2.8, 3.5, 8.4), p.pt(8.4, 3.5, 8.4)];
  const white = '#ece6ee';
  const hips = [[r1, p.pt(0.2, 6.8, 5.8)], [r2, p.pt(11, 6.8, 5.8)], [r2, p.pt(11, 0.2, 5.8)]].map(([a, b]) => `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`).join('');
  const pavilion = p.box([0, 0, 0], [11, 7, 1.3], stone) + steps + p.box([1, 1, 1.3], [10, 6, 2.4], stone) +
    p.box([2.15, 2.15, 2.4], [9.25, 5.25, 5.3], tone('#efe3cf')) + p.onLeft(5.25, doors(2.15, 9)) + p.onRight(9.25, doors(2.15, 5)) +
    [[1.6, 1.6], [1.6, 5], [9, 1.6], [9, 5]].map(([x, y]) => p.box([x, y, 2.4], [x + 0.55, y + 0.55, 5.4], tone('#c9706c'))).join('') +
    p.box([1.2, 1.2, 5.3], [10, 6, 5.8], tone('#7fb3a3')) + p.onLeft(6, paint(1.2, 10)) + p.onRight(10, paint(1.2, 6)) +
    p.roof([0.2, 0.2, 5.8], [11, 6.8], 2.6, 2.6, slate) + p.tiles([0.2, 0.2, 5.8], [11, 6.8], 2.6, 2.6, mix(slate[0], '#ffffff', 0.14)) +
    `<path d="${hips}" stroke="${white}" stroke-width="${n(p.k * 0.16)}" stroke-linecap="round"/>` +
    `<path d="M${n(r1[0])} ${n(r1[1])}L${n(r2[0])} ${n(r2[1])}" stroke="${white}" stroke-width="${n(p.k * 0.3)}" stroke-linecap="round"/>` +
    horn(...p.pt(0.2, 6.8, 5.8), 0, p.k * 1.1, -1, [0.866, 0.5], slate[0], white) + horn(...p.pt(11, 0.2, 5.8), 0, p.k * 1.1, 1, [-0.866, 0.5], slate[1], white) +
    horn(r1[0], r1[1] - p.k * 0.15, p.k * 0.3, p.k * 0.7, -1, [0.866, 0.5], white) + horn(r2[0], r2[1] - p.k * 0.15, p.k * 0.3, p.k * 0.7, 1, [-0.866, -0.5], white);
  // the stone pagoda: three bodies with carved corner posts under roof stones whose
  // corners lift a little, and a stone finial
  const g = isoFit(w - 4 - big * 0.62, base, big * 0.62, [-6, 6], 12);
  const granite = tone('#dad1cd');
  const posts = (a, b, z0, z1) => `<path d="M${u(a + 0.32)} ${u(z0 + 0.12)}V${u(z1 - 0.12)}M${u(b - 0.32)} ${u(z0 + 0.12)}V${u(z1 - 0.12)}" stroke="${granite[2]}" stroke-width="0.08"/>`;
  const storey = (a, b, z0, z1) => g.box([a, a, z0], [b, b, z1], granite) + g.onLeft(b, posts(a, b, z0, z1)) + g.onRight(b, posts(a, b, z0, z1));
  let pagoda = storey(0, 6, 0, 1.4);
  for (const [[a, b, z0, z1], [c, d, z2]] of [[[1.1, 4.9, 1.4, 3.6], [0.3, 5.7, 4.2]], [[1.5, 4.5, 4.2, 5.8], [0.8, 5.2, 6.3]], [[1.9, 4.1, 6.3, 7.6], [1.3, 4.7, 8.05]]])
    pagoda += storey(a, b, z0, z1) + g.under([a, a], [b, b], z1, 0.25) + g.eave([c, c, z1], [d, d, z2], granite, 0.55);
  pagoda += finial(...g.pt(3, 3, 8.05), g.k * 1.6, g.k, ['#b9adb0', '#d3c8c6', '#e3dbd8']);
  return disc(w - sky.x, sky.y, sky.r * 1.1, '#fffaf2') + kite(sky.x * 1.2, sky.y + sky.r * 1.5, sky.r * 1.4) + birds(w * 0.55, sky.y + sky.r * 4, sky.r * 1.3, '#9a8fa6') +
    hills(base, [[0.1 * w, 0.3 * w, top * 0.75], [0.45 * w, 0.32 * w, top * 0.55], [0.85 * w, 0.32 * w, top * 0.8]], '#d3e8df') +
    hills(base, [[0.3 * w, 0.4 * w, top * 0.4], [0.75 * w, 0.34 * w, top * 0.32]], '#aed6c6') + pavilion + pagoda + floor(w, h, base, '#94c6b2');
}

// ---------- 그리스: a temple of columns, white houses with a blue dome, a calm sea

function greece(L) {
  const { w, h, big, sky } = L;
  const { base } = groundLine(L);
  const marble = tone('#eee7de');
  const shaft = tone('#f6f1ea');
  const t = isoFit(4, base, big * 1.05, [-7, 12], 19);
  const cols = [...[1, 3, 5, 7, 9, 10.8].map((x) => [x, 5.8]), [10.8, 1], [10.8, 2.9], [10.8, 4.1]].sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  // a column: its base, a shaft with a groove down each face, and a capital under the beam
  const column = ([x, y]) =>
    t.box([x - 0.1, y - 0.1, 1.6], [x + 0.8, y + 0.8, 1.82], marble) + t.box([x, y, 1.82], [x + 0.7, y + 0.7, 6.06], shaft) +
    t.onLeft(y + 0.7, `<path d="M${x + 0.35} 2V5.9" stroke="${shaft[2]}" stroke-width="0.07"/>`) +
    t.onRight(x + 0.7, `<path d="M${y + 0.35} 2V5.9" stroke="${mix(shaft[2], '#3d2a45', 0.08)}" stroke-width="0.07"/>`) +
    t.box([x - 0.14, y - 0.14, 6.06], [x + 0.84, y + 0.84, 6.4], marble);
  // the frieze over the beam: a line and a row of triglyphs
  const frieze = (a, b) => `<path d="M${a} 6.72H${b}" stroke="${marble[2]}" stroke-width="0.06"/>` +
    Array.from({ length: Math.round(b - a) }, (_, i) => `<rect x="${a + 0.35 + i}" y="6.8" width="0.3" height="0.2" fill="${marble[2]}"/>`).join('');
  const temple = t.box([0, 0, 0], [12, 7, 0.55], marble) + t.box([0.25, 0.25, 0.55], [11.75, 6.75, 1.1], marble) + t.box([0.5, 0.5, 1.1], [11.5, 6.5, 1.6], marble) +
    cols.map(column).join('') +
    t.box([0.5, 0.5, 6.4], [11.5, 6.5, 7.05], marble) + t.onLeft(6.5, frieze(0.5, 11.5)) + t.onRight(11.5, frieze(0.5, 6.5)) +
    t.box([0.3, 0.3, 7.05], [11.7, 6.7, 7.3], marble) + t.roof([0.3, 0.3, 7.3], [11.7, 6.7], 1.9, 0, ['#e6c1ab', marble[2]]) +
    t.onRight(11.7, `<path d="M1 7.45L3.5 8.92L6 7.45Z" fill="${mix(marble[2], '#3d2a45', 0.07)}"/>`);
  // the houses: blue doors and windows, a little arched window in the drum, and a blue
  // dome with a shine and a cross
  const s = isoFit(w - 4 - big * 0.6, base, big * 0.6, [-3.5, 6], 9.5);
  const white = tone('#f6f3ef');
  const blue = '#5f8fd0';
  const pane = (x, z, wd = 0.55, ht = 0.6) => `<rect x="${x}" y="${z}" width="${wd}" height="${ht}" fill="${blue}"/>`;
  const [dx, dy] = s.pt(1.5, 1.8, 4.4);
  const R = s.k * 1.15;
  const top = dy + s.k * 0.4 - R;
  const houses = s.box([0, 0, 0], [3, 3.5, 3.2], white) + s.box([3, 0.6, 0], [6, 3.5, 2.2], white) +
    s.onLeft(3.5, `<rect x="0.7" y="0" width="0.8" height="1.5" rx="0.4" fill="${blue}"/>` + pane(1.95, 1.9) + pane(3.8, 0.9, 0.6, 0.6) + `<rect x="4.75" y="0" width="0.7" height="1.3" rx="0.35" fill="${blue}"/>`) +
    s.onRight(3, pane(1.5, 2.45, 0.5, 0.5)) + s.onRight(6, pane(1.6, 0.8, 0.6, 0.6)) +
    s.box([0.5, 0.8, 3.2], [2.5, 2.8, 4.4], white) + s.onLeft(2.8, arch(1.25, 3.45, 0.5, 0.25, blue)) +
    dome(dx, dy + s.k * 0.4, R, ['#6f9ee0', '#4f7fc4']) +
    `<path d="M${n(dx - R * 0.68)} ${n(top + R * 0.75)}A${n(R * 0.72)} ${n(R * 0.72)} 0 0 1 ${n(dx - R * 0.25)} ${n(top + R * 0.32)}" fill="none" stroke="#a9c6f0" stroke-width="${n(Math.max(1, R * 0.09))}" stroke-linecap="round"/>` +
    `<path d="M${n(dx)} ${n(top)}V${n(top - s.k * 0.6)}M${n(dx - s.k * 0.17)} ${n(top - s.k * 0.4)}H${n(dx + s.k * 0.17)}" stroke="#ece6dc" stroke-width="${n(Math.max(1, s.k * 0.08))}" stroke-linecap="round"/>`;
  const sea = base + (h - base) * 0.05;
  return disc(sky.x, sky.y, sky.r, '#ffffff') + birds(w * 0.62, sky.y + sky.r * 1.5, sky.r * 1.6, '#ffffff') + birds(w * 0.3, sky.y + sky.r * 4, sky.r * 1.2, '#ffffff') +
    temple + houses + water(w, h, sea, ['#8fc3e8', '#5f9fd6'], 3) + sailboat(w * 0.5, sea + (h - sea) * 0.45, big * 0.22);
}

// ---------- 이집트: the pyramids and an obelisk on soft dunes

function egypt(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.55);
  const py = isoFit(4, base, big * 1.5, [-12, 23], 24);
  // the pyramids: courses of stone across both faces, and the great one's entrance
  const courses = ([x0, y0], [x1, y1], ht, count, [l, r]) => {
    const apex = py.pt((x0 + x1) / 2, (y0 + y1) / 2, ht);
    const at = (p, f) => [p[0] + (apex[0] - p[0]) * f, p[1] + (apex[1] - p[1]) * f];
    const [pl, pf, pr] = [py.pt(x0, y1, 0), py.pt(x1, y1, 0), py.pt(x1, y0, 0)];
    let [dl, dr] = ['', ''];
    for (let i = 1; i < count; i++) {
      const [a, b, c] = [at(pl, i / count), at(pf, i / count), at(pr, i / count)];
      dl += `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`;
      dr += `M${n(b[0])} ${n(b[1])}L${n(c[0])} ${n(c[1])}`;
    }
    const width = n(Math.max(0.5, py.k * 0.05));
    return `<path d="${dl}" stroke="${mix(l, '#3d2a45', 0.1)}" stroke-width="${width}"/><path d="${dr}" stroke="${mix(r, '#3d2a45', 0.1)}" stroke-width="${width}"/>`;
  };
  const [ex, ey] = py.pt(6, 11.1, 1.8);
  const door = `<path d="M${n(ex - py.k * 0.3)} ${n(ey)}V${n(ey - py.k * 0.35)}L${n(ex)} ${n(ey - py.k * 0.62)}L${n(ex + py.k * 0.3)} ${n(ey - py.k * 0.35)}V${n(ey)}Z" fill="#c9965c"/>`;
  const pyramids = py.pyramid([9, -7, 0], [16, 0], 6, ['#f6d39a', '#dca46a']) + courses([9, -7], [16, 0], 6, 6, ['#f6d39a', '#dca46a']) +
    py.pyramid([0, 0, 0], [12, 12], 10, ['#f8d79f', '#dfa767']) + courses([0, 0], [12, 12], 10, 9, ['#f8d79f', '#dfa767']) + door;
  // the obelisk: a column of carved signs down each face under its gold cap
  const ob = isoFit(w - 4 - big * 0.37, base, big * 0.37, [-4, 4], 8);
  const sand = tone('#e8bf86');
  const signs = (colour) => Array.from({ length: 11 }, (_, i) => {
    const z = 2 + i * 1.05;
    return [`<rect x="1.7" y="${z}" width="0.6" height="0.22" fill="${colour}"/>`, `<circle cx="2" cy="${u(z + 0.15)}" r="0.2" fill="${colour}"/>`, `<path d="M1.7 ${z}L2 ${u(z + 0.4)}L2.3 ${z}" fill="none" stroke="${colour}" stroke-width="0.1"/>`][i % 3];
  }).join('');
  const obelisk = ob.box([0, 0, 0], [4, 4, 1.1], sand) + ob.box([1.2, 1.2, 1.1], [2.8, 2.8, 14], sand) +
    ob.onLeft(2.8, signs(mix(sand[1], '#3d2a45', 0.15))) + ob.onRight(2.8, signs(mix(sand[2], '#3d2a45', 0.12))) + ob.pyramid([1.2, 1.2, 14], [2.8, 2.8], 1.7, ['#f7d66e', '#d9a93c']);
  const sx = w - sky.x;
  return rays(sx, sky.y + sky.r, sky.r * 1.4, '#ffd27a') + disc(sx, sky.y + sky.r, sky.r * 1.4, '#ffd98a') +
    hills(base, [[0.18 * w, 0.4 * w, top * 0.7], [0.62 * w, 0.42 * w, top * 0.5], [1.02 * w, 0.3 * w, top * 0.8]], '#f8e0b8') +
    pyramids + obelisk + put(w * 0.55, base + 2, big * 0.42, PALM) + put(w * 0.64, base + 2, big * 0.3, PALM, true) + floor(w, h, base, '#f0cd94');
}

// ---------- 미국: red buttes and a mesa in the desert, a saguaro

function usa(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const rock = tone('#d9805f');
  // the rocks in layers: paler bands of strata across each face
  const strata = (a, b, z0, z1, colour) => {
    let out = '';
    for (let z = z0 + 1.1; z < z1 - 0.5; z += 1.6) out += `<rect x="${u(a)}" y="${u(z)}" width="${u(b - a)}" height="0.2" fill="${colour}"/>`;
    return out;
  };
  const layered = (fit, [x0, y0, z0], [x1, y1, z1], tones) => fit.box([x0, y0, z0], [x1, y1, z1], tones) +
    fit.onLeft(y1, strata(x0, x1, z0, z1, mix(tones[1], '#ffffff', 0.11))) + fit.onRight(x1, strata(y0, y1, z0, z1, mix(tones[2], '#ffffff', 0.07)));
  const b = isoFit(4, base, big * 0.95, [-6, 10], 16);
  const buttes = b.box([0, 0, 0], [10, 6, 1.6], rock) + layered(b, [1.5, 1.2, 1.6], [6.5, 4.8, 9], rock) + layered(b, [7.4, 1.8, 1.6], [8.6, 3, 6.4], rock);
  const m = isoFit(w - 4 - big * 0.62, base, big * 0.62, [-4, 7], 11);
  const mesa = layered(m, [0, 0, 0], [7, 4, 3.2], tone('#e0906f'));
  // the saguaro, lit down its left side
  const cx = w - big * 0.78;
  const s = big * 0.34;
  const arms = `M${n(cx)} ${n(base)}V${n(base - s)}M${n(cx)} ${n(base - s * 0.45)}H${n(cx - s * 0.2)}V${n(base - s * 0.75)}M${n(cx)} ${n(base - s * 0.55)}H${n(cx + s * 0.2)}V${n(base - s * 0.85)}`;
  const cactus = `<path d="${arms}" fill="none" stroke="#6f9f80" stroke-width="${n(s * 0.13)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M${n(cx - s * 0.03)} ${n(base - s * 0.05)}V${n(base - s * 0.95)}M${n(cx - s * 0.23)} ${n(base - s * 0.5)}V${n(base - s * 0.72)}M${n(cx + s * 0.17)} ${n(base - s * 0.6)}V${n(base - s * 0.82)}" fill="none" stroke="#8fbf9c" stroke-width="${n(Math.max(0.6, s * 0.035))}" stroke-linecap="round"/>`;
  return disc(w / 2, base - top * 0.35, sky.r * 2.1, '#ffb98f') + birds(sky.x * 1.4, sky.y + sky.r * 2, sky.r * 1.6, '#a77a78') +
    hills(base, [[0.2 * w, 0.4 * w, top * 0.3], [0.8 * w, 0.4 * w, top * 0.25]], '#efb79a') + buttes + mesa + cactus + floor(w, h, base, '#e6a585');
}

// ---------- 호주: the opera house's sails on the harbour, Uluru far off

function australia(L) {
  const { w, h, big, sky } = L;
  const { base } = groundLine(L);
  const harbour = base + (h - base) * 0.35;
  const p = isoFit(4, harbour, big * 1.05, [-5, 12], 17);
  // the opera house: a podium with a glass front and steps, and its white shells with
  // the ribs of their tiles
  const podium = '<rect x="0.6" y="0.42" width="10.8" height="0.5" fill="#a9bccb"/><path d="' +
    Array.from({ length: 12 }, (_, i) => `M${u(1.5 + i * 0.85)} 0.42V0.92`).join('') + '" stroke="#e8dfd3" stroke-width="0.06"/><path d="M0 0.2H12" stroke="#d6c6b5" stroke-width="0.05"/>';
  let house = p.box([0, 0, 0], [12, 5, 1.4], tone('#e8d8c8')) + p.onLeft(5, podium);
  for (const [x, s] of [[2, 3.8], [5.2, 3.2], [8.2, 2.6]]) {
    const [sx, sy] = p.pt(x, 2.5, 1.4);
    const S = s * p.k;
    house += `<path d="M${n(sx)} ${n(sy)}Q${n(sx + S * 0.1)} ${n(sy - S * 1.05)} ${n(sx + S * 0.8)} ${n(sy - S * 0.95)}Q${n(sx + S * 0.55)} ${n(sy - S * 0.45)} ${n(sx + S * 0.7)} ${n(sy)}Z" fill="#fbf7f0"/>` +
      `<path d="M${n(sx + S * 0.2)} ${n(sy)}Q${n(sx + S * 0.27)} ${n(sy - S * 0.82)} ${n(sx + S * 0.78)} ${n(sy - S * 0.93)}M${n(sx + S * 0.42)} ${n(sy)}Q${n(sx + S * 0.44)} ${n(sy - S * 0.6)} ${n(sx + S * 0.78)} ${n(sy - S * 0.93)}" fill="none" stroke="#e4dbcd" stroke-width="${n(Math.max(0.6, S * 0.02))}"/>` +
      `<path d="M${n(sx + S * 0.8)} ${n(sy - S * 0.95)}Q${n(sx + S * 0.55)} ${n(sy - S * 0.45)} ${n(sx + S * 0.7)} ${n(sy)}H${n(sx + S * 0.9)}Q${n(sx + S * 0.86)} ${n(sy - S * 0.5)} ${n(sx + S * 0.8)} ${n(sy - S * 0.95)}Z" fill="#e2d6c6"/>`;
  }
  // Uluru: its shaded right end and the gullies down its face
  const ux = w - big * 1.0;
  const uw = big * 0.95;
  const ut = base - big * 0.26;
  const uluru = `<path d="M${n(ux)} ${n(base)}C${n(ux + uw * 0.02)} ${n(ut)} ${n(ux + uw * 0.2)} ${n(ut)} ${n(ux + uw * 0.5)} ${n(ut)}S${n(ux + uw)} ${n(ut + big * 0.02)} ${n(ux + uw)} ${n(base)}Z" fill="#d07a58"/>` +
    `<path d="M${n(ux + uw * 0.72)} ${n(ut + big * 0.004)}C${n(ux + uw * 0.95)} ${n(ut + big * 0.02)} ${n(ux + uw)} ${n(ut + big * 0.06)} ${n(ux + uw)} ${n(base)}H${n(ux + uw * 0.8)}C${n(ux + uw * 0.8)} ${n(ut + big * 0.1)} ${n(ux + uw * 0.78)} ${n(ut + big * 0.03)} ${n(ux + uw * 0.72)} ${n(ut + big * 0.004)}Z" fill="#bf6b4c"/>` +
    `<path d="M${n(ux + uw * 0.08)} ${n(ut + big * 0.05)}C${n(ux + uw * 0.2)} ${n(ut)} ${n(ux + uw * 0.6)} ${n(ut)} ${n(ux + uw * 0.85)} ${n(ut + big * 0.04)}" fill="none" stroke="#e8a283" stroke-width="${n(big * 0.03)}" stroke-linecap="round"/>` +
    `<path d="${[0.25, 0.4, 0.55].map((f) => `M${n(ux + uw * f)} ${n(ut + big * 0.07)}q${n(big * 0.012)} ${n(big * 0.08)} ${n(-big * 0.004)} ${n(big * 0.16)}`).join('')}" fill="none" stroke="#bf6b4c" stroke-width="${n(Math.max(1, big * 0.012))}" stroke-linecap="round"/>`;
  return disc(w - sky.x, sky.y, sky.r, '#fffbe8') + birds(sky.x * 1.4, sky.y + sky.r * 2.5, sky.r * 1.5, '#7f8fa6') +
    uluru + floor(w, h, base, '#e3a07c') + kangaroo(w - big * 0.25, base + (harbour - base) * 0.6, big * 0.3, '#a8604a') + water(w, h, harbour, ['#9fd0e6', '#78b8d8'], 4) + house;
}

// ---------- 프랑스: a glass pyramid and the iron tower, lavender morning

function france(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const g = isoFit(4, base, big * 0.85, [-8, 8], 16);
  // the glass pyramid: ribs from the top and across in a diamond lattice, a streak of
  // light down its lit side
  let glass = g.box([-0.6, -0.6, 0], [8.6, 8.6, 0.25], tone('#e6e1ea')) + g.pyramid([0, 0, 0.25], [8, 8], 5.6, ['#dbe7f3', '#bccfe3']);
  const apex = g.pt(4, 4, 5.85);
  const lerp = ([x0, y0], [x1, y1], t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  const seg = (a, b) => `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`;
  const [gl, gf, gr] = [g.pt(0, 8, 0.25), g.pt(8, 8, 0.25), g.pt(8, 0, 0.25)];
  glass += `<path d="M${n(apex[0])} ${n(apex[1])}L${n(lerp(gl, gf, 0.1)[0])} ${n(lerp(gl, gf, 0.1)[1])}L${n(lerp(gl, gf, 0.28)[0])} ${n(lerp(gl, gf, 0.28)[1])}Z" fill="#ffffff" opacity="0.3"/>` +
    '<path d="' + [0.25, 0.5, 0.75].map((t) => seg(apex, lerp(gl, gf, t)) + seg(apex, lerp(gf, gr, t)) +
      seg(lerp(gl, apex, t), lerp(gf, apex, t)) + seg(lerp(gf, apex, t), lerp(gr, apex, t))).join('') + '" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1"/>';
  // the iron tower: crossed braces up each side between its girders, an arch between the
  // legs, two decks with rails, a lookout and a mast
  const s = big * 1.15;
  const x = w - big * 0.32;
  const edge = [[-0.5, 0], [-0.3, -0.27], [-0.17, -0.45], [-0.1, -0.62], [-0.06, -0.8], [-0.015, -1]];
  const side = (sgn) => `M${n(x)} ${n(base)}` + edge.map(([dx, dy]) => `L${n(x + sgn * dx * s * 0.38)} ${n(base + dy * s)}`).join('') + `L${n(x)} ${n(base - s)}Z`;
  // half the tower's width at height f (0 at the foot, 1 at the top)
  const half = (f) => {
    const i = edge.findIndex(([, dy]) => -dy >= f);
    const [[a, fa], [b, fb]] = [edge[Math.max(0, i - 1)], edge[i]];
    return -(a + ((b - a) * (f + fa)) / (fa - fb || 1)) * 0.38 * s;
  };
  const levels = [0, 0.1, 0.19, 0.27, 0.36, 0.45, 0.535, 0.62, 0.71, 0.8, 0.9];
  const braces = (sgn) => levels.slice(1).map((f1, i) => {
    const f0 = levels[i];
    const [y0, y1] = [base - f0 * s, base - f1 * s];
    return `M${n(x + sgn * half(f0))} ${n(y0)}L${n(x)} ${n(y1)}M${n(x)} ${n(y0)}L${n(x + sgn * half(f1))} ${n(y1)}M${n(x + sgn * half(f1))} ${n(y1)}H${n(x)}`;
  }).join('');
  const line = n(Math.max(0.6, s * 0.006));
  const deck = (f, over) => `<rect x="${n(x - half(f) - over)}" y="${n(base - s * f - Math.max(2.5, s * 0.02))}" width="${n((half(f) + over) * 2)}" height="${n(Math.max(2.5, s * 0.02))}" fill="#efe8f4"/>` +
    `<path d="M${n(x - half(f) - over)} ${n(base - s * f - s * 0.04)}H${n(x + half(f) + over)}" stroke="#efe8f4" stroke-width="${line}"/>`;
  const tower = `<path d="${side(1)}" fill="#a596ba"/><path d="${side(-1)}" fill="#86779c"/>` +
    `<path d="${braces(-1)}" stroke="${mix('#a596ba', '#3d2a45', 0.2)}" stroke-width="${line}" fill="none"/>` +
    `<path d="${braces(1)}" stroke="${mix('#86779c', '#ffffff', 0.2)}" stroke-width="${line}" fill="none"/>` +
    `<path d="M${n(x - s * 0.105)} ${n(base)}A${n(s * 0.105)} ${n(s * 0.15)} 0 0 1 ${n(x + s * 0.105)} ${n(base)}Z" fill="#cdbbe4" stroke="#efe8f4" stroke-width="${line}"/>` +
    deck(0.27, s * 0.02) + deck(0.62, s * 0.012) +
    `<rect x="${n(x - s * 0.022)}" y="${n(base - s * 0.95)}" width="${n(s * 0.044)}" height="${n(s * 0.04)}" fill="#efe8f4"/>` +
    `<path d="M${n(x)} ${n(base - s)}V${n(base - s * 1.07)}" stroke="#86779c" stroke-width="${line}"/>`;
  return disc(sky.x, sky.y, sky.r, '#fff6fb') + pill(w - sky.x - sky.r * 3, sky.y + sky.r * 0.6, sky.r * 3.6) + birds(w * 0.4, sky.y + sky.r * 3.5, sky.r * 1.3, '#8f86a8') +
    hills(base, [[0.3 * w, 0.45 * w, top * 0.3], [0.85 * w, 0.4 * w, top * 0.26]], '#e2d8ee') + glass + tower +
    fieldRows(w, h, base, ['#b9a3dc', '#a88fd3', '#9a7fcc', '#8c70c4'], '#9cc29a');
}

// ---------- 이탈리아: houses along a canal and a bell tower

function italy(L) {
  const { w, h, big, sky } = L;
  const { base } = groundLine(L);
  const c = isoFit(4, base, big * 1.0, [-4, 10], 14);
  // windows with green shutters either side, water doors on the canal, a balcony, a
  // cornice along each roof and a chimney
  const win = (x0, n0, z0) => Array.from({ length: n0 }, (_, i) => {
    const x = x0 + i * 0.9;
    return `<rect x="${u(x - 0.12)}" y="${z0}" width="0.1" height="0.8" fill="#8fb5a0"/><rect x="${u(x + 0.47)}" y="${z0}" width="0.1" height="0.8" fill="#8fb5a0"/>` +
      `<rect x="${x}" y="${z0}" width="0.45" height="0.8" rx="0.22" fill="#8f7a86"/><rect x="${u(x - 0.06)}" y="${u(z0 - 0.08)}" width="0.57" height="0.08" fill="#fbf1e4"/>`;
  }).join('');
  const door = (x) => arch(x, 0, 0.75, 0.55, '#7d6a78', '#fbf1e4');
  const cornice = (a, b, z, fill) => c.box([a - 0.1, -0.1, z], [b + 0.1, 4.12, z + 0.25], tone(fill));
  const chimney = (x, y, z) => c.box([x, y, z], [x + 0.4, y + 0.4, z + 0.8], tone('#e2917c')) + c.box([x - 0.1, y - 0.1, z + 0.8], [x + 0.5, y + 0.5, z + 0.95], tone('#e2917c'));
  const houses = c.box([0, 0, 0], [3, 4, 5.4], tone('#f0b77e')) + c.onLeft(4, win(0.5, 3, 3.6) + win(0.5, 3, 1.8) + door(1.1)) + cornice(0, 3, 5.4, '#f6d2a6') + chimney(0.8, 1.2, 5.65) +
    c.box([3, 0, 0], [6, 4, 4.4], tone('#ec9c8a')) + c.onLeft(4, win(3.5, 3, 2.6) + door(4.1)) + cornice(3, 6, 4.4, '#f4c3b6') +
    c.box([3.3, 4, 2.3], [5.7, 4.45, 2.42], tone('#f3e6d6')) + c.onLeft(4.45, '<path d="M3.3 2.42V2.9H5.7V2.42M3.9 2.42V2.9M4.5 2.42V2.9M5.1 2.42V2.9" fill="none" stroke="#8f7a86" stroke-width="0.05"/>') +
    c.box([6, 0, 0], [10, 4, 6.2], tone('#f3cf8f')) + c.onLeft(4, win(6.6, 4, 4.4) + win(6.6, 4, 2.4) + door(7.4)) + c.onRight(10, win(0.6, 4, 4.4) + win(0.6, 4, 2.4)) +
    cornice(6, 10, 6.2, '#f8e2b8') + chimney(8.6, 0.8, 6.45);
  // the bell tower: pale strips up its corners, a belfry of round arches and a cornice
  // under the green spire, with a gold finial
  const t = isoFit(w - 4 - big * 0.3, base, big * 0.3, [-2.6, 2.6], 5.2);
  const strips = '<path d="M0.25 0.3V10.7M2.15 0.3V10.7" stroke="#eba796" stroke-width="0.16"/><rect x="0" y="5.5" width="2.4" height="0.14" fill="#eba796"/>';
  const belfry = arch(0.35, 11.25, 0.7, 0.55, '#8f7a86') + arch(1.35, 11.25, 0.7, 0.55, '#8f7a86');
  const [fx, fy] = t.pt(1.2, 1.2, 15.4);
  const tower = t.box([0, 0, 0], [2.4, 2.4, 11], tone('#e2917c')) + t.onLeft(2.4, strips) + t.onRight(2.4, strips) +
    t.box([-0.1, -0.1, 11], [2.5, 2.5, 12.6], tone('#f3e6d6')) + t.onLeft(2.5, belfry) + t.onRight(2.5, belfry) + t.box([-0.2, -0.2, 12.6], [2.6, 2.6, 12.8], tone('#f3e6d6')) +
    t.pyramid([-0.1, -0.1, 12.8], [2.5, 2.5], 2.6, ['#86b4a6', '#6c9a8d']) + finial(fx, fy, t.k * 0.9, t.k);
  return disc(w - sky.x, sky.y, sky.r, '#fff3d6') + birds(sky.x * 1.3, sky.y + sky.r * 2, sky.r * 1.5, '#ffffff') +
    houses + tower + water(w, h, base, ['#9fd6d6', '#74bfc4'], 10) + gondola(w * 0.52, base + (h - base) * 0.5, big * 0.42);
}

// ---------- 러시아: onion domes on brick towers, snowy pines

function russia(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.6);
  const brick = tone('#d9817a');
  const trim = '#f7efe9';
  // the church: a low arcade joining the towers; each tower with white bands, two
  // arched windows and a ring of little gables under an onion dome in stripes, crowned
  // with a gold cross
  const lo = base - big * 0.13;
  let church = `<rect x="${n(big * 0.08)}" y="${n(lo)}" width="${n(big * 0.58)}" height="${n(big * 0.13)}" fill="${brick[1]}"/>` +
    `<rect x="${n(big * 0.08)}" y="${n(lo)}" width="${n(big * 0.58)}" height="${n(big * 0.018)}" fill="${trim}"/>` +
    Array.from({ length: 7 }, (_, i) => archAt(big * (0.11 + i * 0.08), base, big * 0.035, big * 0.045, mix(brick[1], '#3d2a45', 0.3))).join('');
  for (const [x, ht, r, d] of [[0.16, 0.5, 0.075, ['#7fcab4', '#5eae98']], [0.58, 0.46, 0.07, ['#f4c76a', '#dba948']], [0.38, 0.78, 0.095, ['#e98aa8', '#cc6e8c']]]) {
    const cx = big * x;
    const R = big * r;
    const tp = base - big * ht;
    const band = (y) => `<rect x="${n(cx - R)}" y="${n(y)}" width="${n(R * 2)}" height="${n(R * 0.12)}" fill="${trim}"/>`;
    const O = R * 1.25;
    const ob = tp + R * 0.2;
    const stripes = [-0.5, 0, 0.5].map((f) => `M${n(cx + f * O * 0.8)} ${n(ob)}C${n(cx + f * O * 1.2)} ${n(ob - O * 0.55)} ${n(cx + f * O * 0.8)} ${n(ob - O * 1.05)} ${n(cx)} ${n(ob - O * 1.75)}`).join('');
    const cy = ob - O * 1.75;
    church += drum(cx, base, R, big * ht, brick) + band(tp + R * 0.55) + band(base - big * ht * 0.42) +
      archAt(cx - R * 0.6, base - big * ht * 0.48, R * 0.38, R * 0.5, mix(brick[1], '#3d2a45', 0.35)) + archAt(cx + R * 0.22, base - big * ht * 0.48, R * 0.38, R * 0.5, mix(brick[2], '#3d2a45', 0.35)) +
      `<path d="${[-0.66, 0, 0.66].map((f) => `M${n(cx + f * R - R * 0.3)} ${n(tp + R * 0.55)}A${n(R * 0.3)} ${n(R * 0.3)} 0 0 1 ${n(cx + f * R + R * 0.3)} ${n(tp + R * 0.55)}`).join('')}" fill="none" stroke="${trim}" stroke-width="${n(Math.max(1, R * 0.1))}"/>` +
      onion(cx, ob, O, d) + `<path d="${stripes}" fill="none" stroke="${mix(d[0], '#ffffff', 0.45)}" stroke-width="${n(Math.max(1, O * 0.12))}"/>` +
      `<path d="M${n(cx)} ${n(cy)}V${n(cy - R * 1.1)}M${n(cx - R * 0.28)} ${n(cy - R * 0.75)}H${n(cx + R * 0.28)}M${n(cx - R * 0.16)} ${n(cy - R * 0.95)}H${n(cx + R * 0.16)}M${n(cx - R * 0.2)} ${n(cy - R * 0.35)}L${n(cx + R * 0.2)} ${n(cy - R * 0.5)}" stroke="#d9b36a" stroke-width="${n(Math.max(1, R * 0.09))}" stroke-linecap="round"/>`;
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
  const stone = tone('#e3b088');
  const air = '#fde2c8';
  // the aqueduct: tall arches below and a row of small ones above, each showing the
  // shaded inside of its pier, coursed stone and a cornice between
  const opening = (x, z, wd, ht) => `<path d="M${u(x)} ${u(z)}V${u(z + ht)}A${u(wd / 2)} ${u(wd / 2)} 0 0 0 ${u(x + wd)} ${u(z + ht)}V${u(z)}Z" fill="${air}"/>` +
    `<path d="M${u(x)} ${u(z)}V${u(z + ht)}A${u(wd / 2)} ${u(wd / 2)} 0 0 0 ${u(x + wd / 2)} ${u(z + ht + wd / 2)}" fill="none" stroke="${stone[2]}" stroke-width="${u(wd * 0.14)}"/>`;
  const arches = Array.from({ length: 5 }, (_, i) => opening(0.55 + i * 2.3, 0, 1.5, 1.9)).join('') +
    Array.from({ length: 10 }, (_, i) => opening(0.35 + i * 1.15, 3.25, 0.6, 0.35)).join('') +
    `<path d="M0 0.9H0.55M2.05 0.9H2.85M4.35 0.9H5.15M6.65 0.9H7.45M8.95 0.9H9.75M11.25 0.9H12" stroke="${stone[2]}" stroke-width="0.05"/>` +
    `<rect x="0" y="2.95" width="12" height="0.16" fill="${stone[0]}"/>`;
  const aqueduct = a.box([0, 0, 0], [12, 1.4, 4.4], stone) + a.onLeft(1.4, arches) + a.box([-0.2, -0.2, 4.4], [12.2, 1.6, 4.8], tone('#ecc59f'));
  // the white houses: a blue door, windows behind iron grilles with red flowers under
  // them, tiled roofs and a chimney
  const s = isoFit(w - 4 - big * 0.62, base, big * 0.62, [-3, 6.2], 9.2);
  const white = tone('#f7f3ec');
  const roofs = ['#e88b62', '#c96f4c'];
  const grille = (x, z) => `<rect x="${x}" y="${z}" width="0.6" height="0.7" fill="#6f6478"/><path d="M${u(x + 0.15)} ${z}V${u(z + 0.7)}M${u(x + 0.3)} ${z}V${u(z + 0.7)}M${u(x + 0.45)} ${z}V${u(z + 0.7)}" stroke="#d9d0d6" stroke-width="0.04"/>` +
    `<rect x="${u(x - 0.05)}" y="${u(z - 0.14)}" width="0.7" height="0.14" fill="#c96f4c"/><circle cx="${u(x + 0.12)}" cy="${u(z + 0.02)}" r="0.08" fill="#e8606a"/><circle cx="${u(x + 0.32)}" cy="${u(z + 0.04)}" r="0.08" fill="#f08aa0"/><circle cx="${u(x + 0.5)}" cy="${u(z + 0.02)}" r="0.08" fill="#e8606a"/>`;
  const houses = s.box([0, 0, 0], [4, 3, 2.6], white) + s.onLeft(3, '<rect x="1.6" y="0" width="0.8" height="1.4" rx="0.4" fill="#5f8fd0"/>' + grille(0.5, 1.15) + grille(2.9, 1.15)) + s.onRight(4, grille(1.2, 1.15)) +
    s.roof([-0.2, -0.2, 2.6], [4.2, 3.2], 1.2, 0.9, roofs) + s.tiles([-0.2, -0.2, 2.6], [4.2, 3.2], 1.2, 0.9, mix(roofs[0], '#3d2a45', 0.12), 0.35) +
    s.box([1.2, 0.8, 3.55], [1.6, 1.2, 4.3], white) +
    s.box([4, 0.6, 0], [6, 3, 2], white) + s.onLeft(3, grille(4.6, 0.75)) + s.onRight(6, grille(1.4, 0.75)) +
    s.roof([3.9, 0.4, 2], [6.2, 3.2], 0.9, 0.6, roofs) + s.tiles([3.9, 0.4, 2], [6.2, 3.2], 0.9, 0.6, mix(roofs[0], '#3d2a45', 0.12), 0.35);
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
  const panel = mix(stone[1], '#ffffff', 0.3);
  const line = mix(stone[1], '#3d2a45', 0.18);
  // the pyramid: a sunk panel round each tier, a stair with its steps and side ramps up
  // the middle, and the temple on top with a painted band, a cornice and a crest (the
  // top tier's front is all stair, so it has no panel there)
  const band = (a, b, z) => (b - a < 0.2 ? '' : `<rect x="${u(a)}" y="${u(z + 0.62)}" width="${u(b - a)}" height="0.46" fill="${panel}"/><rect x="${u(a)}" y="${u(z + 0.56)}" width="${u(b - a)}" height="0.06" fill="${line}"/>`);
  const stair = (z) => `<rect x="4.2" y="${z}" width="1.6" height="1.3" fill="${stone[2]}"/><rect x="3.95" y="${z}" width="0.25" height="1.3" fill="${stone[1]}"/><rect x="5.8" y="${z}" width="0.25" height="1.3" fill="${stone[1]}"/>` +
    `<path d="${Array.from({ length: 6 }, (_, k) => `M4.2 ${u(z + 0.11 + k * 0.22)}H5.8`).join('')}" stroke="${panel}" stroke-width="0.05"/>`;
  let pyramid = '';
  for (let i = 0; i < 5; i++) {
    const z = i * 1.3;
    pyramid += p.box([i, i, z], [10 - i, 10 - i, z + 1.3], stone) + p.onLeft(10 - i, band(i + 0.25, 3.95, z) + band(6.05, 9.75 - i, z) + stair(z)) + p.onRight(10 - i, band(i + 0.25, 9.75 - i, z));
  }
  const frieze = (a, b) => `<rect x="${a}" y="7.55" width="${b - a}" height="0.32" fill="#8fc0b4"/>` + Array.from({ length: 4 }, (_, k) => `<rect x="${u(a + 0.2 + k * 0.55)}" y="7.63" width="0.18" height="0.16" fill="#f6d48b"/>`).join('');
  const crest = [[3.9, 5.9], [4.6, 5.9], [5.3, 5.9], [5.9, 3.9], [5.9, 4.6], [5.9, 5.3]].sort((a, b) => a[0] + a[1] - b[0] - b[1])
    .map(([x, y]) => p.box([x, y, 8.5], [x + 0.35, y + 0.35, 8.9], tone('#e3a090'))).join('');
  pyramid += p.box([3.8, 3.8, 6.5], [6.2, 6.2, 8.3], tone('#e3a090')) + p.onLeft(6.2, '<rect x="4.6" y="6.5" width="0.8" height="1.1" fill="#8f6f78"/>' + frieze(3.8, 6.2)) + p.onRight(6.2, frieze(3.8, 6.2)) +
    p.box([3.7, 3.7, 8.3], [6.3, 6.3, 8.5], tone('#efc2b4')) + crest;
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
  // Sugarloaf and its neighbour, shaded on their right and streaked with rock, the cable
  // between them with its car hanging halfway
  const shade = (x, hw, ht, fill) => `<path d="M${n(x)} ${n(base - ht)}C${n(x + hw * 0.6)} ${n(base - ht)} ${n(x + hw * 0.5)} ${n(base)} ${n(x + hw)} ${n(base)}H${n(x)}Z" fill="${fill}"/>`;
  const [c0, c1] = [[big * 0.32, base - big * 0.95], [big * 0.85, base - big * 0.58]];
  const [cx, cy] = [c0[0] + (c1[0] - c0[0]) * 0.45, c0[1] + (c1[1] - c0[1]) * 0.45];
  const car = big * 0.05;
  const peaks = hills(base, [[big * 0.32, big * 0.3, big * 0.95], [big * 0.85, big * 0.26, big * 0.58]], '#a9cbb0') +
    shade(big * 0.32, big * 0.3, big * 0.95, '#98bea2') + shade(big * 0.85, big * 0.26, big * 0.58, '#98bea2') +
    `<path d="M${n(big * 0.36)} ${n(base - big * 0.82)}q${n(big * 0.03)} ${n(big * 0.2)} ${n(big * 0.02)} ${n(big * 0.42)}M${n(big * 0.44)} ${n(base - big * 0.7)}q${n(big * 0.02)} ${n(big * 0.15)} ${n(big * 0.01)} ${n(big * 0.3)}" fill="none" stroke="#8fb497" stroke-width="${n(Math.max(1, big * 0.012))}" stroke-linecap="round"/>` +
    hills(base, [[big * 0.26, big * 0.2, big * 0.88]], '#bcd8c1') +
    `<path d="M${n(c0[0])} ${n(c0[1])}L${n(c1[0])} ${n(c1[1])}M${n(c0[0])} ${n(c0[1] + 2)}L${n(c1[0])} ${n(c1[1] + 2)}" stroke="#8f8597" stroke-width="0.8"/>` +
    `<path d="M${n(cx)} ${n(cy)}V${n(cy + car * 0.4)}" stroke="#8f8597" stroke-width="1"/>` +
    `<rect x="${n(cx - car / 2)}" y="${n(cy + car * 0.4)}" width="${n(car)}" height="${n(car * 0.7)}" rx="${n(car * 0.18)}" fill="#e9a6a0"/>` +
    `<rect x="${n(cx - car * 0.36)}" y="${n(cy + car * 0.5)}" width="${n(car * 0.72)}" height="${n(car * 0.25)}" rx="${n(car * 0.06)}" fill="#fbeeea"/>`;
  // the houses: windows and a door on each street front, a pale parapet round each
  // flat roof, and blue water tanks
  const f = isoFit(w - 4 - big * 0.7, base, big * 0.7, [-3, 7], 10);
  const pane = (x, z) => `<rect x="${u(x)}" y="${u(z)}" width="0.55" height="0.65" fill="#8f8597" opacity="0.7"/>`;
  const tank = (x, y, z) => { const [tx, ty] = f.pt(x, y, z); return drum(tx, ty, f.k * 0.32, f.k * 0.45, ['#bcd6ef', '#8fb6de', '#6f9bc9']); };
  const houses = [[[0, 0, 0], [3, 3, 2], '#a9d8c8'], [[3, 0.5, 0], [7, 3, 2.4], '#f3b9a0'], [[0.4, 0.6, 2], [3, 3, 3.8], '#c9b6e2'], [[3.4, 1, 2.4], [6.2, 3, 4.1], '#f4d98e', [5.4, 1.7]], [[1, 1.2, 3.8], [3, 3, 5.2], '#f2aebc', [1.7, 1.9]]]
    .map(([[x0, y0, z0], [x1, y1, z1], c, top]) => {
      const count = Math.floor((x1 - x0) / 1.25);
      const front = Array.from({ length: count }, (_, i) => (!z0 && i === count - 1 ? `<rect x="${u(x0 + 0.4 + i * 1.25)}" y="0" width="0.6" height="1.25" fill="#8f8597" opacity="0.8"/>` : pane(x0 + 0.4 + i * 1.25, z0 + 0.6))).join('');
      return f.box([x0, y0, z0], [x1, y1, z1], tone(c)) + f.onLeft(y1, front) + (y1 - y0 > 1.4 ? f.onRight(x1, pane(y0 + 0.5, z0 + 0.6)) : '') +
        f.box([x0, y0, z1], [x1, y1, z1 + 0.15], tone(mix(c, '#ffffff', 0.4))) + (top ? tank(top[0], top[1], z1 + 0.15) : '');
    }).join('');
  return calmSky(L, '#fff8ea') + peaks + houses + water(w, h, base, ['#c1e4e3', '#9fd1d3'], 14);
}

// ---------- 영국: the clock tower, a red phone box and a round tree on the lawn

function uk(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const t = isoFit(4 + big * 0.06, base, big * 0.34, [-2.4, 2.4], 4.8);
  const sand = '#d9bf98';
  const slate = ['#6f7a94', '#5b6680'];
  // the shaft: a groove near each edge, a pale band between storeys and a pointed
  // window in each storey
  const shaft = `<path d="M0.42 0.4V8.7M1.98 0.4V8.7" stroke="${mix(sand, '#3d2a45', 0.22)}" stroke-width="0.09"/>` +
    [3, 6].map((z) => `<rect x="0" y="${z}" width="2.4" height="0.16" fill="${mix(sand, '#ffffff', 0.45)}"/>`).join('') +
    [0.9, 3.8, 6.7].map((z) => arch(0.95, z, 0.5, 0.8, '#7d7088')).join('');
  // the clock: a pale face with hour marks and hands in a gilded square
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `M${u(1.2 + Math.cos(a) * 0.58)} ${u(10 + Math.sin(a) * 0.58)}L${u(1.2 + Math.cos(a) * 0.7)} ${u(10 + Math.sin(a) * 0.7)}`;
  }).join('');
  const clock = '<rect x="0.3" y="9.1" width="1.8" height="1.8" fill="#ead3a0"/>' +
    '<circle cx="1.2" cy="10" r="0.8" fill="#fbf6ec" stroke="#c9a96e" stroke-width="0.12"/>' +
    `<path d="${ticks}" stroke="#4a3f5c" stroke-width="0.07"/>` +
    '<path d="M1.2 10v0.45M1.2 10h0.35" stroke="#4a3f5c" stroke-width="0.09" stroke-linecap="round"/>';
  const louvres = arch(0.5, 11.25, 0.45, 0.45, slate[1]) + arch(1.25, 11.25, 0.45, 0.45, slate[1]);
  const pinnacle = (x, y) => cone(...t.pt(x, y, 12.2), t.k * 0.14, t.k * 1.1, slate);
  const [sx, sy] = t.pt(1.2, 1.2, 15.2);
  const tower = t.box([0, 0, 0], [2.4, 2.4, 9], tone(sand)) + t.onLeft(2.4, shaft) + t.onRight(2.4, shaft) +
    t.box([-0.15, -0.15, 9], [2.55, 2.55, 11], tone('#e8d5b5')) + t.onLeft(2.55, clock) + t.onRight(2.55, clock) +
    t.box([0.25, 0.25, 11], [2.15, 2.15, 12.2], tone(sand)) + t.onLeft(2.15, louvres) + t.onRight(2.15, louvres) +
    t.pyramid([0.25, 0.25, 12.2], [2.15, 2.15], 3, slate) + pinnacle(0.25, 2.15) + pinnacle(2.15, 2.15) + pinnacle(2.15, 0.25) +
    `<path d="M${n(sx)} ${n(sy)}V${n(sy - t.k * 0.8)}" stroke="#c9a96e" stroke-width="${n(Math.max(1, t.k * 0.1))}"/><circle cx="${n(sx)}" cy="${n(sy - t.k * 0.85)}" r="${n(Math.max(1, t.k * 0.13))}" fill="#e2c27a"/>`;
  // the phone box: small panes all over its doors, the sign under its crown, a domed top
  const b = isoFit(w - 4 - big * 0.2, base, big * 0.2, [-1.3, 1.3], 2.6);
  const panes = Array.from({ length: 12 }, (_, i) => `<rect x="${u(0.24 + (i % 3) * 0.29)}" y="${u(0.75 + Math.floor(i / 3) * 0.42)}" width="0.22" height="0.34" fill="#f6dcd6" opacity="0.85"/>`).join('') +
    '<rect x="0.2" y="2.62" width="0.9" height="0.22" fill="#fbeeea"/>';
  const red = tone('#e2665e');
  const box = b.box([0, 0, 0], [1.3, 1.3, 3.1], red) + b.onLeft(1.3, panes) + b.onRight(1.3, panes) + b.box([-0.06, -0.06, 3.1], [1.36, 1.36, 3.3], red) +
    dome(...b.pt(0.65, 0.65, 3.3), b.k * 0.5, [red[1], red[2]]);
  // the bus: windows on both decks, a cream band between them, wheels, and windscreens
  const bus = isoFit(w * 0.4, base + (h - base) * 0.55, big * 0.5, [-1.6, 6], 7.6);
  const row = (z, count) => Array.from({ length: count }, (_, i) => `<rect x="${u(0.45 + (i * 5.1) / count)}" y="${z}" width="${u(5.1 / count - 0.18)}" height="0.62" rx="0.08" fill="#f6e6e0"/>`).join('');
  const wheel = (x) => `<circle cx="${x}" cy="0.35" r="0.42" fill="#4a3f5c"/><circle cx="${x}" cy="0.35" r="0.16" fill="#d8cfd8"/>`;
  const decker = bus.box([0, 0, 0.3], [6, 1.6, 2.2], red) + bus.box([0, 0, 2.2], [6, 1.6, 2.32], tone('#f3e3d6')) + bus.box([0, 0, 2.32], [6, 1.6, 4], red) +
    bus.onLeft(1.6, row(1.25, 4) + row(2.95, 5) + wheel(1.15) + wheel(4.85)) +
    bus.onRight(6, '<rect x="0.15" y="1.2" width="1.3" height="0.7" rx="0.08" fill="#f6e6e0"/><rect x="0.15" y="2.9" width="1.3" height="0.7" rx="0.08" fill="#f6e6e0"/>');
  return pill(sky.x * 0.3, sky.y + sky.r * 0.4, sky.r * 4.6, 0.9) + pill(w - sky.x * 0.3 - sky.r * 4, sky.y + sky.r * 1.4, sky.r * 4, 0.85) + pill(w * 0.35, sky.y + sky.r * 3.6, sky.r * 3, 0.7) + rain(w, h, 33) +
    rolling(w, base, top, ['#dfe6dc', '#cfdcc9']) + tower + roundTree(w - big * 0.62, base, big * 0.42, ['#a9c79e', '#8db384']) + box + floor(w, h, base, '#c4d8bb') + decker;
}

// ---------- 독일: the city gate of columns and a piece of the old wall in soft colours

function germany(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.6);
  const g = isoFit(4, base, big * 1.05, [-3, 12], 15);
  const sand = tone('#e7d6bd');
  const shaft = tone('#efe1cc');
  // the gate: columns with bases, grooves and capitals, a frieze of triglyphs under a
  // cornice, an attic with relief panels, and the copper quadriga on top
  let gate = g.box([0, 0, 0], [12, 3, 0.6], sand);
  for (const y of [0.3, 2.1]) {
    for (const x of [0.6, 2.6, 4.6, 6.6, 8.6, 10.6]) {
      gate += g.box([x - 0.08, y - 0.08, 0.6], [x + 0.88, y + 0.68, 0.82], sand) + g.box([x, y, 0.82], [x + 0.8, y + 0.6, 4.76], shaft) +
        g.onLeft(y + 0.6, `<path d="M${x + 0.4} 1V4.6" stroke="${shaft[2]}" stroke-width="0.07"/>`) + g.box([x - 0.1, y - 0.1, 4.76], [x + 0.9, y + 0.7, 5], sand);
    }
  }
  const frieze = (a, b) => `<path d="M${a} 5.45H${b}" stroke="${sand[2]}" stroke-width="0.06"/>` +
    Array.from({ length: Math.round((b - a) / 1) }, (_, i) => `<rect x="${a + 0.35 + i}" y="5.55" width="0.3" height="0.32" fill="${sand[2]}"/>`).join('');
  const panels = [2.4, 4.4, 6.4, 8.4].map((x) => `<rect x="${x}" y="6.35" width="1.2" height="0.55" fill="${mix(sand[1], '#ffffff', 0.35)}"/>`).join('');
  const [qx, qy] = g.pt(5.1, 1.5, 7.45);
  gate += g.box([0, 0, 5], [12, 3, 6], sand) + g.onLeft(3, frieze(0, 12)) + g.onRight(12, frieze(0, 3)) + g.box([-0.12, -0.12, 6], [12.12, 3.12, 6.2], sand) +
    g.box([2, 0.5, 6.2], [10, 2.5, 7.1], sand) + g.onLeft(2.5, panels) + g.box([4.9, 1.1, 7.1], [7.1, 1.9, 7.45], sand) + put(qx, qy, g.k * 3, QUADRIGA);
  // the wall: graffiti, seams between its slabs, a heart and a sun, and the round
  // pipe along its top
  const s = isoFit(w - 4 - big * 0.66, base, big * 0.66, [-1, 8], 9);
  const stripes = ['#f2a8a0', '#f6cf6f', '#8fd0bd', '#c3a8e6'].map((c, i) => `<rect x="${0.6 + i * 1.9}" y="0.6" width="1.4" height="${1.2 + (i % 2) * 0.9}" rx="0.3" fill="${c}"/>`).join('') +
    '<path d="M6.75 2.75C6.55 2.95 6.35 3.1 6.35 3.25C6.35 3.4 6.55 3.45 6.75 3.3C6.95 3.45 7.15 3.4 7.15 3.25C7.15 3.1 6.95 2.95 6.75 2.75Z" fill="#f2a8a0"/>' +
    '<circle cx="2.85" cy="3.05" r="0.28" fill="#f6cf6f"/>';
  const wall = s.box([0, 0, 0], [8, 1, 3.6], tone('#cfd1d7')) + s.onLeft(1, stripes + [2, 4, 6].map((x) => `<path d="M${x} 0V3.6" stroke="#b6b8c1" stroke-width="0.06"/>`).join('')) +
    s.box([-0.05, 0.08, 3.6], [8.05, 0.92, 3.95], tone('#e2e3e8'));
  let forest = '';
  for (const [x, k] of [[0.06, 0.9], [0.14, 1.1], [0.22, 0.8], [0.8, 1], [0.9, 1.2], [0.97, 0.85]]) forest += cone(w * x, base - top * 0.15, top * 0.14 * k, top * 0.5 * k, ['#6f9a86', '#5a8571']);
  return disc(w - sky.x, sky.y, sky.r, '#fffaf0') + pill(sky.x * 0.4, sky.y + sky.r * 0.6, sky.r * 4) + birds(w * 0.5, sky.y + sky.r * 3.6, sky.r * 1.3, '#8f9aa8') +
    hills(base, [[0.2 * w, 0.42 * w, top * 0.35], [0.8 * w, 0.4 * w, top * 0.3]], '#cfe2cf') + forest + gate + wall + floor(w, h, base, '#b9d4b6');
}

// The quadriga on the gate, about 0.7 across and facing left: four copper horses
// abreast, the chariot, and Victoria holding up her staff and wreath.
const QUADRIGA = (() => {
  const horse = (x, fill) =>
    `<path d="M${x} -0.12L${u(x + 0.02)} -0.02M${u(x + 0.16)} -0.12L${u(x + 0.15)} -0.02" stroke="${fill}" stroke-width="0.032" stroke-linecap="round"/>` +
    `<path d="M${u(x - 0.03)} -0.14C${u(x - 0.03)} -0.2 ${u(x + 0.18)} -0.21 ${u(x + 0.19)} -0.15C${u(x + 0.19)} -0.11 ${x} -0.1 ${u(x - 0.03)} -0.14Z" fill="${fill}"/>` +
    `<path d="M${x} -0.17L${u(x - 0.06)} -0.3L${u(x - 0.1)} -0.29L${u(x - 0.08)} -0.25L${u(x - 0.03)} -0.13Z" fill="${fill}"/>`;
  return horse(0.3, '#6a9888') + horse(0.22, '#7fae9e') + horse(0.14, '#6a9888') + horse(0.06, '#7fae9e') +
    '<path d="M0.5 -0.18H0.66L0.64 -0.08H0.52Z" fill="#6a9888"/>' +
    '<path d="M0.58 -0.18L0.6 -0.4H0.64L0.66 -0.18Z" fill="#7fae9e"/><circle cx="0.62" cy="-0.43" r="0.03" fill="#7fae9e"/>' +
    '<path d="M0.66 -0.3L0.7 -0.62" stroke="#7fae9e" stroke-width="0.02"/><circle cx="0.705" cy="-0.66" r="0.035" fill="none" stroke="#7fae9e" stroke-width="0.015"/>';
})();

// ---------- 튀르키예: a domed mosque and minarets, balloons over the fairy chimneys

function turkiye(L) {
  const { w, h, big, sky } = L;
  const { base, top } = groundLine(L, 0.5);
  const m = isoFit(4 + big * 0.08, base, big * 0.8, [-7, 7], 14);
  const wall = tone('#efe2d4');
  const blue = ['#9db4d3', '#7f98bd'];
  const recess = mix(wall[1], '#3d2a45', 0.2);
  const [dx, dy] = m.pt(3.5, 3.5, 2.6);
  // minarets with two balconies, a blue cone and a crescent
  const minaret = (x, y) => {
    const [mx, my] = m.pt(x, y, 0);
    const [r, H] = [m.k * 0.32, m.k * 7.6];
    return drum(mx, my, r, H, wall) +
      [0.56, 0.84].map((f) => `<ellipse cx="${n(mx)}" cy="${n(my - H * f)}" rx="${n(r * 1.55)}" ry="${n(r * 0.55)}" fill="${wall[2]}"/><ellipse cx="${n(mx)}" cy="${n(my - H * f - r * 0.16)}" rx="${n(r * 1.5)}" ry="${n(r * 0.5)}" fill="${wall[0]}"/>`).join('') +
      cone(mx, my - H, m.k * 0.36, m.k * 1.6, ['#8fa8c8', '#7590b3']) + crescent(mx, my - H - m.k * 1.6, m.k * 0.6);
  };
  // little domed turrets on the corners of the hall
  const turret = (x, y) => { const [tx, ty] = m.pt(x, y, 2.6); return drum(tx, ty, m.k * 0.36, m.k * 0.4, wall) + dome(tx, ty - m.k * 0.4, m.k * 0.4, blue); };
  // the hall: two rows of arched windows; the big dome on a drum ringed with windows,
  // with ribs, a shine and a crescent
  const windows = (a, b) => Array.from({ length: Math.floor((b - a) / 0.95) }, (_, i) => arch(a + 0.32 + i * 0.95, 0.45, 0.42, 0.5, recess) + arch(a + 0.32 + i * 0.95, 1.6, 0.42, 0.3, recess)).join('');
  const R = m.k * 1.9;
  const rim = dy - m.k * 0.5;
  const ribs = [-0.62, -0.25, 0.25, 0.62].map((f) => `M${n(dx)} ${n(rim - R)}Q${n(dx + f * R * 1.1)} ${n(rim - R * 0.62)} ${n(dx + f * R)} ${n(rim)}`).join('');
  const mosque = m.box([0.6, 0.6, 0], [6.4, 6.4, 2.6], wall) + m.onLeft(6.4, windows(0.6, 6.4)) + m.onRight(6.4, windows(0.6, 6.4)) +
    turret(1.1, 6) + turret(6, 1.1) +
    drum(dx, dy, R, m.k * 0.5, wall) + Array.from({ length: 7 }, (_, i) => archAt(dx - R * 0.82 + i * R * 0.25, dy - m.k * 0.06, R * 0.1, m.k * 0.16, recess)).join('') +
    dome(dx, rim, R, blue) + `<path d="${ribs}" fill="none" stroke="${mix(blue[0], '#ffffff', 0.35)}" stroke-width="${n(Math.max(0.6, m.k * 0.06))}"/>` +
    `<path d="M${n(dx - R * 0.72)} ${n(rim - R * 0.38)}A${n(R * 0.78)} ${n(R * 0.78)} 0 0 1 ${n(dx - R * 0.3)} ${n(rim - R * 0.74)}" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="${n(Math.max(1, m.k * 0.12))}" stroke-linecap="round"/>` +
    crescent(dx, rim - R, m.k * 0.9) + turret(6, 6) + minaret(-0.2, 7.2) + minaret(7.2, -0.2);
  // the fairy chimneys: cave windows in their sides and a shaded cap
  let rocks = '';
  for (const [x, s] of [[0.68, 0.42], [0.86, 0.55], [0.98, 0.36]]) {
    const cx = w - big + big * x - big * 0.06;
    const S = big * s;
    rocks += cone(cx, base, S * 0.28, S, ['#ecceae', '#d6b392']) +
      archAt(cx - S * 0.11, base - S * 0.18, S * 0.07, S * 0.06, '#b89a85') + archAt(cx + S * 0.04, base - S * 0.42, S * 0.06, S * 0.05, '#ad8e7a') +
      dome(cx, base - S + big * 0.03, S * 0.11, ['#b0928a', '#987b75']);
  }
  // balloons in panels, hanging their baskets on ropes
  const balloon = (x, y, r, [a, b]) => `<path d="M${n(x - r)} ${n(y)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Q${n(x + r * 0.7)} ${n(y + r * 0.9)} ${n(x + r * 0.2)} ${n(y + r * 1.25)}H${n(x - r * 0.2)}Q${n(x - r * 0.7)} ${n(y + r * 0.9)} ${n(x - r)} ${n(y)}Z" fill="${a}"/>` +
    `<path d="M${n(x)} ${n(y - r)}Q${n(x + r * 0.45)} ${n(y)} ${n(x + r * 0.12)} ${n(y + r * 1.25)}H${n(x - r * 0.12)}Q${n(x - r * 0.45)} ${n(y)} ${n(x)} ${n(y - r)}Z" fill="${b}"/>` +
    `<path d="M${n(x - r * 0.62)} ${n(y - r * 0.78)}Q${n(x - r * 0.9)} ${n(y + r * 0.2)} ${n(x - r * 0.18)} ${n(y + r * 1.22)}M${n(x + r * 0.62)} ${n(y - r * 0.78)}Q${n(x + r * 0.9)} ${n(y + r * 0.2)} ${n(x + r * 0.18)} ${n(y + r * 1.22)}" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="${n(Math.max(0.6, r * 0.05))}"/>` +
    `<path d="M${n(x - r * 0.18)} ${n(y + r * 1.25)}L${n(x - r * 0.14)} ${n(y + r * 1.4)}M${n(x + r * 0.18)} ${n(y + r * 1.25)}L${n(x + r * 0.14)} ${n(y + r * 1.4)}" stroke="#a68e86" stroke-width="${n(Math.max(0.6, r * 0.04))}"/>` +
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
  const white = ['#fcf8f3', '#e5dcd5'];
  const recess = '#e2d1c8';
  // a minaret: a tall drum with two balconies and a small domed kiosk on top
  const minaret = (x, y) => {
    const [mx, my] = t.pt(x, y, 1);
    const [r, H] = [t.k * 0.3, t.k * 5];
    return drum(mx, my, r, H, marble) +
      [0.34, 0.68].map((f) => `<ellipse cx="${n(mx)}" cy="${n(my - H * f)}" rx="${n(r * 1.5)}" ry="${n(r * 0.55)}" fill="${marble[2]}"/><ellipse cx="${n(mx)}" cy="${n(my - H * f - r * 0.16)}" rx="${n(r * 1.45)}" ry="${n(r * 0.5)}" fill="${marble[0]}"/>`).join('') +
      dome(mx, my - H, t.k * 0.38, white) + crescent(mx, my - H - t.k * 0.38, t.k * 0.5);
  };
  // a small domed kiosk (chattri) on the roof at (x, y)
  const chattri = (x, y) => { const [cx, cy] = t.pt(x, y, 4.8); return drum(cx, cy, t.k * 0.3, t.k * 0.45, marble) + dome(cx, cy - t.k * 0.45, t.k * 0.34, white); };
  // each face: a tall pointed arch in a framed panel, two smaller arches stacked either
  // side, and a band along the top
  const facade = '<rect x="3.05" y="1.05" width="1.9" height="3.2" fill="#fbf7f3"/>' + pointed(3.35, 1.05, 1.3, 1.45, recess) +
    [1.95, 5.3].map((x) => pointed(x, 1.3, 0.75, 0.5, recess) + pointed(x, 2.75, 0.75, 0.5, recess)).join('') +
    `<rect x="1.6" y="4.45" width="4.8" height="0.14" fill="${marble[0]}"/>`;
  const plinth = (a, b) => Array.from({ length: Math.floor((b - a) / 0.8) }, (_, i) => arch(a + 0.22 + i * 0.8, 0.18, 0.36, 0.3, recess)).join('');
  const [dx, dy] = t.pt(4, 4, 4.8);
  const crown = dy - t.k * 0.6 - t.k * 1.6 * 1.75;
  const tomb = t.box([0, 0, 0], [8, 8, 1], tone('#e8d2c6')) + t.onLeft(8, plinth(0, 8)) + t.onRight(8, plinth(0, 8)) +
    minaret(0.4, 0.4) + minaret(7.6, 0.4) + minaret(0.4, 7.6) +
    t.box([1.6, 1.6, 1], [6.4, 6.4, 4.8], tone('#f7f1ec')) + t.onLeft(6.4, facade) + t.onRight(6.4, facade) +
    chattri(2.1, 2.1) + chattri(2.1, 5.9) + chattri(5.9, 2.1) +
    drum(dx, dy, t.k * 1.3, t.k * 0.6, marble) + onion(dx, dy - t.k * 0.6, t.k * 1.6, white) +
    `<path d="M${n(dx - t.k * 1.05)} ${n(dy - t.k * 1.5)}Q${n(dx - t.k * 1.12)} ${n(dy - t.k * 2.4)} ${n(dx - t.k * 0.45)} ${n(dy - t.k * 3.05)}" fill="none" stroke="#ffffff" stroke-width="${n(Math.max(1, t.k * 0.12))}" stroke-linecap="round" opacity="0.8"/>` +
    crescent(dx, crown, t.k * 1.2) + chattri(5.9, 5.9) + minaret(7.6, 7.6);
  let trees = '';
  for (const [x, s] of [[0.74, 0.62], [0.9, 0.5]]) {
    const cx = w - big + big * x;
    trees += `<ellipse cx="${n(cx)}" cy="${n(base - big * s * 0.5)}" rx="${n(big * s * 0.12)}" ry="${n(big * s * 0.5)}" fill="#7fb68f"/><path d="M${n(cx)} ${n(base)}V${n(base - big * s)}A${n(big * s * 0.12)} ${n(big * s * 0.5)} 0 0 1 ${n(cx)} ${n(base)}Z" fill="#679f78"/>`;
  }
  const pool = base + (h - base) * 0.3;
  return garlands(w, sky) + disc(w / 2, sky.y + sky.r * 1.6, sky.r * 1.2, '#ffd2a6') +
    hills(base, [[0.2 * w, 0.42 * w, top * 0.4], [0.8 * w, 0.4 * w, top * 0.32]], '#f4cfc2') + tomb + trees + floor(w, h, base, '#f1d0b8') + water(w, h, pool, ['#b7dcd8', '#93c8c4'], 12);
}

// ---------- 캐나다: the northern lights over snowy peaks, spruce forests and a still lake

function canada({ w, h, band, big, ground }) {
  const lake = h - ground * 0.55;
  const top = band ? band * 0.6 : h * 0.24;
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
    forest(0, w, Math.min(ground * 0.9, big * 0.4)) +
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
    fuji(w / 2, lake, band ? w * 0.6 : w * 0.32, band ? band * 0.55 : h * 0.2) +
    put(w - big * 0.95, lake, big * 0.95, SAKURA) +
    water(w, h, lake, ['#e1e9f0', '#bccbd9'], 18) +
    put(big * 0.05, lake + (h - lake) * 0.35, big * 0.85, TORII)
  );
}

// Mount Fuji standing on `base` round x: a pale cone with a jagged cap of snow, its
// right flank in shade and streaks of snow running down from the cap.
function fuji(x, base, hw, ht) {
  const t = base - ht;
  const tip = `M${n(x - hw * 0.16)} ${n(t)}Q${n(x)} ${n(t - ht * 0.02)} ${n(x + hw * 0.16)} ${n(t)}`;
  const cap = [[0.39, 0.28], [0.22, 0.22], [0.1, 0.32], [-0.05, 0.22], [-0.2, 0.3], [-0.39, 0.28]];
  const snow = cap.map(([dx, dy]) => `L${n(x + hw * dx)} ${n(t + ht * dy)}`).join('');
  // narrow tongues of snow down the gullies below the cap's points
  const streaks = [[0.22, 0.22, 0.1], [0.1, 0.32, 0.08], [-0.05, 0.22, 0.12], [-0.2, 0.3, 0.07]]
    .map(([dx, dy, len]) => `M${n(x + hw * (dx - 0.025))} ${n(t + ht * (dy - 0.02))}l${n(hw * (0.025 + dx * len * 2.2))} ${n(ht * (len + 0.02))}L${n(x + hw * (dx + 0.025))} ${n(t + ht * (dy - 0.02))}Z`)
    .join('');
  return `<path d="${tip}L${n(x + hw)} ${n(base)}H${n(x - hw)}Z" fill="#b9c7dc"/>` +
    `<path d="M${n(x + hw * 0.05)} ${n(t)}H${n(x + hw * 0.16)}L${n(x + hw)} ${n(base)}H${n(x + hw * 0.22)}Z" fill="#aab9d2"/>` +
    `<path d="${tip}${snow}Z" fill="#ffffff"/>` +
    `<path d="M${n(x + hw * 0.05)} ${n(t)}H${n(x + hw * 0.16)}L${n(x + hw * 0.39)} ${n(t + ht * 0.28)}L${n(x + hw * 0.22)} ${n(t + ht * 0.22)}L${n(x + hw * 0.1)} ${n(t + ht * 0.32)}Z" fill="#e6edf7"/>` +
    `<path d="${streaks}" fill="#ffffff" opacity="0.85"/>`;
}

// A red torii, about 0.8 across, standing in the water with its reflection under it:
// lit and shaded edges down its posts, black sleeves at their feet, and a dark plaque.
const TORII_SHAPE =
  '<rect x="0.17" y="-0.64" width="0.06" height="0.64"/><rect x="0.57" y="-0.64" width="0.06" height="0.64"/>' +
  '<rect x="0.1" y="-0.52" width="0.6" height="0.045"/>' +
  '<rect x="0.38" y="-0.62" width="0.04" height="0.1"/>' +
  '<path d="M0.02 -0.66Q0.4 -0.6 0.78 -0.66L0.8 -0.72Q0.4 -0.65 0 -0.72Z"/>';
const TORII_TOP = '<path d="M-0.03 -0.725Q0.4 -0.655 0.83 -0.725L0.845 -0.765Q0.4 -0.685 -0.045 -0.765Z"/>';
const TORII =
  `<g fill="#e48a78">${TORII_SHAPE}</g>` +
  '<path d="M0.172 -0.64h0.016v0.6h-0.016ZM0.572 -0.64h0.016v0.6h-0.016ZM0.1 -0.52h0.6v0.012h-0.6Z" fill="#f4b4a6"/>' +
  '<path d="M0.214 -0.64h0.016v0.6h-0.016ZM0.614 -0.64h0.016v0.6h-0.016Z" fill="#c96e5f"/>' +
  '<path d="M0.16 -0.05h0.08V0h-0.08ZM0.56 -0.05h0.08V0h-0.08Z" fill="#5a5068"/>' +
  '<rect x="0.365" y="-0.615" width="0.07" height="0.085" fill="#5a5068" stroke="#e9c46a" stroke-width="0.008"/>' +
  `<g fill="#5a5068">${TORII_TOP}</g>` +
  `<g opacity="0.22" transform="scale(1 -0.6)"><g fill="#e48a78">${TORII_SHAPE}</g><g fill="#5a5068">${TORII_TOP}</g></g>`;

// A cherry tree in bloom, about 1 across: a two-toned trunk and layered clusters of
// blossom, deeper pink underneath.
const SAKURA =
  '<path d="M0.5 0C0.52 -0.18 0.46 -0.3 0.4 -0.42M0.48 -0.22C0.58 -0.3 0.66 -0.36 0.74 -0.46M0.44 -0.34C0.34 -0.4 0.26 -0.44 0.2 -0.52" fill="none" stroke="#6b4a4a" stroke-width="0.04" stroke-linecap="round"/>' +
  '<path d="M0.49 -0.02C0.5 -0.18 0.45 -0.29 0.395 -0.41" fill="none" stroke="#8f6a66" stroke-width="0.012" stroke-linecap="round"/>' +
  [[0.4, -0.53, 0.15, '#eea0b6'], [0.62, -0.56, 0.14, '#eea0b6'], [0.24, -0.52, 0.11, '#eea0b6'], [0.78, -0.48, 0.11, '#eea0b6'],
    [0.4, -0.56, 0.16, '#f6bccb'], [0.22, -0.56, 0.12, '#f9d3dd'], [0.6, -0.6, 0.15, '#f9d3dd'], [0.76, -0.52, 0.12, '#f6bccb'], [0.5, -0.72, 0.14, '#f2a7bb'],
    [0.3, -0.68, 0.11, '#f6bccb'], [0.68, -0.74, 0.1, '#f6bccb'], [0.14, -0.46, 0.08, '#f2a7bb'], [0.86, -0.42, 0.08, '#f9d3dd'],
    [0.46, -0.78, 0.07, '#fbe3ea'], [0.62, -0.7, 0.06, '#fbe3ea'], [0.28, -0.62, 0.06, '#fbe3ea'], [0.8, -0.58, 0.05, '#fbe3ea']]
    .map(([x, y, r, fill]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`)
    .join('');

// ---------- 네덜란드: windmills by a canal and rows of tulips under big clouds

function netherlands({ w, h, big, ground, sky }) {
  const canal = h - ground * 0.6;
  return (
    cloud(sky.x - sky.r * 2.2, sky.y + sky.r * 0.4, sky.r * 4.4) +
    cloud(w - sky.x - sky.r * 2, sky.y, sky.r * 3.8, '#ffffff', 0.85) +
    put(0, canal, big * 1.15, windmill(12)) +
    put(w - big * 0.62, canal, big * 0.78, windmill(-8)) +
    tulips(w, h, canal)
  );
}

// A windmill about 0.6 across and 1 tall with its sails: a tapered thatched tower, lit
// on its left, on a brick foot, a gallery with a rail, a door and windows, a cap, and
// four sails turned by `turn` degrees, two of them hung with cloth.
function windmill(turn) {
  const sail = (cloth) =>
    `<rect x="0.1" y="-0.045" width="0.36" height="0.09" fill="${cloth ? '#f3ecdc' : '#f3ecdc33'}" stroke="#a8907c" stroke-width="0.008"/>` +
    '<path d="M0.16 -0.045V0.045M0.22 -0.045V0.045M0.28 -0.045V0.045M0.34 -0.045V0.045M0.4 -0.045V0.045" stroke="#a8907c" stroke-width="0.007"/>' +
    '<path d="M0.02 0H0.47" stroke="#8a7464" stroke-width="0.016" stroke-linecap="round"/>';
  return (
    '<path d="M0.12 0L0.2 -0.56H0.3V0Z" fill="#a1b5a8"/><path d="M0.3 0V-0.56H0.4L0.48 0Z" fill="#88a093"/>' +
    '<path d="M0.175 -0.03L0.225 -0.53M0.235 -0.03L0.26 -0.53M0.365 -0.03L0.34 -0.53M0.425 -0.03L0.375 -0.53" stroke="#7d9487" stroke-width="0.006"/>' +
    '<path d="M0.115 0L0.121 -0.045H0.479L0.485 0Z" fill="#b98a7a"/>' +
    '<rect x="0.06" y="-0.27" width="0.48" height="0.03" fill="#6f8578"/>' +
    '<path d="M0.07 -0.315H0.53M0.09 -0.27V-0.315M0.17 -0.27V-0.315M0.25 -0.27V-0.315M0.35 -0.27V-0.315M0.43 -0.27V-0.315M0.51 -0.27V-0.315" stroke="#6f8578" stroke-width="0.008"/>' +
    '<path d="M0.26 0V-0.1A0.04 0.04 0 0 1 0.34 -0.1V0Z" fill="#6f8578"/>' +
    '<rect x="0.28" y="-0.42" width="0.04" height="0.05" fill="#f3ecdc"/><rect x="0.21" y="-0.17" width="0.035" height="0.045" fill="#f3ecdc"/>' +
    '<path d="M0.17 -0.56Q0.22 -0.67 0.3 -0.69V-0.56Z" fill="#7d9487"/><path d="M0.3 -0.69Q0.38 -0.67 0.43 -0.56H0.3Z" fill="#62786b"/>' +
    `<g transform="translate(0.3 -0.6) rotate(${45 + turn})">${[0, 90, 180, 270].map((a, i) => `<g transform="rotate(${a})">${sail(i % 2 === 0)}</g>`).join('')}</g>` +
    '<circle cx="0.3" cy="-0.6" r="0.028" fill="#6f8578"/><circle cx="0.295" cy="-0.605" r="0.01" fill="#a1b5a8"/>'
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
// their tips, a taller roof behind, posts with gold capitals along its front, and a
// lit doorway up a few steps, and lit windows.
const WAT = [
  '<path d="M0.24 -0.5 L0.5 -0.97 L0.76 -0.5Z" fill="#251d42" stroke="#d9a441" stroke-width="0.012" stroke-linejoin="round"/>',
  '<rect x="0.03" y="-0.07" width="0.94" height="0.07" fill="#251d42"/>',
  '<path d="M0.03 -0.07H0.97" stroke="#d9a441" stroke-width="0.008"/>',
  '<rect x="0.15" y="-0.3" width="0.7" height="0.23" fill="#2c2350"/>',
  ...[0.17, 0.3, 0.665, 0.795].map((x) => `<rect x="${x}" y="-0.29" width="0.03" height="0.22" fill="#3b2f69"/><rect x="${x - 0.008}" y="-0.3" width="0.046" height="0.018" fill="#d9a441"/>`),
  '<path d="M0.04 -0.27 L0.96 -0.27 L0.83 -0.4 L0.17 -0.4Z" fill="#251d42"/>',
  '<path d="M0.04 -0.27 L0.17 -0.4 M0.96 -0.27 L0.83 -0.4 M0.04 -0.27 H0.96" fill="none" stroke="#d9a441" stroke-width="0.01"/>',
  '<path d="M0.08 -0.38 L0.5 -0.84 L0.92 -0.38 L0.86 -0.4 L0.5 -0.78 L0.14 -0.4Z" fill="#d9a441"/>',
  '<path d="M0.14 -0.4 L0.5 -0.78 L0.86 -0.4Z" fill="#30265a"/>',
  '<path d="M0.26 -0.33 L0.5 -0.62 L0.74 -0.33Z" fill="#3b2f69" stroke="#d9a441" stroke-width="0.014"/>',
  '<path d="M0.5 -0.56 L0.53 -0.5 L0.5 -0.44 L0.47 -0.5Z" fill="#d9a441"/>',
  '<path d="M0.5 -0.84 C0.49 -0.92 0.55 -0.96 0.6 -0.92 M0.08 -0.38 C0.04 -0.37 0.02 -0.41 0.03 -0.45 M0.92 -0.38 C0.96 -0.37 0.98 -0.41 0.97 -0.45" fill="none" stroke="#d9a441" stroke-width="0.016" stroke-linecap="round"/>',
  '<path d="M0.45 -0.07 V-0.19 Q0.5 -0.25 0.55 -0.19 V-0.07Z" fill="#ffc96a"/>',
  '<path d="M0.42 0 H0.58 L0.565 -0.025 H0.435Z M0.435 -0.035 H0.565 L0.555 -0.06 H0.445Z" fill="#3b2f69"/>',
  '<rect x="0.225" y="-0.22" width="0.05" height="0.08" fill="#ffc96a" opacity="0.85"/>',
  '<rect x="0.355" y="-0.22" width="0.05" height="0.08" fill="#ffc96a" opacity="0.7"/>',
  '<rect x="0.595" y="-0.22" width="0.05" height="0.08" fill="#ffc96a" opacity="0.7"/>',
  '<rect x="0.725" y="-0.22" width="0.05" height="0.08" fill="#ffc96a" opacity="0.85"/>',
].join('');

// A chedi, 0.6 across: a stepped base edged in gold, the bell with gold bands, and a
// ringed spire with a gold tip.
const CHEDI = [
  '<rect x="0" y="-0.06" width="0.6" height="0.06" fill="#251d42"/>',
  '<rect x="0.06" y="-0.12" width="0.48" height="0.06" fill="#2c2350"/>',
  '<rect x="0.11" y="-0.18" width="0.38" height="0.06" fill="#251d42"/>',
  '<path d="M0 -0.06H0.6M0.06 -0.12H0.54M0.11 -0.18H0.49" stroke="#d9a441" stroke-width="0.008"/>',
  '<path d="M0.1 -0.18 C0.08 -0.38 0.18 -0.52 0.3 -0.54 C0.42 -0.52 0.52 -0.38 0.5 -0.18Z" fill="#2c2350" stroke="#d9a441" stroke-width="0.012"/>',
  '<path d="M0.098 -0.24 Q0.3 -0.215 0.502 -0.24 M0.11 -0.32 Q0.3 -0.295 0.49 -0.32" fill="none" stroke="#d9a441" stroke-width="0.01"/>',
  '<path d="M0.16 -0.25 C0.16 -0.38 0.22 -0.47 0.28 -0.5" fill="none" stroke="#4a3d80" stroke-width="0.02" stroke-linecap="round"/>',
  '<rect x="0.25" y="-0.6" width="0.1" height="0.06" fill="#251d42" stroke="#d9a441" stroke-width="0.008"/>',
  '<path d="M0.265 -0.6 L0.3 -1.08 L0.335 -0.6Z" fill="#2c2350"/>',
  '<path d="M0.268 -0.66 H0.332 M0.274 -0.73 H0.326 M0.28 -0.8 H0.32 M0.286 -0.87 H0.314 M0.291 -0.94 H0.309" stroke="#d9a441" stroke-width="0.012"/>',
  '<circle cx="0.3" cy="-1.08" r="0.012" fill="#f3d78e"/>',
].join('');

// World key → picture.
const SCENES = {
  home,
  gate: china, pair: korea, discus: greece, aurora: canada, sundial: egypt, lasso: usa, boomerang: australia,
  mirror: france, canal: italy, ice: russia, encierro: spain, dial: mexico, vine: brazil, lantern: thailand,
  bell: uk, wall: germany, tunnel: turkiye, diagonal: india, samurai: japan, mondrian: netherlands,
};
