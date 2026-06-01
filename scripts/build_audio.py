#!/usr/bin/env python3
"""
Build the placeholder voiceover for the ImpactBuying animation.

- Synthesises each caption line offline with espeak-ng (no network needed).
- Inserts deliberate pauses between lines so the animation can breathe.
- Concatenates everything into a single master WAV, then encodes an MP3.
- Emits timings.json: the exact start/end time of every line, which the
  animation reads so the kinetic captions/visuals stay locked to the audio.

The voice is intentionally a robotic placeholder. Drop in the real VO later
by replacing assets/vo_placeholder.mp3 (keep the same line ordering / timing,
or re-run with measured timings).
"""
import json
import os
import struct
import subprocess
import wave

import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
BUILD = os.path.join(ROOT, "scripts", "_audio_build")
os.makedirs(ASSETS, exist_ok=True)
os.makedirs(BUILD, exist_ok=True)

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

RATE = 22050  # espeak-ng default sample rate (mono, 16-bit)

# Each line: id, the text shown on screen (caption), the text spoken
# (tuned for espeak pronunciation), and the pause (s) to add AFTER the line.
LINES = [
    # SCENE 1 — hook
    dict(id="s1_l1", scene=1,
         caption="The rules of global trade are changing.",
         speak="The rules of global trade are changing.", pause=1.0),

    # SCENE 2 — the pressure
    dict(id="s2_l1", scene=2,
         caption="Consumers demand transparency.",
         speak="Consumers demand transparency.", pause=0.55),
    dict(id="s2_l2", scene=2,
         caption="Governments are introducing stricter ESG legislation.",
         speak="Governments are introducing stricter E S G legislation.", pause=0.55),
    dict(id="s2_l3", scene=2,
         caption="And businesses are expected to prove where products come from\nand how they impact people and the planet.",
         speak="And businesses are expected to prove where products come from, and how they impact people and the planet.",
         pause=0.95),

    # SCENE 3 — the solution
    dict(id="s3_l1", scene=3,
         caption="At ImpactBuying, we help businesses transform complex supply chains\ninto opportunities for positive impact.",
         speak="At Impact Buying, we help businesses transform complex supply chains into opportunities for positive impact.",
         pause=0.45),
    dict(id="s3_l2", scene=3,
         caption="Using smart supply chain intelligence and ESG expertise, we uncover risks,\nimprove transparency, and support responsible sourcing.",
         speak="Using smart supply chain intelligence and E S G expertise, we uncover risks, improve transparency, and support responsible sourcing.",
         pause=0.8),

    # SCENE 4 — the close
    dict(id="s4_l1", scene=4,
         caption="Together, we create supply chains that are better for\nbusiness, people, and the planet.",
         speak="Together, we create supply chains that are better for business, people, and the planet.",
         pause=1.4),
]

LEAD_IN = 0.6  # silence before the first word


def synth(text, path):
    """Render one line to a WAV with espeak-ng."""
    subprocess.run(
        ["espeak-ng", "-v", "en-gb", "-s", "148", "-p", "42", "-g", "6",
         "-w", path, text],
        check=True,
    )


def read_wav(path):
    with wave.open(path, "rb") as w:
        assert w.getframerate() == RATE and w.getnchannels() == 1 and w.getsampwidth() == 2
        n = w.getnframes()
        return w.readframes(n), n


def silence_frames(seconds):
    n = int(round(seconds * RATE))
    return b"\x00\x00" * n, n


def main():
    pcm = bytearray()
    total_frames = 0
    timings = []

    # lead-in silence
    s, n = silence_frames(LEAD_IN)
    pcm += s
    total_frames += n

    for ln in LINES:
        wav_path = os.path.join(BUILD, ln["id"] + ".wav")
        synth(ln["speak"], wav_path)
        data, n = read_wav(wav_path)

        start = total_frames / RATE
        pcm += data
        total_frames += n
        end = total_frames / RATE

        # trailing pause
        s, sn = silence_frames(ln["pause"])
        pcm += s
        total_frames += sn

        timings.append(dict(
            id=ln["id"], scene=ln["scene"], caption=ln["caption"],
            start=round(start, 3), end=round(end, 3),
        ))

    duration = total_frames / RATE

    # write master WAV
    master_wav = os.path.join(BUILD, "master.wav")
    with wave.open(master_wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(pcm))

    # encode MP3 (mono is fine for a VO placeholder)
    mp3_path = os.path.join(ASSETS, "vo_placeholder.mp3")
    subprocess.run(
        [FFMPEG, "-y", "-i", master_wav, "-codec:a", "libmp3lame",
         "-b:a", "128k", "-ar", "44100", mp3_path],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )

    out = dict(duration=round(duration, 3), rate=RATE, lines=timings)
    with open(os.path.join(ASSETS, "timings.json"), "w") as f:
        json.dump(out, f, indent=2)

    print(json.dumps(out, indent=2))
    print("\nTotal duration: %.2fs" % duration)
    print("MP3:", mp3_path)


if __name__ == "__main__":
    main()
