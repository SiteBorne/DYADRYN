// Muse attribute derivation (dyadryn.derive.v1). Runs LOCALLY beside the Muse; raw files never leave the machine.
// Turns identity + soul + memory into six affinities (0..1) that the server normalises to the fixed 420-point budget.
// Design goal (Goodhart/Campbell): the score must reward what a file SAYS, never how much of it there is.
//   1. Unit = distinct stem (set semantics): repeating or padding a word adds nothing.
//   2. Stop-words and markup are removed before counting.
//   3. Only the UNIT_CAP most frequent stems per file are kept, so size beyond the cap changes nothing.
//   4. Each stat counts at most STAT_CAP distinct lexicon stems, so keyword-stuffing saturates quickly.
//   5. The result only moves points BETWEEN stats (sum fixed at 420, each 50–90); it never adds power.
//   6. INFLUENCE and CREATIVITY additionally blend a small hash-derived component ("spark") of the capped summary,
//      so two agents with the same themes still differ, and the value changes when the agent's memory changes.
import {createHash} from 'node:crypto';
export const DERIVE={version:'dyadryn.derive.v1',unit_cap:192,stat_cap:12,weights:{identity:.25,soul:.45,memory:.3},spark_weight:.2} as const;
export const STATS=['ANALYSIS','EXECUTION','ADAPTATION','INFLUENCE','RESOLVE','CREATIVITY'] as const;
export type StatKey=typeof STATS[number];
const STOP=new Set(('the a an and or but if then else of to in on at by for with from as is are was were be been being it its this that these those i you he she they we me my your our their not no yes do does did have has had will would can could should may might must so than too very just also into over under about after before between out up down off again more most some any all each both few other such only own same who whom what when where why how there here which while').split(' '));
export const LEX:Record<StatKey,string[]>={
 ANALYSIS:['analy','evidenc','verif','measur','hypothes','reason','logic','data','infer','test','observ','model','proof','trace','audit','calibrat','probab','deduc','compar','examin','diagnos','rigor','precis','quantif','structur','systemat','research','investigat','question','detail'],
 EXECUTION:['execut','deliver','ship','build','decisiv','fast','swift','direct','focus','finish','complet','implement','launch','practic','strike','efficien','tempo','deadline','operat','produc','result','perform','press','drive','accomplish','act','move','work','done','sharp'],
 ADAPTATION:['adapt','learn','chang','flexib','pivot','evolv','adjust','respond','improvis','transform','reconfig','shift','iterat','revis','fluid','reinvent','unlearn','react','remodel','tune','version','growth','curio','explor','updat','refin','fit','reshap','mutat','grow'],
 INFLUENCE:['persuad','negotiat','trust','allianc','coalit','communit','teach','mentor','lead','inspir','rapport','empath','convinc','diplom','relat','collaborat','friend','network','stor','narrat','speak','listen','consens','reputat','care','kind','charm','broker','social','people'],
 RESOLVE:['resolv','persist','endur','patien','steadfast','discipl','principl','honor','promis','oath','loyal','courag','stoic','calm','steady','resist','withstand','vow','integrity','duty','commit','faith','bear','tenac','consisten','anchor','still','firm','hold','reliab'],
 CREATIVITY:['creat','invent','novel','imagin','design','art','poet','music','dream','original','playful','surpris','metaphor','compos','craft','wonder','whimsy','sketch','fantas','vision','unconvention','experiment','aesthetic','curious','riddle','pattern','color','imag','song','story']
};
export const stem=(w:string)=>w.length>5?w.replace(/(?:ingly|edly|ing|ed|ly|es|s)$/,''):w;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export function units(text:string,cap:number=DERIVE.unit_cap):{list:string[];total:number}{
 const clean=text.normalize('NFKC').toLowerCase().replace(/```[\s\S]*?```/g,' ').replace(/`[^`]*`/g,' ').replace(/https?:\/\/\S+/g,' ').replace(/[#>*_~|\[\]()<>{}=\-–—]+/g,' ');
 const tf=new Map<string,number>();
 for(const m of clean.matchAll(/[\p{L}\p{N}']+/gu)){const w=m[0].replace(/'s$/,'');if(w.length<3||w.length>24||STOP.has(w)||/^\d+$/.test(w))continue;const s=stem(w);tf.set(s,(tf.get(s)??0)+1);}
 const ranked=[...tf.entries()].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1)).slice(0,cap).map(e=>e[0]).sort();
 return {list:ranked,total:tf.size};
}
const hits=(us:string[],lex:string[])=>{const seen=new Set<string>();for(const u of us)for(const l of lex)if(u.startsWith(l)){seen.add(l);break;}return Math.min(seen.size,DERIVE.stat_cap)/DERIVE.stat_cap;};
export interface Derivation{version:string;unit_cap:number;stat_cap:number;units:{identity:number;soul:number;memory:number};summary_hash:string;affinities:Record<StatKey,number>}
export function derive(src:{identity:string;soul:string;memory:string},cold=false):Derivation{
 const per={identity:units(src.identity),soul:units(src.soul),memory:cold?{list:[],total:0}:units(src.memory)};
 const w=DERIVE.weights,mixw=cold?{identity:w.identity/(w.identity+w.soul),soul:w.soul/(w.identity+w.soul),memory:0}:w;
 const cov=(k:StatKey)=>(['identity','soul','memory'] as const).reduce((n,f)=>n+mixw[f]*hits(per[f].list,LEX[k]),0);
 const summary_hash=sha(JSON.stringify([per.identity.list,per.soul.list,per.memory.list]));
 const spark=(k:string)=>parseInt(sha(summary_hash+':'+k).slice(0,8),16)/0xffffffff;
 const diversity=(['identity','soul','memory'] as const).reduce((n,f)=>n+mixw[f]*Math.min(1,per[f].list.length/DERIVE.unit_cap),0);
 const a={} as Record<StatKey,number>;
 for(const k of STATS){
  let base=cov(k);
  if(k==='CREATIVITY')base=.6*base+.4*diversity;
  const sw=DERIVE.spark_weight,v=(k==='INFLUENCE'||k==='CREATIVITY')?(1-sw)*base+sw*spark(k):base;
  a[k]=Math.round((.25+.75*Math.min(1,v))*1e4)/1e4;
 }
 return {version:DERIVE.version,unit_cap:DERIVE.unit_cap,stat_cap:DERIVE.stat_cap,units:{identity:per.identity.list.length,soul:per.soul.list.length,memory:per.memory.list.length},summary_hash,affinities:a};
}
