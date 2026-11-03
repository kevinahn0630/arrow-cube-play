// The climb's picture (the 이벤트 tab, economy.js CLIMB): a winding path up from a tree,
// through the sky and the stratosphere, into space, with a stop for each reward every
// CLIMB_STEP points and the cube where the season's points have got to. An SVG string,
// CLIMB_W by CLIMB_H, drawn in the flat pastel way of scenery.js. The four zones are a
// quarter of the height each, and carry no names (2026-11-04 user request).
import { CLIMB, CLIMB_STEP } from './economy.js';
import { rewardIcon } from './icons.js';

export const CLIMB_W = 375;
export const CLIMB_H = 2600;
const W = CLIMB_W;
const H = CLIMB_H;
const f1 = (v) => +v.toFixed(1);
// The stops, from the bottom up, swinging from side to side.
const STOPS = CLIMB.map((_, i) => [187.5 + 100 * Math.sin(i * 0.95), H - 130 - (i * (H - 260)) / (CLIMB.length - 1)]);
// The path through them as cubic Béziers (Catmull-Rom), from a start on the grass high
// enough for the cube to show whole at no points.
const PTS = [[187.5, H - 44], ...STOPS];
const SEGS = PTS.slice(0, -1).map((p1, i) => {
  const p0 = PTS[Math.max(0, i - 1)];
  const p2 = PTS[i + 1];
  const p3 = PTS[Math.min(PTS.length - 1, i + 2)];
  return [p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2];
});
const pathOf = (segs) => `M${segs[0][0].map(f1).join(' ')}` + segs.map((s) => `C${s.slice(1).map((p) => p.map(f1).join(' ')).join(' ')}`).join('');
// A Bézier cut at t: its first part.
function cut([a, b, c, e], t) {
  const at = (p, q) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const ab = at(a, b);
  const bc = at(b, c);
  const abc = at(ab, bc);
  const bce = at(bc, at(c, e));
  return [a, ab, abc, at(abc, bce)];
}
// An icon (an <svg> string) placed in the picture.
const place = (svg, x, y, s) => svg.replace(/^<svg( class="[^"]*")?/, `<svg x="${f1(x)}" y="${f1(y)}" width="${s}" height="${s}"`);

// What stays the same: the sky darkening upward, space's stars, moon and ringed planet,
// the stratosphere's bands and weather balloon, the sky's clouds, birds and hot-air
// balloon, and the tree on its hills.
function backdrop() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let stars = '';
  for (let i = 0; i < 70; i++) {
    const y = rnd() * 820;
    stars += `<circle cx="${f1(rnd() * W)}" cy="${f1(y)}" r="${f1(0.6 + rnd() * 1.1)}" fill="#fff" opacity="${f1(0.95 - (y / 820) * 0.7)}"/>`;
  }
  const cloud = (x, y, w, o = 0.9) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${f1(w * 0.2)}" rx="${f1(w * 0.1)}" fill="#fff" opacity="${o}"/><rect x="${f1(x + w * 0.2)}" y="${f1(y - w * 0.1)}" width="${f1(w * 0.45)}" height="${f1(w * 0.2)}" rx="${f1(w * 0.1)}" fill="#fff" opacity="${o}"/>`;
  const bird = (x, y) => `<path d="M${x} ${y}q3 -2.5 6 1q3 -3.5 6 -1" fill="none" stroke="#8d7f9e" stroke-width="1.4" stroke-linecap="round"/>`;
  return `<defs>
      <linearGradient id="climbSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#15183a"/><stop offset="0.19" stop-color="#262c5f"/><stop offset="0.3" stop-color="#4a5ba3"/>
        <stop offset="0.47" stop-color="#8fb1e6"/><stop offset="0.6" stop-color="#c3dff4"/><stop offset="0.74" stop-color="#e4f1f3"/>
        <stop offset="0.84" stop-color="#f8efe8"/><stop offset="1" stop-color="#f6e2da"/>
      </linearGradient>
      <linearGradient id="climbBand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6b9d2" stop-opacity="0"/><stop offset="0.5" stop-color="#f6b9d2" stop-opacity="0.35"/><stop offset="1" stop-color="#b7c3ff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#climbSky)"/>
    ${stars}
    <circle cx="78" cy="96" r="30" fill="#f4efdb"/><circle cx="68" cy="88" r="6" fill="#e6dfc3"/><circle cx="88" cy="106" r="4.5" fill="#e6dfc3"/><circle cx="84" cy="84" r="3" fill="#e6dfc3"/>
    <ellipse cx="298" cy="318" rx="52" ry="12" fill="none" stroke="#d9cdfb" stroke-width="4" transform="rotate(-16 298 318)" opacity="0.8"/>
    <circle cx="298" cy="318" r="28" fill="#b6a5ea"/><path d="M272 330 a28 28 0 0 0 52 -8" fill="none" stroke="#a594de" stroke-width="5" opacity="0.6"/>
    <path d="M249 335 a52 12 -16 0 0 101 -29" fill="none" stroke="#d9cdfb" stroke-width="4" opacity="0.9"/>
    <path d="M232 520 l46 -22" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <path d="M0 930 C 90 880 200 980 375 900 L375 960 C 220 1030 110 930 0 990Z" fill="url(#climbBand)"/>
    <path d="M0 1090 C 120 1050 240 1140 375 1080 L375 1120 C 230 1170 120 1090 0 1130Z" fill="url(#climbBand)" opacity="0.7"/>
    <line x1="318" y1="1012" x2="318" y2="1046" stroke="#fff" stroke-width="1.2" opacity="0.8"/><circle cx="318" cy="996" r="17" fill="#fff" opacity="0.92"/><rect x="313" y="1046" width="10" height="7" rx="1.5" fill="#fff" opacity="0.92"/>
    ${cloud(40, 1420, 110)}${cloud(250, 1500, 90, 0.85)}${cloud(20, 1660, 80, 0.8)}${cloud(240, 1760, 120)}${cloud(120, 1880, 70, 0.75)}
    ${bird(300, 1880)}${bird(318, 1868)}${bird(286, 1862)}
    <g transform="translate(70 1560)"><path d="M0 -38 C 26 -38 34 -12 22 6 L 9 22 H -9 L -22 6 C -34 -12 -26 -38 0 -38Z" fill="#f4a493"/><path d="M0 -38 C 10 -38 13 -12 8 6 L 4 22 H -4 L -8 6 C -13 -12 -10 -38 0 -38Z" fill="#fbd3c7"/><line x1="-8" y1="22" x2="-6" y2="32" stroke="#a98d80" stroke-width="1.2"/><line x1="8" y1="22" x2="6" y2="32" stroke="#a98d80" stroke-width="1.2"/><rect x="-7" y="32" width="14" height="9" rx="2" fill="#c9a184"/></g>
    <path d="M0 2455 C 90 2425 170 2470 260 2448 S 350 2430 375 2440 V${H} H0Z" fill="#d3ead2"/>
    <path d="M0 2515 C 110 2495 220 2535 375 2505 V${H} H0Z" fill="#bddfc3"/>
    <rect x="58" y="2390" width="20" height="120" rx="6" fill="#c9a184"/>
    <circle cx="68" cy="2372" r="54" fill="#a3d8b2"/><circle cx="36" cy="2404" r="34" fill="#8fcda1"/><circle cx="102" cy="2398" r="38" fill="#8fcda1"/><circle cx="54" cy="2350" r="18" fill="#bfe5c9"/>
    <rect x="322" y="2440" width="10" height="46" rx="4" fill="#c9a184"/><circle cx="327" cy="2430" r="26" fill="#9fd5af"/>
    <circle cx="150" cy="2540" r="3" fill="#f4a493"/><circle cx="210" cy="2556" r="3" fill="#f7c873"/><circle cx="270" cy="2532" r="3" fill="#f4a493"/>`;
}
const BACKDROP = backdrop();

