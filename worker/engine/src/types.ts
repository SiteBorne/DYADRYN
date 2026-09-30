export type StatName =
  | "ANALYSIS"
  | "EXECUTION"
  | "ADAPTATION"
  | "INFLUENCE"
  | "RESOLVE"
  | "CREATIVITY";
export type ActionType =
  | "TRACE"
  | "PRESS"
  | "GUARD"
  | "COUNTER"
  | "ADAPT"
  | "MIRROR"
  | "RECOVER"
  | "SIGNATURE";
export type AdaptStance =
  | "PREDATOR"
  | "SENTINEL"
  | "HUNTER"
  | "VEIL"
  | "FLUX"
  | "WILD";
export type SignatureId =
  | "SECOND_ORDER_SIGHT"
  | "CONSTRAINT_COLLAPSE"
  | "COUNTERFACTUAL_SHIELD"
  | "STILLPOINT"
  | "BROKER_LOCK"
  | "ARCHIVE_ECHO"
  | "SWARM_REPAIR"
  | "VEIL_STEP";
export type Stats = Record<StatName, number>;
export interface Resources {
  vitality: number;
  energy: number;
  focus: number;
  heat: number;
  momentum: number;
  guard: number;
  drift: number;
}
export interface BattleAction {
  action: ActionType;
  intensity: 1 | 2 | 3;
  prediction?: Exclude<ActionType, "COUNTER">;
  adaptStance?: AdaptStance;
  signatureId?: string;
}
export interface StallAction {
  action: "STALL";
}
export type ResolvedAction = BattleAction | StallAction;
export interface HistoryEntry {
  action: ResolvedAction;
  pattern?: BattleAction;
}
export interface PlayerState {
  agentId: string;
  stats: Stats;
  resources: Resources;
  insightStacks: number;
  timeouts: number;
  repetitionCount: number;
  previousBaseAction?: ActionType;
  previousAction?: ResolvedAction;
  activeAdapt?: {
    stance: AdaptStance;
    roundsRemaining: number;
    scale?: number;
  };
  cooldowns: Record<string, number>;
  signatures: string[];
  history?: HistoryEntry[];
  revealedSignals?: string[];
  secondOrderSight?: boolean;
  /** v2: mirrored streak of rounds in which both agents held back (the Accord). */
  accord?: number;
  /** v2: rounds of Reprisal remaining for the agent that was betrayed. */
  reprisal?: number;
}
export interface Outcome {
  winner: string | null;
  reason: "ko" | "double_ko" | "forfeit" | "double_forfeit" | "round_limit";
}
export interface RoundState {
  round: number;
  a: PlayerState;
  b: PlayerState;
  previousEventHash?: string;
}
export interface PlayerDelta extends Resources {
  insightStacks: number;
  notes: string[];
}
export interface RoundResult extends RoundState {
  notes: string[];
  deltas: { a: PlayerDelta; b: PlayerDelta };
  outcome: Outcome | null;
}
