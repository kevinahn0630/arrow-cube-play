// How each world looks: the page background behind the cube and the colours the cube
// is drawn with. Plain data, read by game.js; nothing here changes how a puzzle plays.
//
// A world lists only what it changes and takes the rest from DEFAULT_THEME, so a new
// country can start as `{}` and get its background and colours later. Keep arrows
// readable against the background: the cube is see-through, and arrows on the far
// faces show as `arrow.ghost` lines.

export const DEFAULT_THEME = {
  // The sky behind the cube: any CSS background. A world with a picture in
  // scenery.js gets it drawn over this.
  background: 'linear-gradient(180deg, #eef1ff, #dce4fa)',
  // The world's own colour: its card and cleared stages in the world menu.
  accent: '#5b6cff',
  box: { face: '#ffffff', faceOpacity: 0.22, edge: '#b9c3e6' },
  arrow: {
    front: '#25325e', // arrows on faces toward the camera
    ghost: '#ffffff', // arrows (and tiles) seen through the cube
    blocked: '#e5484d', // flash after tapping a blocked arrow
    moving: '#5b6cff', // on its way out
    free: '#12a27e', // "show free arrows" in the generator panel
  },
  // Key/gate and pair colours, so linked things read as linked: one colour per link,
  // and the generator makes at most MAX_LINKS (= this many) links per puzzle.
  links: ['#e09f1f', '#9b59b6', '#d6336c', '#0f9d9a', '#a0612d', '#6b8e23', '#3a8fd6', '#e8590c'],
  gateDot: '#ffffff',
  mirror: '#3d4a7a',
  mirrorTile: '#cfd6f0',
  guards: ['#f08c2e', '#20a39e'], // Big Ben: the two guard colours
  aurora: ['#1fae6b', '#8b52d6', '#e0457b'], // aurora arrows and their curtains
  disc: '#c27c0e',
  belt: '#d3d9ee',
  beltMark: '#9aa5cc',
  beltHint: '#ffc93c',
  tunnel: '#4a3b2c', // tunnel mouths; each pair is ringed in one of `links`
  obelisk: '#8a6a3b', // sundial obelisks
  obeliskTop: '#e2c48a',
  shadow: '#b3bad3', // the cells in their shadow
  lasso: '#b5651d', // lasso arrows
  knot: '#8e2f45', // the two arrows of a knot, which only a lasso can pull apart
  boomerang: '#d0573a', // boomerang arrows
  canal: '#a9d3f2', // canal water
  canalFlow: '#3f7fbf', // the chevrons showing which way it flows
  machete: '#d4a017', // machete arrows
  vine: '#2e8b57', // vines, until their machete cuts them down
  vineLeaf: '#7ccf8a',
  lantern: '#e8833a', // lantern arrows
  lanternGlow: '#ffd166', // the light round a lantern's head
  dark: '#3a3550', // a lantern's shadow, until the lantern leaves
  beam: '#f3dc96', // a lantern's way out where it lights up a shadow
  eagle: '#b8860b', // double-headed eagles
  shojiFrame: '#8b5a2b', // shoji tracks and panel frames
  shojiPaper: '#fbf3df', // shoji panels
  millHub: '#5d4037', // windmill hubs
  millSail: '#e2cfa8', // windmill sails
  millFrame: '#7b5e3b', // the frame on each sail, and marks where they would swing to
  bull: '#7a1f2b', // bulls (encierro)
  dialRing: '#c08a2e', // the rim of each dial
  dialHub: '#e9b949', // the hub the player taps to turn it
};

// Per world, keyed like WORLDS in stages.js. Every world has a picture in scenery.js
// over its sky (for 집 안, the wall of a room); the two night skies make the cube glow
// like a paper lantern (`box`), so arrows stay readable on the dark.
const sky = (top, middle, bottom) => `linear-gradient(180deg, ${top}, ${middle} 55%, ${bottom})`;
export const THEMES = {
  home: { accent: '#5b6cff', background: sky('#e9e6f6', '#f0edf6', '#f4eee7') },
  gate: { accent: '#d9443b', background: sky('#f3e6da', '#f4efe6', '#e6eee9') },
  pair: { accent: '#2f6fd6', background: sky('#dbe7f5', '#eef2f8', '#f7f3ea') },
  mirror: { accent: '#5468d4', background: sky('#dce4f6', '#eef0f8', '#f7efe9') },
  bell: { accent: '#2b4594', background: sky('#dde3ec', '#edf0f4', '#f1efea') },
  discus: { accent: '#c9921a', background: sky('#cde5f8', '#e8f3fb', '#fbf6ea') },
  aurora: {
    accent: '#13a39a',
    background: 'linear-gradient(180deg, #0c1930, #13304a 45%, #1c4656 75%, #24525c)',
    box: { face: '#f2fbfa', faceOpacity: 0.8, edge: '#8fdcd0' },
  },
  belt: { accent: '#4a4f5c', background: sky('#d6e6f3', '#edf3f2', '#eef1e4') },
  tunnel: { accent: '#c8323c', background: sky('#f2d6d0', '#f7e8de', '#f2e2cd') },
  sundial: { accent: '#b9873f', background: sky('#f3dfb8', '#f8ecd6', '#f4e2c4') },
  lasso: { accent: '#b5651d', background: sky('#cfe3f1', '#f0efe9', '#f8e1c6') },
  dial: { accent: '#e0a320', background: sky('#d2ecec', '#f3f1e4', '#fae2cc') },
  boomerang: { accent: '#d2593a', background: sky('#f5cdb8', '#f8e3d2', '#f6d3b1') },
  canal: { accent: '#2b9bc4', background: sky('#d6e8f4', '#f1f2ec', '#f8ecdc') },
  eagle: { accent: '#8a5cc8', background: sky('#cdd5ec', '#e6eaf5', '#f4f3f8') },
  encierro: { accent: '#a3263a', background: sky('#d3e5f4', '#f4efe4', '#f9e4c6') },
  vine: { accent: '#3c9a3a', background: sky('#c9e8ee', '#eef6ec', '#f5f0de') },
  lantern: {
    accent: '#e7832f',
    background: 'linear-gradient(180deg, #14143a, #26245a 40%, #4a356d 72%, #8f5170)',
    box: { face: '#fff4e2', faceOpacity: 0.8, edge: '#f2c879' },
  },
  diagonal: { accent: '#f08c1c', background: sky('#f7d9bd', '#faecdd', '#f2e5ea') },
  shoji: { accent: '#c43c4c', background: sky('#f3dfe4', '#f7eeee', '#edf0f3') },
  windmill: { accent: '#f07a26', background: sky('#d1e3f4', '#ecf2f6', '#f1f2e9') },
};

// The full theme for a world: its own entries over the default, one level deep (so
// a world can change `arrow.front` alone).
export function themeOf(world) {
  const own = THEMES[world] ?? {};
  const out = { ...DEFAULT_THEME, ...own };
  for (const k of ['box', 'arrow']) out[k] = { ...DEFAULT_THEME[k], ...own[k] };
  return out;
}
