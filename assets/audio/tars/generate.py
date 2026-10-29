"""Development-time recording only. This script and its model are never run by the website."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def pronunciation(text: str) -> str:
    """Spoken spelling, without changing the portfolio's displayed facts."""
    replacements = {
        "arifhasnat83@gmail.com": "Arif Hasnat eighty three at G mail dot com",
        "+8801626702431": "plus eight eight zero, one six two six seven zero, two four three one",
        "arifhasnat3po": "Arif Hasnat three P O",
        "PaymentForm.io": "Payment Form dot I O",
        "3.793/4.00": "three point seven nine three out of four",
        "2019–2024": "twenty nineteen to twenty twenty four",
        "B.Sc.": "Bachelor of Science",
        "n8n/Zapier": "N eight N and Zapier",
        "SaaS/WordPress": "sass and WordPress",
        "n8n": "N eight N",
        "GA4": "G A four",
        "APIs": "A P I's",
        "&": "and",
    }
    for original, spoken in replacements.items():
        text = text.replace(original, spoken)
    text = re.sub(r"\b(SEO|AEO|GEO|AI|CAPI|GTM|MCP|CRM|JSON|HR|IP|QA|IIUC|CGPA|LLM|PDF)\b", lambda m: " ".join(m[0]), text)
    text = re.sub(r"\bIoT\b", "I O T", text)
    return text


