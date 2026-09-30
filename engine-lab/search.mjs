import { Worker } from 'node:worker_threads';
import { writeFileSync } from 'node:fs';
const grid = JSON.parse(process.argv[2]), N = +process.argv[3] || 8, out = process.argv[4] || 'search.json';
const keys = Object.keys(grid); let combos = [{}]; for (const k of keys) combos = combos.flatMap(c => grid[k].map(v => ({ ...c, [k]: v })));
const jobs = combos.map((o, i) => ({ id: 'g' + i, o })); const W = 4, res = []; let done = 0;
await new Promise(r => { for (let w = 0; w < W; w++) { const wk = new Worker(new URL('./worker.mjs', import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % W === w), N } }); wk.on('message', m => { if (m === 'done') { if (++done === W) r(); } else { res.push(m); process.stderr.write(`${res.length}/${jobs.length}\r`); } }); } });
res.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })); writeFileSync(out, JSON.stringify(res)); console.log('saved', res.length);
