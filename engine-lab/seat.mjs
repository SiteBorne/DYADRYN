import * as L from './lab.mjs';
const E = await L.load('v1'); let w = [0, 0, 0]; const byPol = {};
for (let i = 0; i < 3000; i++) { const sa = i % 4, sb = (i >> 2) % 4; const m = L.playMatch(E, 0, 0, L.NAMES[i % 6], L.NAMES[(i * 5 + 1) % 6], `fit-${i}`, L.POLICIES['inherited' + sa], L.POLICIES['inherited' + sb]); w[m.outcome.winner === 'A' ? 0 : m.outcome.winner === 'B' ? 1 : 2]++; }
console.log('A wins', w[0], 'B wins', w[1], 'draws', w[2]);
// pure seat test: identical policy + identical archetype both sides, alternating seeds
let a = 0, b = 0, d = 0; for (let i = 0; i < 2000; i++) { const arch = L.NAMES[i % 6]; const m = L.playMatch(E, 0, 0, arch, arch, `seat-${i}`, L.POLICIES.inherited0, L.POLICIES.inherited0); if (m.outcome.winner === 'A') a++; else if (m.outcome.winner === 'B') b++; else d++; }
console.log('mirror matches: A', a, 'B', b, 'draw', d);
