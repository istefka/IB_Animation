# ImpactBuying — Brand Animation

A 60-second brand film, built as a self-contained HTML/CSS/JS animation synced
to a voiceover. Two versions share the same assets:

| Preview | File | Look |
|---|---|---|
| **V1** | `index.html` | Gradient slide-deck (animated teal background) |
| **V2** | `FootageX/index.html` | Real video footage backgrounds |

Both run ~60s, auto-play, are synced to the voiceover + background music, use
the bundled **Poppins** font, and end on the brand card with a scrolling
client-logo ticker.

---

## Preview in a browser

```bash
npm install
npm run dev
```

Then open:

- **V1** → http://localhost:5173/
- **V2** → http://localhost:5173/FootageX/

They auto-play; click once anywhere to enable the voiceover audio (browsers
mute autoplay until you interact).

---

## Export to MP4

Renders the animation **frame-accurately** (real-time playback captured via
Chromium screencast, assembled on real timestamps so it stays in sync with the
voiceover), then encodes a clean, de-banded MP4 with the audio muxed in.

```bash
npm install
npx playwright install chromium     # one-time: gets the headless browser
npm run export                      # V1  -> build/index.mp4
npm run export:footage              # V2  -> build/FootageX-index.mp4
```

Requires **ffmpeg** on your PATH (or set `FFMPEG=/path/to/ffmpeg`).

Useful knobs (env vars):

| Var | Default | Notes |
|---|---|---|
| `FPS` | `60` | Output frame rate. `FPS=30 npm run export:footage` for the footage version. |
| `FFMPEG` | `ffmpeg` | Path to the ffmpeg binary. |

Output lands in `build/` (git-ignored). Re-encode for delivery as needed, e.g.:

```bash
ffmpeg -i build/index.mp4 -vf scale=1920:1080 -c:v libx264 -profile:v high \
  -crf 20 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k out.mp4
```

### How the exporter handles things automatically
- **Fonts** are preloaded so no text falls back to a system font mid-render.
- **MP4 footage → WebM**: Playwright's Chromium can't decode H.264 in `<video>`,
  so each footage clip is transcoded to WebM (cached) before capture. A corrupt
  or missing clip falls back to a valid one so no slot is ever black.
- **De-banding** keeps the teal gradients smooth (no stair-stepping).
- The video is trimmed/aligned so it starts on the first animation frame (no
  white flash) and runs the full length (`ANIM_END`).

---

## Project layout

```
index.html              V1 preview (gradient)
FootageX/index.html     V2 preview (footage)
scripts/record.mjs      MP4 exporter (Playwright + ffmpeg)
vite.config.js          dev/build config (both previews)
package.json
public/assets/          all runtime assets, served at /assets/*
  fonts/                Poppins (400–800)
  logo.svg              ImpactBuying logo
  logos/                client logos for the end ticker
  photo-thing.png       V1 bridge image
  AI_Brechtje.mp3       voiceover
  jonasblakewood-…​.mp3   background music
  Vid1.mp4 / vid2.mp4 / Vid3.mp4   V2 footage (scenes 1 / 2 / 4)
build/                  render output (git-ignored)
```

All assets are referenced as absolute `/assets/…` paths, served from `public/`
by both Vite and the exporter.

---

## Notes
- **Footage & large media**: video `.mp4`s can get truncated when committed
  through some git paths. If a clip looks corrupt (tiny/black), re-add the full
  file. For long-term reliability, track `*.mp4` with **Git LFS**.
- The client-logo ticker uses **local** logos (`public/assets/logos`), not the
  live site, so it renders identically in the browser and in exports.
