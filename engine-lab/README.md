# DYADRYN engine lab

Backtesting harness for the reference engine. It drives the **real** resolver (`resolveRound`) with a population of policies and can build
rule variants (YAML overrides, plus a few code-level experiments marked `@…`) without touching the engine source.

Setup: copy the engine's compiled `dist/` to `engine-lab/variants/v1/` and its `config/rules.v1.yaml` to `engine-lab/PRIVATE/` (both git-ignored — they contain ranked constants), `npm i yaml`.

| script | question it answers |
|---|---|
| `lab.mjs` | policies (random, heuristics, guard-turtle, reader, signature-only, 1-ply expectimax "bandit", 3-round "deep"), match + tournament helpers, variant builder |
| `matrix.mjs` | who beats whom (seat-swapped) — finds dominant strategies |
| `ablate.mjs` | remove one action from a strong agent; how much does it lose? (= marginal value of that action) |
| `arch.mjs` | archetype / signature win rates with confidence intervals |
| `statvalue.mjs` | win-probability value of one attribute point, by regression on random 420-point profiles |
| `mirror.mjs`, `search.mjs`, `health.mjs` | match-length and health metrics over a grid of rule variants (parallel) |
| `fat.mjs` | code-level experiment: Guard fatigue |
| `wpfit.mjs`, `wpcal.mjs`, `wp.mjs` | win-chance model fit + calibration; Monte-Carlo rollout estimator (rejected) |
| `seat.mjs` | seat symmetry |
| `perf-canonical-memo.patch` | verified speed patch for `engine/src` (byte-identical hashes) |

Findings: `docs/ENGINE_BACKTEST.md`. Exact constants, variant tables and raw runs stay in `engine-lab/PRIVATE/`.
