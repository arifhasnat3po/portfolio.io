/* On-demand recordings only. The visitor's speech engine is never used. */
import { tarsVoiceLines } from './tars-knowledge.js?v=20261029g';
import { createTarsRecordingCache } from './tars-audio-cache.js?v=20261029g';

export function createTarsVoice({ onState = () => {}, onError = () => {} } = {}) {
  let epoch = 0, audio = null, warmup = null, destroyed = false;
  let playingLease = null, warmupLease = null;
  const cache = createTarsRecordingCache();

  function clipsFor(answer) {
    const clips = answer?.clips ?? (answer?.clip ? [answer.clip] : []);
    return Array.isArray(clips) && clips.length > 0 && clips.length <= 4
      && clips.every(id => typeof id === 'string' && Object.hasOwn(tarsVoiceLines, id))
      && clips.map(id => tarsVoiceLines[id]).join(' ') === answer.text ? clips : [];
  }

  function releaseLeases() {
    playingLease?.release(); warmupLease?.release();
    playingLease = warmupLease = null;
  }

  function release(element) {
    if (!element) return;
    element.onplaying = element.onended = element.onerror = null;
    element.pause();
    element.removeAttribute('src');
    element.load();
  }

  function stopPlayback(cancelPreparation = true) {
    ++epoch;
    release(audio); release(warmup);
    releaseLeases(); if (cancelPreparation) cache.cancel();
    audio = warmup = null;
    onState('idle');
  }
  const stop = () => stopPlayback();

  function play(answer) {
    // Preserve a warmup started by pointer/focus intent. A click should not
    // cancel and restart its own download; an explicit Stop still cancels it.
    stopPlayback(false);
    if (destroyed || !answer?.text) return;
    const clips = clipsFor(answer);
    // A recording sequence must say the complete displayed answer, in order.
    // Neither user input nor arbitrary URLs may become an audio source.
    if (!clips.length) {
      onError('This reply is available as text. Try a project, skills, or workflow question to hear a recorded answer.');
      return;
    }
    const token = epoch;
    const current = new Audio();
    audio = current;
    current.preload = 'none';
    current.volume = .9;
    let index = 0, sequence = 0, failed = false;

    function fail(clipSequence) {
      if (failed || destroyed || token !== epoch || clipSequence !== sequence) return;
      failed = true;
      release(current); release(warmup);
      releaseLeases(); cache.cancel();
      audio = warmup = null;
      onState('idle');
      onError('The recording could not play. Check your connection and try again; the full answer is here to read.');
    }

    function next() {
      if (failed || destroyed || token !== epoch) return;
      const clipSequence = ++sequence;
      if (index >= clips.length) {
        release(current); release(warmup);
        releaseLeases();
        audio = warmup = null;
        onState('idle');
        return;
      }
      playingLease?.release();
      playingLease = cache.get(clips[index++]);
      current.src = playingLease.url;
      current.onplaying = () => { if (!failed && token === epoch && !destroyed && clipSequence === sequence) onState('speaking'); };
      current.onended = () => { if (clipSequence === sequence) next(); };
      current.onerror = () => fail(clipSequence);
      onState('loading');
      // The first play stays in the click stack. Reuse this unlocked element
      // for the optional humor aside so mobile browsers keep the same session.
      try { current.play()?.catch(() => fail(clipSequence)); } catch { fail(clipSequence); }
      release(warmup); warmup = null;
      warmupLease?.release(); warmupLease = null;
      if (!failed && index < clips.length) {
        warmup = new Audio();
        warmup.preload = 'auto';
        warmupLease = cache.get(clips[index]);
        warmup.src = warmupLease.url;
        warmup.load();
      }
    }

    next();
  }

  return { play, stop, prepare(answer, options) { if (!destroyed) cache.prepare(clipsFor(answer), options); },
    destroy() { if (!destroyed) { stop(); cache.destroy(); destroyed = true; } } };
}
