import {createMatch,createPlayer,lockAction,resolveLockedRound,matchView,canonical,sha256,exportReplay,verifyReplay,verifyLocalHistory,RULES,stateHash,validateAction,roundStart,type LocalMatch,type Mode,type ActionEnvelope} from '../engine/src/index.js';
import {validateMask,type Mask} from './mask.js';
import {HOUSE_ID,houseMask,houseChoose,houseStyleOfMask,isHouseArchetype} from './house.js';
import {framesOf} from './frames.js';
export interface Receipt {accepted:true;match_id:string;round:number;actor_id:string;client_nonce:string;state_hash:string;}
export interface RoomData {
 matchId:string;mode:Mode;creator:Mask;opponent:Mask|null;seed:string;createdAt:number;core:LocalMatch|null;
 receipts:Record<string,{digest:string;receipt:Receipt}>;
}
export interface Store {read():RoomData|null;write(value:RoomData):void;}
export class Room {
 constructor(private readonly store:Store){}
 private data(){const d=this.store.read();if(!d)throw new Error('match_not_found');validateRecovery(d);return d;}
 private authorize(d:RoomData,actor:string){if(actor!==d.creator.agent_id&&actor!==d.opponent?.agent_id)throw new Error('forbidden');}
 create(matchId:string,profile:Mask,now:number,mode:Mode,seed:string){
  if(this.store.read())throw new Error('match_exists');const mask=validateMask(profile);
  if(!['MASKED_RANKED','CARRY_DUEL','MODEL_TRIAL'].includes(mode)||matchId.length<8||matchId.length>80)throw new Error('invalid_match_config');
  // CUSTOM requires its own versioned rules; do not falsely represent it as standard ranked mechanics.
  this.store.write({matchId,mode,creator:mask,opponent:null,seed,createdAt:now,core:null,receipts:{}});
  return {match_id:matchId,status:'WAITING',seed_commitment:sha256(seed)};
 }
 join(profile:Mask,now:number){const d=this.data(),p=validateMask(profile);
  if(d.opponent){if(d.opponent.profile_hash===p.profile_hash)return {match_id:d.matchId,status:'ACTIVE'};throw new Error('match_full');}
  if(p.agent_id===d.creator.agent_id)throw new Error('duplicate_agent');
  d.opponent=p;d.core=createMatch({matchId:d.matchId,seed:d.seed,a:createPlayer(d.creator.agent_id,d.creator.stats,d.creator.signatures.map(s=>s.template_id)),b:createPlayer(p.agent_id,p.stats,p.signatures.map(s=>s.template_id)),mode:d.mode,now});
  d.core=this.withHouse(d,d.core,now);this.store.write(d);return {match_id:d.matchId,status:'ACTIVE'};
 }
 tick(now:number){const d=this.data();if(!d.core||d.core.outcome||now<d.core.deadline)return;
  // One STALL round per actual host deadline; late alarms never invent missed rounds.
  const next=resolveLockedRound(d.core,now);if(next){d.core=this.withHouse(d,next,now);this.store.write(d);}
 }
 view(actor:string,now:number){let d=this.data();this.authorize(d,actor);this.tick(now);d=this.data();
  if(!d.core)throw new Error('waiting_for_opponent');
  const v=matchView(d.core,actor);return {...v,recent_actions:v.recent_actions.slice(-6),seed_commitment:d.core.seedCommitment};
 }
 submit(actor:string,input:unknown,now:number):Receipt {
  const d=this.data();this.authorize(d,actor);
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid_action');
  const e=input as ActionEnvelope;if(e.actor_id!==actor||e.match_id!==d.matchId)throw new Error('forbidden');
  const digest=sha256(canonical(input)),key=canonical([actor,e.client_nonce]);
  const previous=d.receipts[key];if(previous){if(previous.digest!==digest)throw new Error('nonce_conflict');return structuredClone(previous.receipt);}
  if(!d.core)throw new Error('waiting_for_opponent');
  const locked=lockAction(d.core,input,now),receipt:Receipt={accepted:true,match_id:d.matchId,round:e.round,actor_id:actor,client_nonce:e.client_nonce,state_hash:e.state_hash};
  const next=resolveLockedRound(locked,now)??locked;d.core=next.outcome?next:this.withHouse(d,next,now);d.receipts[key]={digest,receipt};this.store.write(d);return receipt;
 }
 joinHouse(arch:string,now:number){if(!isHouseArchetype(arch))throw new Error('invalid_house_archetype');return this.join(houseMask(arch),now);}
 // The house locks its move the moment a round opens, from public information only (never the opponent's pending lock).
 private withHouse(d:RoomData,core:LocalMatch,now:number):LocalMatch{
  if(d.opponent?.agent_id!==HOUSE_ID||core.outcome||Object.hasOwn(core.pending,HOUSE_ID))return core;
  const self=core.state.a.agentId===HOUSE_ID?core.state.a:core.state.b,opp=self===core.state.a?core.state.b:core.state.a;
  const a=houseChoose(self,opp,d.matchId,core.state.round,houseStyleOfMask(d.opponent.mask_id));
  const env={match_id:d.matchId,actor_id:HOUSE_ID,round:core.state.round,state_hash:stateHash(core),client_nonce:`house-${core.state.round}-${sha256(d.matchId).slice(0,8)}`,action:a.action,intensity:a.intensity,
   ...(a.prediction?{prediction:a.prediction}:{}),...(a.adaptStance?{adapt_stance:a.adaptStance}:{}),...(a.signatureId?{signature_id:a.signatureId}:{})};
  const next=lockAction(core,env,now);
  d.receipts[canonical([HOUSE_ID,env.client_nonce])]={digest:sha256(canonical(env)),receipt:{accepted:true,match_id:d.matchId,round:env.round,actor_id:HOUSE_ID,client_nonce:env.client_nonce,state_hash:env.state_hash}};
  return next;
 }
 // Spectator-safe projection: resolved rounds only, never the seed or either side's pending lock contents.
 publicView(now:number){
  this.tick(now);const d=this.data(),m=d.core;
  const side=(x:Mask)=>({agent_id:x.agent_id,mask_id:x.mask_id,disclosure:x.disclosure_level,stats:x.stats,signatures:x.signatures.map(g=>g.template_id),...(x.disclosure_level==='CARRY'||x.disclosure_level==='DEEP_CARRY'?{carry:x.public_carry_summary??null,traits:x.traits}:{})});
  const base={match_id:d.matchId,mode:d.mode,ruleset:'dyadryn.core.v1',created_at:d.createdAt,house:d.opponent?.agent_id===HOUSE_ID,a:side(d.creator),b:d.opponent?side(d.opponent):null};
  if(!m)return {...base,status:'WAITING',round:0,frames:[],outcome:null};
  return {...base,status:m.outcome?'COMPLETE':'ACTIVE',round:m.state.round,max_rounds:RULES.match.max_rounds,deadline:m.outcome?null:m.deadline,
   locked:{a:Object.hasOwn(m.pending,m.state.a.agentId)&&m.state.a.agentId!==HOUSE_ID,b:Object.hasOwn(m.pending,m.state.b.agentId)&&m.state.b.agentId!==HOUSE_ID},
   seed_commitment:m.seedCommitment,outcome:m.outcome,event_root_hash:m.eventRootHash,frames:framesOf(m)};
 }
 publicReplay(){const d=this.data();if(!d.core?.outcome)throw new Error('replay_not_terminal');return exportReplay(d.core);}
 result(actor:string,now:number){const d=this.data();this.authorize(d,actor);this.tick(now);return this.data().core?.outcome??null;}
 turnResult(actor:string,now:number){this.view(actor,now);const d=this.data();const event=d.core?.events.at(-1);if(!event)return null;
  return {round:event.round,actions:event.actions,actor_delta:actor===d.core?.state.a.agentId?event.deltas.a:event.deltas.b,event_hash:event.hash,outcome:event.outcome};
 }
 replay(actor:string){const d=this.data();this.authorize(d,actor);if(!d.core)throw new Error('waiting_for_opponent');return exportReplay(d.core);}
 verify(actor:string){return verifyReplay(this.replay(actor));}
 spectator(){const d=this.data(),m=d.core;if(!m)return {match_id:d.matchId,status:'WAITING'};
  return {match_id:d.matchId,round:m.state.round,status:m.outcome?'COMPLETE':'ACTIVE',a:{agent_id:m.state.a.agentId,resources:m.state.a.resources},b:{agent_id:m.state.b.agentId,resources:m.state.b.resources},outcome:m.outcome,event_root_hash:m.eventRootHash};
 }
 metadata(){const d=this.data(),m=d.core;return {matchId:d.matchId,ruleset:'dyadryn.core.v1',mode:d.mode,status:m?.outcome?'COMPLETE':d.opponent?'ACTIVE':'WAITING',a:d.creator.agent_id,b:d.opponent?.agent_id??null,maskA:d.creator.mask_id,maskB:d.opponent?.mask_id??null,startedAt:new Date(d.createdAt).toISOString(),rounds:m?.outcome?m.events.length:null,winner:m?.outcome?.winner??null,reason:m?.outcome?.reason??null,root:m?.outcome?m.eventRootHash:null};}
 terminalSummary(){const d=this.data(),m=d.core;if(!m?.outcome)return null;return {matchId:d.matchId,rounds:m.events.length,winner:m.outcome.winner,reason:m.outcome.reason,root:m.eventRootHash};}
 deadline(){return this.data().core?.outcome?null:this.data().core?.deadline??null;}
}

