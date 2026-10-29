/* Small on-demand recordings; optional installed-browser voices for longer answers. */
import { tarsVoiceLines } from './tars-knowledge.js?v=20261029d';

export function createTarsVoice({ onState = () => {}, onError = () => {} } = {}) {
  const synth = globalThis.speechSynthesis;
  const canSpeak = Boolean(synth && globalThis.SpeechSynthesisUtterance);
  let epoch = 0, audio = null, utterance = null, timer = null, destroyed = false;

  function stop() {
    ++epoch;
    clearTimeout(timer);
    timer = null;
    if (audio) {
      audio.onplaying = audio.onended = audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio = null;
    }
    if (utterance) {
      utterance.onstart = utterance.onend = utterance.onerror = null;
      utterance = null;
      synth?.cancel();
    }
    onState('idle');
  }

  function getVoices() {
    return canSpeak ? synth.getVoices().filter(item => /^en(?:-|_|$)/i.test(item.lang)) : [];
  }

  function speak(text, voiceURI, token) {
    if (destroyed || token !== epoch) return;
    if (!canSpeak) { onState('idle'); onError('Browser reading is unavailable. Recorded lines still work.'); return; }
    const voices = getVoices();
    const selected = voices.find(item => item.voiceURI === voiceURI)
      || voices.find(item => item.localService && /natural|david|daniel|alex|guy/i.test(item.name))
      || voices.find(item => item.localService) || voices[0];
    // Short utterances prevent browser engines from stalling on long portfolio answers.
    const sentences = String(text).replace(/\n+/g, '. ').match(/[^.!?]+(?:[.!?]+|$)/g) || [text];
    const chunks = sentences.flatMap(sentence => sentence.trim().match(/.{1,210}(?:\s|$)|\S{1,210}/g) || []);
    let index = 0;
    function next() {
      if (destroyed || token !== epoch) return;
      if (index >= chunks.length) { utterance = null; onState('idle'); return; }
      utterance = new SpeechSynthesisUtterance(chunks[index++].trim());
      if (selected) utterance.voice = selected;
      utterance.lang = selected?.lang || 'en-US';
      utterance.rate = .94; utterance.pitch = .95; utterance.volume = .85;
      utterance.onstart = () => { if (token === epoch && !destroyed) onState('speaking'); };
      utterance.onend = () => { if (token === epoch && !destroyed) { timer = setTimeout(next, 170); } };
      utterance.onerror = event => {
        if (token !== epoch || destroyed) return;
        utterance = null; onState('idle');
        if (!['canceled', 'interrupted'].includes(event.error)) onError('Voice could not play. The full reply is here to read.');
      };
      try { synth.speak(utterance); }
      catch {
        if (token === epoch && !destroyed) { utterance = null; onState('idle'); onError('Voice could not play. The full reply is here to read.'); }
      }
    }
    onState('loading');
    next();
  }

  function play(answer, { browserSpeech = false, voiceURI = '' } = {}) {
    stop();
    if (destroyed || !answer?.text) return;
    const token = epoch;
    const clip = answer.clip;
    const validClip = typeof clip === 'string' && Object.hasOwn(tarsVoiceLines, clip)
      && tarsVoiceLines[clip] === answer.text;
    if (!validClip) { if (browserSpeech) speak(answer.text, voiceURI, token); return; }
    const current = new Audio();
    audio = current;
    current.preload = 'none';
    current.volume = .85;
    current.src = new URL(`../audio/tars/${clip}.mp3`, import.meta.url).href;
    onState('loading');
    let failed = false;
    function fail() {
      if (failed || destroyed || token !== epoch) return;
      failed = true;
      current.onplaying = current.onended = current.onerror = null;
      current.pause(); current.removeAttribute('src'); current.load(); audio = null;
      if (browserSpeech) speak(answer.text, voiceURI, token);
      else { onState('idle'); onError('The voice clip could not load. You can still read the line here.'); }
    }
    current.onplaying = () => { if (token === epoch && !destroyed) onState('speaking'); };
    current.onended = () => {
      if (token !== epoch || destroyed) return;
      current.onplaying = current.onended = current.onerror = null;
      audio = null; onState('idle');
    };
    current.onerror = fail;
    try { current.play()?.catch(fail); } catch { fail(); }
  }

  return { play, stop, getVoices, canSpeak, destroy() { if (!destroyed) { stop(); destroyed = true; } } };
}
