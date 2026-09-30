import {Ajv2020} from 'ajv/dist/2020.js';
import schema from '../schemas/decision-evidence.schema.json' with {type:'json'};
import {matchView,ACTIONS,canonical,type Resources} from '../engine/src/index.js';
export interface Evidence {schema_version:'dyadryn.jev.evidence.v1';question_set_id:'tactical.v1';state_hash:string;model_route:'typesafe/jev';model_version:string|null;status:'available'|'unavailable'|'invalid'|'budget_blocked';answers:Record<string,unknown>;usage:{input_tokens:number;output_tokens:number}|null;}
export interface Policy {enabled:boolean;operator_authorized:boolean;kill_switch:boolean;timeout_ms:number;day_calls:number;match_calls:number;day_tokens:number;match_tokens:number;day_cost_usd:number;match_cost_usd:number;input_price_per_million:number;}
export type View=ReturnType<typeof matchView>;
const resourceKeys=['vitality','energy','focus','heat','momentum','guard','drift'] as const;
const pickResources=(r:Resources)=>Object.fromEntries(resourceKeys.map(k=>[k,r[k]]));
export function projectTacticalState(v:View){
 return {round:v.round,ruleset_version:v.ruleset_version,own_resources:pickResources(v.actor.resources),opponent_resources:pickResources(v.opponent.resources),
  legal_families:[...new Set(v.legal_actions.map(a=>a.action))].filter(a=>(ACTIONS as readonly string[]).includes(a)),
  revealed_signals:v.revealed_signals.filter(s=>['prefers high intensity','counter-oriented','resource-preserving','information-seeking','volatile','long-horizon','likely to repeat successful lines'].includes(s)),
  recent_actions:v.recent_actions.slice(-6).map(h=>({actor:h.actor.action,opponent:h.opponent?.action??null})),
  own_adapt:v.actor.active_adapt?.stance??null,own_insight:v.actor.insight_stacks};
}
export type Question={type:'noul';instructions:string;criteria:{true:string;false:string}}|{type:'choice';instructions:string;criteria:Record<string,string>}|{type:'score';instructions:string;criteria:string[]};
export function buildQuestions(s:ReturnType<typeof projectTacticalState>):Record<string,Question>{
 return {opponent_tendency:{type:'choice',instructions:'Classify only observed public action pattern; absence of repeated observations supports unknown.',criteria:{pressure:'Repeated PRESS',defense:'Repeated GUARD',probe:'Repeated TRACE',counter:'Repeated COUNTER',recovery:'Repeated RECOVER',unknown:'No repeated observable pattern'}},
 candidate_action_family:{type:'choice',instructions:'Suggest one currently represented legal family as advisory strategy; do not compute mechanics or infer hidden state.',criteria:Object.fromEntries(s.legal_families.map(f=>[f,`Consider the supplied legal ${f} family`]))},
 tactical_risk:{type:'score',instructions:'Assess exposure from observable own vitality, heat and guard only.',criteria:['Low: vitality >=70 and heat <70 with guard available','Contested: intermediate visible exposure','High: vitality <30 or heat >=90 without guard']},
 information_sufficiency:{type:'score',instructions:'Assess public observations supporting tendency classification, never hidden information.',criteria:['Sparse: no revealed signal and fewer than two observations','Partial: some signals or a short history','Repeated: multiple public signals and repeated observed actions']},
 adaptation_warranted:{type:'noul',instructions:'Is there a repeated publicly observed action pattern warranting reconsidering strategy?',criteria:{true:'At least three public observations support a repeated pattern',false:'Public observation is insufficient or varied'}}};
}
const schemaCheck=new Ajv2020({strict:true,allowUnionTypes:true}).compile(schema);
const probability=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
export function normalizeResponse(value:unknown,hash:string,q:Record<string,Question>):Evidence{
 if(!object(value)||Object.keys(value).some(k=>!['model','answers','usage'].includes(k))||!object(value.answers))throw Error('provider_shape');
 if(Object.keys(value.answers).sort().join(',')!==Object.keys(q).sort().join(','))throw Error('question_mismatch');
 const answers:Record<string,unknown>={};
 for(const [id,question] of Object.entries(q)){
  const a=value.answers[id];if(!object(a)||a.type!==question.type)throw Error('answer_type');
  if(question.type==='noul'){if(Object.keys(a).sort().join(',')!=='noul,type'||!probability(a.noul))throw Error('invalid_noul');answers[id]={type:'noul',noul:a.noul};continue;}
  if(Object.keys(a).some(k=>!['type','choice','score','confidence','probabilities','legend'].includes(k))||!probability(a.confidence)||!object(a.probabilities))throw Error('invalid_probability');
  const labels=question.type==='choice'?Object.keys(question.criteria):question.criteria.map((_,i)=>String(i));
  if(Object.keys(a.probabilities).sort().join(',')!==labels.sort().join(',')||Object.values(a.probabilities).some(p=>!probability(p))||Math.abs(Object.values(a.probabilities).reduce<number>((n,p)=>n+Number(p),0)-1)>1e-5)throw Error('distribution');
  if(question.type==='choice'){if(typeof a.choice!=='string'||!labels.includes(a.choice)||'score'in a||'legend'in a)throw Error('choice');answers[id]={type:'choice',choice:a.choice,confidence:a.confidence,probabilities:a.probabilities};}
  else {if(typeof a.score!=='number'||!Number.isFinite(a.score)||a.score<0||a.score>question.criteria.length-1||'choice'in a)throw Error('score');
   const legend=Object.fromEntries(question.criteria.map((s,i)=>[i,s]));if(a.legend!==undefined&&canonical(a.legend)!==canonical(legend))throw Error('legend');
   answers[id]={type:'score',score:a.score,confidence:a.confidence,probabilities:a.probabilities,legend};}
 }
 if(typeof value.model!=='string'||!value.model||value.model.length>128||!object(value.usage)||Object.keys(value.usage).sort().join(',')!=='input_tokens,output_tokens')throw Error('metadata');
 const {input_tokens,output_tokens}=value.usage;
 if(!Number.isSafeInteger(input_tokens)||Number(input_tokens)<0||Number(input_tokens)>32000||!Number.isSafeInteger(output_tokens)||Number(output_tokens)<0||Number(output_tokens)>32000||Number(input_tokens)+Number(output_tokens)>32000)throw Error('usage');
 const evidence:Evidence={schema_version:'dyadryn.jev.evidence.v1',question_set_id:'tactical.v1',state_hash:hash,model_route:'typesafe/jev',model_version:value.model,status:'available',answers,usage:{input_tokens:Number(input_tokens),output_tokens:Number(output_tokens)}};
 if(!schemaCheck(evidence))throw Error('evidence_schema');return evidence;
}
export interface Counter {calls:number;tokens:number;cost:number;}
export interface Metrics {provider_calls:number;input_tokens:number;output_tokens:number;latency_ms:number;max_latency_ms:number;errors:number;estimated_cost_usd:number;}
export interface LedgerData {metrics?:Metrics;days:Record<string,Counter>;matches:Record<string,Counter>;jobs:Record<string,Evidence|null>;failures:number;openUntil:number;}
export interface LedgerStore {read():LedgerData|null;write(d:LedgerData):void;}
const counter=():Counter=>({calls:0,tokens:0,cost:0});
export class BudgetLedger {
 constructor(private readonly store:LedgerStore){}
 reserve(v:View,p:Policy,now:number):{key:string;admitted:boolean;cached?:Evidence|null}{
  if(!p.enabled||!p.operator_authorized||p.kill_switch) return {key:'disabled',admitted:false};
  const key=canonical([v.match_id,v.actor.agent_id,v.round,v.state_hash,'tactical.v1','jev.policy.v1']);
  const d=this.store.read()??{days:{},matches:{},jobs:{},failures:0,openUntil:0};
  validateLedger(d);
  if(new TextEncoder().encode(canonical(d)).byteLength>900000)return {key,admitted:false};
  if(Object.hasOwn(d.jobs,key))return {key,admitted:false,cached:d.jobs[key]};
  const day=new Date(now).toISOString().slice(0,10),dayKey=canonical(day),matchKey=canonical(v.match_id);
  const dc=d.days[dayKey]??counter(),mc=d.matches[matchKey]??counter();const cost=32000*p.input_price_per_million/1000000;
  if(!p.enabled||!p.operator_authorized||p.kill_switch||d.openUntil>now||!Object.values(p).filter(x=>typeof x==='number').every(x=>Number.isFinite(x)&&Number(x)>=0)||dc.calls+1>p.day_calls||mc.calls+1>p.match_calls||dc.tokens+32000>p.day_tokens||mc.tokens+32000>p.match_tokens||dc.cost+cost>p.day_cost_usd||mc.cost+cost>p.match_cost_usd)return {key,admitted:false};
  for(const c of [dc,mc]){c.calls++;c.tokens+=32000;c.cost+=cost;}
  d.days[dayKey]=dc;d.matches[matchKey]=mc;d.jobs[key]=null;this.store.write(d);return {key,admitted:true};
 }
 complete(key:string,e:Evidence,now:number,observation?:{providerCalled:boolean;latencyMs:number;inputPrice:number}){const d=this.store.read();if(!d||!Object.hasOwn(d.jobs,key))throw Error('missing_reservation');
  if(observation){const t=d.metrics??{provider_calls:0,input_tokens:0,output_tokens:0,latency_ms:0,max_latency_ms:0,errors:0,estimated_cost_usd:0};
   t.provider_calls+=Number(observation.providerCalled);t.input_tokens+=e.usage?.input_tokens??0;t.output_tokens+=e.usage?.output_tokens??0;t.latency_ms+=observation.latencyMs;t.max_latency_ms=Math.max(t.max_latency_ms,observation.latencyMs);t.errors+=Number(e.status!=='available');t.estimated_cost_usd+=(e.usage?.input_tokens??(observation.providerCalled?32000:0))*observation.inputPrice/1000000;d.metrics=t;
  }
  d.jobs[key]=e;if(e.status==='available')d.failures=0;else d.failures++;
  if(d.failures>=3)d.openUntil=now+60000;this.store.write(d);
 }
}
export function emptyEvidence(hash:string,status:Evidence['status']):Evidence{return {schema_version:'dyadryn.jev.evidence.v1',question_set_id:'tactical.v1',state_hash:hash,model_route:'typesafe/jev',model_version:null,status,answers:{},usage:null};}
interface LedgerPort {reserve(v:View,p:Policy,now:number):ReturnType<BudgetLedger['reserve']>|Promise<ReturnType<BudgetLedger['reserve']>>;complete(key:string,e:Evidence,now:number,observation?:{providerCalled:boolean;latencyMs:number;inputPrice:number}):void|Promise<void>;}
export async function evaluateEvidence(i:{ledger:LedgerPort;view:View;AI?:{run(route:string,input:{state:unknown;questions:Record<string,Question>}):Promise<unknown>};policy:Policy}):Promise<Evidence>{
 const now=Date.now(),deadline=i.view.deadline?Date.parse(i.view.deadline):0;
 if(!i.AI||!Number.isFinite(deadline)||deadline<=now||!i.view.legal_actions.length)return emptyEvidence(i.view.state_hash,'unavailable');
 let reservation:Awaited<ReturnType<LedgerPort['reserve']>>;
 try{reservation=await i.ledger.reserve(i.view,i.policy,now);}catch{return emptyEvidence(i.view.state_hash,'unavailable');}
 if(!reservation.admitted)return reservation.cached??emptyEvidence(i.view.state_hash,reservation.cached===null?'unavailable':'budget_blocked');
 let providerCalled=false;const started=Date.now();
 let timer:ReturnType<typeof setTimeout>|undefined;
 let evidence:Evidence;
 try{
  const state=projectTacticalState(i.view),questions=buildQuestions(state);
  if(canonical({state,questions}).length>10000)throw Error('projection_too_large');
  if(Date.now()+5>=deadline)throw Error('deadline');
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),Math.max(1,Math.min(i.policy.timeout_ms,deadline-Date.now()-5)));});
  providerCalled=true;
  const r=await Promise.race([i.AI.run('typesafe/jev',{state,questions}),timeout]);
  if(Date.now()>=deadline)throw Error('deadline');
  try{evidence=normalizeResponse(r,i.view.state_hash,questions);}catch{evidence=emptyEvidence(i.view.state_hash,'invalid');}
 }catch{evidence=emptyEvidence(i.view.state_hash,'unavailable');}finally{if(timer!==undefined)clearTimeout(timer);}
 try{await i.ledger.complete(reservation.key,evidence,Date.now(),{providerCalled,latencyMs:Date.now()-started,inputPrice:i.policy.input_price_per_million});}catch{return emptyEvidence(i.view.state_hash,'unavailable');}return evidence;
}

function validateLedger(d:LedgerData){
 if(!d||!d.days||!d.matches||!d.jobs||!Number.isSafeInteger(d.failures)||d.failures<0||!Number.isSafeInteger(d.openUntil)||d.openUntil<0)throw Error('invalid_budget_storage');
 for(const c of [...Object.values(d.days),...Object.values(d.matches)])if(!c||!Number.isSafeInteger(c.calls)||c.calls<0||!Number.isSafeInteger(c.tokens)||c.tokens<0||!Number.isFinite(c.cost)||c.cost<0)throw Error('invalid_budget_storage');
}
