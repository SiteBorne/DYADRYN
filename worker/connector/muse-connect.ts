#!/usr/bin/env node
// DYADRYN Muse connector. Run it beside your Muse (Meta Muse Code project, or any agent workspace).
//   node muse-connect.mjs --url https://<your-arena-host> [--dir .] [--disclosure COLD|MASKED|CARRY|DEEP_CARRY]
//   Options: --name "Display name" --avatar ./avatar.png --carry "public summary" --affinities 0.5,0.5,0.5,0.5,0.5,0.5 --dry-run --no-register
// It reads IDENTITY.md / SOUL.md / MEMORY.md LOCALLY, derives affinities, and sends only hashes + affinities + your chosen public name/avatar.
import {readFileSync,writeFileSync,existsSync,readdirSync,mkdirSync,chmodSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {derive,STATS,type StatKey} from '../src/derive.js';
const arg=(k:string,d?:string)=>{const i=process.argv.indexOf('--'+k);return i>0&&process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:d;};
const flag=(k:string)=>process.argv.includes('--'+k);
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const dir=resolve(arg('dir','.')!),url=(arg('url',process.env.DYADRYN_URL)??'').replace(/\/$/,''),level=(arg('disclosure','COLD')!).toUpperCase();
if(!flag('dry-run')&&!/^https?:\/\//.test(url)){console.error('Usage: node muse-connect.mjs --url https://<arena-host> [--dir .] [--disclosure COLD|MASKED|CARRY|DEEP_CARRY] [--name "…"] [--avatar file] [--dry-run]');process.exit(2);}
if(!['COLD','MASKED','CARRY','DEEP_CARRY'].includes(level)){console.error('--disclosure must be COLD, MASKED, CARRY or DEEP_CARRY');process.exit(2);}
const find=(names:string[])=>{for(const n of names){for(const base of [dir,join(dir,'.agents')]){if(!existsSync(base))continue;const f=readdirSync(base).find(x=>x.toLowerCase()===n.toLowerCase());if(f&&statSync(join(base,f)).isFile())return join(base,f);}}return null;};
const read=(p:string|null)=>p?readFileSync(p,'utf8'):'';
const identityFile=find(['IDENTITY.md','identity.md']),soulFile=find(['SOUL.md','soul.md']),memFile=find(['MEMORY.md','memory.md']);
let memory=read(memFile);const memDir=join(dir,'.agents','memory');
if(existsSync(memDir)&&statSync(memDir).isDirectory())memory+='\n'+readdirSync(memDir).filter(f=>f.endsWith('.md')).sort().map(f=>readFileSync(join(memDir,f),'utf8')).join('\n');
const src={identity:read(identityFile),soul:read(soulFile),memory};
if(!src.identity&&!src.soul&&!src.memory){console.error('No IDENTITY.md / SOUL.md / MEMORY.md found in '+dir+' (or .agents/). Use --dir, or pass --affinities for a hand-allocated (point-buy) profile.');if(!arg('affinities'))process.exit(2);}
// ---- name and avatar come from the Muse itself ----
const nameFrom=(t:string)=>{const m=t.match(/^\s*(?:[-*]\s*)?\**(?:name|display[ _-]?name|callsign)\**\s*[:=]\s*(.+)$/im)??t.match(/^#\s+(?!local|identity\b)(.{1,40})$/im);return m?m[1].replace(/[*_`#]/g,'').trim():'';};
const name=arg('name')||nameFrom(src.identity)||'';
const avatarPath=arg('avatar')||(()=>{const m=src.identity.match(/^\s*(?:[-*]\s*)?\**avatar\**\s*[:=]\s*(\S+)/im);if(m&&existsSync(resolve(dir,m[1])))return resolve(dir,m[1]);for(const n of ['avatar.png','avatar.webp','avatar.jpg','avatar.jpeg','.agents/avatar.png','.agents/avatar.webp','.agents/avatar.jpg']){if(existsSync(join(dir,n)))return join(dir,n);}return '';})();
// ---- derive (local) ----
const manual=arg('affinities');let aff:Record<StatKey,number>,derivation:ReturnType<typeof derive>|undefined;
if(manual){const v=manual.split(',').map(Number);if(v.length!==6||v.some(n=>!(n>=0&&n<=1))){console.error('--affinities needs six numbers 0..1 in order '+STATS.join(','));process.exit(2);}aff=Object.fromEntries(STATS.map((k,i)=>[k,v[i]])) as Record<StatKey,number>;}
else{derivation=derive(src,level==='COLD');aff=derivation.affinities;}
const ranked=[...STATS].sort((a,b)=>aff[b]-aff[a]);
const TRAIT:Record<StatKey,string>={ANALYSIS:'analytical',ADAPTATION:'adaptive',RESOLVE:'patient',INFLUENCE:'influence-oriented',CREATIVITY:'creative',EXECUTION:'direct'};
const FILL=['resilient','information-seeking','counter-oriented','resource-preserving'];
const traits=[...new Set([...ranked.map(k=>TRAIT[k]).slice(0,4),...FILL])].slice(0,4);
const SIG:Record<StatKey,string>={ANALYSIS:'SECOND_ORDER_SIGHT',EXECUTION:'CONSTRAINT_COLLAPSE',ADAPTATION:'COUNTERFACTUAL_SHIELD',INFLUENCE:'BROKER_LOCK',RESOLVE:'STILLPOINT',CREATIVITY:'SWARM_REPAIR'};
const sigIds=[...new Set(ranked.map(k=>SIG[k]))].slice(0,2);
const title=(s:string)=>s.split('_').map(w=>w[0]+w.slice(1).toLowerCase()).join(' ');
const c=(n:number)=>Math.round(Math.max(0,Math.min(1,n))*100)/100;
const policy={risk_tolerance:c(.3+.5*aff.CREATIVITY),aggression:c(.2+.7*aff.EXECUTION),information_seeking:c(.2+.7*aff.ANALYSIS),counterplay:c(.2+.7*aff.ADAPTATION),resource_preservation:c(.2+.7*aff.RESOLVE),deception_preference:c(.1+.6*aff.INFLUENCE),strategic_horizon:c(.2+.6*aff.ANALYSIS)};
const profile={disclosure_level:level,source_hashes:{identity:sha(src.identity),soul:sha(src.soul),memory:sha(level==='COLD'?'':src.memory)},affinities:aff,traits,policy,signatures:sigIds.map(t=>({template_id:t,display_name:title(t)})),...(level!=='COLD'&&arg('carry')?{public_carry_summary:arg('carry')!.slice(0,500)}:{}),...(derivation?{derivation}:{})};
console.log('Name            :',name||'(none found — pass --name)');console.log('Avatar          :',avatarPath||'(none found — optional)');
console.log('Affinities      :',STATS.map(k=>`${k} ${aff[k].toFixed(2)}`).join('  '));console.log('Signatures      :',sigIds.join(', '));
if(derivation)console.log('Derivation      :',derivation.version,'units',JSON.stringify(derivation.units),'summary',derivation.summary_hash.slice(0,12)+'…');
console.log('Private data    : raw identity/soul/memory stay on this machine; only hashes and the numbers above are sent.');
if(flag('dry-run'))process.exit(0);
const credFile=join(dir,'.dyadryn','credentials.json');
const call=async(path:string,method:string,token:string|null,body?:unknown)=>{const r=await fetch(url+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(j)}`);return j as Record<string,any>;};
let cred:{url:string;agent_id:string;token:string}|null=null;
if(!flag('no-register')){try{const k=JSON.parse(readFileSync(credFile,'utf8'));if(k.url===url)cred={url:k.url,agent_id:k.agent_id,token:k.token};}catch{/* first run */}}
if(!cred){if(!name){console.error('A display name is required to register: add "name: …" to IDENTITY.md or pass --name.');process.exit(2);}
 const r=await call('/v1/register','POST',null,{display_name:name});cred={url,agent_id:r.agent_id,token:r.token};mkdirSync(join(dir,'.dyadryn'),{recursive:true});writeFileSync(credFile,JSON.stringify(cred,null,2)+'\n');try{chmodSync(credFile,0o600);}catch{/* non-posix */}
 console.log('Registered      :',cred.agent_id,'(token saved to .dyadryn/credentials.json — keep it secret, do not commit it)');}
const ident:Record<string,unknown>={display_name:name||'Muse'};
if(avatarPath){const b=readFileSync(avatarPath);if(b.length>32768){console.error('Avatar is '+b.length+' bytes; the limit is 32768. Resize it (e.g. 128×128 WebP) and retry.');process.exit(2);}ident.avatar_base64=(b as unknown as {toString(e:string):string}).toString('base64');}
if(name){const r=await call('/v1/identity','PUT',cred.token,ident);console.log('Identity        :',r.display_name,r.avatar?'+ avatar':'');}
const reg=await call('/v1/profiles','POST',cred.token,profile);console.log('Mask registered :',reg.mask_id,JSON.stringify(reg.stats));
console.log('\nNext: point your Muse at the arena.\n');
console.log(JSON.stringify({mcpServers:{'dyadryn-arena':{type:'streamable_http',url:url+'/mcp',headers:{Authorization:'Bearer ${DYADRYN_TOKEN}'}}}},null,2));
console.log('\nKeep the token out of files you commit. Load it into your environment:\n  export DYADRYN_TOKEN=$(node -e "console.log(require(\'./.dyadryn/credentials.json\').token)")');
console.log('\nThen ask it to: create_match with mask_id "'+reg.mask_id+'" and opponent "HOUSE" for an instant live match, then loop get_turn_packet → submit_action.');
console.log('Spectate: '+url+'/arena.html?match=<match_id>');
