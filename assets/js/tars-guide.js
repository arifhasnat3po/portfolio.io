/* A local portfolio companion: explicit voice opt-in, bounded answers, accessible controls. */
import { answerTars, tarsPrompts } from './tars-knowledge.js?v=20261029a';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const robotIcon = '<svg viewBox="0 0 64 92" fill="none" aria-hidden="true"><path d="M7 7h12v75H7zm15-3h12v82H22zm15 0h12v82H37zm15 3h9v75h-9z" fill="currentColor" opacity=".72"/><path d="M24 23h8v10h-8zm15 0h8v10h-8z" fill="#183b41"/><path d="M25 26h6m9 0h6M25 29h4m11 0h5" stroke="#b9e8e6" stroke-width=".8"/></svg>';
const dock = document.createElement('aside');
dock.className = 'tars-dock';
dock.setAttribute('aria-label', 'TARS portfolio companion');
dock.innerHTML = `<button type="button" class="tars-launcher" data-tars-open aria-haspopup="dialog" aria-controls="tars-guide"><span class="tars-mini-stage" aria-hidden="true"><span class="tars-static">${robotIcon}</span></span><span class="tars-launcher-label"><i aria-hidden="true"></i>Ask TARS <span aria-hidden="true">↗</span></span></button><button class="tars-stow" type="button" aria-label="Minimize TARS robot" title="Minimize robot">−</button>`;
document.body.append(dock);

const dialog = document.createElement('dialog');
dialog.id = 'tars-guide';
dialog.className = 'tars-dialog';
dialog.setAttribute('aria-labelledby', 'tars-heading');
dialog.setAttribute('aria-describedby', 'tars-description');
dialog.innerHTML = `<header class="tars-header"><div><span class="tars-kicker">OBSERVATORY CREW / 06</span><h2 id="tars-heading">Your co-pilot, <em>TARS.</em></h2><p id="tars-description">A friendly guide to Arif’s work. A slightly unusual walking companion.</p></div><button type="button" class="tars-close" aria-label="Close TARS guide" autofocus>×</button></header>
  <div class="tars-layout"><section class="tars-bay" aria-label="Interactive 3D TARS robot"><div class="tars-bay-label"><span>TARS / ONLINE</span><span>EARTH GRAVITY</span></div><div class="tars-stage" role="img" aria-label="Articulated silver TARS robot standing on a softly lit floor"><span class="tars-static">${robotIcon}</span></div><div class="tars-model-note" role="status">Preparing the docking bay…</div><div class="tars-actions" role="group" aria-label="TARS movement"><button type="button" data-tars-action="walk">Walk</button><button type="button" data-tars-action="wave">Wave</button><button type="button" data-tars-action="balance">Balance</button><button type="button" data-tars-action="nudge">Nudge</button></div><p class="tars-motion-note" hidden>Motion is paused. The guide is still ready to help.</p><button type="button" class="tars-resume" hidden>Enable motion</button><div class="tars-personality"><label for="tars-humor">Humor setting <output for="tars-humor">65%</output></label><input type="range" id="tars-humor" min="0" max="100" value="65" step="5" aria-label="TARS humor setting"></div></section>
  <section class="tars-conversation" aria-label="Conversation with TARS"><div class="tars-conversation-top"><span><i aria-hidden="true"></i>PORTFOLIO GUIDE</span><button type="button" class="tars-voice" aria-pressed="false">Voice off</button></div><div class="tars-log" role="log" tabindex="0" aria-live="polite" aria-relevant="additions" aria-label="TARS conversation"></div><div class="tars-prompts" aria-label="Suggested questions"></div><form class="tars-form"><label for="tars-question">Ask about Arif’s projects, skills, or favorite worlds</label><div><input id="tars-question" name="question" type="text" maxlength="400" required autocomplete="off" placeholder="What should I explore first?"><button type="submit" aria-label="Send question to TARS">Send ↗</button></div></form><p class="tars-scope">Prewritten, topic-matched answers from this portfolio. Voice, when enabled, uses your browser’s speech service.</p><p class="tars-feedback" role="status"></p></section></div>`;
