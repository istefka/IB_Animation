# Prompt — paste this to an AI to build the animation

> Copy everything in the box below into a coding-capable AI (Claude Code, etc.).
> It's fully self-contained and produces a single `index.html`, no audio.

---

You are a senior motion designer + front-end engineer. Build me a polished, looping
**brand film** for **ImpactBuying** as **one self-contained `index.html`** (inline CSS +
JS, no build step, no runtime network calls; you may bundle web-font files locally).

**Format & feel**
- Exactly **1600 × 900**. Letterbox and scale to the viewport with
  `transform: scale(min(vw/1600, vh/900))` — never distort.
- **45–60 seconds**, loops cleanly (hold the end card ~6s, then restart).
- Dynamic and kinetic but **smooth and premium** — a confident B2B sustainability brand
  film, not a busy explainer. No jank.
- **No audio.** Drive everything from a fixed **internal `requestAnimationFrame` clock**
  and show **on-screen captions** synced to it (the captions ARE the script). It must
  read as finished in silence. Abstract the clock as `now()` so a voiceover could later
  drive it (`now()` returns `audio.currentTime` if an `<audio>` is present & playing,
  else the internal clock).

**Hard technical requirements**
- A single **scrub-safe, idempotent** `setStateAt(t)` that, for ANY time `t`,
  deterministically sets the whole visual state (active scene, every element's reveal
  state, the supply-chain viz progress, captions, transition wipes, progress bar).
  Dragging a scrubber to any `t` must render the correct complete frame.
- **No `setTimeout`-based choreography.** Reveal elements via `data-in` / optional
  `data-out` attributes (seconds): element is `shown` when `in ≤ t < out`, and animates
  `gone` (lift up + fade) when `t ≥ out`. Provide three reveal primitives: fade/blur-rise,
  scale-in, and **mask-rise** (line in an `overflow:hidden` box, inner text translateY
  118%→0). Scene timing uses the same attribute pattern.
- Compute the SVG viz from `t` (path `stroke-dashoffset`, node pop-in, particle position
  via `getPointAtLength`) — not from animation events.
- Expose `window.renderAt(t)` and `window.ANIM_END` for frame-accurate offline recording.

**Brand system (use exactly)**
- Palette: bg deep teal-navy `#003038` / `#04222b` / `#021820`; accents teal-500 `#06a9ba`
  (primary), `#0594a3`, `#00818f`, bright `#32b3c8`; light `#70cbd6`, `#a8e2e9`, `#d8f3f6`;
  headings `#ffffff`.
- Background: `linear-gradient(160deg,#063039,#04222b 45%,#021820)` plus teal radial glows
  top-right and bottom-left.
- Accent gradient for highlighted words/icons: `linear-gradient(100deg,#a8e2e9,#32b3c8 45%,#0594a3)`.
- Font: **Poppins** (400/500/600/700/800), bundled locally, fallback
  `system-ui,-apple-system,"Segoe UI",Helvetica,sans-serif`. Headlines 700–800, tracking `-0.02em`.
- Easing: out `cubic-bezier(.2,.75,.2,1)`, in-out `cubic-bezier(.76,0,.24,1)`.
- **Logo (white vector):** `ImpΛctBuying®` — render "Imp" + a solid upward triangle as the
  letter A + "ctBuying" + a small superscript `®` (tint teal-300), with a spaced-caps payoff
  line **"Proven Positive Impact"** centered beneath. Triangle path (viewBox `0 0 52 60`):
  `M26 3 L51 57 L36.5 57 L26 33 L15.5 57 L1 57 Z`, height ≈ `0.72em`, baseline-aligned.
  Make logo size a parameter (small ~34px in Scene 3, large ~70px on the end card).
- Recurring motifs: drifting blurred **teal aurora glows** (screen blend); an atmospheric
  **canvas supply-chain node network** (two depths, drifting nodes, faint links, pulses
  travelling along edges); subtle **film grain** (SVG fractalNoise ~5%, overlay) + vignette;
  a **chevron-Λ wipe** between scenes; an **"envelope" chevron band** (wide upward chevron,
  teal→deep-teal) rising from the bottom on the close.

**Script = captions (the timing source of truth).** Centered lower-third pill, blur backdrop,
fade in/out, toggleable. Times in seconds; total ~55s, hold end card to ~56.8s, then loop:

