// Public, spectator-safe "frames" for the Duel Table. Computed server-side from the authoritative history.
// The seed and the resolver never leave the server; only resolved public results do.
import {resolveRound,proofScore,type LocalMatch,type PlayerState,type RoundState} from '../engine/src/index.js';
const WP_K:[number,number,number][]=[[1,3,.13],[4,6,.145],[7,10,.15],[11,15,.165],[16,99,.23]];
export const winChance=(s:RoundState)=>{const k=WP_K.find(([lo,hi])=>s.round>=lo&&s.round<=hi)?.[2]??.23;return Math.round(1e3/(1+Math.exp(-k*(proofScore(s.a.resources)-proofScore(s.b.resources)))))/10;};
const slim=(p:PlayerState)=>({r:p.resources,ins:p.insightStacks,sg:p.revealedSignals??[],adapt:p.activeAdapt?{stance:p.activeAdapt.stance,left:p.activeAdapt.roundsRemaining}:null,cd:Object.fromEntries(Object.entries(p.cooldowns).filter(([,v])=>v>0)),sig:p.signatures});
export function framesOf(m:LocalMatch){
 let state:RoundState=structuredClone(m.initialState);
 const frames:unknown[]=[{round:0,wp:50,post:{a:slim(state.a),b:slim(state.b)}}];
 for(const e of m.events){
  const res=resolveRound(state,e.actions.a,e.actions.b,m.seed);
  state={round:res.outcome?res.round:res.round+1,a:res.a,b:res.b};
  const wp=res.outcome?(res.outcome.winner===state.a.agentId?100:res.outcome.winner===state.b.agentId?0:50):winChance(state);
  frames.push({round:e.round,wp,actions:e.actions,notes:e.notes,hash:e.hash,prev:e.previousHash,post:{a:slim(state.a),b:slim(state.b)}});
 }
 return frames;
}