document.body.append(dialog);

const miniHost = dock.querySelector('.tars-mini-stage');
const stage = dialog.querySelector('.tars-stage');
const log = dialog.querySelector('.tars-log');
const input = dialog.querySelector('#tars-question');
const feedback = dialog.querySelector('.tars-feedback');
const voiceButton = dialog.querySelector('.tars-voice');
let mini = null, full = null, miniLoading = false, fullLoading = false;
let miniEpoch = 0, fullEpoch = 0, rendererModule = null;
let opener = null, previousOverflow = '', stowed = false, heroVisible = true;
let humor = 65, voice = false, lastAnswer = '', utterance = null, speechToken = 0;
let disposed = false, sessionActive = false, queuedOpener = null;
const motionAllowed = () => !reduced.matches && document.documentElement.dataset.motion !== 'off';
const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
if (!canSpeak) { voiceButton.disabled = true; voiceButton.textContent = 'Voice unavailable'; }

function loadRenderer() {
  if (!rendererModule) rendererModule = import('./tars-3d.js?v=20261029c').catch(error => { rendererModule = null; throw error; });
  return rendererModule;
}

function updateMotion() {
  const allowed = motionAllowed() && !document.hidden && !disposed;
  mini?.setMotion(allowed && heroVisible && !stowed && !dialog.open && !document.querySelector('dialog[open]'));
  full?.setMotion(allowed && dialog.open);
  dialog.querySelectorAll('[data-tars-action]').forEach(button => { button.disabled = !motionAllowed() || !full; });
  dialog.querySelector('.tars-motion-note').hidden = motionAllowed();
  dialog.querySelector('.tars-resume').hidden = motionAllowed() || reduced.matches;
  dock.classList.toggle('is-stowed', stowed || !heroVisible);
  if (document.hidden) stopSpeaking();
}

async function mountMini() {
  if (mini || miniLoading || disposed || !heroVisible || stowed || dialog.open) return;
  miniLoading = true;
  const epoch = ++miniEpoch;
  try {
    const { mountTars } = await loadRenderer();
    if (disposed || epoch !== miniEpoch) return;
    const renderer = await mountTars(miniHost, { compact: true });
    if (disposed || epoch !== miniEpoch) { renderer.destroy(); return; }
    mini = renderer;
    miniHost.dataset.ready = 'true';
    updateMotion();
    if (motionAllowed() && heroVisible && !dialog.open) mini.perform('wave');
  } catch { miniHost.dataset.ready = 'false'; }
  finally { miniLoading = false; }
}

async function mountFull() {
  if (full || fullLoading || disposed || !dialog.open) return;
  fullLoading = true;
  const epoch = ++fullEpoch;
  try {
    const { mountTars } = await loadRenderer();
    if (disposed || epoch !== fullEpoch || !dialog.open) return;
    const renderer = await mountTars(stage, { compact: false });
    if (disposed || epoch !== fullEpoch || !dialog.open) { renderer.destroy(); return; }
    full = renderer;
    stage.dataset.ready = 'true';
    dialog.querySelector('.tars-model-note').textContent = 'Four columns. Quite a few possibilities.';
    updateMotion();
  } catch {
    dialog.querySelector('.tars-model-note').textContent = '3D is unavailable in this browser. I can still help you explore.';
    stage.dataset.ready = 'false';
  } finally { fullLoading = false; if (epoch !== fullEpoch && dialog.open && !disposed) mountFull(); }
}

function stopSpeaking() {
  ++speechToken;
  if (canSpeak) speechSynthesis.cancel();
  utterance = null;
  full?.setSpeaking(false);
  voiceButton.classList.remove('is-speaking');
}

