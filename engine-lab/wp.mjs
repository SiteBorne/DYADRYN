// Win-probability estimator: seeded Monte-Carlo rollouts on the REAL resolver. Advisory / simulated; never part of proof.
import * as L from './lab.mjs';
export function winProb(E, st, K = 24, tag = 'wp') {
  let s = 0;
  for (let k = 0; k < K; k++) {
    const r = L.rng(L.fnv(`${tag}|${st.round}|${k}`)), sa = Math.floor(r() * 4), sb = Math.floor(r() * 4), seed = `${tag}-roll-${k}`;
    let cur = { round: st.round, a: st.a, b: st.b }, out = null, guard = 0;
    while (!out && guard++ < 40) {
      const pa = L.POLICIES['inherited' + sa](E, cur.a, cur.b, { r }), pb = L.POLICIES['inherited' + sb](E, cur.b, cur.a, { r });
      const res = E.resolveRound(cur, pa, pb, seed); out = res.outcome; cur = { round: res.outcome ? res.round : res.round + 1, a: res.a, b: res.b };
    }
    s += !out || out.winner === null ? .5 : out.winner === 'A' ? 1 : 0;
  }
  return s / K;
}
