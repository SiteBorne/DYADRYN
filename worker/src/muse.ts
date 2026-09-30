import {Ajv2020} from 'ajv/dist/2020.js';
import actionSchema from '../schemas/action.schema.json' with {type:'json'};
import {canonical,type ActionEnvelope} from '../engine/src/index.js';
import type {Evidence,View} from './jev.js';
const check=new Ajv2020({strict:false}).compile<ActionEnvelope>(actionSchema);
export const escapeMarkdown=(s:string)=>s.replace(/[\\`*_{}\[\]()#+.!|<>\r\n]/g,c=>'\\'+c);
export function parseSelection(input:unknown):ActionEnvelope{if(!check(input))throw new Error('invalid_action_schema');return structuredClone(input);}
export function turnMarkdown(v:View,e?:Evidence){
 const resource=(r:Record<string,number>)=>Object.entries(r).map(([k,n])=>`${k.toUpperCase()} ${Number(n).toFixed(2)}`).join(' | ');
 return `# DYADRYN TURN\nMatch: ${escapeMarkdown(v.match_id)} | Mode: ${v.mode} | Ruleset: ${v.ruleset_version}\nRound: ${v.round}/${v.max_rounds} | Deadline: ${v.deadline??'closed'}\nState: ${v.state_hash}\n\n## You\n${resource(v.actor.resources)}\n\n## Opponent — public only\n${resource(v.opponent.resources)}\nPrivate context: withheld by Mask.\n\n## Signals\n${v.revealed_signals.map(escapeMarkdown).join(', ')||'None revealed'}\n\n## Recent public actions\n${v.recent_actions.slice(-6).map(h=>`${h.round}: ${h.actor.action} / ${h.opponent?.action??'unknown'}`).join('\n')}\n\n## Legal actions\n${v.legal_actions.map((a,i)=>`${i+1}. ${canonical(a)}`).join('\n')}\n\n## Objective\nChoose exactly one supplied legal action. Submit JSON action intent with state_hash and a fresh client_nonce. The engine resolves the outcome.\n\n## Jev advisory evidence\n${e?.status==='available'?'Fixture or uncalibrated evidence; confidence is not established tactical accuracy.\nQuestion set: '+e.question_set_id+'\n'+canonical(e.answers):'Unavailable or disabled. Choose from authoritative state and legal actions.'}\n`;
}

export function envelopeFromChoice(v:View,index:number,nonce:string):ActionEnvelope {
 if(!Number.isInteger(index)||index<0||index>=v.legal_actions.length)throw new Error('invalid_choice');
 const a=v.legal_actions[index];
 return parseSelection({match_id:v.match_id,actor_id:v.actor.agent_id,round:v.round,state_hash:v.state_hash,client_nonce:nonce,action:a.action,intensity:a.intensity,
 ...(a.prediction?{prediction:a.prediction}:{}),...(a.adaptStance?{adapt_stance:a.adaptStance}:{}),...(a.signatureId?{signature_id:a.signatureId}:{})});
}
