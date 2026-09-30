import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../../dist/index.js";
import { player, action, state, near, frozen, next } from "./helpers.mjs";
const recover = action("RECOVER", 1);
const run = (a, b = recover, s = state()) =>
  E.resolveRound(s, a, b, "unit-seed");

test("state and actions fail closed before any input mutation", () => {
  for (const change of [
    (p) => (p.resources.energy = NaN),
    (p) => (p.resources.guard = 61),
    (p) => (p.stats.ANALYSIS = 71),
    (p) => (p.stats.EXTRA = 0),
    (p) => (p.insightStacks = -1),
    (p) => (p.signatures = ["UNKNOWN", "STILLPOINT"]),
  ]) {
    const s = state();
    change(s.a);
    assert.throws(() => run(recover, recover, s));
  }
  for (const a of [
    { action: "STALL", intensity: 1 },
    action("PRESS", 4),
    action("PRESS", 2, { damage: 999 }),
    action("COUNTER"),
    action("COUNTER", 2, { prediction: "COUNTER" }),
    action("ADAPT", 2, { adaptStance: "UNKNOWN" }),
  ])
    assert.throws(() => run(a));
  const s = frozen(state());
  run(action("PRESS"), recover, s);
  assert.equal(s.a.resources.energy, 100);
});

for (const [name, costs] of Object.entries({
  TRACE: [4, 7, 10],
  PRESS: [8, 13, 18],
  GUARD: [5, 8, 11],
  COUNTER: [7, 11, 15],
  ADAPT: [8, 8, 8],
}))
  for (const i of [1, 2, 3])
    test(`${name} I${i} spends exact cost after round regen`, () => {
      const a = action(
        name,
        i,
        name === "COUNTER"
          ? { prediction: "RECOVER" }
          : name === "ADAPT"
            ? { adaptStance: "PREDATOR" }
            : {},
      );
      const s = state(player("A", { energy: 40 }));
      const r = run(a, recover, s);
      assert.equal(r.a.resources.energy, 46 - costs[i - 1]);
      s.a.resources.energy = 0;
      if (costs[i - 1] > 6)
        assert.throws(() => run(a, recover, s), /insufficient_energy/);
    });
for (const i of [1, 2, 3])
  test(`RECOVER I${i} gains resources and exposes vitality only`, () => {
    const s = state(
      player("A", { energy: 30, heat: 30, drift: 30, focus: 30, guard: 60 }),
    );
    const r = run(action("RECOVER", i), action("PRESS", 1), s);
    assert.equal(r.a.resources.energy, 36 + [12, 18, 24][i - 1]);
    assert.equal(r.a.resources.heat, 30 - [6, 10, 14][i - 1]);
    assert.equal(r.a.resources.drift, 30 - [4, 7, 10][i - 1]);
    assert.equal(r.a.resources.focus, 35);
    assert.equal(r.a.resources.vitality, 100);
    const clean = run(action("TRACE", 1), action("PRESS", 1), s);
    near(r.a.resources.guard, clean.a.resources.guard);
  });
for (const i of [1, 2, 3])
  test(`GUARD I${i} materializes before damage`, () => {
    const r = run(
      action("GUARD", i),
      action("PRESS", 3),
      state(player("A", { heat: 20 })),
    );
    assert.equal(r.a.resources.vitality, 100);
    assert.equal(r.a.resources.heat, 16);
    assert.equal(r.a.resources.focus, 24);
    const q = run(action("GUARD", i));
    near(q.a.resources.guard, [18, 24, 30][i - 1]);
  });
test("guard cap applies before absorption; decay at round start", () => {
  const s = state(player("A", { guard: 60 }));
  s.a.stats.RESOLVE = 90;
  s.a.stats.INFLUENCE = 50;
  const r = run(action("GUARD", 3), action("PRESS", 1), s);
  assert.ok(r.a.resources.guard < 51);
  assert.equal(r.a.resources.vitality, 100);
  assert.equal(run(recover, recover, s).a.resources.guard, 30);
});
for (const [heat, outgoing, incoming] of [
  [69, 1, 1],
  [70, 1.05, 1.08],
  [89, 1.05, 1.08],
  [90, 1.1, 1.15],
])
  test(`heat ${heat} uses pre-round offense and vitality exposure`, () => {
    const s = state(player("A", { heat }));
    const r = run(action("PRESS"), action("PRESS"), s),
      baseline = run(action("PRESS"), action("PRESS"));
    near(
      100 - r.b.resources.vitality,
      (100 - baseline.b.resources.vitality) * outgoing,
    );
    near(
      100 - r.a.resources.vitality,
      (100 - baseline.a.resources.vitality) * incoming,
    );
  });
