// usage: node scripts/shot.mjs <url-or-file> <out.png> [width] [height] [fullpage=1] [clipY,clipH]
import { chromium } from 'playwright-core';
const [,, url, out, w = '1440', h = '900', full = '0', clip] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(async () => chromium.launch({ args: ['--no-sandbox'] }));
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(900);
if (full === '1' || clip) { const H = await p.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y < H; y += 500) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(90); } await p.evaluate(() => { document.querySelectorAll('.rv').forEach(e => e.classList.add('in')); window.scrollTo(0, 0); }); await p.waitForTimeout(1000); }
const opt = { path: out, fullPage: full === '1' };
if (clip) { const [y, hh] = clip.split(',').map(Number); opt.fullPage = true; opt.clip = { x: 0, y, width: +w, height: hh }; }
await p.screenshot(opt);
console.log(errs.length ? errs.join('\n') : 'no console errors');
await b.close();
