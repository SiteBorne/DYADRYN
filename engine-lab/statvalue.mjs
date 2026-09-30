// Marginal value of each stat point: bandit-vs-bandit on random 420-point profiles, linear regression of win on stat differences.
import * as L from './lab.mjs'; import { Worker, isMainThread, parentPort, workerData, threadId } from 'node:worker_threads';
const ST = ['ANALYSIS', 'EXECUTION', 'ADAPTATION', 'INFLUENCE', 'RESOLVE', 'CREATIVITY'], NM = 900;
const prof = (r) => { const s = Object.fromEntries(ST.map(n => [n, 70])); for (let i = 0; i < 40; i++) { const u = ST[Math.floor(r() * 6)], d = ST[Math.floor(r() * 6)]; if (u !== d && s[u] < 90 && s[d] > 50) { s[u]++; s[d]--; } } return s; };
if (isMainThread) {
  const OV = process.argv[2] ? JSON.parse(process.argv[2]) : undefined, W = 3, pts = []; await new Promise(r => { let d = 0; for (let w = 0; w < W; w++) { const wk = new Worker(new URL(import.meta.url), { workerData: { w, W, OV } }); wk.on('message', m => pts.push(...m)); wk.on('exit', () => { if (++d === W) r(); }); } });
  // regress y on dX (5 free stats, RESOLVE-relative => drop CREATIVITY): normal equations
  const k = 5, A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
  for (const p of pts) for (let i = 0; i < k; i++) { b[i] += p.d[i] * (p.y - .5); for (let j = 0; j < k; j++) A[i][j] += p.d[i] * p.d[j]; }
  for (let i = 0; i < k; i++) A[i][i] += 1e-6; for (let i = 0; i < k; i++) { let piv = A[i][i]; for (let j = i; j < k; j++) A[i][j] /= piv; b[i] /= piv; for (let r = 0; r < k; r++) if (r !== i) { const f = A[r][i]; for (let j = i; j < k; j++) A[r][j] -= f * A[i][j]; b[r] -= f * b[i]; } }
  console.log('n', pts.length, 'win-probability change per +1 point moved INTO the stat from CREATIVITY (x100 = percentage points):'); ST.slice(0, 5).forEach((n, i) => console.log(' ', n.padEnd(11), (100 * b[i]).toFixed(2), 'pp')); console.log('  CREATIVITY  0.00 pp (reference)');
  console.log('mean length', (pts.reduce((a, p) => a + p.n, 0) / pts.length).toFixed(1));
} else {
  const E = await L.load(workerData.OV ? 'sv' + threadId + Date.now() : 'v1', workerData.OV), out = [];
  for (let i = workerData.w; i < NM; i += workerData.W) { const r = L.rng(L.fnv('sv' + i)), sa = prof(r), sb = prof(r); const mk = (id, s, g) => E.createPlayer(id, s, g); const sigs = Object.keys(E.SIGNATURES);
    const ga = [sigs[i % 8], sigs[(i + 3) % 8]], gb = [sigs[(i + 1) % 8], sigs[(i + 5) % 8]]; let st = { round: 1, a: mk('A', sa, ga), b: mk('B', sb, gb) }, o = null, n = 0; const c = { r };
    while (!o) { const aa = L.POLICIES.bandit(E, st.a, st.b, { r, round: st.round, side: 'a' }), ab = L.POLICIES.bandit(E, st.b, st.a, { r, round: st.round, side: 'b' }); const res = E.resolveRound(st, aa, ab, 'sv' + i); n++; o = res.outcome; st = { round: res.outcome ? res.round : res.round + 1, a: res.a, b: res.b }; }
    out.push({ d: ST.slice(0, 5).map(s => sa[s] - sb[s]), y: o.winner === 'A' ? 1 : o.winner === null ? .5 : 0, n }); }
  parentPort.postMessage(out);
}
