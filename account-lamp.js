(() => {
'use strict';
const lamp = document.getElementById('marf-lamp');
const panel = document.getElementById('auth-panel');
if (!lamp || !panel) return;
const pull = lamp.querySelector('.lamp-pull');
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function setLight(on) {
  lamp.classList.toggle('is-on', on);
  document.body.classList.toggle('lamp-is-off', !on);
  pull.setAttribute('aria-pressed', String(on));
  pull.setAttribute('aria-label', on ? 'Pull cord to turn the lamp off' : 'Pull cord to turn the lamp on');
}

// Start dark, then switch on by itself so the form is never left dim.
setLight(false);
setTimeout(() => setLight(true), reduce ? 0 : 900);

pull.addEventListener('click', () => {
  pull.classList.remove('pulled');
  void pull.offsetWidth;
  pull.classList.add('pulled');
  setLight(!lamp.classList.contains('is-on'));
});

// Typing in the form always lights the lamp.
panel.addEventListener('focusin', () => {
  if (!lamp.classList.contains('is-on')) setLight(true);
});

// Hide the lamp when the signed-in dashboard replaces the sign-in card.
const sync = () => { lamp.hidden = panel.classList.contains('hidden'); };
new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['class'] });
sync();
})();
