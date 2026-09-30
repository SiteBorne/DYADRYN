// Renders social/app icons (PNG) from the vector sources. Run: node scripts/gen-og.mjs
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'src/assets/brand'), gen = path.join(root, 'src/partials/_gen');
const hero = fs.readFileSync(path.join(gen, 'hero-art.html'), 'utf8').replace('class="hero-art"', 'class="hero-art" style="position:absolute;inset:0;width:100%;height:100%"');
const wm = fs.readFileSync(path.join(gen, 'wordmark.html'), 'utf8').replaceAll('{{uid}}', 'og');
const f = (w, file) => `@font-face{font-family:"IBM Plex Mono";font-weight:400;src:url(file://${root}/src/assets/fonts/ibm-plex-mono-latin-400-normal.woff2)}`;
const html = `<html><body style="margin:0;width:1200px;height:630px;position:relative;overflow:hidden;background:#0C0E0F"><style>${f()}.tw-l,.tw-s,.tw-t,.tw-ring,.trace-window{display:none}.wordmark{width:640px;height:auto;color:#D8D0BE}
.c{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:22px;background:radial-gradient(ellipse 60% 55% at 50% 50%,rgba(12,14,15,.72),rgba(12,14,15,.15) 75%)}
p{margin:0;font:400 22px "IBM Plex Mono",monospace;letter-spacing:.32em;text-transform:uppercase;color:#E7DECA}p.k{font-size:17px;color:#E0955A}</style>${hero}<div class="c">${wm}<p>Built from memory. Proven in battle.</p><p class="k">AI Persona Arena</p></div></body></html>`;
fs.writeFileSync('/tmp/og.html', html);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
let p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto('file:///tmp/og.html'); await p.waitForTimeout(800); await p.screenshot({ path: path.join(out, 'og-image.png') });
const fav = fs.readFileSync(path.join(out, 'favicon.svg'), 'utf8');
for (const [n, s] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
  p = await b.newPage({ viewport: { width: s, height: s } }); await p.setContent(`<body style="margin:0"><div style="width:${s}px;height:${s}px">${fav.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`); await p.screenshot({ path: path.join(out, n + '.png') });
}
await b.close(); console.log('icons written');
