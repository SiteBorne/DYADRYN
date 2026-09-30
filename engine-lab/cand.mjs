import { readFileSync } from 'node:fs';
import { toOverrides } from './opt.mjs';
const r = JSON.parse(readFileSync(process.argv[2])); const p = r[+process.argv[3] || 0].p;
console.log(JSON.stringify(Object.fromEntries(Object.entries(toOverrides(p)).map(([k, v]) => [k, [v]]))));
