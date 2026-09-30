import test from 'node:test';import assert from 'node:assert/strict';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {verifyReplay} from '../dist/engine/src/index.js';
import {profiles,options,req,migrate} from './runtime.mjs';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
test('self-registration, Muse identity, house live match, public frames, replay, A2A and discovery',async()=>{
 const path=mkdtempSync(join(tmpdir(),'dyadryn-live-'));const mf=new Miniflare({...convertV4MiniflareOptions(options(path)),resourcePersistencePath:path,isolatedResourcePersistencePath:path});
 try{
  await migrate(await mf.getD1Database('DB'));
  const reg=await req(mf,'/v1/register',null,{display_name:'Halcyon Drift'});assert.equal(reg.status,201);const {agent_id,token}=reg.body;assert.match(agent_id,/^muse-[a-f0-9]{16}$/);
  assert.equal((await req(mf,'/v1/register',null,{display_name:'<script>'})).status,422);assert.equal((await req(mf,'/v1/register',null,{display_name:'HOUSE admin'})).status,422);
  const idn=await req(mf,'/v1/identity',token,{display_name:'Halcyon Drift ✦',avatar_base64:PNG},'PUT');assert.equal(idn.status,422);
  const ok=await req(mf,'/v1/identity',token,{display_name:'Halcyon Drift',avatar_base64:'data:image/png;base64,'+PNG},'PUT');assert.equal(ok.status,200);assert.match(ok.body.avatar,/^\/v1\/public\/avatar\/muse-/);
  assert.equal((await req(mf,'/v1/identity',token,{display_name:'Bad',avatar_base64:Buffer.from('<svg onload=alert(1)>padpadpadpadpad').toString('base64')},'PUT')).status,422);
  const av=await mf.dispatchFetch('https://local.test'+ok.body.avatar);assert.equal(av.status,200);assert.equal(av.headers.get('content-type'),'image/png');assert.match(av.headers.get('content-security-policy'),/default-src 'none'/);
  assert.equal((await req(mf,'/v1/masks',token,profiles(agent_id))).status,201);
  assert.equal((await req(mf,'/v1/matches',token,{mask_id:'mask-'+agent_id,mode:'MODEL_TRIAL',opponent:'BOT'})).status,422);
  const created=await req(mf,'/v1/matches',token,{mask_id:'mask-'+agent_id,mode:'MODEL_TRIAL',opponent:'HOUSE',house_archetype:'Veil'});assert.equal(created.status,201);assert.equal(created.body.status,'ACTIVE');const id=created.body.match_id;
  let pv=(await req(mf,`/v1/public/matches/${id}`)).body;assert.equal(pv.status,'ACTIVE');assert.equal(pv.a.name,'Halcyon Drift');assert.ok(pv.a.avatar);assert.equal(pv.b.name,'HOUSE · VEIL');assert.equal(pv.b.house,true);assert.equal(pv.frames.length,1);
  assert.ok(!JSON.stringify(pv).includes('seed_reveal'));assert.equal(pv.locked.b,false,'house lock is never published');
  for(let i=0;i<30;i++){
   const v=(await req(mf,`/v1/matches/${id}/state`,token)).body;if(v.status!=='ACTIVE')break;
   const a=v.legal_actions.find(x=>x.action==='PRESS'&&x.intensity===2)??v.legal_actions[0];
   const r=await req(mf,`/v1/matches/${id}/actions`,token,{match_id:id,actor_id:agent_id,round:v.round,state_hash:v.state_hash,client_nonce:'nonce-live-'+i+'-xxxx',action:a.action,intensity:a.intensity,...(a.prediction?{prediction:a.prediction}:{}),...(a.adaptStance?{adapt_stance:a.adaptStance}:{}),...(a.signatureId?{signature_id:a.signatureId}:{})});assert.equal(r.status,202,JSON.stringify(r.body));
   if(i===0){pv=(await req(mf,`/v1/public/matches/${id}`)).body;assert.equal(pv.frames.length,2);assert.ok(pv.frames[1].actions.a&&pv.frames[1].actions.b);}
  }
  pv=(await req(mf,`/v1/public/matches/${id}`)).body;assert.equal(pv.status,'COMPLETE');assert.ok(pv.frames.length>2);assert.ok(pv.outcome);
  const rep=await req(mf,`/v1/public/matches/${id}/replay`);assert.equal(rep.status,200);assert.equal(verifyReplay(rep.body.replay).verified,true);assert.equal(rep.body.engine_verified.verified,true);
  assert.equal((await req(mf,`/v1/public/matches/${id}/recap`)).body.source,'template');
  assert.equal((await req(mf,`/v1/public/matches/${id}/recap`)).body.advisory,true);
  const lob=(await req(mf,'/v1/public/lobby')).body;assert.ok(lob.recent.some(m=>m.match_id===id&&m.a.name==='Halcyon Drift'&&m.b.name==='HOUSE'));
  assert.equal((await req(mf,'/v1/public/leaderboard')).status,200);
  assert.equal((await req(mf,'/v1/public/matches/'+id+'/events')).status,426);
  // discovery + A2A
  const card=(await req(mf,'/.well-known/agent-card.json')).body;assert.equal(card.protocolVersion,'0.3.0');assert.equal(card.url,'https://local.test/a2a');assert.ok(card.skills.some(s=>s.id==='submit_action'));
  const mcpd=(await req(mf,'/.well-known/mcp.json')).body;assert.equal(mcpd.endpoint,'https://local.test/mcp');assert.ok(!mcpd.tools.includes('compile_mask'));
  const rpc=(method,params)=>req(mf,'/a2a',token,{jsonrpc:'2.0',id:1,method,params});
  assert.equal((await req(mf,'/a2a',null,{jsonrpc:'2.0',id:1,method:'message/send',params:{}})).status,401);
  const sent=(await rpc('message/send',{message:{kind:'message',role:'user',messageId:'m1',parts:[{kind:'data',data:{skill:'get_rankings',arguments:{}}}]}})).body;assert.equal(sent.result.status.state,'completed');assert.equal(sent.result.artifacts[0].parts[0].data.result.ranked_enabled,false);
  const bad=(await rpc('message/send',{message:{kind:'message',role:'user',messageId:'m2',parts:[{kind:'data',data:{skill:'compile_mask',arguments:{}}}]}})).body;assert.equal(bad.error.code,-32602);
  const inj=(await rpc('message/send',{message:{kind:'message',role:'user',messageId:'m3',parts:[{kind:'data',data:{skill:'get_state',arguments:{match_id:id,actor_id:'x'}}}]}})).body;assert.equal(inj.result.status.state,'failed');
  assert.equal((await rpc('tasks/get',{id:id})).body.result.status.state,'completed');assert.equal((await rpc('tasks/cancel',{id})).body.error.code,-32002);assert.equal((await rpc('nope',{})).body.error.code,-32601);
  // open lobby: a waiting match by a second Muse can be joined
  const r2=(await req(mf,'/v1/register',null,{display_name:'Wren'})).body;await req(mf,'/v1/masks',r2.token,profiles(r2.agent_id));
  const w=await req(mf,'/v1/matches',r2.token,{mask_id:'mask-'+r2.agent_id,mode:'CARRY_DUEL'});assert.equal(w.body.status,'WAITING');
  const open=(await req(mf,'/v1/matches/open',token)).body;assert.ok(open.open.some(m=>m.match_id===w.body.match_id&&m.a.name==='Wren'));
  assert.equal((await req(mf,`/v1/matches/${w.body.match_id}/join`,token,{mask_id:'mask-'+agent_id})).status,200);
  // health
  const h=(await req(mf,'/health')).body;assert.equal(h.ranked_enabled,false);
 }finally{await mf.dispose();}
},{timeout:120000});
