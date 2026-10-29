# Prerecorded portfolio guide voice

These original lines use a **70% `am_michael` / 30% `am_onyx` blend of Kokoro's stock American English voices**, generated once during development at 0.97 speed. Joke sentence pauses are 0.40 seconds; regular replies use 0.28 seconds, with 0.12-second clause pauses. No film soundtrack, actor sample, voice-cloning reference, hosted speech API, or visitor text was used.

The website plays ordinary MP3 files and does not download a speech model or use browser/device speech synthesis. The 91-file catalogue covers greetings, 20 joke responses across four humor settings, 16 movement reactions, 3 science introductions, Easter eggs, 30 common portfolio answers, and reusable humor asides. Unrecorded replies remain text-only. A reply and its aside reuse one playback element.

Opening TARS silently prepares the current greeting (77–90 KB) and four short movement reactions. Once sound is enabled, the next two jokes and the current Easter egg are prepared too. Long FAQ answers are prepared only on hover, focus, or touch intent. An intended action takes priority over background work, and Play preserves its in-flight preparation. Nothing autoplays. Data Saver and 2G connections skip speculative downloads.

`tars-audio-cache.js` keeps up to 2 MiB of completed recordings in a session LRU cache. A ready clip plays from a local Blob URL without a new network request. Active playback URLs are pinned until released. Cache misses stream immediately from the normal MP3 URL, preserving the mobile click gesture; playback never waits for cache preparation. Stop, sound off, closing the guide, and hiding the tab cancel pending preparation. Completed clips remain available during the page session. Vercel additionally sends one-day HTTP caching headers; versioned audio URLs invalidate old recordings after an audio update. GitHub Pages uses its own HTTP cache policy and the same session cache.

## Files and provenance

- Each recording is `assets/audio/tars/<id>.mp3`, matching an entry in `tarsVoiceLines` in `assets/js/tars-knowledge.js`. The complete sequence must match the displayed answer exactly before playback is allowed.
- `manifest.json` records displayed text and pronunciation-normalized `spokenText`, stable ID, URL, duration, size, SHA-256, measured decoded peak, model/voice hashes, and development package versions. Acronyms such as SEO, AEO, GEO, and MCP are spelled aloud; phone numbers, URLs and the GPA use spoken forms.
- Encoding: MP3, mono, 24 kHz, 96 kbit/s. Processing uses a 65 Hz high-pass filter, -18 LUFS normalization target, -2 dB true-peak limit, and a short fade-in. There is no pitch shifting or imitation filter.
- Every output was decoded again with FFmpeg to check finite samples and headroom. Automated signal checks do not replace a human listening review.

Model: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), Apache-2.0. Stock voices are documented in the [official voice catalogue](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).

Runtime: [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), MIT. This recording uses the v1.0 INT8 model and v1.0 voice bank from its [model-files-v1.1 release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1). Models, native runtimes, and intermediate WAV files are kept outside the website repository.

## Regenerate during development

Use an isolated Python 3.12 environment outside the site. Node, FFmpeg, and FFprobe must be available on PATH (or supplied through the script's command-line options).

```text
python -m venv ../tars-tts-env
../tars-tts-env/Scripts/python -m pip install kokoro-onnx==0.6.1 soundfile==0.14.0
gh release download model-files-v1.1 --repo thewh1teagle/kokoro-onnx --pattern kokoro-v1.0.int8.onnx --pattern voices-v1.0.bin --dir ../tars-voice-model
../tars-tts-env/Scripts/python assets/audio/tars/generate.py --model-dir ../tars-voice-model --wav-dir ../tars-voice-wav --resume
```

On macOS/Linux, use the environment's `bin/python` path. Windows may require allowing the development process to load the bundled eSpeak DLL. The script imports the real JavaScript catalogue, synthesizes its exact strings, encodes and validates each clip, then writes the manifest. Do not change a catalogue string while retaining an older recording with the same ID; regenerate it first.

The scratch directory stores a resumable checkpoint. Reuse requires matching delivery settings, text, pronunciation, and the generated file hash; an unchanged published manifest can also supply verified clips. When replacing an existing recording, bump `audioVersion` in `tars-audio-cache.js`. No model weights or Python dependencies are needed to deploy the portfolio.
