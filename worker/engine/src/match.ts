// Local authoritative boundary. Caller authentication and durable storage belong to the host.
import { createHash } from "node:crypto";
import type {
  BattleAction,
  PlayerState,
  RoundState,
  RoundResult,
  Outcome,
  ActionType,
  AdaptStance,
} from "./types.js";
import { RULES, ACTIONS, STANCES } from "./rules.js";
import { assertState, assertAction, validateAction } from "./validation.js";
import { resolveRound, roundStart } from "./resolve.js";
export type Mode = "MASKED_RANKED" | "CARRY_DUEL" | "MODEL_TRIAL" | "CUSTOM";
export interface ActionEnvelope {
  match_id: string;
  round: number;
  actor_id: string;
  state_hash: string;
  client_nonce: string;
  action: ActionType;
  intensity: 1 | 2 | 3;
  prediction?: BattleAction["prediction"];
  adapt_stance?: AdaptStance;
  signature_id?: string;
  public_intent?: string;
}
interface EventBody {
  round: number;
  previousHash: string;
  preStateHash: string;
  postStateHash: string;
  actions: { a: BattleAction | null; b: BattleAction | null };
  deltas: RoundResult["deltas"];
  notes: string[];
  outcome: Outcome | null;
}
export interface ProofEvent extends EventBody {
  hash: string;
}
export interface LocalMatch {
  matchId: string;
  ruleset: string;
  mode: Mode;
  seed: string;
  seedCommitment: string;
  initialState: RoundState;
  state: RoundState;
  initialOpenedAt: number;
  openedAt: number;
  deadline: number;
  pending: Record<string, BattleAction>;
  lockedAt: Record<string, number>;
  usedNonces: Record<string, string[]>;
  timings: { resolvedAt: number; lockedAt: Record<string, number> }[];
  events: ProofEvent[];
  eventRootHash: string;
  outcome: Outcome | null;
}
// Frozen plain objects/arrays are immutable, so their canonical form can be memoized without changing a single byte of any hash.
const CANON_MEMO = new WeakMap<object, string>();
export function canonical(value: unknown): string {
  if (value !== null && typeof value === "object" && Object.isFrozen(value)) {
    const hit = CANON_MEMO.get(value);
    if (hit !== undefined) return hit;
    const out = canonicalUncached(value);
    CANON_MEMO.set(value, out);
    return out;
  }
  return canonicalUncached(value);
}
function canonicalUncached(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non_finite_hash_input");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) if (!Object.hasOwn(value, i)) throw new Error("sparse_hash_array");
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value && typeof value === "object" && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error("non_plain_hash_object");
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonical((value as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  throw new Error("invalid_hash_input");
}
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function time(now: number): void {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("invalid_time");
}
export function createMatch(input: {
  matchId: string;
  seed: string;
  a: PlayerState;
  b: PlayerState;
  now: number;
  mode?: Mode;
}): LocalMatch {
  if (
    typeof input.matchId !== "string" ||
    input.matchId.length < 8 ||
    input.matchId.length > 80
  )
    throw new Error("invalid_match_id");
  if (typeof input.seed !== "string" || input.seed.length === 0)
    throw new Error("invalid_seed");
  time(input.now);
  const mode = input.mode ?? "MODEL_TRIAL";
  if (!["MASKED_RANKED", "CARRY_DUEL", "MODEL_TRIAL", "CUSTOM"].includes(mode))
    throw new Error("invalid_mode");
  const state: RoundState = structuredClone({
    round: 1,
    a: input.a,
    b: input.b,
  });
  assertState(state);
  const seedCommitment = sha256(input.seed);
  const root = sha256(
    canonical({
      matchId: input.matchId,
      ruleset: RULES.ruleset_id,
      mode,
      seedCommitment,
      initialState: state,
      proofFormat: "dyadryn.proof.v2",
    }),
  );
  return {
    matchId: input.matchId,
    ruleset: RULES.ruleset_id,
    mode,
    seed: input.seed,
    seedCommitment,
    initialState: structuredClone(state),
    state,
    initialOpenedAt: input.now,
    openedAt: input.now,
    deadline: input.now + RULES.match.turn_timeout_seconds * 1000,
    pending: {},
    lockedAt: {},
    usedNonces: {},
    timings: [],
    events: [],
    eventRootHash: root,
    outcome: null,
  };
}
export function stateHash(m: LocalMatch): string {
  return sha256(
    canonical({
      matchId: m.matchId,
      ruleset: m.ruleset,
      mode: m.mode,
      state: m.state,
      eventRootHash: m.eventRootHash,
    }),
  );
}
function envelope(value: unknown): ActionEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid_envelope");
  const v = value as Record<string, unknown>;
  const allowed = [
    "match_id",
    "round",
    "actor_id",
    "state_hash",
    "client_nonce",
    "action",
    "intensity",
    "prediction",
    "adapt_stance",
    "signature_id",
    "public_intent",
  ];
  if (Object.keys(v).some((k) => !allowed.includes(k)))
    throw new Error("unknown_envelope_field");
  for (const [k, min, max] of [
    ["match_id", 8, 80],
    ["actor_id", 1, 80],
    ["client_nonce", 8, 128],
  ] as const)
    if (
      typeof v[k] !== "string" ||
      (v[k] as string).length < min ||
      (v[k] as string).length > max
    )
      throw new Error(`invalid_${k}`);
  if (typeof v.state_hash !== "string" || !/^[a-f0-9]{64}$/.test(v.state_hash))
    throw new Error("invalid_state_hash");
  if (!Number.isInteger(v.round) || Number(v.round) < 1 || Number(v.round) > RULES.match.max_rounds)
    throw new Error("invalid_round");
  if (
    v.public_intent !== undefined &&
    (typeof v.public_intent !== "string" || v.public_intent.length > 180)
  )
    throw new Error("invalid_public_intent");
  const e = v as unknown as ActionEnvelope;
  assertAction(toAction(e));
  return e;
}
function toAction(e: ActionEnvelope): BattleAction {
  return {
    action: e.action,
    intensity: e.intensity,
    ...(e.prediction !== undefined ? { prediction: e.prediction } : {}),
    ...(e.adapt_stance !== undefined ? { adaptStance: e.adapt_stance } : {}),
    ...(e.signature_id !== undefined ? { signatureId: e.signature_id } : {}),
  };
}
export function lockAction(
  m: LocalMatch,
  value: unknown,
  now: number,
): LocalMatch {
  if (m.outcome) throw new Error("match_already_terminal");
  time(now);
  if (now < Math.max(m.openedAt, ...Object.values(m.lockedAt)))
    throw new Error("time_before_lock");
  if (now >= m.deadline) throw new Error("deadline_elapsed");
  const e = envelope(value);
  if (
    e.match_id !== m.matchId ||
    e.round !== m.state.round ||
    e.state_hash !== stateHash(m)
  )
    throw new Error("stale_state");
  const isA = e.actor_id === m.state.a.agentId;
  if (!isA && e.actor_id !== m.state.b.agentId)
    throw new Error("unknown_actor");
  if (Object.hasOwn(m.pending, e.actor_id))
    throw new Error("action_already_locked");
  if (
    Object.hasOwn(m.usedNonces, e.actor_id) &&
    m.usedNonces[e.actor_id].includes(e.client_nonce)
  )
    throw new Error("duplicate_nonce");
  const a = toAction(e);
  validateAction(
    roundStart(isA ? m.state.a : m.state.b),
    roundStart(isA ? m.state.b : m.state.a),
    a,
  );
  return {
    ...m,
    pending: { ...m.pending, [e.actor_id]: a },
    lockedAt: { ...m.lockedAt, [e.actor_id]: now },
    usedNonces: {
      ...m.usedNonces,
      [e.actor_id]: [
        ...(Object.hasOwn(m.usedNonces, e.actor_id)
          ? m.usedNonces[e.actor_id]
          : []),
        e.client_nonce,
      ],
    },
  };
}
export function resolveLockedRound(
  m: LocalMatch,
  now: number,
): LocalMatch | null {
  if (m.outcome) throw new Error("match_already_terminal");
  time(now);
  if (now < Math.max(m.openedAt, ...Object.values(m.lockedAt)))
    throw new Error("time_before_lock");
  const actionA = Object.hasOwn(m.pending, m.state.a.agentId)
    ? m.pending[m.state.a.agentId]
    : null;
  const actionB = Object.hasOwn(m.pending, m.state.b.agentId)
    ? m.pending[m.state.b.agentId]
    : null;
  if ((!actionA || !actionB) && now < m.deadline) return null;
  const result = resolveRound(m.state, actionA, actionB, m.seed);
  const state: RoundState = {
    round: result.outcome ? result.round : result.round + 1,
    a: result.a,
    b: result.b,
  };
  const body: EventBody = {
    round: m.state.round,
    previousHash: m.eventRootHash,
    preStateHash: stateHash(m),
    postStateHash: sha256(canonical(state)),
    actions: { a: actionA, b: actionB },
    deltas: result.deltas,
    notes: result.notes,
    outcome: result.outcome,
  };
  const event: ProofEvent = { ...body, hash: sha256(canonical(body)) };
  return {
    ...m,
    state,
    openedAt: now,
    deadline: now + RULES.match.turn_timeout_seconds * 1000,
    pending: {},
    lockedAt: {},
    timings: [...m.timings, { resolvedAt: now, lockedAt: { ...m.lockedAt } }],
    events: [...m.events, event],
    eventRootHash: event.hash,
    outcome: result.outcome,
  };
}
export function legalActions(p: PlayerState, o: PlayerState): BattleAction[] {
  const actor = roundStart(p),
    opponent = roundStart(o),
    legal: BattleAction[] = [];
  for (const type of ACTIONS)
    for (const intensity of [1, 2, 3] as const) {
      const base = { action: type, intensity };
      const candidates: BattleAction[] =
        type === "COUNTER"
          ? ACTIONS.filter((a) => a !== "COUNTER").map((prediction) => ({
              ...base,
              prediction,
            }))
          : type === "ADAPT"
            ? (Object.keys(STANCES) as AdaptStance[]).map((adaptStance) => ({
                ...base,
                adaptStance,
              }))
            : type === "SIGNATURE"
              ? p.signatures.map((signatureId) => ({ ...base, signatureId }))
              : [base];
      for (const a of candidates)
        try {
          validateAction(actor, opponent, a);
          legal.push(a);
        } catch {
          /* Illegal candidates are deliberately omitted. */
        }
    }
  return legal;
}
export function matchView(m: LocalMatch, actorId: string) {
  const a =
    m.state.a.agentId === actorId
      ? m.state.a
      : m.state.b.agentId === actorId
        ? m.state.b
        : null;
  if (!a) throw new Error("unknown_actor");
  const o = a === m.state.a ? m.state.b : m.state.a;
  const publicPlayer = (p: PlayerState) => ({
    agent_id: p.agentId,
    resources: { ...p.resources },
  });
  const view = {
    match_id: m.matchId,
    ruleset_version: m.ruleset,
    mode: m.mode,
    status: m.outcome
      ? m.outcome.reason.includes("forfeit")
        ? "FORFEIT"
        : "COMPLETE"
      : "ACTIVE",
    round: m.state.round,
    max_rounds: RULES.match.max_rounds,
    actor: {
      ...publicPlayer(a),
      stats: { ...a.stats },
      signatures: [...a.signatures],
      cooldowns: { ...a.cooldowns },
      insight_stacks: a.insightStacks,
      active_adapt: a.activeAdapt ? { ...a.activeAdapt } : null,
    },
    opponent: publicPlayer(o),
    revealed_signals: [...(a.revealedSignals ?? [])],
    recent_actions: (a.history ?? []).map((h, i) => ({
      round: i + 1,
      actor: { ...h.action },
      opponent: o.history?.[i] ? { ...o.history[i].action } : null,
    })),
    legal_actions: m.outcome ? [] : legalActions(a, o),
    deadline: m.outcome ? null : new Date(m.deadline).toISOString(),
    state_hash: stateHash(m),
  };
  return view;
}
// Phase 1 local recomputation only; no network replay/export or external seed ceremony.
export function verifyLocalHistory(m: LocalMatch): true {
  if (m.ruleset !== RULES.ruleset_id || sha256(m.seed) !== m.seedCommitment)
    throw new Error("replay_commitment_mismatch");
  let current = createMatch({
    matchId: m.matchId,
    seed: m.seed,
    a: m.initialState.a,
    b: m.initialState.b,
    now: m.initialOpenedAt,
    mode: m.mode,
  });
  for (const [index, event] of m.events.entries()) {
    const timing = m.timings[index];
    if (!timing) throw new Error("missing_host_timing");
    const pending: Record<string, BattleAction> = Object.create(null);
    if (event.actions.a) pending[current.state.a.agentId] = event.actions.a;
    if (event.actions.b) pending[current.state.b.agentId] = event.actions.b;
    for (const [id, at] of Object.entries(timing.lockedAt)) {
      time(at);
      if (
        !Object.hasOwn(pending, id) ||
        at < current.openedAt ||
        at >= current.deadline
      )
        throw new Error("replay_lock_time");
    }
    if (Object.keys(pending).length !== Object.keys(timing.lockedAt).length)
      throw new Error("replay_lock_time");
    current = { ...current, pending, lockedAt: { ...timing.lockedAt } };
    const next = resolveLockedRound(current, timing.resolvedAt);
    if (!next || canonical(next.events.at(-1)) !== canonical(event))
      throw new Error("replay_event_mismatch");
    current = next;
  }
  if (
    current.eventRootHash !== m.eventRootHash ||
    canonical(current.state) !== canonical(m.state) ||
    canonical(current.outcome) !== canonical(m.outcome)
  )
    throw new Error("replay_terminal_mismatch");
  return true;
}
