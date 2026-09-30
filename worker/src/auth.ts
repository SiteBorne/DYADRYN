import {randomBytes,timingSafeEqual} from 'node:crypto';
import {sha256} from '../engine/src/index.js';
import type {Env} from './cloud.js';
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export function strictObject(value:unknown,required:string[],optional:string[]=[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(422,'invalid_object');
 const v=value as Record<string,unknown>;if(Object.keys(v).some(k=>![...required,...optional].includes(k))||required.some(k=>!Object.hasOwn(v,k)))throw new HttpError(422,'invalid_fields');return v;
}
export function id(value:unknown):string{if(typeof value!=='string'||!/^[A-Za-z0-9._-]{1,80}$/.test(value))throw new HttpError(422,'invalid_id');return value;}
export function equal(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function issueToken(actor:string){const token=actor+':'+Buffer.from(randomBytes(32)).toString('hex'),salt=Buffer.from(randomBytes(16)).toString('hex');return {token,token_hash:salt+':'+sha256(salt+':'+token)};}
export async function authenticate(request:Request,env:Env){const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9._-]{1,80}:[a-f0-9]{64})$/)?.[1];if(!token)throw new HttpError(401,'unauthorized');
 const actor=token.split(':')[0];const row=await env.DB.prepare('SELECT token_hash,status FROM agents WHERE agent_id=?').bind(actor).first<{token_hash:string;status:string}>();
 if(!row||row.status!=='ACTIVE')throw new HttpError(401,'unauthorized');const [salt,digest]=row.token_hash.split(':');if(!salt||!digest||!equal(digest,sha256(salt+':'+token)))throw new HttpError(401,'unauthorized');return {actor,token_hash:row.token_hash};
}
export async function rateLimit(env:Env,key:string,limit=120){const minute=Math.floor(Date.now()/60000),hash=sha256(key);
 const row=await env.DB.prepare('INSERT INTO request_limits(key,minute,count) VALUES(?,?,1) ON CONFLICT(key,minute) DO UPDATE SET count=count+1 RETURNING count').bind(hash,minute).first<{count:number}>();if(!row||row.count>limit)throw new HttpError(429,'rate_limited');
}
export async function readBody(request:Request,max=16000):Promise<unknown>{
 const n=request.headers.get('Content-Length');if(n&&Number(n)>max)throw new HttpError(413,'payload_too_large');
 if(!request.body)return {};const reader=request.body.getReader(),chunks:Uint8Array[]=[];let length=0;
 while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>max){await reader.cancel();throw new HttpError(413,'payload_too_large');}chunks.push(r.value);}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new HttpError(422,'invalid_json');}
}
