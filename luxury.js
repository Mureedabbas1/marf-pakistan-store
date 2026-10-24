/* MARF Pakistan — luxury theme behaviour. Decorative only; safe to remove. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Intro splash: remember it was shown, then remove from the DOM
  const splash = document.getElementById('marf-splash');
  if (splash) {
    try { sessionStorage.setItem('marfSplash', '1'); } catch (e) {}
    setTimeout(() => splash.classList.add('is-done'), 2800);
  }
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');

  // Gold progress line at the very top
  const bar = document.createElement('div');
  bar.className = 'marf-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  let ticking = false;
  function onScroll() {
    const y = window.scrollY || 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    if (header) header.classList.toggle('is-scrolled', y > 40);
    if (hero && !reduce && y < window.innerHeight) {
      hero.style.setProperty('--hero-shift', (y * 0.08).toFixed(1));
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (!fine || reduce) return;

  // Soft gold light that follows the cursor (desktop only)
  const light = document.createElement('div');
  light.className = 'marf-spotlight';
  light.setAttribute('aria-hidden', 'true');
  document.body.appendChild(light);
  window.addEventListener('pointermove', e => {
    light.style.setProperty('--mx', e.clientX + 'px');
    light.style.setProperty('--my', e.clientY + 'px');
    light.classList.add('on');
  }, { passive: true });
  document.addEventListener('pointerleave', () => light.classList.remove('on'));
})();
