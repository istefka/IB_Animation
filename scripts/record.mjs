/**
 * Export the animation to MP4 — run LOCALLY (needs Node + Playwright's Chromium).
 *
 *   npm install
 *   npx playwright install chromium
 *   node scripts/record.mjs                 # renders index.html
 *   node scripts/record.mjs FootageX/index.html
 *
 * HOW IT WORKS:
 * The motion is driven by CSS transitions/@keyframes, so we let the page PLAY
 * (real browser output) and grab frames via CDP screencast — each frame carries
 * a real timestamp. We then assemble the frames on that real timeline, so the
 * result is perfectly in sync with the voiceover regardless of how fast/slow the
 * machine could render (recordVideo, by contrast, stretches time under load).
 * Fonts are preloaded; gradients are de-banded; output is the full ANIM_END.
 *
 * Output: build/<name>.mp4
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const HTML = process.argv[2] || 'index.html';
const NAME = HTML.replace(/\.html?$/i, '').replace(/[\\/]+/g, '-');
const OUT = path.join(ROOT, 'build', `${NAME}.mp4`);
const TMP = path.join(ROOT, 'build', '_rec');
const FRAMES = path.join(TMP, 'frames');
const FPS = 60;

// --- audio tracks referenced by the page (<audio id="vo"/"bgm" src="...">) ---
const html = readFileSync(path.join(ROOT, HTML), 'utf8');
const srcOf = (id) => {
  const m = html.match(new RegExp(`<audio[^>]*id=["']${id}["'][^>]*src=["']([^"']+)["']`, 'i'));
  if (!m) return null;
  const rel = m[1].replace(/^\//, '');
  for (const base of [ROOT, path.join(ROOT, 'public')]) {
    const p = path.join(base, rel);
    if (existsSync(p)) return p;
  }
  return null;
};
const VO = srcOf('vo');
const BGM = srcOf('bgm');
console.log(`Rendering ${HTML}`);
console.log(`  voiceover: ${VO || '(none found)'}`);
console.log(`  music:     ${BGM || '(none)'}`);

rmSync(TMP, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
mkdirSync(path.join(ROOT, 'build'), { recursive: true });

// --- static server so absolute "/assets/..." paths + <video> resolve ---------
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.mp4':'video/mp4',
  '.webm':'video/webm', '.mp3':'audio/mpeg', '.ttf':'font/ttf', '.woff2':'font/woff2', '.json':'application/json' };
const resolveFile = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  for (const base of [ROOT, path.join(ROOT, 'public')]) {
    const p = path.join(base, clean);
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
};

// --- transcode MP4 <video> footage to WebM/VP9 ------------------------------
// Playwright's bundled Chromium can't decode H.264/MP4 in <video>, so footage
// backgrounds render black. We transcode each referenced clip to WebM (which it
// CAN decode) and serve the page with rewritten <source>s. Corrupt/missing
// clips fall back to the first valid one so no slot is ever black.
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const WEBM = path.join(TMP, 'webm');
mkdirSync(WEBM, { recursive: true });
let servedHtml = html;
const mp4srcs = [...html.matchAll(/src=["']([^"']+\.mp4)["']\s+type=["']video\/mp4["']/gi)].map(m => m[1]);
const webmFor = {};
let firstWebm = null;
for (const u of [...new Set(mp4srcs)]) {
  const file = resolveFile(u);
  const valid = file && spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'null', '-'], { stdio: 'ignore' }).status === 0;
  if (valid) {
    const name = path.basename(u).replace(/\.mp4$/i, '.webm');
    const out = path.join(WEBM, name);
    if (!existsSync(out)) {
      console.log(`  transcoding ${path.basename(u)} -> webm…`);
      spawnSync(ffmpeg, ['-y', '-v', 'error', '-i', file, '-an', '-c:v', 'libvpx-vp9',
        '-b:v', '5M', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-vf', 'scale=1600:-2', out], { stdio: 'inherit' });
    }
    if (existsSync(out)) { webmFor[u] = name; firstWebm = firstWebm || name; }
  } else if (file) {
    console.log(`  ! ${path.basename(u)} is corrupt — using a placeholder clip`);
    webmFor[u] = null;
  }
}
for (const u of Object.keys(webmFor)) {
  const name = webmFor[u] || firstWebm;
  if (name) servedHtml = servedHtml.split(`src="${u}" type="video/mp4"`).join(`src="/__webm/${name}" type="video/webm"`);
}
const pagePath = '/' + HTML.split(path.sep).join('/');

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === pagePath) {                       // serve the rewritten page
    res.setHeader('Content-Type', 'text/html');
    return res.end(servedHtml);
  }
  if (urlPath.startsWith('/__webm/')) {             // serve transcoded clips
    const wf = path.join(WEBM, path.basename(urlPath));
    if (existsSync(wf)) { res.setHeader('Content-Type', 'video/webm'); res.setHeader('Accept-Ranges', 'bytes'); return createReadStream(wf).pipe(res); }
    res.writeHead(404); return res.end('not found');
  }
  const file = resolveFile(req.url);
  if (!file) { res.writeHead(404); return res.end('not found'); }
  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

// --- launch + load ------------------------------------------------------------
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const url = `http://127.0.0.1:${PORT}/${HTML.split(path.sep).join('/')}?clean=1&nocap=1`;
await page.goto(url, { waitUntil: 'load' });
// preload EVERY Poppins weight so no text falls back to a system font mid-render
await page.evaluate(async () => {
  if (!document.fonts) return;
  try { await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`))); } catch (e) {}
  await document.fonts.ready;
});
await page.waitForFunction(() => typeof window.ANIM_END === 'number');
// pause the expensive animated background glow during capture so the page can
// paint faster -> higher, steadier capture fps -> smoother motion (esp. the
// ticker). The drift is a barely-perceptible ambient effect; freezing it is fine.
await page.addStyleTag({ content: '.bg-glow::before,.bg-glow::after{animation:none!important}' }).catch(() => {});
await page.evaluate(() => Promise.all([...document.querySelectorAll('video')].map(v =>
  v.readyState >= 2 ? 0 : new Promise(r => { v.addEventListener('canplay', r, { once: true }); setTimeout(r, 5000); })))).catch(() => {});
const END = await page.evaluate(() => window.ANIM_END);
await page.evaluate(() => { try { playing = false; } catch (e) {} window.renderAt(0); });
await page.waitForTimeout(200);

// --- capture frames via screencast (each frame has a real timestamp) ----------
const frames = [];
let fi = 0, t0 = null;
cdp.on('Page.screencastFrame', (ev) => {
  cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
  const ts = ev.metadata.timestamp;
  if (t0 === null) t0 = ts;
  const file = path.join(FRAMES, `f${String(fi++).padStart(6, '0')}.jpg`);
  writeFileSync(file, Buffer.from(ev.data, 'base64'));
  frames.push({ rel: ts - t0, file });
});
// JPEG (high quality) screencast is much faster to encode/transfer than PNG,
// so we capture a higher, steadier frame rate -> smoother motion (the ticker).
// Any slight JPEG softness on the gradient is cleaned up by the deband encode.
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, everyNthFrame: 1 });
// real-time driver: clock = true elapsed wall-time (uncapped), so the schedule is right
await page.evaluate((end) => {
  try { playing = false; } catch (e) {}
  const s = performance.now();
  (function tick() {
    const t = (performance.now() - s) / 1000;
    window.renderAt(Math.min(t, end));
    if (t < end) requestAnimationFrame(tick);
  })();
}, END);
console.log(`  capturing ${END.toFixed(1)}s …`);
await page.waitForTimeout(Math.ceil(END * 1000) + 250);
await cdp.send('Page.stopScreencast').catch(() => {});
await page.waitForTimeout(150);
await browser.close();
server.close();

if (!frames.length) { console.error('No frames captured.'); process.exit(1); }
frames.sort((a, b) => a.rel - b.rel);
console.log(`  captured ${frames.length} frames (~${(frames.length / END).toFixed(1)} fps avg)`);

// --- assemble frames on their REAL timeline (concat demuxer w/ per-frame dur) --
const usable = frames.filter(f => f.rel <= END + 0.1);
let concat = 'ffconcat version 1.0\n';
for (let i = 0; i < usable.length; i++) {
  const dur = i < usable.length - 1 ? usable[i + 1].rel - usable[i].rel : 1 / FPS;
  concat += `file '${usable[i].file.replace(/'/g, "'\\''")}'\nduration ${Math.max(0.001, dur).toFixed(4)}\n`;
}
concat += `file '${usable[usable.length - 1].file.replace(/'/g, "'\\''")}'\n`;
const listFile = path.join(TMP, 'frames.txt');
writeFileSync(listFile, concat);

// --- encode: de-band, full length, mux audio ---------------------------------
const VF = 'deband=1thr=0.012:2thr=0.012:3thr=0.012:4thr=0.012:range=22:blur=1,format=yuv420p';
const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listFile];
const fc = [`[0:v]fps=${FPS},${VF}[v]`];
const maps = ['-map', '[v]'];
let hasAudio = false;
if (VO && BGM) {
  args.push('-i', VO, '-stream_loop', '-1', '-i', BGM);
  fc.push('[1:a]volume=1.0[vo]', '[2:a]volume=0.28[bg]',
          '[vo][bg]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,apad[a]');
  maps.push('-map', '[a]'); hasAudio = true;
} else if (VO) {
  args.push('-i', VO);
  fc.push('[1:a]volume=1.0,apad[a]');
  maps.push('-map', '[a]'); hasAudio = true;
}
args.push(
  '-filter_complex', fc.join(';'),
  ...maps,
  '-c:v', 'libx264', '-crf', '16', '-preset', 'slow',
  '-x264-params', 'aq-mode=3:aq-strength=1.0',
  '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k'] : ['-an']),
  '-t', END.toFixed(3), OUT,
);
console.log('Encoding (de-band)…');
const r = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (r.error) console.error('\nffmpeg failed. Set FFMPEG=/path/to/ffmpeg or install ffmpeg.\n', r.error.message);
else console.log('\nDone → ' + OUT);
