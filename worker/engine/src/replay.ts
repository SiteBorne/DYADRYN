// Independent verifier: calls the pure resolver, never the host lock/deadline machinery.
import { canonical, sha256, type LocalMatch, type ProofEvent, type Mode } from './match.js';
import { RULES } from './rules.js';
import { assertState } from './validation.js';
import { resolveRound } from './resolve.js';
import type { RoundState, Outcome } from './types.js';
export interface Replay {
  proof_format: 'dyadryn.proof.v2'; match_id: string; ruleset_version: string; mode: Mode;
  seed_commitments: {server:string}; seed_reveals: {server:string}; initial_state: RoundState;
  events: ProofEvent[]; terminal_result: Outcome; event_root_hash: string;
}
export function exportReplay(m:LocalMatch): Replay {
  if (!m.outcome) throw new Error('replay_not_terminal');
  return structuredClone({proof_format:'dyadryn.proof.v2',match_id:m.matchId,ruleset_version:m.ruleset,mode:m.mode,
    seed_commitments:{server:m.seedCommitment},seed_reveals:{server:m.seed},initial_state:m.initialState,
    events:m.events,terminal_result:m.outcome,event_root_hash:m.eventRootHash});
}
export function verifyReplay(r:Replay): {verified:true; rounds:number; state_hash:string; replay_hash:string} {
  if (!r || Object.keys(r).sort().join(',') !== ['proof_format','match_id','ruleset_version','mode','seed_commitments','seed_reveals','initial_state','events','terminal_result','event_root_hash'].sort().join(',')) throw new Error('replay_shape');
  if(r.proof_format!=='dyadryn.proof.v2'||r.ruleset_version!==RULES.ruleset_id||!['MASKED_RANKED','CARRY_DUEL','MODEL_TRIAL','CUSTOM'].includes(r.mode)) throw new Error('replay_version');
  if(Object.keys(r.seed_reveals).join(',')!=='server'||Object.keys(r.seed_commitments).join(',')!=='server'||sha256(r.seed_reveals.server)!==r.seed_commitments.server) throw new Error('replay_commitment');
  assertState(r.initial_state);
  if(r.initial_state.round!==1||!Array.isArray(r.events)||r.events.length<1||r.events.length>24) throw new Error('replay_rounds');
  let state=structuredClone(r.initial_state),outcome:Outcome|null=null;
  let root=sha256(canonical({matchId:r.match_id,ruleset:r.ruleset_version,mode:r.mode,seedCommitment:r.seed_commitments.server,initialState:state,proofFormat:r.proof_format}));
  for(const e of r.events){
    if(outcome) throw new Error('event_after_terminal');
    const pre=sha256(canonical({matchId:r.match_id,ruleset:r.ruleset_version,mode:r.mode,state,eventRootHash:root}));
    const result=resolveRound(state,e.actions.a,e.actions.b,r.seed_reveals.server);
    const next:RoundState={round:result.outcome?result.round:result.round+1,a:result.a,b:result.b};
    const body={round:state.round,previousHash:root,preStateHash:pre,postStateHash:sha256(canonical(next)),actions:e.actions,deltas:result.deltas,notes:result.notes,outcome:result.outcome};
    const expected={...body,hash:sha256(canonical(body))};
    if(canonical(expected)!==canonical(e)||Object.keys(e.actions).sort().join(',')!=='a,b') throw new Error('replay_event_mismatch');
    state=next;root=expected.hash;outcome=result.outcome;
  }
  if(!outcome||root!==r.event_root_hash||canonical(outcome)!==canonical(r.terminal_result)) throw new Error('replay_terminal_mismatch');
  return {verified:true,rounds:r.events.length,state_hash:sha256(canonical(state)),replay_hash:sha256(canonical(r))};
}
