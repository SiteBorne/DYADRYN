import * as L from './lab.mjs'; import { winProb } from './wp.mjs';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
const NM = 360;
if (isMainThread) {
  const W = 3, pts = []; const t0 = Date.now(); await new Promise(r => { let d = 0; for (let w = 0; w < W; w++) { const wk = new Worker(new URL(import.meta.url), { workerData: { w, W } }); wk.on('message', m => pts.push(...m)); wk.on('exit', () => { if (++d === W) r(); }); } });
  const brier = (f) => pts.reduce((s, p) => s + (f(p) - p.y) ** 2, 0) / pts.length;
  const sgn = (p) => 1 / (1 + Math.exp(-(p.d) / 12)); // baseline: logistic on proof-score lead
  console.log('points', pts.length, 'sec', (Date.now() - t0) / 1000);
  console.log('Brier: coin-flip', brier(() => .5).toFixed(4), '| proof-score lead (logistic /12)', brier(sgn).toFixed(4), '| rollout estimator', brier(p => p.p).toFixed(4));
  for (const R of [[1, 4], [5, 8], [9, 14], [15, 24]]) { const q = pts.filter(p => p.round >= R[0] && p.round <= R[1]); console.log(`rounds ${R[0]}-${R[1]} n=${q.length}`, 'coin', (q.reduce((s, p) => s + (.5 - p.y) ** 2, 0) / q.length).toFixed(3), 'lead', (q.reduce((s, p) => s + (sgn(p) - p.y) ** 2, 0) / q.length).toFixed(3), 'rollout', (q.reduce((s, p) => s + (p.p - p.y) ** 2, 0) / q.length).toFixed(3)); }
  console.log('reliability (predicted bin -> observed win rate):'); for (let b = 0; b < 10; b++) { const q = pts.filter(p => p.p >= b / 10 && (p.p < (b + 1) / 10 || b === 9)); if (q.length > 8) console.log(`  ${b * 10}-${b * 10 + 10}%  n=${String(q.length).padStart(4)}  observed ${(100 * q.reduce((s, p) => s + p.y, 0) / q.length).toFixed(0)}%`); }
} else {
  const E = await L.load('v1'), out = [];
  for (let i = workerData.w; i < NM; i += workerData.W) {
    const seed = `cal-${i}`, r = L.rng(L.fnv(seed + '|pol')), aA = L.NAMES[i % 6], aB = L.NAMES[(i * 5 + 1) % 6], sa = i % 4, sb = (i >> 2) % 4;
    let st = { round: 1, a: L.mkPlayer(E, 'A', aA), b: L.mkPlayer(E, 'B', aB) }, out2 = null; const cps = [];
    while (!out2) {
      if ([2, 4, 6, 8, 11, 14, 18].includes(st.round)) cps.push({ round: st.round, st, d: E.proofScore(st.a.resources) - E.proofScore(st.b.resources) });
      const pa = L.POLICIES['inherited' + sa](E, st.a, st.b, { r }), pb = L.POLICIES['inherited' + sb](E, st.b, st.a, { r });
      const res = E.resolveRound(st, pa, pb, seed); out2 = res.outcome; st = { round: res.outcome ? res.round : res.round + 1, a: res.a, b: res.b };
    }
    const y = out2.winner === 'A' ? 1 : out2.winner === null ? .5 : 0;
    for (const c of cps) out.push({ round: c.round, d: c.d, p: winProb(E, c.st, 24, `cal${i}`), y });
  }
  parentPort.postMessage(out);
}
