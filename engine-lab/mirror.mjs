import * as L from './lab.mjs';
import { Worker, isMainThread, parentPort, workerData, threadId } from 'node:worker_threads';
if (isMainThread) {
  const grid = JSON.parse(process.argv[2]), N = +process.argv[3] || 10; const keys = Object.keys(grid); let combos = [{}]; for (const k of keys) combos = combos.flatMap(c => grid[k].map(v => ({ ...c, [k]: v })));
  const W = 3, res = []; await new Promise(r => { let d = 0; for (let w = 0; w < W; w++) { const wk = new Worker(new URL(import.meta.url), { workerData: { jobs: combos.filter((_, i) => i % W === w), N } }); wk.on('message', m => res.push(m)); wk.on('exit', () => { if (++d === W) r(); }); } });
  res.sort((a, b) => a.len.mean - b.len.mean); for (const x of res) console.log(JSON.stringify(x.o).replace(/resources\.GUARD\.|actions\.(PRESS|GUARD)\./g, ''), 'len', x.len.mean, 'p10/90', x.len.p10 + '/' + x.len.p90, 'limit', x.len.limitRate, 'ko', x.len.koRate, 'guardShare', x.gs);
} else {
  for (const o of workerData.jobs) { const E = await L.load('m' + threadId + '_' + (globalThis.__n = (globalThis.__n||0)+1), o); const rows = []; let g = 0, t = 0;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) for (let k = 0; k < workerData.N / 6 + 1 | 0; k++) { if (rows.length >= workerData.N * 6) break; const m = L.playMatch(E, 0, 0, L.NAMES[i], L.NAMES[j], `mr-${i}-${j}-${k}`, L.POLICIES.bandit, L.POLICIES.bandit); rows.push(m); for (const s of ['a', 'b']) { g += m.acts[s].GUARD || 0; t += Object.values(m.acts[s]).reduce((a, b) => a + b, 0); } }
    parentPort.postMessage({ o, len: L.summarize(rows), gs: +(g / t).toFixed(2) }); }
}