function speak(text) {
  stopSpeaking();
  if (!voice || !dialog.open || !canSpeak) return;
  const token = speechToken;
  utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices().filter(item => /^en(?:-|_)/i.test(item.lang));
  const selected = voices.find(item => item.localService && /natural|david|daniel|alex|guy/i.test(item.name)) || voices.find(item => item.localService) || voices[0];
  if (selected) utterance.voice = selected;
  utterance.lang = selected?.lang || 'en-US';
  utterance.rate = .96; utterance.pitch = .83; utterance.volume = .85;
  utterance.onstart = () => { if (token === speechToken) { full?.setSpeaking(true); voiceButton.classList.add('is-speaking'); } };
  utterance.onend = () => { if (token === speechToken) { full?.setSpeaking(false); voiceButton.classList.remove('is-speaking'); } };
  utterance.onerror = event => { if (token === speechToken && event.error !== 'canceled' && event.error !== 'interrupted') { full?.setSpeaking(false); voiceButton.classList.remove('is-speaking'); feedback.textContent = 'Voice could not play. The full reply is here to read.'; } };
  speechSynthesis.speak(utterance);
}

function addMessage(role, text, links = []) {
  const item = document.createElement('article');
  item.className = `tars-message tars-message-${role}`;
  const label = document.createElement('span'); label.className = 'tars-message-label'; label.textContent = role === 'user' ? 'YOU' : 'TARS';
  const paragraph = document.createElement('p'); paragraph.textContent = text;
  item.append(label, paragraph);
  if (links.length) {
    const nav = document.createElement('div'); nav.className = 'tars-answer-links';
    links.forEach(({ label: title, href }) => {
      if (typeof href !== 'string' || !/^(?:#|https:\/\/|mailto:|\.\/gym\/|gym\/|assets\/img\/projects\/[a-z0-9-]+\.png$)/.test(href)) return;
      const link = document.createElement('a'); link.textContent = `${title} ↗`; link.href = href;
      if (href.startsWith('https://') || href.startsWith('assets/')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      if (href.startsWith('#')) link.addEventListener('click', event => {
        event.preventDefault();
        const destination = document.getElementById(href.slice(1));
        dialog.addEventListener('close', () => { if (destination) { destination.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'auto', block: 'start' }); if (!destination.hasAttribute('tabindex')) destination.setAttribute('tabindex', '-1'); destination.focus({ preventScroll: true }); history.replaceState(null, '', href); } }, { once: true });
        dialog.close();
      });
      nav.append(link);
    });
    item.append(nav);
  }
  log.append(item);
  // Keep a bounded, in-memory conversation. Nothing is stored or submitted.
  while (log.children.length > 24) log.firstElementChild.remove();
  log.scrollTop = log.scrollHeight;
  if (role === 'assistant') lastAnswer = text;
}

function ask(question) {
  const text = String(question).trim().slice(0, 400);
  if (!text) return;
  feedback.textContent = '';
  addMessage('user', text);
  const answer = answerTars(text, { humor });
  addMessage('assistant', answer.text, answer.links || []);
  if (answer.action && motionAllowed()) full?.perform(answer.action);
  speak(answer.text);
}

function openTarsGuide(button = dock.querySelector('.tars-launcher')) {
  if (dialog.open || disposed) return;
  // Native close events are queued. Finish the previous modal session before reopening.
  if (sessionActive) { queuedOpener = button; return; }
  const otherDialog = document.querySelector('dialog[open]');
  if (otherDialog) {
    otherDialog.addEventListener('close', () => openTarsGuide(button), { once: true });
    otherDialog.close();
    return;
  }
  opener = button instanceof HTMLElement ? button : dock.querySelector('.tars-launcher');
  previousOverflow = document.body.style.overflow;
  sessionActive = true;
  document.body.style.overflow = 'hidden';
  dialog.showModal();
  dialog.querySelector('.tars-close').focus();
  if (!log.children.length) addMessage('assistant', 'Hello. I’m TARS, your guide to this little corner of the universe. I can help you find Arif’s projects, explain his skills, or get in touch. Where shall we start?');
  document.dispatchEvent(new CustomEvent('portfolio:tars-discovered'));
  updateMotion();
  mountFull();
}
window.openTarsGuide = openTarsGuide;
if (window.pendingTarsOpener) {
  const pending = window.pendingTarsOpener;
  delete window.pendingTarsOpener;
  queueMicrotask(() => openTarsGuide(pending));
}

document.addEventListener('click', event => {
  const button = event.target instanceof Element ? event.target.closest('[data-tars-open]') : null;
  if (button) openTarsGuide(button);
});
dock.querySelector('.tars-stow').addEventListener('click', () => { stowed = true; updateMotion(); });
dialog.querySelector('.tars-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => {
  if (!sessionActive) return;
  stopSpeaking(); voice = false; voiceButton.setAttribute('aria-pressed', 'false'); if (canSpeak) voiceButton.textContent = 'Voice off';
  document.body.style.overflow = previousOverflow;
  ++fullEpoch;
  full?.destroy(); full = null; stage.dataset.ready = 'false';
  if (opener?.isConnected) opener.focus({ preventScroll: true });
  sessionActive = false;
  updateMotion(); mountMini();
  if (queuedOpener) { const pending = queuedOpener; queuedOpener = null; queueMicrotask(() => openTarsGuide(pending)); }
});
dialog.querySelector('.tars-form').addEventListener('submit', event => { event.preventDefault(); ask(input.value); input.value = ''; input.focus(); });
tarsPrompts.slice(0, 4).forEach(prompt => { const button = document.createElement('button'); button.type = 'button'; button.textContent = prompt.label; button.addEventListener('click', () => ask(prompt.question)); dialog.querySelector('.tars-prompts').append(button); });
dialog.querySelector('#tars-humor').addEventListener('input', event => { humor = Number(event.target.value); dialog.querySelector('.tars-personality output').textContent = `${humor}%`; });
voiceButton.addEventListener('click', () => { if (!canSpeak) return; voice = !voice; voiceButton.setAttribute('aria-pressed', String(voice)); voiceButton.textContent = voice ? 'Voice on' : 'Voice off'; feedback.textContent = voice ? 'Voice enabled. You can turn it off at any time.' : 'Voice is off.'; if (voice && lastAnswer) speak(lastAnswer); else stopSpeaking(); });
dialog.querySelectorAll('[data-tars-action]').forEach(button => button.addEventListener('click', () => { if (!motionAllowed() || !full) return; full.perform(button.dataset.tarsAction); const lines = {walk:'A short walk. Every step accounted for.',wave:'Hello, human. Excellent choice of planet.',balance:'Center of mass: under control.',nudge:'External force detected. Still on my feet.'}; dialog.querySelector('.tars-model-note').textContent = lines[button.dataset.tarsAction]; }));
dialog.querySelector('.tars-resume').addEventListener('click', () => { if (!reduced.matches) document.querySelector('.motion-toggle')?.click(); });
document.addEventListener('portfolio:motionchange', updateMotion);
document.addEventListener('visibilitychange', updateMotion);
reduced.addEventListener('change', updateMotion);

// A small robot is visible at the top of the portfolio; farther down it folds to a compact help button.
const hero = document.querySelector('.hero');
if (hero && 'IntersectionObserver' in window) new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; updateMotion(); if (heroVisible) mountMini(); }, { threshold: .05 }).observe(hero);
new MutationObserver(updateMotion).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
window.addEventListener('pagehide', () => { disposed = true; ++miniEpoch; ++fullEpoch; mini?.destroy(); full?.destroy(); mini = null; full = null; stopSpeaking(); });
window.addEventListener('pageshow', event => { if (event.persisted) { disposed = false; updateMotion(); mountMini(); if (dialog.open) mountFull(); } });
updateMotion();
mountMini();
