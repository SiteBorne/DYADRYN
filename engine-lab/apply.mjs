import { readFileSync, writeFileSync } from 'node:fs'; import { parse, stringify } from '../worker/node_modules/yaml/dist/index.js'; import { toOverrides } from './opt.mjs';
const r = JSON.parse(readFileSync(process.argv[2])).find(x => String(x.id) === process.argv[3]); const f = '../worker/config/rules.v2.yaml'; const y = parse(readFileSync(f, 'utf8'));
for (const [p, v] of Object.entries(toOverrides(r.p))) { const k = p.split('.'); let t = y; for (let i = 0; i < k.length - 1; i++) t = t[k[i]]; t[k.at(-1)] = v; }
writeFileSync(f, stringify(y, { lineWidth: 0 })); console.log('applied', r.id, r.total);
