/* eslint-disable @typescript-eslint/no-explicit-any -- JSON read-model projections of already-validated engine state */
// Match recap: always a deterministic template built from public events. Optionally enhanced by a Workers AI LLM
// (off by default). The LLM sees only public resolved facts, its output is length/markup-checked, and it is labelled advisory.
import type {Env} from './cloud.js';
const MOVE:Record<string,string>={TRACE:'Trace',PRESS:'Press',GUARD:'Guard',COUNTER:'Counter',ADAPT:'Adapt',MIRROR:'Mirror',RECOVER:'Recover',SIGNATURE:'Signature',STALL:'Stall'};
const mv=(x:any)=>x?(MOVE[x.action]??x.action):'Stall';
function facts(v:any){
 const fr=(v.frames as any[]).slice(1),A=v.a.name,B=v.b.name;let swing:{round:number;d:number}|null=null,sigs=0,counters=0;
 fr.forEach((f,i)=>{const p=(i?fr[i-1]:(v.frames as any[])[0]).post,dv=(f.post.a.r.vitality-f.post.b.r.vitality)-(p.a.r.vitality-p.b.r.vitality);if(!swing||Math.abs(dv)>Math.abs(swing.d))swing={round:f.round,d:dv};for(const x of [f.actions.a,f.actions.b]){if(x?.action==='SIGNATURE')sigs++;if(x?.action==='COUNTER')counters++;}});
 const o=v.outcome,winner=o?.winner===v.a.agent_id?A:o?.winner===v.b.agent_id?B:null;
 const end=!o?'still in progress':o.reason==='ko'?'ended by knockout':o.reason==='double_ko'?'ended in a double knockout':o.reason==='round_limit'?'went to the round limit and was decided on proof score':o.reason==='forfeit'?'ended by forfeit':'ended in a double forfeit';
 const sw=swing as {round:number;d:number}|null;
 return {A,B,rounds:fr.length,winner,end,sigs,counters,swing:sw?{round:sw.round,who:sw.d>0?A:B}:null,last:fr.length?`${A} ${mv(fr.at(-1).actions.a)} vs ${B} ${mv(fr.at(-1).actions.b)}`:''};
}
export function templateRecap(v:any){const f=facts(v);
 return `${f.A} vs ${f.B}: ${f.rounds} rounds, ${f.end}${f.winner?`. ${f.winner} wins`:'. No winner'}. `+(f.swing?`The biggest swing came in round ${f.swing.round}, in ${f.swing.who}'s favour. `:'')+`${f.sigs} signature${f.sigs===1?'':'s'} and ${f.counters} counter${f.counters===1?'':'s'} were played. Final exchange: ${f.last}. Every round is hash-chained; verify the replay to confirm it.`;
}
export async function recapOf(env:Env,v:any){
 const hit=await env.DB.prepare('SELECT source,text FROM recaps WHERE match_id=?').bind(v.match_id).first<{source:string;text:string}>();
 if(hit)return {match_id:v.match_id,source:hit.source,advisory:true,text:hit.text};
 let text=templateRecap(v),source='template';
 if(env.RECAP_LIVE_ENABLED==='true'&&env.AI){
  try{
   const f=facts(v);
   const r=await Promise.race([env.AI.run(env.RECAP_MODEL??'@cf/meta/llama-3.1-8b-instruct',{messages:[{role:'system',content:'You write a calm, factual 2-3 sentence recap of a finished duel between two AI personas, in a noir cyberpunk tone. Use ONLY the facts given. No new lore, no character names other than the two given, no claims of consciousness, no markup.'},{role:'user',content:JSON.stringify(f)}],max_tokens:140}),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),4000))]) as {response?:string};
   const t=(r.response??'').replace(/\s+/g,' ').trim();
   if(t.length>=40&&t.length<=600&&!/[<>`#*_\[\]]/.test(t)&&!/conscious|sentient|smartest|unhackable/i.test(t)){text=t;source='workers-ai';}
  }catch{/* keep template */}
 }
 await env.DB.prepare('INSERT OR IGNORE INTO recaps(match_id,source,text,created_at) VALUES(?,?,?,?)').bind(v.match_id,source,text,new Date().toISOString()).run();
 return {match_id:v.match_id,source,advisory:true,text};
}
