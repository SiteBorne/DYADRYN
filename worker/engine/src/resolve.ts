import { archivePattern, archiveEntry } from "./history.js";
import type {
  BattleAction,
  HistoryEntry,
  PlayerState,
  PlayerDelta,
  RoundState,
  RoundResult,
  Stats,
  ResolvedAction,
  Outcome,
  SignatureId,
} from "./types.js";
import {
  RULES,
  INTENSITY,
  STANCES,
  SIGNATURES,
  clampResources,
  driftEffectiveness,
  heatIncoming,
  heatOutgoing,
  statFactor,
  proofScore,
} from "./rules.js";
import {
  assertState,
  validateAction,
  previousPattern,
  cost,
} from "./validation.js";
import { jitter } from "./rng.js";

export function roundStart(p: PlayerState): PlayerState {
  return {
    ...p,
    resources: clampResources({
      ...p.resources,
      energy: p.resources.energy + RULES.resources.ENERGY.round_regen,
      guard:
        p.resources.guard * (1 - RULES.resources.GUARD.round_decay_fraction),
    }),
    cooldowns: Object.fromEntries(
      Object.entries(p.cooldowns).map(([k, v]) => [k, Math.max(0, v - 1)]),
    ),
  };
}
export function effectiveStats(p: PlayerState): Stats {
  const s = { ...p.stats };
  if (p.activeAdapt) {
    const [up, down] = STANCES[p.activeAdapt.stance];
    const amount = 8 * (p.activeAdapt.scale ?? 1);
    s[up] += amount;
    s[down] -= amount;
  }
  return s;
}
function delta(): PlayerDelta {
  return {
    vitality: 0,
    energy: 0,
    focus: 0,
    heat: 0,
    momentum: 0,
    guard: 0,
    drift: 0,
    insightStacks: 0,
    notes: [],
  };
}
interface Effect {
  actor: PlayerState;
  opponent: PlayerState;
  selected: ResolvedAction;
  pattern?: BattleAction;
  scale: number;
  d: PlayerDelta;
  raw: number;
  mitigation: number;
  exposure: number;
  incomingDamage: number;
  counterHit: boolean;
  adapt?: PlayerState["activeAdapt"];
  signals: string[];
  preOpponentEnergy: number;
  shield: boolean;
  grantSight: boolean;
  consumeSight: boolean;
}
function setup(
  p: PlayerState,
  o: PlayerState,
  a: BattleAction | null,
  preOpponentEnergy: number,
): Effect {
  const d = delta();
  let pattern = a ?? undefined,
    scale = 1;
  if (a) {
    d.energy -= cost(a);
    if (a.action === "SIGNATURE")
      d.focus -= RULES.actions.SIGNATURE.default_focus_cost;
    if (a.action === "MIRROR") {
      pattern = { ...previousPattern(o)!, intensity: a.intensity };
      scale =
        RULES.actions.MIRROR.base_scale *
        statFactor(effectiveStats(p).ADAPTATION);
    }
  }
  return {
    actor: p,
    opponent: o,
    selected: a ?? { action: "STALL" },
    pattern,
    scale,
    d,
    raw: 0,
    mitigation: 1,
    exposure: 1,
    incomingDamage: 1,
    counterHit: false,
    preOpponentEnergy,
    shield: false,
    grantSight: false,
    consumeSight: false,
    signals: [...(p.revealedSignals ?? [])],
  };
}
function repeatsBase(e: Effect): boolean {
  return (
    e.selected.action !== "STALL" &&
    e.selected.action !== "SIGNATURE" &&
    e.actor.previousAction?.action === e.selected.action
  );
}
function broker(caster: Effect, target: Effect): void {
  if (
    caster.selected.action !== "SIGNATURE" ||
    caster.selected.signatureId !== "BROKER_LOCK" ||
    !repeatsBase(target)
  )
    return;
  // Locked actions stay legal. The surcharge drains available energy and cannot cancel resolution.
  const counter =
    target.pattern?.action === "COUNTER" &&
    target.pattern.prediction === "SIGNATURE";
  const magnitude =
    driftEffectiveness(caster.actor.resources.drift) * (counter ? 0.4 : 1);
  target.d.energy -= cost(target.selected as BattleAction) * 0.4 * magnitude;
  target.scale *= 1 - 0.15 * magnitude;
}
function trace(e: Effect, i: number, seed: string, round: number): void {
  const { d, actor: p, opponent: o } = e;
  d.focus += RULES.actions.TRACE.focus_gain[i] * e.scale;
  // Bounded vocabulary derived only from normalized stats and public action history.
  const history = (o.history ?? []).map((h) => h.action);
  const candidates = [
    ...(history.some((a) => a.action !== "STALL" && a.intensity === 3)
      ? ["prefers high intensity"]
      : []),
    ...(o.stats.ANALYSIS >= 70 || history.some((a) => a.action === "COUNTER")
      ? ["counter-oriented"]
      : []),
    ...(o.stats.RESOLVE >= 70 || history.some((a) => a.action === "RECOVER")
      ? ["resource-preserving"]
      : []),
    ...(o.stats.ANALYSIS >= 70 || history.some((a) => a.action === "TRACE")
      ? ["information-seeking"]
      : []),
    ...(o.stats.CREATIVITY >= 70 ? ["volatile"] : []),
    ...(o.stats.ADAPTATION >= 70 ? ["long-horizon"] : []),
    ...(o.repetitionCount >= 2 ? ["likely to repeat successful lines"] : []),
  ].filter((s) => !e.signals.includes(s));
  if (candidates.length) {
    const rank = (s: string) =>
      jitter(seed, JSON.stringify([round, p.agentId, o.agentId, "trace", s]));
    candidates.sort(
      (a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0),
    );
    e.signals.push(candidates[0]);
    d.insightStacks += 1;
    d.notes.push(`trace:${candidates[0]}`);
  } else d.notes.push("trace:no_new_signal");
}
function press(e: Effect, i: number, seed: string, round: number): number {
  const p = e.actor,
    s = effectiveStats(p);
  return (
    RULES.actions.PRESS.base_damage *
    statFactor(s.EXECUTION) *
    INTENSITY[i] *
    (1 + Math.min(p.resources.focus, 60) / 600) *
    (1 + 0.04 * p.resources.momentum) *
    heatOutgoing(p.resources.heat) *
    e.scale *
    jitter(seed, JSON.stringify([round, p.agentId, "pressure"]))
  );
}
function materialize(
  e: Effect,
  other: Effect,
  seed: string,
  round: number,
): void {
  const { actor: p, d, pattern: a } = e;
  if (!a) {
    const t = RULES.timeout_fallback;
    d.energy += t.energy_delta;
    d.guard += t.guard_delta;
    d.heat += t.heat_delta;
    d.drift += t.drift_delta;
    d.momentum += t.momentum_delta;
    d.notes.push("timeout:STALL");
    return;
  }
  if (a.action !== "RECOVER") e.scale *= driftEffectiveness(p.resources.drift);
  const i = a.intensity - 1,
    s = effectiveStats(p),
    f = e.scale;
  switch (a.action) {
    case "TRACE":
      trace(e, i, seed, round);
      break;
    case "PRESS":
      e.raw = press(e, i, seed, round);
      d.heat += RULES.actions.PRESS.heat[i];
      break;
    case "GUARD":
      d.guard += RULES.actions.GUARD.guard_base[i] * statFactor(s.RESOLVE) * f;
      d.heat += RULES.actions.GUARD.heat_delta * f;
      d.focus += RULES.actions.GUARD.focus_delta * f;
      break;
    case "RECOVER":
      d.energy += RULES.actions.RECOVER.energy_gain[i] * f;
      d.heat += RULES.actions.RECOVER.heat_delta[i] * f;
      d.drift += RULES.actions.RECOVER.drift_delta[i] * f;
      d.focus += RULES.actions.RECOVER.focus_delta * f;
      e.exposure = RULES.actions.RECOVER.incoming_multiplier[i];
      break;
    case "ADAPT":
      e.adapt = {
        stance: a.adaptStance!,
        roundsRemaining: RULES.actions.ADAPT.duration_rounds,
        scale: f,
      };
      d.drift += RULES.actions.ADAPT.drift_delta * f;
      break;
    case "COUNTER": {
      e.counterHit =
        a.prediction === other.selected.action &&
        !(
          other.selected.action === "SIGNATURE" &&
          other.selected.signatureId === "VEIL_STEP" &&
          p.insightStacks < 2
        );
      if (e.counterHit) {
        e.mitigation = RULES.actions.COUNTER.success_incoming_multiplier;
        e.raw =
          RULES.actions.COUNTER.return_base *
          statFactor(s.ANALYSIS) *
          INTENSITY[i] *
          (1 + 0.06 * p.insightStacks) *
          f *
          jitter(seed, JSON.stringify([round, p.agentId, "counter"]));
        if (p.secondOrderSight) {
          e.raw *= 1.25;
          e.consumeSight = true;
        }
        d.focus += 10 * f;
        d.momentum += 1;
        d.drift -= 2 * f;
      } else {
        d.drift += RULES.actions.COUNTER.miss_drift;
        e.exposure = RULES.actions.COUNTER.miss_incoming_multiplier;
      }
      break;
    }
    case "SIGNATURE": {
      switch (a.signatureId as SignatureId) {
        case "SECOND_ORDER_SIGHT":
          trace(e, 1, seed, round);
          e.grantSight = true;
          break;
        case "CONSTRAINT_COLLAPSE":
          e.raw =
            press(e, 1, seed, round) * (e.preOpponentEnergy < 30 ? 1.3 : 1);
          d.heat += 10;
          break;
        case "COUNTERFACTUAL_SHIELD":
          d.guard += 28 * statFactor(s.RESOLVE) * f;
          e.shield = true;
          break;
        case "STILLPOINT":
          d.energy += 16 * f;
          d.guard += 14 * f;
          d.heat -= 12 * f;
          d.drift -= 12 * f;
          e.incomingDamage = 1.05;
          break;
        case "SWARM_REPAIR":
          d.vitality += 8 * f;
          d.energy += 12 * f;
          d.guard += 8 * f;
          d.heat += 8;
          break;
        case "VEIL_STEP":
          e.scale *= 0.9;
          break;
        case "BROKER_LOCK":
          if (!repeatsBase(other)) d.focus += 8 * f;
          break;
        case "ARCHIVE_ECHO": {
          const copied = archivePattern(e.opponent);
          if (!copied) {
            d.focus += 10 * f;
            d.drift += 5;
            break;
          }
          // A stored flattened pattern bounds copying; no recursive SIGNATURE/MIRROR expansion.
          e.pattern = copied;
          e.scale *= 0.85;
          if (archiveEntry(e.opponent)?.action.action === "MIRROR")
            e.scale *=
              RULES.actions.MIRROR.base_scale * statFactor(s.ADAPTATION);
          const drift = driftEffectiveness(p.resources.drift);
          // materialize applies drift once to the copied action, not a second time.
          if (copied.action !== "RECOVER") e.scale /= drift;
          materialize(e, other, seed, round);
          break;
        }
      }
      break;
    }
    case "MIRROR":
      throw new Error("recursive_mirror");
  }
}
function damage(
  target: Effect,
  attacker: Effect,
): { vitality: number; guard: number } {
  const raw = attacker.raw * target.mitigation * target.incomingDamage;
  const available = Math.max(
    0,
    Math.min(
      RULES.resources.GUARD.max,
      target.actor.resources.guard + target.d.guard,
    ),
  );
  const consumed = Math.min(available, raw);
  target.d.guard = available - target.actor.resources.guard - consumed;
  const vitality =
    Math.max(0, raw - consumed) *
    heatIncoming(target.actor.resources.heat) *
    target.exposure;
  target.d.vitality -= vitality;
  return { vitality, guard: consumed };
}
function finish(e: Effect, taken: number, dealt: number): PlayerState {
  const { actor: p, selected: a, pattern, d } = e;
  if (pattern?.action === "PRESS" && dealt >= 8) d.momentum += 1;
  // Reference implementation supplies the otherwise unspecified heavy-damage threshold.
  if (taken >= 10) d.momentum -= 1;
  const base =
    a.action !== "STALL" && a.action !== "SIGNATURE" ? a.action : undefined;
  const repeat = base
    ? p.previousBaseAction === base
      ? p.repetitionCount + 1
      : 1
    : 0;
  if (repeat >= 3) d.drift += 5;
  if (
    e.selected.action === "SIGNATURE" &&
    e.selected.signatureId === "CONSTRAINT_COLLAPSE" &&
    dealt >= 8
  )
    d.momentum += 1;
  const resources = { ...p.resources };
  for (const k of Object.keys(resources) as (keyof typeof resources)[])
    resources[k] += d[k];
  const clamped = clampResources(resources);
  if (clamped.heat >= RULES.thresholds.critical_heat.heat)
    clamped.drift = Math.min(
      100,
      clamped.drift + RULES.thresholds.critical_heat.drift_per_round,
    );
  const cooldowns = { ...p.cooldowns };
  if (a.action === "SIGNATURE")
    cooldowns[a.signatureId!] =
      SIGNATURES[a.signatureId as SignatureId].cooldown;
  let activeAdapt = e.adapt ?? p.activeAdapt;
  if (activeAdapt) {
    activeAdapt = {
      ...activeAdapt,
      roundsRemaining: activeAdapt.roundsRemaining - 1,
    };
    if (activeAdapt.roundsRemaining === 0) {
      activeAdapt = undefined;
      cooldowns.ADAPT = RULES.actions.ADAPT.cooldown_after + 1;
    }
  }
  return {
    ...p,
    stats: { ...p.stats },
    resources: clamped,
    insightStacks: Math.min(3, p.insightStacks + d.insightStacks),
    timeouts: p.timeouts + (a.action === "STALL" ? 1 : 0),
    repetitionCount: repeat,
    previousBaseAction: base,
    previousAction: { ...a },
    activeAdapt,
    cooldowns,
    signatures: [...p.signatures],
    history: Object.freeze([
      ...(p.history ?? []),
      Object.freeze({
        action: Object.freeze({ ...a }),
        ...(pattern ? { pattern: Object.freeze({ ...pattern }) } : {}),
      }) as HistoryEntry,
    ]) as HistoryEntry[],
    revealedSignals: e.signals,
    secondOrderSight:
      e.grantSight || (Boolean(p.secondOrderSight) && !e.consumeSight),
  };
}
export function terminal(
  a: PlayerState,
  b: PlayerState,
  round: number,
): Outcome | null {
  const deadA = a.resources.vitality <= 0,
    deadB = b.resources.vitality <= 0;
  if (deadA || deadB)
    return {
      winner: deadA && deadB ? null : deadA ? b.agentId : a.agentId,
      reason: deadA && deadB ? "double_ko" : "ko",
    };
  const forfeitA = a.timeouts >= RULES.match.max_timeouts_before_forfeit,
    forfeitB = b.timeouts >= RULES.match.max_timeouts_before_forfeit;
  if (forfeitA || forfeitB)
    return {
      winner: forfeitA && forfeitB ? null : forfeitA ? b.agentId : a.agentId,
      reason: forfeitA && forfeitB ? "double_forfeit" : "forfeit",
    };
  if (round === RULES.match.max_rounds) {
    const diff = proofScore(a.resources) - proofScore(b.resources);
    return {
      winner:
        Math.abs(diff) < RULES.proof_score_draw_epsilon
          ? null
          : diff > 0
            ? a.agentId
            : b.agentId,
      reason: "round_limit",
    };
  }
  return null;
}
export function resolveRound(
  input: RoundState,
  actionA: BattleAction | null,
  actionB: BattleAction | null,
  matchSeed: string,
): RoundResult {
  assertState(input);
  if (typeof matchSeed !== "string" || !matchSeed.length)
    throw new Error("invalid_seed");
  const a = roundStart(input.a),
    b = roundStart(input.b);
  if (actionA !== null) validateAction(a, b, actionA);
  if (actionB !== null) validateAction(b, a, actionB);
  const ea = setup(a, b, actionA, input.b.resources.energy),
    eb = setup(b, a, actionB, input.a.resources.energy);
  broker(ea, eb);
  broker(eb, ea);
  materialize(ea, eb, matchSeed, input.round);
  materialize(eb, ea, matchSeed, input.round);
  const da = damage(ea, eb),
    db = damage(eb, ea);
  if (ea.shield) ea.d.focus += Math.min(18, da.guard * 0.4) * ea.scale;
  if (eb.shield) eb.d.focus += Math.min(18, db.guard * 0.4) * eb.scale;
  const outA = finish(ea, da.vitality, db.vitality),
    outB = finish(eb, db.vitality, da.vitality);
  const actual = (
    before: PlayerState,
    after: PlayerState,
    d: PlayerDelta,
  ): PlayerDelta => ({
    ...d,
    ...Object.fromEntries(
      Object.keys(before.resources).map((k) => [
        k,
        after.resources[k as keyof typeof after.resources] -
          before.resources[k as keyof typeof before.resources],
      ]),
    ),
    insightStacks: after.insightStacks - before.insightStacks,
  });
  return {
    round: input.round,
    a: outA,
    b: outB,
    notes: [...ea.d.notes, ...eb.d.notes],
    deltas: { a: actual(input.a, outA, ea.d), b: actual(input.b, outB, eb.d) },
    outcome: terminal(outA, outB, input.round),
  };
}
