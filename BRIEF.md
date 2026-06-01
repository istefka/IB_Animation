# Build Brief — ImpactBuying Brand Animation (1600×900)

You are building a short, looping **brand film** for **ImpactBuying** as a single
self-contained web animation. This brief is complete on its own — you don't need
any other files. Deliver a polished, broadcast-feeling result.

---

## 1. Goal & deliverable

- A **45–60 second** kinetic-typography brand animation, **exactly 1600 × 900**.
- **One self-contained `index.html`** (inline CSS + JS, no build step, no external
  network calls at runtime). Web fonts may be bundled as local files.
- Dynamic and kinetic, but **smooth and premium** — think a confident B2B SaaS /
  sustainability brand film, not a busy explainer.
- **No audio / no mp3.** Run on a fixed internal timeline (a `requestAnimationFrame`
  clock) with on-screen **captions** synced to that timeline. The piece must still
  read as finished in silence. (Design so a real voiceover could be added later by
  swapping the clock source — see §7.)
- **Loops** cleanly.

---

## 2. Brand system (use these exactly)

Lifted from the ImpactBuying PPWR white paper.

**Palette**
| Token | Hex | Use |
|---|---|---|
| teal-950 | `#003038` | deep background |
| teal-900 | `#004f5d` | background |
| ink | `#021820` / `#02101a` | darkest base / letterbox |
| teal-700 | `#00818f` | accent deep |
| teal-600 | `#0594a3` | accent |
| teal-500 | `#06a9ba` | **primary accent** |
| teal-400 | `#32b3c8` | accent bright |
| teal-300 | `#70cbd6` | light accent / eyebrows |
| teal-200 | `#a8e2e9` | light text accent |
| teal-100 | `#d8f3f6` | subtle text |
| white | `#ffffff` | headings |

- **Background base:** layered dark teal-navy radial + linear gradient
  (e.g. `linear-gradient(160deg,#063039,#04222b 45%,#021820)` with teal radial glows top-right & bottom-left).
- **Accent gradient** (for highlighted words / icons):
  `linear-gradient(100deg,#a8e2e9,#32b3c8 45%,#0594a3)`.
- **Font:** **Poppins** (400/500/600/700/800). Bundle locally (Google Fonts TTF/woff2)
  with a `system-ui, -apple-system, "Segoe UI", Helvetica, sans-serif` fallback.
  Headlines 700–800, tight tracking (`-0.02em`).
- **Easing:** expressive-out `cubic-bezier(.2,.75,.2,1)`; in-out `cubic-bezier(.76,0,.24,1)`.

**Logo — `ImpΛctBuying®` with payoff `PROVEN POSITIVE IMPACT`**
- Recreate as **white vector**. The wordmark is "Imp" + an **upward solid triangle
  as the letter A** + "ctBuying", a small superscript `®` (tint teal-300), and a
  spaced-caps payoff line **"Proven Positive Impact"** below, centered.
- Triangle path (viewBox `0 0 52 60`): `M26 3 L51 57 L36.5 57 L26 33 L15.5 57 L1 57 Z`,
  height ≈ `0.72em`, baseline-aligned.
- Make logo size a parameter (used small ~34px in Scene 3, large ~70px on the end card).

**Recurring motifs**
- Drifting blurred **teal aurora glows** (screen blend) behind everything.
- An atmospheric **supply-chain node network** (canvas): drifting nodes, faint
  connecting lines, occasional pulses travelling along edges. Two depths for parallax.
