// Crops element artwork (tiles, hero banner, strips) out of the supplied mockup into optimised web assets.
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const src = process.argv[2], out = 'src/assets/art';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.goto('about:blank');
const data = fs.readFileSync(src).toString('base64');
const C = JSON.parse(process.argv[3]);
const res = await p.evaluate(async ({ data, C }) => {
  const im = new Image(); im.src = 'data:image/webp;base64,' + data; await im.decode(); const o = { size: [im.width, im.height], files: [] };
  for (const [n, x, y, w, h, tw] of C) { const c = document.createElement('canvas'); c.width = tw; c.height = Math.round(tw * h / w); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, x, y, w, h, 0, 0, c.width, c.height); o.files.push([n, c.toDataURL('image/webp', .9)]); }
  return o; }, { data, C });
console.log(res.size); for (const [n, u] of res.files) fs.writeFileSync(`${out}/${n}.webp`, Buffer.from(u.split(',')[1], 'base64'));
await b.close();
