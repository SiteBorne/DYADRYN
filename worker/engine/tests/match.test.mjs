import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import * as E from "../dist/index.js";
import { player, action, frozen } from "./helpers.mjs";
const ajv = new Ajv2020();
const schema = ajv.compile(
  JSON.parse(
    readFileSync(new URL("../../schemas/action.schema.json", import.meta.url)),
  ),
);
function match() {
  return E.createMatch({
    matchId: "match-0001",
    seed: "determinism-seed",
    a: player(),
    b: player("B"),
    now: 1000,
  });
}
function envelope(m, id, nonce = "nonce-0001", fields = {}) {
  return {
    match_id: m.matchId,
    round: m.state.round,
    actor_id: id,
    state_hash: E.stateHash(m),
    client_nonce: nonce,
    action: "PRESS",
    intensity: 2,
    ...fields,
  };
}
test("locked turn does not resolve early, views and hashes hide pending action", () => {
  const m = match(),
    before = E.matchView(m, "B");
  const locked = E.lockAction(frozen(m), envelope(m, "A"), 1001);
  assert.deepEqual(E.matchView(locked, "B"), before);
  assert.equal(E.resolveLockedRound(locked, 1002), null);
  assert.equal(E.stateHash(locked), E.stateHash(m));
  assert.equal(m.pending.A, undefined);
  const both = E.lockAction(locked, envelope(m, "B"), 1003);
  const done = E.resolveLockedRound(both, 1003);
  assert.equal(done.state.round, 2);
  assert.equal(done.events.length, 1);
  assert.equal(done.state.a.resources.energy, 87);
  assert.equal(Object.keys(done.pending).length, 0);
});
test("envelope matches action schema, rejects stale/forged/unknown actions and replays atomically", () => {
  const m = match(),
    good = envelope(m, "A");
  assert.equal(schema(good), true);
  for (const fields of [
    { state_hash: "0".repeat(64) },
    { client_nonce: "x" },
    { round: 2 },
    { actor_id: "outsider" },
    { match_id: "different" },
    { damage: 999 },
    { action: "STALL" },
    { public_intent: "a".repeat(181) },
    { intensity: 4 },
    { action: "COUNTER" },
    { action: "ADAPT", adapt_stance: "BROKEN" },
    { action: "SIGNATURE", signature_id: "UNKNOWN" },
  ])
    assert.throws(() => E.lockAction(m, { ...good, ...fields }, 1001));
  let locked = E.lockAction(m, good, 1001);
  assert.throws(() => E.lockAction(locked, good, 1002), /locked|nonce/);
  locked = E.lockAction(locked, envelope(m, "B"), 1001);
  const done = E.resolveLockedRound(locked, 1001);
  assert.throws(() => E.lockAction(done, good, 1002), /stale/);
  assert.throws(() => E.lockAction(done, envelope(done, "A"), 1002), /nonce/);
});
test("deadline is explicit deterministic input and only missing actors STALL", () => {
  let m = match();
  assert.equal(m.deadline, 121000);
  assert.equal(E.resolveLockedRound(m, 120999), null);
  assert.throws(() => E.lockAction(m, envelope(m, "A"), 121000), /deadline/);
  m = E.lockAction(
    m,
    envelope(m, "A", "nonce-0001", { action: "TRACE" }),
    120999,
  );
  const r = E.resolveLockedRound(m, 121000);
  assert.equal(r.state.a.timeouts, 0);
  assert.equal(r.state.b.timeouts, 1);
  assert.equal(r.state.b.resources.guard, 5);
  assert.deepEqual(r.events[0].actions.b, null);
  assert.equal(r.deadline, 241000);
});
test("same locked inputs reproduce deltas, SHA-256 event chain, and final result", () => {
  function play(reverse = false) {
    let m = match();
    while (!m.outcome) {
      const na = "nonce-a-" + m.state.round,
        nb = "nonce-b-" + m.state.round;
      const ea = envelope(m, "A", na, { action: "RECOVER" }),
        eb = envelope(m, "B", nb, { action: "RECOVER" });
      m = E.lockAction(m, reverse ? eb : ea, 1000);
      m = E.lockAction(m, reverse ? ea : eb, 1000);
      m = E.resolveLockedRound(m, 1000);
    }
    return m;
  }
  const a = play(),
    b = play(true);
  assert.deepEqual(a.events, b.events);
  assert.deepEqual(a.outcome, b.outcome);
  assert.match(a.eventRootHash, /^[0-9a-f]{64}$/);
  assert.equal(a.events.length, 24);
  assert.equal(E.verifyLocalHistory(a), true);
  const edited = structuredClone(a);
  edited.events[0].actions.a.intensity = 3;
  assert.throws(() => E.verifyLocalHistory(edited));
  const badSeed = structuredClone(a);
  badSeed.seed = "altered";
  assert.throws(() => E.verifyLocalHistory(badSeed));
  assert.throws(
    () => E.lockAction(a, envelope(a, "A", "nonce-new-000"), 1000),
    /terminal/,
  );
});
test("actor views are projected and omit seed, locked moves, opponent signals and private data", () => {
  const m = match();
  m.state.b.revealedSignals = ["counter-oriented"];
  m.state.b.secondOrderSight = true;
  const view = E.matchView(m, "A");
  const check = ajv.compile(
    JSON.parse(
      readFileSync(
        new URL("../../schemas/match_state.schema.json", import.meta.url),
      ),
    ),
  );
  assert.equal(check(view), true, JSON.stringify(check.errors));
  assert.equal(view.ruleset_version, "dyadryn.core.v1");
  assert.equal(view.opponent.revealedSignals, undefined);
  assert.equal(view.opponent.secondOrderSight, undefined);
  assert.equal(view.seed, undefined);
  assert.ok(view.legal_actions.some((a) => a.action === "RECOVER"));
  assert.ok(!view.legal_actions.some((a) => a.action === "MIRROR"));
  assert.throws(() => E.matchView(m, "outsider"));
});
test("resolve cannot predate accepted action locks", () => {
  const m = match();
  let locked = E.lockAction(m, envelope(m, "A"), 1005);
  locked = E.lockAction(locked, envelope(m, "B"), 1010);
  assert.throws(() => E.resolveLockedRound(locked, 1009), /time/);
  assert.equal(E.verifyLocalHistory(E.resolveLockedRound(locked, 1010)), true);
});

test('schema-valid prototype-like actor IDs remain ordinary identities during replay',()=>{
  let m=E.createMatch({matchId:'match-prototype',seed:'seed',a:player('__proto__'),b:player('constructor'),now:0});
  m=E.lockAction(m,envelope(m,'__proto__'),0);m=E.lockAction(m,envelope(m,'constructor'),0);m=E.resolveLockedRound(m,0);
  assert.equal(E.verifyLocalHistory(m),true);
});
