import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {build} from 'esbuild';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import {verifyReplay} from '../dist/engine/src/index.js';
test('frozen v2 vector agrees exactly in Node and workerd',async()=>{
 const vector=JSON.parse(readFileSync('evidence/frozen-proof-vector.json','utf8'));assert.deepEqual(verifyReplay(vector.replay),vector.expected);
 const bundled=await build({stdin:{contents:`import {verifyReplay} from './engine/src/index.ts';export default {fetch(){return Response.json(verifyReplay(${JSON.stringify(vector.replay)}));}};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-09-29',compatibilityFlags:['nodejs_compat']}));
 try{assert.deepEqual(await (await mf.dispatchFetch('https://vector.test')).json(),vector.expected);}finally{await mf.dispose();}
});
