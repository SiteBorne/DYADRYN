// Exports REAL matches played by the DYADRYN reference engine (0.3.0-rc.1) as public replay data.
// The engine itself (resolver, constants) is NOT shipped to the site: only the replays it produced —
// which is exactly what a public replay is — plus the browser-checkable proof chain.
//   ENGINE_DIST=/path/to/engine/dist node scripts/export-engine-replays.mjs
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = process.env.ENGINE_DIST; if (!dist) throw new Error('set ENGINE_DIST to the engine dist directory');
const E = await import(pathToFileURL(path.join(dist, 'index.js')).href);
const SIM = await import(pathToFileURL(path.join(dist, '../scripts/simulate.mjs')).href);
const NAMES = ['ANALYSIS', 'EXECUTION', 'ADAPTATION', 'INFLUENCE', 'RESOLVE', 'CREATIVITY'];
const ARCH = {
  'Trace-Hunter': { a: [84, 68, 82, 61, 75, 50], s: ['SECOND_ORDER_SIGHT', 'COUNTERFACTUAL_SHIELD'] },
  Broker: { a: [72, 62, 70, 90, 66, 60], s: ['BROKER_LOCK', 'CONSTRAINT_COLLAPSE'] },
  Stillpoint: { a: [66, 58, 74, 64, 90, 68], s: ['STILLPOINT', 'COUNTERFACTUAL_SHIELD'] },
  Archive: { a: [80, 56, 82, 70, 62, 70], s: ['ARCHIVE_ECHO', 'SECOND_ORDER_SIGHT'] },
  Swarm: { a: [60, 74, 84, 58, 58, 86], s: ['SWARM_REPAIR', 'CONSTRAINT_COLLAPSE'] },
  Veil: { a: [80, 54, 72, 88, 64, 62], s: ['VEIL_STEP', 'BROKER_LOCK'] }
};
const CARDS = [
  { id: 'dyad-01', a: ['Metis', 'Trace-Hunter', 1], b: ['Cinder', 'Broker', 0] },
  { id: 'dyad-02', a: ['Verge', 'Stillpoint', 3], b: ['Wren', 'Swarm', 0] },
  { id: 'dyad-03', a: ['Halcyon', 'Archive', 2], b: ['Mote', 'Veil', 1] },
  { id: 'dyad-04', a: ['Sable', 'Veil', 1], b: ['Tarn', 'Swarm', 2] }
];
const mk = (id, arch) => E.createPlayer(id, Object.fromEntries(NAMES.map((n, i) => [n, ARCH[arch].a[i]])), ARCH[arch].s);
const env = (m, id, a) => ({ match_id: m.matchId, round: m.state.round, actor_id: id, state_hash: E.stateHash(m), client_nonce: `nonce-${id}-${m.state.round}`, action: a.action, intensity: a.intensity, ...(a.prediction ? { prediction: a.prediction } : {}), ...(a.adaptStance ? { adapt_stance: a.adaptStance } : {}), ...(a.signatureId ? { signature_id: a.signatureId } : {}) });
// Win chance for player A: logistic on the public proof-score lead, slope fitted per round bucket on 32k held-out states
// (Brier 0.124 vs 0.246 for a coin flip; see docs/ENGINE_BACKTEST.md). Computed here, at build time, so no engine constants ship.
const WP_K = [[1, 3, 0.13], [4, 6, 0.145], [7, 10, 0.15], [11, 15, 0.165], [16, 99, 0.23]];
const winChance = (st, round) => { const k = WP_K.find(([lo, hi]) => round >= lo && round <= hi)[2]; return Math.round(1e3 / (1 + Math.exp(-k * (E.proofScore(st.a.resources) - E.proofScore(st.b.resources))))) / 10; };
const slim = (p) => ({ r: p.resources, ins: p.insightStacks, sg: p.revealedSignals ?? [], adapt: p.activeAdapt ? { stance: p.activeAdapt.stance, left: p.activeAdapt.roundsRemaining } : null, cd: Object.fromEntries(Object.entries(p.cooldowns).filter(([, v]) => v > 0)), sig: p.signatures });
function play(card, seedIx) {
  const seed = `dyadryn-site-${card.id}-${seedIx}`, rand = E.xorshift32(E.fnv1a32(seed));
  let m = E.createMatch({ matchId: `${card.id}-${String(seedIx).padStart(4, '0')}`, seed, a: mk('A', card.a[1]), b: mk('B', card.b[1]), now: 0, mode: 'MODEL_TRIAL' });
  const frames = [{ round: 0, wp: 50, post: { a: slim(m.state.a), b: slim(m.state.b) } }];
  while (!m.outcome) {
    const pre = structuredClone(m.state);
    const a = SIM.choose(m.state.a, m.state.b, rand, card.a[2]), b = SIM.choose(m.state.b, m.state.a, rand, card.b[2]);
    m = E.lockAction(m, env(m, 'A', a), m.openedAt); m = E.lockAction(m, env(m, 'B', b), m.openedAt); m = E.resolveLockedRound(m, m.openedAt);
    const ev = m.events.at(-1);
    // what-if branches for Player A, resolved by the real engine at build time (never in the browser)
    const alts = []; const legal = E.legalActions(pre.a, pre.b);
    for (const t of E.ACTIONS) {
      const c = legal.filter((x) => x.action === t && x.intensity === 2 && (t !== 'COUNTER' || x.prediction === (b.action !== 'COUNTER' ? b.action : 'PRESS')))[0];
      if (!c) continue;
      const rr = E.resolveRound(pre, c, b, seed);
      alts.push({ act: c, post: { a: rr.a.resources, b: rr.b.resources }, outcome: rr.outcome });
    }
    frames.push({ round: ev.round, wp: m.outcome ? (m.outcome.winner === 'A' ? 100 : m.outcome.winner === 'B' ? 0 : 50) : winChance(m.state, m.state.round), actions: ev.actions, notes: ev.notes, hash: ev.hash, prev: ev.previousHash, alts, post: { a: slim(m.state.a), b: slim(m.state.b) } });
  }
  E.verifyLocalHistory(m);
  const replay = E.exportReplay(m), ver = E.verifyReplay(replay);
  return { m, replay, ver, frames, seed };
}
function drama(r) { // pick watchable matches: 12–22 rounds, a lead change, signature + counter + bright present
  const n = r.frames.length - 1; if (n < 9 || n > 24) return -1;
  let lead = 0, changes = 0, sig = 0, ctr = 0, bright = 0;
  for (const f of r.frames.slice(1)) { const d = f.post.a.r.vitality - f.post.b.r.vitality, s = Math.sign(d); if (s && lead && s !== lead) changes++; if (s) lead = s; for (const x of [f.actions.a, f.actions.b]) { if (x?.action === 'SIGNATURE') sig++; if (x?.action === 'COUNTER') ctr++; } if (f.post.a.r.heat >= 70 || f.post.b.r.heat >= 70) bright++; }
  return changes * 3 + Math.min(sig, 3) + Math.min(ctr, 3) + Math.min(bright, 3) + (r.m.outcome.winner ? 2 : 0);
}
const out = { engine: '@dyadryn/reference-engine 0.1.0 · release candidate 0.3.0-rc.1', ruleset: E.RULES.ruleset_id, proof_format: 'dyadryn.proof.v2', matches: [] };
for (const c of CARDS) {
  let best = null;
  for (let s = 0; s < 250; s++) { const r = play(c, s), d = drama(r); if (d >= 0 && (!best || d > best.d)) best = { r, d, s }; }
  if (!best) throw new Error('no watchable match for ' + c.id);
  const { r } = best, rep = r.replay;
  out.matches.push({ id: r.m.matchId, label: `${c.a[0]} vs ${c.b[0]}`, a: { name: c.a[0], arch: c.a[1], stats: r.m.initialState.a.stats, sigs: r.m.initialState.a.signatures }, b: { name: c.b[0], arch: c.b[1], stats: r.m.initialState.b.stats, sigs: r.m.initialState.b.signatures },
    mode: rep.mode, seed_commitment: rep.seed_commitments.server, seed_reveal: rep.seed_reveals.server, proof_format: rep.proof_format, ruleset: rep.ruleset_version,
    initial_state: rep.initial_state, root: rep.event_root_hash, outcome: rep.terminal_result, engine_verified: r.ver, scores: { a: E.proofScore(r.m.state.a.resources), b: E.proofScore(r.m.state.b.resources) }, events: rep.events, match_id: rep.match_id, frames: r.frames });
  console.log(c.id, 'seed', best.s, 'rounds', r.frames.length - 1, 'winner', rep.terminal_result.winner, rep.terminal_result.reason, 'drama', best.d, 'verified', r.ver.verified);
}
fs.writeFileSync(path.join(root, 'src/js/engine-replays.js'), `/* generated by scripts/export-engine-replays.mjs — real matches from the DYADRYN reference engine (replays only; no engine code) */\nwindow.DY=window.DY||{};DY.ENGINE=${JSON.stringify(out)};\n`);
console.log('bytes', fs.statSync(path.join(root, 'src/js/engine-replays.js')).size);
