import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../dist/index.js';
import {player} from './helpers.mjs';
function play(now) {
 let m=E.createMatch({matchId:'proof-vector-1',seed:'fixed-seed',a:player('A'),b:player('B'),now});
 while(!m.outcome){const h=E.stateHash(m);
 for(const id of ['A','B'])m=E.lockAction(m,{match_id:m.matchId,actor_id:id,round:m.state.round,state_hash:h,client_nonce:`nonce-${id}-${m.state.round}`,action:'RECOVER',intensity:2},now+1);
 now+=2;m=E.resolveLockedRound(m,now);
 }return m;
}
test('proof is independent of host timestamps',()=>{
 const a=play(0),b=play(1700000000000);
 assert.equal(E.stateHash(a),E.stateHash(b));assert.deepEqual(a.events,b.events);assert.equal(E.verifyLocalHistory(a),true);
});
test('strict nested state rejects unknown fields and duplicate signatures',()=>{
 for(const mutate of [p=>p.signatures[1]=p.signatures[0],p=>p.activeAdapt={stance:'VEIL',roundsRemaining:2,damage:999},p=>p.history=[{action:{action:'STALL',damage:999}}]]){
 const p=player();mutate(p);assert.throws(()=>E.assertPlayer(p));
 }
});
test('canonical rejects sparse arrays, non-plain objects and unsupported values',()=>{
 for(const value of [new Date(),new Map(),Array(1),{value:()=>1},Infinity])assert.throws(()=>E.canonical(value));
 assert.equal(E.canonical({z:1,a:-0}),'{"a":0,"z":1}');
});

test('independent proof replay verifies terminal match without host timing or Jev',()=>{
 const m=play(1000); const replay=E.exportReplay(m);
 assert.equal(JSON.stringify(replay).includes('resolvedAt'),false);
 assert.equal(E.verifyReplay(replay).verified,true);
 for(const change of [r=>r.events[0].actions.a.intensity=3,r=>r.seed_reveals.server='bad',r=>r.terminal_result.winner='A',r=>r.events[0].jev={damage:99}]){
  const bad=structuredClone(replay);change(bad);assert.throws(()=>E.verifyReplay(bad));
 }
});
test('rules cannot mutate after runtime qualification',()=>{
 assert.throws(()=>{E.RULES.actions.PRESS.base_damage=999;});assert.equal(E.RULES.actions.PRESS.base_damage,11);
});
test('round-state rejects unversioned arbitrary fields',()=>{
 assert.throws(()=>E.assertState({round:1,a:player(),b:player('B'),damage:900}));
});