test("newly critical heat causes end-round drift; cooled heat does not", () => {
  assert.equal(
    run(action("PRESS", 3), recover, state(player("A", { heat: 78 }))).a
      .resources.drift,
    3,
  );
  assert.equal(
    run(recover, recover, state(player("A", { heat: 90 }))).a.resources.drift,
    0,
  );
});
for (const [drift, factor] of [
  [59, 1],
  [60, 0.95],
  [79, 0.95],
  [80, 0.85],
])
  test(`drift ${drift} scales non-recovery effectiveness`, () => {
    const s = state(player("A", { drift }));
    near(run(action("GUARD"), recover, s).a.resources.guard, 24 * factor);
    near(run(action("TRACE"), recover, s).a.resources.focus, 20 + 18 * factor);
    assert.equal(run(action("RECOVER"), recover, s).a.resources.focus, 25);
  });
test("counter hit/miss returns pressure and resources without double momentum credit", () => {
  const r = run(
    action("COUNTER", 3, { prediction: "PRESS" }),
    action("PRESS", 3),
  );
  assert.equal(r.a.resources.focus, 30);
  assert.equal(r.a.resources.momentum, 1);
  assert.equal(r.a.resources.drift, 0);
  const miss = run(
    action("COUNTER", 1, { prediction: "GUARD" }),
    action("PRESS"),
  );
  assert.equal(miss.a.resources.drift, 6);
  assert.equal(miss.a.resources.focus, 20);
  const base = run(action("TRACE"), action("PRESS"));
  near(
    100 - miss.a.resources.vitality,
    (100 - base.a.resources.vitality) * 1.1,
  );
});
for (const stance of ["PREDATOR", "SENTINEL", "HUNTER", "VEIL", "FLUX", "WILD"])
  test(`ADAPT ${stance} lasts 3 rounds then blocks 3 rounds`, () => {
    let s = state(player("A", { drift: 20 }));
    let r = run(action("ADAPT", 2, { adaptStance: stance }), recover, s);
    assert.equal(r.a.resources.drift, 12);
    assert.equal(r.a.activeAdapt.stance, stance);
    assert.equal(r.a.activeAdapt.roundsRemaining, 2);
    assert.deepEqual(r.a.stats, s.a.stats);
    s = next(r);
    assert.throws(() =>
      run(action("ADAPT", 2, { adaptStance: stance }), recover, s),
    );
    r = run(recover, recover, s);
    r = run(recover, recover, next(r));
    assert.equal(r.a.activeAdapt, undefined);
    for (let j = 0; j < 3; j++) {
      s = next(r);
      assert.throws(() =>
        run(action("ADAPT", 2, { adaptStance: stance }), recover, s),
      );
      r = run(recover, recover, s);
    }
    assert.doesNotThrow(() =>
      run(action("ADAPT", 2, { adaptStance: stance }), recover, next(r)),
    );
  });
