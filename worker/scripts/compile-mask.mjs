// Run locally beside Muse. Only the output Mask is suitable for registration.
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {compileMask} from '../dist/src/mask.js';
const file=process.argv[2];if(!file)throw Error('Usage: node scripts/compile-mask.mjs local-mask-config.json');
const config=JSON.parse(await readFile(file,'utf8'));const paths=config.sources;const sources={};
for(const name of ['identity','soul','memory'])sources[name]=paths[name]?await readFile(resolve(dirname(file),paths[name]),'utf8'):'';
process.stdout.write(JSON.stringify(compileMask({...config,sources}),null,2)+'\n');
