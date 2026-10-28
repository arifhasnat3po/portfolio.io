/* Load in the head without defer: restore the choice before the page is painted. */
(() => {
  'use strict';

  const root = document.documentElement;
  const storageKey = 'portfolio-theme';
  let theme = 'dark';
  let controls = [];

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    // The theme still works when browser storage is unavailable.
  }

  function apply(next, announce = true) {
    theme = next === 'light' ? 'light' : 'dark';
    root.dataset.theme = theme;
    const light = theme === 'light';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', light ? '#f3f0e7' : '#101915');

    controls.forEach((button) => {
      // The toggle's accessible name stays stable; pressed means light is on.
      button.setAttribute('aria-label', 'Light mode');
      button.setAttribute('aria-pressed', String(light));
      button.title = light ? 'Switch to dark mode' : 'Switch to light mode';
      const label = button.querySelector('.theme-label');
      if (label) label.textContent = light ? 'Light mode' : 'Dark mode';
    });

    if (announce) {
      document.dispatchEvent(new CustomEvent('portfolio:themechange', { detail: { theme } }));
    }
  }

  apply(theme, false);

  function initialize() {
    controls = Array.from(document.querySelectorAll('.theme-toggle'));
    controls.forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () => {
        const next = theme === 'light' ? 'dark' : 'light';
        try { localStorage.setItem(storageKey, next); } catch { /* Optional preference. */ }
        apply(next);
      });
    });
    apply(theme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  // Keep another open portfolio tab in sync with an explicit saved choice.
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    const next = event.newValue === 'light' ? 'light' : 'dark';
    if (next !== theme) apply(next);
  });
})();
