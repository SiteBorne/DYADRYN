import { readFileSync } from 'node:fs'; import { toOverrides } from './opt.mjs';
const r = JSON.parse(readFileSync(process.argv[2])); console.log(JSON.stringify(toOverrides(r[+process.argv[3] || 0].p)));