def main() -> None:
    parser = argparse.ArgumentParser(description="Record original portfolio lines with a stock Kokoro voice.")
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--wav-dir", type=Path, required=True, help="Scratch directory outside the published site.")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--catalogue", type=Path, default=Path(__file__).resolve().parents[3] / "assets/js/tars-knowledge.js")
    parser.add_argument("--voice", default="am_michael")
    parser.add_argument("--speed", type=float, default=.97)
    parser.add_argument("--blend-voice", default="am_onyx")
    parser.add_argument("--blend-ratio", type=float, default=.30)
    parser.add_argument("--resume", action="store_true", help="Reuse verified clips from the same recording edition.")
    parser.add_argument("--language", default="en-us")
    parser.add_argument("--node", default=shutil.which("node"))
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    parser.add_argument("--ffprobe", default=shutil.which("ffprobe"))
    args = parser.parse_args()
    if not all((args.node, args.ffmpeg, args.ffprobe)):
        parser.error("Node, FFmpeg and FFprobe must be installed or specified.")
    if args.output_dir.resolve() == args.wav_dir.resolve():
        parser.error("Keep temporary WAV files outside the published audio directory.")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.wav_dir.mkdir(parents=True, exist_ok=True)

    # Import the actual catalogue, so spoken text cannot silently drift from displayed text.
    catalogue_script = "import {pathToFileURL} from 'node:url';const m=await import(pathToFileURL(process.argv[1]).href);process.stdout.write(JSON.stringify(m.tarsVoiceLines));"
    catalogue = json.loads(subprocess.check_output([args.node, "--input-type=module", "-e", catalogue_script, str(args.catalogue.resolve())], text=True, encoding="utf-8"))
    if not catalogue or not isinstance(catalogue, dict):
        raise ValueError("The catalogue must export a nonempty tarsVoiceLines mapping.")
    model = args.model_dir / "kokoro-v1.0.int8.onnx"
    voices = args.model_dir / "voices-v1.0.bin"
    engine = Kokoro(str(model), str(voices))
    style = (1 - args.blend_ratio) * engine.get_voice_style(args.voice) + args.blend_ratio * engine.get_voice_style(args.blend_voice)
    edition = {"voice": args.voice, "blendVoice": args.blend_voice, "blendRatio": args.blend_ratio, "speed": args.speed, "language": args.language, "modelSha256": sha256(model), "voicesSha256": sha256(voices), "processing": "studio-v2"}
    checkpoint = args.wav_dir / "recording-checkpoint.json"
    previous = json.loads(checkpoint.read_text(encoding="utf-8")) if args.resume and checkpoint.exists() else {}
    completed = {clip["id"]: clip for clip in previous.get("clips", [])} if previous.get("edition") == edition else {}
    # An unchanged published clip can be reused even if the scratch checkpoint
    # was cleared. Verify its recording edition, wording and hash below.
    manifest_path = args.output_dir / "manifest.json"
    if args.resume and manifest_path.exists():
        published = json.loads(manifest_path.read_text(encoding="utf-8"))
        if all(published.get("engine", {}).get(key) == value for key, value in edition.items()):
            completed = {**{clip["id"]: clip for clip in published.get("clips", [])}, **completed}
    clips = []
    for key, text in catalogue.items():
        if not key or any(character not in "abcdefghijklmnopqrstuvwxyz0123456789-" for character in key):
            raise ValueError(f"Unsafe voice catalogue ID: {key!r}")
        spoken_text = pronunciation(text)
        output = args.output_dir / f"{key}.mp3"
        cached = completed.get(key)
        if cached and cached["text"] == text and cached["spokenText"] == spoken_text and output.exists() and sha256(output) == cached["sha256"]:
            clips.append(cached)
            print(f"{key}: verified existing recording", flush=True)
            continue
        # Give joke setups room to land, with consistent pacing for full answers.
        pause = .40 if key.startswith("joke-") else .28
        samples, sample_rate = engine.create(spoken_text, voice=style, speed=args.speed, lang=args.language, trim=True, sentence_pause=pause, clause_pause=.12)
        samples = np.asarray(samples, dtype=np.float32).reshape(-1)
        if not samples.size or not np.isfinite(samples).all() or float(np.max(np.abs(samples))) < .01:
            raise ValueError(f"Invalid or silent synthesis: {key}")
        # Preserve all interior pauses; only add a short quiet lead/tail to avoid abrupt playback edges.
        samples = np.concatenate((np.zeros(round(sample_rate * .055), dtype=np.float32), samples, np.zeros(round(sample_rate * .14), dtype=np.float32)))
        wav = args.wav_dir / f"{key}.wav"
        sf.write(wav, samples, sample_rate, subtype="FLOAT")
        filters = "highpass=f=65,loudnorm=I=-18:TP=-2:LRA=7,afade=t=in:st=0:d=0.015"
        subprocess.run([args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-af", filters, "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "96k", "-id3v2_version", "3", "-metadata", f"title={key}", "-metadata", "artist=Portfolio guide - stock synthetic voice", str(output)], check=True)
        probe = json.loads(subprocess.check_output([args.ffprobe, "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,sample_rate,channels", "-of", "json", str(output)], text=True))
        decoded = np.frombuffer(subprocess.check_output([args.ffmpeg, "-v", "error", "-i", str(output), "-f", "f32le", "-ac", "1", "-ar", "24000", "pipe:1"]), dtype=np.float32)
        peak = float(np.max(np.abs(decoded)))
        if not np.isfinite(decoded).all() or peak >= .98:
            raise ValueError(f"Encoded clip is nonfinite or clipped: {key} ({peak})")
        clip = {"id": key, "text": text, "spokenText": spoken_text, "src": f"assets/audio/tars/{key}.mp3", "durationSeconds": round(float(probe["format"]["duration"]), 3), "bytes": output.stat().st_size, "sha256": sha256(output), "codec": "mp3", "sampleRate": 24000, "channels": 1, "peakDbFS": round(20 * float(np.log10(max(peak, 1e-12))), 2)}
        clips.append(clip)
        checkpoint.write_text(json.dumps({"edition": edition, "clips": clips}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{key}: {clip['durationSeconds']} s, {clip['bytes']} bytes, peak {clip['peakDbFS']} dBFS", flush=True)

    manifest = {
        "schemaVersion": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "description": "Original portfolio dialogue, prerecorded locally with a stock synthetic voice. No film audio or actor voice clone.",
        "catalogue": "assets/js/tars-knowledge.js#tarsVoiceLines",
        "engine": {"name": "kokoro-onnx", "version": importlib.metadata.version("kokoro-onnx"), "model": "Kokoro-82M v1.0 INT8", "modelSource": "https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1", "modelSha256": sha256(model), "voicesSha256": sha256(voices), "modelLicense": "Apache-2.0", "runtimeLicense": "MIT", **edition, "language": args.language, "voiceReference": "https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md"},
        "encoding": {"format": "MP3", "bitRate": 96000, "sampleRate": 24000, "channels": 1, "normalizationTargetLUFS": -18, "truePeakLimitDB": -2, "filter": "65 Hz high-pass; loudness normalization; 15 ms fade-in"},
        "developmentDependencies": {name: importlib.metadata.version(name) for name in ["kokoro-onnx", "onnxruntime", "phonemizer", "espeakng-loader", "numpy", "soundfile"]},
        "totalBytes": sum(clip["bytes"] for clip in clips),
        "totalDurationSeconds": round(sum(clip["durationSeconds"] for clip in clips), 3),
        "clips": clips,
    }
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(clips)} clips; {manifest['totalBytes']} total bytes.", flush=True)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
