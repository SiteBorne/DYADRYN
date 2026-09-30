// Procedural vector key-art for DYADRYN. Everything is SVG geometry generated from seeded RNG:
// resolution-independent (sharp at any DPR), tiny, reproducible, and original (no raster sources).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const gen = path.join(root, 'src/partials/_gen');
fs.mkdirSync(gen, { recursive: true });

const C = { deep: '#0C0E0F', graphite: '#17191A', ash: '#777A78', bone: '#D8D0BE', paper: '#E7DECA', oxide: '#B85C32', cold: '#607C86', rust: '#743923', amber: '#D78A43', veil: '#3F626D' };
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const n2 = (v) => (Math.round(v * 10) / 10).toString();
const P = (cx, cy, r, a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
const arcPath = (cx, cy, r, a0, a1) => { const [x0, y0] = P(cx, cy, r, a0), [x1, y1] = P(cx, cy, r, a1); const large = ((a1 - a0 + 720) % 360) > 180 ? 1 : 0; return `M${n2(x0)} ${n2(y0)}A${r} ${r} 0 ${large} 1 ${n2(x1)} ${n2(y1)}`; };

/** Ruined tower skyline. Returns silhouette path + rim-light edges (toward light at lightX). */
export function skyline({ seed, x0 = -40, x1 = 1640, baseY = 720, minH = 60, maxH = 300, minW = 18, maxW = 70, lightX = 1130, dense = 1, cap = null }) {
  const r = rng(seed);
  let sil = '', edge = '', x = x0;
  while (x < x1) {
    const w = minW + r() * (maxW - minW);
    const gapChance = r();
    if (gapChance < 0.18 * (2 - dense)) { x += w * (0.4 + r()); continue; }
    // taller near the eclipse (composition) but with random collapse
    const near = 1 - Math.min(1, Math.abs(x - 1250) / 900);
    let h = minH + (maxH - minH) * (0.25 + 0.75 * r()) * (0.55 + 0.6 * near);
    if (r() < 0.14) h *= 0.45; // collapsed tower
    if (cap && x + w > cap.x0 && x < cap.x1) h = Math.min(h, baseY - cap.minTop);
    const top = baseY - h;
    const style = r();
    const xr = x + w;
    let d;
    if (style < 0.16) { // flat, single ledge
      const l = top + 6 + r() * 14, s = w * (0.2 + r() * 0.25);
      d = `M${n2(x)} ${baseY}V${n2(top + 12)}L${n2(x + s)} ${n2(top + 12)}V${n2(top)}H${n2(xr - s * 0.6)}V${n2(l)}H${n2(xr)}V${baseY}Z`;
    } else if (style < 0.40) { // sheared/broken top
      const a = top + r() * 30, b = top + r() * 50;
      const zig = 3 + Math.floor(r() * 4); let pts = '';
      for (let i = 1; i < zig; i++) pts += `L${n2(x + w * i / zig)} ${n2(top + r() * 46)}`;
      d = `M${n2(x)} ${baseY}V${n2(a)}${pts}L${n2(xr)} ${n2(b)}V${baseY}Z`;
    } else if (style < 0.52) { // stepped
      const s1 = w * 0.35, s2 = w * 0.7;
      d = `M${n2(x)} ${baseY}V${n2(top + 40)}H${n2(x + s1)}V${n2(top + 16)}H${n2(x + s2)}V${n2(top)}H${n2(xr)}V${baseY}Z`;
    } else if (style < 0.62) { // spire
      const cx = x + w * (0.3 + r() * 0.4), sp = 50 + r() * 110;
      d = `M${n2(x)} ${baseY}V${n2(top)}H${n2(cx - 3)}L${n2(cx)} ${n2(top - sp)}L${n2(cx + 3)} ${n2(top)}H${n2(xr)}V${baseY}Z`;
    } else if (style < 0.76) { // diagonal-cut slab (sliced by the Fall — silhouette only, no cause implied)
      const dir = r() < 0.5 ? 1 : -1, cutH = 40 + r() * 90;
      d = dir > 0
        ? `M${n2(x)} ${baseY}V${n2(top + cutH)}L${n2(xr)} ${n2(top)}V${baseY}Z`
        : `M${n2(x)} ${baseY}V${n2(top)}L${n2(xr)} ${n2(top + cutH)}V${baseY}Z`;
    } else if (style < 0.88) { // twin prongs
      const m = x + w * 0.5, p1 = 30 + r() * 80, p2 = 20 + r() * 60;
      d = `M${n2(x)} ${baseY}V${n2(top - p1)}L${n2(m - 3)} ${n2(top + 10)}L${n2(m + 4)} ${n2(top - p2 * 0.4)}L${n2(xr)} ${n2(top - p2)}V${baseY}Z`;
    } else { // leaning slab
      const lean = (r() - 0.5) * 30;
      d = `M${n2(x)} ${baseY}L${n2(x + lean)} ${n2(top + 20)}L${n2(x + w * 0.5 + lean)} ${n2(top)}L${n2(xr + lean * 0.6)} ${n2(top + 30)}L${n2(xr)} ${baseY}Z`;
    }
    // detached fragment floating above a broken crown
    if (r() < 0.16 && h > 120) { const fx = x + w * r() * 0.6, fy = top - 24 - r() * 46, fw = 8 + r() * 14; d += `M${n2(fx)} ${n2(fy)}l${n2(fw)} ${n2(-4 - r() * 8)}l${n2(fw * .6)} ${n2(10 + r() * 8)}l${n2(-fw * .8)} ${n2(6)}Z`; }
    sil += d;
    // rim light on the side facing the eclipse
    const facing = x + w / 2 < lightX ? xr : x;
    edge += `M${n2(facing)} ${baseY}V${n2(top + 14 + r() * 20)}`;
    // fractures
    if (h > 150 && r() < 0.55) { const fx = x + w * (0.3 + r() * 0.4); edge += `M${n2(fx)} ${n2(top + 40)}l${n2((r() - 0.5) * 8)} ${n2(30 + r() * 60)}`; }
    x = xr + (r() < 0.5 ? r() * 6 : 2 + r() * 16);
  }
  return { sil, edge };
}

export function ridge({ seed, x0, x1, y, amp, step = 26, fillTo = 900 }) {
  const r = rng(seed); let d = `M${x0} ${fillTo}L${x0} ${n2(y)}`;
  let cy = y;
  for (let x = x0 + step; x <= x1 + step; x += step * (0.6 + r() * 0.9)) { cy = y + (r() - 0.5) * amp; d += `L${n2(x)} ${n2(cy)}`; }
  return d + `L${x1} ${fillTo}Z`;
}

function cliff({ seed, x0, x1, peakX, peakY, baseY = 900 }) {
  const r = rng(seed); const pts = [[x0, baseY]];
  // angular stepped scarp rising to a plateau, then a broken lip and drop
  const steps = 9; let x = x0, y = baseY - 30;
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps; const nx = x0 + (peakX - 40 - x0) * Math.pow(t, 0.9); const ny = baseY - 30 - (baseY - 30 - peakY) * Math.pow(t, 1.4);
    pts.push([x + (nx - x) * (0.3 + r() * 0.4), y - (r() * 10)]); // shoulder
    pts.push([nx + (r() - 0.5) * 12, ny + (r() - 0.5) * 16]);
    x = nx; y = ny;
  }
  const plateau = [];
  for (let i = 0; i < 6; i++) { x += 16 + r() * 44; const py = peakY + (r() - 0.5) * 8 + (i > 3 ? (i - 3) * 6 : 0); pts.push([x, py]); plateau.push([x, py]); }
  while (x < x1) { x += 30 + r() * 70; pts.push([Math.min(x, x1), peakY + 26 + (x - peakX) * 0.05 + (r() - 0.5) * 36]); }
  pts.push([x1, baseY]);
  const top = pts.slice(1, -1).map(p => `${n2(p[0])} ${n2(p[1])}`).join('L');
  return { fill: `M${pts[0][0]} ${baseY}L${top}L${x1} ${baseY}Z`, edge: `M${top}`, plateauY: peakY, plateau };
}

