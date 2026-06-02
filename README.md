# ImpactBuying — Brand Animation

A 55-second, **1600 × 900** kinetic-typography animation for ImpactBuying, built
to the brand's look & feel (deep teal-navy gradient, teal accents, Poppins, the
`ImpΛctBuying` chevron, the webinar "envelope" motif). It runs in any modern
browser — no build step, no dependencies.

```
open index.html      # or drag it into Chrome/Edge/Safari
```

Press **Space** to play. The animation is locked to the voiceover audio, so
it stays perfectly in sync.

---

## What's in here

```
index.html                 the animation (self-contained: CSS + JS inline)
assets/
  vo_placeholder.mp3        placeholder voiceover (see note below)
  timings.json              exact per-line VO timings (source of truth)
  fonts/                    Poppins (400–800) for offline fidelity
scripts/
  build_audio.py            regenerates the VO + timings
  record.mjs                renders the animation to MP4 (run locally)
```

## The script (synced to the timeline)

Synced to the real voiceover (`assets/voiceover.mp3`, ~37.1s; the animation
holds the end card to ~42s, then loops). Exact per-line timings live in
`assets/timings.json`.

| Scene | Time | Voiceover |
|------|------|-----------|
| 1 · Hook | 0–2.9s | *The rules of global trade are changing.* |
| 2 · Pressure | 3–18s | *Consumers demand transparency. Governments are introducing stricter ESG legislation. And businesses are expected to prove where products come from and how they impact people and the planet.* |
| 3 · Solution | 18–32s | *At ImpactBuying, we help businesses transform complex supply chains into opportunities for positive impact. Using smart supply chain intelligence and ESG expertise, we uncover risks, improve transparency, and support responsible sourcing.* |
| 4 · Close | 32–42s | *Together, we create supply chains that are better for business, people, and the planet.* |

## Voiceover

The animation plays the real voiceover, `assets/voiceover.mp3` (~37.1s). The
visuals are locked to it via the `TIMINGS` block and `data-in` / `data-out`
attributes (seconds) in `index.html`; line boundaries were derived from the
audio with silence detection. `assets/vo_placeholder.mp3` (a robotic offline
TTS render) is kept only as a fallback reference.

To swap in a different VO: replace `assets/voiceover.mp3` (or update the
`<audio src>`), then adjust the `TIMINGS` / `data-in` / `data-out` values if the
pacing changed.

## 🎬 Video-footage placeholders

Each scene has a **full-bleed background slot** for b-roll, sitting behind a dark
brand scrim so text stays legible. Toggle the slot labels with the **V** key (or
`?slots=1`). To add footage, replace the slot's placeholder inside the relevant
`<section class="scene">`:

```html
<div class="video-slot">
  <video autoplay muted loop playsinline src="assets/footage/scene1.mp4"></video>
</div>
```

Suggested footage per scene: **S1** global trade / shipping · **S2** people, city,
factory · **S3** ports, logistics, data · **S4** nature / aerial forest.

## Controls & URL flags

| Key | Action | | URL flag | Effect |
|---|---|---|---|---|
| Space | play / pause | | `?clean=1` | hide all UI (for recording) |
| R | restart | | `?auto=1` | autoplay |
| C | captions on/off | | `?slots=1` | show video-slot labels |
| V | video-slot labels | | `?nocap=1` | hide captions |

## Export to MP4

**Easiest:** open `index.html?clean=1&auto=1` at 1600×900 and screen-record
(OBS / QuickTime / your OS recorder).

**Best quality (frame-accurate 60fps + audio):** run locally —

```
npm i playwright && npx playwright install chromium
node scripts/record.mjs        # → build/impactbuying.mp4
```

## Regenerating the placeholder audio

```
pip install imageio-ffmpeg mutagen   # ffmpeg + mp3 duration
sudo apt-get install -y espeak-ng    # offline TTS
python3 scripts/build_audio.py       # writes assets/vo_placeholder.mp3 + timings.json
```

## Logo

Uses the **official ImpactBuying logo** (`assets/logo.svg`, the white
"with-payoff" lockup) directly — loaded via `buildLogo()` and sized per
placement. It appears in Scene 3 (small, 44px tall) and the Scene 4 end card
(large, 104px tall). To resize, change the `data-size` attribute (height in px)
on the `[data-logo]` spans in `index.html`; to update the artwork, replace
`assets/logo.svg`.

## Brand tokens (from the PPWR white paper)

- **Background:** `#003038` / `#0e2232` (deep teal-navy)
- **Accents:** `#06a9ba`, `#0594a3`, `#00818f` · **light:** `#70cbd6`, `#a8e2e9`, `#d8f3f6`
- **Font:** Poppins (700/800 for display)
- **Motifs:** drifting teal glows · supply-chain node network · `Λ` chevron · envelope band
