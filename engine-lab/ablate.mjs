import * as L from './lab.mjs';
import { Worker, isMainThread, parentPort, workerData, threadId } from 'node:worker_threads';
const variant = process.argv[2] || 'v1', which = process.argv[3] || 'bandit', N = +process.argv[4] || 40, ov = process.argv[5] ? JSON.parse(process.argv[5]) : undefined;
const acts = ['GUARD', 'PRESS', 'RECOVER', 'TRACE', 'COUNTER', 'ADAPT', 'MIRROR', 'SIGNATURE'];
if (isMainThread) {
  const jobs = [[]].concat(acts.map(a => [a])); const W = 3, res = {};
  await new Promise(r => { let d = 0; for (let w = 0; w < W; w++) { const wk = new Worker(new URL(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % W === w), variant, which, N, ov } }); wk.on('message', m => { res[m.ban.join('+') || 'none'] = m; }); wk.on('exit', () => { if (++d === W) r(); }); } });
  console.log('action removed -> win% of the restricted agent vs the full agent (50 = action adds nothing; lower = action matters)');
  for (const k of Object.keys(res)) if (k !== 'none') console.log(k.padEnd(10), (100 * res[k].wr).toFixed(1).padStart(5) + '%', ' n=' + res[k].n, ' meanLen', res[k].len);
} else {
  const E = await L.load(workerData.variant === 'v1' ? 'v1' : 'abl_' + threadId + '_' + Date.now(), workerData.ov), base = workerData.which === 'deep' ? L.POLICIES.deep : L.POLICIES.bandit;
  for (const ban of workerData.jobs) {
    if (!ban.length) continue; let s = 0, n = 0, len = 0;
    for (let k = 0; k < workerData.N; k++) for (const sw of [0, 1]) {
      const aA = L.NAMES[(k + 1) % 6], aB = L.NAMES[(k * 5 + 2) % 6], seed = `ab-${ban}-${k}`;
      const pr = L.banned(base, ban), full = base;
      const m = sw ? L.playMatch(E, 0, 0, aB, aA, seed, full, pr) : L.playMatch(E, 0, 0, aA, aB, seed, pr, full);
      const w = m.outcome.winner, restrictedIsA = !sw; s += w === null ? .5 : ((w === 'A') === restrictedIsA ? 1 : 0); n++; len += m.rounds;
    }
    parentPort.postMessage({ ban, wr: s / n, n, len: +(len / n).toFixed(1) });
  }
}
