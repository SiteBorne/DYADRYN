/* eslint-disable @typescript-eslint/no-explicit-any -- JSON read-model projections of already-validated engine state */
import profileSchema from '../schemas/battle_profile.schema.json' with {type:'json'};
import actionSchema from '../schemas/action.schema.json' with {type:'json'};
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {ListToolsRequestSchema,CallToolRequestSchema,type Tool} from '@modelcontextprotocol/sdk/types.js';
import {MatchRoom,EvidenceBudget,type Env} from './cloud.js';
import {HttpError,strictObject,id,issueToken,authenticate,rateLimit,readBody,equal} from './auth.js';
import {validateMask,buildMask,type Mask,type ProfileInput} from './mask.js';
import {evaluateEvidence,emptyEvidence,type Policy} from './jev.js';
import {turnMarkdown,parseSelection} from './muse.js';
import {cleanName,parseAvatar} from './identity.js';
import {HOUSE_ARCHETYPES,isHouseArchetype,isHouseId,nearestArchetype} from './house.js';
import {agentCard,a2aRpc} from './a2a.js';
import {recapOf} from './recap.js';
import {sha256,type Mode} from '../engine/src/index.js';
export {MatchRoom,EvidenceBudget};
const VERSION='0.4.0';
const SEC={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(v:unknown,status=200,extra:Record<string,string>={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...SEC,...extra}});
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'};
async function mask(env:Env,actor:string,maskId:string){const r=await env.DB.prepare('SELECT public_profile_json FROM masks WHERE mask_id=? AND agent_id=? AND active=1').bind(maskId,actor).first<{public_profile_json:string}>();if(!r)throw new HttpError(403,'mask_forbidden');return validateMask(JSON.parse(r.public_profile_json));}
function policy(env:Env):Policy{return {enabled:env.JEV_LIVE_ENABLED==='true',operator_authorized:env.JEV_OPERATOR_AUTHORIZED==='true',kill_switch:env.JEV_KILL_SWITCH!=='false',timeout_ms:Number(env.JEV_TIMEOUT_MS??500),day_calls:Number(env.JEV_DAY_CALLS??0),match_calls:Number(env.JEV_MATCH_CALLS??0),day_tokens:Number(env.JEV_DAY_TOKENS??0),match_tokens:Number(env.JEV_MATCH_TOKENS??0),day_cost_usd:Number(env.JEV_DAY_COST_USD??0),match_cost_usd:Number(env.JEV_MATCH_COST_USD??0),input_price_per_million:Number(env.JEV_INPUT_PRICE_PER_MILLION??NaN)};}

/* ---------- public read models (no secrets, no seeds, cache-friendly) ---------- */
interface Who{agent_id:string;name:string;avatar:string|null;arch:string;house:boolean}
async function who(env:Env,agentId:string|null,stats?:Record<string,number>,maskId?:string):Promise<Who|null>{
 if(!agentId)return null;
 if(isHouseId(agentId)){const arch=HOUSE_ARCHETYPES.find(a=>maskId?.startsWith('house-'+a.toLowerCase().replace(/[^a-z]/g,'')))??(stats?nearestArchetype(stats):'Stillpoint');return {agent_id:agentId,name:agentId==='house.a'?'House A':agentId==='house.b'?'House B':'House',avatar:null,arch,house:true};}
 const r=await env.DB.prepare('SELECT a.display_name n,v.sha256 h FROM agents a LEFT JOIN avatars v ON v.agent_id=a.agent_id WHERE a.agent_id=?').bind(agentId).first<{n:string;h:string|null}>();
 return {agent_id:agentId,name:r?.n??agentId,avatar:r?.h?`/v1/public/avatar/${encodeURIComponent(agentId)}?v=${r.h.slice(0,8)}`:null,arch:stats?nearestArchetype(stats):'Stillpoint',house:false};
}
async function publicMatch(env:Env,matchId:string){
 const v=await env.MATCH_ROOMS.getByName(matchId).publicView() as any;
 const a=await who(env,v.a.agent_id,v.a.stats,v.a.mask_id),b=v.b?await who(env,v.b.agent_id,v.b.stats,v.b.mask_id):null;
 return {...v,a:{...v.a,...a},b:v.b?{...v.b,...b}:null,links:{replay:v.status==='COMPLETE'?`/v1/public/matches/${matchId}/replay`:null,events:`/v1/public/matches/${matchId}/events`}};
}
const LOBBY_SQL=`SELECT m.match_id,m.mode,m.status,m.rounds,m.agent_a,m.agent_b,m.winner_agent_id,m.terminal_reason,m.started_at,m.completed_at,m.replay_root_hash,
 a.display_name an,b.display_name bn,(SELECT sha256 FROM avatars WHERE agent_id=m.agent_a) ah,(SELECT sha256 FROM avatars WHERE agent_id=m.agent_b) bh FROM matches m LEFT JOIN agents a ON a.agent_id=m.agent_a LEFT JOIN agents b ON b.agent_id=m.agent_b`;
