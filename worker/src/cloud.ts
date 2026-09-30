import {DurableObject} from 'cloudflare:workers';
import {Room,type RoomData} from './application.js';
import {BudgetLedger,type LedgerData,type Evidence,type Policy,type View,emptyEvidence} from './jev.js';
import type {Mask} from './mask.js';
import {canonical,sha256,verifyReplay,type Mode} from '../engine/src/index.js';
export interface Env {
 DB:D1Database;MATCH_ROOMS:DurableObjectNamespace<MatchRoom>;EVIDENCE_BUDGET:DurableObjectNamespace<EvidenceBudget>;
 AI?:{run(route:string,input:Record<string,unknown>):Promise<unknown>};
 ENVIRONMENT:string;PUBLIC_ORIGIN:string;OPEN_REGISTRATION?:string;MAX_DAILY_REGISTRATIONS?:string;RECAP_LIVE_ENABLED?:string;RECAP_MODEL?:string;ADMIN_TOKEN_SHA256?:string;JEV_LIVE_ENABLED?:string;JEV_OPERATOR_AUTHORIZED?:string;JEV_KILL_SWITCH?:string;
 JEV_DAY_CALLS?:string;JEV_MATCH_CALLS?:string;JEV_DAY_TOKENS?:string;JEV_MATCH_TOKENS?:string;JEV_DAY_COST_USD?:string;JEV_MATCH_COST_USD?:string;JEV_INPUT_PRICE_PER_MILLION?:string;JEV_TIMEOUT_MS?:string;
}
export class MatchRoom extends DurableObject<Env>{
 private room:Room;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);
  ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)');
  ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS publication(id INTEGER PRIMARY KEY CHECK(id=1),fingerprint TEXT NOT NULL)');
  this.room=new Room({read:()=>{const rows=ctx.storage.sql.exec<{data:string}>('SELECT data FROM room WHERE id=1').toArray();return rows.length?JSON.parse(rows[0].data) as RoomData:null;},write:d=>{ctx.storage.sql.exec('INSERT INTO room(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(d));}});
 }
 private async schedule(){
  for(;;){
   const summary=this.room.metadata(),fingerprint=sha256(canonical(summary));
   const ack=this.ctx.storage.sql.exec<{fingerprint:string}>('SELECT fingerprint FROM publication WHERE id=1').toArray()[0]?.fingerprint;
   if(ack!==fingerprint){
    // Outbox: arm durable retry before any non-hot D1 publication. Idempotent upsert survives interruption.
    await this.ctx.storage.setAlarm(Date.now()+5000);await materializeMetadata(this.env,summary);
    this.ctx.storage.sql.exec('INSERT INTO publication(id,fingerprint) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET fingerprint=excluded.fingerprint',fingerprint);
    if(sha256(canonical(this.room.metadata()))!==fingerprint)continue;
   }
   const deadline=this.room.deadline();if(deadline===null)await this.ctx.storage.deleteAlarm();else await this.ctx.storage.setAlarm(deadline);return;
  }
 }
 async create(id:string,p:Mask,mode:Mode,house?:string){const r=this.room.create(id,p,Date.now(),mode,crypto.randomUUID()+crypto.randomUUID());if(house){this.room.joinHouse(house,Date.now());await this.schedule();return {...r,status:'ACTIVE',opponent:'HOUSE'};}await this.schedule();return r;}
 async publicView(){const r=this.room.publicView(Date.now());await this.schedule();return r;}
 publicReplay(){return this.room.publicReplay();}
 publicVerify(){return verifyReplay(this.room.publicReplay());}
 async join(p:Mask){const r=this.room.join(p,Date.now());await this.schedule();return r;}
 async view(actor:string){const r=this.room.view(actor,Date.now());await this.schedule();return r;}
 async submit(actor:string,input:unknown){const r=this.ctx.storage.transactionSync(()=>this.room.submit(actor,input,Date.now()));await this.schedule();this.broadcast();return r;}
 async result(actor:string){const r=this.room.result(actor,Date.now());await this.schedule();return r;}
 async turnResult(actor:string){const r=this.room.turnResult(actor,Date.now());await this.schedule();return r;}
 replay(actor:string){return this.room.replay(actor);}
 verify(actor:string){return this.room.verify(actor);}
 async spectator(actor:string){this.room.view(actor,Date.now());await this.schedule();return this.room.spectator();}
 async alarm(){try{this.room.tick(Date.now());await this.schedule();this.broadcast();}catch(error){throw error;}}
 private broadcast(){if(!this.ctx.getWebSockets().length)return;let view:unknown;try{view=this.room.publicView(Date.now());}catch{return;}const data=JSON.stringify({type:'public_state',data:view});for(const ws of this.ctx.getWebSockets())try{ws.send(data);}catch{ws.close(1011,'connection lost');}}
 async fetch(request:Request){const actor=request.headers.get('X-Dyadryn-Actor'),pub=request.headers.get('X-Dyadryn-Public')==='1';if(!actor&&!pub)return Response.json({error:'forbidden'},{status:403});
  if(actor)this.room.view(actor,Date.now());else this.room.publicView(Date.now());await this.schedule();if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return Response.json({error:'upgrade_required'},{status:426});
  const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].send(JSON.stringify({type:'public_state',data:this.room.publicView(Date.now())}));return new Response(null,{status:101,webSocket:pair[0]});
 }
 webSocketMessage(ws:WebSocket,_message:string|ArrayBuffer){ws.close(1008,'read-only stream');}
 webSocketClose(ws:WebSocket,code:number,reason:string){ws.close(code,reason);}
}
export class EvidenceBudget extends DurableObject<Env>{
 private ledger:BudgetLedger;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS budget(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL)');
 this.ledger=new BudgetLedger({read:()=>{const r=ctx.storage.sql.exec<{data:string}>('SELECT data FROM budget WHERE id=1').toArray();return r.length?JSON.parse(r[0].data) as LedgerData:null;},write:d=>{ctx.storage.sql.exec('INSERT INTO budget(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(d));}});
 }
 reserve(v:View,p:Policy,now:number){return this.ctx.storage.transactionSync(()=>this.ledger.reserve(v,p,now));}
 complete(key:string,e:Evidence,now:number,observation?:{providerCalled:boolean;latencyMs:number;inputPrice:number}){this.ctx.storage.transactionSync(()=>this.ledger.complete(key,e,now,observation));}
}

export async function materializeMetadata(env:Pick<Env,'DB'>,s:ReturnType<Room['metadata']>){
 const r=await env.DB.prepare(`INSERT INTO matches(match_id,ruleset_version,mode,status,agent_a,agent_b,mask_a,mask_b,started_at,completed_at,rounds,winner_agent_id,terminal_reason,replay_root_hash)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(match_id) DO UPDATE SET
 status=CASE WHEN matches.status='COMPLETE' THEN matches.status ELSE excluded.status END,
 agent_b=COALESCE(matches.agent_b,excluded.agent_b),mask_b=COALESCE(matches.mask_b,excluded.mask_b),
 completed_at=COALESCE(matches.completed_at,excluded.completed_at),rounds=COALESCE(matches.rounds,excluded.rounds),
 winner_agent_id=COALESCE(matches.winner_agent_id,excluded.winner_agent_id),terminal_reason=COALESCE(matches.terminal_reason,excluded.terminal_reason),replay_root_hash=COALESCE(matches.replay_root_hash,excluded.replay_root_hash)`)
 .bind(s.matchId,s.ruleset,s.mode,s.status,s.a,s.b,s.maskA,s.maskB,s.startedAt,s.status==='COMPLETE'?new Date().toISOString():null,s.rounds,s.winner,s.reason,s.root).run();
 if(!r.success||r.meta.changes!==1)throw Error('metadata_materialization_failed');
}