| # | Caption | start | end |
|---|---|---|---|
| 1 | The rules of global trade are changing. | 0.6 | 4.1 |
| 2 | Consumers demand transparency. | 5.1 | 7.8 |
| 3 | Governments are introducing stricter ESG legislation. | 8.3 | 13.2 |
| 4 | And businesses are expected to prove where products come from and how they impact people and the planet. | 13.8 | 22.8 |
| 5 | At ImpactBuying, we help businesses transform complex supply chains into opportunities for positive impact. | 23.8 | 33.2 |
| 6 | Using smart supply chain intelligence and ESG expertise, we uncover risks, improve transparency, and support responsible sourcing. | 33.7 | 45.5 |
| 7 | Together, we create supply chains that are better for business, people, and the planet. | 46.3 | 53.6 |

**Scenes** (chevron-Λ wipe at ~4.45 / 23.35 / 45.78s; each scene lifts + fades out as a group):

1. **Hook · 0–4.5s** — spaced-caps eyebrow with a glowing tick ("Global trade is being
   redrawn"); big ~110px/800 headline **"The rules of global trade are changing."** revealed
   line-by-line via mask-rise; final word **"changing."** in the accent gradient with an
   underline that scales in from the left.

2. **Pressure · 5–23s** — label "A new era of accountability"; **three glassmorphic cards**
   (gradient fill, 1px gradient border, backdrop blur, soft shadow), each = number + line-icon
   tile + bold title + sub-line, popping in (scale+fade) on the caption beats:
   **01 Consumers** *demand **transparency*** (people icon, ~5.1s) ·
   **02 Governments** *introduce stricter **ESG legislation*** (columns icon, ~8.3s) ·
   **03 Businesses** *must **prove** their impact on **people & planet*** (cube icon, ~13.6s).

3. **Solution · 23.5–45.7s (spend the most craft here)** — split layout, small logo top-left.
   *Phase A (~24–33s):* mask-rise headline **"We turn _complex supply chains_ into positive
   impact."** ("complex supply chains" in accent gradient) + sub-line *"Complexity becomes
   clarity — and clarity becomes opportunity."*
   *Phase B (~33.4s →):* Phase A lifts out; label *"Smart supply-chain intelligence + ESG
   expertise"*, then three capability rows slide in on their beats (icon tile + title + micro):
   **Uncover risks** *(see what's hidden)* magnifier ~34.1s · **Improve transparency**
   *(traceable, end-to-end)* eye ~37.4s · **Responsible sourcing** *(better for people &
   planet)* shield-leaf ~40.7s.
   *Right side (persistent from ~25s):* a **supply-chain visualization** — five iconographic
   nodes **source → factory → ship → retail → impact(leaf)** on a smooth path that **draws
   itself**, nodes **pop in sequentially**, **glowing particles flow along the path**. It
   **reacts** to Phase B: "Uncover risks" → a node fires a pulsing ring (amber→green check);
   "Improve transparency" → the whole path glows/solidifies; "Responsible sourcing" → the
   impact node lights green.

4. **Close · 45.9–56.8s** — small line "Together, we create supply chains that are better for";
   **three pillar cards** land in sequence (~46.9 / 47.9 / 48.9s): icon tile above a big
   gradient word — **business** (briefcase) · **people** (people) · **planet** (leaf). At
   ~50.4s the pillars lift out and the **end card** scales in and **holds**: large
   **ImpΛctBuying® + Proven Positive Impact** lockup, then `impactbuying.com`, with the
   **envelope chevron band rising** from the bottom. Hold, then loop.

**Video-footage placeholders (include):** each scene has a **full-bleed background slot**
behind a dark brand scrim (keeps text legible). Default = animated brand-gradient placeholder
with a dashed, toggleable label; swapping in footage = replacing the slot with
`<video autoplay muted loop playsinline src="…">`. Suggested b-roll: S1 global trade/shipping ·
S2 people/city/factory · S3 ports/logistics/data · S4 nature/aerial forest.

**Controls & flags:** keys **Space** play/pause, **R** restart, **C** captions, **V** slot
labels; a minimal control bar (play/restart, clickable scrubber, time, captions/slots toggles)
hidden via `?clean=1`; URL flags `?clean=1`, `?auto=1`, `?slots=1`, `?nocap=1`. Document a
recording path (screen-record `?clean=1&auto=1`, or frame-step `renderAt(t)` + ffmpeg @60fps).

**Acceptance:** exactly 1600×900 & scales without distortion; 45–60s looping with end-card
hold; all 7 captions at the times above; on-brand (dark teal-navy, teal accents, Poppins,
white ImpΛctBuying®+payoff lockup, chevron wipes, envelope band); Scene 3 rich & choreographed
with the reactive viz, Scene 4 lands pillars then holds the end card; **fully scrub-safe**; no
runtime network dependency (opens by double-clicking `index.html`); smooth, tasteful, kinetic
but not chaotic. Deliver the complete `index.html`.
