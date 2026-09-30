// Prisoner's-dilemma structure of the Accord rule, measured on the real resolver.
// Cooperate = hold back (Guard), Defect = Press. Payoffs = change in OWN absolute proof score (non-zero-sum part), over one round and over
// the three-round shadow (betrayal -> reprisal). Then a mini Axelrod tournament: ALLC, ALLD, TFT (strike only after being struck), RAND.
import * as L from './lab.mjs';
const id = process.argv[2] || 'v2', E = await L.load('pd' + Date.now(), process.argv[3] ? JSON.parse(process.argv[3]) : {});
const pick = (Lg, a, i = 2) => Lg.find(x => x.action === a && x.intensity === i) || Lg.find(x => x.action === a);
const sc = (p) => E.proofScore(p.resources);
function seedState(arch) { let st = { round: 1, a: L.mkPlayer(E, 'A', arch[0]), b: L.mkPlayer(E, 'B', arch[1]) };
  for (let i = 0; i < 2; i++) { const a = pick(E.legalActions(st.a, st.b), 'TRACE'), b = pick(E.legalActions(st.b, st.a), 'TRACE'); const r = E.resolveRound(st, a, b, 'pd'); st = { round: r.round + 1, a: r.a, b: r.b }; } return st; }
const cell = (st, ma, mb) => { const a = pick(E.legalActions(st.a, st.b), ma), b = pick(E.legalActions(st.b, st.a), mb); const r = E.resolveRound(st, a, b, 'pd'); return { r, da: sc(r.a) - sc(st.a), db: sc(r.b) - sc(st.b) }; };
const out = { stage: {}, shadow: {} }; let n = 0; const acc = { T: 0, R: 0, P: 0, S: 0, T3: 0, S3: 0 };
for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { if (i === j) continue; const st = seedState([L.NAMES[i], L.NAMES[j]]);
  const R = cell(st, 'TRACE', 'TRACE'), T = cell(st, 'PRESS', 'TRACE'), S = cell(st, 'TRACE', 'PRESS'), P = cell(st, 'PRESS', 'PRESS');
  acc.R += R.da; acc.T += T.da; acc.S += S.da; acc.P += P.da;
  // three-round shadow: betrayer keeps pressing (defect), betrayed answers with Press (reprisal window); vs both keep holding
  const roll = (ma1, mb1, ma, mb) => { let s = st, ta = 0; for (let k = 0; k < 3; k++) { const a = pick(E.legalActions(s.a, s.b), k ? ma : ma1), b = pick(E.legalActions(s.b, s.a), k ? mb : mb1); const r = E.resolveRound(s, a, b, 'pd' + k); ta += sc(r.a) - sc(s.a); s = { round: r.round + 1, a: r.a, b: r.b }; if (r.outcome) break; } return ta; };
  acc.T3 += roll('PRESS', 'TRACE', 'TRACE', 'PRESS'); acc.S3 += roll('TRACE', 'PRESS', 'PRESS', 'TRACE'); n++; }
const m = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, +(v / n).toFixed(2)]));
console.log('stage game (own proof-score change after an established Accord):', JSON.stringify(m));
console.log('T>R>P>S:', m.T > m.R && m.R > m.P && m.P > m.S, ' 2R>T+S:', 2 * m.R > m.T + m.S, ' three-round: betrayer', m.T3, 'vs betrayed', m.S3);
const POL = { ALLD: (E, me, o) => pick(E.legalActions(me, o), 'PRESS') || pick(E.legalActions(me, o), 'RECOVER'), ALLC: (E, me, o) => pick(E.legalActions(me, o), me.resources.energy < 20 ? 'RECOVER' : 'TRACE') || E.legalActions(me, o)[0],
  TFT: (E, me, o) => { const struck = o.previousAction && o.previousAction.action === 'PRESS'; return (struck ? pick(E.legalActions(me, o), 'PRESS') : pick(E.legalActions(me, o), me.resources.energy < 20 ? 'RECOVER' : 'TRACE')) || E.legalActions(me, o)[0]; }, RAND: L.POLICIES.random };
const res = {}; for (const a in POL) for (const b in POL) { if (a >= b && a !== b) continue; let w = 0, t = 0, len = 0, lim = 0; for (let k = 0; k < 24; k++) for (const sw of [0, 1]) { const A = L.NAMES[(k + 1) % 6], B = L.NAMES[(k * 5 + 2) % 6]; const mm = sw ? L.playMatch(E, 0, 0, B, A, 'pt' + k, POL[b], POL[a]) : L.playMatch(E, 0, 0, A, B, 'pt' + k, POL[a], POL[b]); const wn = mm.outcome.winner; const aWon = wn === null ? .5 : ((wn === 'A') === !sw ? 1 : 0); w += aWon; t++; len += mm.rounds; if (mm.outcome.reason === 'round_limit') lim++; } res[a + ' vs ' + b] = { 'first wins': +(w / t).toFixed(2), len: +(len / t).toFixed(1), limit: +(lim / t).toFixed(2) }; }
console.log(JSON.stringify(res, null, 0));
