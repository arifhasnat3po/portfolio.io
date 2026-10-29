/* On-demand recordings only. The visitor's speech engine is never used. */
import { tarsVoiceLines } from './tars-knowledge.js?v=20261029e';

const audioVersion = '20261029-studio';

export function createTarsVoice({ onState = () => {}, onError = () => {} } = {}) {
  let epoch = 0, audio = null, warmup = null, destroyed = false;

  function release(element) {
    if (!element) return;
    element.onplaying = element.onended = element.onerror = null;
    element.pause();
    element.removeAttribute('src');
    element.load();
  }

  function stop() {
    ++epoch;
    release(audio); release(warmup);
    audio = warmup = null;
    onState('idle');
  }

  function play(answer) {
    stop();
    if (destroyed || !answer?.text) return;
    const clips = answer.clips ?? (answer.clip ? [answer.clip] : []);
    // A recording sequence must say the complete displayed answer, in order.
    // Neither user input nor arbitrary URLs may become an audio source.
    const valid = Array.isArray(clips) && clips.length > 0 && clips.length <= 4
      && clips.every(id => typeof id === 'string' && Object.hasOwn(tarsVoiceLines, id))
      && clips.map(id => tarsVoiceLines[id]).join(' ') === answer.text;
    if (!valid) {
      onError('This reply is available as text. Try a project, skills, or workflow question to hear a recorded answer.');
      return;
    }
    const token = epoch;
    const current = new Audio();
    audio = current;
    current.preload = 'none';
    current.volume = .9;
    let index = 0, sequence = 0, failed = false;
    const clipURL = id => new URL(`../audio/tars/${id}.mp3?v=${audioVersion}`, import.meta.url).href;

    function fail(clipSequence) {
      if (failed || destroyed || token !== epoch || clipSequence !== sequence) return;
      failed = true;
      release(current); release(warmup);
      audio = warmup = null;
      onState('idle');
      onError('The recording could not play. Check your connection and try again; the full answer is here to read.');
    }

    function next() {
      if (failed || destroyed || token !== epoch) return;
      const clipSequence = ++sequence;
      if (index >= clips.length) {
        release(current); release(warmup);
        audio = warmup = null;
        onState('idle');
        return;
      }
      current.src = clipURL(clips[index++]);
      current.onplaying = () => { if (!failed && token === epoch && !destroyed && clipSequence === sequence) onState('speaking'); };
      current.onended = () => { if (clipSequence === sequence) next(); };
      current.onerror = () => fail(clipSequence);
      onState('loading');
      // The first play stays in the click stack. Reuse this unlocked element
      // for the optional humor aside so mobile browsers keep the same session.
      try { current.play()?.catch(() => fail(clipSequence)); } catch { fail(clipSequence); }
      release(warmup); warmup = null;
      if (!failed && index < clips.length) {
        warmup = new Audio();
        warmup.preload = 'auto';
        warmup.src = clipURL(clips[index]);
        warmup.load();
      }
    }

    next();
  }

  return { play, stop, destroy() { if (!destroyed) { stop(); destroyed = true; } } };
}
