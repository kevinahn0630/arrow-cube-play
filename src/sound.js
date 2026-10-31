// Sound effects, made on the spot with Web Audio (no sound files): a rising whoosh
// when arrows leave, a short low knock when a tapped arrow is blocked. Browsers only
// let a page make sound after the player has touched it, so the audio is set up (or
// woken again, as phones put it to sleep) by wakeAudio from a touch.

let ctx = null;
let out = null; // everything plays through this, at one overall volume
let noise = null; // a second of white noise, filtered into whooshes and thumps

// Sound on or off, kept on the device (guarded, as storage can be missing or blocked).
const KEY = 'arrowCube.sound';
let muted = false;
try {
  muted = localStorage.getItem(KEY) === 'off';
} catch {
  // No storage: sound starts on.
}
export const isMuted = () => muted;
export function setMuted(off) {
  muted = off;
  try {
    localStorage.setItem(KEY, off ? 'off' : 'on');
  } catch {
    // Storage full or blocked: the choice lasts as long as the page.
  }
}

export function wakeAudio() {
  if (!ctx) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    ctx = new Audio();
    out = ctx.createGain();
    out.gain.value = 0.8;
    out.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state !== 'running') ctx.resume();
}

// A gain that rises to `peak` at once and dies away over `length` seconds from `t`.
function envelope(t, peak, length) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  g.connect(out);
  return g;
}

// A burst of noise through a filter of `type`, its frequency gliding from `from` to
// `to` Hz, into `into`.
function hiss(t, length, type, from, to, into) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + length);
  src.connect(filter);
  filter.connect(into);
  src.start(t, Math.random() * 0.5, length + 0.05);
}

// A tone of `type` gliding from `from` to `to` Hz, into `into`.
function tone(t, length, type, from, to, into) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  osc.connect(into);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

// Arrows leaving: a whoosh sweeping up with a light rising tone, a little different
// each time. Several leaving at once (a pair, a lasso and its catch) end higher;
// `level` scales the volume (a bull charging on is quieter).
export function playLeave(count = 1, level = 1) {
  if (muted || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const pitch = 0.94 + Math.random() * 0.12;
  hiss(t, 0.16, 'bandpass', 500 * pitch, 3200 * pitch, envelope(t, 0.5 * level, 0.2));
  tone(t, 0.12, 'sine', 520 * pitch, (count > 1 ? 1300 : 1040) * pitch, envelope(t, 0.12 * level, 0.15));
}

// A tapped arrow that cannot leave: a low knock falling in pitch, with a dull thump.
export function playBump() {
  if (muted || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  tone(t, 0.14, 'triangle', 190, 95, envelope(t, 0.45, 0.18));
  hiss(t, 0.06, 'lowpass', 900, 300, envelope(t, 0.3, 0.07));
}
