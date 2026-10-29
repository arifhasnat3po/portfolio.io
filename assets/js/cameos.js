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

  const craft = { falcon:true, dragon:true, ironman:true };
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
  let flightCleanup = null;
  let flightMotion = null;
  let flightController = null;
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
  document.body.appendChild(consoleEl);
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
      <button type="button" class="cameo-discovery-card" data-cameo="falcon"><span class="cameo-preview cameo-preview-falcon"></span><span class="cameo-discovery-label"><small>01 / A FAMILIAR FREIGHTER</small><strong>The long way home <span aria-hidden="true">↗</span></strong><span>Call the Millennium Falcon</span></span></button>
      <button type="button" class="cameo-discovery-card" data-cameo="dragon"><span class="cameo-preview cameo-preview-dragon"></span><span class="cameo-discovery-label"><small>02 / FIRE IN THE DISTANCE</small><strong>Something with wings <span aria-hidden="true">↗</span></strong><span>Let Caraxes pass through</span></span></button>
      <button type="button" class="cameo-discovery-card" data-cameo="ironman"><span class="cameo-preview cameo-preview-ironman"></span><span class="cameo-discovery-label"><small>03 / A PRIVATE TRANSMISSION</small><strong>Call in the suit <span aria-hidden="true">↗</span></strong><span>A flyby, courtesy of JARVIS</span></span></button>
    </div>
    <footer class="cameo-discovery-footer"><span class="cameo-discovery-count"></span><span class="cameo-discovery-hint">There are still things the map won’t tell you.</span></footer>
    <p class="cameo-motion-note" hidden>Ambient motion is paused. You can still discover every visitor and read their transmission.</p>
  </div>`;
  document.body.appendChild(dialog);
  // Use the supplied references for the catalogue; the flybys use genuine meshes.
  const references={falcon:'falcon',dragon:'caraxes',ironman:'ironman'};
  dialog.querySelectorAll('[data-cameo]').forEach(button=>{
    const kind=button.dataset.cameo, preview=button.querySelector('.cameo-preview');
    preview.innerHTML=`<img src="assets/img/cameos/${references[kind]}-reference.png" alt="${names[kind]} reference" loading="lazy">`;
    if(kind==='dragon')button.querySelector('.cameo-discovery-label > span').textContent='See my favorite Caraxes scenes';
  });
  const modelLinks=document.createElement('div');modelLinks.className='cameo-model-links';
  modelLinks.innerHTML='<button type="button" data-model-open="falcon">Enter the Falcon docking bay ↗</button>';
  dialog.querySelector('.cameo-discovery-options').after(modelLinks);
  const credits=document.createElement('p');credits.className='model-credit';
  credits.innerHTML='Flyby artwork: <a href="https://sketchfab.com/3d-models/iron-man-mark-85-rigged-dde1085c464d4f8da259fe6669ae4dd2" target="_blank" rel="noopener noreferrer">Iron Man retexture &amp; rig by Nihar Arora / 9A Films</a>, original model by <a href="https://sketchfab.com/LLIypuk" target="_blank" rel="noopener noreferrer">LLIypuk</a> · <a href="https://sketchfab.com/models/bd3e54ac20ff4ade8ddd8043db75c1d1" target="_blank" rel="noopener noreferrer">Falcon by Johnson Martin</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Adapted for this observatory.';
  modelLinks.after(credits);
  function afterDiscoveryClose(action) {
    if (!dialog.open) { action(); return; }
    // The existing close handler restores focus and scroll before the next scene opens.
    dialog.addEventListener('close', action, { once: true });
    dialog.close();
  }
  modelLinks.addEventListener('click',event=>{const button=event.target.closest('[data-model-open]');if(!button)return;event.stopPropagation();const returnTo=opener;afterDiscoveryClose(()=>window.openModelGallery?.(button.dataset.modelOpen,returnTo));});

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
    flightMotion?.(); flightMotion=null;
    flightController?.abort();flightController=null;
    flightCleanup?.(); flightCleanup=null;
    flight?.remove();
    flight = null;
  }

  function dispatchScene(kind, source) {
    const type = kind === 'dragon' || kind === 'tree' ? 'cosmos:tree' : kind === 'ironman' ? 'cosmos:transmission' : 'cosmos:jump';
    document.dispatchEvent(new CustomEvent(type, { detail: { kind, source, animated: motionEnabled() } }));
  }

  async function runCameo(kind, source = 'discovery', returnTo = opener) {
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
    if(kind==='dragon'){
      if(requested&&source!=='cinema')requestAnimationFrame(()=>document.dispatchEvent(new CustomEvent('portfolio:cinema-open',{detail:{title:'House of the Dragon',opener:returnTo}})));
      return;
    }
    if (!motionEnabled() || kind === 'tree' || kind === 'jump') return;
    flight = document.createElement('div');
    flight.className = `cameo-flight cameo-flight-${kind}${requested ? ' cameo-requested' : ''}`;
    flight.setAttribute('aria-hidden', 'true');
    flight.classList.add('is-loading', 'is-physical');
    flight.innerHTML = '<div class="cameo-craft cameo-craft-3d"></div>';
    layer.appendChild(flight);
    const currentFlight=flight;
    try{
      await import('./cameo-3d.js?v=20261029g');
      if(currentFlight!==flight)return;
      flightController=new AbortController();
      const destroy=await window.Portfolio3D.mount(currentFlight.firstElementChild,kind,{interactive:false,signal:flightController.signal});
      if(currentFlight!==flight){destroy?.();return;}
      flightCleanup=destroy;currentFlight.classList.remove('is-loading');
      flightMotion=window.PortfolioFlight.start(currentFlight,kind,{
        setFlightState:destroy.setFlightState,
        onComplete:()=>{if(currentFlight===flight)stopFlight();}
      });
      // Dispose even if a future renderer fails before the flight's natural exit.
      flightTimer=window.setTimeout(()=>{if(currentFlight===flight)stopFlight();},kind==='falcon'?26000:20000);
    }catch(_){
      if(currentFlight!==flight)return;stopFlight();
      if(requested){consoleEl.querySelector('.cameo-console-text').textContent='The 3D visitor could not load. Please try again; its reference and artwork credits are in Explore the unknown.';}
    }
  }

  function scheduleAmbient() {
    clearTimeout(ambientTimer);
    ambientTimer = 0;
    if (disposed || document.hidden || !motionEnabled()) return;
    const delay = firstArrival ? 6000 + Math.random() * 1000 : 27000 + Math.random() * 16000;
    ambientTimer = window.setTimeout(() => {
      ambientTimer = 0;
      if (!document.hidden && motionEnabled() && !flight && !document.querySelector('dialog[open]')) {
        const kind = firstArrival ? 'falcon' : ['ironman', 'falcon'][ambientIndex++ % 2];
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
      const returnTo = opener;
      afterDiscoveryClose(() => runCameo(kind, 'discovery', returnTo));
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
      runCameo(event.detail.type, 'cinema',event.detail.opener);
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
