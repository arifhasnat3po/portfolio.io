"""Development-time recording only. This script and its model are never run by the website."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import shutil
import subprocess
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description="Record original portfolio lines with a stock Kokoro voice.")
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--wav-dir", type=Path, required=True, help="Scratch directory outside the published site.")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--catalogue", type=Path, default=Path(__file__).resolve().parents[3] / "assets/js/tars-knowledge.js")
    parser.add_argument("--voice", default="am_michael")
    parser.add_argument("--speed", type=float, default=.95)
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
    clips = []
    for key, text in catalogue.items():
        if not key or any(character not in "abcdefghijklmnopqrstuvwxyz0123456789-" for character in key):
            raise ValueError(f"Unsafe voice catalogue ID: {key!r}")
        samples, sample_rate = engine.create(text, voice=args.voice, speed=args.speed, lang=args.language, trim=True, sentence_pause=.3, clause_pause=.12)
        samples = np.asarray(samples, dtype=np.float32).reshape(-1)
        if not samples.size or not np.isfinite(samples).all() or float(np.max(np.abs(samples))) < .01:
            raise ValueError(f"Invalid or silent synthesis: {key}")
        # Preserve all interior pauses; only add a short quiet lead/tail to avoid abrupt playback edges.
        samples = np.concatenate((np.zeros(round(sample_rate * .055), dtype=np.float32), samples, np.zeros(round(sample_rate * .14), dtype=np.float32)))
        wav = args.wav_dir / f"{key}.wav"
        sf.write(wav, samples, sample_rate, subtype="FLOAT")
        output = args.output_dir / f"{key}.mp3"
        filters = "highpass=f=65,loudnorm=I=-19:TP=-2:LRA=7,afade=t=in:st=0:d=0.015"
        subprocess.run([args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-af", filters, "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "64k", "-id3v2_version", "3", "-metadata", f"title={key}", "-metadata", "artist=Portfolio guide - stock synthetic voice", str(output)], check=True)
        probe = json.loads(subprocess.check_output([args.ffprobe, "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,sample_rate,channels", "-of", "json", str(output)], text=True))
        decoded = np.frombuffer(subprocess.check_output([args.ffmpeg, "-v", "error", "-i", str(output), "-f", "f32le", "-ac", "1", "-ar", "24000", "pipe:1"]), dtype=np.float32)
        peak = float(np.max(np.abs(decoded)))
        if not np.isfinite(decoded).all() or peak >= .98:
            raise ValueError(f"Encoded clip is nonfinite or clipped: {key} ({peak})")
        clip = {"id": key, "text": text, "src": f"assets/audio/tars/{key}.mp3", "durationSeconds": round(float(probe["format"]["duration"]), 3), "bytes": output.stat().st_size, "sha256": sha256(output), "codec": "mp3", "sampleRate": 24000, "channels": 1, "peakDbFS": round(20 * float(np.log10(max(peak, 1e-12))), 2)}
        clips.append(clip)
        print(f"{key}: {clip['durationSeconds']} s, {clip['bytes']} bytes, peak {clip['peakDbFS']} dBFS", flush=True)

    manifest = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "description": "Original portfolio dialogue, prerecorded locally with a stock synthetic voice. No film audio or actor voice clone.",
        "catalogue": "assets/js/tars-knowledge.js#tarsVoiceLines",
        "engine": {"name": "kokoro-onnx", "version": importlib.metadata.version("kokoro-onnx"), "model": "Kokoro-82M v1.0 INT8", "modelSource": "https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1", "modelSha256": sha256(model), "voicesSha256": sha256(voices), "modelLicense": "Apache-2.0", "runtimeLicense": "MIT", "voice": args.voice, "language": args.language, "speed": args.speed, "voiceReference": "https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md"},
        "encoding": {"format": "MP3", "bitRate": 64000, "sampleRate": 24000, "channels": 1, "normalizationTargetLUFS": -19, "truePeakLimitDB": -2, "filter": "65 Hz high-pass; loudness normalization; 15 ms fade-in"},
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
