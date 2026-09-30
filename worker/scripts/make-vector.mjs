// Regenerates evidence/frozen-proof-vector.json for the CURRENT ruleset: one fixed seeded match + its verifier output.
// Node and workerd must agree on it exactly (tests/vector.test.mjs). Run after any ruleset change, then review the diff.
import {writeFileSync} from 'node:fs';
import * as E from '../dist/engine/src/index.js';
import {houseMask,houseChoose} from '../dist/src/house.js';
const a=houseMask('Veil','house.a'),b=houseMask('Swarm','house.b');
let m=E.createMatch({matchId:'frozen-vector-v2',seed:'frozen-vector-seed-'+E.RULES.ruleset_id,a:E.createPlayer('A',a.stats,a.signatures.map(s=>s.template_id)),b:E.createPlayer('B',b.stats,b.signatures.map(s=>s.template_id)),now:0,mode:'MODEL_TRIAL'});
const env=(m,id,x)=>({match_id:m.matchId,round:m.state.round,actor_id:id,state_hash:E.stateHash(m),client_nonce:`nonce-${id}-${m.state.round}`,action:x.action,intensity:x.intensity,...(x.prediction?{prediction:x.prediction}:{}),...(x.adaptStance?{adapt_stance:x.adaptStance}:{}),...(x.signatureId?{signature_id:x.signatureId}:{})});
while(!m.outcome){const x=houseChoose(m.state.a,m.state.b,'vec',m.state.round,0),y=houseChoose(m.state.b,m.state.a,'vec',m.state.round,1);m=E.lockAction(m,env(m,'A',x),m.openedAt);m=E.lockAction(m,env(m,'B',y),m.openedAt);m=E.resolveLockedRound(m,m.openedAt);}
const replay=E.exportReplay(m);writeFileSync('evidence/frozen-proof-vector.json',JSON.stringify({ruleset:E.RULES.ruleset_id,replay,expected:E.verifyReplay(replay)},null,1));
console.log('vector',E.RULES.ruleset_id,'rounds',replay.events.length,replay.terminal_result);
