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
import { mkdirSync, rmSync, readFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const HTML = process.argv[2] || 'index.html';
const NAME = HTML.replace(/\.html?$/i, '').replace(/[\\/]+/g, '-'); // FootageX/index.html -> FootageX-index
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

// --- tiny static server so absolute "/assets/..." paths resolve (the footage
//     version uses them, and <video> needs a real server, not file://) -------
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.mp4':'video/mp4',
  '.mp3':'audio/mpeg', '.ttf':'font/ttf', '.woff2':'font/woff2', '.json':'application/json' };
const resolveFile = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  for (const base of [ROOT, path.join(ROOT, 'public')]) {     // try root, then public/
    const p = path.join(base, clean);
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
};
const server = http.createServer((req, res) => {
  const file = resolveFile(req.url);
  if (!file) { res.writeHead(404); return res.end('not found'); }
  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

// --- record the page playing in real time ---------------------------------
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: TMP, size: { width: 1600, height: 900 } },
});
const page = await ctx.newPage();
const tFirst = Date.now();        // ~when the recording's first (white) frame is captured
const url = `http://127.0.0.1:${PORT}/${HTML.split(path.sep).join('/')}?clean=1&nocap=1`;
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
await page.waitForFunction(() => typeof window.ANIM_END === 'number');
// let any <video> footage buffer before we start
await page.evaluate(() => Promise.all([...document.querySelectorAll('video')].map(v =>
  v.readyState >= 2 ? 0 : new Promise(r => { v.addEventListener('canplay', r, { once: true }); setTimeout(r, 4000); })))).catch(() => {});
const END = await page.evaluate(() => window.ANIM_END);
// hold a clean frame-0 (kills the white default-background flash) before playing
await page.evaluate(() => { try { playing = false; lastTS = 0; window.renderAt(0); } catch (e) {} });
await page.waitForTimeout(500);
// start playback; remember exactly when, so we can trim the lead-in to match the VO
const tPlay = Date.now();
await page.evaluate(() => { try { clock = 0; lastTS = 0; playing = true; } catch (e) {} });
console.log(`  playing ${END.toFixed(1)}s in real time…`);
await page.waitForTimeout(Math.ceil(END * 1000) + 150);
await ctx.close();               // finalizes the .webm
const webm = await page.video().path().catch(() => null);
await browser.close();
// seconds of lead-in (white flash + frame-0 hold) before the animation starts
const LEAD = Math.max(0, (tPlay - tFirst) / 1000);
server.close();
const src = webm || path.join(TMP, ''); // playwright names it a hash.webm
const recFile = webm;
if (!recFile) { console.error('No video captured.'); process.exit(1); }

// --- re-encode: de-band + subtle dither + high quality, mux audio ----------
let ffmpeg = 'ffmpeg';
try { ffmpeg = (await import('imageio-ffmpeg')).get_ffmpeg_exe?.() || 'ffmpeg'; } catch {}
// (Python's imageio-ffmpeg binary also works if you set FFMPEG=/path)
if (process.env.FFMPEG) ffmpeg = process.env.FFMPEG;

// video filter: gradconvert smooths gradient banding without adding visible
// grain. deband only (no temporal noise — that was what looked "noisy").
// format pins yuv420p for universal playback.
const VF = 'deband=1thr=0.012:2thr=0.012:3thr=0.012:4thr=0.012:range=22:blur=1,format=yuv420p';

// trim the lead-in so the video starts exactly at the animation's first frame
// (this removes the white flash AND lines the visuals up with the voiceover)
const args = ['-y', '-ss', LEAD.toFixed(3), '-i', recFile];
const fc = [`[0:v]${VF}[v]`];
const maps = ['-map', '[v]'];
console.log(`  trimming ${LEAD.toFixed(2)}s lead-in`);
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
