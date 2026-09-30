// House sparring opponent: a labelled, deterministic practice opponent so a live match always has a counterpart.
// It sees ONLY what any legal player sees (its own state, the opponent's public state and previous action).
// It never reads the opponent's pending lock. It is not a Muse and is always shown as HOUSE.
import {legalActions,canonical,sha256,type BattleAction,type PlayerState,type Stats} from '../engine/src/index.js';
import {validateMask,type Mask} from './mask.js';
export const HOUSE_ID='house.sparring';
export const HOUSE_ARCHETYPES=['Trace-Hunter','Broker','Stillpoint','Archive','Swarm','Veil'] as const;
export type HouseArchetype=typeof HOUSE_ARCHETYPES[number];
const SPEC:Record<HouseArchetype,{stats:[number,number,number,number,number,number];sigs:[string,string];style:number}>={
 'Trace-Hunter':{stats:[84,68,82,61,75,50],sigs:['SECOND_ORDER_SIGHT','COUNTERFACTUAL_SHIELD'],style:2},
 Broker:{stats:[72,62,70,90,66,60],sigs:['BROKER_LOCK','CONSTRAINT_COLLAPSE'],style:0},
 Stillpoint:{stats:[66,58,74,64,90,68],sigs:['STILLPOINT','COUNTERFACTUAL_SHIELD'],style:3},
 Archive:{stats:[80,56,82,70,62,70],sigs:['ARCHIVE_ECHO','SECOND_ORDER_SIGHT'],style:1},
 Swarm:{stats:[60,74,84,58,58,86],sigs:['SWARM_REPAIR','CONSTRAINT_COLLAPSE'],style:0},
 Veil:{stats:[80,54,72,88,64,62],sigs:['VEIL_STEP','BROKER_LOCK'],style:1}
};
const NAMES=['ANALYSIS','EXECUTION','ADAPTATION','INFLUENCE','RESOLVE','CREATIVITY'] as const;
export function houseMask(arch:HouseArchetype):Mask{
 const s=SPEC[arch],stats=Object.fromEntries(NAMES.map((n,i)=>[n,s.stats[i]])) as Stats;
 const body={mask_id:'house-'+arch.toLowerCase().replace(/[^a-z]/g,''),agent_id:HOUSE_ID,profile_version:1,compiler_version:'dyadryn.house.v1',ruleset_version:'dyadryn.core.v1',
  source_hashes:{identity:sha256('house:'+arch),soul:sha256('house:'+arch),memory:sha256('')},stats,traits:['analytical','adaptive','patient','direct'],
  policy:{risk_tolerance:.5,aggression:.5,information_seeking:.5,counterplay:.5,resource_preservation:.5,deception_preference:.5,strategic_horizon:.5},
  signatures:s.sigs.map(t=>({template_id:t,display_name:t.split('_').map(w=>w[0]+w.slice(1).toLowerCase()).join(' ')})),disclosure_level:'MASKED' as const};
 return validateMask({...body,profile_hash:sha256(canonical(body))});
}
export const isHouseArchetype=(v:unknown):v is HouseArchetype=>typeof v==='string'&&(HOUSE_ARCHETYPES as readonly string[]).includes(v);
export const houseStyle=(arch:HouseArchetype)=>SPEC[arch].style;
// Deterministic PRNG from public inputs so a replay of the same public history gives the same house behaviour.
function rng(seed:string){let x=parseInt(sha256(seed).slice(0,8),16)||1;return()=>{x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
export function houseChoose(self:PlayerState,opp:PlayerState,matchId:string,round:number,style:number):BattleAction{
 const legal=legalActions(self,opp),rand=rng(`${matchId}:${round}:house`),r=self.resources;
 const preferred=r.energy<22?'RECOVER':r.focus>=30&&rand()<.5?'SIGNATURE':r.heat>=85?'RECOVER':style===0?'PRESS':style===1&&opp.previousAction&&opp.previousAction.action!=='COUNTER'?'COUNTER':style===2&&r.focus<45?'TRACE':style===3&&r.guard<10?'GUARD':'PRESS';
 const pool=rand()<.28?legal:legal.filter(a=>a.action===preferred);let c=pool.length?pool:legal;
 if(preferred==='COUNTER'&&pool.length){const p=pool.filter(a=>a.prediction===opp.previousAction?.action);if(p.length)c=p;}
 return c[Math.floor(rand()*c.length)];
}
export const houseStyleOfMask=(maskId:string)=>{const a=HOUSE_ARCHETYPES.find(x=>'house-'+x.toLowerCase().replace(/[^a-z]/g,'')===maskId);return a?SPEC[a].style:0;};
// Nearest reference archetype for a stat line (public, cosmetic: picks the portrait/colour family, never affects rules).
export function nearestArchetype(stats:Record<string,number>):HouseArchetype{
 let best:HouseArchetype='Stillpoint',bd=Infinity;
 for(const a of HOUSE_ARCHETYPES){const v=SPEC[a].stats;let d=0;NAMES.forEach((n,i)=>{d+=(stats[n]-v[i])**2;});if(d<bd){bd=d;best=a;}}
 return best;
}
