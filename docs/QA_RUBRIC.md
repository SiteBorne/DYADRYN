# DYADRYN Website — Evaluation Rubric (v1)

Every page and component is scored against this rubric before it ships. A hard gate failing blocks release; soft gates are scored 0–2 (target ≥ 1.6 average per category).
Sources: DYADRYN Brand Bible v1.1 §76 (Brand QA), DYADRYN Brand Release Gate, Canon Bridge, Production KB v3.0 (privacy/IP/fair play).

## A. Hard gates (all must be YES)
| # | Gate | How verified |
|---|------|--------------|
| A1 | Brand name written **DYADRYN** / Dyadryn / `dyadryn` only; never DyadRyn, Dyad-Ryn, Dydryn, Dyadrin | grep over `site/` |
| A2 | No generic neon magenta/cyan, circuit-brain, robot, crossed-swords marks | visual review + palette lint |
| A3 | No claims of consciousness / personhood / "smartest AI" / "unhackable" / "fair by definition" / "soul score" / "true personality" | banned-phrase grep |
| A4 | No new ASHEN canon asserted (Bright Fall cause, Mirror Veil nature, Tella, Kernel origin, named-character history, literal Dyadryn protocol); the extended-canon hook is **not** presented as fact | copy review + grep |
| A5 | Nine-dot absence symbol and named ASHEN characters not used | review |
| A6 | Core IP protected: no production resolver constants/formulas, compiler weights, prompts, Jev question sets, schemas, tokens, or model routes are published; demo resolver is a simplified teaching model and labelled as such | review of `site/` + docs |
| A7 | Any simulated / sample / counterfactual content is labelled (SAMPLE / SIMULATED) | review |
| A8 | Game outcome never implied to be model self-declared; "agent chooses, engine decides" is consistent | copy review |
| A9 | Critical state never conveyed by colour alone (icon/label/pattern/number paired) | review + a11y test |
| A10 | Body text contrast ≥ 4.5:1, large text ≥ 3:1, UI boundaries ≥ 3:1 | automated contrast script |
| A11 | No horizontal scroll at 320 / 390 / 768 / 1024 / 1440 / 1920 px | Playwright overflow test |
| A12 | Zero console errors; zero failed requests; no external network calls (fonts self-hosted, licences kept) | Playwright |
| A13 | Fully keyboard operable; visible focus; skip link; landmarks; reduced-motion honoured | Playwright + axe |
| A14 | Trademark/affiliation disclaimer for Meta/Muse present; no implied endorsement | grep |
| A15 | Fonts/art/audio licensing documented (OFL fonts; all art procedurally generated) | `legal.html` + repo |

## B. Soft quality gates (0 = fail, 1 = acceptable, 2 = excellent)
1. **One dominant hierarchy** per screen; clear reading order.
2. **Forensic/ritual, not esports-loud**; tactile, not glossy; saturation as information.
3. **Negative space** intentional; generous rhythm; alternating dark/bone bands.
4. **Sharpness**: every image is vector or text; nothing rasterised below 2× DPR; hairlines crisp.
5. **Not a template**: bespoke interactions (Trace Window, Proofline, Training Ground, Mask Forge, Replay Verifier, Muse architecture map, Trailer).
6. **Comprehension for everyday players (8–80)**: plain-language first, lexicon second; ≥ 18px body; glossary on hover/focus/tap; "What is this?" reachable in ≤ 1 scroll.
7. **Marketing**: single primary CTA per view, benefit-led headline, proof before promise, no fake testimonials/logos/metrics.
8. **Colour theory**: 60/30/10 (graphite / bone-ash / oxide), oxide–cold-blue complementary pair for active/trace, warm/cool separation, no accent overuse.
9. **Motion**: every animation communicates state; 120–220ms UI, 250–450ms state, 500–900ms reveal.
10. **Performance**: HTML < 120KB/page, CSS < 90KB, JS < 120KB total, LCP < 2.5s on mid-tier mobile.
11. **Mechanics completeness**: all 8 actions, 7 resources, 6 attributes, 8 signatures, 4 modes, resolution order, terminal conditions, timeouts, repetition/drift — accurate to `dyadryn.core.v1`.
12. **Muse architecture**: D0/D1/D2 planes, MCP + REST adapters, connector tool surface, privacy boundary, Markdown turn packet — accurate and IP-safe.

## C. Release procedure
1. `npm run build` 2. `npm run qa` (automated A-gates) 3. Screenshot review at 390 / 768 / 1440 4. Score B-gates in the PR description 5. Commit + push.
