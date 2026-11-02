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
  background: 'linear-gradient(180deg, #fde3da, #f8eeec 55%, #ebe8f5)',
  // The world's own colour: its card and cleared stages in the world menu.
  accent: '#e2786a',
  box: { face: '#ffffff', faceOpacity: 0.22, edge: '#e3c6cc' },
  arrow: {
    front: '#4a3f5c', // arrows on faces toward the camera
    ghost: '#ffffff', // arrows (and tiles) seen through the cube
    blocked: '#e5484d', // flash after tapping a blocked arrow
    moving: '#e2786a', // on its way out
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
  tunnel: '#4a3b2c', // tunnel mouths; each pair is ringed in one of `links`
  obelisk: '#8a6a3b', // sundial obelisks
  obeliskTop: '#e2c48a',
  shadow: '#b3bad3', // the cells in their shadow
  lasso: '#b5651d', // lasso arrows
  knot: '#8e2f45', // the two arrows of a knot, which only a lasso can pull apart
  boomerang: '#b9471f', // boomerang arrows
  canal: '#a9d3f2', // canal water
  canalFlow: '#3f7fbf', // the chevrons showing which way it flows
  machete: '#d4a017', // machete arrows
  vine: '#2e8b57', // vines, until their machete cuts them down
  vineLeaf: '#7ccf8a',
  lantern: '#e8833a', // lantern arrows
  lanternGlow: '#ffd166', // the light round a lantern's head
  dark: '#3a3550', // a lantern's shadow, until the lantern leaves
  beam: '#f3dc96', // a lantern's way out where it lights up a shadow
  ice: '#2f6db5', // frozen arrows
  iceBlock: '#d8eefc', // the ice they sit in, while anything touches them
  iceEdge: '#8cc6ec', // its frosty rim
  samurai: '#202028', // samurais: black lacquer, with a katana for a head
  bull: '#231a1a', // bulls (encierro): black, like the bulls of the run
  dialRing: '#c08a2e', // the rim of each dial
  dialHub: '#e9b949', // the hub the player taps to turn it
  dialArrow: '#0f9d9a', // arrows riding a dial: turquoise, with a stepped head
  diag: '#e8761c', // diagonal arrows: henna orange, with a paisley head
  wall: '#80848e', // Berlin walls: concrete slabs
  panels: ['#f6cbc4', '#fbe3a0', '#c8d5f2'], // Mondrian panels: pale red, yellow and blue
  panelLine: '#17181d', // a panel's frame while an arrow sits in it
  panelOpen: '#c3c8d6', // and once it is empty
  // Each country's mark on its gimmick arrows (game.js drawMarks), in its own colours;
  // on the far faces they show white like the arrows.
  ornament: {
    knot: '#d7263d', // 중국: the red knot and tassel on each key's tail
    knotGold: '#f5c04a',
    taegeuk: ['#cd2e3a', '#0047a0'], // 한국: the taegeuk on each pair arrow's tail
    laurel: '#5a8a2b', // 그리스: laurel leaves along a discus
    rope: '#f3d7a7', // 미국: the twist of a lasso's rope
    honda: '#8a4a14', // and the knot that closes its loop
    dots: ['#fff4d6', '#ffc94a'], // 호주: dot painting along a boomerang
    frost: '#2f6db5', // 러시아: the snowflake on each frozen arrow's tail
    katana: '#dfe5ea', // 일본: a katana's blade, its back, its guard and the braid of its grip
    katanaBack: '#8f9aa6',
    tsuba: '#c9a227',
    tsukaIto: '#f4f1e8',
    horn: '#d6b77a', // 스페인: a bull's horns
    scarf: '#d4232f', // and the red scarf round its neck
    blade: '#d5dde3', // 브라질: a machete's blade, its back and its hilt
    bladeBack: '#6f7f8c',
    hilt: '#5b3a1e',
    lanternEdge: '#b5541a', // 태국: a paper lantern's frame and the light inside
    flame: '#ffe066',
    henna: '#fff3dc', // 인도: henna dots, and the dark edge of the paisley head
    hennaEdge: '#9c3d0a',
  },
};

