// Small icons (SVG strings). The items, what the shop sells, the home screen's tabs, the
// sound button, the stage's home button, the clear card's ad, a perfect clear's crown,
// a hard stage's flame, 오늘의 큐브's calendar, cups and stamps and 주간 도전 코스's medal
// and map are drawn like toys, soft and rounded with a lighter and a darker side and no
// outline (2026-11-03 user picks, dist/samples/icons.html 안 1 and tabs2.html; 2026-11-04
// clear.html 안 B; 2026-11-05 perfect.html, hard.html, daily.html and weekly.html); the rest are
// line icons: round caps, strokes in currentColor. The coin is gold with the game's up arrow.
const COIN = '<circle cx="10" cy="10" r="9.3" fill="#efb245"/><circle cx="10" cy="10" r="7" fill="#f8cb63" stroke="#fde4a3" stroke-width="1.2"/><path d="M10 13.7V6.8M7.3 9.4 10 6.7l2.7 2.7" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>';
// A coin with a white rim, so coins lying on each other stay apart.
const coinAt = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="10" cy="10" r="10" fill="#fff"/>${COIN}</g>`;
const toy = (body) => `<svg class="toy" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
const line = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BULB = 'M24 9c-7 0-12 5.1-12 11.6 0 4.3 2.1 7 4.2 9.1 1.4 1.4 2.1 2.8 2.1 4.4v1.2h11.4v-1.2c0-1.6.7-3 2.1-4.4 2.1-2.1 4.2-4.8 4.2-9.1C36 14.1 31 9 24 9Z';
const SHADOW = '<ellipse cx="24" cy="43.4" rx="15" ry="2.6" fill="#4a3f5c" opacity="0.12"/>';
// A star on a world's page: earned in gold, still to come in grey.
const star = (on) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17l-5.7 3 1.2-6.3-4.7-4.4 6.4-.8Z" fill="${on ? '#ffc93f' : '#ddd3dc'}" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.2 8.6 12 5.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="${on ? 0.8 : 0.5}"/></svg>`;
// A perfect clear's crown, a toy in gold; grey and cracked once a mistake, a hint or the
// eraser has lost it (2026-11-05, dist/samples/perfect.html 안 B).
const crown = (on) => {
  const c = on
    ? { body: '#ffcd4a', side: '#f4ad37', band: '#f0a234', bandSide: '#dd8f2a', ball: '#ffeaa6', gem: '#f68c7c' }
    : { body: '#e2d9e1', side: '#d2c6d1', band: '#c9bdc8', bandSide: '#b8abb7', ball: '#f1ecf1', gem: '#b3a6b2' };
  return `<svg class="toy crown" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M9 18 16.5 26.5 24 12 31.5 26.5 39 18 36.2 36H11.8Z" fill="${c.body}" stroke="${c.body}" stroke-width="4.6" stroke-linejoin="round"/>
    <path d="M31.5 26.5 39 18 36.2 36H29.4Z" fill="${c.side}" stroke="${c.side}" stroke-width="4.6" stroke-linejoin="round"/>
    <rect x="9.6" y="31.4" width="28.8" height="8.2" rx="3.4" fill="${c.band}"/>
    <path d="M30.6 31.4h4.4a3.4 3.4 0 0 1 3.4 3.4v1.4a3.4 3.4 0 0 1-3.4 3.4h-4.4Z" fill="${c.bandSide}"/>
    <circle cx="8.6" cy="17.4" r="3.5" fill="${c.ball}"/><circle cx="24" cy="10.8" r="3.7" fill="${c.ball}"/><circle cx="39.4" cy="17.4" r="3.5" fill="${c.ball}"/>
    <circle cx="24" cy="35.5" r="2.5" fill="${c.gem}"/><circle cx="16.2" cy="35.5" r="1.4" fill="#fff" opacity="0.75"/><circle cx="31.8" cy="35.5" r="1.4" fill="#fff" opacity="0.6"/>
    <path d="M13.8 22.6l3.4 3.8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="${on ? 0.7 : 0.5}"/>${
      on ? '' : '<path d="M25.4 14.6 22 21.6l4.4 3.2-3.6 6.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
    }</svg>`;
};
// A hard stage's flame, a toy: orange for 어려움, purple for 매우 어려움 (2026-11-05,
// dist/samples/hard.html 안 B).
const hot = (very) => {
  const c = very ? { base: '#a274e6', side: '#8253cc', inner: '#dcc4ff' } : { base: '#ff7d5a', side: '#ec5c45', inner: '#ffcd62' };
  return `<svg class="toy hot" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 4c2 7 11 11 11 22a11 11 0 0 1-22 0c0-6 3-10 6-13 0 4 1 6 3 7-1-7 0-12 2-16Z" fill="${c.base}" stroke="${c.base}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M24 4c2 7 11 11 11 22a11 11 0 0 1-8.6 10.7C30 33 31 29 30 25c-1-6-5-10-6-21Z" fill="${c.side}"/>
    <path d="M24 21c2 3 6 5 6 10a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 2 3 1-1-1-1-3 0-4Z" fill="${c.inner}" stroke="${c.inner}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M17.6 25.4c.2-2 1-3.6 2.2-5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/></svg>`;
};
// 오늘의 큐브's month cup, a toy: gold once the month is full, grey till then.
const cup = (on) => {
  const c = on ? ['#ffcd4a', '#f4ad37', '#ffeaa6'] : ['#e2d9e1', '#d2c6d1', '#f1ecf1'];
  return toy(`<path d="M14 8h20v10a10 10 0 0 1-20 0Z" fill="${c[0]}"/><path d="M28 8h6v10a10 10 0 0 1-6 9.2Z" fill="${c[1]}"/>
    <path d="M14 11H9a5 5 0 0 0 5 9M34 11h5a5 5 0 0 1-5 9" fill="none" stroke="${c[1]}" stroke-width="3" stroke-linecap="round"/>
    <rect x="21" y="27" width="6" height="7" fill="${c[1]}"/><rect x="15" y="34" width="18" height="6" rx="2.5" fill="${c[0]}"/><path d="M27 34h3.5a2.5 2.5 0 0 1 2.5 2.5v1a2.5 2.5 0 0 1-2.5 2.5H27Z" fill="${c[1]}"/>
    <path d="M18 12v6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/><circle cx="24" cy="17" r="2.6" fill="${c[2]}"/>`);
};
// 주간 도전 코스's medal: two ribbons and a disc with a star; grey until the week's seven
// stops are cleared.
const STAR = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 ? 2.4 : 5.6;
  return `${i ? 'L' : 'M'}${(23.4 + r * Math.cos(a)).toFixed(2)} ${(31 + r * Math.sin(a)).toFixed(2)}`;
}).join('');
const medal = (on) => {
  const [m, d, l] = on ? ['#ffcd4a', '#f0a92e', '#ffe9a0'] : ['#ece5ec', '#d6cbd6', '#f6f2f6'];
  return `<svg class="toy medal" viewBox="0 0 48 48" aria-hidden="true"><path d="M12.5 3h8.6l7.2 17.5h-8.6Z" fill="${on ? '#f68c7c' : '#e3d8de'}"/><path d="M35.5 3h-8.6l-7.2 17.5h8.6Z" fill="${on ? '#8291bb' : '#d8cfdb'}"/>
    <circle cx="24" cy="31" r="13.6" fill="${d}"/><circle cx="22.8" cy="30" r="12.6" fill="${m}"/><circle cx="23.4" cy="30.6" r="8.4" fill="${l}"/><path d="${STAR}Z" fill="${d}"/>
    <path d="M13.8 26.4a10 10 0 0 1 5.4-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/></svg>`;
};
// A day's stamp on 오늘의 큐브's calendar: a little cube, gold for a perfect clear.
const stamp = (gold) => {
  const [t, l, r] = gold ? ['#ffe08a', '#ffcd4a', '#f4ad37'] : ['#ffc2b6', '#f68c7c', '#e46f5e'];
  return `<svg class="stamp" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 19.4 7.7v8.6L12 20.5l-7.4-4.2V7.7Z" fill="${l}"/><path d="M12 12v8.5l7.4-4.2V7.7Z" fill="${r}"/><path d="M12 3.5 19.4 7.7 12 12 4.6 7.7Z" fill="${t}"/></svg>`;
};
// A speaker, its sound waves in gold; muted, grey with a red cross.
const speaker = (on) =>
  toy(`<path d="M7 19.4a3 3 0 0 1 3-3h5.4v15.2H10a3 3 0 0 1-3-3Z" fill="${on ? '#9eabd0' : '#c4bfd0'}"/>
    <path d="M15.4 16.4 25.6 8a1.8 1.8 0 0 1 2.9 1.4v29.2a1.8 1.8 0 0 1-2.9 1.4l-10.2-8.4Z" fill="${on ? '#8291bb' : '#aea8bf'}"/>
    <path d="M15.4 16.4 25.6 8a1.8 1.8 0 0 1 2.9 1.4V24H15.4Z" fill="${on ? '#aab6db' : '#cfcadb'}"/>
    <path d="M9.6 19.6h3.2" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    ${on
      ? '<path d="M33 18.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="#f4b23c" stroke-width="3.2" stroke-linecap="round"/><path d="M37.6 13.8a14 14 0 0 1 0 20.4" fill="none" stroke="#ffd04f" stroke-width="3.2" stroke-linecap="round"/>'
      : '<path d="M33.4 19.2l9 9.6M42.4 19.2l-9 9.6" stroke="#ef5a4c" stroke-width="3.4" stroke-linecap="round"/>'}`);

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
  // The clear card's ad, for coins ×2: the same sign as a screen with a play mark.
  tv: toy(`<rect x="5" y="11.5" width="38" height="27" rx="8" fill="#e46f5e"/><rect x="5" y="9" width="38" height="27" rx="8" fill="#f68c7c"/>
    <path d="M12.5 14.6h9" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.4"/>
    <path d="M20.6 16.4v12.2l10.4-6.1Z" fill="#fff" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/>`),
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
  // The home screen's tabs: a market stall under a striped awning, a small house (also
  // the stage's way home), and a rocket off to space as the climb goes.
  stall: toy(`${SHADOW}
    <rect x="9.5" y="18" width="29" height="23.5" rx="3" fill="#fff1e4"/><path d="M30.5 18h5a3 3 0 0 1 3 3v17.5a3 3 0 0 1-3 3h-5Z" fill="#f5dccb"/>
    <rect x="13" y="26" width="9" height="15.5" rx="2.2" fill="#c9a184"/><circle cx="20" cy="34" r="0.9" fill="#fff3d9"/>
    <rect x="25" y="26" width="9.5" height="7" rx="1.8" fill="#bfe0f5"/><path d="M26.6 28.2h3.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M5.5 11.5a3 3 0 0 1 3-2.5h31a3 3 0 0 1 3 2.5l1.3 6.8c0 2.3-1.9 3.8-4.1 3.8-1.9 0-3.4-1.2-3.9-2.9-.5 1.7-2 2.9-3.9 2.9s-3.4-1.2-3.9-2.9c-.5 1.7-2 2.9-3.9 2.9s-3.4-1.2-3.9-2.9c-.5 1.7-2 2.9-3.9 2.9s-3.4-1.2-3.9-2.9c-.5 1.7-2 2.9-3.9 2.9-2.2 0-4.1-1.5-4.1-3.8Z" fill="#f68c7c"/>
    <path d="M12.4 9h7.8l-.6 10.4c-.6 1.6-2 2.7-3.8 2.7-1.4 0-2.6-.7-3.3-1.8ZM27.8 9h7.8l.9 11.3c-.7 1.1-1.9 1.8-3.3 1.8-1.8 0-3.2-1.1-3.8-2.7Z" fill="#fff" opacity="0.92"/>
    <path d="M9 13.6h7" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`),
  house: toy(`${SHADOW}
    <rect x="30.5" y="10.5" width="5" height="9" rx="1.2" fill="#e37465"/>
    <rect x="11" y="22" width="26" height="19.5" rx="2.5" fill="#fff1e4"/><path d="M29 22h5.5a2.5 2.5 0 0 1 2.5 2.5v14.5a2.5 2.5 0 0 1-2.5 2.5H29Z" fill="#f5dccb"/>
    <rect x="19.5" y="29" width="9" height="12.5" rx="2.2" fill="#c9a184"/><circle cx="26.3" cy="35.6" r="0.9" fill="#fff3d9"/>
    <rect x="13.5" y="27.5" width="4.4" height="5" rx="1.2" fill="#bfe0f5"/>
    <path d="M7.4 23.4 22.3 9.7a2.5 2.5 0 0 1 3.4 0l14.9 13.7c1 .9.3 2.6-1.1 2.6H8.5c-1.4 0-2.1-1.7-1.1-2.6Z" fill="#e8786a"/>
    <path d="M7.4 23.4 22.3 9.7c.5-.5 1.1-.7 1.7-.7V26H8.5c-1.4 0-2.1-1.7-1.1-2.6Z" fill="#f6968a"/>
    <path d="M12.4 21 18.8 15" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`),
  rocket: toy(`<path d="M18.6 33.5h10.8l-2.1 5.6c-.9 2.4-2 4.2-3.3 5.6-1.3-1.4-2.4-3.2-3.3-5.6Z" fill="#ffc23a"/>
    <path d="M21.2 33.5h5.6l-1 3.4c-.5 1.6-1.1 2.8-1.8 3.8-.7-1-1.3-2.2-1.8-3.8Z" fill="#fff1b8"/>
    <path d="M15.2 23.5 8.6 30.2a2 2 0 0 0-.6 1.4v4.6c0 .8.9 1.3 1.6.9l5.6-3Z" fill="#f6968a"/>
    <path d="M32.8 23.5l6.6 6.7c.4.4.6.9.6 1.4v4.6c0 .8-.9 1.3-1.6.9l-5.6-3Z" fill="#e8786a"/>
    <path d="M24 4.6c5.9 4.4 8.8 11.2 8.8 19v10.6H15.2V23.6c0-7.8 2.9-14.6 8.8-19Z" fill="#f7f4ff"/>
    <path d="M24 4.6c5.9 4.4 8.8 11.2 8.8 19v10.6h-5.6V23.6c0-7.6-1.2-13.9-3.2-19Z" fill="#ddd6f6"/>
    <path d="M24 4.6c2.7 2 4.7 4.5 6.1 7.4H17.9c1.4-2.9 3.4-5.4 6.1-7.4Z" fill="#f68c7c"/>
    <circle cx="24" cy="20" r="4.6" fill="#8fb1e6" stroke="#fff" stroke-width="2.2"/><circle cx="22.6" cy="18.6" r="1.2" fill="#fff" opacity="0.8"/>
    <path d="M18.6 16.4c.4-1.6 1-3 1.8-4.2" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`),
  soundOn: speaker(true),
  soundOff: speaker(false),
  // A world's page: its stars, the pin (in currentColor) on the stage to play, and the
  // tutorial's play mark.
  starOn: star(true),
  starOff: star(false),
  // A perfect clear's crown, and the grey cracked one of a stage that missed it.
  crown: crown(true),
  crownLost: crown(false),
  // A hard stage's flame (어려움) and a very hard one's (매우 어려움).
  hard: hot(false),
  harder: hot(true),
  // The 모음 tab: a display cabinet with little blocks on its shelves (dist/samples/souvenir.html 안 B).
  cabinet: toy(`<ellipse cx="24" cy="44" rx="15" ry="2.6" fill="#4a3f5c" opacity="0.12"/>
    <rect x="8" y="6" width="32" height="36" rx="5" fill="#f2b98f"/><path d="M32 6h3a5 5 0 0 1 5 5v26a5 5 0 0 1-5 5h-3Z" fill="#dd9c70"/>
    <rect x="12" y="10" width="24" height="28" rx="2.5" fill="#fff5ec"/>
    <rect x="12" y="23" width="24" height="3" fill="#e4a77c"/><rect x="12" y="35" width="24" height="3" fill="#e4a77c"/>
    <path d="M15.5 16.5 19 14.5l3.5 2v4.5L19 23l-3.5-2Z" fill="#f68c7c"/><path d="M19 18.5l3.5-2V21L19 23Z" fill="#e46f5e"/><path d="M15.5 16.5 19 14.5l3.5 2-3.5 2Z" fill="#ffb8ab"/>
    <rect x="25.5" y="12.5" width="5" height="10.5" rx="1" fill="#2fb3a6"/><rect x="28.5" y="12.5" width="2" height="10.5" fill="#1f978b"/>
    <path d="M17 28.5h14l-1.4 6.5H18.4Z" fill="#ffcd4a"/><path d="M27 28.5h4l-1.4 6.5H26Z" fill="#f4ad37"/>
    <path d="M15 14v6" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`),
  // 오늘의 큐브 (dist/samples/daily.html 안 A): a desk calendar, the month's cup, the
  // share's paper plane, a day's stamp, and a stopwatch (a line icon) for its time.
  calendar: toy(`<rect x="7" y="10" width="34" height="32" rx="6" fill="#fff4ec"/><path d="M33 10h2a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6h-2Z" fill="#f2ddd0"/>
    <path d="M7 16a6 6 0 0 1 6-6h22a6 6 0 0 1 6 6v4H7Z" fill="#f68c7c"/><path d="M33 10h2a6 6 0 0 1 6 6v4h-8Z" fill="#e46f5e"/>
    <rect x="14" y="6" width="4" height="9" rx="2" fill="#8291bb"/><rect x="30" y="6" width="4" height="9" rx="2" fill="#8291bb"/>
    <rect x="12.5" y="25" width="6" height="5" rx="1.5" fill="#f9c7bd"/><rect x="21" y="25" width="6" height="5" rx="1.5" fill="#f9c7bd"/><rect x="29.5" y="25" width="6" height="5" rx="1.5" fill="#ffcd4a"/>
    <rect x="12.5" y="33" width="6" height="5" rx="1.5" fill="#f9c7bd"/><rect x="21" y="33" width="6" height="5" rx="1.5" fill="#efe3e6"/>
    <path d="M11 14h8" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`),
  cupOn: cup(true),
  cupOff: cup(false),
  plane: toy(`<path d="M6 22 41 8 33 40l-9-9-6 7v-10Z" fill="#9eb6ea"/><path d="M41 8 18 28l15 12Z" fill="#7f9de6"/><path d="M41 8 18 28v10l6-7Z" fill="#6b86cf"/>
    <path d="M12 21.5l14-5.5" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`),
  medal: medal(true),
  medalOff: medal(false),
  // A folded map with the course's dotted route and a pin: 주간 도전 코스's page.
  map: toy(`<path d="M5 12l12-4 14 4 12-4v28l-12 4-14-4-12 4Z" fill="#fff4dc"/><path d="M17 8v28l14 4V12Z" fill="#f6e2b5"/><path d="M5 12l12-4v28L5 40Z" fill="#fdf0d0"/>
    <path d="M10 33c4-3 8-1.5 12-5.5s8-9.5 13-8.5" fill="none" stroke="#e2786a" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 4.4"/>
    <path d="M35 8.5c-3 0-5.2 2.2-5.2 4.9 0 3.7 5.2 8.4 5.2 8.4s5.2-4.7 5.2-8.4c0-2.7-2.2-4.9-5.2-4.9Z" fill="#ec7868"/><circle cx="35" cy="13.4" r="2" fill="#fff"/>`),
  stamp: stamp(false),
  stampGold: stamp(true),
  clock: line('M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM12 9.5v4.2l2.6 1.6M10 2.8h4'),
  pin: '<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M20 46c-1.6-6-15-14-15-26a15 15 0 0 1 30 0c0 12-13.4 20-15 26Z" fill="currentColor" stroke="#fff" stroke-width="2.4"/><circle cx="20" cy="19.5" r="7" fill="#fff"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2L18.6 12Z" fill="currentColor"/></svg>',
  // On to a stage (the clear card's next step, after its number): a play mark with soft corners.
  go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 6.4v11.2L17.6 12Z" fill="currentColor" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg>',
  // The shop page's way back, and the climb's marks.
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
