// Converts the supplied archetype artwork into optimised web assets (run once; outputs are committed).
// usage: node scripts/make-art.mjs <dir-with-ref1..ref7.png>
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const dir = process.argv[2], out = 'src/assets/art';
const SIG = { 2: [55, 895, 200, 260], 3: [55, 870, 200, 250], 4: [60, 900, 190, 240], 5: [50, 875, 200, 250], 6: [70, 950, 190, 200], 7: [60, 840, 210, 260] };
const ARCH = { 2: 'trace-hunter', 3: 'broker', 4: 'stillpoint', 5: 'archive', 6: 'swarm', 7: 'veil' };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const p = await b.newPage();
await p.goto('about:blank');
async function run(name, file, ops) {
  const data = fs.readFileSync(path.join(dir, file)).toString('base64');
  const res = await p.evaluate(async ({ data, ops }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
    const outs = [];
    for (const o of ops) {
      const [sx, sy, sw, sh] = o.crop || [0, 0, img.width, img.height];
      const k = o.w / sw, W = o.w, H = Math.round(sh * k);
      const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high'; g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      if (o.key) { // luminance key: black -> transparent, edge feather
        const d = g.getImageData(0, 0, W, H), a = d.data, lo = o.key[0], hi = o.key[1];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, m = Math.max(a[i], a[i + 1], a[i + 2]); let al = Math.min(1, Math.max(0, (m - lo) / (hi - lo)));
          if (o.feather) { const nx = (x / W - .5) * 2, ny = (y / H - .5) * 2, r = Math.sqrt(nx * nx * o.feather[0] + ny * ny * o.feather[1]); al *= Math.min(1, Math.max(0, (1 - r) / .16)); }
          a[i + 3] = Math.round(al * 255); }
        g.putImageData(d, 0, 0);
      }
      outs.push({ n: o.n, url: c.toDataURL('image/webp', o.q || .84) });
    }
    return outs;
  }, { data, ops });
  for (const r of res) { fs.writeFileSync(path.join(out, r.n), Buffer.from(r.url.split(',')[1], 'base64')); console.log(r.n, fs.statSync(path.join(out, r.n)).size); }
}
for (const [i, a] of Object.entries(ARCH)) {
  await run(a, `ref${i}.png`, [
    { n: `card-${a}.webp`, w: 1254, q: .9 },
    { n: `face-${a}.webp`, crop: [215, 15, 830, 1140], w: 830, q: .93 },
    { n: `sigil-${a}.webp`, crop: SIG[i], w: 200, key: [16, 80], q: .9 },
    { n: `thumb-${a}.webp`, w: 640, q: .88 }
  ]);
}
await run('sheet', 'ref1.png', [{ n: 'sheet.webp', w: 1536, q: .86 }]);
await run('hanko', 'ref2.png', [{ n: 'hanko.webp', crop: [1118, 1092, 76, 76], w: 76, key: [18, 90], q: .92 }]);
await b.close();