// The path walked to `points`, as Béziers ending where the cube stands.
function walkedTo(points) {
  const reached = Math.min(CLIMB.length, Math.floor(points / CLIMB_STEP));
  return [...SEGS.slice(0, reached), ...(reached < SEGS.length ? [cut(SEGS[reached], (points - reached * CLIMB_STEP) / CLIMB_STEP)] : [])];
}
// That path as SVG path data (game.js measures it to walk the cube up).
export const climbTrail = (points) => pathOf(walkedTo(points));

// The picture with `points` reached: the path walked so far in the accent colour, each
// reward passed ticked, the next one ringed, and the cube with the points still to go.
// Returns it with the cube's height in the picture, to scroll it into view. The walked
// path (.walked), the stops (.stop, each with its .ring and, once passed, its .tick) and
// the cube (.climber) are marked for game.js to animate.
export function climbArt(points) {
  const reached = Math.min(CLIMB.length, Math.floor(points / CLIMB_STEP));
  const walked = walkedTo(points);
  const here = walked.at(-1)[3];
  const stops = STOPS.map(([x, y], i) => {
    const r = i % 5 === 4 ? 27 : 22; // the last stop of each zone is bigger
    const got = i < reached;
    const next = i === reached;
    const dark = y < H / 2;
    const [kind, n] = CLIMB[i];
    const label = kind === 'coins' ? n.toLocaleString('ko-KR') : n > 1 ? `×${n}` : '';
    return `<g class="stop" data-i="${i}" transform="translate(${f1(x)} ${f1(y)})">
      ${next ? `<circle r="${r + 8}" fill="none" stroke="#e2786a" stroke-opacity="0.35" stroke-width="3"/>` : ''}
      <circle class="ring" r="${r}" fill="#fff" fill-opacity="${got || next || !dark ? 1 : 0.88}" stroke="${got || next ? '#e2786a' : '#f0dcd8'}" stroke-width="${next ? 3 : 2.2}"/>
      ${place(rewardIcon(kind), -r * 0.62, -r * 0.62, f1(r * 1.24))}
      ${got ? `<g class="tick"><circle cx="${f1(r * 0.72)}" cy="${f1(-r * 0.72)}" r="8" fill="#e2786a"/><path d="M${f1(r * 0.72 - 3.6)} ${f1(-r * 0.72)}l2.4 2.4 4.6-4.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>` : ''}
      ${label ? `<text y="${r + 15}" text-anchor="middle" font-size="12" font-weight="800" fill="${dark ? '#fff' : '#5a4862'}">${label}</text>` : ''}
    </g>`;
  }).join('');
  const toGo = reached < CLIMB.length ? `다음까지 ${(reached + 1) * CLIMB_STEP - points}` : '';
  const flip = here[0] > W - 130; // the note goes on the side with room
  const cube = `<g class="climber" transform="translate(${f1(here[0])} ${f1(here[1])})">
      <use href="#cubeLogo" x="-17" y="-38" width="34" height="41"/>
      ${toGo ? `<g transform="translate(${flip ? -110 : 26} -26)"><rect y="-13" width="84" height="26" rx="13" fill="#fff"/><text x="42" y="4.5" text-anchor="middle" font-size="12" font-weight="800" fill="#e2786a">${toGo}</text></g>` : ''}
    </g>`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${BACKDROP}
    <path d="${pathOf(SEGS)}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 11" opacity="0.95"/>
    ${points > 0 ? `<path class="walked" d="${pathOf(walked)}" fill="none" stroke="#e2786a" stroke-width="5" stroke-linecap="round"/>` : ''}
    ${stops}${cube}</svg>`;
  return { svg, y: here[1] };
}
