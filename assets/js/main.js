(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  let motionPreference = null;
  try { motionPreference = localStorage.getItem('portfolio-motion'); } catch { /* Storage can be disabled. */ }
  function setMotion() {
    const paused = reduceMotion.matches || motionPreference === 'off';
    root.dataset.motion = paused ? 'off' : 'on';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Enable ambient animation' : 'Pause ambient animation');
    toggle.querySelector('.motion-label').textContent = paused ? 'Motion off' : 'Motion on';
    document.dispatchEvent(new CustomEvent('portfolio:motionchange', { detail: { enabled: !paused } }));
  }
  toggle.addEventListener('click', () => {
    motionPreference = root.dataset.motion === 'off' ? 'on' : 'off';
    try { localStorage.setItem('portfolio-motion', motionPreference); } catch { /* Optional preference. */ }
    setMotion();
  });
  reduceMotion.addEventListener('change', setMotion);
  setMotion();
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  function closeMenu(returnFocus = false) {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
    if (returnFocus) menu.focus();
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true); });
  document.addEventListener('click', e => { if (!e.target.closest('.nav-shell')) closeMenu(); });
  window.matchMedia('(min-width: 601px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  const progress = document.querySelector('.reading-progress');
  let progressFrame = 0;
  function updateProgress() {
    progressFrame = 0;
    const length = root.scrollHeight - root.clientHeight;
    progress.style.width = `${length > 0 ? Math.min(100, window.scrollY / length * 100) : 0}%`;
  }
  window.addEventListener('scroll', () => { if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress); }, { passive: true });
  updateProgress();
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('.focus-card').forEach(card => {
    let frame = 0;
    card.addEventListener('pointermove', e => {
      if (!hover.matches || root.dataset.motion === 'off') return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { card.style.setProperty('--mouse-x', `${x}px`); card.style.setProperty('--mouse-y', `${y}px`); });
    });
    card.addEventListener('pointerleave', () => cancelAnimationFrame(frame));
  });
  const search = document.querySelector('#project-search');
  const cards = [...document.querySelectorAll('.archive-card')];
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    cards.forEach(card => { card.hidden = !card.textContent.toLocaleLowerCase().includes(query); if (!card.hidden) count++; });
    document.querySelector('#project-empty').hidden = count !== 0;
    document.querySelector('#project-count').textContent = `${count} ${count === 1 ? 'project' : 'projects'} found`;
  });
  const openers = new WeakMap();
  function showDialog(dialog, opener) {
    if (dialog.open) return;
    openers.set(dialog, opener);
    dialog.showModal();
    dialog.querySelector('.dialog-close')?.focus();
  }
  document.querySelectorAll('#video-dialog, #project-dialog').forEach(dialog => {
    dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); });
    dialog.addEventListener('close', () => { openers.get(dialog)?.focus(); if (dialog.id === 'video-dialog') document.querySelector('#video-frame').replaceChildren(); });
  });
  document.querySelectorAll('[data-open-video]').forEach(button => button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.title = 'PixelPair WordPress tracking walkthrough by Arif Hasnat';
    frame.src = 'https://www.youtube-nocookie.com/embed/uRdT0o2IcUc?autoplay=1&rel=0';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    document.querySelector('#video-frame').replaceChildren(frame);
    showDialog(document.querySelector('#video-dialog'), button);
  }));
  document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => {
    const template = document.getElementById(`project-detail-${button.dataset.project}`);
    if (!template) return;
    document.querySelector('#project-dialog-content').replaceChildren(template.content.cloneNode(true));
    showDialog(document.querySelector('#project-dialog'), button);
  }));
  let printState = null;
  function preparePrint() { if (printState) return; printState = [...document.querySelectorAll('details')].map(d => [d, d.open]); printState.forEach(([d]) => { d.open = true; }); }
  function finishPrint() { printState?.forEach(([d, wasOpen]) => { d.open = wasOpen; }); printState = null; }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', finishPrint);
  document.querySelectorAll('.print-profile').forEach(button => button.addEventListener('click', () => { preparePrint(); window.print(); }));
  document.querySelector('#footer-year').textContent = String(new Date().getFullYear());
})();