/** Kintsugi-like repair crack: a random walk with occasional branches */
function crack(r, [sx, sy], angle, len, seg = 7, out = []) {
  let x = sx, y = sy, a = angle, d = `M${n2(x)} ${n2(y)}`;
  for (let i = 0; i < seg; i++) {
    a += (r() - 0.5) * 1.1; const l = len / seg * (0.6 + r() * 0.8);
    x += Math.cos(a) * l; y += Math.sin(a) * l; d += `L${n2(x)} ${n2(y)}`;
    if (r() < 0.32 && i > 0 && i < seg - 1) out.push(...crack(r, [x, y], a + (r() < 0.5 ? 0.9 : -0.9), len * 0.4, 3, []));
  }
  out.push(d); return out;
}

/** The Dyad Mask — two ceramic halves, misregistered, with a heat seam and oxide repair lines. */
export function maskArt({ id = 'mk', seed = 11, w = 1 } = {}) {
  const r = rng(seed);
  const half = 'M0 -300C74 -300 158 -236 180 -132C198 -46 184 46 154 126C128 196 72 258 0 308Z';
  const mirror = (s) => s; // mirrored by transform
  // cracks radiating from right-half edge and from the brow
  const cr = [];
  [[168, -110, 2.7], [150, 100, 2.9], [92, -240, 2.1], [20, 200, -1.9]].forEach(([x, y, a], i) => cr.push(...crack(r, [x, y], a, 130 + r() * 90, 7)));
  const crL = [];
  [[-168, -60, 0.3], [-140, 150, -0.3], [-70, -256, 1.0]].forEach(([x, y, a]) => crL.push(...crack(r, [x, y], a, 110 + r() * 80, 6)));
  // fine crazing
  let craze = '';
  for (let i = 0; i < 90; i++) { const x = (r() - 0.5) * 340, y = (r() - 0.5) * 560; const l = 8 + r() * 26, a = r() * 6.28; craze += `M${n2(x)} ${n2(y)}l${n2(Math.cos(a) * l)} ${n2(Math.sin(a) * l)}l${n2(Math.cos(a + 1.1) * l * .5)} ${n2(Math.sin(a + 1.1) * l * .5)}`; }
  // ventilation slots (mouth)
  let vents = ''; for (let i = 0; i < 5; i++) vents += `M${-56 + i * 28} 176v${28 - Math.abs(i - 2) * 6}`;
  const g = `
<g class="mask-art" data-id="${id}">
  <defs>
    <linearGradient id="${id}-L" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#EDE5D2"/><stop offset=".55" stop-color="#C4BCA8"/><stop offset="1" stop-color="#8C887C"/></linearGradient>
    <linearGradient id="${id}-R" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#7B7869"/><stop offset=".6" stop-color="#4A4A44"/><stop offset="1" stop-color="#26282A"/></linearGradient>
    <clipPath id="${id}-cl"><path d="${half}" transform="translate(9 12)"/><path d="${half}" transform="translate(-9 -12) scale(-1 1)"/></clipPath>
    <filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.18"/></filter>
  </defs>
  <path d="M0 -330V340" stroke="${C.oxide}" stroke-width="3" opacity=".9"/>
  <path d="M0 -330V340" stroke="${C.amber}" stroke-width="1" opacity=".9"/>
  <g transform="translate(-9 -12) scale(-1 1)"><path d="${half}" fill="url(#${id}-L)"/></g>
  <g transform="translate(9 12)"><path d="${half}" fill="url(#${id}-R)"/></g>
  <g clip-path="url(#${id}-cl)">
    <rect x="-220" y="-330" width="440" height="660" filter="url(#${id}-grain)" opacity=".5"/>
    <path d="${craze}" stroke="#0C0E0F" stroke-width=".8" fill="none" opacity=".28"/>
    <!-- brow ridges -->
    <path d="M-176 -86C-120 -110 -60 -108 -14 -92" stroke="#0C0E0F" stroke-width="3" fill="none" opacity=".5" transform="translate(-9 -12)"/>
    <path d="M14 -80C60 -98 120 -98 176 -74" stroke="#0C0E0F" stroke-width="3" fill="none" opacity=".7" transform="translate(9 12)"/>
    <!-- eye slots: paired brackets (the empty-bracket motif) -->
    <g transform="translate(-9 -12)"><path d="M-132 -52 -26 -60 -22 -26 -126 -14Z" fill="${C.deep}"/><path d="M-138 -68v72M-138 -68h14M-138 4h14" stroke="${C.bone}" stroke-width="2" fill="none" opacity=".55"/></g>
    <g transform="translate(9 12)"><path d="M26 -46 132 -38 128 -6 22 -18Z" fill="${C.deep}"/><path d="M140 -56v70M140 -56h-14M140 14h-14" stroke="${C.bone}" stroke-width="2" fill="none" opacity=".35"/><path d="M40 -28 120 -22" stroke="${C.cold}" stroke-width="3"/><path d="M40 -28 120 -22" stroke="#9DC4CF" stroke-width="1"/></g>
    <!-- nose ridge & mouth vents -->
    <path d="M-16 -20V96L-4 118" stroke="#0C0E0F" stroke-width="2" fill="none" opacity=".35"/>
    <path d="${vents}" stroke="${C.deep}" stroke-width="6" fill="none" opacity=".85"/>
    <!-- kintsugi repairs -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g transform="translate(9 12)">${cr.map(d => `<path d="${d}" stroke="${C.rust}" stroke-width="4.2" opacity=".55"/><path d="${d}" stroke="${C.oxide}" stroke-width="2.2"/><path d="${d}" stroke="${C.amber}" stroke-width=".7" opacity=".9"/>`).join('')}</g>
      <g transform="translate(-9 -12) scale(-1 1)">${crL.map(d => `<path d="${d}" stroke="${C.rust}" stroke-width="4" opacity=".5"/><path d="${d}" stroke="${C.oxide}" stroke-width="2"/>`).join('')}</g>
    </g>
  </g>
</g>`;
  return g;
}

