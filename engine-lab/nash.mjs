// Stage-game equilibrium analysis on the REAL resolver.
//   For a corpus of mid-game states, build the simultaneous one-round zero-sum payoff matrix (row = my pure move, column = opponent's),
//   payoff = change in proof-score lead (+/-60 for a knock-out), and solve it by regret matching (Hart & Mas-Colell 2000),
//   which converges to a Nash equilibrium of a zero-sum game (von Neumann 1928; Robinson 1951 for fictitious play).
//   Reports: equilibrium mass per action type (is every action a best reply to something?), strictly dominated pure moves,
//   and the value of the game from each seat (seat symmetry).  Usage: node nash.mjs [variantId] [overridesJSON] [states]
import * as L from './lab.mjs';
const id = process.argv[2] || 'v2', ov = process.argv[3] ? JSON.parse(process.argv[3]) : undefined, NS = +process.argv[4] || 300;
export async function nash(E, NSTATES = 300, label = '') {
  const STANCES = ['PREDATOR', 'SENTINEL'];
  const strategies = (me, o) => { const L0 = E.legalActions(me, o), out = [];
    for (const a of L0) {
      if (a.action === 'TRACE' && a.intensity !== 2) continue; if (a.action === 'PRESS' && a.intensity === 1) continue; if (a.action === 'GUARD' && a.intensity === 1) continue;
      if (a.action === 'RECOVER' && a.intensity !== 2) continue; if (['COUNTER', 'MIRROR', 'SIGNATURE', 'ADAPT'].includes(a.action) && a.intensity !== 2) continue;
      if (a.action === 'ADAPT' && !STANCES.includes(a.adaptStance)) continue; out.push(a); } return out; };
  const corpus = []; const pols = ['presser', 'turtle', 'reader', 'inherited0', 'inherited3', 'bandit'];
  for (let k = 0; corpus.length < NSTATES; k++) {
    const r = L.rng(L.fnv('corp' + k)), pa = L.POLICIES[pols[k % 6]], pb = L.POLICIES[pols[(k * 5 + 1) % 6]];
    let st = { round: 1, a: L.mkPlayer(E, 'A', L.NAMES[k % 6]), b: L.mkPlayer(E, 'B', L.NAMES[(k * 5 + 2) % 6]) }, out = null, n = 0;
    const stop = 2 + Math.floor(r() * 16);
    while (!out && n < 24) { if (n >= stop && n % 3 === 0 && corpus.length < NSTATES) { corpus.push(st); if (n > stop + 6) break; }
      const aa = pa(E, st.a, st.b, { r, round: st.round, side: 'a' }), ab = pb(E, st.b, st.a, { r, round: st.round, side: 'b' });
      const res = E.resolveRound(st, aa, ab, 'corp' + k); n++; st = { round: res.outcome ? res.round : res.round + 1, a: res.a, b: res.b }; out = res.outcome; }
  }
  const types = ['TRACE', 'PRESS', 'GUARD', 'COUNTER', 'ADAPT', 'MIRROR', 'RECOVER', 'SIGNATURE'];
  const mass = Object.fromEntries(types.map(t => [t, 0])), present = Object.fromEntries(types.map(t => [t, 0])), dominated = Object.fromEntries(types.map(t => [t, 0]));
  let value = 0, vSeatGap = 0, nS = 0, supp = 0;
  for (const st of corpus) {
    const A = strategies(st.a, st.b), B = strategies(st.b, st.a); if (!A.length || !B.length) continue;
    const M = A.map(a => B.map(b => { const res = E.resolveRound(st, a, b, 'nash'); const d = E.proofScore(res.a.resources) - E.proofScore(res.b.resources) - (E.proofScore(st.a.resources) - E.proofScore(st.b.resources));
      return d + (res.b.resources.vitality <= 0 ? 60 : 0) - (res.a.resources.vitality <= 0 ? 60 : 0); }));
    // regret matching for both players on the zero-sum matrix M (row maximises)
    const n = A.length, m = B.length, rr = new Array(n).fill(0), cr = new Array(m).fill(0), ps = new Array(n).fill(0), qs = new Array(m).fill(0);
    const norm = (r) => { const p = r.map(x => Math.max(0, x)), s = p.reduce((a, b) => a + b, 0); return s > 0 ? p.map(x => x / s) : p.map(() => 1 / p.length); };
    for (let t = 0; t < 600; t++) {
      const p = norm(rr), q = norm(cr); for (let i = 0; i < n; i++) ps[i] += p[i]; for (let j = 0; j < m; j++) qs[j] += q[j];
      const ru = M.map(row => row.reduce((s, v, j) => s + v * q[j], 0)), cu = B.map((_, j) => -M.reduce((s, row, i) => s + row[j] * p[i], 0));
      const rv = ru.reduce((s, v, i) => s + v * p[i], 0), cv = cu.reduce((s, v, j) => s + v * q[j], 0);
      for (let i = 0; i < n; i++) rr[i] += ru[i] - rv; for (let j = 0; j < m; j++) cr[j] += cu[j] - cv; }
    const sp = ps.map(x => x / 600), sq = qs.map(x => x / 600), v = M.reduce((s, row, i) => s + sp[i] * row.reduce((t, x, j) => t + x * sq[j], 0), 0);
    A.forEach((a, i) => { mass[a.action] += sp[i]; }); new Set(A.map(a => a.action)).forEach(t => present[t]++);
    A.forEach((a, i) => { if (A.some((c, k) => k !== i && M[k].every((x, j) => x > M[i][j] + 1e-9))) dominated[a.action]++; });
    supp += sp.filter(x => x > 0.03).length; value += v; nS++; vSeatGap += 0; }
  const share = Object.fromEntries(types.map(t => [t, +(mass[t] / nS).toFixed(3)]));
  const ent = -Object.values(share).filter(x => x > 0).reduce((s, x) => s + x * Math.log2(x), 0);
  return { label, states: nS, share, entropy: +ent.toFixed(2), minShare: Math.min(...Object.values(share)), value: +(value / nS).toFixed(2), support: +(supp / nS).toFixed(1), presentPct: Object.fromEntries(types.map(t => [t, +(present[t] / nS).toFixed(2)])), dominatedStrategies: Object.fromEntries(types.map(t => [t, dominated[t]])) };
}
if (process.argv[1].endsWith('nash.mjs')) { const E = await L.load('nash' + Date.now(), id === 'v1' ? { '@file': 'rules.v1.yaml' } : ov); console.log(JSON.stringify(await nash(E, NS, id), null, 1)); }
