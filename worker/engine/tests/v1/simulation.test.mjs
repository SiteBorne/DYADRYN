import test from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../../scripts/simulate.mjs";
test("heuristic simulation smoke exercises bounded complete matches and replays", () => {
  const a = simulate(100),
    b = simulate(100);
  assert.equal(a.completed, 100);
  assert.equal(a.actions.STALL, 6);
  assert.equal(Object.values(a.actions).reduce((n,v)=>n+v,0),a.rounds*2);
  assert.equal(a.digest, b.digest);
  assert.equal(a.rounds, b.rounds);
  assert.equal(a.engineFailures, 0);
  assert.equal(a.replayDivergences, 0);
  assert.equal(a.seatSwapDivergences, 0);
  assert.ok(a.rounds <= 2400);
  assert.equal(Object.keys(a.signatures).length, 8);
});
