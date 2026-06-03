/**
 * Export the animation to MP4 — run LOCALLY (needs Node + Playwright's Chromium).
 *
 *   npm install
 *   npx playwright install chromium
 *   node scripts/record.mjs               # renders index.html
 *   node scripts/record.mjs FootageX.html  # renders another version
 *
 * WHY THIS APPROACH:
 * The animation's motion (slide cross-fades, the `.r` reveals, the drifting
 * background glow) is driven by CSS transitions/@keyframes that run on the
 * browser's own clock. Stepping `renderAt(t)` frame-by-frame flips the state
 * classes but does NOT advance those CSS transitions, so a stepped render does
 * not match what you see when it plays. So we record it PLAYING IN REAL TIME —
 * the captured frames are exactly the browser's output — then re-encode to a
 * high-quality MP4 with de-banding + dithering so the teal gradients don't
 * stair-step ("banding"), which is what wrecks screen recordings.
 *
 * Output: build/<name>.mp4
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const HTML = process.argv[2] || 'index.html';
const NAME = path.basename(HTML).replace(/\.html?$/i, '');
const OUT = path.join(ROOT, 'build', `${NAME}.mp4`);
const TMP = path.join(ROOT, 'build', '_rec');

// --- find the audio tracks the page references (<audio id="vo"/"bgm" src="...">)
const html = readFileSync(path.join(ROOT, HTML), 'utf8');
const srcOf = (id) => {
  const m = html.match(new RegExp(`<audio[^>]*id=["']${id}["'][^>]*src=["']([^"']+)["']`, 'i'));
  if (!m) return null;
  const rel = m[1].replace(/^\//, '');            // "/assets/x.mp3" -> "assets/x.mp3"
  const p = path.join(ROOT, rel);
  return existsSync(p) ? p : null;
};
const VO = srcOf('vo');
const BGM = srcOf('bgm');
console.log(`Rendering ${HTML}`);
console.log(`  voiceover: ${VO || '(none found)'}`);
console.log(`  music:     ${BGM || '(none)'}`);

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(path.join(ROOT, 'build'), { recursive: true });

// --- record the page playing in real time ---------------------------------
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: TMP, size: { width: 1600, height: 900 } },
});
const page = await ctx.newPage();
const url = pathToFileURL(path.join(ROOT, HTML)).href + '?clean=1&nocap=1';
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
await page.waitForFunction(() => typeof window.ANIM_END === 'number');
const END = await page.evaluate(() => window.ANIM_END);
// restart cleanly from t=0 and let it play through, captured in real time
await page.evaluate(() => { try { clock = 0; lastTS = 0; playing = true; } catch (e) {} });
console.log(`  playing ${END.toFixed(1)}s in real time…`);
await page.waitForTimeout(Math.ceil(END * 1000) + 400);
await ctx.close();               // finalizes the .webm
const webm = await page.video().path().catch(() => null);
await browser.close();
const src = webm || path.join(TMP, ''); // playwright names it a hash.webm
const recFile = webm;
if (!recFile) { console.error('No video captured.'); process.exit(1); }

// --- re-encode: de-band + subtle dither + high quality, mux audio ----------
let ffmpeg = 'ffmpeg';
try { ffmpeg = (await import('imageio-ffmpeg')).get_ffmpeg_exe?.() || 'ffmpeg'; } catch {}
// (Python's imageio-ffmpeg binary also works if you set FFMPEG=/path)
if (process.env.FFMPEG) ffmpeg = process.env.FFMPEG;

// video filter: deband smooths existing bands; noise adds dither so 8-bit
// H.264 can't re-form them; format pins yuv420p for universal playback.
const VF = 'deband=1thr=0.015:2thr=0.015:3thr=0.015:4thr=0.015:range=16:blur=1,'
         + 'noise=alls=3:allf=t,format=yuv420p';

const args = ['-y', '-i', recFile];
const fc = [`[0:v]${VF}[v]`];
const maps = ['-map', '[v]'];
let hasAudio = false;
if (VO && BGM) {
  args.push('-i', VO, '-i', BGM);
  fc.push('[1:a]volume=1.0[vo]', '[2:a]volume=0.28[bg]', '[vo][bg]amix=inputs=2:duration=first[a]');
  maps.push('-map', '[a]'); hasAudio = true;
} else if (VO) {
  args.push('-i', VO);
  fc.push('[1:a]volume=1.0[a]');
  maps.push('-map', '[a]'); hasAudio = true;
}
args.push(
  '-filter_complex', fc.join(';'),
  ...maps,
  '-c:v', 'libx264', '-crf', '16', '-preset', 'slow',
  '-x264-params', 'aq-mode=3:aq-strength=1.0',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k'] : ['-an']),
  '-shortest', OUT,
);
console.log('Encoding (de-band + dither)…');
const r = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (r.error) console.error('\nffmpeg failed. Set FFMPEG=/path/to/ffmpeg or install ffmpeg.\n', r.error.message);
else console.log('\nDone → ' + OUT);
