// Automated release gates from docs/QA_RUBRIC.md (section A). Run after `npm run build` with the site served on :4173.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const site = path.join(root, 'site'), BASE = process.env.BASE || 'http://localhost:4173';
const pages = fs.readdirSync(site).filter(f => f.endsWith('.html'));
let fail = 0; const log = (ok, msg) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + msg); };

// A1/A3/A4/A5/A14: copy lint on built HTML text
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ');
const BAD_NAME = /DyadRyn|Dyad-Ryn|DYAD RYN|Dydryn|Dyadrin/;
const BAD_CLAIMS = /\b(sentient|conscious AI|soul score|true personality|unhackable|the ultimate AI battle|the smartest AI wins|unleash your bot|infinite intelligence|perfectly represents your memories|fair by definition|proves consciousness|proves intelligence)\b/i;
const CANON = /\b(Bright Fall|Mirror Veil|Tella|Kael|Mira\b|Oren|Kernel origin|nine.dot)/i;
for (const f of pages) {
  const html = fs.readFileSync(path.join(site, f), 'utf8'), text = strip(html);
  log(!BAD_NAME.test(text), `A1 brand spelling — ${f}`);
  // allowed: statements that DENY the claim
  const m = text.match(BAD_CLAIMS); const allowed = m && /not|never|“smartest AI”|Never an|no /.test(text.slice(Math.max(0, text.search(BAD_CLAIMS) - 90), text.search(BAD_CLAIMS) + 60)); log(!m || allowed, `A3 banned claims — ${f}${m ? ' [' + m[0] + ']' : ''}`);
  log(!CANON.test(text), `A4/A5 no protected canon names — ${f}`);
  log(!/\b(https?:)?\/\/(?!dyadryn\.com|www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}/i.test(html.replace(/xmlns="[^"]*"/g, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')), `A12 no external URLs — ${f}`);
}
const allText = pages.map(f => strip(fs.readFileSync(path.join(site, f), 'utf8'))).join(' ');
log(/not affiliated with, sponsored by, or endorsed by Meta/.test(allText), 'A14 Meta/Muse disclaimer present');
log(/OFL|Open Font License/.test(fs.readFileSync(path.join(site, 'legal.html'), 'utf8')) && fs.existsSync(path.join(site, 'assets/fonts/OFL-LICENSE.txt')), 'A15 licences documented');
// A6: no production constants/prompts/schemas leaked
const siteFiles = (function w(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? w(path.join(d, e.name)) : [path.join(d, e.name)]); })(site).filter(f => /\.(html|js|css|json|txt)$/.test(f));
const LEAK = /(stat_factor|rng_factor|guard_decay_fraction|round_energy_regen|typesafe\/jev|model_routes|profile_compiler|shadow_candidate|live_strategy|0\.55\s*\*\s*VITALITY|11\s*×\s*stat_factor|wrangler\.jsonc|ADMIN_TOKEN|JEV_[A-Z_]+|CLOUDFLARE_API_TOKEN)/i; // infrastructure names are public by design; constants, prompts, model routes and secrets are not
log(!siteFiles.some(f => LEAK.test(fs.readFileSync(f, 'utf8'))), 'A6 no engine constants / prompts / routes in published files');

// A10: contrast of design-token pairs
const lum = (h) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const pairs = [['#E2DAC8', '#0C0E0F', 4.5, 'text on deep'], ['#E2DAC8', '#17191A', 4.5, 'text on graphite'], ['#B4B09F', '#121415', 4.5, 'text-2 on s1'], ['#969784', '#0C0E0F', 4.5, 'text-3 on deep'], ['#969784', '#191C1D', 4.5, 'text-3 on s2'], ['#E0955A', '#0C0E0F', 4.5, 'accent text on deep'], ['#8FB1BC', '#0C0E0F', 4.5, 'trace text on deep'], ['#0C0E0F', '#C9713F', 4.5, 'primary button label'],['#0C0E0F', '#D9834F', 4.5, 'primary button hover'], ['#17191A', '#E7DECA', 4.5, 'graphite on paper'], ['#4A4A44', '#E7DECA', 4.5, 'muted on paper'], ['#743923', '#E7DECA', 4.5, 'rust on paper'], ['#0C0E0F', '#D8D0BE', 4.5, 'deep on bone'], ['#E58A7B', '#0C0E0F', 4.5, 'error text on deep'], ['#D8D0BE', '#0C0E0F', 3, 'ui border']];
for (const [a, b, min, n] of pairs) { const r = cr(a, b); log(r >= min, `A10 contrast ${r.toFixed(2)}:1 (${n})`); }

// runtime checks
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const axeSrc = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
for (const f of pages) {
  for (const w of [320, 390, 768, 1024, 1440, 1920]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'no-preference' }); const p = await ctx.newPage();
    const errs = [], reqs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
    p.on('requestfailed', r => reqs.push(r.url())); p.on('request', r => { if (!r.url().startsWith(BASE)) reqs.push('EXT ' + r.url()); });
    await p.goto(`${BASE}/${f}`, { waitUntil: 'load' }); await p.waitForTimeout(500);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    log(sw <= 1, `A11 no horizontal scroll ${f} @${w}${sw > 1 ? ' (+' + sw + 'px)' : ''}`);
    if (w === 1440 || w === 390) {
      log(!errs.length && !reqs.length, `A12 console/requests clean ${f} @${w}${errs.length || reqs.length ? ' ' + JSON.stringify([...errs, ...reqs]).slice(0, 200) : ''}`);
      await p.evaluate(() => document.querySelectorAll('.rv').forEach(e => e.classList.add('in')));
      await p.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' }); await p.waitForTimeout(150);
      await p.addScriptTag({ content: axeSrc });
      const r = await p.evaluate(async () => { const x = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'], rules: { 'color-contrast': { enabled: true }, region: { enabled: false } } }); return x.violations.map(v => ({ id: v.id, n: v.nodes.length, impact: v.impact, sample: v.nodes[0].target.join(' ') + ' :: ' + (v.nodes[0].failureSummary || '').split('\n')[1] })); });
      log(!r.length, `A13 axe ${f} @${w} ${r.length ? JSON.stringify(r).slice(0, 700) : ''}`);
    }
    await ctx.close();
  }
}
// keyboard: skip link + focus visible
{ const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); await p.goto(BASE + '/index.html'); await p.keyboard.press('Tab'); const t = await p.evaluate(() => document.activeElement.className); log(/skip/.test(t), 'A13 skip link is first tab stop'); }
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL GATES PASSED'); process.exit(fail ? 1 : 0);