- Subtle **film grain** (SVG fractalNoise, ~5% opacity, overlay blend) + **vignette**.
- A **chevron "Λ" wipe** as the scene transition.
- An **"envelope" chevron band** rising from the bottom on the close (a wide upward
  chevron, teal→deep-teal gradient — echoes the brand's webinar art).

---

## 3. Script & caption timing (the source of truth)

Full voiceover script (display it as captions, chunked as below). Times are seconds
on the internal clock; total runtime ~55s, hold the end card to ~56.8s then loop.

| # | Caption (on screen) | start | end |
|---|---|---|---|
| 1 | The rules of global trade are changing. | 0.6 | 4.1 |
| 2 | Consumers demand transparency. | 5.1 | 7.8 |
| 3 | Governments are introducing stricter ESG legislation. | 8.3 | 13.2 |
| 4 | And businesses are expected to prove where products come from and how they impact people and the planet. | 13.8 | 22.8 |
| 5 | At ImpactBuying, we help businesses transform complex supply chains into opportunities for positive impact. | 23.8 | 33.2 |
| 6 | Using smart supply chain intelligence and ESG expertise, we uncover risks, improve transparency, and support responsible sourcing. | 33.7 | 45.5 |
| 7 | Together, we create supply chains that are better for business, people, and the planet. | 46.3 | 53.6 |

Captions: centered lower-third, semi-transparent dark pill, blur backdrop, fade in/out,
toggleable. These timings are calibrated to ~150 wpm so they'll match a future VO.

---

## 4. Scene-by-scene direction

**Scene transitions:** a chevron-Λ wipe at ~4.45s, ~23.35s, ~45.78s, covering each cut.
Each scene fades/lifts out as a group when it ends.

### Scene 1 — Hook · 0–4.5s  (caption 1)
- Eyebrow (spaced caps, teal-300) with a short glowing tick mark: "Global trade is being redrawn".
- Big headline (~110px, 800): **"The rules of global trade are changing."**
  Reveal **word/line by line via mask-rise** (each line in an `overflow:hidden` box,
  inner text translateY 118%→0). The final word **"changing."** uses the accent gradient
  and gets an animated underline that scales in from the left.

### Scene 2 — The pressure · 5–23s  (captions 2–4)
- Section label: "A new era of accountability".
- **Three glassmorphic cards** in a row (subtle gradient fill, 1px gradient border,
  backdrop blur, soft shadow), each with a number, a **line-icon in a rounded tile**,
  a bold title, and a sub-line. They pop in (scale + fade) **sequentially** on the
  caption beats:
  - **01 Consumers** — *demand **transparency*** (icon: people) — in ~5.1s
  - **02 Governments** — *introduce stricter **ESG legislation*** (icon: columns/bank) — in ~8.3s
  - **03 Businesses** — *must **prove** their impact on **people & planet*** (icon: cube) — in ~13.6s

### Scene 3 — The solution · 23.5–45.7s  (captions 5–6)  ← spend the most craft here
Split layout: **text left, supply-chain visualization right.** Small logo lockup top-left.

- **Phase A (promise, ~24–33s):** mask-rise headline
  **"We turn *complex supply chains* into positive impact."** ("complex supply chains"
  in accent gradient) + a supporting line: *"Complexity becomes clarity — and clarity
  becomes opportunity."*
- **Phase B (capabilities, ~33.4s →):** Phase A lifts out; a label
  *"Smart supply-chain intelligence + ESG expertise"* appears, then **three capability
  rows** slide in on their caption beats, each an icon tile + title + micro-line:
  - **Uncover risks** — *see what's hidden in your chain* (icon: magnifier) ~34.1s
  - **Improve transparency** — *traceable, verifiable, end-to-end* (icon: eye) ~37.4s
  - **Responsible sourcing** — *better for people & planet* (icon: shield/leaf-check) ~40.7s
- **Supply-chain visualization (right, persistent from ~25s):** five iconographic
  nodes in a left→right flow — **source → factory → ship → retail → impact(leaf)** —
  connected by a smooth path that **draws itself in** (stroke-dashoffset), nodes
  **pop in sequentially**, and **glowing particles travel along the path**. The viz
  **reacts to Phase B**: on "Uncover risks" a node fires a pulsing ring (amber→green
  check); on "Improve transparency" the whole path glows/solidifies; on "Responsible
  sourcing" the impact node lights green.

### Scene 4 — The close · 45.9–56.8s  (caption 7)
- Small line: "Together, we create supply chains that are better for".
- **Three pillar cards** land in sequence (~46.9 / 47.9 / 48.9s), each an icon tile
  above a big gradient word: **business** (briefcase) · **people** (people) · **planet** (leaf).
- ~50.4s the pillars lift out and the **end card** scales in and **holds**: large
  **ImpΛctBuying® + Proven Positive Impact** lockup, then `impactbuying.com`, with the
  **envelope chevron band rising** from the bottom. Hold ~6s, then loop.

---

## 5. Technical architecture (required)

- **Fixed 1600×900 stage**, letterboxed and scaled to the viewport with
  `transform: scale(min(vw/1600, vh/900))` — never distort.
- **Single master clock**, scrub-safe and idempotent: a function `setStateAt(t)` that,
  given any time `t`, deterministically sets the entire visual state (scene in/pre/out,
  every element's reveal state, viz progress, captions, transition wipes, progress bar).
  Driven by a `requestAnimationFrame` loop that advances an internal clock while playing.
  **Seeking/scrubbing to any `t` must produce the correct frame** — no `setTimeout`-based
  choreography.
- **Reveal primitives** driven by `data-in` (and optional `data-out`) attributes in
  seconds. Elements get `shown` when `in ≤ t < out`, and `gone` (animate out, e.g. lift
  up + fade) when `t ≥ out`. Provide: fade/blur-rise, scale-in, and **mask-rise** (line
  reveal). Don't hand-schedule timers.
- **Canvas network** redraws every frame (alive even when paused is fine).
- **SVG supply-chain viz** progress is computed from `t` (path dash, node pop, particle
  position via `getPointAtLength`), not from animation events.
- Expose `window.renderAt(t)` and `window.ANIM_END` for frame-accurate offline recording.

---

## 6. Controls & flags (for preview + recording)

- Keys: **Space** play/pause · **R** restart · **C** captions on/off · **V** toggle
  video-slot labels.
- A minimal control bar (play/restart, clickable scrubber, time readout, captions/slots
  toggles) — hidden via `?clean=1`.
- URL flags: `?clean=1` (hide all UI for recording), `?auto=1` (autoplay), `?slots=1`
  (show slot labels), `?nocap=1` (hide captions).
- Document a recording path (screen-record `?clean=1&auto=1`, or frame-step `renderAt(t)`
  + ffmpeg for a 60fps MP4).

---

## 7. Video-footage placeholders (must include)

Each scene has a **full-bleed background slot** behind a dark brand scrim (so text stays
legible). Default = an animated brand-gradient placeholder with a dashed, toggleable
label. Swapping in footage = replacing the slot's contents with
`<video autoplay muted loop playsinline src="…"></video>`. Suggested b-roll:
**S1** global trade / shipping · **S2** people, city, factory · **S3** ports, logistics,
data · **S4** nature / aerial forest.

**No-audio note:** the clock is internal (RAF). Keep it abstracted so a real voiceover
can later drive it instead — i.e. `now()` returns `audio.currentTime` when an `<audio>`
is present and playing, else the internal clock. Ship it audio-free; the captions are
the script.

---

## 8. Acceptance criteria

1. Exactly **1600×900**, scales to fit any window without distortion, letterboxed.
2. **45–60s**, loops cleanly; end card holds a few seconds before looping.
3. All 7 captions appear at the times in §3 and read as the full script.
4. On-brand: dark teal-navy gradient, teal accents, Poppins, the **ImpΛctBuying®
   + Proven Positive Impact** white lockup, chevron wipes, envelope band.
5. Scene 3 (24–46s) is visually rich and choreographed (promise → capabilities +
   reactive supply-chain viz); Scene 4 lands the three pillars then holds the end card.
6. **Scrub-safe:** dragging the scrubber to any point shows a correct, complete frame.
7. No runtime network dependency; opens by double-clicking `index.html`.
8. Smooth motion (no jank), tasteful — kinetic but not chaotic.

**Definition of done:** open `index.html`, press Space — a finished, looping, on-brand
55s brand film plays with synced captions and no audio, and scrubbing to any time
renders correctly.
