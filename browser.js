'use strict';
(() => {
  const stage = document.getElementById('tiltStage');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The hero screenshot lies back, then flattens toward you as you scroll.
  function tilt() {
    const p = reducedMotion ? 1 : Math.min(1, Math.max(0, scrollY / (innerHeight * 0.55)));
    stage.style.setProperty('--p', (1 - Math.pow(1 - p, 2.2)).toFixed(4));
  }
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { tilt(); ticking = false; }); } }, { passive: true });
  tilt();

  // Count the Shields number up when it comes into view.
  const counter = document.querySelector('[data-count]');
  if (counter) {
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const target = Number(counter.dataset.count), start = performance.now(), dur = reducedMotion ? 0 : 1200;
      const step = (t) => {
        const k = dur ? Math.min(1, (t - start) / dur) : 1;
        counter.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.4 }).observe(counter);
  }
})();
