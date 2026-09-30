// Random-search design optimiser over the ruleset knob space, scored by stage-game equilibrium structure (nash.mjs).
// usage: node opt.mjs <samples> <seed> <out.json> [baseOverridesJSON]
import { Worker, isMainThread, parentPort, workerData, threadId } from 'node:worker_threads';
import { writeFileSync } from 'node:fs';
import * as L from './lab.mjs';
import { nash } from './nash.mjs';
const SPACE = {
  'actions.PRESS.base_damage': [9, 20], 'guard_scale': [0.5, 1.2], 'actions.COUNTER.return_base': [5, 14], 'actions.COUNTER.success_incoming_multiplier': [0.2, 0.6],
  'actions.COUNTER.miss_drift': [4, 12], 'actions.COUNTER.miss_incoming_multiplier': [1.0, 1.3], 'trace_scale': [0.8, 2.2], 'recover_scale': [0.6, 1.2],
  'actions.MIRROR.base_scale': [0.8, 1.4], 'actions.ADAPT.energy': [4, 10], 'v2.exposure.trace': [1.0, 1.4], 'v2.exposure.adapt': [1.0, 1.4],
  'v2.insight.press_bonus': [0, 0.08], 'v2.adapt.amount': [8, 18], 'v2.signature.scale': [1, 3], 'v2.fatigue.guard_decay': [0.5, 0.9], 'v2.fatigue.recover_decay': [0.5, 0.9],
  'v2.novelty.bonus': [0, 0.25], 'v2.accord.dividend_focus': [2, 8], 'v2.accord.dividend_energy': [0, 6], 'actions.SIGNATURE.default_focus_cost': [18, 32]
};
export function toOverrides(p) {
  const o = {}; for (const [k, v] of Object.entries(p)) { if (k === 'guard_scale') o['actions.GUARD.guard_base'] = [18, 24, 30].map(x => +(x * v).toFixed(1)); else if (k === 'trace_scale') o['actions.TRACE.focus_gain'] = [12, 18, 24].map(x => +(x * v).toFixed(1)); else if (k === 'recover_scale') o['actions.RECOVER.energy_gain'] = [12, 18, 24].map(x => +(x * v).toFixed(1)); else o[k] = v; }
  o['actions.SIGNATURE.default_focus_requirement'] = o['actions.SIGNATURE.default_focus_cost'] ?? 30; return o;
}
export function score(r) {
  const s = r.share, gr = s.GUARD + s.RECOVER; let pen = 0; for (const v of Object.values(s)) pen += Math.max(0, 0.04 - v) * 25;
  return +(r.entropy - pen - 4 * Math.max(0, gr - 0.4) - 3 * Math.max(0, s.PRESS - 0.35) - 6 * Math.abs(r.value) / 5).toFixed(3);
}
if (isMainThread && process.argv[1].endsWith('opt.mjs')) {
  const N = +process.argv[2] || 60, seed = +process.argv[3] || 1, out = process.argv[4] || 'PRIVATE/opt.json', W = 3, res = [];
  const base = process.argv[5] ? JSON.parse(process.argv[5]) : {};
  const r = L.rng(seed * 7919), jobs = Array.from({ length: N }, (_, i) => { const p = {}; for (const [k, [lo, hi]] of Object.entries(SPACE)) p[k] = +(lo + (hi - lo) * r()).toFixed(3); return { id: i, p: { ...p, ...base } }; });
  await new Promise(resolve => { let d = 0; for (let w = 0; w < W; w++) { const wk = new Worker(new URL(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % W === w) } }); wk.on('message', m => { if (m === 'done') { if (++d === W) resolve(); } else { res.push(m); process.stderr.write(res.length + '/' + N + '\r'); } }); } });
  res.sort((a, b) => b.score - a.score); writeFileSync(out, JSON.stringify(res)); for (const x of res.slice(0, 8)) console.log(x.score, x.entropy, JSON.stringify(x.share), x.value);
} else if (!isMainThread) {
  for (const j of workerData.jobs) { const E = await L.load('o' + threadId + '_' + j.id, toOverrides(j.p)); const r = await nash(E, 100, 'o'); parentPort.postMessage({ id: j.id, p: j.p, score: score(r), entropy: r.entropy, share: r.share, value: r.value }); }
  parentPort.postMessage('done');
}
