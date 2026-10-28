/* Cinematic background sightings and small, discoverable interactions. No audio. */
(() => {
  'use strict';
  const layer = document.getElementById('cameo-layer');
  if (!layer) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'arif-cosmic-discoveries-v1';
  const secretIds = ['falcon', 'dragon', 'ironman', 'jump', 'tree'];
  const discoveries = new Set();
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) saved.filter(id => secretIds.includes(id)).forEach(id => discoveries.add(id));
  } catch { /* Discoveries remain usable when browser storage is unavailable. */ }

  const craft = {
    falcon: `<svg class="cameo-illustration falcon-illustration" viewBox="0 0 460 280" fill="none" aria-hidden="true">
      <defs><linearGradient id="cf-hull" x1="130" y1="28" x2="310" y2="245" gradientUnits="userSpaceOnUse"><stop stop-color="#e7e2d0"/><stop offset=".45" stop-color="#969e99"/><stop offset="1" stop-color="#39474b"/></linearGradient><linearGradient id="cf-engine" x1="12" y1="140" x2="94" y2="140" gradientUnits="userSpaceOnUse"><stop stop-color="#7de6df" stop-opacity="0"/><stop offset="1" stop-color="#befdf7"/></linearGradient></defs>
      <g class="falcon-engine"><path d="M88 76C39 81 15 110 0 140c17 31 44 55 87 64" fill="url(#cf-engine)" opacity=".22"/><path d="M83 87C64 111 64 169 83 193" stroke="#c4fff5" stroke-width="9"/><path d="M80 90C66 114 65 166 80 190" stroke="#54e1cd" stroke-width="18" opacity=".2"/></g>
      <path d="M286 49 413 53 362 119 288 126M289 153 364 159 415 226 284 230" fill="url(#cf-hull)" stroke="#c8cec1" stroke-width="2"/>
      <ellipse cx="205" cy="140" rx="126" ry="108" fill="url(#cf-hull)" stroke="#c9cec2" stroke-width="2"/>
      <ellipse cx="205" cy="140" rx="111" ry="94" stroke="#536367" stroke-width="4"/><ellipse cx="205" cy="140" rx="98" ry="83" stroke="#c3c9be" stroke-opacity=".35"/>
      <path d="m286 49 18 69 57 1 40-54-64-2M287 230l17-67 58-4 40 55-67 3" fill="#9da69e" stroke="#4c5f60" stroke-width="2"/>
      <path d="m309 72 67 3-24 31h-35m-8 99 67-3-24-30h-35" stroke="#d3d3be" stroke-opacity=".65" stroke-width="3"/>
      <path d="m273 211 42 34 41-5 12-14-30-14-43-25" fill="#87988e" stroke="#d2d4c6" stroke-width="2"/>
      <path d="m316 222 21 1 18 8-12 8-20-3z" fill="#112d36" stroke="#90aaa6"/>
      <path d="M203 33v48m-81-17 39 37m-77 36 60 1m-18 77 36-38m41 71v-50m80 15-38-38m80-37h-59m15-73-37 39" stroke="#485c60" stroke-width="3"/>
      <path d="M199 81h15v116h-15z" fill="#a4aea1" stroke="#637274"/><circle cx="205" cy="140" r="41" fill="#9eaa9f" stroke="#4e6266" stroke-width="4"/><circle cx="205" cy="140" r="27" fill="#596d6d" stroke="#c1c7b8" stroke-width="2"/>
      <path d="M189 131h30v17h-30z" fill="#bcc3b3" stroke="#465f63"/><path d="M205 136h32v4h-32m-1 5h31v4h-31" fill="#283e44"/>
      <g fill="#283e43" stroke="#b4bdb0" stroke-width="2"><circle cx="119" cy="112" r="12"/><circle cx="111" cy="141" r="12"/><circle cx="121" cy="170" r="12"/><circle cx="143" cy="84" r="9"/><circle cx="144" cy="195" r="9"/></g>
      <path d="m252 78 16 6 10 18-24-5m-71-37 16-5 2 21-18 5m-37 128 18 10 8-18-14-10m87 14 16-9 8 19-19 7" fill="#625650" opacity=".6"/>
      <path d="m225 43 4-16 23 3 4 16" fill="#b6bdad" stroke="#536867"/><path d="m236 27 4-12" stroke="#c2ccbf" stroke-width="3"/>
      <path d="M89 90c-16 29-17 72 0 101" stroke="#d1d9c8" stroke-width="2"/>
    </svg>`,
    dragon: `<svg class="cameo-illustration dragon-illustration" viewBox="0 0 700 320" fill="none" aria-hidden="true">
      <defs><linearGradient id="cd-body" x1="124" y1="110" x2="495" y2="268" gradientUnits="userSpaceOnUse"><stop stop-color="#491f20"/><stop offset=".4" stop-color="#9c3e32"/><stop offset=".7" stop-color="#b75e42"/><stop offset="1" stop-color="#251b1b"/></linearGradient><linearGradient id="cd-wing" x1="350" y1="138" x2="230" y2="13" gradientUnits="userSpaceOnUse"><stop stop-color="#321b1c"/><stop offset=".65" stop-color="#a44334"/><stop offset="1" stop-color="#e48454" stop-opacity=".75"/></linearGradient></defs>
      <g class="dragon-far-wing"><path d="M365 175C370 97 423 52 484 28L458 96l-36-2 1 42-41 5z" fill="#592a26" stroke="#a5503d" stroke-width="2"/><path d="m365 175 93-79m-93 79 57-39m-57 39L484 28" stroke="#c56844" stroke-width="1.3" opacity=".55"/></g>
      <path d="M356 173c-72 6-116-7-157 10-32 14-21 41-52 56-28 13-57-5-95 6-18 5-36 20-43 31 22-11 43-13 63-12 30 5 52 12 85 5 52-12 36-45 75-58 32-11 69-1 111-7z" fill="url(#cd-body)" stroke="#ad5136" stroke-width="1.5"/>
      <path d="M319 177c17-27 41-40 71-34 37 8 51 37 77 32 34-7 37-47 68-71 16-13 32-16 49-19l16-15 29 5 19 18-30 12-23-3c-25 5-37 18-47 43-10 26-29 56-63 62-35 7-60-16-91-14-26 3-45 10-68 5z" fill="url(#cd-body)" stroke="#b55d42" stroke-width="2"/>
      <path d="m588 82 7-29 13 20m-17 13-17-20 7 27m36-4 24-5 12 8-35 10" fill="#8a3e30" stroke="#d18251" stroke-width="1.5"/>
      <path d="m616 103 27-2-9 10-23-3m-6-14 5-2" stroke="#e4b181" stroke-width="2"/><circle cx="611" cy="85" r="2.2" fill="#f4d37a"/>
      <path d="m309 188 14 35-18 14-23 2 9-8 19-6-13-26m92-11 17 27-12 21-21 7 9-13 12-12-23-20" stroke="#72352b" stroke-width="10" stroke-linecap="round"/>
      <path d="m289 233-9 11m19-10-5 11m91-8-4 12m12-18 3 11" stroke="#dca36b" stroke-width="2"/>
      <g class="dragon-near-wing"><path d="M352 181C337 91 295 43 204 15l28 45-24 31 57-1 12 40 39-3z" fill="url(#cd-wing)" stroke="#d0774c" stroke-width="2"/><path d="M352 181 204 15m148 166L232 60m120 121-87-91m87 91-75-51m75 51-36-54" stroke="#efaa66" stroke-opacity=".55" stroke-width="2"/><path d="m204 15 14 4-3 11" stroke="#e2aa77" stroke-width="3" stroke-linecap="round"/></g>
      <path d="m225 186 4-9 9 5 9-10 9 6 12-9 10 7 13-8 9 5m89-28 5-11 12 15 9-8 7 16m77-3 7-5 2-14 8-4 4-13 9-3 8-12" stroke="#dc9a62" stroke-width="2" stroke-linejoin="round" opacity=".65"/>
      <path d="M393 193c33 0 56 19 87 8 39-13 43-57 63-78" stroke="#d89562" stroke-width="4" opacity=".28"/>
    </svg>`,
    ironman: `<svg class="cameo-illustration ironman-illustration" viewBox="0 0 360 180" fill="none" aria-hidden="true">
      <defs><linearGradient id="ci-red" x1="151" y1="38" x2="215" y2="130" gradientUnits="userSpaceOnUse"><stop stop-color="#f0a16c"/><stop offset=".27" stop-color="#ba4435"/><stop offset=".67" stop-color="#672826"/><stop offset="1" stop-color="#2a1c22"/></linearGradient><linearGradient id="ci-gold" x1="240" y1="40" x2="251" y2="95" gradientUnits="userSpaceOnUse"><stop stop-color="#f5d487"/><stop offset="1" stop-color="#917141"/></linearGradient><linearGradient id="ci-exhaust" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#bcefe6" stop-opacity="0"/><stop offset=".65" stop-color="#5bdac8" stop-opacity=".35"/><stop offset="1" stop-color="#f1fff0"/></linearGradient></defs>
      <g class="ironman-exhaust"><path d="m0 56 88-8-2 13zM10 132l83-8 3 12z" fill="url(#ci-exhaust)"/><path d="M22 55h68m-56 75h60" stroke="#abf5df" stroke-width="2" opacity=".7"/></g>
      <path d="m154 77-38-29-32-2-8 12 36 10 28 27m14-1-43 23-25 7 4 13 36-6 41-19" fill="url(#ci-red)" stroke="#c56d4b" stroke-width="2"/>
      <path d="m144 77-27-16-10 5 30 21m12 23-25 12-13-5 27-16" fill="#b99258"/>
      <path d="m90 48-12-1-9 10 18 7m7 60-13-1-6 12 17 5" fill="#933d30" stroke="#e19b65"/><path d="m76 50-5 10m10 65-5 11" stroke="#d7fff2" stroke-width="4"/>
      <path d="m148 75 22-22 35 3 31 18-8 33-42 13-39-13-11-15z" fill="url(#ci-red)" stroke="#dc8456" stroke-width="2"/>
      <path d="m180 61-9 17 13 13 24-3 12-14-14-12m-23 39-3 12 25-4 14-10m-68-13 16-4-2 21-13-5" fill="#a35437" stroke="#dd9c68" stroke-width="1.2"/>
      <circle cx="205" cy="77" r="8" fill="#96ffea" opacity=".25"/><circle cx="205" cy="77" r="5" fill="#d2fff1"/><circle cx="205" cy="77" r="2.5" fill="#fff"/>
      <path d="m216 59 16-15 23 2 12 15-5 25-19 9-15-13-3-16z" fill="#8b332a" stroke="#dd9265" stroke-width="2"/>
      <path d="m238 48 17 2 8 13-7 17-13 4-11-11 3-13z" fill="url(#ci-gold)" stroke="#edba78"/><path d="m243 60 9 2-2 4-8-2m13 0 7 1-3 4-5-2" fill="#dbfff3"/>
      <path d="m237 79 12 2 7-3" stroke="#5a4332" stroke-width="2"/>
      <path d="m199 57 15-16 38-15 20 3 31-12 9 8-32 19-24 1-36 24m-11 33 27 10 31-5 17 8 6 12-25 3-35-2-28-17" fill="url(#ci-red)" stroke="#d28056" stroke-width="2"/>
      <path d="m226 43 25-11 8 8-29 13m9 63 25-3 8 7-28 5" fill="#b58c51"/>
      <path d="m304 16 15-2 12 6-18 8m-29 90 15 2 10 12-22-2" fill="#b75c3b" stroke="#e3ae73"/><path d="m325 19 8 2m-28 109 6 4" stroke="#dafff0" stroke-width="3"/>
    </svg>`
  };
  const names = { falcon: 'Millennium Falcon', dragon: 'Caraxes', ironman: 'Iron Man', jump: 'Hyperspace', tree: 'The world tree' };
  const messages = {
    falcon: { sender: 'FLIGHT CONTROL', title: 'An unexpected arrival.', text: 'One familiar freighter. A very unfamiliar shortcut.' },
    dragon: { sender: 'DEEP-SPACE OBSERVATORY', title: 'That is definitely a dragon.', text: 'Long neck. Red wings. Absolutely no respect for orbital traffic.' },
    ironman: { sender: 'JARVIS // PRIVATE CHANNEL', title: 'Systems online, sir.', text: 'The workflows are running themselves. Mr. Stark suggests taking the credit gracefully.' },
    jump: { sender: 'NAVIGATION', title: 'Coordinates accepted.', text: 'Some shortcuts are worth remembering.' },
    tree: { sender: 'A SIGNAL BETWEEN WORLDS', title: 'Every branch, another possibility.', text: 'You found the quiet connection holding this universe together.' }
  };

  let ambientTimer = 0;
  let flightTimer = 0;
  let consoleTimer = 0;
  let liveTimer = 0;
  let firstArrival = true;
  let flight = null;
  let opener = null;
  let previousOverflow = '';
  let keyboardBuffer = '';
  let keyTime = 0;
  let konamiPosition = 0;
  let ambientIndex = 0;
  let disposed = false;
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const motionEnabled = () => !reduced.matches && document.documentElement.dataset.motion !== 'off';

  const consoleEl = document.createElement('aside');
  consoleEl.id = 'flight-console';
  consoleEl.className = 'cameo-console';
  consoleEl.setAttribute('aria-hidden', 'true');
  consoleEl.innerHTML = '<span class="cameo-console-dot"></span><div><span class="cameo-console-sender"></span><strong class="cameo-console-title"></strong><p class="cameo-console-text"></p></div>';
  layer.appendChild(consoleEl);
  const liveRegion = document.createElement('div');
  liveRegion.className = 'cameo-sr-only';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  document.body.appendChild(liveRegion);

  const dialog = document.createElement('dialog');
  dialog.className = 'cameo-discovery';
  dialog.setAttribute('aria-labelledby', 'cameo-discovery-title');
  dialog.setAttribute('aria-describedby', 'cameo-discovery-description');
  dialog.innerHTML = `<div class="cameo-discovery-inner">
    <header class="cameo-discovery-heading"><span class="cameo-kicker">NOT EVERYTHING HERE IS ON THE MAP</span><button class="cameo-dialog-close" type="button" aria-label="Close discovery panel">×</button></header>
    <h2 id="cameo-discovery-title">A little curiosity.<br><em>A different universe.</em></h2>
    <p id="cameo-discovery-description">Some of my favorite worlds drift through this one. Call a familiar visitor, or look a little closer for the things hiding in plain sight.</p>
    <div class="cameo-discovery-options">
      <button type="button" class="cameo-discovery-card" data-cameo="falcon"><span class="cameo-preview cameo-preview-falcon">${craft.falcon.replaceAll('cf-', 'cpf-')}</span><span class="cameo-discovery-label"><small>01 / A FAMILIAR FREIGHTER</small><strong>The long way home <span aria-hidden="true">↗</span></strong><span>Call the Millennium Falcon</span></span></button>
      <button type="button" class="cameo-discovery-card" data-cameo="dragon"><span class="cameo-preview cameo-preview-dragon">${craft.dragon.replaceAll('cd-', 'cpd-')}</span><span class="cameo-discovery-label"><small>02 / FIRE IN THE DISTANCE</small><strong>Something with wings <span aria-hidden="true">↗</span></strong><span>Let Caraxes pass through</span></span></button>
      <button type="button" class="cameo-discovery-card" data-cameo="ironman"><span class="cameo-preview cameo-preview-ironman">${craft.ironman.replaceAll('ci-', 'cpi-')}</span><span class="cameo-discovery-label"><small>03 / A PRIVATE TRANSMISSION</small><strong>Call in the suit <span aria-hidden="true">↗</span></strong><span>A flyby, courtesy of JARVIS</span></span></button>
    </div>
    <footer class="cameo-discovery-footer"><span class="cameo-discovery-count"></span><span class="cameo-discovery-hint">There are still things the map won’t tell you.</span></footer>
    <p class="cameo-motion-note" hidden>Ambient motion is paused. You can still discover every visitor and read their transmission.</p>
  </div>`;
  document.body.appendChild(dialog);

  function renderDiscoveryCount() {
    dialog.querySelector('.cameo-discovery-count').textContent = `${String(discoveries.size).padStart(2, '0')} / 05 discoveries`;
    dialog.querySelector('.cameo-discovery-hint').textContent = discoveries.size === 5 ? 'You found the stories between the stars.' : 'There are still things the map won’t tell you.';
    dialog.querySelector('.cameo-motion-note').hidden = motionEnabled();
    dialog.querySelectorAll('[data-cameo]').forEach(button => {
      const found = discoveries.has(button.dataset.cameo);
      button.classList.toggle('is-discovered', found);
      button.setAttribute('aria-label', `${names[button.dataset.cameo]}${found ? ', discovered. Replay sighting.' : '. Discover this visitor.'}`);
    });
  }

  function markDiscovered(kind) {
    const isNew = !discoveries.has(kind);
    discoveries.add(kind);
    try { sessionStorage.setItem(storageKey, JSON.stringify([...discoveries])); } catch { /* Optional session progress. */ }
    renderDiscoveryCount();
    return isNew;
  }

  function showTransmission(kind, announce, isNew = false) {
    const message = messages[kind];
    clearTimeout(consoleTimer);
    clearTimeout(liveTimer);
    consoleEl.querySelector('.cameo-console-sender').textContent = message.sender;
    consoleEl.querySelector('.cameo-console-title').textContent = message.title;
    consoleEl.querySelector('.cameo-console-text').textContent = message.text;
    consoleEl.dataset.kind = kind;
    consoleEl.classList.add('is-visible');
    // Ambient traffic stays silent for screen readers; only requested discoveries are announced.
    if (announce) {
      liveRegion.textContent = '';
      liveTimer = window.setTimeout(() => { liveRegion.textContent = `${isNew ? 'Discovered: ' : ''}${names[kind]}. ${message.title} ${message.text}`; }, 40);
    }
    consoleTimer = window.setTimeout(() => consoleEl.classList.remove('is-visible'), announce ? 8500 : 5000);
  }

  function stopFlight() {
    clearTimeout(flightTimer);
    flightTimer = 0;
    flight?.remove();
    flight = null;
  }

  function dispatchScene(kind, source) {
    const type = kind === 'dragon' || kind === 'tree' ? 'cosmos:tree' : kind === 'ironman' ? 'cosmos:transmission' : 'cosmos:jump';
    document.dispatchEvent(new CustomEvent(type, { detail: { kind, source, animated: motionEnabled() } }));
  }

  function runCameo(kind, source = 'discovery') {
    if (!secretIds.includes(kind) || disposed || document.hidden) return;
    const requested = source !== 'ambient';
    const isNew = requested ? markDiscovered(kind) : false;
    // A requested sighting gets the stage; the first-arrival timer must not replace it.
    if (requested) {
      firstArrival = false;
      scheduleAmbient();
    }
    stopFlight();
    if (requested || kind === 'ironman') showTransmission(kind, requested, isNew);
    dispatchScene(kind, source);
    if (!motionEnabled() || kind === 'tree' || kind === 'jump') return;
    flight = document.createElement('div');
    flight.className = `cameo-flight cameo-flight-${kind}${requested ? ' cameo-requested' : ''}`;
    flight.setAttribute('aria-hidden', 'true');
    flight.innerHTML = `<div class="cameo-craft">${craft[kind]}</div>`;
    layer.appendChild(flight);
    const duration = kind === 'dragon' ? 20000 : kind === 'falcon' ? 13500 : 10500;
    flightTimer = window.setTimeout(stopFlight, duration + 500);
  }

  function scheduleAmbient() {
    clearTimeout(ambientTimer);
    ambientTimer = 0;
    if (disposed || document.hidden || !motionEnabled()) return;
    const delay = firstArrival ? 6000 + Math.random() * 1000 : 27000 + Math.random() * 16000;
    ambientTimer = window.setTimeout(() => {
      ambientTimer = 0;
      if (!document.hidden && motionEnabled() && !document.querySelector('dialog[open]')) {
        const kind = firstArrival ? 'falcon' : ['dragon', 'ironman', 'falcon'][ambientIndex++ % 3];
        runCameo(kind, 'ambient');
        firstArrival = false;
      }
      scheduleAmbient();
    }, delay);
  }

  function openDiscovery(button) {
    if (dialog.open) return;
    opener = button;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    renderDiscoveryCount();
    dialog.showModal();
    dialog.querySelector('.cameo-dialog-close').focus();
  }

  function onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const discover = target.closest('[data-discover]');
    const trigger = target.closest('[data-cameo]');
    const tree = target.closest('[data-easter-egg="tree"]');
    if (discover) { openDiscovery(discover); return; }
    if (trigger && craft[trigger.dataset.cameo]) {
      const kind = trigger.dataset.cameo;
      if (dialog.open) dialog.close();
      runCameo(kind, 'discovery');
    } else if (tree) {
      runCameo('tree', 'secret');
    }
  }

  function onKey(event) {
    const target = event.target;
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]')) return;
    if (event.repeat) return;
    if (Date.now() - keyTime > 5000) { keyboardBuffer = ''; konamiPosition = 0; }
    keyTime = Date.now();
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === konami[konamiPosition]) {
      konamiPosition++;
      if (konamiPosition === konami.length) {
        konamiPosition = 0;
        keyboardBuffer = '';
        runCameo('jump', 'secret');
        return;
      }
    } else konamiPosition = key === konami[0] ? 1 : 0;
    if (!/^[a-z]$/.test(key)) return;
    keyboardBuffer = (keyboardBuffer + key).slice(-16);
    const words = { falcon: 'falcon', dracarys: 'dragon', jarvis: 'ironman' };
    for (const [word, kind] of Object.entries(words)) {
      if (keyboardBuffer.endsWith(word)) {
        keyboardBuffer = '';
        runCameo(kind, 'secret');
        break;
      }
    }
  }

  function onMotionChange() {
    if (!motionEnabled()) stopFlight();
    renderDiscoveryCount();
    scheduleAmbient();
  }
  function onVisibilityChange() {
    if (document.hidden) {
      clearTimeout(ambientTimer);
      clearTimeout(consoleTimer);
      clearTimeout(liveTimer);
      stopFlight();
      consoleEl.classList.remove('is-visible');
    } else scheduleAmbient();
  }
  function onExternalCameo(event) {
    if (craft[event.detail?.type]) {
      runCameo(event.detail.type, 'discovery');
    }
  }
  function dispose() {
    disposed = true;
    clearTimeout(ambientTimer);
    clearTimeout(consoleTimer);
    clearTimeout(liveTimer);
    stopFlight();
    consoleEl.classList.remove('is-visible');
  }

  dialog.querySelector('.cameo-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('portfolio:motionchange', onMotionChange);
  document.addEventListener('cosmos:motionchange', onMotionChange);
  document.addEventListener('portfolio:cameo', onExternalCameo);
  reduced.addEventListener('change', onMotionChange);
  window.addEventListener('pagehide', dispose);
  window.addEventListener('pageshow', event => { if (event.persisted) { disposed = false; scheduleAmbient(); } });
  renderDiscoveryCount();
  scheduleAmbient();
})();
