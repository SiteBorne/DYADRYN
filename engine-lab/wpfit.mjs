import * as L from './lab.mjs';
const E = await L.load('v1'), pts = [];
for (let i = 0; i < 3000; i++) {
  const seed = `fit-${i}`, r = L.rng(L.fnv(seed + '|pol')), sa = i % 4, sb = (i >> 2) % 4; let st = { round: 1, a: L.mkPlayer(E, 'A', L.NAMES[i % 6]), b: L.mkPlayer(E, 'B', L.NAMES[(i * 5 + 1) % 6]) }, out = null; const cps = [];
  while (!out) { const ra = st.a.resources, rb = st.b.resources; cps.push({ round: st.round, dv: ra.vitality - rb.vitality, ds: E.proofScore(ra) - E.proofScore(rb), dh: ra.heat - rb.heat }); const pa = L.POLICIES['inherited' + sa](E, st.a, st.b, { r }), pb = L.POLICIES['inherited' + sb](E, st.b, st.a, { r }); const res = E.resolveRound(st, pa, pb, seed); out = res.outcome; st = { round: res.outcome ? res.round : res.round + 1, a: res.a, b: res.b }; }
  const y = out.winner === 'A' ? 1 : out.winner === null ? .5 : 0; for (const c of cps) pts.push({ ...c, y, m: i });
}
const sig = (x) => 1 / (1 + Math.exp(-x)); const h = (m) => ((m * 2654435761) >>> 7) % 2, tr = pts.filter(p => h(p.m) === 0), te = pts.filter(p => h(p.m) === 1);
const brier = (s, f) => s.reduce((a, p) => a + (f(p) - p.y) ** 2, 0) / s.length;
const B = [[1, 3], [4, 6], [7, 10], [11, 15], [16, 24]], fit = {};
for (const [lo, hi] of B) { let best = 1e9, bk = 1; for (let k = 0.01; k < 0.6; k += .005) { const s = tr.filter(p => p.round >= lo && p.round <= hi), b = brier(s, p => sig(k * p.ds)); if (b < best) { best = b; bk = k; } } fit[lo] = +bk.toFixed(3); }
const kf = (r) => fit[B.find(([a, b]) => r >= a && r <= b)[0]];
console.log('fitted slope k per round bucket', JSON.stringify(fit));
console.log('held-out Brier (n=' + te.length + ')'); console.log(' coin flip', brier(te, () => .5).toFixed(4)); console.log(' fixed logistic d/12', brier(te, p => sig(p.ds / 12)).toFixed(4)); console.log(' round-aware logistic', brier(te, p => sig(kf(p.round) * p.ds)).toFixed(4)); console.log(' vitality-only', brier(te, p => sig(.08 * p.dv)).toFixed(4));
for (const [lo, hi] of B) { const s = te.filter(p => p.round >= lo && p.round <= hi); console.log(`  rounds ${lo}-${hi}`, 'fixed', brier(s, p => sig(p.ds / 12)).toFixed(3), 'aware', brier(s, p => sig(kf(p.round) * p.ds)).toFixed(3)); }
// add features: vitality lead and round; 2-feature logistic by coordinate grid, then calibrate with isotonic-ish bins
const fit2 = {}; for (const [lo, hi] of B) { let best = 1e9, bk = [.1, 0]; const sT = tr.filter(p => p.round >= lo && p.round <= hi); for (let k = 0.02; k < 0.4; k += .01) for (let kv = -0.05; kv < 0.15; kv += .01) { const b = brier(sT, p => sig(k * p.ds + kv * p.dv)); if (b < best) { best = b; bk = [k, kv]; } } fit2[lo] = bk.map(x => +x.toFixed(3)); }
const f2 = (p) => { const [k, kv] = fit2[B.find(([a, b]) => p.round >= a && p.round <= b)[0]]; return sig(k * p.ds + kv * p.dv); };
console.log(' score+vitality logistic', brier(te, f2).toFixed(4), JSON.stringify(fit2));
// bin calibration learned on train
const bins = Array.from({ length: 20 }, () => [0, 0]); for (const p of tr) { const i = Math.min(19, Math.floor(f2(p) * 20)); bins[i][0] += p.y; bins[i][1]++; }
const cal = (p) => { const i = Math.min(19, Math.floor(f2(p) * 20)); return bins[i][1] > 30 ? bins[i][0] / bins[i][1] : f2(p); };
console.log(' + bin calibration', brier(te, cal).toFixed(4));
console.log('reliability of calibrated:'); for (let b = 0; b < 10; b++) { const q = te.filter(p => { const v = cal(p); return v >= b / 10 && (v < (b + 1) / 10 || b === 9); }); if (q.length > 20) console.log(`  ${b * 10}-${b * 10 + 10}% n=${q.length} observed ${(100 * q.reduce((s, p) => s + p.y, 0) / q.length).toFixed(0)}%`); }
console.log('BINS', JSON.stringify(bins.map(b => b[1] > 30 ? +(b[0] / b[1]).toFixed(3) : null)));
console.log('reliability of round-aware:'); for (let b = 0; b < 10; b++) { const q = te.filter(p => { const v = sig(kf(p.round) * p.ds); return v >= b / 10 && (v < (b + 1) / 10 || b === 9); }); if (q.length > 20) console.log(`  ${b * 10}-${b * 10 + 10}% n=${q.length} observed ${(100 * q.reduce((s, p) => s + p.y, 0) / q.length).toFixed(0)}%`); }