// Per world, keyed like WORLDS in stages.js: a calm pastel sky (2026-11-02), the world's
// own colour, and arrows in a deep tone that reads on it. Every world has a picture in scenery.js
// over its sky (for 집 안, the wall of a room); the two night skies make the cube glow
// like a paper lantern (`box`), so arrows stay readable on the dark.
const sky = (top, middle, bottom) => `linear-gradient(180deg, ${top}, ${middle} 55%, ${bottom})`;
export const THEMES = {
  home: { accent: '#e2786a', background: sky('#f9ebe5', '#f5ece8', '#f1e5e0') },
  gate: { accent: '#c8564a', background: sky('#f9cfc2', '#f6e6dc', '#cfe6d8'), box: { edge: '#d9c3b9' }, arrow: { front: '#7a2f3a' } },
  pair: { accent: '#b9566f', background: sky('#f8d6d0', '#f6ece4', '#d6e9e2'), box: { edge: '#c3dcd2' }, arrow: { front: '#6e3450' } },
  mirror: { accent: '#7b74c9', background: sky('#ddd6f2', '#f2eef6', '#f8e8e6'), box: { edge: '#d3cbe6' }, arrow: { front: '#3b3a78' } },
  bell: { accent: '#56689c', background: sky('#d3d8e2', '#e7e9ee', '#eceae6'), box: { edge: '#d3d7e3' }, arrow: { front: '#2e3a6b' } },
  discus: { accent: '#3f7cb8', background: sky('#b9daf3', '#e6f1f6', '#f6eee2'), box: { edge: '#c8dbe9' }, arrow: { front: '#1f4f78' } },
  aurora: {
    accent: '#13a39a',
    background: 'linear-gradient(180deg, #1b2244, #263a5c 45%, #36586a 75%, #4b6f78)',
    box: { face: '#f2fbfa', faceOpacity: 0.8, edge: '#8fdcd0' },
  },
  wall: { accent: '#6b7080', background: sky('#cbe1ee', '#edf3ed', '#e3ecd9'), box: { edge: '#d6dbe0' } },
  tunnel: { accent: '#c4545c', background: sky('#f6d6d0', '#f8ebe0', '#f1e3cf'), box: { edge: '#e3cdbd' }, arrow: { front: '#2b4a6b' } },
  sundial: { accent: '#c0843a', background: sky('#ffd5a2', '#ffeedb', '#dcefee'), box: { edge: '#ead1a8' }, arrow: { front: '#1d6467' } },
  lasso: { accent: '#c9653a', background: sky('#f6b39e', '#fbd6c2', '#e9d0e8'), box: { edge: '#ecc9b5' }, arrow: { front: '#6a2f2a' } },
  dial: { accent: '#d99a2b', background: sky('#cfeceb', '#f6f0e2', '#fbd9c2'), box: { edge: '#e5d3bd' }, arrow: { front: '#1f5b63' } },
  boomerang: { accent: '#d2693f', background: sky('#b6daf0', '#e4f0f2', '#f6e1d0'), box: { edge: '#ebc7b2' }, arrow: { front: '#21585e' } },
  canal: { accent: '#3a97b8', background: sky('#f7d9b2', '#f8ebd8', '#dcecef'), box: { edge: '#d5e0e2' }, arrow: { front: '#1e5f6e' } },
  ice: { accent: '#8a6cc8', background: sky('#c8d4f2', '#e5eaf7', '#f4f5fa'), box: { edge: '#d4d6ea' }, arrow: { front: '#3d3470' } },
  encierro: { accent: '#b03a4a', background: sky('#ffb796', '#ffdabf', '#fbe7d6'), box: { edge: '#ecd0bd' }, arrow: { front: '#7a2233' } },
  vine: { accent: '#4a9a62', background: sky('#cdeee6', '#f1f6e8', '#f7ecd2'), box: { edge: '#cfe3d8' }, arrow: { front: '#3a2f5c' } },
  lantern: {
    accent: '#e7832f',
    background: 'linear-gradient(180deg, #14143a, #26245a 40%, #4a356d 72%, #8f5170)',
    box: { face: '#fff4e2', faceOpacity: 0.8, edge: '#f2c879' },
  },
  diagonal: { accent: '#e08a3a', background: sky('#ffc0a6', '#ffe0cb', '#f8d6e6'), box: { edge: '#ecd2c4' }, arrow: { front: '#5a2a6a' } },
  samurai: { accent: '#c95b6a', background: sky('#f6dde4', '#f8efef', '#e9eef4'), box: { edge: '#e6d2da' }, arrow: { front: '#5a3d63' } },
  mondrian: { accent: '#e98a4a', background: sky('#d4e4f4', '#eef2f6', '#f2f0e6'), box: { edge: '#d3dde8' }, arrow: { front: '#2a3f6b' } },
};

// The full theme for a world: its own entries over the default, one level deep (so
// a world can change `arrow.front` alone).
export function themeOf(world) {
  const own = THEMES[world] ?? {};
  const out = { ...DEFAULT_THEME, ...own };
  for (const k of ['box', 'arrow', 'ornament']) out[k] = { ...DEFAULT_THEME[k], ...own[k] };
  return out;
}
