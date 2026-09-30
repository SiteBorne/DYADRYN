import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../dist/index.js';
const S = (o = {}) => ({ ANALYSIS: 70, EXECUTION: 70, ADAPTATION: 70, INFLUENCE: 70, RESOLVE: 70, CREATIVITY: 70, ...o });
const P = (id, stats = S(), sigs = ['STILLPOINT', 'SECOND_ORDER_SIGHT']) => E.createPlayer(id, stats, sigs);
const st = (a = P('A'), b = P('B')) => ({ round: 1, a, b });
const mv = (action, extra = {}) => ({ action, intensity: 2, ...extra });
const step = (s, a, b, seed = 'v2test') => { const r = E.resolveRound(s, a, b, seed); return { r, s: { round: r.outcome ? r.round : r.round + 1, a: r.a, b: r.b } }; };
const score = (p) => E.proofScore(p.resources);

test('production ruleset is v2 and carries the v2 section', () => {
  assert.equal(E.RULES.ruleset_id, 'dyadryn.core.v2');
  assert.ok(E.V2 && E.V2.accord && E.V2.stale && E.V2.novelty && E.V2.fatigue);
});
test('both Open for consecutive rounds builds a mirrored Accord streak with dividends', () => {
  let s = st(); const a0 = s.a.resources.focus;
  let x = step(s, mv('TRACE'), mv('TRACE')); assert.equal(x.s.a.accord, 1); assert.equal(x.s.b.accord, 1); assert.ok(x.r.notes.includes('accord:1'));
  x = step(x.s, mv('TRACE'), mv('RECOVER')); assert.equal(x.s.a.accord, 2);
  assert.ok(x.s.a.resources.focus > a0);
});
test('Guard is the opt-out: it neither builds nor breaks an Accord', () => {
  let x = step(st(), mv('TRACE'), mv('TRACE')); x = step(x.s, mv('GUARD'), mv('TRACE')); assert.equal(x.s.a.accord, 1); assert.ok(!x.r.notes.some((n) => n.startsWith('betrayal')));
});
test('betrayal inside an Accord pays the striker once, resets the streak and arms Reprisal for the victim', () => {
  let x = step(st(), mv('TRACE'), mv('TRACE')); const r = step(x.s, mv('PRESS'), mv('TRACE'));
  assert.ok(r.r.notes.includes('betrayal:a')); assert.equal(r.s.a.accord, 0); assert.equal(r.s.b.reprisal, E.V2.accord.reprisal_rounds); assert.equal(r.s.a.reprisal ?? 0, 0);
  const cold = step(step(st(), mv('GUARD'), mv('GUARD')).s, mv('PRESS'), mv('TRACE'));
  assert.ok(!cold.r.notes.includes('betrayal:a'), 'no Accord, no betrayal bonus');
  assert.ok(r.r.deltas.b.vitality < cold.r.deltas.b.vitality, 'the trusting victim takes more damage');
});
test('Reprisal boosts the betrayed agent outgoing damage, more so with higher INFLUENCE', () => {
  const gain = (inf) => {
    const B = P('B', S({ INFLUENCE: inf, RESOLVE: 140 - inf })); let x = step(st(P('A'), B), mv('TRACE'), mv('TRACE')); x = step(x.s, mv('PRESS'), mv('TRACE'));
    const armed = x.s, plain = { ...armed, b: { ...armed.b, reprisal: 0 } };
    const dmg = (z) => { const r = E.resolveRound(z, mv('TRACE'), mv('PRESS'), 'rp'); return -r.deltas.a.vitality; };
    return dmg(armed) / dmg(plain);
  };
  const lo = gain(50), hi = gain(90);
  assert.ok(lo >= 1 && hi > lo, `reprisal ratios ${lo} ${hi}`); assert.ok(hi > 1.05);
});
test('the stage game is a prisoner\'s dilemma: T > R > P > S and 2R > T + S after an established Accord', () => {
  const tot = { T: 0, R: 0, P: 0, S: 0 }; let n = 0;
  const arch = [S({ ANALYSIS: 84, EXECUTION: 68, ADAPTATION: 82, INFLUENCE: 61, RESOLVE: 75, CREATIVITY: 50 }), S({ ANALYSIS: 72, EXECUTION: 62, ADAPTATION: 70, INFLUENCE: 90, RESOLVE: 66, CREATIVITY: 60 }), S({ ANALYSIS: 60, EXECUTION: 74, ADAPTATION: 84, INFLUENCE: 58, RESOLVE: 58, CREATIVITY: 86 })];
  for (const sa of arch) for (const sb of arch) { let x = step(st(P('A', sa), P('B', sb)), mv('TRACE'), mv('TRACE')); x = step(x.s, mv('TRACE'), mv('TRACE'));
    const d = (ma, mb) => { const r = E.resolveRound(x.s, ma, mb, 'pd'); return score(r.a) - score(x.s.a); };
    tot.R += d(mv('TRACE'), mv('TRACE')); tot.T += d(mv('PRESS'), mv('TRACE')); tot.S += d(mv('TRACE'), mv('PRESS')); tot.P += d(mv('PRESS'), mv('PRESS')); n++; }
  const m = Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, v / n]));
  assert.ok(m.T > m.R && m.R > m.P && m.P > m.S, JSON.stringify(m)); assert.ok(2 * m.R > m.T + m.S, JSON.stringify(m));
});
test('repeating Guard or Recover has diminishing returns (fatigue)', () => {
  let x = step(st(), mv('GUARD'), mv('TRACE')); const g1 = x.r.deltas.a.guard; x = step(x.s, mv('GUARD'), mv('TRACE')); const g2 = x.r.deltas.a.guard;
  let fresh = step(st(), mv('GUARD'), mv('TRACE')); // same carried guard decay is not in the delta, so compare the raw gain via a clean state that repeated
  const rep = { ...st(), a: { ...P('A'), previousBaseAction: 'GUARD', repetitionCount: 2, previousAction: mv('GUARD'), history: [{ action: mv('GUARD') }, { action: mv('GUARD') }] } };
  const first = E.resolveRound(st(), mv('GUARD'), mv('TRACE'), 'f'), again = E.resolveRound(rep, mv('GUARD'), mv('TRACE'), 'f');
  assert.ok(again.deltas.a.guard < first.deltas.a.guard, `guard ${again.deltas.a.guard} < ${first.deltas.a.guard}`);
  const low = { ...P('A'), resources: { ...P('A').resources, energy: 30 } }, r1 = E.resolveRound(st(low), mv('RECOVER'), mv('TRACE'), 'f'), rep2 = { ...st(), a: { ...low, previousBaseAction: 'RECOVER', repetitionCount: 2, previousAction: mv('RECOVER'), history: [{ action: mv('RECOVER') }, { action: mv('RECOVER') }] } };
  assert.ok(E.resolveRound(rep2, mv('RECOVER'), mv('TRACE'), 'f').deltas.a.energy < r1.deltas.a.energy);
  assert.ok(g1 > 0 && typeof g2 === 'number' && fresh);
});
test('Stale Lead: a leader that deals no damage accrues Drift; attacking or trailing does not', () => {
  const lead = st(P('A'), { ...P('B'), resources: { ...P('B').resources, vitality: 70 } });
  assert.ok(E.resolveRound(lead, mv('GUARD'), mv('TRACE'), 'sl').notes.includes('stale_lead'));
  const hit = E.resolveRound(lead, mv('PRESS'), mv('TRACE'), 'sl'); assert.ok(hit.deltas.b.vitality < 0); assert.ok(!hit.notes.includes('stale_lead'), 'a leader who attacks, and a trailing agent, are not taxed');
});
test('Standoff: mutual passivity erodes both agents with an escalating chip and never reaches the round limit', () => {
  let s = st(), out = null, n = 0; const g = (me, o) => E.legalActions(me, o).find((m) => m.action === 'GUARD' && m.intensity === 2) ?? E.legalActions(me, o).find((m) => m.action === 'RECOVER');
  const chips = [];
  while (!out && n < 24) { const x = step(s, g(s.a, s.b), g(s.b, s.a)); if (x.r.notes.includes('standoff')) chips.push(-x.r.deltas.a.vitality); s = x.s; out = x.r.outcome; n++; }
  assert.ok(chips.length >= 3, 'standoff triggers'); assert.ok(Math.max(...chips) > 2 * chips[0], 'chip escalates');
  assert.ok(out && out.reason !== 'round_limit', 'ends before the round limit: ' + JSON.stringify(out) + ' after ' + n);
});
test('Novelty: a fresh approach lands harder than a stale one, and more so with higher CREATIVITY', () => {
  const dmg = (cre, stale) => { const A = P('A', S({ CREATIVITY: cre, RESOLVE: 140 - cre })), s0 = st(stale ? { ...A, history: [{ action: mv('PRESS') }, { action: mv('PRESS') }], previousAction: mv('PRESS'), previousBaseAction: 'PRESS', repetitionCount: 1 } : A, P('B')); return -E.resolveRound(s0, mv('PRESS'), mv('TRACE'), 'nv').deltas.b.vitality; };
  assert.ok(dmg(90, false) > dmg(90, true)); assert.ok(dmg(90, false) / dmg(90, true) > dmg(50, false) / dmg(50, true));
});
test('state validation accepts the new counters and rejects out-of-range or unknown ones', () => {
  const s = st(); s.a.accord = 2; s.a.reprisal = 1; assert.doesNotThrow(() => E.assertState(s));
  const bad = st(); bad.a.accord = 99; assert.throws(() => E.assertState(bad));
  const unk = st(); unk.a.bogus = 1; assert.throws(() => E.assertState(unk));
});
test('200 seeded matches: deterministic, verifiable, invariants hold, seat swap symmetric per round', () => {
  const rng = (x) => () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  for (let k = 0; k < 200; k++) {
    const r = rng(k + 1), seed = 'sim-' + k; let m = E.createMatch({ matchId: 'sim-match-' + k, seed, a: P('A', S({ EXECUTION: 60 + (k % 20), RESOLVE: 80 - (k % 20) })), b: P('B'), now: 0, mode: 'MODEL_TRIAL' });
    while (!m.outcome) { const pick = (me, o) => { const L = E.legalActions(me, o); return L[Math.floor(r() * L.length)]; };
      const a = pick(m.state.a, m.state.b), b = pick(m.state.b, m.state.a), before = m.state, env = (id, x) => ({ match_id: m.matchId, round: m.state.round, actor_id: id, state_hash: E.stateHash(m), client_nonce: `nonce-${id}-${m.state.round}`, action: x.action, intensity: x.intensity, ...(x.prediction ? { prediction: x.prediction } : {}), ...(x.adaptStance ? { adapt_stance: x.adaptStance } : {}), ...(x.signatureId ? { signature_id: x.signatureId } : {}) });
      m = E.lockAction(m, env('A', a), m.openedAt); m = E.lockAction(m, env('B', b), m.openedAt); m = E.resolveLockedRound(m, m.openedAt);
      const sw = E.resolveRound({ round: before.round, a: before.b, b: before.a }, b, a, seed); assert.deepEqual(sw.a, m.state.b); assert.deepEqual(sw.b, m.state.a);
      for (const p of [m.state.a, m.state.b]) { for (const v of Object.values(p.resources)) assert.ok(Number.isFinite(v)); assert.ok((p.accord ?? 0) <= E.V2.accord.cap); } }
    E.verifyLocalHistory(m); assert.equal(E.verifyReplay(E.exportReplay(m)).verified, true); assert.ok(m.events.length <= E.RULES.match.max_rounds);
  }
});
