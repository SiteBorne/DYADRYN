// Generates the DYADRYN wordmark + sigil as pure vector paths (no font dependency at runtime).
// Wordmark: IBM Plex Sans Condensed Bold (OFL) with one controlled discontinuity (Y division), per Brand Bible §13.3.
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'src/assets/brand');
const gen = path.join(root, 'src/partials/_gen');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(gen, { recursive: true });

const font = opentype.loadSync(path.join(root, 'scripts/vendor/plexcond700.woff'));
const TEXT = 'DYADRYN';
const SIZE = 200;
const TRACK = 0.075 * SIZE;
let x = 0;
const glyphs = [];
for (const ch of TEXT) {
  const g = font.charToGlyph(ch);
  const p = g.getPath(x, SIZE, SIZE);
  glyphs.push({ ch, x, p, adv: g.advanceWidth * (SIZE / font.unitsPerEm) });
  x += g.advanceWidth * (SIZE / font.unitsPerEm) + TRACK;
}
const width = x - TRACK;
const capTop = SIZE - font.tables.os2.sCapHeight * (SIZE / font.unitsPerEm);
const capH = SIZE - capTop;
const yGlyph = glyphs[1];
const yb = yGlyph.p.getBoundingBox();
const yCx = (yb.x1 + yb.x2) / 2;
const d = glyphs.map(g => g.p.toPathData(2)).join(' ');
const pad = 4;
const vb = `${-pad} ${capTop - pad} ${(width + pad * 2).toFixed(1)} ${(capH + pad * 2).toFixed(1)}`;
const cutW = 5.5;
const maskId = 'dyadryn-y-cut';
const wordmarkInner = (fill) => `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="-10" y="${capTop - 20}" width="${width + 20}" height="${capH + 40}"><rect x="-10" y="${capTop - 20}" width="${width + 20}" height="${capH + 40}" fill="#fff"/><rect x="${(yCx - cutW / 2).toFixed(2)}" y="${(capTop - 20).toFixed(2)}" width="${cutW}" height="${(capH + 40).toFixed(2)}" fill="#000"/></mask></defs><path mask="url(#${maskId})" fill="${fill}" d="${d}"/>`;

const svg = (fill, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="DYADRYN"><title>DYADRYN</title>${wordmarkInner(fill)}${extra}</svg>\n`;
fs.writeFileSync(path.join(out, 'DYADRYN_LOGO_PRIMARY_BONE_v01.svg'), svg('#D8D0BE'));
fs.writeFileSync(path.join(out, 'DYADRYN_LOGO_PRIMARY_GRAPHITE_v01.svg'), svg('#17191A'));
// inline partial (currentColor) — id-suffixed so multiple instances don't collide
fs.writeFileSync(path.join(gen, 'wordmark.html'),
  `<svg class="wordmark" viewBox="${vb}" role="img" aria-label="DYADRYN" focusable="false"><defs><mask id="ymask-{{uid}}" maskUnits="userSpaceOnUse" x="-10" y="${capTop - 20}" width="${width + 20}" height="${capH + 40}"><rect x="-10" y="${capTop - 20}" width="${width + 20}" height="${capH + 40}" fill="#fff"/><rect x="${(yCx - cutW / 2).toFixed(2)}" y="${(capTop - 20).toFixed(2)}" width="${cutW}" height="${(capH + 40).toFixed(2)}" fill="#000"/></mask></defs><path mask="url(#ymask-{{uid}})" fill="currentColor" d="${d}"/></svg>`);
fs.writeFileSync(path.join(gen, 'wordmark-meta.json'), JSON.stringify({ vb, width, capH }));

// ---------- Sigil: two opposed "D" brackets (the dyad), each broken once, rotationally interrupted ----------
const P = (cx, cy, r, a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
const f = (n) => n.toFixed(2);
const R = 27;
const CL = 36, CR = 64; // bracket centres
const L1 = P(CL, 50, R, 180), L2 = P(CL, 50, R, 144);
const leftD = `M44 23H${CL}A${R} ${R} 0 0 0 ${f(L1[0])} ${f(L1[1])}M${f(L2[0])} ${f(L2[1])}A${R} ${R} 0 0 0 ${CL} 77H44`;
const R1 = P(CR, 50, R, 360), R2 = P(CR, 50, R, 324);
const rightD = `M56 77H${CR}A${R} ${R} 0 0 0 ${f(R1[0])} ${f(R1[1])}M${f(R2[0])} ${f(R2[1])}A${R} ${R} 0 0 0 ${CR} 23H56`;
const segs = leftD + rightD;
const axis = `M50 38V62`;
const inner = ``;
function sigilSVG({ stroke = 'currentColor', accent = 'currentColor', size = null } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${size ? ` width="${size}" height="${size}"` : ''} fill="none" role="img" aria-label="DYADRYN sigil"><title>DYADRYN sigil</title><path d="${segs}" stroke="${stroke}" stroke-width="9" stroke-linecap="butt"/><path d="${axis}" stroke="${accent}" stroke-width="5"/></svg>\n`;
}
fs.writeFileSync(path.join(out, 'DYADRYN_SIGIL_PRIMARY_BONE_v01.svg'), sigilSVG({ stroke: '#D8D0BE', accent: '#B85C32' }));
fs.writeFileSync(path.join(out, 'DYADRYN_SIGIL_MONO_GRAPHITE_v01.svg'), sigilSVG({ stroke: '#17191A', accent: '#17191A' }));
// favicon: graphite tile, bone rings, oxide axis; simplified for 16–32px
fs.writeFileSync(path.join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="#17191A"/><g transform="translate(10 10) scale(.8)" fill="none"><path d="${segs}" stroke="#D8D0BE" stroke-width="11"/><path d="${axis}" stroke="#B85C32" stroke-width="7"/></g></svg>\n`);
fs.writeFileSync(path.join(gen, 'sigil.html'),
  `<svg class="sigil" viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false"><path d="${segs}" stroke="currentColor" stroke-width="9"/><path class="sigil-axis" d="${axis}" stroke="var(--sigil-axis,currentColor)" stroke-width="5"/></svg>`);
fs.writeFileSync(path.join(gen, 'sigil-half-l.html'), `<svg class="sigil-half" viewBox="4 15 44 70" fill="none" aria-hidden="true" focusable="false"><path d="${leftD}" stroke="currentColor" stroke-width="9"/></svg>`);
fs.writeFileSync(path.join(gen, 'sigil-half-r.html'), `<svg class="sigil-half" viewBox="52 15 44 70" fill="none" aria-hidden="true" focusable="false"><path d="${rightD}" stroke="currentColor" stroke-width="9"/></svg>`);
fs.writeFileSync(path.join(gen, 'sigil-paths.json'), JSON.stringify({ segs, axis, inner }));
console.log('brand assets written', { width: width.toFixed(1), capH: capH.toFixed(1) });
