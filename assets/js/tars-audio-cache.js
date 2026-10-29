/* A small session cache: no model, autoplay, or full-library download. */
import { tarsVoiceLines } from './tars-knowledge.js?v=20261029g';

const audioVersion = '20261029-studio';
const budget = 2 * 1024 * 1024;
const maxClipBytes = 600000;
export const recordingURL = id => new URL(`../audio/tars/${id}.mp3?v=${audioVersion}`, import.meta.url).href;

export function createTarsRecordingCache() {
  const ready = new Map();
  let bytes = 0, queue = [], active = null, destroyed = false;
  const allowed = id => typeof id === 'string' && Object.hasOwn(tarsVoiceLines, id);
  const conserveData = () => typeof navigator !== 'undefined' && (navigator.connection?.saveData || /(^|-)2g$/.test(navigator.connection?.effectiveType || ''));

  function remove(id, entry) {
    ready.delete(id); bytes -= entry.bytes; URL.revokeObjectURL(entry.url);
  }

  async function pump() {
    if (destroyed || active || !queue.length) return;
    const id = queue.shift();
    const job = { id, controller: new AbortController() };
    active = job;
    const timeout = setTimeout(() => job.controller.abort(), 12000);
    try {
      const response = await fetch(recordingURL(id), { signal: job.controller.signal, cache: 'force-cache', priority: 'low' });
      if (!response.ok || Number(response.headers.get('content-length')) > maxClipBytes) return;
      const blob = await response.blob();
      if (destroyed || active !== job || job.controller.signal.aborted || !blob.size || blob.size > maxClipBytes) return;
      // Never revoke a URL that the playback element or its next segment uses.
      for (const [key, entry] of ready) {
        if (bytes + blob.size <= budget) break;
        if (!entry.refs) remove(key, entry);
      }
      if (bytes + blob.size > budget) return;
      ready.set(id, { url: URL.createObjectURL(blob), bytes: blob.size, refs: 0 });
      bytes += blob.size;
    } catch { /* A failed warmup must never prevent normal streaming playback. */ }
    finally {
      clearTimeout(timeout);
      if (active === job) { active = null; pump(); }
    }
  }

  function cancel() {
    queue = [];
    active?.controller.abort();
    active = null;
  }

  return {
    prepare(ids, { priority = false } = {}) {
      if (destroyed || conserveData() || !Array.isArray(ids)) return;
      const wanted = [...new Set(ids.filter(allowed))].filter(id => !ready.has(id));
      if (priority && wanted.length) {
        // A touched/focused action takes precedence over speculative preparation.
        // Keep a request already loading that exact first clip.
        if (active && !wanted.includes(active.id)) {
          const previous = active.id;
          active.controller.abort(); active = null;
          if (!queue.includes(previous)) queue.push(previous);
        }
        queue = [...wanted.filter(id => active?.id !== id), ...queue.filter(id => !wanted.includes(id))].slice(0, 16);
      }
      for (const id of priority ? [] : wanted) {
        if (queue.length >= 16) break;
        if (allowed(id) && !ready.has(id) && !queue.includes(id) && active?.id !== id) queue.push(id);
      }
      pump();
    },
    get(id) {
      if (destroyed || !allowed(id)) return null;
      const entry = ready.get(id);
      if (!entry) return { url: recordingURL(id), release() {} };
      ready.delete(id); ready.set(id, entry); entry.refs++;
      let released = false;
      return { url: entry.url, release() { if (!released) { entry.refs--; released = true; } } };
    },
    cancel,
    destroy() { destroyed = true; cancel(); for (const [id, entry] of ready) remove(id, entry); }
  };
}
