// World icons: each country's flag as a small SVG, all 3:2 so they line up (flags of
// another shape are cropped or laid out again to fit, and the finest details, like an
// emblem or fifty stars, become a simple mark or a field of dots), and a house for
// home. Plain strings, for the home screen, the world menu and the HUD.

let uid = 0; // clip path ids, unique on the page

const svg = (body, viewBox = '0 0 30 20') => `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

// Equal bands across (top to bottom) or, with `down`, side by side (hoist to fly). A
// colour listed twice in a row is one wider band (no seam between the two).
const bands = (colours, down = false) => {
  const n = colours.length;
  let out = '';
  for (let i = 0; i < n; ) {
    let j = i + 1;
    while (j < n && colours[j] === colours[i]) j++;
    const [at, size] = down ? [(30 * i) / n, (30 * (j - i)) / n] : [(20 * i) / n, (20 * (j - i)) / n];
    out += down
      ? `<rect x="${at.toFixed(3)}" width="${(size + 0.02).toFixed(3)}" height="20" fill="${colours[i]}"/>`
      : `<rect y="${at.toFixed(3)}" width="30" height="${(size + 0.02).toFixed(3)}" fill="${colours[i]}"/>`;
    i = j;
  }
  return out;
};

// A star of n points round (cx, cy), outer radius R and inner r, its first point
// towards angle a (radians; the default points up).
function star(cx, cy, R, r, n = 5, a = -Math.PI / 2) {
  const pts = [];
  for (let k = 0; k < 2 * n; k++) {
    const d = k % 2 ? r : R;
    const t = a + (k * Math.PI) / n;
    pts.push(`${(cx + d * Math.cos(t)).toFixed(2)},${(cy + d * Math.sin(t)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}"/>`;
}
const FIVE = 0.382; // inner to outer radius of a regular five-pointed star

// The Union Jack (drawn 2:1, its counterchanged red saltire clipped to triangles) in
// the box x, y, w, h, cropped to fill it.
function unionJack(x, y, w, h) {
  const id = `uj${uid++}`;
  return (
    `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice">` +
    `<clipPath id="${id}"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>` +
    `<rect width="60" height="30" fill="#012169"/>` +
    `<path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>` +
    `<path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#${id})" stroke="#C8102E" stroke-width="4"/>` +
    `<path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/>` +
    `<path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/>` +
    `</svg>`
  );
}

// Korea's three-bar trigrams, as bars at these distances from the middle.
const bars = (ys) => ys.map((y) => `M-6 ${y}H6`).join('');