test("MIRROR uses opponent previous pattern including required fields and selected intensity", () => {
  const s = state();
  s.b.previousAction = action("GUARD", 1);
  s.b.previousBaseAction = "GUARD";
  const r = run(action("MIRROR", 3), recover, s);
  near(r.a.resources.guard, 27);
  assert.equal(r.a.resources.energy, 82);
  assert.throws(() => run(action("MIRROR")), /mirror/);
  for (const name of ["SIGNATURE", "MIRROR", "STALL"]) {
    s.b.previousAction =
      name === "STALL"
        ? { action: name }
        : action(
            name,
            1,
            name === "SIGNATURE" ? { signatureId: "STILLPOINT" } : {},
          );
    assert.throws(() => run(action("MIRROR"), recover, s), /mirror/);
  }
});
test("repetition applies from third base action, STALL breaks chain", () => {
  let s = state();
  for (let i = 0; i < 4; i++) {
    const r = run(action("TRACE"), recover, s);
    assert.equal(r.a.resources.drift, Math.max(0, i - 1) * 5);
    s = next(r);
  }
  const r = run(null, recover, s);
  assert.equal(r.a.repetitionCount, 0);
});
test("timeouts are explicit STALL; three forfeits, dual forfeits draw", () => {
  let s = state(player("A", { energy: 30, heat: 20, momentum: 1 }));
  for (let i = 1; i <= 3; i++) {
    const r = run(null, recover, s);
    assert.equal(r.a.timeouts, i);
    assert.equal(r.a.resources.energy, 30 + 10 * i);
    assert.equal(r.a.resources.guard, [5, 7.5, 8.75][i - 1]);
    assert.equal(r.a.resources.drift, 8 * i);
    s = next(r);
    if (i === 3)
      assert.deepEqual(r.outcome, { winner: "B", reason: "forfeit" });
  }
  s = state();
  s.a.timeouts = 2;
  s.b.timeouts = 2;
  assert.deepEqual(run(null, null, s).outcome, {
    winner: null,
    reason: "double_forfeit",
  });
});
test("simultaneous double KO is draw, single KO chooses surviving agent", () => {
  let s = state(player("A", { vitality: 1 }), player("B", { vitality: 1 }));
  assert.deepEqual(run(action("PRESS"), action("PRESS"), s).outcome, {
    winner: null,
    reason: "double_ko",
  });
  s = state(player("A", { vitality: 1 }));
  assert.deepEqual(run(action("TRACE"), action("PRESS"), s).outcome, {
    winner: "B",
    reason: "ko",
  });
});
test("round 24 proof score has strict epsilon and no round 25", () => {
  assert.equal(
    E.proofScore(
      player("A", {
        vitality: 100,
        energy: 100,
        focus: 100,
        guard: 60,
        momentum: 3,
        drift: 0,
      }).resources,
    ),
    100,
  );
  const s = state(player(), player("B"), 24);
  assert.deepEqual(run(recover, recover, s).outcome, {
    winner: null,
    reason: "round_limit",
  });
  s.a.resources.vitality = 90;
  assert.equal(run(recover, recover, s).outcome.winner, "B");
  s.round = 25;
  assert.throws(() => run(recover, recover, s));
});
test("strict state invariants reject injected power, private fields and non-finite results", () => {
  for (const change of [
    (p) => (p.insightStacks = 4),
    (p) => (p.resources.secret = 1),
    (p) => (p.resources.guard = Infinity),
    (p) =>
      (p.activeAdapt = { stance: "PREDATOR", roundsRemaining: 2, scale: 1000 }),
    (p) => (p.MEMORY = "private"),
    (p) => (p.revealedSignals = ["raw private secret"]),
  ]) {
    const s = state();
    change(s.a);
    assert.throws(() => run(recover, recover, s));
  }
});
test("default player constructor validates normalized stats and projects only combat state", () => {
  const p = E.createPlayer("A", player().stats, [
    "SECOND_ORDER_SIGHT",
    "STILLPOINT",
  ]);
  assert.deepEqual(p.resources, {
    vitality: 100,
    energy: 100,
    focus: 20,
    heat: 0,
    momentum: 0,
    guard: 0,
    drift: 0,
  });
  assert.equal(p.insightStacks, 0);
  assert.throws(() =>
    E.createPlayer("A", { ...player().stats, ANALYSIS: 71 }, [
      "SECOND_ORDER_SIGHT",
      "STILLPOINT",
    ]),
  );
});
test("PRESS formula includes bounded stats, focus60 cap and momentum4 percent", () => {
  const s = state(player("A", { focus: 60, momentum: 3 }));
  s.a.stats.EXECUTION = 90;
  s.a.stats.ANALYSIS = 50;
  const r = run(action("PRESS", 3), action("TRACE", 1), s);
  const j = E.jitter("unit-seed", JSON.stringify([1, "A", "pressure"]));
  near(100 - r.b.resources.vitality, 11 * (7 / 6) * 1.15 * 1.1 * 1.12 * j);
  s.a.resources.focus = 100;
  near(
    run(action("PRESS", 3), action("TRACE", 1), s).b.resources.vitality,
    r.b.resources.vitality,
  );
});
test("successful counter reduces raw pressure before guard, exposure multiplies vitality only", () => {
  const s = state(player("A", { heat: 70, guard: 10 }));
  const r = run(
    action("COUNTER", 2, { prediction: "PRESS" }),
    action("PRESS", 3),
    s,
  );
  const raw =
    11 *
    1.15 *
    (1 + 20 / 600) *
    E.jitter("unit-seed", JSON.stringify([1, "B", "pressure"]));
  near(100 - r.a.resources.vitality, Math.max(0, raw * 0.4 - 5) * 1.08);
});
test("all ADAPT stances redistribute exactly eight without modifying base stats", () => {
  for (const [stance, up, down] of [
    ["PREDATOR", "EXECUTION", "RESOLVE"],
    ["SENTINEL", "RESOLVE", "INFLUENCE"],
    ["HUNTER", "ANALYSIS", "CREATIVITY"],
    ["VEIL", "INFLUENCE", "EXECUTION"],
    ["FLUX", "ADAPTATION", "ANALYSIS"],
    ["WILD", "CREATIVITY", "RESOLVE"],
  ]) {
    const p = player();
    p.activeAdapt = { stance, roundsRemaining: 2 };
    const stats = E.effectiveStats(p);
    assert.equal(stats[up], 78);
    assert.equal(stats[down], 62);
    assert.equal(
      Object.values(stats).reduce((a, b) => a + b),
      420,
    );
    assert.equal(p.stats[up], 70);
  }
});
test("proof score difference less than 0.5 draws, exactly 0.5 wins", () => {
  const a = player(),
    b = player("B");
  a.resources.energy = 50;
  b.resources.energy = 50;
  a.resources.focus = 20;
  b.resources.focus = 24.99;
  assert.deepEqual(E.terminal(a, b, 24), {
    winner: null,
    reason: "round_limit",
  });
  b.resources.focus = 25;
  assert.deepEqual(E.terminal(a, b, 24), {
    winner: "B",
    reason: "round_limit",
  });
});
test("TRACE reveals bounded new signals only and never repeats exhausted signals", () => {
  let s = state();
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    const r = run(action("TRACE"), recover, s);
    for (const signal of r.a.revealedSignals) seen.add(signal);
    assert.equal(r.a.revealedSignals.length, seen.size);
    assert.ok(r.a.insightStacks <= 3);
    s = next(r);
  }
  assert.ok(seen.size > 0);
  assert.ok(s.a.insightStacks <= 3);
});
