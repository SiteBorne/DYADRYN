import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import * as E from "../dist/index.js";
const names = E.RULES.stats.names,
  signatures = Object.keys(E.SIGNATURES);
function makePlayer(id, index, rand) {
  const stats = Object.fromEntries(names.map((n) => [n, 70]));
  // Transfers preserve 420 exactly, including boundary profiles.
  for (let i = 0; i < 30; i++) {
    const up = names[Math.floor(rand() * 6)],
      down = names[Math.floor(rand() * 6)];
    if (up !== down && stats[up] < 90 && stats[down] > 50) {
      stats[up]++;
      stats[down]--;
    }
  }
  return E.createPlayer(id, stats, [
    signatures[index % 8],
    signatures[(index + 1 + (Math.floor(index / 8) % 7)) % 8],
  ]);
}
export function choose(p, o, rand, style = 0) {
  const legal = E.legalActions(p, o);
  // Mix tactics with seeded exploration. No hidden action or seed inspection.
  const preferred =
    p.resources.energy < 22
      ? "RECOVER"
      : p.resources.focus >= 30 && rand() < 0.5
        ? "SIGNATURE"
        : p.resources.heat >= 85
          ? "RECOVER"
          : style === 0
            ? "PRESS"
            : style === 1 &&
                o.previousAction &&
                o.previousAction.action !== "COUNTER"
              ? "COUNTER"
              : style === 2 && p.resources.focus < 45
                ? "TRACE"
                : style === 3 && p.resources.guard < 10
                  ? "GUARD"
                  : "PRESS";
  const pool =
    rand() < 0.28 ? legal : legal.filter((a) => a.action === preferred);
  let candidates = pool.length ? pool : legal;
  if (preferred === "COUNTER" && pool.length) {
    const predicted = pool.filter(
      (a) => a.prediction === o.previousAction?.action,
    );
    if (predicted.length) candidates = predicted;
  }
  return candidates[Math.floor(rand() * candidates.length)];
}
function envelope(m, id, a) {
  return {
    match_id: m.matchId,
    round: m.state.round,
    actor_id: id,
    state_hash: E.stateHash(m),
    client_nonce: `nonce-${id}-${m.state.round}`,
    action: a.action,
    intensity: a.intensity,
    ...(a.prediction ? { prediction: a.prediction } : {}),
    ...(a.adaptStance ? { adapt_stance: a.adaptStance } : {}),
    ...(a.signatureId ? { signature_id: a.signatureId } : {}),
  };
}
function invariant(p) {
  E.assertPlayer(p);
  assert.equal(
    Object.values(p.stats).reduce((a, b) => a + b),
    420,
  );
  for (const v of Object.values(p.resources)) assert.ok(Number.isFinite(v));
}
export function simulate(count = 10000, { progress = false } = {}) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 1000000)
    throw new Error("invalid_match_count");
  const started = performance.now();
  const summary = {
    ruleset: E.RULES.ruleset_id,
    seedPrefix: "dyadryn-phase1-v1",
    matches: count,
    completed: 0,
    rounds: 0,
    outcomes: {},
    actions: {},
    signatures: {},
    invariantFailures: 0,
    engineFailures: 0,
    replayDivergences: 0,
    seatSwapDivergences: 0,
    digest: "",
    elapsedSeconds: 0,
  };
  let digest = "";
  for (let index = 0; index < count; index++) {
    const seed = `${summary.seedPrefix}-${index}`,
      rand = E.xorshift32(E.fnv1a32(seed));
    let m = E.createMatch({
      matchId: `simulation-${String(index).padStart(6, "0")}`,
      seed,
      a: makePlayer("A", index, rand),
      b: makePlayer("B", index * 3 + 1, rand),
      now: 0,
    });
    while (!m.outcome) {
      const a = choose(m.state.a, m.state.b, rand, index % 4),
        b = choose(m.state.b, m.state.a, rand, (index + 1) % 4);
      const before = m.state;
      // Exercise deadline ownership too: 1 in 97 matches deliberately times out A three times.
      const timeout = index % 97 === 0 && m.state.round <= 3;
      for (const move of [timeout ? { action: "STALL" } : a, b]) {
        summary.actions[move.action] = (summary.actions[move.action] ?? 0) + 1;
        if (move.signatureId)
          summary.signatures[move.signatureId] =
            (summary.signatures[move.signatureId] ?? 0) + 1;
      }
      const ea = envelope(m, "A", a),
        eb = envelope(m, "B", b);
      let now = m.openedAt;
      if (!timeout) m = E.lockAction(m, ea, now);
      m = E.lockAction(m, eb, now);
      if (timeout) now = m.deadline;
      m = E.resolveLockedRound(m, now);
      assert.ok(m);
      invariant(m.state.a);
      invariant(m.state.b);
      const swapped = E.resolveRound(
        { round: before.round, a: before.b, b: before.a },
        b,
        timeout ? null : a,
        seed,
      );
      assert.deepEqual(swapped.a, m.state.b);
      assert.deepEqual(swapped.b, m.state.a);
      assert.deepEqual(swapped.outcome, m.outcome);
      summary.rounds++;
    }
    E.verifyLocalHistory(m);
    E.verifyReplay(E.exportReplay(m));
    summary.completed++;
    summary.outcomes[m.outcome.reason] =
      (summary.outcomes[m.outcome.reason] ?? 0) + 1;
    digest = E.sha256(digest + m.eventRootHash);
    if (progress && (index + 1) % 1000 === 0)
      process.stderr.write(
        `simulation: ${index + 1}/${count}, ${summary.rounds} rounds, no invariant/replay/seat-swap failures\n`,
      );
  }
  summary.digest = digest;
  summary.elapsedSeconds = Number(
    ((performance.now() - started) / 1000).toFixed(3),
  );
  summary.averageRounds = summary.rounds / count;
  summary.balanceWarning =
    summary.averageRounds > 23 || summary.averageRounds < 8
      ? "average match outside test-strategy 8–23 round band"
      : null;
  assert.equal(summary.completed, count);
  return summary;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const count = Number(process.argv[2] ?? 10000);
  const result = simulate(count, { progress: true });
  mkdirSync(new URL("../evidence/", import.meta.url), { recursive: true });
  writeFileSync(
    new URL("../evidence/simulation.json", import.meta.url),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
}
