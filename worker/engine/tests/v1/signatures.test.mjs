import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../../dist/index.js";
import { player, action, state, near, next } from "./helpers.mjs";
const idle = action("TRACE", 1),
  sig = (id) => action("SIGNATURE", 2, { signatureId: id });
function fixture(id, r = {}) {
  const p = player("A", { focus: 60, energy: 60, ...r });
  p.signatures = [id, id === "STILLPOINT" ? "SECOND_ORDER_SIGHT" : "STILLPOINT"];
  return state(p);
}
const run = (s, a, b = idle) => E.resolveRound(s, a, b, "sig-seed");
for (const [id, cost, cooldown] of [
  ["SECOND_ORDER_SIGHT", 18, 4],
  ["CONSTRAINT_COLLAPSE", 22, 4],
  ["COUNTERFACTUAL_SHIELD", 20, 4],
  ["STILLPOINT", 18, 4],
  ["BROKER_LOCK", 21, 4],
  ["ARCHIVE_ECHO", 20, 4],
  ["SWARM_REPAIR", 20, 5],
  ["VEIL_STEP", 19, 4],
])
  test(`${id} charges focus, exact energy, and template cooldown`, () => {
    const s = fixture(id);
    const r = run(s, sig(id));
    const bonus = id === "STILLPOINT" ? 16 : id === "SWARM_REPAIR" ? 12 : 0;
    assert.equal(r.a.resources.energy, 66 - cost + bonus);
    assert.equal(r.a.cooldowns[id], cooldown);
    assert.ok(r.a.resources.focus <= 48);
    let n = next(r);
    for (let i = 1; i < cooldown; i++) {
      n.a.resources.focus = 60;
      assert.throws(() => run(n, sig(id)), /cooldown/);
      n = next(run(n, idle));
    }
    n.a.resources.focus = 60;
    assert.doesNotThrow(() => run(n, sig(id)));
    const low = fixture(id, { focus: 29 });
    assert.throws(() => run(low, sig(id)), /insufficient_focus/);
    const poor = fixture(id, { energy: 0 });
    assert.throws(() => run(poor, sig(id)), /insufficient_energy/);
  });
