// Small screen effects, for the life a mobile puzzle game has (2026-11-04 user request):
// coins flying into the wallet, numbers counting up, confetti, sparkles, a heart
// breaking. DOM only, drawn in #fx over everything and gone when done. A player who asked
// the system for less motion (prefers-reduced-motion) gets the end states only.
export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const layer = () => document.getElementById('fx');
const piece = (cls) => {
  const el = document.createElement('i');
  el.className = cls;
  layer().append(el);
  return el;
};

// The middle of an element (or a point already), in CSS pixels.
export function spot(at) {
  if (!(at instanceof Element)) return at;
  const r = at.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// Plays a CSS animation class on an element again from the start (bump, pop).
export function replay(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // restart it
  el.classList.add(cls);
}

// Counts an element's text from one number to another, quickly at first.
export function countUp(el, from, to, ms = 600, show = (n) => n.toLocaleString('ko-KR')) {
  if (calm || from === to) {
    el.textContent = show(to);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = show(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Flies `n` copies of an icon (an SVG string) from one place (an element or a point) to
// an element: each bursts out a little, then arcs over to it, one after another. `land`
// runs as each arrives, told whether it was the last.
export function fly(icon, from, to, { n = 6, size = 26, land } = {}) {
  if (calm) {
    for (let i = 0; i < n; i++) land?.(i === n - 1);
    return;
  }
  const a = spot(from);
  const b = spot(to);
  const at = (p, s) => `translate(${p.x - size / 2}px, ${p.y - size / 2}px) scale(${s})`;
  for (let i = 0; i < n; i++) {
    const el = piece('fx-fly');
    el.innerHTML = icon;
    el.style.width = el.style.height = `${size}px`;
    const out = { x: a.x + (Math.random() - 0.5) * 80, y: a.y + (Math.random() - 0.5) * 50 };
    const bend = { x: (out.x + b.x) / 2 + (Math.random() - 0.5) * 90, y: Math.min(out.y, b.y) - 50 - Math.random() * 70 };
    const curve = (t) => ({
      x: (1 - t) ** 2 * out.x + 2 * (1 - t) * t * bend.x + t ** 2 * b.x,
      y: (1 - t) ** 2 * out.y + 2 * (1 - t) * t * bend.y + t ** 2 * b.y,
    });
    const frames = [{ transform: at(a, 0.3), opacity: 0 }, { transform: at(out, 1.15), opacity: 1, offset: 0.22 }];
    for (const t of [0.25, 0.5, 0.75, 1]) frames.push({ transform: at(curve(t), 1.15 - 0.45 * t), offset: 0.22 + 0.78 * t });
    el.animate(frames, { duration: 780, delay: i * 75, easing: 'ease-in-out', fill: 'backwards' }).onfinish = () => {
      el.remove();
      land?.(i === n - 1);
    };
  }
}

// Bits of pastel paper bursting up from a point and fluttering down.
const PAPER = ['#f68c7c', '#ffd04f', '#8fb1e6', '#a3d8b2', '#c9b6f2', '#f8b2c2'];
export function confetti(from, n = 36) {
  if (calm) return;
  const a = spot(from);
  for (let i = 0; i < n; i++) {
    const el = piece('fx-paper');
    const w = 6 + Math.random() * 5;
    Object.assign(el.style, { background: PAPER[i % PAPER.length], width: `${w}px`, height: `${w * (0.45 + Math.random() * 0.5)}px` });
    if (i % 3 === 0) el.style.borderRadius = '50%';
    const turn = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
    const v = 160 + Math.random() * 240;
    const top = { x: a.x + Math.cos(turn) * v, y: a.y + Math.sin(turn) * v };
    const spin = (Math.random() - 0.5) * 1080;
    el.animate(
      [
        { transform: `translate(${a.x}px, ${a.y}px) rotate(0deg)`, opacity: 1, easing: 'cubic-bezier(.1,.8,.3,1)' },
        { transform: `translate(${top.x}px, ${top.y}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.35, easing: 'ease-in' },
        { transform: `translate(${top.x + (top.x - a.x) * 0.3}px, ${top.y + 260 + Math.random() * 220}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 900 },
    ).onfinish = () => el.remove();
  }
}

// A few sparkles scattering from a point (an arrow leaving the cube).
export function sparkle(from, n = 7) {
  if (calm) return;
  const a = spot(from);
  for (let i = 0; i < n; i++) {
    const el = piece('fx-spark');
    const turn = (i / n) * Math.PI * 2 + Math.random() * 0.7;
    const r = 20 + Math.random() * 26;
    const go = (k, s) => `translate(${a.x + Math.cos(turn) * r * k}px, ${a.y + Math.sin(turn) * r * k}px) rotate(45deg) scale(${s})`;
    el.animate([{ transform: go(0, 0.4), opacity: 1 }, { transform: go(1, 1), opacity: 1, offset: 0.5 }, { transform: go(1.45, 0), opacity: 0 }], {
      duration: 520,
      easing: 'ease-out',
    }).onfinish = () => el.remove();
  }
}

// A heart lost: it swells and shakes where it was, then breaks in two halves that drop.
export function heartBreak(from) {
  if (calm) return;
  const a = spot(from);
  for (const side of [-1, 1]) {
    const el = piece('fx-heart');
    el.textContent = '♥';
    el.style.clipPath = side < 0 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)';
    const at = (dx, dy, turn, s) => `translate(${a.x - 12 + dx}px, ${a.y - 14 + dy}px) rotate(${turn}deg) scale(${s})`;
    el.animate(
      [
        { transform: at(0, 0, 0, 1), opacity: 1 },
        { transform: at(0, 0, -12, 1.5), offset: 0.18 },
        { transform: at(0, 0, 10, 1.45), offset: 0.32 },
        { transform: at(0, 0, -6, 1.4), offset: 0.44 },
        { transform: at(side * 10, 6, side * 22, 1.3), opacity: 1, offset: 0.58 },
        { transform: at(side * 22, 52, side * 48, 0.9), opacity: 0 },
      ],
      { duration: 900, easing: 'ease-out' },
    ).onfinish = () => el.remove();
  }
}
