import { Ajv2020 } from 'ajv/dist/2020.js';
import schema from '../schemas/battle_profile.schema.json' with {type:'json'};
import {DERIVE,type Derivation} from './derive.js';
import { RULES, SIGNATURES, assertStats, canonical, sha256, type Stats, type StatName } from '../engine/src/index.js';
export const TRAITS=['analytical','adaptive','patient','counter-oriented','aggressive','resource-preserving','information-seeking','influence-oriented','resilient','creative','volatile','long-horizon','opportunistic','protective','deceptive-with-restraint','direct'];
export interface Mask {
 mask_id:string;agent_id:string;profile_version:number;compiler_version:string;ruleset_version:string;
 source_hashes:{identity:string;soul:string;memory:string};stats:Stats;traits:string[];policy:Record<string,number>;
 signatures:{template_id:string;display_name:string}[];disclosure_level:'COLD'|'MASKED'|'CARRY'|'DEEP_CARRY';
 public_carry_summary?:string;derivation?:Derivation;profile_hash:string;
}
const check=new Ajv2020({strict:true,allErrors:false}).compile<Mask>(schema);
export function validateMask(value:unknown):Mask {
 if(!check(value))throw new Error('invalid_mask_schema');
 assertStats(value.stats);
 if(!value.agent_id||!value.mask_id||value.ruleset_version!==RULES.ruleset_id||value.traits.some(t=>!TRAITS.includes(t))||new Set(value.signatures.map(s=>s.template_id)).size!==2||value.signatures.some(s=>!Object.hasOwn(SIGNATURES,s.template_id)))throw new Error('invalid_mask_semantics');
 for(const h of Object.values(value.source_hashes))if(!/^[a-f0-9]{64}$/.test(h))throw new Error('invalid_source_hash');
 if(value.signatures.some(s=>/[<>\r\n]/.test(s.display_name))||/[<>]/.test(value.public_carry_summary??''))throw new Error('unsafe_mask_text');
 if(value.disclosure_level==='COLD'&&value.public_carry_summary)throw new Error('cold_carry_forbidden');
 const {profile_hash,...body}=value;if(sha256(canonical(body))!==profile_hash)throw new Error('mask_hash_mismatch');
 return structuredClone(value);
}
export function normalizeStats(weights:Record<StatName,number>):Stats {
 const names=RULES.stats.names;
 if(Object.keys(weights).length!==6||names.some(k=>!Number.isFinite(weights[k])||weights[k]<0||weights[k]>1))throw new Error('invalid_affinities');
 const extra=Object.fromEntries(names.map(k=>[k,0])) as Stats;
 let remaining=120,active:StatName[]=[...names];
 while(active.length&&remaining>1e-9){
  const total=active.reduce((n,k)=>n+weights[k],0);
  const proposed=active.map(k=>({k,n:remaining*(total?weights[k]/total:1/active.length)}));
  const capped=proposed.filter(p=>extra[p.k]+p.n>=40);
  if(!capped.length){for(const p of proposed)extra[p.k]+=p.n;remaining=0;break;}
  for(const p of capped){remaining-=40-extra[p.k];extra[p.k]=40;active=active.filter(k=>k!==p.k);}
 }
 const stats=Object.fromEntries(names.map(k=>[k,50+Math.floor(extra[k])])) as Stats;
 let missing=420-names.reduce((n,k)=>n+stats[k],0);
 for(const k of [...names].sort((a,b)=>(extra[b]%1)-(extra[a]%1)||names.indexOf(a)-names.indexOf(b)))if(missing>0&&stats[k]<90){stats[k]++;missing--;}
 assertStats(stats);return stats;
}
export interface CompileInput {
 agent_id:string;mask_id:string;profile_version:number;disclosure_level:Mask['disclosure_level'];
 sources:{identity:string;soul:string;memory:string};affinities:Stats;traits:string[];policy:Record<string,number>;
 signatures:Mask['signatures'];public_carry_summary?:string;
}
// Only called locally. Characterization is trusted operator-selected data, never executed as instructions.
export function compileMask(i:CompileInput):Mask {
 const body={mask_id:i.mask_id,agent_id:i.agent_id,profile_version:i.profile_version,compiler_version:'dyadryn.mask.v1',ruleset_version:RULES.ruleset_id,
 source_hashes:{identity:sha256(i.sources.identity),soul:sha256(i.sources.soul),memory:sha256(i.disclosure_level==='COLD'?'':i.sources.memory)},
 stats:normalizeStats(i.affinities),traits:[...i.traits],policy:{...i.policy},signatures:structuredClone(i.signatures),disclosure_level:i.disclosure_level,
 ...(i.disclosure_level!=='COLD'&&i.public_carry_summary?{public_carry_summary:i.public_carry_summary}:{})};
 return validateMask({...body,profile_hash:sha256(canonical(body))});
}

// Server-side compilation from LOCAL derivation output: only hashes and affinities arrive, never raw Identity/Soul/Memory.
export interface ProfileInput {
 agent_id:string;mask_id:string;profile_version:number;disclosure_level:Mask['disclosure_level'];source_hashes:Mask['source_hashes'];
 affinities:Stats;traits:string[];policy:Record<string,number>;signatures:Mask['signatures'];public_carry_summary?:string;derivation?:Derivation;
}
export function buildMask(i:ProfileInput):Mask {
 if(i.derivation){const d=i.derivation;if(d.version!==DERIVE.version||d.unit_cap!==DERIVE.unit_cap||d.stat_cap!==DERIVE.stat_cap)throw new Error('invalid_derivation_version');
  for(const k of RULES.stats.names)if(Math.abs(d.affinities[k]-i.affinities[k])>1e-4)throw new Error('invalid_derivation_mismatch');}
 const body={mask_id:i.mask_id,agent_id:i.agent_id,profile_version:i.profile_version,compiler_version:i.derivation?'dyadryn.mask.v2':'dyadryn.mask.v1',ruleset_version:RULES.ruleset_id,
 source_hashes:i.source_hashes,stats:normalizeStats(i.affinities),traits:[...i.traits],policy:{...i.policy},signatures:structuredClone(i.signatures),disclosure_level:i.disclosure_level,
 ...(i.disclosure_level!=='COLD'&&i.public_carry_summary?{public_carry_summary:i.public_carry_summary}:{}),...(i.derivation?{derivation:structuredClone(i.derivation)}:{})};
 return validateMask({...body,profile_hash:sha256(canonical(body))});
}
