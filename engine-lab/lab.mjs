// DYADRYN engine lab: policy-population tournaments on the REAL resolver (pure resolveRound), any rules variant.
// Variants are built from the worker's compiled engine (worker/engine/dist) + a rules YAML with dotted-path overrides,
// so the lab measures exactly the code that ships. `v2: null` removes the v2 section => v1-equivalent behaviour.
import { readFileSync, cpSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { parse } from '../worker/node_modules/yaml/dist/index.js';
import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(HERE, '../worker/engine/dist'), CONFIG = path.join(HERE, '../worker/config');
export function buildVariant(id, overrides = {}) {
  const dir = path.join(HERE, 'variants', id);
  rmSync(dir, { recursive: true, force: true });
  cpSync(DIST, dir, { recursive: true });
  const rules = parse(readFileSync(path.join(CONFIG, overrides['@file'] || (id === 'v1' ? 'rules.v1.yaml' : 'rules.v2.yaml')), 'utf8'));
  for (const [p, v] of Object.entries(overrides)) {
    if (p.startsWith('@')) continue;
    const k = p.split('.'); let t = rules; for (let i = 0; i < k.length - 1; i++) t = t[k[i]];
    if (v === null) delete t[k.at(-1)]; else t[k.at(-1)] = v;
  }
  rules.ruleset_id = 'lab.' + id;
  writeFileSync(path.join(dir, 'rules.generated.js'), 'export const RULES = ' + JSON.stringify(rules) + ';\n');
  return dir;
}
export async function load(id, overrides) { return import(buildVariant(id, overrides) + '/index.js?' + Date.now()); }

export const rng = (s) => { let x = (s >>> 0) || 0x9e3779b9; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
export const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };

// archetype profiles = stat distributions (total 420) + signature pairs, mirroring the six public archetypes
export const ARCH = {
  'Trace-Hunter': { s: [84, 68, 82, 61, 75, 50], sig: ['SECOND_ORDER_SIGHT', 'COUNTERFACTUAL_SHIELD'] },
  Broker: { s: [72, 62, 70, 90, 66, 60], sig: ['BROKER_LOCK', 'CONSTRAINT_COLLAPSE'] },
  Stillpoint: { s: [66, 58, 74, 64, 90, 68], sig: ['STILLPOINT', 'COUNTERFACTUAL_SHIELD'] },
  Archive: { s: [80, 56, 82, 70, 62, 70], sig: ['ARCHIVE_ECHO', 'SECOND_ORDER_SIGHT'] },
  Swarm: { s: [60, 74, 84, 58, 58, 86], sig: ['SWARM_REPAIR', 'CONSTRAINT_COLLAPSE'] },
  Veil: { s: [80, 54, 72, 88, 64, 62], sig: ['VEIL_STEP', 'BROKER_LOCK'] }
};
export const NAMES = Object.keys(ARCH);
const STAT = ['ANALYSIS', 'EXECUTION', 'ADAPTATION', 'INFLUENCE', 'RESOLVE', 'CREATIVITY'];
export const mkPlayer = (E, id, arch) => E.createPlayer(id, Object.fromEntries(STAT.map((k, i) => [k, ARCH[arch].s[i]])), ARCH[arch].sig);

/* ---------------- policies: (E, me, opp, ctx) -> BattleAction. Public information only. ---------------- */
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const by = (legal, f) => legal.filter(f);
const cost = (E, a) => (a.action === 'SIGNATURE' ? E.SIGNATURES[a.signatureId].energy : a.action === 'ADAPT' ? E.RULES.actions.ADAPT.energy : a.action === 'RECOVER' ? 0 : E.RULES.actions[a.action].energy[a.intensity - 1]);
function freq(o) { const f = {}; for (const h of o.history ?? []) if (h.action.action !== 'STALL') f[h.action.action] = (f[h.action.action] || 0) + 1; return f; }
function mode(o) { const f = freq(o); let b = null, n = 0; for (const k in f) if (f[k] > n) { n = f[k]; b = k; } return b; }
export const POLICIES = {
  random: (E, me, o, c) => pick(E.legalActions(me, o), c.r),
  inherited0: (E, me, o, c) => inherited(E, me, o, c.r, 0), inherited1: (E, me, o, c) => inherited(E, me, o, c.r, 1),
  inherited2: (E, me, o, c) => inherited(E, me, o, c.r, 2), inherited3: (E, me, o, c) => inherited(E, me, o, c.r, 3),
  presser: (E, me, o, c) => { const L = E.legalActions(me, o); if (me.resources.energy < 24 || me.resources.heat > 80) return pick(by(L, a => a.action === 'RECOVER' && a.intensity === 2), c.r); return pick(by(L, a => a.action === 'PRESS' && a.intensity === 2), c.r) || pick(L, c.r); },
  turtle: (E, me, o, c) => { const L = E.legalActions(me, o); if (me.resources.energy < 30) return pick(by(L, a => a.action === 'RECOVER' && a.intensity === 2), c.r); if (me.resources.guard < 18 || c.r() < .5) return pick(by(L, a => a.action === 'GUARD' && a.intensity === 2), c.r); return pick(by(L, a => a.action === 'PRESS' && a.intensity === 1), c.r) || pick(L, c.r); },
  reader: (E, me, o, c) => { const L = E.legalActions(me, o); if (me.resources.energy < 26) return pick(by(L, a => a.action === 'RECOVER' && a.intensity === 2), c.r); const m = mode(o) || 'PRESS'; const cs = by(L, a => a.action === 'COUNTER' && a.prediction === (m === 'COUNTER' ? 'PRESS' : m) && a.intensity === 2); if (cs.length && me.insightStacks + (me.resources.focus >= 18 ? 1 : 0) >= 1 && c.r() < .8) return cs[0]; if (me.resources.focus < 24) return pick(by(L, a => a.action === 'TRACE' && a.intensity === 2), c.r) || pick(L, c.r); return pick(by(L, a => a.action === 'PRESS' && a.intensity === 2), c.r) || pick(L, c.r); },
  signature: (E, me, o, c) => { const L = E.legalActions(me, o); const sg = by(L, a => a.action === 'SIGNATURE'); if (sg.length) return pick(sg, c.r); if (me.resources.energy < 26) return pick(by(L, a => a.action === 'RECOVER'), c.r); if (me.resources.focus < 30) return pick(by(L, a => a.action === 'TRACE' && a.intensity === 2), c.r) || pick(L, c.r); return pick(by(L, a => a.action === 'PRESS' && a.intensity === 2), c.r) || pick(L, c.r); }
};
function inherited(E, p, o, rand, style) {
  const legal = E.legalActions(p, o);
  const preferred = p.resources.energy < 22 ? 'RECOVER' : p.resources.focus >= 30 && rand() < .5 ? 'SIGNATURE' : p.resources.heat >= 85 ? 'RECOVER' : style === 0 ? 'PRESS' : style === 1 && o.previousAction && o.previousAction.action !== 'COUNTER' ? 'COUNTER' : style === 2 && p.resources.focus < 45 ? 'TRACE' : style === 3 && p.resources.guard < 10 ? 'GUARD' : 'PRESS';
  const pool = rand() < .28 ? legal : legal.filter(a => a.action === preferred);
  let cand = pool.length ? pool : legal;
  if (preferred === 'COUNTER' && pool.length) { const pr = pool.filter(a => a.prediction === o.previousAction?.action); if (pr.length) cand = pr; }
  return cand[Math.floor(rand() * cand.length)];
}
// One-ply expectimax against an empirical model of the opponent's PUBLIC history (+uniform prior); values = score swing.
export function makeBandit({ samples = 5, eps = .08 } = {}) {
  return (E, me, o, c) => {
    const L = E.legalActions(me, o), r = c.r; if (r() < eps) return pick(L, r);
    const OL = E.legalActions(o, me), f = freq(o), tot = Object.values(f).reduce((a, b) => a + b, 0);
    const w = OL.map(a => 1 + 6 * (f[a.action] || 0) / Math.max(1, tot) + (a.intensity === 2 ? 1 : 0)); const W = w.reduce((a, b) => a + b, 0);
    const sampleOpp = () => { let t = r() * W; for (let i = 0; i < OL.length; i++) { t -= w[i]; if (t <= 0) return OL[i]; } return OL.at(-1); };
    const opps = Array.from({ length: samples }, sampleOpp);
    const cands = L.filter(a => a.intensity !== 1 || a.action === 'RECOVER' || a.action === 'TRACE' || a.action === 'GUARD');
    let best = null, bv = -1e9;
    for (const a of cands) {
      let v = 0;
      for (const oa of opps) {
        const res = E.resolveRound({ round: c.round, a: c.side === 'a' ? me : o, b: c.side === 'a' ? o : me }, c.side === 'a' ? a : oa, c.side === 'a' ? oa : a, 'lab-lookahead');
        const mine = c.side === 'a' ? res.a : res.b, theirs = c.side === 'a' ? res.b : res.a;
        v += E.proofScore(mine.resources) - E.proofScore(theirs.resources) + (theirs.resources.vitality <= 0 ? 60 : 0) - (mine.resources.vitality <= 0 ? 60 : 0) + 0.25 * mine.resources.focus * 0 + 0.3 * (mine.insightStacks - theirs.insightStacks);
      }
      v = v / samples + r() * 1e-3; if (v > bv) { bv = v; best = a; }
    }
    return best ?? pick(L, r);
  };
}
POLICIES.bandit = makeBandit();

/* ---------------- match + tournament ---------------- */
export function playMatch(E, pa, pb, archA, archB, seed, polA, polB) {
  const r = rng(fnv(seed + '|pol'));
  let st = { round: 1, a: mkPlayer(E, 'A', archA), b: mkPlayer(E, 'B', archB) }, out = null, n = 0; const acts = { a: {}, b: {} }, trace = [];
  while (!out) {
    const ca = { r, round: st.round, side: 'a' }, cb = { r, round: st.round, side: 'b' };
    const aa = polA(E, st.a, st.b, ca), ab = polB(E, st.b, st.a, cb);
    acts.a[aa.action] = (acts.a[aa.action] || 0) + 1; acts.b[ab.action] = (acts.b[ab.action] || 0) + 1;
    const res = E.resolveRound(st, aa, ab, seed); n++;
    trace.push([E.proofScore(res.a.resources) - E.proofScore(res.b.resources)]);
    st = { round: res.outcome ? res.round : res.round + 1, a: res.a, b: res.b }; out = res.outcome;
  }
  return { outcome: out, rounds: n, acts, end: st, trace };
}
export function summarize(rows) {
  const L = rows.map(r => r.rounds).sort((a, b) => a - b), q = (p) => L[Math.min(L.length - 1, Math.floor(p * L.length))];
  const reasons = {}; for (const r of rows) reasons[r.outcome.reason] = (reasons[r.outcome.reason] || 0) + 1;
  return { n: rows.length, mean: +(L.reduce((a, b) => a + b, 0) / L.length).toFixed(2), p10: q(.1), p50: q(.5), p90: q(.9), limitRate: +((reasons.round_limit || 0) / rows.length).toFixed(3), koRate: +(((reasons.ko || 0) + (reasons.double_ko || 0)) / rows.length).toFixed(3), reasons };
}

// deep policy: H-round lookahead; later rounds rolled out with a cheap mixed heuristic for both sides.
export function makeDeep({ H = 3, samples = 3, eps = .05, cand = 'pruned' } = {}) {
  const rollPick = (E, me, o, r) => { const L = E.legalActions(me, o); const pref = me.resources.energy < 24 ? 'RECOVER' : me.resources.guard < 14 && r() < .5 ? 'GUARD' : 'PRESS'; const pl = L.filter(a => a.action === pref && a.intensity === 2); return pl.length ? pl[0] : L[Math.floor(r() * L.length)]; };
  return (E, me, o, c) => {
    const r = c.r, L0 = E.legalActions(me, o); if (r() < eps) return pick(L0, r);
    const OL = E.legalActions(o, me), f = freq(o), tot = Object.values(f).reduce((a, b) => a + b, 0);
    const w = OL.map(a => 1 + 6 * (f[a.action] || 0) / Math.max(1, tot) + (a.intensity === 2 ? 1 : 0)), W = w.reduce((a, b) => a + b, 0);
    const sampleOpp = () => { let t = r() * W; for (let i = 0; i < OL.length; i++) { t -= w[i]; if (t <= 0) return OL[i]; } return OL.at(-1); };
    const cands = L0.filter(a => a.intensity === 2 || (a.action === 'RECOVER') || (a.action === 'GUARD' && a.intensity === 3));
    const mineA = c.side === 'a';
    let best = null, bv = -1e9;
    for (const a of cands) {
      let v = 0;
      for (let s = 0; s < samples; s++) {
        let st = { round: c.round, a: mineA ? me : o, b: mineA ? o : me }, act = [a, sampleOpp()], res = null;
        for (let h = 0; h < H; h++) {
          if (h > 0) { const pa = rollPick(E, st.a, st.b, r), pb = rollPick(E, st.b, st.a, r); act = [pa, pb]; }
          try { res = E.resolveRound(st, mineA ? act[0] : act[1], mineA ? act[1] : act[0], 'lab-deep'); } catch { res = null; break; }
          if (res.outcome) break; st = { round: res.round + 1, a: res.a, b: res.b };
        }
        if (!res) { v -= 50; continue; }
        const mine = mineA ? res.a : res.b, th = mineA ? res.b : res.a;
        v += E.proofScore(mine.resources) - E.proofScore(th.resources) + (th.resources.vitality <= 0 ? 80 : 0) - (mine.resources.vitality <= 0 ? 80 : 0);
      }
      v += r() * 1e-3; if (v > bv) { bv = v; best = a; }
    }
    return best ?? pick(L0, r);
  };
}
POLICIES.deep = makeDeep();
export function banned(pol, ban) { return (E, me, o, c) => { const E2 = { ...E, legalActions: (p, q) => { const L = E.legalActions(p, q); return p === me ? (L.filter(a => !ban.includes(a.action)).length ? L.filter(a => !ban.includes(a.action)) : L) : L; } }; return pol(E2, me, o, c); }; }
