import assert from "node:assert/strict";
export function player(agentId = "A", resources = {}) {
  return {
    agentId,
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
      ...resources,
    },
    insightStacks: 0,
    timeouts: 0,
    repetitionCount: 0,
    cooldowns: {},
    signatures: ["SECOND_ORDER_SIGHT", "STILLPOINT"],
  };
}
export const action = (action, intensity = 2, fields = {}) => ({
  action,
  intensity,
  ...fields,
});
export const state = (a = player(), b = player("B"), round = 1) => ({
  round,
  a,
  b,
});
export const near = (got, want) =>
  assert.ok(Math.abs(got - want) < 1e-9, `${got} != ${want}`);
export function frozen(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
}
export function next(result) {
  return {
    round: result.round + 1,
    a: result.a,
    b: result.b,
    previousEventHash: result.event?.hash,
  };
}
