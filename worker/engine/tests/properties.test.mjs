import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import * as E from "../dist/index.js";
import { player, state, frozen, near, action } from "./helpers.mjs";
const signatures = Object.keys(E.SIGNATURES);
const boundedResources = fc.record({
  vitality: fc.integer({ min: 1, max: 100 }),
  energy: fc.integer({ min: 0, max: 100 }),
  focus: fc.integer({ min: 0, max: 100 }),
  heat: fc.integer({ min: 0, max: 100 }),
  momentum: fc.integer({ min: -3, max: 3 }),
  guard: fc.integer({ min: 0, max: 60 }),
  drift: fc.integer({ min: 0, max: 100 }),
});
function makePlayer(id, r, n) {
  const p = player(id, r);
  const d = n % 21;
  p.stats.ANALYSIS += d;
  p.stats.EXECUTION -= d;
  p.signatures = [signatures[n % 8], signatures[(n + 3) % 8]];
  p.insightStacks = n % 4;
  p.previousAction = action("PRESS");
  p.history = [{ action: action("PRESS") }, { action: action("PRESS") }];
  return p;
}
function assertBounds(p) {
  for (const [k, v] of Object.entries(p.resources)) {
    assert.ok(Number.isFinite(v));
    assert.ok(
      v >= (k === "momentum" ? -3 : 0) &&
        v <= (k === "momentum" ? 3 : k === "guard" ? 60 : 100),
      `${k}=${v}`,
    );
  }
  assert.equal(Number.isInteger(p.resources.momentum), true);
  assert.equal(
    Object.values(p.stats).reduce((a, b) => a + b),
    420,
  );
  assert.ok(p.insightStacks >= 0 && p.insightStacks <= 3);
}
test("3000 generated legal states preserve bounds, stats, inputs, deltas and exact determinism", () => {
  fc.assert(
    fc.property(
      boundedResources,
      boundedResources,
      fc.nat({ max: 10000 }),
      fc.nat({ max: 10000 }),
      fc.string({ minLength: 1, maxLength: 32 }),
      (ra, rb, na, nb, seed) => {
        const s = state(makePlayer("A", ra, na), makePlayer("B", rb, nb));
        const aa = E.legalActions(s.a, s.b),
          bb = E.legalActions(s.b, s.a);
        const a = aa[na % aa.length],
          b = bb[nb % bb.length];
        const original = structuredClone(s);
        const result = E.resolveRound(frozen(s), a, b, seed);
        assertBounds(result.a);
        assertBounds(result.b);
        assert.deepEqual(s, original);
        assert.deepEqual(result, E.resolveRound(s, a, b, seed));
        for (const side of ["a", "b"])
          for (const k of Object.keys(s[side].resources))
            near(
              result[side].resources[k] - s[side].resources[k],
              result.deltas[side][k],
            );
        assert.ok(E.cost(a) >= 0);
        assert.ok(E.cost(b) >= 0);
      },
    ),
    { numRuns: 3000, seed: 260926 },
  );
});
test("1500 seat-swapped resolutions preserve each identity outcome and resource deltas", () => {
  fc.assert(
    fc.property(
      boundedResources,
      boundedResources,
      fc.nat({ max: 10000 }),
      fc.nat({ max: 10000 }),
      (ra, rb, na, nb) => {
        const s = state(makePlayer("A", ra, na), makePlayer("B", rb, nb));
        const aa = E.legalActions(s.a, s.b),
          bb = E.legalActions(s.b, s.a),
          a = aa[na % aa.length],
          b = bb[nb % bb.length];
        const first = E.resolveRound(s, a, b, "seat-seed"),
          swapped = E.resolveRound(state(s.b, s.a), b, a, "seat-seed");
        assert.deepEqual(first.a, swapped.b);
        assert.deepEqual(first.b, swapped.a);
        assert.deepEqual(first.deltas.a, swapped.deltas.b);
        assert.deepEqual(first.outcome, swapped.outcome);
      },
    ),
    { numRuns: 1500, seed: 260927 },
  );
});
test("seeded jitter stays inside configured interval and changes by seed", () => {
  const values = new Set();
  for (let i = 0; i < 10000; i++) {
    const j = E.jitter("seed-" + i, "pressure");
    assert.ok(j >= 0.97 && j <= 1.03);
    values.add(j);
  }
  assert.ok(values.size > 9900);
});
test("changing actions, ruleset, proof or seed invalidates local history", () => {
  let m = E.createMatch({
    matchId: "property-match",
    seed: "proof-seed",
    a: player(),
    b: player("B"),
    now: 0,
  });
  m = E.resolveLockedRound(m, 120000);
  assert.equal(E.verifyLocalHistory(m), true);
  for (const mutate of [
    (m) => (m.ruleset = "other"),
    (m) => (m.events[0].deltas.a.energy = 1),
    (m) => (m.seedCommitment = "0".repeat(64)),
    (m) => (m.eventRootHash = "0".repeat(64)),
    (m) => (m.events[0].resolvedAt = 1),
  ]) {
    const copy = structuredClone(m);
    mutate(copy);
    assert.throws(() => E.verifyLocalHistory(copy));
  }
});
