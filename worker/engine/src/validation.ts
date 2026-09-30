import { archivePattern } from "./history.js";
import type {
  BattleAction,
  PlayerState,
  RoundState,
  SignatureId,
  Stats,
  Resources,
} from "./types.js";
import {
  ACTIONS,
  STANCES,
  SIGNATURES,
  RULES,
  ENERGY_COST,
  assertStats,
  clampResources,
  statFactor,
  V2,
} from "./rules.js";
const own = (o: object, k: string) => Object.hasOwn(o, k);
export function assertAction(value: unknown): asserts value is BattleAction {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid_action");
  const a = value as BattleAction;
  if (
    Object.keys(a).some(
      (k) =>
        ![
          "action",
          "intensity",
          "prediction",
          "adaptStance",
          "signatureId",
        ].includes(k),
    )
  )
    throw new Error("unknown_action_field");
  if (!ACTIONS.includes(a.action) || ![1, 2, 3].includes(a.intensity))
    throw new Error("invalid_action");
  if (
    a.prediction !== undefined &&
    (!ACTIONS.includes(a.prediction) || String(a.prediction) === "COUNTER")
  )
    throw new Error("invalid_prediction");
  if (a.adaptStance !== undefined && !own(STANCES, a.adaptStance))
    throw new Error("invalid_stance");
  if (
    a.signatureId !== undefined &&
    (typeof a.signatureId !== "string" || a.signatureId.length > 64)
  )
    throw new Error("invalid_signature");
  if (a.action === "COUNTER" && !a.prediction)
    throw new Error("counter_prediction_required");
  if (a.action === "ADAPT" && !a.adaptStance)
    throw new Error("adapt_stance_required");
  if (
    a.action === "SIGNATURE" &&
    (!a.signatureId || !own(SIGNATURES, a.signatureId))
  )
    throw new Error("invalid_signature");
}
export function cost(a: BattleAction): number {
  if (a.action === "RECOVER") return 0;
  if (a.action === "ADAPT") return RULES.actions.ADAPT.energy;
  if (a.action === "SIGNATURE")
    return SIGNATURES[a.signatureId as SignatureId].energy;
  return ENERGY_COST[a.action][a.intensity - 1];
}
export function previousPattern(p: PlayerState): BattleAction | undefined {
  const a = p.previousAction;
  if (
    !a ||
    a.action === "STALL" ||
    a.action === "MIRROR" ||
    a.action === "SIGNATURE"
  )
    return undefined;
  return a;
}
export function validateAction(
  p: PlayerState,
  opponent: PlayerState,
  a: BattleAction,
): void {
  assertAction(a);
  if (p.resources.energy < cost(a))
    throw new Error(`insufficient_energy:${a.action}`);
  if (a.action === "ADAPT" && (p.activeAdapt || (p.cooldowns.ADAPT ?? 0) > 0))
    throw new Error("adapt_on_cooldown");
  if (a.action === "MIRROR") {
    const pattern = previousPattern(opponent);
    if (!pattern) throw new Error("mirror_no_previous_opponent_pattern");
    if (
      pattern.action === "ADAPT" &&
      (p.activeAdapt || (p.cooldowns.ADAPT ?? 0) > 0)
    )
      throw new Error("mirror_adapt_on_cooldown");
  }
  if (a.action === "SIGNATURE") {
    if (
      a.signatureId === "ARCHIVE_ECHO" &&
      archivePattern(opponent)?.action === "ADAPT" &&
      (p.activeAdapt || (p.cooldowns.ADAPT ?? 0) > 0)
    )
      throw new Error("archive_adapt_on_cooldown");
    if (!p.signatures.includes(a.signatureId!))
      throw new Error("signature_not_equipped");
    if (p.resources.focus < RULES.actions.SIGNATURE.default_focus_requirement)
      throw new Error("insufficient_focus");
    if ((p.cooldowns[a.signatureId!] ?? 0) > 0)
      throw new Error("signature_on_cooldown");
  }
}
export const SIGNALS = [
  "prefers high intensity",
  "counter-oriented",
  "resource-preserving",
  "information-seeking",
  "volatile",
  "long-horizon",
  "likely to repeat successful lines",
] as const;
export function assertPlayer(p: PlayerState): void {
  const keys = [
    "agentId",
    "stats",
    "resources",
    "insightStacks",
    "timeouts",
    "repetitionCount",
    "previousBaseAction",
    "previousAction",
    "activeAdapt",
    "cooldowns",
    "signatures",
    "history",
    "revealedSignals",
    "secondOrderSight",
    "accord",
    "reprisal",
  ];
  if (!p || Object.keys(p).some((k) => !keys.includes(k)))
    throw new Error("unknown_player_field");
  if (
    !p.resources ||
    Object.keys(p.resources).length !== 7 ||
    Object.keys(p.resources).some(
      (k) =>
        !Object.hasOwn(RULES.resources, k.toUpperCase()) ||
        k !== k.toLowerCase(),
    )
  )
    throw new Error("invalid_resource_shape");
  if (p.insightStacks > 3) throw new Error("insight_out_of_bounds");
  for (const k of ["accord", "reprisal"] as const)
    if (p[k] !== undefined && (!V2 || !Number.isInteger(p[k]) || (p[k] as number) < 0 || (p[k] as number) > Math.max(V2.accord.cap, V2.accord.reprisal_rounds)))
      throw new Error("invalid_v2_counter");
  if (
    p.secondOrderSight !== undefined &&
    typeof p.secondOrderSight !== "boolean"
  )
    throw new Error("invalid_sight");
  if (
    p.revealedSignals !== undefined &&
    (!Array.isArray(p.revealedSignals) ||
      new Set(p.revealedSignals).size !== p.revealedSignals.length ||
      p.revealedSignals.some(
        (s) => !(SIGNALS as readonly string[]).includes(s),
      ))
  )
    throw new Error("invalid_signals");
  if (
    Object.keys(p.cooldowns).some((k) => k !== "ADAPT" && !own(SIGNATURES, k))
  )
    throw new Error("invalid_cooldown");
  if (
    !p ||
    typeof p.agentId !== "string" ||
    p.agentId.length < 1 ||
    p.agentId.length > 80
  )
    throw new Error("invalid_agent_id");
  assertStats(p.stats);
  const clamped = clampResources(p.resources);
  for (const k of Object.keys(clamped) as (keyof typeof clamped)[])
    if (clamped[k] !== p.resources[k])
      throw new Error("resource_out_of_bounds");
  for (const v of [
    p.insightStacks,
    p.timeouts,
    p.repetitionCount,
    ...Object.values(p.cooldowns),
  ])
    if (!Number.isInteger(v) || v < 0) throw new Error("invalid_counter");
  if (
    !Array.isArray(p.signatures) ||
    p.signatures.length !== 2 ||
    new Set(p.signatures).size !== 2 ||
    p.signatures.some((s) => !own(SIGNATURES, s))
  )
    throw new Error("invalid_signatures");
  if (
    p.activeAdapt !== undefined &&
    (typeof p.activeAdapt !== "object" || p.activeAdapt === null || !own(STANCES, p.activeAdapt.stance) ||
      !Number.isInteger(p.activeAdapt.roundsRemaining) ||
      p.activeAdapt.roundsRemaining < 1 ||
      p.activeAdapt.roundsRemaining > 3 ||
      !Number.isFinite(p.activeAdapt.scale ?? 1) ||
      (p.activeAdapt.scale ?? 1) <= 0 ||
      (p.activeAdapt.scale ?? 1) >
        Math.max(1, RULES.actions.MIRROR.base_scale * statFactor(RULES.stats.max)) * (V2 ? (1 + V2.novelty.bonus) * Math.max(1, V2.signature.scale) : 1))
  )
    throw new Error("invalid_adapt");
  if (p.activeAdapt !== undefined && Object.keys(p.activeAdapt).some(k => !["stance", "roundsRemaining", "scale"].includes(k))) throw new Error("unknown_adapt_field");
  if (p.previousBaseAction !== undefined && (!ACTIONS.includes(p.previousBaseAction) || p.previousBaseAction === "SIGNATURE")) throw new Error("invalid_previous_base_action");
  if (p.history !== undefined && !Array.isArray(p.history)) throw new Error("invalid_history");
  if (p.previousAction !== undefined && (!p.previousAction || typeof p.previousAction !== "object")) throw new Error("invalid_previous_action");
  if (p.previousAction?.action === "STALL" && Object.keys(p.previousAction).length !== 1) throw new Error("unknown_stall_field");
  if (p.previousAction && p.previousAction.action !== "STALL")
    assertAction(p.previousAction);
  if (p.history && p.history.length > RULES.match.max_rounds)
    throw new Error("invalid_history");
  for (const h of p.history ?? []) {
    if (Object.keys(h).some(k => !["action", "pattern"].includes(k))) throw new Error("unknown_history_field");
    if (h.action.action === "STALL" && Object.keys(h.action).length !== 1) throw new Error("unknown_stall_field");
    if (h.action.action !== "STALL") assertAction(h.action);
    if (h.pattern) assertAction(h.pattern);
  }
}
export function assertState(s: RoundState): void {
  if(!s || Object.keys(s).some(k=>!["round","a","b","previousEventHash"].includes(k))) throw new Error("unknown_state_field");
  if (
    !Number.isInteger(s.round) ||
    s.round < 1 ||
    s.round > RULES.match.max_rounds
  )
    throw new Error("invalid_round");
  assertPlayer(s.a);
  assertPlayer(s.b);
  if (s.a.agentId === s.b.agentId) throw new Error("duplicate_agent");
  if (
    s.a.resources.vitality <= 0 ||
    s.b.resources.vitality <= 0 ||
    s.a.timeouts >= 3 ||
    s.b.timeouts >= 3
  )
    throw new Error("match_already_terminal");
}

export function createPlayer(
  agentId: string,
  stats: Stats,
  signatures: string[],
): PlayerState {
  const resources = Object.fromEntries(
    Object.entries(RULES.resources).map(([k, v]) => [
      k.toLowerCase(),
      v.initial,
    ]),
  ) as unknown as Resources;
  const p: PlayerState = {
    agentId,
    stats: { ...stats },
    resources,
    signatures: [...signatures],
    insightStacks: 0,
    timeouts: 0,
    repetitionCount: 0,
    cooldowns: {},
  };
  assertPlayer(p);
  return p;
}
