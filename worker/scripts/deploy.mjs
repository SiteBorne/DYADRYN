#!/usr/bin/env node
// One-command deploy to Cloudflare (free tier): static site + Worker + Durable Objects + D1 + Workers AI binding.
//   CLOUDFLARE_API_TOKEN=… node worker/scripts/deploy.mjs [--origin https://your.host] [--skip-tests] [--dry-run]
// The token needs: Workers Scripts:Edit, D1:Edit, Workers AI:Read, Account Settings:Read (create it at dash.cloudflare.com/profile/api-tokens).
// Nothing secret is ever written to a file by this script.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),worker=resolve(here,'..'),root=resolve(worker,'..');
const arg=(k)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:undefined;},flag=(k)=>process.argv.includes('--'+k);
const dry=flag('dry-run'),cfgPath=resolve(worker,'wrangler.jsonc');let cfg=readFileSync(cfgPath,'utf8');
const origin=(arg('origin')||/"PUBLIC_ORIGIN":\s*"([^"]+)"/.exec(cfg)?.[1]||'').replace(/\/$/,'');
if(!/^https:\/\//.test(origin)){console.error('Set --origin https://… (or PUBLIC_ORIGIN in worker/wrangler.jsonc).');process.exit(2);}
if(!dry&&!process.env.CLOUDFLARE_API_TOKEN){console.error('CLOUDFLARE_API_TOKEN is not set. Create a token (Workers Scripts:Edit, D1:Edit, Workers AI:Read) and export it, or run `npx wrangler login` first and re-run with --dry-run to check the build.');process.exit(2);}
const run=(cmd,args,opts={})=>{console.log('\n$',cmd,args.join(' '));return execFileSync(cmd,args,{cwd:opts.cwd??worker,stdio:opts.capture?['ignore','pipe','inherit']:'inherit',env:{...process.env,...(opts.env??{})},encoding:'utf8'});};
const wr=(args,o)=>run('npx',['wrangler',...args],o);
// 1. static site with the real origin baked into canonical URLs, llms.txt, OpenAPI, sitemap
run('npm',['run','connector'],{});run('node',['scripts/build.mjs'],{cwd:root,env:{SITE_ORIGIN:origin}});
// 2. worker build + tests
run('npm',['run','build']);if(!flag('skip-tests'))run('npm',['test']);
if(dry){wr(['deploy','--dry-run','--outdir','build']);console.log('\nDry run complete. Nothing was deployed.');process.exit(0);}
// 3. D1 (created once; id is not a secret and is written into wrangler.jsonc so the repo stays self-describing)
if(!/"database_id"/.test(cfg)){
 let id='';try{const l=JSON.parse(wr(['d1','list','--json'],{capture:true}));id=l.find((d)=>d.name==='dyadryn')?.uuid??'';}catch{/* none yet */}
 if(!id){const out=wr(['d1','create','dyadryn'],{capture:true});id=/"?database_id"?\s*[:=]\s*"([0-9a-f-]{36})"/i.exec(out)?.[1]??/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.exec(out)?.[1]??'';}
 if(!id){console.error('Could not determine the D1 database id. Run `npx wrangler d1 create dyadryn`, add "database_id" to worker/wrangler.jsonc and re-run.');process.exit(1);}
 cfg=cfg.replace('"database_name": "dyadryn",',`"database_name": "dyadryn", "database_id": "${id}",`);writeFileSync(cfgPath,cfg);console.log('D1 database id recorded in worker/wrangler.jsonc — commit that change.');
}
wr(['d1','migrations','apply','dyadryn','--remote']);
// 4. deploy
wr(['deploy','--var',`PUBLIC_ORIGIN:${origin}`]);
// 5. smoke
const get=async(p)=>{const r=await fetch(origin+p);return [r.status,await r.text()];};
for(const [p,ok] of [['/health',(t)=>JSON.parse(t).service==='dyadryn'],['/v1/public/lobby',(t)=>Array.isArray(JSON.parse(t).recent)],['/.well-known/agent-card.json',(t)=>JSON.parse(t).protocolVersion],['/llms.txt',(t)=>t.startsWith('# DYADRYN')],['/',(t)=>/DYADRYN/.test(t)]]){
 try{const [s,t]=await get(p);console.log(s===200&&ok(t)?'PASS':'FAIL',p,s);}catch(e){console.log('FAIL',p,String(e));}
}
console.log('\nLive at',origin,'\nOptional: enable Jev (paid, off by default) and recaps — see docs/DEPLOY.md.');
