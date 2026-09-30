// Converts each archetype mask painting into a layered cel-shaded VECTOR model:
// colour-quantise (k-means) -> clean regions -> trace region boundaries -> smooth/simplify -> JSON path layers.
// usage: node scripts/trace-masks.mjs   (reads src/assets/art/face-*.webp, writes src/assets/art/mask-*.json)
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const dir = 'src/assets/art', ARCH = ['trace-hunter', 'broker', 'stillpoint', 'archive', 'swarm', 'veil'];
const K = { 'trace-hunter': 13, broker: 14, stillpoint: 13, archive: 14, swarm: 13, veil: 13 };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.goto('about:blank');
for (const a of ARCH) {
  const data = fs.readFileSync(path.join(dir, `face-${a}.webp`)).toString('base64');
  const out = await p.evaluate(async ({ data, K }) => {
    const im = new Image(); im.src = 'data:image/webp;base64,' + data; await im.decode();
    const W = 330, H = Math.round(W * im.height / im.width), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, W, H);
    const src = x.getImageData(0, 0, W, H).data, N = W * H, fg = new Uint8Array(N), rgb = new Float32Array(N * 3), cl = (v, a, b) => v < a ? a : v > b ? b : v;
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const i = y * W + xx, q = i * 4, mx = Math.max(src[q], src[q + 1], src[q + 2]), nx = (xx / W - .5) / .5, ny = (y / H - .5) / .5, rr = Math.sqrt(nx * nx + ny * ny * .92), al = cl((mx - 12) / 40, 0, 1) * cl((1 - rr) / .14, 0, 1) * cl((.84 - y / H) / .08, 0, 1); fg[i] = al > .5 ? 1 : 0; rgb[i * 3] = src[q]; rgb[i * 3 + 1] = src[q + 1]; rgb[i * 3 + 2] = src[q + 2]; }
    // close small holes in the silhouette (dark interiors of the mask count as foreground)
    const fill = new Uint8Array(N); { const st = [], seen = new Uint8Array(N); for (let i = 0; i < W; i++) { st.push(i, (H - 1) * W + i); } for (let j = 0; j < H; j++) { st.push(j * W, j * W + W - 1); } while (st.length) { const i = st.pop(); if (seen[i] || fg[i]) continue; seen[i] = 1; const xx = i % W, y = (i / W) | 0; if (xx > 0) st.push(i - 1); if (xx < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); } for (let i = 0; i < N; i++) fill[i] = seen[i] ? 0 : 1; }
    // k-means in a perceptual-ish space (value weighted), kmeans++ init
    const samp = []; for (let i = 0; i < N; i += 2) if (fill[i]) samp.push(i); let rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
    const cen = []; cen.push(samp[Math.floor(rnd() * samp.length)]); const cs = [[rgb[cen[0] * 3], rgb[cen[0] * 3 + 1], rgb[cen[0] * 3 + 2]]];
    while (cs.length < K) { let best = -1, bd = -1; for (let t = 0; t < 900; t++) { const i = samp[Math.floor(rnd() * samp.length)]; let d = 1e9; for (const c0 of cs) { const dr = rgb[i * 3] - c0[0], dg = rgb[i * 3 + 1] - c0[1], db = rgb[i * 3 + 2] - c0[2]; d = Math.min(d, dr * dr + dg * dg + db * db); } if (d > bd) { bd = d; best = i; } } cs.push([rgb[best * 3], rgb[best * 3 + 1], rgb[best * 3 + 2]]); }
    const lab = new Int16Array(N).fill(-1);
    for (let it = 0; it < 14; it++) { const sum = cs.map(() => [0, 0, 0, 0]); for (let i = 0; i < N; i++) { if (!fill[i]) continue; let bi = 0, bd = 1e12; for (let k = 0; k < cs.length; k++) { const dr = rgb[i * 3] - cs[k][0], dg = rgb[i * 3 + 1] - cs[k][1], db = rgb[i * 3 + 2] - cs[k][2], d = dr * dr * .9 + dg * dg * 1.1 + db * db * .8; if (d < bd) { bd = d; bi = k; } } lab[i] = bi; const s = sum[bi]; s[0] += rgb[i * 3]; s[1] += rgb[i * 3 + 1]; s[2] += rgb[i * 3 + 2]; s[3]++; } cs.forEach((c0, k) => { const s = sum[k]; if (s[3]) { c0[0] = s[0] / s[3]; c0[1] = s[1] / s[3]; c0[2] = s[2] / s[3]; } }); }
    // mode filter x2 (removes speckle), then absorb tiny islands
    const mode = () => { const o = lab.slice(); for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) { const i = y * W + xx; if (lab[i] < 0) continue; const cnt = {}; let bk = lab[i], bc = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const l = lab[i + dy * W + dx]; if (l < 0) continue; cnt[l] = (cnt[l] || 0) + 1; if (cnt[l] > bc) { bc = cnt[l]; bk = l; } } if (bc >= 5) o[i] = bk; } lab.set(o); }; mode(); mode(); mode();
    { const seen = new Uint8Array(N); for (let i0 = 0; i0 < N; i0++) { if (seen[i0] || lab[i0] < 0) continue; const L = lab[i0], st = [i0], comp = []; seen[i0] = 1; while (st.length) { const i = st.pop(); comp.push(i); const xx = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = xx + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && lab[j] === L) { seen[j] = 1; st.push(j); } } } if (comp.length < 46) { const cnt = {}; for (const i of comp) { const xx = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = xx + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const l = lab[ny * W + nx]; if (l >= 0 && l !== L) cnt[l] = (cnt[l] || 0) + 1; } } let bk = -1, bc = 0; for (const k in cnt) if (cnt[k] > bc) { bc = cnt[k]; bk = +k; } if (bk >= 0) for (const i of comp) lab[i] = bk; } } }
    // boundary tracing per label
    const res = [], hexc = (c0) => '#' + c0.map(v => Math.round(cl(v, 0, 255)).toString(16).padStart(2, '0')).join('');
    const dp = (pts, eps) => { if (pts.length < 4) return pts; const n = pts.length, keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [[0, n - 1]]; while (st.length) { const [a, b2] = st.pop(); let md = 0, mi = -1; const [ax, ay] = pts[a], [bx, by] = pts[b2], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1; for (let i = a + 1; i < b2; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / l; if (d > md) { md = d; mi = i; } } if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b2]); } } return pts.filter((_, i) => keep[i]); };
    const chaikin = (pts) => { const o = [], n = pts.length; for (let i = 0; i < n; i++) { const a = pts[i], b2 = pts[(i + 1) % n]; o.push([a[0] * .75 + b2[0] * .25, a[1] * .75 + b2[1] * .25], [a[0] * .25 + b2[0] * .75, a[1] * .25 + b2[1] * .75]); } return o; };
    const used = new Set(); for (let i = 0; i < N; i++) if (lab[i] >= 0) used.add(lab[i]);
    for (const L of used) {
      const edges = new Map(); // start "x,y" -> list of [ex,ey]
      const add = (x0, y0, x1, y1) => { const k = x0 + ',' + y0; (edges.get(k) || edges.set(k, []).get(k)).push([x1, y1]); };
      for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { if (lab[y * W + xx] !== L) continue; if (y === 0 || lab[(y - 1) * W + xx] !== L) add(xx, y, xx + 1, y); if (xx === W - 1 || lab[y * W + xx + 1] !== L) add(xx + 1, y, xx + 1, y + 1); if (y === H - 1 || lab[(y + 1) * W + xx] !== L) add(xx + 1, y + 1, xx, y + 1); if (xx === 0 || lab[y * W + xx - 1] !== L) add(xx, y + 1, xx, y); }
      let d = '', area = 0, cyw = 0, parts = [];
      for (const [k0, list0] of edges) { while (list0.length) { let [sx, sy] = k0.split(',').map(Number), ex = list0.pop(), loop = [[sx, sy]], cx = ex[0], cy = ex[1]; loop.push([cx, cy]); let guard = 0; while (!(cx === sx && cy === sy) && guard++ < 200000) { const nxt = edges.get(cx + ',' + cy); if (!nxt || !nxt.length) break; let pick = nxt.length - 1; if (nxt.length > 1) { const dx0 = cx - loop[loop.length - 2][0], dy0 = cy - loop[loop.length - 2][1]; for (let q = 0; q < nxt.length; q++) { const ddx = nxt[q][0] - cx, ddy = nxt[q][1] - cy; if (dx0 * ddy - dy0 * ddx < 0) { pick = q; break; } } } const e2 = nxt.splice(pick, 1)[0]; cx = e2[0]; cy = e2[1]; loop.push([cx, cy]); } if (loop.length < 6) continue; loop.pop(); let pts = dp(loop, .55); if (pts.length < 3) continue; pts = chaikin(chaikin(pts)); pts = dp(pts, .32); let A2 = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b2 = pts[(i + 1) % pts.length]; A2 += a[0] * b2[1] - b2[0] * a[1]; } const ar = Math.abs(A2) / 2; if (ar < 14) continue; area += ar; const cyy = pts.reduce((s, q) => s + q[1], 0) / pts.length; cyw += cyy * ar; parts.push([ar, pts]); } }
      if (!parts.length) continue; let dd = ''; let cy0 = cyw / area; for (const [ar, pts] of parts) { dd += 'M' + pts.map(q => (Math.round(q[0] * 2) / 2) + ' ' + (Math.round(q[1] * 2) / 2)).join('L') + 'Z'; }
      const c0 = cs[L], mx = Math.max(...c0), mn = Math.min(...c0), sat = mx ? (mx - mn) / mx : 0, lum = (c0[0] * .3 + c0[1] * .59 + c0[2] * .11) / 255; res.push({ c: hexc(c0), d: dd, a: Math.round(area), y: +(cy0 / H).toFixed(3), l: +lum.toFixed(3), s: +sat.toFixed(3) });
    }
    res.sort((p1, p2) => p1.l - p2.l);
    return { w: W, h: H, layers: res };
  }, { data, K: K[a] });
  fs.writeFileSync(path.join(dir, `mask-${a}.json`), JSON.stringify(out));
  console.log(a, out.layers.length, 'layers', (fs.statSync(path.join(dir, `mask-${a}.json`)).size / 1024).toFixed(0) + 'KB');
}
await b.close();