function eclipse({ cx, cy, R = 168, id = 'ec', rings = true, ticks = true }) {
  const tk = (() => { let d = ''; for (let i = 0; i < 120; i++) { const a = i * 3, major = i % 5 === 0; const [x0, y0] = P(cx, cy, R + 124, a), [x1, y1] = P(cx, cy, R + 124 + (major ? 12 : 6), a); d += `M${n2(x0)} ${n2(y0)}L${n2(x1)} ${n2(y1)}`; } return d; })();
  return `
<g class="eclipse" data-id="${id}">
  <circle cx="${cx}" cy="${cy}" r="${R + 150}" fill="url(#${id}-halo)"/>
  ${rings ? `<g class="ring-spin" style="transform-origin:${cx}px ${cy}px"><path d="${tk}" stroke="${C.bone}" stroke-width="1" opacity=".38" fill="none"/><circle cx="${cx}" cy="${cy}" r="${R + 100}" fill="none" stroke="${C.bone}" stroke-width="1" stroke-dasharray="1 7" opacity=".5"/></g>
  <g class="ring-spin-r" style="transform-origin:${cx}px ${cy}px"><path id="${id}-txt" d="${arcPath(cx, cy, R + 70, 0, 359.9)}" fill="none"/><text font-family="IBM Plex Mono, monospace" font-size="10.5" letter-spacing="4.4" fill="${C.bone}" opacity=".6"><textPath href="#${id}-txt">SEED COMMITTED · PROOF BEFORE CLAIM · THE AGENT CHOOSES · THE ENGINE DECIDES · THE PROOF REMAINS ·</textPath></text></g>` : ''}
  <path d="${arcPath(cx, cy, R + 8, -90, 70)}" fill="none" stroke="${C.paper}" stroke-width="34" opacity=".22" style="filter:blur(14px)"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="#060708"/>
  <path d="${arcPath(cx, cy, R + 5, 205, 158 + 360)}" fill="none" stroke="${C.paper}" stroke-width="1.6" opacity=".92"/>
  <path d="${arcPath(cx, cy, R + 3, -78, 56)}" fill="none" stroke="${C.rust}" stroke-width="16" opacity=".55"/>
  <path d="${arcPath(cx, cy, R + 3, -78, 56)}" fill="none" stroke="${C.oxide}" stroke-width="9"/>
  <path d="${arcPath(cx, cy, R + 3, -50, 34)}" fill="none" stroke="${C.amber}" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="${R - 20}" fill="none" stroke="${C.bone}" stroke-width=".8" stroke-dasharray="2 5" opacity=".18"/>
</g>`;
}

