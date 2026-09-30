// Local-only rehearsal. No AI binding is installed and no account credentials are used.
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import {readFileSync,readdirSync} from 'node:fs';import {resolve} from 'node:path';
const port=Number(process.env.DYADRYN_LOCAL_PORT??8787);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
const persistence=resolve('.local-runtime');
const mf=new Miniflare({...convertV4MiniflareOptions({modules:true,scriptPath:'build/worker.js',hostname:'127.0.0.1',port,compatibilityDate:'2026-09-29',compatibilityFlags:['nodejs_compat'],durableObjects:{MATCH_ROOMS:{className:'MatchRoom',useSQLite:true},EVIDENCE_BUDGET:{className:'EvidenceBudget',useSQLite:true}},d1Databases:{DB:'local-db'},bindings:{ENVIRONMENT:'local',PUBLIC_ORIGIN:`http://127.0.0.1:${port}`,JEV_LIVE_ENABLED:'false',JEV_OPERATOR_AUTHORIZED:'false',JEV_KILL_SWITCH:'true'}}),resourcePersistencePath:persistence,isolatedResourcePersistencePath:persistence});
const db=await mf.getD1Database('DB');const exists=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'").first();
if(!exists)for(const f of readdirSync('db').filter(f=>f.endsWith('.sql')).sort())await db.batch(readFileSync('db/'+f,'utf8').replace(/--[^
]*/g,'').split(';').map(s=>s.trim()).filter(s=>s&&!s.startsWith('PRAGMA')).map(s=>db.prepare(s)));
console.log('DYADRYN local-only candidate: '+await mf.ready);console.log('Jev has no provider binding; ranked play is disabled. Ctrl-C stops the server.');
process.once('SIGINT',async()=>{await mf.dispose();process.exit(0);});process.once('SIGTERM',async()=>{await mf.dispose();process.exit(0);});
