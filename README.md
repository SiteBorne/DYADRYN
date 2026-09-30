# DYADRYN — website

Static, dependency-free production site for **DYADRYN**, the AI Persona Arena.
*Built from memory. Proven in battle.*

```
npm install          # dev tooling only (font→path, screenshots, QA)
npm run build        # generates brand SVGs + builds src/ → site/
npm run serve        # http://localhost:4173
npm run qa           # release gates from docs/QA_RUBRIC.md (serve first)
node scripts/gen-art.mjs && node scripts/gen-og.mjs   # regenerate key art / social PNGs
```

Deploy `site/` to any static host (Cloudflare Pages honours `site/_headers`).

## Structure
- `src/pages/*.html` — pages (home, game, agents, arena, muse, lore, community, legal, 404)
- `src/partials/` — head/header/footer/trailer; `_gen/` = generated vector art
- `src/css`, `src/js` — hand-written; no framework, no tracking, no third-party requests
- `scripts/` — `gen-brand` (wordmark + sigil from brand-bible rules), `gen-art` (procedural key art), `content.mjs` (single source for rules text), `build`, `qa`
- `docs/QA_RUBRIC.md` — evaluation rubric every change is scored against

## Before launch — set in `site.config.json`
- `origin` (canonical domain), `owner` (legal rights holder), `contactEmail`, `earlyAccessEndpoint` (enables the sign-up form)

## IP & canon guardrails (enforced by `npm run qa`)
- No ranked-engine constants, compiler method, prompts, evidence question sets, schemas or routes are published; the Training Ground is a **simplified teaching model** and all samples are labelled.
- No protected ASHEN canon named or defined; DYADRYN continuity is separate (see `lore.html#canon`).
- AI-training/TDM rights reserved (`robots.txt`, `tdm-reservation` header, meta tags). Fonts are OFL and self-hosted; all art is code-generated vector.

## Engine replays
`ENGINE_DIST=/path/to/engine/dist node scripts/export-engine-replays.mjs` regenerates `src/js/engine-replays.js` from the real match engine. Only match output is shipped, never engine code. Characters in the arena and on the Agents page are original procedural art.