const FLAGS = {
  // 🏠 a house on the home world's indigo
  home: () =>
    svg(
      `<rect width="30" height="20" fill="#5b6cff"/>` +
        `<path d="M15 3.4 L23.4 10.2 H20.8 V16.6 H9.2 V10.2 H6.6 Z" fill="#fff"/>` +
        `<rect x="13.5" y="11.6" width="3" height="5" rx="0.6" fill="#5b6cff"/>`,
    ),
  // China: the big star and four small ones, each pointing at it
  gate: () =>
    svg(
      `<rect width="30" height="20" fill="#EE1C25"/><g fill="#FFFF00">` +
        star(5, 5, 3, 3 * FIVE) +
        [[10, 2], [12, 4], [12, 7], [10, 9]].map(([x, y]) => star(x, y, 1, FIVE, 5, Math.atan2(5 - y, 5 - x))).join('') +
        `</g>`,
    ),
  // Korea: the taegeuk along the flag's diagonal, ☰ ☵ ☲ ☷ in the corners
  pair: () =>
    svg(
      `<rect x="-36" y="-24" width="72" height="48" fill="#fff"/>` +
        `<g transform="rotate(-56.3099)">` +
        `<path d="${bars([-25, -22, -19])}${bars([19, 22, 25])}" stroke="#000" stroke-width="2"/>` +
        `<path d="M0 17v10" stroke="#fff" stroke-width="1"/>` +
        `<circle r="12" fill="#CD2E3A"/>` +
        `<path d="M0-12A6 6 0 0 0 0 0A6 6 0 0 1 0 12A12 12 0 0 1 0-12z" fill="#0047A0"/>` +
        `</g>` +
        `<g transform="rotate(-123.6901)">` +
        `<path d="${bars([-25, -22, -19])}${bars([19, 22, 25])}" stroke="#000" stroke-width="2"/>` +
        `<path d="M0-23.5v3M0 17v3.5M0 23.5v3" stroke="#fff" stroke-width="1"/>` +
        `</g>`,
      '-36 -24 72 48',
    ),
  mirror: () => svg(bands(['#0055A4', '#fff', '#EF4135'], true)), // France
  bell: () => svg(unionJack(0, 0, 30, 20)), // the United Kingdom
  // Greece: nine stripes, the cross on a square canton
  discus: () => {
    const s = 20 / 9;
    let out = `<rect width="30" height="20" fill="#fff"/>`;
    for (let i = 0; i < 9; i += 2) out += `<rect y="${(i * s).toFixed(3)}" width="30" height="${(s + 0.02).toFixed(3)}" fill="#0D5EAF"/>`;
    const c = 5 * s;
    out += `<rect width="${c}" height="${c}" fill="#0D5EAF"/>`;
    out += `<rect y="${2 * s}" width="${c}" height="${s}" fill="#fff"/><rect x="${2 * s}" width="${s}" height="${c}" fill="#fff"/>`;
    return svg(out);
  },
  // Canada: the maple leaf on the white square
  aurora: () =>
    svg(
      `<rect width="30" height="20" fill="#fff"/>` +
        `<rect width="7.5" height="20" fill="#D80621"/><rect x="22.5" width="7.5" height="20" fill="#D80621"/>` +
        `<path transform="translate(15 10.2) scale(0.135) translate(-50 -50)" fill="#D80621" d="M50 2 L57 16 L65 12 L61 38 L75 24 L78 33 L94 30 L88 47 L96 51 L70 72 L74 82 L52 79 L53 98 L47 98 L48 79 L26 82 L30 72 L4 51 L12 47 L6 30 L22 33 L25 24 L39 38 L35 12 L43 16 Z"/>`,
    ),
  belt: () => svg(bands(['#000', '#DD0000', '#FFCE00'])), // Germany
  // Türkiye: the crescent and the star pointing back at it
  tunnel: () =>
    svg(
      `<rect width="30" height="20" fill="#E30A17"/>` +
        `<circle cx="10" cy="10" r="5" fill="#fff"/><circle cx="11.25" cy="10" r="4" fill="#E30A17"/>` +
        `<g fill="#fff">${star(16.42, 10, 2.5, 2.5 * FIVE, 5, Math.PI)}</g>`,
    ),
  // Egypt: the golden eagle, simplified
  sundial: () =>
    svg(
      bands(['#CE1126', '#fff', '#000']) +
        `<g fill="#C09300">` +
        `<circle cx="15" cy="7.9" r="0.55"/>` +
        `<path d="M14.45 8.4 H15.55 L15.75 11.2 H14.25 Z"/>` +
        `<path d="M14.4 8.7 L12.2 8.3 L12.7 9.6 L13.4 10.9 L14.4 11 Z"/>` +
        `<path d="M15.6 8.7 L17.8 8.3 L17.3 9.6 L16.6 10.9 L15.6 11 Z"/>` +
        `<rect x="13.9" y="11.4" width="2.2" height="0.7"/>` +
        `</g>`,
    ),
  // the United States: thirteen stripes, the stars as dots in their rows
  lasso: () => {
    const s = 20 / 13;
    let out = `<rect width="30" height="20" fill="#fff"/>`;
    for (let i = 0; i < 13; i += 2) out += `<rect y="${(i * s).toFixed(3)}" width="30" height="${(s + 0.02).toFixed(3)}" fill="#B22234"/>`;
    const ch = 7 * s;
    const cw = 12;
    out += `<rect width="${cw}" height="${ch.toFixed(3)}" fill="#3C3B6E"/><g fill="#fff">`;
    for (let row = 0; row < 9; row++) {
      const odd = row % 2;
      for (let j = 0; j < (odd ? 5 : 6); j++) {
        out += `<circle cx="${(((odd ? 2 : 1) + 2 * j) * cw / 12).toFixed(2)}" cy="${(((row + 1) * ch) / 10).toFixed(2)}" r="0.42"/>`;
      }
    }
    return svg(`${out}</g>`);
  },
  // Mexico: the eagle on its cactus, simplified
  dial: () =>
    svg(
      bands(['#006847', '#fff', '#CE1126'], true) +
        `<path d="M12.7 11.1 Q15 13.7 17.3 11.1" fill="none" stroke="#3E7B2F" stroke-width="0.6"/>` +
        `<path d="M14.2 11.2 Q13.5 9.5 14.5 8.4 Q15.4 7.5 16.3 8.2 Q15.5 8.6 15.8 9.4 L16.8 10.3 Q15.7 10.4 15.7 11.2 Z" fill="#8B5A2B"/>` +
        `<path d="M14.1 11.5 H15.9" stroke="#3E7B2F" stroke-width="0.55"/>`,
    ),
  // Australia: the Union Jack, the Commonwealth Star and the Southern Cross
  boomerang: () =>
    svg(
      `<rect width="30" height="20" fill="#012169"/>` +
        unionJack(0, 0, 15, 10) +
        `<g fill="#fff">` +
        star(7.5, 15, 3, 3 * (4 / 9), 7) +
        [[22.5, 16.67], [18.75, 8.75], [22.5, 3.33], [25.87, 7.42]].map(([x, y]) => star(x, y, 1.43, 1.43 * (4 / 9), 7)).join('') +
        star(24, 10.83, 0.83, 0.83 * FIVE) +
        `</g>`,
    ),
  canal: () => svg(bands(['#009246', '#fff', '#CE2B37'], true)), // Italy
  eagle: () => svg(bands(['#fff', '#0039A6', '#D52B1E'])), // Russia
  encierro: () => svg(bands(['#AA151B', '#F1BF00', '#F1BF00', '#AA151B'])), // Spain
  // Brazil: the globe with its band and a few stars
  vine: () =>
    svg(
      `<rect width="30" height="20" fill="#009C3B"/>` +
        `<path d="M15 1.7 L28.3 10 L15 18.3 L1.7 10 Z" fill="#FFDF00"/>` +
        `<circle cx="15" cy="10" r="3.5" fill="#002776"/>` +
        `<path d="M11.6 10.6 Q15 8.2 18.45 9.9" fill="none" stroke="#fff" stroke-width="0.75"/>` +
        `<g fill="#fff">` +
        [[13.4, 11.7], [15.2, 12.3], [16.7, 11.5], [14.3, 12.9], [17.2, 12.5], [12.9, 12.4], [15.9, 13.2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.22"/>`).join('') +
        `</g>`,
    ),
  lantern: () => svg(bands(['#A51931', '#F4F5F8', '#2D2A4A', '#2D2A4A', '#F4F5F8', '#A51931'])), // Thailand
  // India: the chakra of 24 spokes
  diagonal: () => {
    let spokes = '';
    for (let k = 0; k < 12; k++) {
      const t = (k * Math.PI) / 12;
      const dx = (2.6 * Math.cos(t)).toFixed(2);
      const dy = (2.6 * Math.sin(t)).toFixed(2);
      spokes += `M${15 - dx} ${10 - dy}L${15 + Number(dx)} ${10 + Number(dy)}`;
    }
    return svg(
      bands(['#FF9933', '#fff', '#138808']) +
        `<circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width="0.4"/>` +
        `<path d="${spokes}" stroke="#000080" stroke-width="0.18"/>` +
        `<circle cx="15" cy="10" r="0.45" fill="#000080"/>`,
    );
  },
  shoji: () => svg(`<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/>`), // Japan
  windmill: () => svg(bands(['#AE1C28', '#fff', '#21468B'])), // the Netherlands
};

// The icon for a world (a key of WORLDS), as SVG markup.
export const worldIcon = (world) => (FLAGS[world] ?? FLAGS.home)();
