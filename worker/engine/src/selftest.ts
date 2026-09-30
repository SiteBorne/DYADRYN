import { resolveRound } from "./resolve.js";
import type { PlayerState, RoundState } from "./types.js";

function player(id: string): PlayerState {
  return {
    agentId: id,
    stats: {
      ANALYSIS: 70,
      EXECUTION: 70,
      ADAPTATION: 70,
      INFLUENCE: 70,
      RESOLVE: 70,
      CREATIVITY: 70,
    },
    resources: {
      vitality: 100,
      energy: 100,
      focus: 20,
      heat: 0,
      momentum: 0,
      guard: 0,
      drift: 0,
    },
    insightStacks: 0,
    timeouts: 0,
    repetitionCount: 0,
    cooldowns: {},
    signatures: ["SECOND_ORDER_SIGHT", "STILLPOINT"],
  };
}

const s: RoundState = { round: 1, a: player("A"), b: player("B") };
const a = { action: "PRESS", intensity: 2 } as const;
const b = { action: "GUARD", intensity: 2 } as const;

const r1 = resolveRound(s, a, b, "seed-1");
const r2 = resolveRound(s, a, b, "seed-1");

if (JSON.stringify(r1) !== JSON.stringify(r2))
  throw new Error("determinism_failed");
if (r1.a.resources.energy !== 87)
  throw new Error("press_energy_cost_or_regen_failed");
if (r1.b.resources.energy !== 92)
  throw new Error("guard_energy_cost_or_regen_failed");
if (r1.a.resources.vitality < 0 || r1.b.resources.vitality < 0)
  throw new Error("resource_bounds_failed");

console.log("reference_engine_selftest: PASS");
