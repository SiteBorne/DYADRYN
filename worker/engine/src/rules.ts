import type {
  Stats,
  Resources,
  AdaptStance,
  StatName,
  SignatureId,
} from "./types.js";
import { RULES } from "./rules.generated.js";
export { RULES };
function freeze(value: unknown): void {
  if(value && typeof value === 'object' && !Object.isFrozen(value)) { for(const v of Object.values(value)) freeze(v); Object.freeze(value); }
}
freeze(RULES);
// Ruleset v2 knobs. Absent in the v1 YAML => every v2 code path is skipped and v1 replays stay byte-identical.
export interface V2Rules {
  accord: { cap: number; dividend_focus: number; dividend_energy: number; streak_bonus: number; betrayal_bonus: number; reprisal_rounds: number; reprisal_bonus: number };
  novelty: { window: number; bonus: number; counter_surprise: number };
  fatigue: { guard_decay: number; recover_decay: number; floor: number };
  stale: { lead_min: number; drift: number; standoff_rounds: number; standoff_drift: number; standoff_chip: number };
  signature: { scale: number; per: Record<string, number> };
  veil: { evade: number; guard: number; energy: number };
  exposure: { trace: number; adapt: number };
  insight: { press_bonus: number };
  adapt: { amount: number; focus: number; guard: number };
  stat_weight: { ANALYSIS: number; EXECUTION: number; ADAPTATION: number; RESOLVE: number };
  influence: { read: number };
}
export const V2: V2Rules | null = (RULES as unknown as { v2?: V2Rules }).v2 ?? null;
/** 0..1 leverage of a 50..90 attribute. Low attributes earn no bonus; the four other attributes keep their own roles. */
export const lev = (s: number): number => Math.max(0, Math.min(1, (s - RULES.stats.min) / (RULES.stats.max - RULES.stats.min)));
export const MAX_ROUNDS = RULES.match.max_rounds;
export const ACTIONS = [
  "TRACE",
  "PRESS",
  "GUARD",
  "COUNTER",
  "ADAPT",
  "MIRROR",
  "RECOVER",
  "SIGNATURE",
] as const;
export const ENERGY_COST = {
  TRACE: RULES.actions.TRACE.energy,
  PRESS: RULES.actions.PRESS.energy,
  GUARD: RULES.actions.GUARD.energy,
  COUNTER: RULES.actions.COUNTER.energy,
  MIRROR: RULES.actions.MIRROR.energy,
};
export const INTENSITY = [
  RULES.intensity["1"],
  RULES.intensity["2"],
  RULES.intensity["3"],
] as const;
// These template constants and stance pairs come from Mechanics sections 8-9 (not present in YAML).
export const SIGNATURES: Record<
  SignatureId,
  { energy: number; cooldown: number }
> = {
  SECOND_ORDER_SIGHT: { energy: 18, cooldown: 4 },
  CONSTRAINT_COLLAPSE: { energy: 22, cooldown: 4 },
  COUNTERFACTUAL_SHIELD: { energy: 20, cooldown: 4 },
  STILLPOINT: { energy: 18, cooldown: 4 },
  BROKER_LOCK: { energy: 21, cooldown: 4 },
  ARCHIVE_ECHO: { energy: 20, cooldown: 4 },
  SWARM_REPAIR: { energy: 20, cooldown: 5 },
  VEIL_STEP: { energy: 19, cooldown: 4 },
};
export const STANCES: Record<AdaptStance, readonly [StatName, StatName]> = {
  PREDATOR: ["EXECUTION", "RESOLVE"],
  SENTINEL: ["RESOLVE", "INFLUENCE"],
  HUNTER: ["ANALYSIS", "CREATIVITY"],
  VEIL: ["INFLUENCE", "EXECUTION"],
  FLUX: ["ADAPTATION", "ANALYSIS"],
  WILD: ["CREATIVITY", "RESOLVE"],
};
export function statFactor(s: number): number {
  return 0.75 + (s - 40) / 120;
}
export function clampResources(r: Resources): Resources {
  const result = { ...r };
  for (const key of Object.keys(
    RULES.resources,
  ) as (keyof typeof RULES.resources)[]) {
    const k = key.toLowerCase() as keyof Resources;
    const limits = RULES.resources[key];
    if (!Number.isFinite(r[k])) throw new Error("non_finite_resource");
    result[k] = Math.max(
      limits.min,
      Math.min(limits.max, k === "momentum" ? Math.round(r[k]) : r[k]),
    );
  }
  return result;
}
export function assertStats(s: Stats): void {
  if (
    Object.keys(s).length !== 6 ||
    RULES.stats.names.some(
      (k) =>
        !Number.isInteger(s[k]) ||
        s[k] < RULES.stats.min ||
        s[k] > RULES.stats.max,
    )
  )
    throw new Error("stats_out_of_bounds");
  if (RULES.stats.names.reduce((n, k) => n + s[k], 0) !== RULES.stats.total)
    throw new Error("stat_total_not_420");
}
export function driftEffectiveness(d: number): number {
  return d >= RULES.thresholds.drift_2.drift
    ? RULES.thresholds.drift_2.effectiveness
    : d >= RULES.thresholds.drift_1.drift
      ? RULES.thresholds.drift_1.effectiveness
      : 1;
}
export function heatOutgoing(h: number): number {
  return h >= RULES.thresholds.critical_heat.heat
    ? RULES.thresholds.critical_heat.outgoing_multiplier
    : h >= RULES.thresholds.bright.heat
      ? RULES.thresholds.bright.outgoing_multiplier
      : 1;
}
export function heatIncoming(h: number): number {
  return h >= RULES.thresholds.critical_heat.heat
    ? RULES.thresholds.critical_heat.incoming_multiplier
    : h >= RULES.thresholds.bright.heat
      ? RULES.thresholds.bright.incoming_multiplier
      : 1;
}
export function proofScore(r: Resources): number {
  const w = RULES.proof_score;
  return (
    w.vitality * r.vitality +
    w.energy * r.energy +
    w.focus * r.focus +
    w.guard_normalized * ((r.guard / 60) * 100) +
    w.momentum_normalized * (((r.momentum + 3) / 6) * 100) +
    w.inverse_drift * (100 - r.drift)
  );
}