const defsFor = (id) => `<radialGradient id="${id}-halo"><stop offset="0" stop-color="${C.amber}" stop-opacity=".0"/><stop offset=".55" stop-color="${C.amber}" stop-opacity=".16"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient>`;

function wanderer(x, y, s = 1) {
  // cloaked figure, lean staff, oxide scarf (animated) — silhouette-first
  return `<g class="wanderer" transform="translate(${x} ${y}) scale(${s})">
  <path d="M-30 0C-27 -38 -22 -78 -13 -108C-16 -119 -13 -138 0 -147C13 -139 15 -120 11 -109C20 -78 26 -38 33 0L26 -3-4 2-14 -5-22 1Z" fill="#050607"/>
  <path d="M-36 -152 -32 2" stroke="#050607" stroke-width="3.2"/>
  <path d="M-36 -154v-9" stroke="${C.oxide}" stroke-width="3"/>
  <path class="scarf" d="M9 -117C34 -128 62 -113 96 -131C72 -108 46 -104 12 -108Z" fill="${C.oxide}"><animate attributeName="d" dur="5.5s" repeatCount="indefinite" values="M9 -117C34 -128 62 -113 96 -131C72 -108 46 -104 12 -108Z;M9 -117C38 -122 66 -124 104 -118C76 -104 44 -110 12 -108Z;M9 -117C34 -128 62 -113 96 -131C72 -108 46 -104 12 -108Z"/></path>
  <path d="M9 -117C34 -128 62 -113 96 -131" stroke="${C.amber}" stroke-width=".8" fill="none" opacity=".8"/>
</g>`;
}

