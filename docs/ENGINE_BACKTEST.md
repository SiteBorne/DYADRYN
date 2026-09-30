# Engine backtest — findings (reference engine 0.3.0-rc.1, rules dyadryn.core.v1)

Method: every number below comes from the real resolver, seeded, seat-swapped. Policies see public information only.
"Bandit" = 1-ply expectimax against an empirical model of the opponent's public history; "deep" = 3-round lookahead.
Constants are deliberately not quoted here; see `engine-lab/PRIVATE/`.

## 0. Baseline reproduced exactly
92/92 engine tests pass. The 10,000-match simulation reproduces digest `570414a6…154b0`, 224,295 rounds, identical outcome mix (average 22.4295 rounds).

## 1. Shipped: speed (verified)
`canonical()` re-serialised the ever-growing history on every `stateHash` (several per round) → quadratic per match.
Freezing resolver-produced history and memoising `canonical` of frozen objects gives **byte-identical hashes**:
10,000-match digest identical, all 92 tests pass, **340.5 s → 208.2 s (1.64×)** while other jobs shared the CPU. Patch: `engine-lab/perf-canonical-memo.patch`.
Tried and rejected: memoising the archive lookup (no measurable gain).

## 2. Shipped to the frontend: win chance (build-time)
Question: can the UI show a believable win-chance bar without shipping engine constants?
- Monte-Carlo rollouts on the real resolver: calibrated, but Brier 0.160 vs 0.157 for a trivial baseline and ~50 ms/state → **rejected**.
- Logistic on the public proof-score lead, slope fitted per round bucket, 32,250 held-out states: **Brier 0.124 (coin flip 0.246, fixed slope 0.136)**, reliability curve near the diagonal. Extra features (vitality lead) and bin-calibration added nothing → **adopted**.
- Computed at export time (`scripts/export-engine-replays.mjs`), shipped as one number per round. The UI labels it a simulated estimate and flags ≥18-point swings as turning points.
- A first attempt split train/test by match parity and produced a fake miscalibration (style confound) — caught and redone with a hashed split.

## 3. Findings that need a product decision (not applied to v1)
1. **Two attributes do nothing.** INFLUENCE and CREATIVITY never enter the resolver (only as Adapt-stance trade pools; CREATIVITY also gates one Trace flavour signal). Regression on random profiles: the other four attributes are worth roughly 0.4–1.2 win-% per point, INFLUENCE ≈ 0, CREATIVITY = reference. This is why Broker/Veil/Swarm (high INF/CRE) sit low.
2. **Guard/Recover dominate; most actions add nothing.** A guard-and-poke script beats every simple policy (100% of pairs) and loses only to lookahead. Removing Guard or Recover from a strong agent costs it heavily (Guard → 12–20% vs its full self, Recover → 2–22%); removing Press, Trace, Counter, Adapt, Mirror or Signature leaves it at 45–62%, i.e. within noise of zero. Same pattern with two different agents (n=60 and n=16 — the second is low-powered).
3. **Competent play stalls.** Bandit-vs-bandit: 97% of matches reach the round limit (mean 23.7 rounds) and are decided by the proof-score tie-break. The 22.4-round product failure is therefore a floor, not the worst case.
4. **Match length is steep in two dials.** Raising Press damage and lowering Guard gain moves strong-play length from ~23 to ~7 across a narrow band; a mid setting gives 12–18. YAML-only changes fix length but leave dead actions and archetype skew.
5. **Archetype skew is real.** Bandit mirror, n=120 per archetype (±8.7): Trace-Hunter 63%, Stillpoint 58%, Swarm 55%, Broker 50%, Veil 39%, Archive 35%. COUNTERFACTUAL_SHIELD carriers win 60%.
6. **No seat bias.** Identical policy/archetype mirror: A 912, B 908 of 2000.
7. Minor: `assertState` hard-codes `timeouts >= 3` instead of the ruleset value.

## 4. Candidate direction (exploratory — not ratified, not applied)
Two small changes were the best found: **Guard fatigue** (Guard gain reduced when the previous base action was also Guard) plus a modest **Press damage increase**.
Effect vs v1: naive guard-turtle win rate 81% → 14%; no simple policy exceeds ~54%; strong-play length 23.7 → ~18 rounds with ~38% round-limit; bandit still beats the field (skill edge kept); action mix becomes Press/Guard/Recover/Mirror instead of Guard/Recover.
Does **not** fix: archetype skew (Stillpoint 68%, Archive 35%), dead Trace/Adapt/Counter/Signature, dead INFLUENCE/CREATIVITY. Buffing signature strength 2.6× only begins to make Signature matter. These need design work (e.g. attach INFLUENCE/CREATIVITY to actions players actually use) and human playtests — the harness measures each of them in minutes.
Caveats: the bandit's one-step objective may undervalue information moves; a changed ruleset needs a new id, new frozen vectors and a fresh 10,000-match qualification.
