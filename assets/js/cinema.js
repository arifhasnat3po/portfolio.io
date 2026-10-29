/* Observatory film archive: supplied frames, restrained depth, accessible scene viewer. */
(() => {
  'use strict';

  const root = document.getElementById('cinema-root');
  if (!root) return;

  const base = 'assets/img/watchlist/';
  const frame = (file, width, height, alt) => ({ src: `${base}${file}.webp`, width, height, alt });
  const titles = [
    { title: 'Star Wars', kind: 'film', genre: 'A galaxy far, far away', accent: '#d8b47c', wide: true, cameo: 'falcon', orbitLabel: 'Send the Falcon into orbit', frames: [frame('star-wars', 1440, 810, 'Star Wars saga collage with spacecraft and lightsabers')] },
    { title: 'Iron Man', kind: 'film', genre: 'Marvel universe', accent: '#d8b47c', position: '58% 45%', cameo: 'ironman', orbitLabel: 'Send Iron Man into orbit', frames: [frame('iron-man', 1391, 700, 'Iron Man testing a glowing repulsor'), frame('iron-man-jericho', 857, 358, 'Iron Man film scene in front of a mountain range')] },
    { title: 'House of the Dragon', kind: 'series', genre: 'Fire & blood', accent: '#d8b47c', position: '70% 50%', cameo: 'dragon', orbitLabel: 'Wake the dragon’s constellation', frames: [frame('house-of-the-dragon', 1440, 960, 'House of the Dragon scene beside Caraxes'), frame('house-of-the-dragon-throne', 1440, 810, 'House of the Dragon scene with a sword and dragon banners')] },
    { title: 'Friends', kind: 'series', genre: 'Central Perk', accent: '#f5ce92', frames: [frame('friends', 739, 415, 'Friends ensemble portrait'), frame('friends-central-perk', 900, 587, 'Friends gathered in Central Perk')] },
    { title: 'Spider-Man: No Way Home', kind: 'film', genre: 'Across the multiverse', accent: '#f29999', frames: [frame('spider-man', 596, 335, 'Three Spider-Man suits in an action scene'), frame('spider-man-point', 1200, 676, 'Three Spider-Man characters pointing at each other')] },
    { title: 'Loki', kind: 'series', genre: 'For all time. Always.', accent: '#9dcea2', position: '65% 50%', frames: [frame('loki', 1440, 810, 'Loki and Sylvie sitting in a green landscape')] },
    { title: 'Black Sails', kind: 'series', genre: 'Adventure on the high seas', accent: '#80c7ce', frames: [frame('black-sails', 1440, 960, 'Black Sails crew aboard a sailing ship')] },
    { title: 'The Avengers', kind: 'film', genre: 'Earth’s mightiest heroes', accent: '#86b6e5', frames: [frame('avengers', 1200, 675, 'The Avengers assembled together')] },
    { title: 'Game of Thrones', kind: 'series', genre: 'The world of Westeros', accent: '#9cbdd1', frames: [frame('game-of-thrones', 596, 335, 'Game of Thrones battlefield with cavalry approaching')] },
    { title: 'Harry Potter', kind: 'film', genre: 'The wizarding world', accent: '#e1be80', frames: [frame('harry-potter', 783, 391, 'Harry Potter trio in Hogwarts robes')] },
    { title: 'Stranger Things', kind: 'series', genre: 'Welcome to Hawkins', accent: '#ea9c9c', frames: [frame('stranger-things', 739, 415, 'Stranger Things group gathered around a table')] },
    { title: 'Breaking Bad', kind: 'series', genre: 'Albuquerque stories', accent: '#c4d58b', frames: [frame('breaking-bad', 595, 336, 'Breaking Bad characters seated in the desert')] },
    { title: 'The Office', kind: 'series', genre: 'Life at Dunder Mifflin', accent: '#83d3ed', frames: [frame('the-office', 678, 452, 'The Office cast around a desk')] },
    { title: 'The Big Bang Theory', kind: 'series', genre: 'Science meets sitcom', accent: '#e5b2ad', frames: [frame('the-big-bang-theory', 1440, 811, 'The Big Bang Theory group sharing a meal')] },
    { title: 'The Last of Us', kind: 'series', genre: 'Endure & survive', accent: '#bac8a1', position: '56% 40%', frames: [frame('the-last-of-us', 1440, 1080, 'The Last of Us characters in an overgrown city')] },
    { title: 'The Witcher', kind: 'series', genre: 'Tales of the Continent', accent: '#9bcfc8', frames: [frame('the-witcher', 1440, 810, 'The Witcher scene with a white-haired swordsman')] },
    { title: 'Interstellar', kind: 'film', genre: 'Across space and time', accent: '#d8c7a2', frames: [frame('interstellar', 1200, 800, 'Cooper in his spacesuit aboard a spacecraft in Interstellar')] },
    { title: 'Sherlock', kind: 'series', genre: 'The game is on', accent: '#a3b9ca', frames: [frame('sherlock', 739, 415, 'Sherlock Holmes and John Watson against the London skyline')] },
    { title: 'The Dark Knight', kind: 'film', genre: 'Gotham after dark', accent: '#b6b88c', frames: [frame('the-dark-knight', 1920, 1280, 'Batman and the Joker facing each other in the interrogation room in The Dark Knight')] }
  ];

  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  const expand = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const initialCount = 7;
  let filter = 'all';
  let expanded = true;
  let opener = null;
  let viewerFrames = [];
  let viewerIndex = 0;
  let pageOverflow = '';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionAllowed = () => !reduceMotion.matches && document.documentElement.dataset.motion !== 'off';
  const spotlight = titles[2];
  const spotlightFrame = spotlight.frames[0];

  root.innerHTML = `
    <div class="cinema-heading">
      <div><p class="cinema-eyebrow"><span aria-hidden="true">✳</span> THE OBSERVATORY / AFTER HOURS</p>
      <h2>Some of<br><em>my favorites.</em></h2></div>
      <div class="cinema-intro"><span class="cinema-index">PERSONAL FAVORITES <i aria-hidden="true"></i> VOL. 01</span><p>Some worlds stay with you long after the credits. These are a few of mine.</p><span class="cinema-tally">Movies, shows &amp; scenes that stayed with me</span></div>
    </div>
    <div class="cinema-spotlight">
      <img class="cinema-spotlight-image" src="${spotlightFrame.src}" width="${spotlightFrame.width}" height="${spotlightFrame.height}" alt="${escapeHTML(spotlightFrame.alt)}" loading="lazy" decoding="async">
      <div class="cinema-spotlight-shade" aria-hidden="true"></div><div class="cinema-viewfinder" aria-hidden="true"></div>
      <div class="cinema-spotlight-top"><span><i aria-hidden="true"></i> IN THE VIEWFINDER</span><span>ARCHIVE 003 / SERIES</span></div>
      <div class="cinema-spotlight-copy"><p class="cinema-spotlight-kicker">FROM THE WORLD OF WESTEROS</p><h3>House of<br>the Dragon<span>.</span></h3><p>Fire, ambition, and a world<br>that refuses to let go.</p><button class="cinema-spotlight-open" type="button">Enter the scene ${arrow}</button></div>
      <div class="cinema-spotlight-note"><span class="cinema-spotlight-coordinate" aria-hidden="true">+ 03 / ${String(titles.length).padStart(2, '0')}</span><span>CARAXES &amp; DAEMON<br><small>A FAVORITE FRAME</small></span></div>
    </div>
    <div class="cinema-spotlight-caption"><span>FIELD NOTES <span aria-hidden="true">—</span> SOME OF MY FAVORITE MOVIES &amp; SHOWS</span><span>SCROLL TO THE CONTACT SHEET <span aria-hidden="true">↓</span></span></div>
    <div class="cinema-toolbar">
      <div class="cinema-filters" role="group" aria-label="Filter watchlist">
        <button type="button" data-cinema-filter="all" aria-pressed="true">All favorites</button>
        <button type="button" data-cinema-filter="film" aria-pressed="false">Films</button>
        <button type="button" data-cinema-filter="series" aria-pressed="false">Series</button>
      </div>
      <span class="cinema-hint">THE CONTACT SHEET <span aria-hidden="true">↗</span> OPEN A FRAME</span>
    </div>
    <div class="cinema-grid" id="cinema-grid"></div>
    <div class="cinema-gallery-footer"><p id="cinema-status" role="status" aria-live="polite"></p><button class="cinema-more" type="button" aria-controls="cinema-grid" aria-expanded="false">Show more favorites ${arrow}</button></div>
    <dialog class="cinema-dialog" aria-labelledby="cinema-viewer-title" aria-describedby="cinema-viewer-description">
      <div class="cinema-viewer">
        <div class="cinema-viewer-top"><span class="cinema-eyebrow">THE OBSERVATORY / SCENE VIEWER</span><button type="button" class="cinema-close" aria-label="Close scene viewer" autofocus>×</button></div>
        <div class="cinema-screen"><img class="cinema-viewer-image" alt="" width="1440" height="810"><button class="cinema-prev" type="button" aria-label="Previous image">${arrow}</button><button class="cinema-next" type="button" aria-label="Next image">${arrow}</button></div>
        <div class="cinema-viewer-footer"><div><p class="cinema-viewer-category"></p><h3 id="cinema-viewer-title"></h3><p id="cinema-viewer-description"></p></div><div class="cinema-frame-tools"><span class="cinema-frame-count" aria-live="polite"></span><div class="cinema-thumbnails" role="group" aria-label="Scenes from this title"></div></div></div>
        <div class="cinema-viewer-actions" hidden><span>A LITTLE BEYOND THE SCREEN</span><button class="cinema-orbit" type="button"><span></span>${arrow}</button></div>
      </div>
    </dialog>`;

  const grid = root.querySelector('.cinema-grid');
  const status = root.querySelector('#cinema-status');
  const moreButton = root.querySelector('.cinema-more');
  const dialog = root.querySelector('.cinema-dialog');
  const image = root.querySelector('.cinema-viewer-image');
  const thumbnails = root.querySelector('.cinema-thumbnails');
  const orbitButton = root.querySelector('.cinema-orbit');
  let tiltCleanups = [];

  function visibleTitles() { return titles.filter(title => filter === 'all' || title.kind === filter); }

  function renderGallery() {
    tiltCleanups.forEach(cleanup => cleanup());
    tiltCleanups = [];
    const matching = visibleTitles();
    const displayed = expanded ? matching : matching.slice(0, initialCount);
    grid.innerHTML = displayed.map(title => {
      const image = title.frames[0];
      const index = titles.indexOf(title);
      return `<div class="cinema-slot${title.wide ? ' cinema-slot-wide' : ''}">
        <button type="button" class="cinema-card" data-cinema-title="${index}" style="--cinema-position:${title.position || 'center'}" aria-label="View ${escapeHTML(title.title)}, ${title.frames.length} ${title.frames.length === 1 ? 'image' : 'images'}">
          <span class="cinema-contact-label"><span>${String(index + 1).padStart(2, '0')} <span aria-hidden="true">/</span> ${title.kind === 'film' ? 'MOTION PICTURE' : 'TELEVISION'}</span><span>${title.frames.length > 1 ? `0${title.frames.length} FRAMES` : '01 FRAME'}</span></span>
          <span class="cinema-poster"><img src="${image.src}" width="${image.width}" height="${image.height}" alt="${escapeHTML(image.alt)}" loading="lazy" decoding="async"><span class="cinema-shade"></span><span class="cinema-glare" aria-hidden="true"></span><span class="cinema-expand" aria-hidden="true">${expand}</span></span>
          <span class="cinema-card-copy"><span><span class="cinema-title">${escapeHTML(title.title)}</span><span class="cinema-genre">${escapeHTML(title.genre)}</span></span><span class="cinema-card-arrow" aria-hidden="true">${arrow}</span></span>
        </button></div>`;
    }).join('');
    status.textContent = filter === 'film' ? 'Some of my favorite films.' : filter === 'series' ? 'Some of my favorite shows.' : 'Some of my favorite movies and shows.';
    moreButton.hidden = matching.length <= initialCount;
    moreButton.setAttribute('aria-expanded', String(expanded));
    moreButton.innerHTML = `${expanded ? 'Show fewer favorites' : 'Show more favorites'} ${arrow}`;
    grid.querySelectorAll('.cinema-card').forEach(card => {
      card.addEventListener('click', () => openViewer(Number(card.dataset.cinemaTitle), card));
      installTilt(card);
    });
  }

  function installTilt(card) {
    let raf = 0;
    let cursor = null;
    const reset = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      cursor = null;
      card.classList.remove('cinema-is-tilting');
      card.style.removeProperty('--cinema-rx');
      card.style.removeProperty('--cinema-ry');
      card.style.removeProperty('--cinema-gx');
      card.style.removeProperty('--cinema-gy');
    };
    const update = () => {
      raf = 0;
      if (!cursor || !motionAllowed() || !finePointer.matches) { reset(); return; }
      const bounds = card.parentElement.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (cursor.x - bounds.left) / bounds.width));
      const y = Math.min(1, Math.max(0, (cursor.y - bounds.top) / bounds.height));
      card.classList.add('cinema-is-tilting');
      card.style.setProperty('--cinema-rx', `${(0.5 - y) * 7}deg`);
      card.style.setProperty('--cinema-ry', `${(x - 0.5) * 8}deg`);
      card.style.setProperty('--cinema-gx', `${x * 100}%`);
      card.style.setProperty('--cinema-gy', `${y * 100}%`);
    };
    const move = event => {
      if (event.pointerType === 'touch' || !motionAllowed() || !finePointer.matches) return;
      cursor = { x: event.clientX, y: event.clientY };
      if (!raf) raf = requestAnimationFrame(update);
    };
    card.addEventListener('pointermove', move, { passive: true });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
    card.addEventListener('blur', reset);
    tiltCleanups.push(() => {
      reset();
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', reset);
      card.removeEventListener('pointercancel', reset);
      card.removeEventListener('blur', reset);
    });
  }

  function resetAllTilt() {
    // Keep listeners installed when motion preferences change at runtime.
    grid.querySelectorAll('.cinema-card').forEach(card => {
      card.classList.remove('cinema-is-tilting');
      ['--cinema-rx', '--cinema-ry', '--cinema-gx', '--cinema-gy'].forEach(property => card.style.removeProperty(property));
    });
    root.dataset.cinemaMotion = motionAllowed() ? 'on' : 'off';
  }

  function openViewer(titleIndex, button, fullCollection = false) {
    opener = button;
    viewerFrames = (fullCollection ? titles : visibleTitles()).flatMap(title => title.frames.map((scene, sceneIndex) => ({ title, scene, sceneIndex })));
    viewerIndex = viewerFrames.findIndex(item => item.title === titles[titleIndex]);
    if (viewerIndex < 0) return;
    updateViewer();
    pageOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    root.querySelector('.cinema-close').focus();
  }

  function updateViewer() {
    const current = viewerFrames[viewerIndex];
    const { title, scene, sceneIndex } = current;
    dialog.style.setProperty('--cinema-accent', title.accent);
    image.src = scene.src;
    image.alt = scene.alt;
    image.width = scene.width;
    image.height = scene.height;
    root.querySelector('#cinema-viewer-title').textContent = title.title;
    root.querySelector('.cinema-viewer-category').textContent = `${title.kind === 'film' ? 'FILM' : 'SERIES'} / ${title.genre}`;
    root.querySelector('#cinema-viewer-description').textContent = `Scene ${sceneIndex + 1} of ${title.frames.length}. Use the arrow buttons or left and right keys to explore the collection.`;
    root.querySelector('.cinema-frame-count').textContent = `${String(viewerIndex + 1).padStart(2, '0')} / ${String(viewerFrames.length).padStart(2, '0')} FRAMES`;
    thumbnails.innerHTML = title.frames.map((scene, index) => `<button type="button" aria-label="View scene ${index + 1} from ${escapeHTML(title.title)}" aria-pressed="${index === sceneIndex}" data-scene="${index}"><img src="${scene.src}" alt="" width="80" height="48"></button>`).join('');
    thumbnails.hidden = title.frames.length < 2;
    root.querySelector('.cinema-viewer-actions').hidden = !title.cameo;
    orbitButton.querySelector('span').textContent = title.orbitLabel || '';
    orbitButton.dataset.cameo = title.cameo || '';
    thumbnails.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      viewerIndex = viewerFrames.findIndex(item => item.title === title && item.sceneIndex === Number(button.dataset.scene));
      updateViewer();
      thumbnails.querySelector(`[data-scene="${button.dataset.scene}"]`)?.focus();
    }));
  }

  function stepViewer(direction) {
    viewerIndex = (viewerIndex + direction + viewerFrames.length) % viewerFrames.length;
    updateViewer();
  }

  root.querySelectorAll('[data-cinema-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.cinemaFilter;
    expanded = false;
    root.querySelectorAll('[data-cinema-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderGallery();
  }));
  root.querySelector('.cinema-spotlight-open').addEventListener('click', event => openViewer(2, event.currentTarget, true));
  document.addEventListener('portfolio:cinema-open', event => {
    const index = titles.findIndex(title => title.title === event.detail?.title);
    if (index >= 0 && !dialog.open) openViewer(index, event.detail.opener || root.querySelector('.cinema-spotlight-open'), true);
  });
  orbitButton.addEventListener('click', event => {
    event.stopPropagation();
    const type = orbitButton.dataset.cameo;
    if (!['dragon', 'falcon', 'ironman'].includes(type)) return;
    dialog.close();
    document.dispatchEvent(new CustomEvent('portfolio:cameo', { detail: { type, opener } }));
  });
  moreButton.addEventListener('click', () => {
    expanded = !expanded;
    renderGallery();
    if (!expanded) root.querySelector('.cinema-toolbar').scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'auto', block: 'start' });
  });
  root.querySelector('.cinema-close').addEventListener('click', () => dialog.close());
  root.querySelector('.cinema-prev').addEventListener('click', () => stepViewer(-1));
  root.querySelector('.cinema-next').addEventListener('click', () => stepViewer(1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      stepViewer(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = pageOverflow;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  reduceMotion.addEventListener('change', resetAllTilt);
  document.addEventListener('portfolio:motionchange', resetAllTilt);
  window.addEventListener('portfolio:motionchange', resetAllTilt);
  let spotlightVisible = false;
  const updateAmbient = () => { root.dataset.cinemaVisible = String(spotlightVisible && !document.hidden); };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      spotlightVisible = entries[0].isIntersecting;
      updateAmbient();
    }, { threshold: 0.12 });
    observer.observe(root.querySelector('.cinema-spotlight'));
  } else {
    spotlightVisible = true;
    updateAmbient();
  }
  document.addEventListener('visibilitychange', updateAmbient);
  resetAllTilt();
  renderGallery();
})();
