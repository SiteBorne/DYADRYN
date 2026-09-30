import * as L from './lab.mjs'; import { cpSync, readFileSync, writeFileSync } from 'node:fs';
const F = parseFloat(process.argv[2] || '0.6'), OV = process.argv[3] ? JSON.parse(process.argv[3]) : {}, dir = L.buildVariant('fx' + Date.now(), OV);
let t = readFileSync(dir + '/resolve.js', 'utf8'); t = t.replace('d.guard += RULES.actions.GUARD.guard_base[i] * statFactor(s.RESOLVE) * f;', `d.guard += RULES.actions.GUARD.guard_base[i] * statFactor(s.RESOLVE) * f * (p.previousBaseAction === "GUARD" ? ${F} : 1);`); writeFileSync(dir + '/resolve.js', t);
const E = await import(dir + '/index.js');
const pols = ['presser', 'turtle', 'reader', 'inherited0', 'inherited3', 'bandit'];
const rows = [], wr = {}; for (const a of pols) { wr[a] = [0, 0]; for (const b of pols) if (a !== b) for (let k = 0; k < 14; k++) { const aA = L.NAMES[(k + 1) % 6], aB = L.NAMES[(k * 5 + 2) % 6]; for (const sw of [0, 1]) { const m = sw ? L.playMatch(E, 0, 0, aB, aA, `f-${a}-${b}-${k}`, L.POLICIES[b], L.POLICIES[a]) : L.playMatch(E, 0, 0, aA, aB, `f-${a}-${b}-${k}`, L.POLICIES[a], L.POLICIES[b]); const w = m.outcome.winner; wr[a][1]++; wr[a][0] += w === null ? .5 : ((w === 'A') !== !!sw) ? 1 : 0; rows.push(m); } } }
console.log('guard fatigue factor', F, 'len', JSON.stringify(L.summarize(rows)));
console.log('avg win% vs field:', pols.map(p => p + ' ' + (100 * wr[p][0] / wr[p][1]).toFixed(0)).join(' | '));
const mr = []; const use = {}; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (i !== j) for (let k = 0; k < 3; k++) { const m = L.playMatch(E, 0, 0, L.NAMES[i], L.NAMES[j], `mrf-${i}-${j}-${k}`, L.POLICIES.bandit, L.POLICIES.bandit); mr.push(m); for (const s of ['a', 'b']) for (const x in m.acts[s]) use[x] = (use[x] || 0) + m.acts[s][x]; }
const tot = Object.values(use).reduce((a, b) => a + b); console.log('bandit mirror', JSON.stringify(L.summarize(mr)), 'shares', Object.entries(use).map(([k, v]) => k + ' ' + (100 * v / tot).toFixed(0)).join(' '));
