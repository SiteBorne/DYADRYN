// Equalises the marginal value of attribute points (relative to CREATIVITY) by tuning per-attribute leverage weights.
import { readFileSync, writeFileSync } from 'node:fs'; import { parse, stringify } from '../worker/node_modules/yaml/dist/index.js';
import * as L from './lab.mjs'; import { statValues } from './sv.mjs';
const f = '../worker/config/rules.v2.yaml', it = +process.argv[2] || 6, NM = +process.argv[3] || 600;
for (let i = 0; i < it; i++) {
  const y = parse(readFileSync(f, 'utf8')), E = await L.load('c2', {}), s = statValues(E, NM, 'c2' + i), v = s.values, w = y.v2.stat_weight;
  console.log('iter', i, JSON.stringify(v), 'spread', s.spread, 'len', s.meanLen, 'w', JSON.stringify(w), 'read', y.v2.influence.read);
  const up = (x, d, lo, hi) => +Math.min(hi, Math.max(lo, x * Math.exp(-0.35 * d))).toFixed(3);
  w.EXECUTION = up(w.EXECUTION, v.EXECUTION, .2, 2.5); w.ANALYSIS = up(w.ANALYSIS, v.ANALYSIS, .2, 2.5); w.ADAPTATION = up(w.ADAPTATION, v.ADAPTATION, .2, 2.5); w.RESOLVE = up(w.RESOLVE, v.RESOLVE, .2, 2.5);
  y.v2.influence.read = +Math.min(0.6, Math.max(0, y.v2.influence.read + (-0.05 * v.INFLUENCE))).toFixed(3);
  writeFileSync(f, stringify(y, { lineWidth: 0 }));
}