/** Full hero scene. Layers carry data-depth for parallax. */
export function heroScene() {
  const id = 'hs';
  const capZ = { x0: 940, x1: 1320, minTop: 530 };
  const far = skyline({ seed: 21, baseY: 690, minH: 70, maxH: 280, minW: 12, maxW: 40, dense: 1, cap: capZ });
  const mid = skyline({ seed: 5, baseY: 705, minH: 110, maxH: 400, minW: 20, maxW: 60, cap: capZ });
  const near = skyline({ seed: 88, x0: 430, x1: 1010, baseY: 722, minH: 160, maxH: 520, minW: 28, maxW: 80, dense: 1.3, cap: capZ });
  const near2 = skyline({ seed: 90, x0: 1300, x1: 1640, baseY: 722, minH: 60, maxH: 180, minW: 24, maxW: 60, cap: null });
  const cl = cliff({ seed: 3, x0: 960, x1: 1620, peakX: 1230, peakY: 505 });
  const rocksL = ridge({ seed: 14, x0: -20, x1: 980, y: 838, amp: 46, step: 34 });
  const rocksL2 = ridge({ seed: 15, x0: -20, x1: 640, y: 812, amp: 60, step: 40 });
  const r = rng(77);
  let debris = ''; for (let i = 0; i < 12; i++) { const x = 1290 + r() * 260, y = 60 + r() * 300, s = 5 + r() * 16, a = r() * 360; debris += `<path class="debris" style="animation-delay:${-r() * 9}s" transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(a)})" d="M${-s} 0L${-s * .3} ${-s * .8}L${s} ${-s * .2}L${s * .5} ${s * .7}L${-s * .5} ${s * .6}Z" fill="#0A0B0C" stroke="${C.bone}" stroke-opacity=".35" stroke-width=".7"/>`; }
  let water = ''; for (let i = 0; i < 46; i++) { const y = 712 + Math.pow(r(), 1.6) * 170, x = r() * 1600, l = 20 + r() * 160; water += `M${n2(x)} ${n2(y)}h${n2(l)}`; }
  // trace-window annotations (cold-blue, only visible under the reticle)
  const T = (x, y, t) => `<text x="${x}" y="${y}" class="tw-t">${t}</text>`;
  const annot = `
    <g class="tw-notes">
      <path d="M1084 150h24M1096 138v24" class="tw-s"/><circle cx="1130" cy="330" r="182" class="tw-s" stroke-dasharray="3 5"/>
      ${T(1010, 120, 'ARENA · RING 01 · INCOMPLETE')}
      <path d="M866 470v-84h74v84" class="tw-s"/>${T(866, 376, '[ WITHHELD BY MASK ]')}
      <path d="M1180 545v-70h58v70" class="tw-s"/>${T(1180, 466, 'STRUCTURE · UNVERIFIED')}
      ${T(1350, 336, 'OPERATOR · CARRY: COLD')}<path d="M1360 342 1360 384" class="tw-s"/>
      ${T(560, 640, 'TRACE WINDOW OPEN · 1 SIGNAL REVEALED')}
      ${T(140, 640, 'MASKPRINT 7F2C·A19E')}
    </g>`;
  return `
<svg class="hero-art" id="heroArt" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A ruined skyline under a broken-ring eclipse. A cloaked figure stands on a cliff. A split ceramic mask, repaired with oxide seams, watches from the left.">
  <defs>
    ${defsFor(id)}
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070809"/><stop offset=".42" stop-color="#15171A"/><stop offset=".72" stop-color="#2A2622"/><stop offset="1" stop-color="#5A4331"/></linearGradient>
    <radialGradient id="horizon" cx="1130" cy="700" r="720" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.amber}" stop-opacity=".62"/><stop offset=".28" stop-color="${C.oxide}" stop-opacity=".28"/><stop offset="1" stop-color="${C.oxide}" stop-opacity="0"/></radialGradient>
    <filter id="cloudA" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".0055 .013" numOctaves="5" seed="7"/><feColorMatrix values="0 0 0 0 .93  0 0 0 0 .88  0 0 0 0 .77  4.6 0 0 0 -1.75"/></filter>
    <filter id="cloudB" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".004 .01" numOctaves="4" seed="31"/><feColorMatrix values="0 0 0 0 .30  0 0 0 0 .28  0 0 0 0 .26  3.6 0 0 0 -1.4"/></filter>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.6 .6"/></filter>
    <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
    <linearGradient id="cmA" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".38" stop-color="#fff" stop-opacity=".2"/><stop offset=".7" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <linearGradient id="cmV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".8" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="cmR" cx="1180" cy="470" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></radialGradient><mask id="cloudMaskA"><rect width="1600" height="720" fill="url(#cmR)"/></mask>
    <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bone}" stop-opacity="0"/><stop offset=".55" stop-color="${C.bone}" stop-opacity=".2"/><stop offset="1" stop-color="${C.bone}" stop-opacity="0"/></linearGradient>
    <linearGradient id="reflect" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".6" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="reflectMask"><rect x="0" y="705" width="1600" height="195" fill="url(#reflect)"/></mask>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.amber}"/><stop offset="1" stop-color="${C.bone}"/></linearGradient>
    <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0C0E0F" stop-opacity=".7"/><stop offset=".3" stop-color="#0C0E0F" stop-opacity="0"/><stop offset=".78" stop-color="#0C0E0F" stop-opacity="0"/><stop offset="1" stop-color="#0C0E0F" stop-opacity=".95"/></linearGradient>
    <radialGradient id="veilL" cx="800" cy="330" r="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0C0E0F" stop-opacity=".62"/><stop offset=".6" stop-color="#0C0E0F" stop-opacity=".25"/><stop offset="1" stop-color="#0C0E0F" stop-opacity="0"/></radialGradient>
    <linearGradient id="nearG" gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="722"><stop offset="0" stop-color="#050607"/><stop offset="1" stop-color="#1D1815"/></linearGradient><path id="silFar" d="${far.sil}"/><path id="silMid" d="${mid.sil}"/><path id="silNear" d="${near.sil + near2.sil}"/>
    <mask id="twMask"><rect width="1600" height="900" fill="#000"/><circle id="twCircle" cx="1130" cy="420" r="0" fill="#fff"/></mask>
  </defs>

  <g class="layer" data-depth="0"><rect width="1600" height="900" fill="url(#sky)"/><rect width="1600" height="900" fill="url(#horizon)"/></g>
  <g class="layer" data-depth="1">
    <rect width="1600" height="720" filter="url(#cloudB)" opacity=".9"/>
    <g class="clouds-drift"><rect x="-200" width="1800" height="700" filter="url(#cloudA)" mask="url(#cloudMaskA)" opacity="1"/></g>
  </g>
  <g class="layer" data-depth="2">${eclipse({ cx: 1130, cy: 330, id })}<g>${debris}</g></g>
  <g class="layer" data-depth="3"><use href="#silFar" fill="#8A6F58" opacity=".5"/><path d="${far.edge}" stroke="${C.amber}" stroke-opacity=".28" stroke-width="1" fill="none"/></g>
  <g class="layer" data-depth="4"><use href="#silMid" fill="#2E2621"/><path d="${mid.edge}" stroke="${C.amber}" stroke-opacity=".38" stroke-width="1.2" fill="none"/></g>
  <rect y="600" width="1600" height="130" fill="url(#mist)"/>
  <g class="layer" data-depth="5"><use href="#silNear" fill="url(#nearG)"/><path d="${near.edge}" stroke="${C.amber}" stroke-opacity=".5" stroke-width="1.4" fill="none"/></g>
  <!-- mirrored ground plane -->
  <g class="layer" data-depth="3"><rect y="705" width="1600" height="195" fill="#0A0B0C"/>
    <g mask="url(#reflectMask)" filter="url(#soft)"><g transform="translate(0 1410) scale(1 -1)"><use href="#silFar" fill="#8A6F58" opacity=".6"/><use href="#silMid" fill="#54432F"/><use href="#silNear" fill="#2A211B"/></g></g>
    <rect x="1100" y="705" width="60" height="195" fill="${C.amber}" opacity=".22" filter="url(#blur6)"/><rect y="706" width="1600" height="60" fill="${C.amber}" opacity=".12" filter="url(#blur6)"/>
    <path d="${water}" stroke="${C.bone}" stroke-opacity=".1" stroke-width="1" fill="none"/>
    <rect y="700" width="1600" height="10" fill="url(#mist)" opacity=".9"/>
  </g>
  <g class="layer" data-depth="7">
    <path d="${cl.fill}" fill="#070809"/><path d="${cl.edge}" stroke="url(#rim)" stroke-width="1.6" fill="none" stroke-opacity=".8"/>
    ${wanderer(cl.plateau[2][0], cl.plateau[2][1] + 3, 1.7)}
    <path d="${rocksL}" fill="#070809"/>
  </g>
  <g class="layer" data-depth="9">
    <g class="mask-wrap" transform="translate(226 500) rotate(-7) scale(.86)">${maskArt({ id: 'hm', seed: 11 })}</g>
    <path d="${rocksL2}" fill="#050607"/>
  </g>
  <rect width="1600" height="900" fill="url(#veilL)"/>
  <rect width="1600" height="900" fill="url(#vig)"/>
  <!-- TRACE WINDOW: cold-blue forensic overlay revealed under the pointer -->
  <g class="trace-window" mask="url(#twMask)">
    <rect width="1600" height="900" fill="${C.veil}" opacity=".16"/>
    <use href="#silFar" class="tw-l"/><use href="#silMid" class="tw-l"/><use href="#silNear" class="tw-l"/>
    <path d="M0 705H1600" class="tw-s"/>
    ${annot}
  </g>
  <circle id="twRing" class="tw-ring" cx="1130" cy="420" r="0"/>
</svg>`;
}

