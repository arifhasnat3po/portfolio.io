/* Small, bounded byte cache. Decoded models and WebGL contexts retain their own cleanup lifecycle. */
const cached = new Map();
const MAX_BYTES = 40 * 1024 * 1024;
const cancelled = () => new DOMException('Model loading cancelled.', 'AbortError');

export function rememberModelBytes(url, bytes) {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > MAX_BYTES) return;
  cached.delete(String(url)); cached.set(String(url), bytes);
  let size = [...cached.values()].reduce((sum, buffer) => sum + buffer.byteLength, 0);
  while (cached.size > 2 || size > MAX_BYTES) {
    const first = cached.keys().next().value; size -= cached.get(first).byteLength; cached.delete(first);
  }
}
export function forgetModelBytes(url) { cached.delete(String(url)); }

export async function loadModelBytes(url, { signal, onProgress = () => {} } = {}) {
  const key = String(url);
  if (signal?.aborted) throw cancelled();
  if (cached.has(key)) {
    const bytes = cached.get(key); cached.delete(key); cached.set(key, bytes);
    onProgress({ stage: 'cached', loaded: bytes.byteLength, total: bytes.byteLength });
    return bytes;
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    const request = new AbortController(); let timer, stalled = false, status = 0;
    const abort = () => request.abort();
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => { stalled = true; request.abort(); }, 25000); };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      if (signal?.aborted) throw cancelled();
      onProgress({ stage: attempt === 1 ? 'download' : 'retry', loaded: 0, total: 0, attempt }); arm();
      const response = await fetch(url, { signal: request.signal, cache: attempt === 1 ? 'force-cache' : 'reload' });
      status = response.status;
      if (!response.ok) throw new Error(`Model request failed (${status}).`);
      const total = Math.max(0, Number(response.headers?.get('content-length')) || 0);
      if (!response.body?.getReader) {
        const bytes = await response.arrayBuffer();
        if (signal?.aborted) throw cancelled();
        onProgress({ stage: 'download', loaded: bytes.byteLength, total: total || bytes.byteLength, attempt });
        return bytes;
      }
      const reader = response.body.getReader(), chunks = []; let loaded = 0, lastUpdate = 0;
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          if (signal?.aborted) throw cancelled();
          chunks.push(value); loaded += value.byteLength; arm();
          if (Date.now() - lastUpdate > 120) {
            onProgress({ stage: 'download', loaded, total, attempt }); lastUpdate = Date.now();
          }
        }
      } finally { reader.releaseLock(); }
      if (signal?.aborted) throw cancelled();
      const bytes = new Uint8Array(loaded); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      onProgress({ stage: 'download', loaded, total: total || loaded, attempt });
      return bytes.buffer;
    } catch (error) {
      if (signal?.aborted) throw cancelled();
      const retryable = stalled || !status || status === 429 || status >= 500;
      if (attempt === 2 || !retryable) {
        if (stalled) throw new Error('The model download stalled. Please try again.');
        throw error;
      }
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
    }
  }
}
