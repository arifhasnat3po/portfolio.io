/* Real models, loaded only when a visitor opens the hangar. */
(() => {
  'use strict';
  const models = {
    ironman: {name:'Iron Man · Mark VII', eyebrow:'01 / THE ARMOURY', note:'Red and gold. A closer look at the suit.', embed:'a13c067e70814dc7b2ebc3f0ace10961', author:'benjamin.borromeo', url:'https://sketchfab.com/3d-models/iron-man-mark-7subsurf-a13c067e70814dc7b2ebc3f0ace10961'},
    falcon: {name:'Millennium Falcon', eyebrow:'02 / DOCKING BAY', note:'Every panel has a story. Drag to explore the ship.', local:true},
    dragon: {name:'Caraxes · The Blood Wyrm', eyebrow:'03 / BEYOND THE WALL', note:'A study in scales, wings, and a very long neck.', embed:'9d4b6159f0ed424f9f34034dae241457', author:'PixForge', url:'https://sketchfab.com/3d-models/caraxes-the-blood-wyrm-9d4b6159f0ed424f9f34034dae241457'}
  };
  const dialog = document.createElement('dialog');
  dialog.className='model-gallery'; dialog.setAttribute('aria-labelledby','model-gallery-title');
  dialog.innerHTML=`<header class="model-gallery-header"><div><span class="eyebrow" data-model-eyebrow></span><h2 id="model-gallery-title"></h2></div><button type="button" class="icon-button dialog-close" aria-label="Close 3D viewer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="model-tabs" role="tablist" aria-label="Choose a 3D model">${Object.entries(models).map(([id,m])=>`<button type="button" role="tab" id="model-tab-${id}" aria-controls="model-stage" data-model-tab="${id}">${m.name.split(' · ')[0]}</button>`).join('')}</div><div id="model-stage" class="model-stage" role="tabpanel"></div><footer class="model-gallery-footer"><div><p data-model-note></p><p class="model-credit" data-model-credit></p></div><button type="button" class="button button-outline" data-model-alternate hidden>Watch the wing animation ↗</button></footer><p class="model-external-note" data-model-external>Interactive 3D hosted by Sketchfab. Drag to orbit; pinch or scroll to zoom.</p>`;
  document.body.appendChild(dialog);
  const stage=dialog.querySelector('.model-stage');
  const alternate=dialog.querySelector('[data-model-alternate]');
  let current='ironman', opener=null, cleanup=null, controller=null, revision=0, animatedDragon=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const isMoving=()=>!reduced.matches&&document.documentElement.dataset.motion!=='off';
  const clear=()=>{revision++;controller?.abort();controller=null;if(cleanup){cleanup();cleanup=null;}stage.replaceChildren();};
  async function select(kind) {
    clear();current=kind;animatedDragon=false;const m=models[kind], version=revision;
    dialog.querySelector('[data-model-eyebrow]').textContent=m.eyebrow;
    dialog.querySelector('h2').textContent=m.name;
    dialog.querySelector('[data-model-note]').textContent=m.note;
    dialog.querySelectorAll('[data-model-tab]').forEach(button=>{const active=button.dataset.modelTab===kind;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    stage.setAttribute('aria-labelledby',`model-tab-${kind}`);
    alternate.hidden=kind!=='dragon';alternate.textContent='Watch the wing animation ↗';
    dialog.querySelector('[data-model-external]').textContent=m.local?'Drag to orbit. Use + / − to zoom, or the arrow keys to rotate.':'Interactive 3D hosted by Sketchfab. Drag to orbit; pinch or scroll to zoom.';
    const credit=dialog.querySelector('[data-model-credit]');
    if(m.local){
      credit.textContent='Loading model credits…';
      const status=document.createElement('p');status.className='model-loading';status.setAttribute('role','status');status.textContent='Opening the docking bay…';stage.append(status);
      try {
        await import('./cameo-3d.js?v=20261029d');
        if(version!==revision)return;
        const canvasHost=document.createElement('div');canvasHost.className='model-local';stage.append(canvasHost);
        controller=new AbortController();
        const destroy=await window.Portfolio3D.mount(canvasHost,kind,{interactive:true,signal:controller.signal,onReady:()=>status.remove()});
        if(version!==revision){destroy?.();return;}cleanup=destroy;status.remove();
        credit.innerHTML='Millennium Falcon by <a href="https://sketchfab.com/models/bd3e54ac20ff4ade8ddd8043db75c1d1" target="_blank" rel="noopener noreferrer">Johnson Martin</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · adapted from Flightradar24';
      }catch(_){if(version!==revision)return;status.textContent='The model could not load. Please try again with WebGL enabled.';credit.textContent='The rest of the portfolio remains available.';}
    }else loadEmbed(m.embed,m.author,m.url, false);
  }
  function loadEmbed(id,author,url,animated) {
    stage.replaceChildren();
    const frame=document.createElement('iframe');frame.title=`${models[current].name} interactive 3D model`;
    frame.allow='autoplay; fullscreen; xr-spatial-tracking';frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.src=`https://sketchfab.com/models/${id}/embed?autostart=1&camera=0&autospin=${isMoving()&&!animated?'.12':'0'}&animation_autoplay=${isMoving()?'1':'0'}`;
    stage.append(frame);
    const credit=dialog.querySelector('[data-model-credit]');credit.replaceChildren();
    const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=`3D model by ${author} · View original ↗`;credit.append(link);
    if(!animated){const license=document.createElement('a');license.href='https://creativecommons.org/licenses/by/4.0/';license.target='_blank';license.rel='noopener noreferrer';license.textContent='CC BY 4.0';credit.append(' · ',license);}
  }
  function open(kind='ironman',button) {
    if(!models[kind])return;
    opener=button||document.activeElement;
    if(!dialog.open)dialog.showModal();
    select(kind);dialog.querySelector('.dialog-close').focus();
  }
  window.openModelGallery=open;
  document.addEventListener('click',event=>{const button=event.target.closest('[data-model-open]');if(button)open(button.dataset.modelOpen,button);});
  dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{clear();if(opener?.isConnected)opener.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});
  dialog.querySelectorAll('[data-model-tab]').forEach(button=>{
    button.addEventListener('click',()=>select(button.dataset.modelTab));
    button.addEventListener('keydown',event=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const tabs=[...dialog.querySelectorAll('[data-model-tab]')],i=tabs.indexOf(button),n=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;tabs[n].focus();select(tabs[n].dataset.modelTab);});
  });
  alternate.addEventListener('click',()=>{
    animatedDragon=!animatedDragon;
    if(animatedDragon){loadEmbed('3e9b3b82957d4e4aa2a19c4ee346ecbc','Alperen Ekinci','https://sketchfab.com/3d-models/3e9b3b82957d4e4aa2a19c4ee346ecbc',true);alternate.textContent='Return to the detailed sculpture ↗';dialog.querySelector('[data-model-note]').textContent='A hand-painted Caraxes with an animated wing cycle.';}
    else select('dragon');
  });
  const syncMotion=()=>{if(dialog.open&&!models[current].local){if(animatedDragon)loadEmbed('3e9b3b82957d4e4aa2a19c4ee346ecbc','Alperen Ekinci','https://sketchfab.com/3d-models/3e9b3b82957d4e4aa2a19c4ee346ecbc',true);else{const m=models[current];loadEmbed(m.embed,m.author,m.url,false);}}};
  document.addEventListener('portfolio:motionchange',syncMotion);reduced.addEventListener('change',syncMotion);
})();
