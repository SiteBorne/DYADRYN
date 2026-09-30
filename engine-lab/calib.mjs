// Calibrates per-signature strength so every signature wins ~50% when carried (flat stats, random signature pairs, bandit vs bandit).
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync, writeFileSync } from 'node:fs'; import { parse, stringify } from '../worker/node_modules/yaml/dist/index.js';
import * as L from './lab.mjs';
const SIG = ['SECOND_ORDER_SIGHT', 'CONSTRAINT_COLLAPSE', 'COUNTERFACTUAL_SHIELD', 'STILLPOINT', 'BROKER_LOCK', 'ARCHIVE_ECHO', 'SWARM_REPAIR', 'VEIL_STEP'];
const flat = { ANALYSIS: 70, EXECUTION: 70, ADAPTATION: 70, INFLUENCE: 70, RESOLVE: 70, CREATIVITY: 70 };
if (isMainThread) {
  const f = '../worker/config/rules.v2.yaml', y = parse(readFileSync(f, 'utf8')), N = +process.argv[2] || 600, iters = +process.argv[3] || 6, W = 3;
  for (let it = 0; it < iters; it++) {
    const ov = Object.fromEntries(SIG.map(s => ['v2.signature.per.' + s, y.v2.signature.per[s]])), tally = Object.fromEntries(SIG.map(s => [s, [0, 0]]));
    await new Promise(r => { let d = 0; for (let w = 0; w < W; w++) { const wk = new Worker(new URL(import.meta.url), { workerData: { w, W, N, ov } }); wk.on('message', m => { for (const [s, a, b] of m) { tally[s][0] += a; tally[s][1] += b; } if (++d === W) r(); }); } });
    const wr = Object.fromEntries(SIG.map(s => [s, tally[s][0] / tally[s][1]]));
    console.log('iter', it, SIG.map(s => s.slice(0, 6) + ' ' + (100 * wr[s]).toFixed(0) + '%/' + y.v2.signature.per[s].toFixed(2)).join('  '));
    for (const s of SIG) y.v2.signature.per[s] = +Math.min(3, Math.max(0.3, y.v2.signature.per[s] * Math.exp(1.2 * (0.5 - wr[s])))).toFixed(3);
    writeFileSync(f, stringify(y, { lineWidth: 0 }));
  }
} else {
  const E = await L.load('cal' + workerData.w, workerData.ov), out = [];
  for (let i = workerData.w; i < workerData.N; i += workerData.W) {
    const r = L.rng(L.fnv('cal' + i)), pick2 = () => { const a = SIG[Math.floor(r() * 8)]; let b; do b = SIG[Math.floor(r() * 8)]; while (b === a); return [a, b]; };
    const ga = pick2(), gb = pick2(); let st = { round: 1, a: E.createPlayer('A', flat, ga), b: E.createPlayer('B', flat, gb) }, o = null;
    while (!o) { const aa = L.POLICIES.bandit(E, st.a, st.b, { r, round: st.round, side: 'a' }), ab = L.POLICIES.bandit(E, st.b, st.a, { r, round: st.round, side: 'b' }); const res = E.resolveRound(st, aa, ab, 'cal' + i); o = res.outcome; st = { round: res.round + 1, a: res.a, b: res.b }; }
    const wa = o.winner === 'A' ? 1 : o.winner === null ? .5 : 0; for (const s of ga) out.push([s, wa, 1]); for (const s of gb) out.push([s, 1 - wa, 1]);
  }
  parentPort.postMessage(out);
}
