# Prerecorded portfolio guide voice

These short, original lines use **Kokoro's stock `am_michael` American English voice**, generated locally at 0.95 speed. The writing has a calm, dry character. No film soundtrack, actor sample, voice-cloning reference, hosted speech API, or visitor text was used.

The website loads ordinary MP3 files only when the visitor enables voice. It does not download a speech model or run this Python script. Text remains the primary response; other replies may use the browser's optional speech synthesis through the guide's existing controls.

## Files and provenance

- Each recording is `assets/audio/tars/<id>.mp3`, matching an exact entry in `tarsVoiceLines` in `assets/js/tars-knowledge.js`.
- `manifest.json` records the exact input text, stable ID, URL, duration, size, SHA-256, measured decoded peak, model/voice hashes, and development package versions.
- Encoding: MP3, mono, 24 kHz, 64 kbit/s. Processing uses a 65 Hz high-pass filter, -19 LUFS normalization target, -2 dB true-peak limit, and a short fade-in. There is no pitch shifting or imitation filter.
- Every output was decoded again with FFmpeg to check finite samples and headroom. Automated signal checks do not replace a human listening review.

Model: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), Apache-2.0. Stock voices are documented in the [official voice catalogue](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).

Runtime: [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), MIT. This recording uses the v1.0 INT8 model and v1.0 voice bank from its [model-files-v1.1 release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1). Models, native runtimes, and intermediate WAV files are kept outside the website repository.

## Regenerate during development

Use an isolated Python 3.12 environment outside the site. Node, FFmpeg, and FFprobe must be available on PATH (or supplied through the script's command-line options).

```text
python -m venv ../tars-tts-env
../tars-tts-env/Scripts/python -m pip install kokoro-onnx==0.6.1 soundfile==0.14.0
gh release download model-files-v1.1 --repo thewh1teagle/kokoro-onnx --pattern kokoro-v1.0.int8.onnx --pattern voices-v1.0.bin --dir ../tars-voice-model
../tars-tts-env/Scripts/python assets/audio/tars/generate.py --model-dir ../tars-voice-model --wav-dir ../tars-voice-wav
```

On macOS/Linux, use the environment's `bin/python` path. Windows may require allowing the development process to load the bundled eSpeak DLL. The script imports the real JavaScript catalogue, synthesizes its exact strings, encodes and validates each clip, then writes the manifest. Do not change a catalogue string while retaining an older recording with the same ID; regenerate it first.

No model weights or Python dependencies are needed to deploy the portfolio.
