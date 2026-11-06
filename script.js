'use strict';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- halftone wave backdrop ---------- */
(() => {
  const canvas = document.getElementById('dots');
  const ctx = canvas.getContext('2d');
  const GAP = 7, SIZE = 1.9, LEVELS = 8;
  let W = 0, H = 0, last = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    // Strongest behind the hero, settling to a quiet texture further down.
    const fade = 1 - clamp(scrollY / (H * 1.4), 0, 1) * 0.55;
    const paths = Array.from({ length: LEVELS }, () => new Path2D());
    for (let y = GAP / 2; y < H; y += GAP) {
      const ny = y / H;
      const sway = Math.sin(ny * 3.1 + t * 0.00022) * 1.7 + Math.sin(ny * 7.3 - t * 0.00017) * 0.45;
      for (let x = GAP / 2; x < W; x += GAP) {
        const nx = x / W;
        const edge = clamp(Math.abs(nx - 0.5) * 2.6 - 0.08, 0, 1); // quiet centre, ribbons at the sides
        if (edge <= 0) continue;
        const band = Math.sin(nx * 21 + sway * 2.3 + t * 0.00026);
        if (band <= 0) continue;
        const pulse = 0.5 + 0.5 * Math.sin(ny * 2.2 + nx * 3.5 + t * 0.00035);
        const a = Math.min(1, band * band * Math.sqrt(edge) * (0.5 + 0.5 * pulse) * fade * 1.15);
        const level = Math.floor(a * LEVELS);
        if (level > 0) paths[Math.min(level, LEVELS - 1)].rect(x, y, SIZE, SIZE);
      }
    }
    for (let i = 1; i < LEVELS; i++) {
      ctx.fillStyle = `rgba(226, 228, 236, ${(i / LEVELS) * 0.62})`;
      ctx.fill(paths[i]);
    }
  }

  function loop(t) {
    if (t - last > 33) { draw(t); last = t; }
    if (!document.hidden) requestAnimationFrame(loop);
  }

  resize();
  addEventListener('resize', () => { resize(); draw(performance.now()); });
  if (reduced) { draw(0); addEventListener('scroll', () => draw(0), { passive: true }); }
  else {
    requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(loop); });
  }
})();

/* ---------- scroll-driven pieces (the 3D laptop lives in laptop.js) ---------- */
const nav = document.getElementById('nav');
const story = document.getElementById('features');
const items = [...story.querySelectorAll('.item')];
const shots = [...story.querySelectorAll('.window img')];
const pips = [...story.querySelectorAll('.story-dots i')];
let storyIndex = -1;

function setStory(i) {
  if (i === storyIndex) return;
  storyIndex = i;
  items.forEach((el, k) => {
    el.classList.toggle('on', k === i);
    el.classList.toggle('prev', k < i);
    el.classList.toggle('next', k === i + 1);
  });
  shots.forEach((el, k) => el.classList.toggle('on', k === i));
  pips.forEach((el, k) => el.classList.toggle('on', k === i));
}

function onScroll() {
  const y = scrollY, vh = innerHeight;
  nav.classList.toggle('scrolled', y > 30);

  const top = story.offsetTop, span = story.offsetHeight - vh;
  const sp = clamp((y - top) / span, 0, 0.9999);
  setStory(Math.floor(sp * items.length));

  // Highlight the nav link for the section in view.
  const mid = y + vh * 0.4;
  let current = 'top';
  for (const id of ['features', 'launchers', 'faq']) {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= mid) current = id;
  }
  document.querySelectorAll('.links a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
}
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
addEventListener('resize', onScroll);
onScroll();

/* ---------- reveal on view ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- keyboard demo ---------- */
(() => {
  const steps = [...document.querySelectorAll('#steps li')];
  const keyEls = Object.fromEntries([...document.querySelectorAll('.key[data-k]')].map((k) => [k.dataset.k, k]));
  let i = 0, timer, pressTimer;

  function show(n) {
    i = n;
    steps.forEach((s, k) => s.classList.toggle('on', k === n));
    Object.values(keyEls).forEach((k) => k.classList.remove('down'));
    clearTimeout(pressTimer);
    const seq = steps[n].dataset.keys.split(',');
    // Chords press together; arrows tap one after another.
    if (n === 1) seq.forEach((k, j) => setTimeout(() => { keyEls[k].classList.add('down'); setTimeout(() => keyEls[k].classList.remove('down'), 260); }, j * 340));
    else { seq.forEach((k) => keyEls[k].classList.add('down')); pressTimer = setTimeout(() => seq.forEach((k) => keyEls[k].classList.remove('down')), 700); }
  }
  function auto() { clearInterval(timer); timer = setInterval(() => show((i + 1) % steps.length), 2200); }
  steps.forEach((s, k) => s.addEventListener('click', () => { show(k); auto(); }));
  show(0);
  if (!reduced) auto();
})();

/* ---------- faq marquee: duplicate for a seamless loop ---------- */
document.querySelectorAll('.marquee .track').forEach((t) => {
  t.append(...[...t.children].map((c) => { const d = c.cloneNode(true); d.setAttribute('aria-hidden', 'true'); return d; }));
});
