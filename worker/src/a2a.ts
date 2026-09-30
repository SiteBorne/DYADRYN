/* eslint-disable @typescript-eslint/no-explicit-any -- JSON read-model projections of already-validated engine state */
// Agent2Agent (A2A) JSON-RPC 2.0 binding. Every skill is one of the same strictly-validated tools MCP/REST expose.
// Stateless by design: a task is "completed" when the tool returns; a match id doubles as a long-lived task id for polling.
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
export const A2A_PROTOCOL='0.3.0';
export function agentCard(origin:string,tools:Tool[],version:string){
 return {protocolVersion:A2A_PROTOCOL,name:'DYADRYN Arena',description:'AI Persona Arena. Bring your agent (a Muse) as a compiled, privacy-preserving Mask, fight deterministic proof-backed duels, and read verifiable replays. The agent chooses. The engine decides. Built from memory. Proven in battle.',
  url:`${origin}/a2a`,preferredTransport:'JSONRPC',additionalInterfaces:[{url:`${origin}/a2a`,transport:'JSONRPC'},{url:`${origin}/mcp`,transport:'MCP-STREAMABLE-HTTP'}],
  provider:{organization:'DYADRYN',url:origin},version,documentationUrl:`${origin}/muse.html`,iconUrl:`${origin}/assets/brand/icon-192.png`,
  capabilities:{streaming:false,pushNotifications:false,stateTransitionHistory:false},
  securitySchemes:{agentToken:{type:'http',scheme:'bearer',description:'Agent token from POST /v1/register or the muse-connect script.'}},security:[{agentToken:[]}],
  defaultInputModes:['application/json','text/markdown'],defaultOutputModes:['application/json','text/markdown'],
  skills:[...tools.map(t=>({id:t.name,name:t.name.replaceAll('_',' '),description:t.description??t.name,tags:['dyadryn','arena','game'],inputModes:['application/json'],outputModes:['application/json']})),
   {id:'get_turn_packet',name:'get turn packet',description:'Compact Markdown turn packet plus authoritative state for one match; choose one legal action from it.',tags:['dyadryn','muse','markdown'],inputModes:['application/json'],outputModes:['application/json','text/markdown']}],
  supportsAuthenticatedExtendedCard:false};
}
const rpc=(id:unknown,result:unknown)=>({jsonrpc:'2.0',id:id??null,result});
const err=(id:unknown,code:number,message:string)=>({jsonrpc:'2.0',id:id??null,error:{code,message}});
interface Part{kind?:string;text?:string;data?:unknown}
function intent(params:any):{skill:string;args:Record<string,unknown>}|null{
 const parts:Part[]=params?.message?.parts;if(!Array.isArray(parts))return null;
 for(const p of parts){
  if(p.kind==='data'&&p.data&&typeof p.data==='object'){const d=p.data as Record<string,unknown>,skill=d.skill??d.tool;if(typeof skill==='string')return {skill,args:(d.arguments&&typeof d.arguments==='object'&&!Array.isArray(d.arguments)?d.arguments:{}) as Record<string,unknown>};}
  if(p.kind==='text'&&typeof p.text==='string'){try{const d=JSON.parse(p.text);if(d&&typeof d.skill==='string')return {skill:d.skill,args:d.arguments??{}};}catch{/* plain text */}}
 }
 return null;
}
export async function a2aRpc(body:unknown,card:unknown,skills:Set<string>,run:(skill:string,args:unknown)=>Promise<unknown>,state:(matchId:string)=>Promise<unknown>):Promise<unknown>{
 const b=body as {jsonrpc?:string;id?:unknown;method?:string;params?:any};
 if(!b||b.jsonrpc!=='2.0'||typeof b.method!=='string')return err(b?.id,-32600,'Invalid Request');
 const now=()=>new Date().toISOString();
 const task=(id:string,state:'completed'|'failed'|'working',parts:Part[],text?:string)=>({kind:'task',id,contextId:id,status:{state,timestamp:now(),...(text?{message:{kind:'message',role:'agent',messageId:crypto.randomUUID(),parts:[{kind:'text',text}]}}:{})},artifacts:parts.length?[{artifactId:crypto.randomUUID(),name:'result',parts}]:[],history:[]});
 switch(b.method){
  case 'agent/getAuthenticatedExtendedCard':return rpc(b.id,card);
  case 'message/send':{
   const it=intent(b.params);if(!it)return err(b.id,-32602,'Send a data part {"skill":"<skill id>","arguments":{…}}. Skills are listed on the Agent Card.');
   if(!skills.has(it.skill))return err(b.id,-32602,'Unknown skill: '+it.skill);
   const tid=b.params?.message?.taskId??crypto.randomUUID();
   try{const r=await run(it.skill,it.args);const parts:Part[]=[{kind:'data',data:{result:r}}];const md=(r as {markdown?:string})?.markdown;if(typeof md==='string')parts.push({kind:'text',text:md});return rpc(b.id,task(tid,'completed',parts));}
   catch{return rpc(b.id,task(tid,'failed',[],'Tool request rejected; inspect the authoritative state and the strict input schema.'));}
  }
  case 'tasks/get':{const id=b.params?.id;if(typeof id!=='string')return err(b.id,-32602,'id required');
   try{const v=await state(id);return rpc(b.id,task(id,(v as {status?:string}).status==='ACTIVE'?'working':'completed',[{kind:'data',data:{result:v}}]));}catch{return err(b.id,-32001,'Task not found');}}
  case 'tasks/cancel':return err(b.id,-32002,'Matches cannot be cancelled; unanswered rounds time out under the published rules.');
  default:return err(b.id,-32601,'Method not found');
 }
}
