// health metrics for one ruleset variant: population tournament + bandit diagnostics
import * as L from './lab.mjs';
export async function health(id, overrides, N = 10) {
  const E = await L.load(id, overrides);
  const pols = ['presser', 'turtle', 'reader', 'inherited0', 'inherited3', 'bandit'];
  const rows = [], win = {}, use = {};
  for (const pa of pols) for (const pb of pols) for (let k = 0; k < N; k++) {
    const aA = L.NAMES[(k + 1) % 6], aB = L.NAMES[(k * 5 + 2) % 6];
    const m = L.playMatch(E, 0, 0, aA, aB, `h-${pa}-${pb}-${k}`, L.POLICIES[pa], L.POLICIES[pb]); rows.push(m);
    const w = m.outcome.winner; (win[pa] ||= [0, 0]); (win[pb] ||= [0, 0]);
    win[pa][1]++; win[pb][1]++; if (w === 'A') win[pa][0]++; else if (w === 'B') win[pb][0]++; else { win[pa][0] += .5; win[pb][0] += .5; }
    for (const [s, p] of [['a', pa], ['b', pb]]) if (p === 'bandit') for (const x in m.acts[s]) use[x] = (use[x] || 0) + m.acts[s][x];
  }
  const wr = Object.fromEntries(Object.entries(win).map(([k, v]) => [k, v[0] / v[1]]));
  const simple = ['presser', 'turtle', 'reader', 'inherited0', 'inherited3'].map(k => wr[k]);
  const tot = Object.values(use).reduce((a, b) => a + b, 0), share = Object.fromEntries(L.NAMES && ['TRACE', 'PRESS', 'GUARD', 'COUNTER', 'ADAPT', 'MIRROR', 'RECOVER', 'SIGNATURE'].map(a => [a, +(((use[a] || 0) / tot)).toFixed(3)]));
  const ent = -Object.values(share).filter(v => v > 0).reduce((s, v) => s + v * Math.log2(v), 0);
  // archetype balance: bandit mirror, all 6x6 archetype pairs, both seats
  const aw = Object.fromEntries(L.NAMES.map(n => [n, [0, 0]]));
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (i !== j) for (let k = 0; k < 2; k++) {
    const m = L.playMatch(E, 0, 0, L.NAMES[i], L.NAMES[j], `ab-${i}-${j}-${k}`, L.POLICIES.bandit, L.POLICIES.bandit); const w = m.outcome.winner;
    aw[L.NAMES[i]][1]++; aw[L.NAMES[j]][1]++; if (w === 'A') aw[L.NAMES[i]][0]++; else if (w === 'B') aw[L.NAMES[j]][0]++; else { aw[L.NAMES[i]][0] += .5; aw[L.NAMES[j]][0] += .5; }
  }
  const arch = Object.fromEntries(Object.entries(aw).map(([k, v]) => [k, +(v[0] / v[1]).toFixed(2)]));
  const len = L.summarize(rows);
  return { id, overrides, len, wr: Object.fromEntries(Object.entries(wr).map(([k, v]) => [k, +v.toFixed(2)])), maxSimple: +Math.max(...simple).toFixed(2), spreadSimple: +(Math.max(...simple) - Math.min(...simple)).toFixed(2), banditEdge: +(wr.bandit).toFixed(2), share, entropy: +ent.toFixed(2), arch, archSpread: +(Math.max(...Object.values(arch)) - Math.min(...Object.values(arch))).toFixed(2) };
}
