# Ruleset `dyadryn.core.v2` — qualification record

Measured on the real resolver (`engine-lab/`, worker/engine/dist), seat-swapped, public information only. Design rationale and citations: `GAME_THEORY.md`. Exact constants are in `worker/config/rules.v2.yaml`; raw runs stay in the git-ignored `engine-lab/PRIVATE/`. Noise: win-rate figures carry ±8–9 points (95 %) at n = 120; attribute values ±0.8 points at n = 900. Nothing here is a human playtest.

## Gates and results
| Gate | Target | v1 | v2 | Verdict |
|---|---|---|---|---|
| Regression: v2 code with the `v2` section removed reproduces the v1 10,000-match digest | identical | `570414a6…154b0` | identical (92/92 v1 tests also pass on that build) | PASS |
| v2 10,000-match deterministic simulation: no invariant, engine, replay or seat-swap failure | 0 | 0 | 0 / 0 / 0 / 0, digest `04338b614e4efac9c938665ad2ee5bdc6d84c77eb64ee72f1085f85e06770d51`, 22.5 mean rounds for the seeded heuristic population | PASS |
| Stage-game equilibrium: every action a best reply to something | min mass ≥ 4 %, entropy ≥ 2.3 bits | Guard 74 %, Recover 25 %, entropy 0.9, six actions ≈ 0 % | min 5 %, entropy 2.78; Recover 30 %, Signature 17 %, Mirror 12 %, Adapt 11 %, Guard 11 %, Trace 7 %, Press 7 %, Counter 5 % | PASS |
| Competent play does not stall: bandit-vs-bandit match length | 12–22 rounds | 23.7 (97 % at the round limit) | 17.5 mean, 21 % at the limit (13.7 / 5 % on random profiles) | PASS |
| Reciprocators do not stall: strike-only-after-struck vs itself | ends before round limit | 100 % at limit | 0 % at limit (mutual erosion, round 14) | PASS |
| No dominant simple policy | ≤ 60 % vs field | guard-turtle 81 % | max 61 % (reader), turtle 10 % | BORDERLINE |
| Skill is rewarded | lookahead edge ≥ 75 % | 86 % | 85 % | PASS |
| Action ablation: removing an action costs the agent | < 50 % | 2 of 8 actions matter | Mirror 27 %, Signature 34 %, Recover 44 %, Guard 46 %, Press 47 %; **Trace 51 %, Counter 53 %, Adapt 56 %** | PARTIAL — see below |
| Prisoner's dilemma: T > R > P > S and 2R > T + S | hold | n/a | hold (T −0.85, R −1.07, P −6.8, S −10.0 proof-score units); three-round shadow: betrayer −19.5 vs betrayed −10.8 | PASS |
| Reciprocity is not exploited | TFT ≥ ALLD | n/a | ALLD 63 % vs TFT (n = 48), ALLC 0 % vs ALLD | WEAK (noise) |
| Attribute points worth about the same | spread ≤ 1 pp | INFLUENCE ≈ 0, CREATIVITY ref., others 0.4–1.2 | values −1.45…+0.17 pp (±0.8 noise); INFLUENCE and CREATIVITY now live | PARTIAL |
| Signature strength | 45–55 % when carried (flat stats) | 38–75 % | 44–55 % (calibration) | PASS |
| Archetype balance (bandit mirror, n = 120 each) | 45–55 % | 35–63 % | 39–65 % | NOT MET |
| Seat symmetry | ±2 % | A 912 / B 908 of 2000 | unchanged mechanism (per-round seat-swap equality asserted in 200 seeded matches) | PASS |

## Honest remaining gaps
1. **Adapt, Trace and Counter are still near-neutral for a one-ply agent.** Their value is multi-round (stance, signals, reads), which one-ply lookahead and the stage-game analysis cannot see. Adapt now has an immediate Focus/Guard benefit and real equilibrium weight (11 %); whether it earns its place needs a multi-round search (deeper policies or human play).
2. **Archetype presets are not balanced** (Stillpoint 65 %, Swarm 62 % high; Veil 39 % low). Signatures are calibrated, so the residual comes from the preset stat lines. Archetypes are starting templates, not rules; players are free to allocate. Next step: adjust preset stats with the same calibration loop, then playtest.
3. The "reader" policy sits at 61 %, just over the 60 % guideline.
4. Everything above is self-play by heuristic and lookahead policies. **Ranked stays disabled** until human or model populations, anti-collusion and rating calibration are qualified.

## Reproduce
```
cd worker/engine && npm run test:v1 && npm run test:v2           # v1 regression build, then v2 build
node scripts/simulate.mjs 10000                                   # v2 digest
cd ../../engine-lab && node nash.mjs v2 '{}' 200                  # equilibrium structure
node arch.mjs; node statvalue.mjs; node ablate.mjs v2 bandit 30   # balance
node pd.mjs v2                                                    # dilemma structure + Axelrod mini-tournament
node calib.mjs 900 4; node calib2.mjs 4 600                       # signature / attribute calibration
```
