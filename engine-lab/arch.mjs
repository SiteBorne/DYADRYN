import * as L from './lab.mjs';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
const S = 12, OV = process.env.OV ? JSON.parse(process.env.OV) : undefined;
if (isMainThread) {
  const W = 3, rows = []; await new Promise(r => { let d = 0; for (let w = 0; w < W; w++) { const wk = new Worker(new URL(import.meta.url), { workerData: { w, W } }); wk.on('message', m => rows.push(...m)); wk.on('exit', () => { if (++d === W) r(); }); } });
  const tab = {}, sig = {}; for (const r of rows) { for (const [n, win] of [[r.a, r.w === 'A' ? 1 : r.w === null ? .5 : 0], [r.b, r.w === 'B' ? 1 : r.w === null ? .5 : 0]]) { (tab[n] ||= []).push(win); } for (const [s, win] of [[r.sa, r.w === 'A' ? 1 : r.w === null ? .5 : 0], [r.sb, r.w === 'B' ? 1 : r.w === null ? .5 : 0]]) for (const g of s) (sig[g] ||= []).push(win); }
  const f = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length, se = Math.sqrt(m * (1 - m) / a.length); return `${(100 * m).toFixed(1)}% ±${(196 * se).toFixed(1)} (n=${a.length})`; };
  console.log('ARCHETYPE (bandit vs bandit, all ordered pairs, both seats)'); for (const k of L.NAMES) console.log(' ', k.padEnd(13), f(tab[k]));
  console.log('SIGNATURE carried'); for (const k of Object.keys(sig).sort()) console.log(' ', k.padEnd(22), f(sig[k]));
  const len = rows.map(r => r.n); console.log('mean length', (len.reduce((a, b) => a + b) / len.length).toFixed(2), 'limit rate', (rows.filter(r => r.reason === 'round_limit').length / rows.length).toFixed(2));
} else {
  const E = await L.load(OV ? 'ar' + workerData.w + Date.now() : 'v2', OV), out = []; let idx = 0;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (i !== j) for (let k = 0; k < S; k++) { if ((idx++) % workerData.W !== workerData.w) continue; const m = L.playMatch(E, 0, 0, L.NAMES[i], L.NAMES[j], `pa-${i}-${j}-${k}`, L.POLICIES.bandit, L.POLICIES.bandit); out.push({ a: L.NAMES[i], b: L.NAMES[j], w: m.outcome.winner, n: m.rounds, reason: m.outcome.reason, sa: L.ARCH[L.NAMES[i]].sig, sb: L.ARCH[L.NAMES[j]].sig }); }
  parentPort.postMessage(out);
}
