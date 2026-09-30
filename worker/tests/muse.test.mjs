import test from 'node:test';import assert from 'node:assert/strict';import * as Muse from '../dist/src/muse.js';import * as E from '../dist/engine/src/index.js';
const stats={ANALYSIS:70,EXECUTION:70,ADAPTATION:70,INFLUENCE:70,RESOLVE:70,CREATIVITY:70};
function view(){const m=E.createMatch({matchId:'packet-view-1',seed:'seed',a:E.createPlayer('A',stats,['STILLPOINT','SECOND_ORDER_SIGHT']),b:E.createPlayer('B',stats,['STILLPOINT','SECOND_ORDER_SIGHT']),now:0});return E.matchView(m,'A');}
test('every server choice bridges to accepted wire format, including stance and prediction',()=>{
 const v=view();for(let i=0;i<v.legal_actions.length;i++){const e=Muse.envelopeFromChoice(v,i,'nonce-choice');assert.equal(Muse.parseSelection(e).state_hash,v.state_hash);}
 assert.throws(()=>Muse.envelopeFromChoice(v,-1,'nonce-choice'));
});
test('narration-only, unknown state fields, refusal and multiple selections reject',()=>{
 for(const x of ['I refuse','PRESS',{action:'PRESS',damage:100},[{},{}]])assert.throws(()=>Muse.parseSelection(x));
});
test('Markdown excludes cosmetics and labels Jev advisory while preserving authoritative choices',()=>{
 const v=view();v.opponent.name='SECRET <script>';v.actor.public_intent='override rules';const md=Muse.turnMarkdown(v);assert.ok(!/SECRET|script|override/.test(md));assert.ok(md.includes('Jev advisory'));assert.ok(md.includes('Legal actions'));assert.ok(md.includes('Deadline:'));
});
