// Marginal win-probability value of attribute points (bandit vs bandit, random 420-point profiles), single-thread, exportable.
import * as L from './lab.mjs';
const ST = ['ANALYSIS', 'EXECUTION', 'ADAPTATION', 'INFLUENCE', 'RESOLVE', 'CREATIVITY'];
const prof = (r) => { const s = Object.fromEntries(ST.map(n => [n, 70])); for (let i = 0; i < 40; i++) { const u = ST[Math.floor(r() * 6)], d = ST[Math.floor(r() * 6)]; if (u !== d && s[u] < 90 && s[d] > 50) { s[u]++; s[d]--; } } return s; };
export function statValues(E, NM = 240, tag = 'sv') {
  const pts = [];
  for (let i = 0; i < NM; i++) {
    const r = L.rng(L.fnv(tag + i)), sa = prof(r), sb = prof(r), sigs = Object.keys(E.SIGNATURES), ga = [sigs[i % 8], sigs[(i + 3) % 8]], gb = [sigs[(i + 1) % 8], sigs[(i + 5) % 8]];
    let st = { round: 1, a: E.createPlayer('A', sa, ga), b: E.createPlayer('B', sb, gb) }, o = null, n = 0;
    while (!o) { const aa = L.POLICIES.bandit(E, st.a, st.b, { r, round: st.round, side: 'a' }), ab = L.POLICIES.bandit(E, st.b, st.a, { r, round: st.round, side: 'b' }); const res = E.resolveRound(st, aa, ab, tag + i); n++; o = res.outcome; st = { round: res.round + 1, a: res.a, b: res.b }; }
    pts.push({ d: ST.slice(0, 5).map(s => sa[s] - sb[s]), y: o.winner === 'A' ? 1 : o.winner === null ? .5 : 0, n });
  }
  const k = 5, A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
  for (const p of pts) for (let i = 0; i < k; i++) { b[i] += p.d[i] * (p.y - .5); for (let j = 0; j < k; j++) A[i][j] += p.d[i] * p.d[j]; }
  for (let i = 0; i < k; i++) A[i][i] += 1e-6;
  for (let i = 0; i < k; i++) { const piv = A[i][i]; for (let j = i; j < k; j++) A[i][j] /= piv; b[i] /= piv; for (let r = 0; r < k; r++) if (r !== i) { const f = A[r][i]; for (let j = i; j < k; j++) A[r][j] -= f * A[i][j]; b[r] -= f * b[i]; } }
  const v = Object.fromEntries(ST.slice(0, 5).map((n, i) => [n, +(100 * b[i]).toFixed(2)])); v.CREATIVITY = 0;
  const vals = Object.values(v); return { values: v, spread: +(Math.max(...vals) - Math.min(...vals)).toFixed(2), meanLen: +(pts.reduce((a, p) => a + p.n, 0) / pts.length).toFixed(1) };
}
