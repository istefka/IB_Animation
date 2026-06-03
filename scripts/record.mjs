/**
 * Record the animation to MP4 — run this LOCALLY (needs a browser + ffmpeg).
 *
 *   npm i playwright
 *   npx playwright install chromium
 *   node scripts/record.mjs
 *
 * It captures frame-by-frame at 60fps for buttery-smooth, deterministic
 * output, then muxes in the voiceover + background music. Output: build/impactbuying.mp4
 *
 * (If you'd rather just screen-record: open index.html?clean=1&auto=1 in a
 *  browser at 1600×900 and use OBS / QuickTime / your OS recorder.)
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const FRAMES = path.join(ROOT, 'build', 'frames');
const OUT = path.join(ROOT, 'build', 'impactbuying.mp4');
const FPS = 60;

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '?clean=1&nocap=1');
await page.waitForFunction(() => typeof window.renderAt === 'function');
// give fonts a beat to load
await page.waitForTimeout(600);

const END = await page.evaluate(() => window.ANIM_END);
const total = Math.ceil(END * FPS);
console.log(`Rendering ${total} frames (${END.toFixed(1)}s @ ${FPS}fps)…`);

for (let i = 0; i < total; i++) {
  const t = i / FPS;
  await page.evaluate(tt => window.renderAt(tt), t);
  await page.screenshot({
    path: path.join(FRAMES, `f${String(i).padStart(5, '0')}.png`),
    clip: { x: 0, y: 0, width: 1600, height: 900 },
  });
  if (i % 60 === 0) process.stdout.write(`\r  ${(t).toFixed(1)}s / ${END.toFixed(1)}s`);
}
console.log('\nEncoding…');
await browser.close();

// find ffmpeg (system, else imageio-ffmpeg if present)
let ffmpeg = 'ffmpeg';
const voFile = path.join(ROOT, 'assets', 'AI_Brechtje.mp3');
const bgmFile = path.join(ROOT, 'public', 'assets', 'jonasblakewood-corporate-background-524146.mp3');
const args = [
  '-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%05d.png'),
  '-i', voFile,
  '-i', bgmFile,
  '-filter_complex', '[1:a]volume=1.0[vo];[2:a]volume=0.3[bg];[vo][bg]amix=inputs=2:duration=shortest[a]',
  '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT,
];
const r = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (r.error) {
  console.error('\nffmpeg not found. Install ffmpeg, then run:\n  ' + ffmpeg + ' ' + args.join(' '));
} else {
  console.log('\nDone → ' + OUT);
}