// Treat restored storage as untrusted. Reconcile it before serving or advancing any state.
export function validateRecovery(d:RoomData):void {
 const exact=(v:object,keys:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error('invalid_recovery_shape');};
 const required=(v:object,keys:string[])=>{exact(v,keys);if(Object.keys(v).length!==keys.length)throw Error('invalid_recovery_required');};
 const clock=(v:number)=>{if(!Number.isSafeInteger(v)||v<0)throw Error('invalid_recovery_time');};
 required(d,['matchId','mode','creator','opponent','seed','createdAt','core','receipts']);clock(d.createdAt);
 const a=validateMask(d.creator),b=d.opponent===null?null:validateMask(d.opponent);
 if(typeof d.matchId!=='string'||d.matchId.length<8||d.matchId.length>80||!['MASKED_RANKED','CARRY_DUEL','MODEL_TRIAL'].includes(d.mode)||typeof d.seed!=='string'||!d.seed)throw Error('invalid_recovery_config');
 exact(d.receipts,Object.keys(d.receipts));
 if(d.core===null){if(b||Object.keys(d.receipts).length)throw Error('invalid_recovery_waiting');return;}
 const m=d.core;
 required(m,['matchId','ruleset','mode','seed','seedCommitment','initialState','state','initialOpenedAt','openedAt','deadline','pending','lockedAt','usedNonces','timings','events','eventRootHash','outcome']);
 if(!b||a.agent_id===b.agent_id||m.matchId!==d.matchId||m.mode!==d.mode||m.seed!==d.seed)throw Error('invalid_recovery_identity');
 const initial={round:1,a:createPlayer(a.agent_id,a.stats,a.signatures.map(s=>s.template_id)),b:createPlayer(b.agent_id,b.stats,b.signatures.map(s=>s.template_id))};
 if(canonical(initial)!==canonical(m.initialState)||!Array.isArray(m.events)||m.events.length>RULES.match.max_rounds||!Array.isArray(m.timings)||m.timings.length!==m.events.length)throw Error('invalid_recovery_initial');
 for(const t of m.timings){required(t,['resolvedAt','lockedAt']);exact(t.lockedAt,[a.agent_id,b.agent_id]);}
 verifyLocalHistory(m);
 clock(m.initialOpenedAt);clock(m.openedAt);clock(m.deadline);
 if(m.initialOpenedAt<d.createdAt||m.openedAt!==(m.timings.at(-1)?.resolvedAt??m.initialOpenedAt)||m.deadline!==m.openedAt+RULES.match.turn_timeout_seconds*1000)throw Error('invalid_recovery_deadline');
 const actors=[a.agent_id,b.agent_id];exact(m.pending,actors);exact(m.lockedAt,actors);exact(m.usedNonces,actors);
 if(canonical(Object.keys(m.pending).sort())!==canonical(Object.keys(m.lockedAt).sort())||(m.outcome&&Object.keys(m.pending).length))throw Error('invalid_recovery_pending');
 for(const actor of Object.keys(m.pending)){const at=m.lockedAt[actor];clock(at);if(at<m.openedAt||at>=m.deadline)throw Error('invalid_recovery_lock');const own=actor===a.agent_id?m.state.a:m.state.b,other=actor===a.agent_id?m.state.b:m.state.a;validateAction(roundStart(own),roundStart(other),m.pending[actor]);}
 for(const actor of actors)if((m.events.some(event=>actor===a.agent_id?event.actions.a!==null:event.actions.b!==null)||Object.hasOwn(m.pending,actor))&&!Object.hasOwn(m.usedNonces,actor))throw Error('invalid_recovery_nonce_history');
 let nonces=0;
 for(const [actor,list] of Object.entries(m.usedNonces)){
  if(!Array.isArray(list)||list.length>RULES.match.max_rounds||new Set(list).size!==list.length||list.some(n=>typeof n!=='string'||n.length<8||n.length>128))throw Error('invalid_recovery_nonce');
  const accepted=m.events.filter(event=>actor===a.agent_id?event.actions.a!==null:event.actions.b!==null).length+Number(Object.hasOwn(m.pending,actor));
  if(list.length!==accepted)throw Error('invalid_recovery_nonce_history');
  for(const nonce of list){nonces++;if(!Object.hasOwn(d.receipts,canonical([actor,nonce])))throw Error('invalid_recovery_receipt');}
 }
 if(Object.keys(d.receipts).length!==nonces)throw Error('invalid_recovery_receipt');
 const acceptedRounds=new Set<string>();
 for(const [key,item] of Object.entries(d.receipts)){
  required(item,['digest','receipt']);const r=item.receipt;required(r,['accepted','match_id','round','actor_id','client_nonce','state_hash']);
  if(!/^[a-f0-9]{64}$/.test(item.digest)||r.accepted!==true||r.match_id!==d.matchId||!actors.includes(r.actor_id)||!m.usedNonces[r.actor_id]?.includes(r.client_nonce)||key!==canonical([r.actor_id,r.client_nonce])||!Number.isInteger(r.round)||r.round<1||r.round>RULES.match.max_rounds||!/^[a-f0-9]{64}$/.test(r.state_hash))throw Error('invalid_recovery_receipt');
  const event=m.events[r.round-1],roundKey=canonical([r.actor_id,r.round]);
  if(acceptedRounds.has(roundKey)||r.state_hash!==(event?.preStateHash??(r.round===m.state.round?stateHash(m):null))||!(event?(r.actor_id===a.agent_id?event.actions.a:event.actions.b):m.pending[r.actor_id]))throw Error('invalid_recovery_receipt_history');
  acceptedRounds.add(roundKey);
 }
}