const av=(aid:string|null,h:string|null)=>aid&&h?`/v1/public/avatar/${encodeURIComponent(aid)}?v=${h.slice(0,8)}`:null;
async function lobby(env:Env){
 const now=Date.now(),iso=(ms:number)=>new Date(now-ms).toISOString();
 const rows=async(where:string,order:string,binds:unknown[])=>(await env.DB.prepare(`${LOBBY_SQL} WHERE ${where} ORDER BY ${order} LIMIT 12`).bind(...binds).all<any>()).results.map(r=>({match_id:r.match_id,mode:r.mode,status:r.status,rounds:r.rounds,winner:r.winner_agent_id,reason:r.terminal_reason,started_at:r.started_at,completed_at:r.completed_at,root:r.replay_root_hash,
  a:{agent_id:r.agent_a,name:r.agent_a==='house.a'?'House A':isHouseId(r.agent_a)?'House':r.an??r.agent_a,avatar:av(r.agent_a,r.ah)},b:r.agent_b?{agent_id:r.agent_b,name:r.agent_b==='house.b'?'House B':isHouseId(r.agent_b)?'House':r.bn??r.agent_b,avatar:av(r.agent_b,r.bh)}:null}));
 return {generated_at:new Date(now).toISOString(),live:await rows("m.status='ACTIVE' AND m.started_at>?",'m.started_at DESC',[iso(6*3600e3)]),open:await rows("m.status='WAITING' AND m.started_at>?",'m.started_at DESC',[iso(3600e3)]),recent:await rows("m.status='COMPLETE'",'m.completed_at DESC',[])};
}
async function record(env:Env){
 const r=await env.DB.prepare(`WITH r AS(
  SELECT agent_a id,CASE WHEN winner_agent_id=agent_a THEN 1 ELSE 0 END w,CASE WHEN winner_agent_id IS NOT NULL AND winner_agent_id<>agent_a THEN 1 ELSE 0 END l,CASE WHEN winner_agent_id IS NULL THEN 1 ELSE 0 END d FROM matches WHERE status='COMPLETE' AND agent_b IS NOT NULL AND agent_a NOT LIKE 'house.%' AND agent_b NOT LIKE 'house.%'
  UNION ALL SELECT agent_b,CASE WHEN winner_agent_id=agent_b THEN 1 ELSE 0 END,CASE WHEN winner_agent_id IS NOT NULL AND winner_agent_id<>agent_b THEN 1 ELSE 0 END,CASE WHEN winner_agent_id IS NULL THEN 1 ELSE 0 END FROM matches WHERE status='COMPLETE' AND agent_b IS NOT NULL AND agent_a NOT LIKE 'house.%' AND agent_b NOT LIKE 'house.%')
  SELECT ag.agent_id,ag.display_name,SUM(w) wins,SUM(l) losses,SUM(d) draws,(SELECT sha256 FROM avatars WHERE agent_id=ag.agent_id) h FROM r JOIN agents ag ON ag.agent_id=r.id GROUP BY ag.agent_id ORDER BY wins DESC,losses ASC,ag.display_name LIMIT 50`).all<any>();
 return r.results.map((x,i)=>({rank:i+1,agent_id:x.agent_id,name:x.display_name,avatar:av(x.agent_id,x.h),wins:x.wins,losses:x.losses,draws:x.draws}));
}
async function recordOf(env:Env,agent:string){
 const r=await env.DB.prepare(`SELECT COUNT(*) n,SUM(CASE WHEN winner_agent_id=?1 THEN 1 ELSE 0 END) w,SUM(CASE WHEN winner_agent_id IS NOT NULL AND winner_agent_id<>?1 THEN 1 ELSE 0 END) l FROM matches WHERE status='COMPLETE' AND (agent_a=?1 OR agent_b=?1)`).bind(agent).first<any>();return {matches:r?.n??0,wins:r?.w??0,losses:r?.l??0};
}
async function cached(request:Request,ctx:ExecutionContext,ttl:number,make:()=>Promise<Response>):Promise<Response>{
 const cache=(caches as unknown as {default:Cache}).default,key=new Request(request.url,{method:'GET'});const hit=await cache.match(key);if(hit)return hit;
 const res=await make();if(res.status===200){const c=new Response(res.body,res);c.headers.set('Cache-Control',`public, max-age=${ttl}`);ctx.waitUntil(cache.put(key,c.clone()));return c;}return res;
}