/** Compact scenes for cards */
export function cardScene(kind, id) {
  const defs = `<defs>${defsFor(id)}
    <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07080A"/><stop offset=".6" stop-color="#1B1D1F"/><stop offset="1" stop-color="#4A382B"/></linearGradient>
    <radialGradient id="${id}-hz" cx=".62" cy=".9" r=".9"><stop offset="0" stop-color="${C.amber}" stop-opacity=".55"/><stop offset="1" stop-color="${C.oxide}" stop-opacity="0"/></radialGradient>
    <filter id="${id}-cl" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="4" seed="${id.length * 9}"/><feColorMatrix values="0 0 0 0 .8  0 0 0 0 .76  0 0 0 0 .68  3 0 0 0 -1.25"/></filter>
    <linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#0C0E0F" stop-opacity="0"/><stop offset="1" stop-color="#0C0E0F" stop-opacity=".92"/></linearGradient></defs>`;
  const head = `<svg class="card-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${defs}<rect width="400" height="300" fill="url(#${id}-sky)"/><rect width="400" height="300" fill="url(#${id}-hz)"/>`;
  const foot = `<rect width="400" height="300" fill="url(#${id}-fade)"/></svg>`;
  const sk = (seed, o) => skyline({ seed, x0: -10, x1: 420, lightX: 250, ...o });
  if (kind === 'agents') {
    return head + `<rect width="400" height="220" filter="url(#${id}-cl)" opacity=".35"/>
      <g transform="translate(212 150) scale(.52) rotate(4)">${maskArt({ id: id + 'm', seed: 19 })}</g>` + foot;
  }
  if (kind === 'arena') {
    const a = sk(41, { baseY: 232, minH: 30, maxH: 110, minW: 8, maxW: 22 }), b = sk(42, { baseY: 250, minH: 40, maxH: 140, minW: 12, maxW: 30 });
    const cl = cliff({ seed: 9, x0: 250, x1: 420, peakX: 330, peakY: 218, baseY: 300 });
    return head + `<rect width="400" height="200" filter="url(#${id}-cl)" opacity=".4"/>
      <g transform="translate(200 116) scale(.42) translate(-1130 -330)">${eclipse({ cx: 1130, cy: 330, id, rings: false })}</g>
      <path d="${a.sil}" fill="#3A2F27" opacity=".8"/><path d="${b.sil}" fill="#141312"/><path d="${b.edge}" stroke="${C.amber}" stroke-opacity=".4" fill="none"/>
      <path d="${cl.fill}" fill="#060708"/><path d="${cl.edge}" stroke="${C.amber}" stroke-opacity=".7" fill="none"/>${wanderer(332, 220, .3)}` + foot;
  }
  if (kind === 'lore') {
    const a = sk(61, { baseY: 260, minH: 90, maxH: 240, minW: 16, maxW: 46 }), b = sk(62, { baseY: 290, minH: 130, maxH: 300, minW: 26, maxW: 60, dense: 1.3 });
    return head + `<rect width="400" height="230" filter="url(#${id}-cl)" opacity=".55"/>
      <path d="${a.sil}" fill="#4A3B2F" opacity=".7"/><path d="${b.sil}" fill="#0B0C0D"/><path d="${b.edge}" stroke="${C.amber}" stroke-opacity=".55" fill="none"/>
      <path d="M0 262H400" stroke="${C.bone}" stroke-opacity=".12"/>` + foot;
  }
  // community: dark moon with orbits and three nodes (Muses · Creators · Competitors)
  const nodes = [[318, 92], [96, 130], [246, 228]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="5" fill="${[C.oxide, C.cold, C.bone][i]}"/><circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${[C.oxide, C.cold, C.bone][i]}" stroke-opacity=".6"/>`).join('');
  return head + `<circle cx="200" cy="150" r="82" fill="#070809"/><path d="${arcPath(200, 150, 84, -70, 60)}" fill="none" stroke="${C.oxide}" stroke-width="5"/>
    <ellipse cx="200" cy="150" rx="150" ry="52" transform="rotate(-18 200 150)" fill="none" stroke="${C.bone}" stroke-opacity=".4" stroke-dasharray="2 6"/>
    <ellipse cx="200" cy="150" rx="118" ry="118" fill="none" stroke="${C.bone}" stroke-opacity=".18"/>${nodes}
    <path d="M318 92 246 228M246 228 96 130M96 130 318 92" stroke="${C.bone}" stroke-opacity=".22" stroke-dasharray="3 5" fill="none"/>` + foot;
}

// ---- write partials ----
fs.writeFileSync(path.join(gen, 'hero-art.html'), heroScene());
for (const k of ['agents', 'arena', 'lore', 'community']) fs.writeFileSync(path.join(gen, `card-${k}.html`), cardScene(k, 'c' + k[0] + k[1]));
fs.writeFileSync(path.join(gen, 'mask-art.html'), `<svg class="mask-solo" viewBox="-230 -350 460 700" role="img" aria-label="Split ceramic mask with oxide repair seams" focusable="false">${maskArt({ id: 'ms', seed: 23 })}</svg>`);
console.log('art written:', fs.readdirSync(gen).map(f => f + ' ' + (fs.statSync(path.join(gen, f)).size / 1024).toFixed(0) + 'KB').join(' | '));
