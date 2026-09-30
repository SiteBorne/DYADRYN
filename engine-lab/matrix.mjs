import * as L from './lab.mjs';
const id=process.argv[2]||'v1', N=+process.argv[3]||30, E=await L.load(id, process.argv[4]?JSON.parse(process.argv[4]):undefined);
const pols=['presser','turtle','reader','signature','inherited0','inherited3','bandit'];
console.log('row beats col (win% incl 0.5 draw), seat-swapped, arch-rotated');
console.log(''.padEnd(11)+pols.map(p=>p.slice(0,7).padStart(8)).join(''));
for(const a of pols){let line=a.padEnd(11);for(const b of pols){let s=0,n=0;for(let k=0;k<N;k++){for(const sw of [0,1]){const aA=L.NAMES[(k+1)%6],aB=L.NAMES[(k*5+2)%6];const m=sw?L.playMatch(E,0,0,aB,aA,`mx-${a}-${b}-${k}`,L.POLICIES[b],L.POLICIES[a]):L.playMatch(E,0,0,aA,aB,`mx-${a}-${b}-${k}`,L.POLICIES[a],L.POLICIES[b]);const w=m.outcome.winner;s+=w===null?.5:((w==='A')!==!!sw)?1:0;n++;}}line+=(100*s/n).toFixed(0).padStart(8);}console.log(line);}