test("SECOND_ORDER_SIGHT traces at I2 and persists through misses until next successful counter", () => {
  let r = run(fixture("SECOND_ORDER_SIGHT"), sig("SECOND_ORDER_SIGHT"));
  assert.equal(r.a.resources.focus, 48);
  assert.equal(r.a.secondOrderSight, true);
  assert.equal(r.a.insightStacks, 1);
  let s = next(r);
  r = run(s, action("COUNTER", 2, { prediction: "GUARD" }));
  assert.equal(r.a.secondOrderSight, true);
  s = next(r);
  const boosted = run(s, action("COUNTER", 2, { prediction: "TRACE" }));
  s.a.secondOrderSight = false;
  const ordinary = run(s, action("COUNTER", 2, { prediction: "TRACE" }));
  near(
    100 - boosted.b.resources.vitality,
    (100 - ordinary.b.resources.vitality) * 1.25,
  );
  assert.equal(boosted.a.secondOrderSight, false);
});
test("CONSTRAINT_COLLAPSE uses opponent energy before regen, exact threshold, heat +10 only", () => {
  const s = fixture("CONSTRAINT_COLLAPSE");
  s.b.resources.energy = 29;
  let r = run(s, sig("CONSTRAINT_COLLAPSE"));
  s.b.resources.energy = 30;
  const normal = run(s, sig("CONSTRAINT_COLLAPSE"));
  near(100 - r.b.resources.vitality, (100 - normal.b.resources.vitality) * 1.3);
  assert.equal(r.a.resources.heat, 10);
});
test("COUNTERFACTUAL_SHIELD converts actually consumed guard, never generated guard", () => {
  let s = fixture("COUNTERFACTUAL_SHIELD");
  let r = run(s, sig("COUNTERFACTUAL_SHIELD"));
  assert.equal(r.a.resources.guard, 28);
  assert.equal(r.a.resources.focus, 30);
  r = run(s, sig("COUNTERFACTUAL_SHIELD"), action("PRESS", 3));
  near(r.a.resources.focus, 30 + (28 - r.a.resources.guard) * 0.4);
  s.b.stats.ANALYSIS = 90;
  s.b.stats.RESOLVE = 50;
  s.b.insightStacks = 3;
  r = run(
    s,
    sig("COUNTERFACTUAL_SHIELD"),
    action("COUNTER", 3, { prediction: "SIGNATURE" }),
  );
  assert.ok(r.a.resources.focus <= 48);
});
test("STILLPOINT applies recovery deltas and vitality exposure", () => {
  const s = fixture("STILLPOINT", { heat: 30, drift: 30, guard: 20 });
  let r = run(s, sig("STILLPOINT"));
  assert.equal(r.a.resources.energy, 64);
  assert.equal(r.a.resources.guard, 24);
  assert.equal(r.a.resources.heat, 18);
  assert.equal(r.a.resources.drift, 18);
  assert.equal(r.a.resources.focus, 30);
});
test("SWARM_REPAIR heals with simultaneous damage, caps vitality, and uses cooldown 5", () => {
  const s = fixture("SWARM_REPAIR", { vitality: 90 });
  let r = run(s, sig("SWARM_REPAIR"));
  assert.equal(r.a.resources.vitality, 98);
  assert.equal(r.a.resources.guard, 8);
  assert.equal(r.a.resources.heat, 8);
  s.a.resources.vitality = 99;
  r = run(s, sig("SWARM_REPAIR"));
  assert.equal(r.a.resources.vitality, 100);
  const hit = run(s, sig("SWARM_REPAIR"), action("PRESS", 3));
  assert.equal(hit.a.resources.vitality, 100);
  s.a.resources.vitality = 90;
  const injured = run(s, sig("SWARM_REPAIR"), action("PRESS", 3));
  assert.ok(injured.a.resources.vitality < 98);
  assert.ok(injured.a.resources.vitality > 90);
});
test("VEIL_STEP forces COUNTER miss below two insight stacks, allows hit at two", () => {
  const s = fixture("VEIL_STEP"),
    counter = action("COUNTER", 2, { prediction: "SIGNATURE" });
  s.b.insightStacks = 1;
  const miss = run(s, sig("VEIL_STEP"), counter);
  assert.equal(miss.a.resources.vitality, 100);
  assert.equal(miss.b.resources.drift, 6);
  assert.equal(miss.b.resources.focus, 20);
  s.b.insightStacks = 2;
  const hit = run(s, sig("VEIL_STEP"), counter);
  assert.ok(hit.a.resources.vitality < 100);
  assert.equal(hit.b.resources.focus, 30);
});
test("BROKER_LOCK penalizes a repeated base action, awards focus otherwise", () => {
  const s = fixture("BROKER_LOCK");
  s.b.previousAction = action("PRESS");
  s.b.previousBaseAction = "PRESS";
  s.b.repetitionCount = 1;
  const locked = run(s, sig("BROKER_LOCK"), action("PRESS"));
  assert.equal(locked.b.resources.energy, 81.8);
  assert.equal(locked.a.resources.focus, 30);
  const clean = run(s, idle, action("PRESS"));
  near(
    100 - locked.a.resources.vitality,
    (100 - clean.a.resources.vitality) * 0.85,
  );
  const miss = run(s, sig("BROKER_LOCK"), action("GUARD"));
  assert.equal(miss.a.resources.focus, 38);
});
test("BROKER_LOCK energy shortfall cannot invalidate already locked legal action", () => {
  const s = fixture("BROKER_LOCK");
  s.b.previousAction = action("PRESS");
  s.b.previousBaseAction = "PRESS";
  s.b.resources.energy = 7;
  const r = run(s, sig("BROKER_LOCK"), action("PRESS"));
  assert.equal(r.b.resources.energy, 0);
  assert.ok(r.a.resources.vitality < 100);
});
test("ARCHIVE_ECHO selects most recent qualifying pattern and scales effect without copied cost", () => {
  const s = fixture("ARCHIVE_ECHO");
  s.b.history = [
    { action: action("GUARD", 1) },
    { action: action("PRESS", 1) },
    { action: action("PRESS", 1) },
    { action: action("GUARD", 3) },
  ];
  const r = run(s, sig("ARCHIVE_ECHO"));
  near(r.a.resources.guard, 25.5);
  assert.equal(r.a.resources.energy, 46);
  assert.equal(r.a.resources.focus, 33.4);
});
test("ARCHIVE_ECHO no repeated pattern gives focus 10 and drift 5", () => {
  const r = run(fixture("ARCHIVE_ECHO"), sig("ARCHIVE_ECHO"));
  assert.equal(r.a.resources.focus, 40);
  assert.equal(r.a.resources.drift, 5);
});
test("MIRROR copies each legal base action at selected intensity, not original cost", () => {
  for (const base of [
    action("TRACE"),
    action("PRESS"),
    action("GUARD"),
    action("COUNTER", 2, { prediction: "TRACE" }),
    action("ADAPT", 2, { adaptStance: "HUNTER" }),
    action("RECOVER"),
  ]) {
    const s = state(player("A", { energy: 40, heat: 20, drift: 20 }));
    s.b.previousAction = base;
    const r = run(s, action("MIRROR", 3));
    assert.equal(
      r.a.resources.energy,
      28 + (base.action === "RECOVER" ? 21.6 : 0),
    );
    if (base.action === "TRACE") near(r.a.resources.focus, 41.6);
    if (base.action === "GUARD") near(r.a.resources.guard, 27);
    if (base.action === "ADAPT") assert.equal(r.a.activeAdapt.stance, "HUNTER");
    if (base.action === "COUNTER") assert.equal(r.a.resources.momentum, 1);
    if (base.action === "PRESS") assert.ok(r.b.resources.vitality < 100);
  }
});
test("ARCHIVE_ECHO scales a repeated MIRROR pattern with current caster adaptation", () => {
  const s = fixture("ARCHIVE_ECHO");
  s.b.history = [
    { action: action("MIRROR", 1), pattern: action("GUARD", 1) },
    { action: action("MIRROR", 3), pattern: action("GUARD", 3) },
  ];
  const r = run(s, sig("ARCHIVE_ECHO"));
  near(r.a.resources.guard, 30 * 0.9 * 0.85);
});
test("copied ADAPT cannot replace an active stance or bypass cooldown", () => {
  const s = fixture("ARCHIVE_ECHO");
  s.b.history = [
    { action: action("ADAPT", 2, { adaptStance: "HUNTER" }) },
    { action: action("ADAPT", 2, { adaptStance: "HUNTER" }) },
  ];
  s.b.previousAction = action("ADAPT", 2, { adaptStance: "HUNTER" });
  s.a.activeAdapt = { stance: "PREDATOR", roundsRemaining: 2 };
  assert.throws(() => run(s, sig("ARCHIVE_ECHO")), /cooldown/);
  assert.throws(() => run(s, action("MIRROR")), /cooldown/);
  delete s.a.activeAdapt;
  s.a.cooldowns.ADAPT = 2;
  assert.throws(() => run(s, sig("ARCHIVE_ECHO")), /cooldown/);
  assert.throws(() => run(s, action("MIRROR")), /cooldown/);
});
test("ARCHIVE_ECHO copies repeated TRACE PRESS COUNTER RECOVER and ADAPT without recursive expansion", () => {
  for (const base of [
    action("TRACE", 3),
    action("PRESS", 3),
    action("COUNTER", 3, { prediction: "TRACE" }),
    action("RECOVER", 3),
    action("ADAPT", 2, { adaptStance: "SENTINEL" }),
  ]) {
    const s = fixture("ARCHIVE_ECHO", { energy: 40, heat: 20, drift: 20 });
    s.b.history = [{ action: base }, { action: base }];
    const r = run(s, sig("ARCHIVE_ECHO"));
    if (base.action === "TRACE") near(r.a.resources.focus, 50.4);
    if (base.action === "PRESS") assert.ok(r.b.resources.vitality < 100);
    if (base.action === "COUNTER") assert.equal(r.a.resources.momentum, 1);
    if (base.action === "RECOVER") near(r.a.resources.energy, 46.4);
    if (base.action === "ADAPT")
      assert.equal(r.a.activeAdapt.stance, "SENTINEL");
  }
});

test('STILLPOINT incoming damage multiplier applies to guard absorption as specified',()=>{
  const s=fixture('STILLPOINT');const r=run(s,sig('STILLPOINT'),action('PRESS',1));
  const raw=11*.85*(1+20/600)*E.jitter('sig-seed',JSON.stringify([1,'B','pressure']));
  near(r.a.resources.guard,14-raw*1.05);assert.equal(r.a.resources.vitality,100);
});
