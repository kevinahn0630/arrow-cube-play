// Small icons (SVG strings). The items and what the shop sells are drawn like toys, soft
// and rounded with a lighter and a darker side and no outline (2026-11-03 user pick, 안 1
// of dist/samples/icons.html); the rest are in the line style of the home button: round
// caps, strokes in currentColor. The coin is gold with the game's up arrow.
const COIN = '<circle cx="10" cy="10" r="9.3" fill="#efb245"/><circle cx="10" cy="10" r="7" fill="#f8cb63" stroke="#fde4a3" stroke-width="1.2"/><path d="M10 13.7V6.8M7.3 9.4 10 6.7l2.7 2.7" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>';
// A coin with a white rim, so coins lying on each other stay apart.
const coinAt = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="10" cy="10" r="10" fill="#fff"/>${COIN}</g>`;
const toy = (body) => `<svg class="toy" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
const line = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BULB = 'M24 9c-7 0-12 5.1-12 11.6 0 4.3 2.1 7 4.2 9.1 1.4 1.4 2.1 2.8 2.1 4.4v1.2h11.4v-1.2c0-1.6.7-3 2.1-4.4 2.1-2.1 4.2-4.8 4.2-9.1C36 14.1 31 9 24 9Z';

export const ICON = {
  coin: `<svg class="coin" viewBox="0 0 20 20" aria-hidden="true">${COIN}</svg>`,
  // A lit bulb, and an eraser half pink, half in its blue sleeve.
  hint: toy(`<circle cx="24" cy="20" r="18" fill="#ffe68a" opacity="0.45"/>
    <path d="M24 3.4v3.4M9.4 8.6l2.4 2.4M38.6 8.6l-2.4 2.4M4.2 20.4h3.4M40.4 20.4h3.4" stroke="#ffc23a" stroke-width="2.8" stroke-linecap="round"/>
    <path d="${BULB}" fill="#f4b23c"/><path d="${BULB}" fill="#ffd859" transform="translate(1.4 1.2) scale(0.93)"/>
    <path d="M17.4 18.4c.8-3.2 3.4-5.6 6.6-6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="16.9" cy="22.4" r="1.4" fill="#fff"/>
    <rect x="18.2" y="35.4" width="11.6" height="4.4" rx="2.2" fill="#9eabd0"/><rect x="19" y="39.2" width="10" height="4.2" rx="2.1" fill="#8291bb"/>
    <path d="M21.6 44.6h4.8" stroke="#6b79a3" stroke-width="2.4" stroke-linecap="round"/>`),
  eraser: toy(`<ellipse cx="24" cy="41.5" rx="15" ry="3" fill="#4a3f5c" opacity="0.12"/>
    <g transform="rotate(-30 24 24)">
      <rect x="6" y="21" width="22" height="13" rx="4" fill="#e9849b"/><rect x="6" y="13" width="22" height="11" rx="4" fill="#f8b2c2"/>
      <path d="M24 21h14a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4H24Z" fill="#7f9de6"/><path d="M24 13h14a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4H24Z" fill="#aac1f7"/>
      <path d="M10.4 16.6h8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/><path d="M28 16.6h8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.55"/>
    </g>
    <circle cx="8.6" cy="37.6" r="1.7" fill="#f4a5b7"/><circle cx="12.8" cy="40.6" r="1.2" fill="#f4a5b7"/>`),
  // An AD sign struck out, and the daily gift's box.
  noads: toy(`<rect x="5" y="11.5" width="38" height="27" rx="8" fill="#e46f5e"/><rect x="5" y="9" width="38" height="27" rx="8" fill="#f68c7c"/>
    <path d="M12.5 14.6h23" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.35"/>
    <path d="M13.4 30 18.4 16.8 23.4 30M15.4 25.4h6" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M27.2 16.8V30h2.4c4.2 0 6.6-2.4 6.6-6.6s-2.4-6.6-6.6-6.6Z" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M8 42 41 7" stroke="#fff" stroke-width="8.4" stroke-linecap="round"/><path d="M8 42 41 7" stroke="#5a4862" stroke-width="3.6" stroke-linecap="round"/>`),
  gift: toy(`<ellipse cx="24" cy="43.2" rx="15" ry="2.8" fill="#4a3f5c" opacity="0.12"/>
    <rect x="9" y="22" width="30" height="20" rx="3.5" fill="#f28d7f"/><path d="M31 22h4.5a3.5 3.5 0 0 1 3.5 3.5v13a3.5 3.5 0 0 1-3.5 3.5H31Z" fill="#e37465"/>
    <rect x="21" y="22" width="6" height="20" fill="#ffd45a"/><rect x="6.5" y="15" width="35" height="9.5" rx="3.5" fill="#f8a698"/><rect x="21" y="15" width="6" height="9.5" fill="#ffe28e"/>
    <path d="M10.6 18.2h7" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
    <path d="M24 15c-4-6.8-11.4-6.2-9.9-2 1 2.6 5.9 2.4 9.9 2Zm0 0c4-6.8 11.4-6.2 9.9-2-1 2.6-5.9 2.4-9.9 2Z" fill="#ffd45a" stroke="#eaa92a" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="24" cy="15" r="2.6" fill="#f2ae36"/>`),
  // The coin packs: one coin, two, a little pile of three.
  packs: [
    `<svg viewBox="0 0 44 36" aria-hidden="true">${coinAt(10, 4, 1.4)}</svg>`,
    `<svg viewBox="0 0 44 36" aria-hidden="true">${coinAt(4, 9, 1.25)}${coinAt(15, 3, 1.25)}</svg>`,
    `<svg viewBox="0 0 44 36" aria-hidden="true">${coinAt(2, 11, 1.15)}${coinAt(19, 11, 1.15)}${coinAt(10.5, 0.5, 1.15)}</svg>`,
  ],
  // The home screen's tabs, the shop page's way back, and the climb's marks.
  shop: line('M5.6 8.6h12.8l-1 11a1.7 1.7 0 0 1-1.7 1.5H8.3a1.7 1.7 0 0 1-1.7-1.5ZM9 8.6V7.2a3 3 0 0 1 6 0v1.4'),
  home: line('M3.8 11.3 12 4.6l8.2 6.7M6.4 9.6v9.6c0 .7.5 1.2 1.2 1.2h2.9v-5h3v5h2.9c.7 0 1.2-.5 1.2-1.2V9.6'),
  flag: line('M6 21V3.8M6 4.6c3.1-1.7 5.6 1.5 8.7 0 1.2-.6 2.2-.7 3.3-.4v8.6c-1.1-.3-2.1-.2-3.3.4-3.1 1.5-5.6-1.7-8.7 0'),
  back: line('M14.8 5.4 8.2 12l6.6 6.6'),
  flame: line('M12 21c-3.5 0-5.9-2.3-5.9-5.4 0-3.3 2.6-4.9 3.4-7.7.7 1.5 1.5 2.4 2.5 2.8.2-2.7 1.5-5.3 4-7 0 2.9.9 4.6 2 6.3.9 1.4 1.4 2.7 1.4 4.3 0 3.6-2.7 6.7-7.4 6.7Z'),
  check: line('M5.5 12.5l4.2 4.2 8.8-9.2'),
  ad: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.2 9.3v5.4l4.5-2.7Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.8-4.6-7.8-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.8 2.5c0 5.6-7.8 10.2-7.8 10.2Z" fill="currentColor"/></svg>',
  restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5a7 7 0 1 0 2.3-5.2M7.6 3.4v4.2h4.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5.5M12 7.6v.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};
// What a reward (economy.js: ['coins' | 'hint' | 'eraser', n]) is drawn with.
export const rewardIcon = (kind) => (kind === 'coins' ? ICON.coin : ICON[kind]);