/* ---------- tools (shared by MCP, A2A and REST) ---------- */
async function dispatch(env:Env,actor:string,name:string,input:unknown):Promise<unknown>{
 if(name==='register_mask'){const p=validateMask(input);if(p.agent_id!==actor)throw new HttpError(403,'mask_forbidden');
  await env.DB.prepare('INSERT INTO masks(mask_id,agent_id,profile_version,compiler_version,ruleset_version,profile_hash,public_profile_json,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(p.mask_id,actor,p.profile_version,p.compiler_version,p.ruleset_version,p.profile_hash,JSON.stringify(p),new Date().toISOString()).run();return {mask_id:p.mask_id,valid:true};}
 if(name==='register_profile'){const x=strictObject(input,['disclosure_level','source_hashes','affinities','traits','policy','signatures'],['mask_id','profile_version','public_carry_summary','derivation']);
  const mid=x.mask_id===undefined?'mask-'+actor+'-'+sha256(JSON.stringify(input)).slice(0,8):id(x.mask_id);
  const p=buildMask({...(x as unknown as ProfileInput),agent_id:actor,mask_id:mid,profile_version:(x.profile_version as number|undefined)??1});
  await env.DB.prepare('INSERT INTO masks(mask_id,agent_id,profile_version,compiler_version,ruleset_version,profile_hash,public_profile_json,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(p.mask_id,actor,p.profile_version,p.compiler_version,p.ruleset_version,p.profile_hash,JSON.stringify(p),new Date().toISOString()).run();
  return {mask_id:p.mask_id,valid:true,stats:p.stats,profile_hash:p.profile_hash};}
 if(name==='set_identity'){const x=strictObject(input,['display_name'],['avatar_base64']);const n=cleanName(x.display_name),stmts=[env.DB.prepare('UPDATE agents SET display_name=? WHERE agent_id=?').bind(n,actor)];
  let avatar:string|null=null;if(x.avatar_base64!==undefined){const a=parseAvatar(x.avatar_base64);avatar=a.sha256;stmts.push(env.DB.prepare('INSERT INTO avatars(agent_id,mime,b64,sha256,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(agent_id) DO UPDATE SET mime=excluded.mime,b64=excluded.b64,sha256=excluded.sha256,updated_at=excluded.updated_at').bind(actor,a.mime,a.b64,a.sha256,new Date().toISOString()));}
  await env.DB.batch(stmts);return {agent_id:actor,display_name:n,avatar:avatar?`/v1/public/avatar/${encodeURIComponent(actor)}?v=${avatar.slice(0,8)}`:null};}
 if(name==='create_match'){const x=strictObject(input,['mask_id','mode'],['opponent','house_archetype']);const p=await mask(env,actor,id(x.mask_id));if(x.mode!=='MODEL_TRIAL'&&x.mode!=='CARRY_DUEL')throw new HttpError(422,'ranked_or_custom_not_qualified');
  const matchId=crypto.randomUUID(),stub=env.MATCH_ROOMS.getByName(matchId);
  if(x.opponent!==undefined&&x.opponent!=='HOUSE')throw new HttpError(422,'invalid_opponent');
  if(x.house_archetype!==undefined&&(x.opponent!=='HOUSE'||!isHouseArchetype(x.house_archetype)))throw new HttpError(422,'invalid_house_archetype');
  const arch=x.opponent==='HOUSE'?(x.house_archetype as string|undefined)??HOUSE_ARCHETYPES[parseInt(sha256(matchId).slice(0,2),16)%HOUSE_ARCHETYPES.length]:undefined;
  return stub.create(matchId,p,x.mode as Mode,arch);}
 if(name==='list_open_matches'){strictObject(input,[]);const l=await lobby(env);return {open:l.open.filter(m=>m.a.agent_id!==actor)};}
 if(name==='get_agent_record'){const x=strictObject(input,['agent_id']);const agent=id(x.agent_id);const record=await env.DB.prepare('SELECT agent_id,display_name,status,created_at FROM agents WHERE agent_id=?').bind(agent).first();const matches=await env.DB.prepare('SELECT match_id,mode,status,rounds,winner_agent_id,replay_root_hash FROM matches WHERE agent_a=? OR agent_b=? ORDER BY started_at DESC LIMIT 20').bind(agent,agent).all();return {agent:record,record:await recordOf(env,agent),matches:matches.results};}
 if(name==='get_rankings'){strictObject(input,[]);const r=await env.DB.prepare("SELECT subject_id,rating,rd,games FROM ratings WHERE subject_type='AGENT' AND ruleset_version='dyadryn.core.v1' ORDER BY rating DESC LIMIT 100").all();return {ruleset_version:'dyadryn.core.v1',ranked_enabled:false,entries:r.results,practice_record:await record(env)};}
 const x=strictObject(input,['match_id'],name==='join_match'?['mask_id']:name==='submit_action'?['envelope']:[]),matchId=id(x.match_id),stub=env.MATCH_ROOMS.getByName(matchId);
 if(name==='join_match'){const p=await mask(env,actor,id(x.mask_id));return stub.join(p);}
 if(name==='get_state')return stub.view(actor);
 if(name==='get_legal_actions')return (await stub.view(actor)).legal_actions;
 if(name==='get_decision_evidence'){
  const v=await stub.view(actor),p=policy(env);if(!p.enabled||!p.operator_authorized||p.kill_switch)return emptyEvidence(v.state_hash,'budget_blocked');
  try{const e=await evaluateEvidence({ledger:env.EVIDENCE_BUDGET.getByName('jev.budget.v1'),view:v,AI:env.AI,policy:p});const current=await stub.view(actor);return current.state_hash===e.state_hash?e:emptyEvidence(current.state_hash,'unavailable');}catch{return emptyEvidence(v.state_hash,'unavailable');}}
 if(name==='submit_action')return stub.submit(actor,parseSelection(x.envelope));
 if(name==='get_turn_result')return stub.turnResult(actor);
 if(name==='get_match_result')return stub.result(actor);
 if(name==='get_replay')return stub.replay(actor);
 if(name==='verify_replay')return stub.verify(actor);
 if(name==='get_turn_packet'){const v=await stub.view(actor);return {state:v,markdown:turnMarkdown(v)};}
 if(name==='get_spectator')return stub.spectator(actor);
 throw new HttpError(404,'unknown_tool');
}
const remoteNames=['register_mask','register_profile','set_identity','create_match','list_open_matches','join_match','get_state','get_legal_actions','get_turn_packet','get_decision_evidence','submit_action','get_turn_result','get_match_result','get_replay','verify_replay','get_agent_record','get_rankings'] as const;
const DESC:Record<string,string>={
 register_mask:'Register your compiled Mask (battle profile). Compile locally: raw identity/soul/memory never leave your machine.',
 register_profile:'Register a Mask from LOCAL derivation output: disclosure level, source hashes, six 0..1 affinities (derived from your identity/soul/memory by the connector, or set by hand for point-buy), traits, policy, signatures. The server normalises to the fixed 420-point budget. Raw files are never sent.',
 set_identity:'Set your public display name and optional avatar (PNG/JPEG/WebP ≤32KB, base64). Shown on the Duel Table.',
 create_match:'Open a match with a registered Mask. Add opponent "HOUSE" for an instant live practice match against the labelled house sparring opponent.',
 list_open_matches:'List open matches waiting for an opponent.',
 join_match:'Join an open match with a registered Mask.',
 get_state:'Your redacted view of the match: state, legal actions, deadline and state_hash.',
 get_legal_actions:'Exact legal action objects for the current round. Choose one; do not reconstruct the rules.',
 get_turn_packet:'Compact Markdown turn packet plus authoritative state. Presentation only; grants no rules authority.',
 get_decision_evidence:'Optional actor-scoped advisory evidence; server questions only.',
 submit_action:'Submit exactly one action envelope (state_hash + fresh client_nonce). The engine resolves the outcome.',
 get_turn_result:'Actor-safe resolved result of the last round.',get_match_result:'Terminal result and proof metadata.',get_replay:'Replay with seed reveal after completion.',verify_replay:'Independently recompute and verify the replay.',
 get_agent_record:'Public record for an agent.',get_rankings:'League table. Ranked is not yet qualified; practice record is listed.'};
function toolSchema(name:string):Tool['inputSchema']{
 if(name==='register_mask')return {...profileSchema,type:'object'};
 if(name==='register_profile')return {type:'object',properties:{mask_id:{type:'string'},profile_version:{type:'integer',minimum:1},disclosure_level:{enum:['COLD','MASKED','CARRY','DEEP_CARRY']},source_hashes:profileSchema.properties.source_hashes,affinities:{type:'object',properties:Object.fromEntries(['ANALYSIS','EXECUTION','ADAPTATION','INFLUENCE','RESOLVE','CREATIVITY'].map(k=>[k,{type:'number',minimum:0,maximum:1}])),required:['ANALYSIS','EXECUTION','ADAPTATION','INFLUENCE','RESOLVE','CREATIVITY'],additionalProperties:false},traits:profileSchema.properties.traits,policy:profileSchema.properties.policy,signatures:profileSchema.properties.signatures,public_carry_summary:{type:'string',maxLength:500},derivation:profileSchema.properties.derivation},required:['disclosure_level','source_hashes','affinities','traits','policy','signatures'],additionalProperties:false};
 if(name==='set_identity')return {type:'object',properties:{display_name:{type:'string',minLength:1,maxLength:32},avatar_base64:{type:'string',maxLength:44000}},required:['display_name'],additionalProperties:false};
 if(name==='create_match')return {type:'object',properties:{mask_id:{type:'string'},mode:{enum:['MODEL_TRIAL','CARRY_DUEL']},opponent:{enum:['HOUSE']},house_archetype:{enum:[...HOUSE_ARCHETYPES]}},required:['mask_id','mode'],additionalProperties:false};
 if(name==='get_rankings'||name==='list_open_matches')return {type:'object',properties:{},additionalProperties:false};
 if(name==='get_agent_record')return {type:'object',properties:{agent_id:{type:'string'}},required:['agent_id'],additionalProperties:false};
 return {type:'object',properties:{match_id:{type:'string'},...(name==='join_match'?{mask_id:{type:'string'}}:{}),...(name==='submit_action'?{envelope:{...actionSchema,type:'object'}}:{})},required:['match_id',...(name==='join_match'?['mask_id']:[]),...(name==='submit_action'?['envelope']:[])],additionalProperties:false};
}
const WRITES=['register_mask','register_profile','set_identity','create_match','join_match','submit_action'];
const tools:Tool[]=remoteNames.map(name=>({name,description:DESC[name],inputSchema:toolSchema(name),annotations:{readOnlyHint:!WRITES.includes(name),destructiveHint:false,idempotentHint:name!=='create_match',openWorldHint:name==='get_decision_evidence'}}));
const toolSet=new Set<string>(remoteNames);

/* ---------- discovery documents ---------- */
const mcpDescriptor=(o:string)=>({name:'dyadryn-arena',title:'DYADRYN Arena',version:VERSION,description:'Remote MCP server for the DYADRYN AI Persona Arena. Muse chooses; the deterministic engine resolves.',transport:'streamable-http',endpoint:`${o}/mcp`,authentication:{type:'bearer',header:'Authorization',obtain:`${o}/v1/register`},tools:remoteNames,local_only_tools:['compile_mask'],openapi:`${o}/openapi.json`,agent_card:`${o}/.well-known/agent-card.json`,llms:`${o}/llms.txt`});

/* ---------- entry ---------- */
export default {async fetch(request:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
 try{
 const url=new URL(request.url),path=url.pathname,o=url.origin;
 const origin=request.headers.get('Origin');
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
 if(origin&&origin!==url.origin&&origin!==env.PUBLIC_ORIGIN&&!(request.method==='GET'&&path.startsWith('/v1/public/')))throw new HttpError(403,'origin_forbidden');
 if(path==='/health'&&request.method==='GET')return json({service:'dyadryn',version:VERSION,ruleset:'dyadryn.core.v1',jev_live:env.JEV_LIVE_ENABLED==='true',recap_live:env.RECAP_LIVE_ENABLED==='true',ranked_enabled:false});
 if(request.method==='GET'&&(path==='/.well-known/agent-card.json'||path==='/.well-known/agent.json'))return new Response(JSON.stringify(agentCard(o,tools,VERSION)),{headers:{'Content-Type':'application/json',...CORS,'Cache-Control':'public, max-age=300',...SEC}});
 if(request.method==='GET'&&path==='/.well-known/mcp.json')return new Response(JSON.stringify(mcpDescriptor(o)),{headers:{'Content-Type':'application/json',...CORS,'Cache-Control':'public, max-age=300',...SEC}});

 /* public, read-only, unauthenticated */
 if(path.startsWith('/v1/public/')){
  if(path==='/v1/public/exhibition'&&request.method==='POST'){
   // One shared live exhibition (house vs house, labelled as such) so there is always something real to watch. Reuses a running/fresh one.
   await rateLimit(env,'exh:'+request.headers.get('CF-Connecting-IP'),6);
   const cur=await env.DB.prepare("SELECT match_id,status FROM matches WHERE agent_a LIKE 'house.%' AND agent_b LIKE 'house.%' AND (status='ACTIVE' OR started_at>?) ORDER BY started_at DESC LIMIT 1").bind(new Date(Date.now()-90e3).toISOString()).first<{match_id:string;status:string}>();
   if(cur)return json({match_id:cur.match_id,reused:true});
   const mid=crypto.randomUUID(),h=sha256(mid),a=HOUSE_ARCHETYPES[parseInt(h.slice(0,2),16)%6],b=HOUSE_ARCHETYPES[(parseInt(h.slice(0,2),16)+1+parseInt(h.slice(2,4),16)%5)%6];
   await env.MATCH_ROOMS.getByName(mid).createExhibition(mid,a,b);return json({match_id:mid,reused:false,a,b},201);
  }
  if(request.method!=='GET')throw new HttpError(405,'method_not_allowed');
  const pub=(res:Response)=>{const r=new Response(res.body,res);for(const [k,v] of Object.entries({...CORS,...SEC}))r.headers.set(k,v);return r;};
  if(path==='/v1/public/lobby')return pub(await cached(request,ctx,10,async()=>json(await lobby(env),200)));
  if(path==='/v1/public/leaderboard')return pub(await cached(request,ctx,30,async()=>json({ranked_enabled:false,note:'Ranked play is not yet qualified. This is the practice record (agent-vs-agent, house matches excluded).',entries:await record(env)},200)));
  const av_=path.match(/^\/v1\/public\/avatar\/([^/]+)$/);
  if(av_){const r=await env.DB.prepare('SELECT mime,b64 FROM avatars WHERE agent_id=?').bind(id(decodeURIComponent(av_[1]))).first<{mime:string;b64:string}>();if(!r)throw new HttpError(404,'not_found');
   const bin=Uint8Array.from(atob(r.b64),c=>c.charCodeAt(0));return new Response(bin,{headers:{'Content-Type':r.mime,'Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'public, max-age=300',...CORS,...SEC}});}
  const m=path.match(/^\/v1\/public\/matches\/([^/]+)(?:\/(replay|events|recap))?$/);if(!m)throw new HttpError(404,'not_found');const matchId=id(m[1]);
  if(m[2]==='events'){if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')throw new HttpError(426,'upgrade_required');return env.MATCH_ROOMS.getByName(matchId).fetch(new Request('https://internal/events',{headers:{Upgrade:'websocket','X-Dyadryn-Public':'1'}}));}
  if(m[2]==='replay'){const rep=await env.MATCH_ROOMS.getByName(matchId).publicReplay();return pub(json({replay:rep,engine_verified:await env.MATCH_ROOMS.getByName(matchId).publicVerify()},200,{'Cache-Control':'public, max-age=3600'}));}
  if(m[2]==='recap'){const v=await publicMatch(env,matchId);if(v.status!=='COMPLETE')throw new HttpError(409,'not_complete');return pub(json(await recapOf(env,v),200,{'Cache-Control':'public, max-age=3600'}));}
  return pub(json(await publicMatch(env,matchId),200,{'Cache-Control':'no-store'}));
 }

 /* self-service registration (free-tier guard: per-IP and daily global caps) */
 if(path==='/v1/register'&&request.method==='POST'){
  if(env.OPEN_REGISTRATION!=='true'&&env.ENVIRONMENT!=='local')throw new HttpError(403,'registration_closed');
  await rateLimit(env,'register:'+request.headers.get('CF-Connecting-IP'),5);
  const day=await env.DB.prepare('SELECT COUNT(*) n FROM agents WHERE created_at>?').bind(new Date(Date.now()-864e5).toISOString()).first<{n:number}>();if((day?.n??0)>=Number(env.MAX_DAILY_REGISTRATIONS??300))throw new HttpError(429,'daily_registration_cap');
  const x=strictObject(await readBody(request),['display_name']);const name=cleanName(x.display_name);const actor='muse-'+Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');
  const token=issueToken(actor);await env.DB.prepare('INSERT INTO agents(agent_id,display_name,token_hash,created_at) VALUES(?,?,?,?)').bind(actor,name,token.token_hash,new Date().toISOString()).run();
  return json({agent_id:actor,display_name:name,token:token.token,mcp:`${o}/mcp`,a2a:`${o}/a2a`,note:'Store the token as a secret. It is shown once.'},201);}
 if(path==='/v1/agents'&&request.method==='POST'){
  if(env.ENVIRONMENT!=='local'){const admin=request.headers.get('Authorization')?.replace(/^Bearer /,'')??'';if(!env.ADMIN_TOKEN_SHA256||!equal(sha256(admin),env.ADMIN_TOKEN_SHA256))throw new HttpError(403,'provisioning_forbidden');}
  await rateLimit(env,'issue:'+request.headers.get('CF-Connecting-IP'),10);const x=strictObject(await readBody(request),['agent_id','display_name']);const actor=id(x.agent_id);if(typeof x.display_name!=='string'||x.display_name.length>80||/[<>\r\n]/.test(x.display_name))throw new HttpError(422,'invalid_display_name');
  const token=issueToken(actor);await env.DB.prepare('INSERT INTO agents(agent_id,display_name,token_hash,created_at) VALUES(?,?,?,?)').bind(actor,x.display_name,token.token_hash,new Date().toISOString()).run();return json({agent_id:actor,token:token.token},201);}

 const auth=await authenticate(request,env);await rateLimit(env,'agent:'+auth.actor);
 if(path==='/v1/token/rotate'&&request.method==='POST'){strictObject(await readBody(request),[]);const t=issueToken(auth.actor);const r=await env.DB.prepare("UPDATE agents SET token_hash=? WHERE agent_id=? AND token_hash=? AND status='ACTIVE' RETURNING agent_id").bind(t.token_hash,auth.actor,auth.token_hash).first();if(!r)throw new HttpError(409,'token_changed');return json({token:t.token});}
 if(path==='/v1/token/revoke'&&request.method==='POST'){strictObject(await readBody(request),[]);await env.DB.prepare("UPDATE agents SET status='REVOKED' WHERE agent_id=? AND token_hash=?").bind(auth.actor,auth.token_hash).run();return json({revoked:true});}
 if(path==='/mcp'){
  if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
  const body=await readBody(request,64000),server=new Server({name:'dyadryn-arena',version:VERSION},{capabilities:{tools:{}},instructions:'Muse chooses; deterministic engine resolves. compile_mask is local-only. Jev is optional advisory evidence. Start with set_identity, register_mask, then create_match (opponent HOUSE for instant practice) or join_match.'});
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools}));server.setRequestHandler(CallToolRequestSchema,async r=>{try{if(!toolSet.has(r.params.name))throw new Error('unknown_tool');const result=await dispatch(env,auth.actor,r.params.name,r.params.arguments??{});return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:{result}};}catch{return {isError:true,content:[{type:'text',text:'Tool request rejected; inspect the authoritative state and strict input schema.'}]};}});
  const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});await server.connect(transport);return transport.handleRequest(request,{parsedBody:body});
 }
 if(path==='/a2a'){
  if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
  const body=await readBody(request,64000),card=agentCard(o,tools,VERSION),skills=new Set<string>(remoteNames);
  return json(await a2aRpc(body,card,skills,(s,a)=>dispatch(env,auth.actor,s,a),m=>dispatch(env,auth.actor,'get_state',{match_id:m})));
 }
 if(path==='/v1/identity'&&request.method==='PUT')return json(await dispatch(env,auth.actor,'set_identity',await readBody(request,64000)));
 if(path==='/v1/identity'&&request.method==='GET'){const r=await who(env,auth.actor);return json({agent_id:auth.actor,display_name:r?.name,avatar:r?.avatar});}
 if(path==='/v1/masks'&&request.method==='POST')return json(await dispatch(env,auth.actor,'register_mask',await readBody(request)),201);
 if(path==='/v1/profiles'&&request.method==='POST')return json(await dispatch(env,auth.actor,'register_profile',await readBody(request,32000)),201);
 if(path==='/v1/matches'&&request.method==='POST')return json(await dispatch(env,auth.actor,'create_match',await readBody(request)),201);
 if(path==='/v1/matches/open'&&request.method==='GET')return json(await dispatch(env,auth.actor,'list_open_matches',{}));
 if(path==='/v1/rankings'&&request.method==='GET')return json(await dispatch(env,auth.actor,'get_rankings',{}));
 const agent=path.match(/^\/v1\/agents\/([^/]+)$/);if(agent&&request.method==='GET')return json(await dispatch(env,auth.actor,'get_agent_record',{agent_id:agent[1]}));
 const route=path.match(/^\/v1\/matches\/([^/]+)\/(join|state|legal-actions|decision-evidence|actions|turn-result|result|replay|verify|packet|spectator|events)$/);if(!route)throw new HttpError(404,'not_found');const matchId=id(route[1]),op=route[2];
 if(op==='events'&&request.method==='GET'){await env.MATCH_ROOMS.getByName(matchId).view(auth.actor);return env.MATCH_ROOMS.getByName(matchId).fetch(new Request('https://internal/events',{headers:{Upgrade:'websocket','X-Dyadryn-Actor':auth.actor}}));}
 const names:Record<string,string>={join:'join_match',state:'get_state','legal-actions':'get_legal_actions','decision-evidence':'get_decision_evidence',actions:'submit_action','turn-result':'get_turn_result',result:'get_match_result',replay:'get_replay',verify:'verify_replay',packet:'get_turn_packet',spectator:'get_spectator'};
 const mutation=op==='actions'||op==='join';if(request.method!==(mutation?'POST':'GET'))throw new HttpError(405,'method_not_allowed');if(url.search)throw new HttpError(422,'query_not_allowed');
 const body=mutation?await readBody(request):{};const input=op==='actions'?{match_id:matchId,envelope:body}:op==='join'?{...strictObject(body,['mask_id']),match_id:matchId}:{match_id:matchId};
 return json(await dispatch(env,auth.actor,names[op],input),op==='actions'?202:200);
 }catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);const message=e instanceof Error?e.message:'';const status=/forbidden|unknown_actor/.test(message)?403:/nonce_conflict|stale_state|locked|terminal|full|exists|deadline/.test(message)?409:/not_found/.test(message)?404:/invalid|insufficient|signature|cooldown|unsafe|mask_|cold_|waiting|replay_/.test(message)?422:503;return json({error:status===503?'service_unavailable':status===409?'conflict':status===403?'forbidden':'invalid_request'},status);}
}};
