/* The docking bay is reserved for the Millennium Falcon. Character cameos live in the scene. */
(() => {
  'use strict';
  const dialog = document.createElement('dialog');
  dialog.className = 'model-gallery';
  dialog.setAttribute('aria-labelledby', 'model-gallery-title');
  dialog.innerHTML = `<header class="model-gallery-header"><div><span class="eyebrow">THE DOCKING BAY</span><h2 id="model-gallery-title">Millennium Falcon</h2></div><button type="button" class="icon-button dialog-close" aria-label="Close 3D viewer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div id="model-stage" class="model-stage" role="region" aria-label="Interactive Millennium Falcon model"></div><footer class="model-gallery-footer"><div><p>Every panel has a story. Drag to explore the ship.</p><p class="model-credit" data-model-credit></p></div></footer><p class="model-external-note">Drag to orbit. Use + / − to zoom, or the arrow keys to rotate.</p>`;
  document.body.appendChild(dialog);
  const stage = dialog.querySelector('.model-stage');
  const credit = dialog.querySelector('[data-model-credit]');
  let opener = null, cleanup = null, controller = null, revision = 0, previousOverflow = '';
  function clear() {
    revision++;
    controller?.abort(); controller = null;
    cleanup?.(); cleanup = null;
    stage.replaceChildren();
  }
  async function loadFalcon() {
    clear();
    const version = revision;
    credit.textContent = 'Loading model credits…';
    const status = document.createElement('p');
    status.className = 'model-loading'; status.setAttribute('role', 'status');
    status.textContent = 'Opening the docking bay…'; stage.append(status);
    try {
      await import('./cameo-3d.js?v=20261029k');
      if (version !== revision) return;
      const canvasHost = document.createElement('div');
      canvasHost.className = 'model-local'; stage.append(canvasHost);
      controller = new AbortController();
      const destroy = await window.Portfolio3D.mount(canvasHost, 'falcon', {
        interactive: true, signal: controller.signal, onReady: () => status.remove()
      });
      if (version !== revision) { destroy?.(); return; }
      cleanup = destroy; status.remove();
      credit.innerHTML = 'Millennium Falcon by <a href="https://sketchfab.com/models/bd3e54ac20ff4ade8ddd8043db75c1d1" target="_blank" rel="noopener noreferrer">Johnson Martin</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · adapted from Flightradar24';
    } catch (_) {
      if (version !== revision) return;
      status.textContent = 'The model could not load. Please try again with WebGL enabled.';
      credit.textContent = 'The rest of the portfolio remains available.';
    }
  }
  function open(kind = 'falcon', button) {
    if (kind !== 'falcon') return;
    opener = button || document.activeElement;
    if (!dialog.open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    }
    loadFalcon(); dialog.querySelector('.dialog-close').focus();
  }
  window.openModelGallery = open;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-model-open="falcon"]');
    if (button) open('falcon', button);
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { clear(); document.body.style.overflow = previousOverflow; if (opener?.isConnected) opener.focus({ preventScroll: true }); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
})();
