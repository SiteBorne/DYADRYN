/* DYADRYN Duel Table — cel-shading kit: palette, offset-shape cel shader, traced-mask vector models,
   cracks, orbiting armour plates, cloth ribbons, guard lattice, stance auras. */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {}, A = DY.StageArt, TAU = Math.PI * 2, cl = A.cl, INK = '#0A080A';

  /* ---------- colour ---------- */
  function h2r(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function r2h(c) { return '#' + c.map(function (v) { v = Math.round(cl(v, 0, 255)); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, k) { var x = h2r(a), y = h2r(b); return r2h([x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]); }
  function tone(base) { return { base: base, shade: mix(mix(base, '#2A1F46', .42), '#000000', .12), deep: mix(base, '#0E0818', .7), light: mix(base, '#FFE7BE', .34) }; }
  var CER = { base: '#DCD1BB', shade: '#A4988E', deep: '#62587A', light: '#FFF4DC' }, GIL = { base: '#BF9350', shade: '#7C5630', deep: '#4A311E', light: '#F0D08A' }, BLK = { base: '#15121A', shade: '#0C0A10', deep: '#050407', light: '#3D3450' }, PAP = { base: '#E9DDBE', shade: '#B9AA86', deep: '#7F7358', light: '#FFF6DC' };
  var ST = {
    'Trace-Hunter': { acc: '#E0453A', cloth: tone('#5A2024'), cloth2: tone('#9A3630'), kj: '追跡' },
    Broker: { acc: '#D2A25E', cloth: tone('#5A3520'), cloth2: tone('#9A6A34'), kj: '仲介' },
    Stillpoint: { acc: '#6FA3FF', cloth: tone('#27405F'), cloth2: tone('#4A74A8'), kj: '静止' },
    Archive: { acc: '#E0453A', cloth: tone('#D6C8A4'), cloth2: tone('#A89A76'), kj: '記録' },
    Swarm: { acc: '#D63A32', cloth: tone('#5E1E20'), cloth2: tone('#9C3430'), kj: '群集' },
    Veil: { acc: '#A97BE0', cloth: tone('#3E3166'), cloth2: tone('#6A56AA'), kj: '幻影' }
  };
  var ALIAS = { Operator: 'Veil', Steady: 'Stillpoint', Pressure: 'Broker' };
  var EYES = { 'Trace-Hunter': [[.31, .5], [.66, .5]], Broker: [[.33, .46], [.67, .46]], Stillpoint: [[.31, .46], [.69, .46]], Archive: [[.36, .55], [.63, .55]], Swarm: [[.36, .51], [.63, .51]], Veil: [[.42, .45], [.58, .45]] };
  var EYEY = { 'Trace-Hunter': 590, Broker: 630, Stillpoint: 590, Archive: 645, Swarm: 600, Veil: 600 };
  function sty(arch) { return ST[ALIAS[arch] || arch] || ST.Veil; }
  function arc(arch) { return ALIAS[arch] || arch || 'Veil'; }

  /* ---------- paths ---------- */
  function cap(ax, ay, bx, by, w0, w1) { var p = new Path2D(), dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, a = Math.atan2(ny, nx); p.moveTo(ax + nx * w0, ay + ny * w0); p.lineTo(bx + nx * w1, by + ny * w1); p.arc(bx, by, w1, a, a + Math.PI, true); p.lineTo(ax - nx * w0, ay - ny * w0); p.arc(ax, ay, w0, a + Math.PI, a + Math.PI * 2, true); p.closePath(); return p; }
  function blob(pts) { var p = new Path2D(), n = pts.length, m = function (a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }, s = m(pts[n - 1], pts[0]); p.moveTo(s[0], s[1]); for (var i = 0; i < n; i++) { var q = pts[i], e = m(pts[i], pts[(i + 1) % n]); p.quadraticCurveTo(q[0], q[1], e[0], e[1]); } p.closePath(); return p; }
  function poly(pts) { var p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; }
  function circ(x, y, r) { var p = new Path2D(); p.arc(x, y, r, 0, TAU); return p; }
  function ellp(x, y, rx, ry, rot) { var p = new Path2D(); p.ellipse(x, y, rx, ry, rot || 0, 0, TAU); return p; }
  function cutPath(path, dx, dy) { var p = new Path2D(); p.rect(-2400, -2400, 4800, 4800); p.addPath(path, new DOMMatrix([1, 0, 0, 1, dx, dy])); return p; }
  var LT = [.5, -.86], dots = null;
  function tonePat(g) { if (dots) return dots; var c = document.createElement('canvas'); c.width = c.height = 6; var x = c.getContext('2d'); x.fillStyle = 'rgba(8,4,14,.5)'; x.beginPath(); x.arc(1.5, 1.5, 1.05, 0, TAU); x.arc(4.5, 4.5, 1.05, 0, TAU); x.fill(); return dots = g.createPattern(c, 'repeat'); }

  /* the cel shader: base, cool-shifted shade via an offset copy of the shape, thin core shadow, highlight crescent, screentone, ink */
  function cel(g, o, path, T, w, lw, flags) {
    o = o || {}; if (o.flat) { g.fillStyle = o.flat; g.fill(path); return; }
    flags = flags || 0; var k = cl((w || 14) * .36, 2.6, 14), lx = LT[0], ly = LT[1];
    g.fillStyle = T.base; g.fill(path);
    g.save(); g.clip(path); g.clip(cutPath(path, lx * k, ly * k), 'evenodd'); g.fillStyle = T.shade; g.fillRect(-2400, -2400, 4800, 4800); if (!(flags & 1)) { g.fillStyle = tonePat(g); g.fillRect(-2400, -2400, 4800, 4800); } g.restore();
    g.save(); g.clip(path); g.clip(cutPath(path, lx * k * .42, ly * k * .42), 'evenodd'); g.fillStyle = T.deep; g.fillRect(-2400, -2400, 4800, 4800); g.restore();
    if (!(flags & 2)) { g.save(); g.clip(path); g.clip(cutPath(path, -lx * k * .38, -ly * k * .38), 'evenodd'); g.fillStyle = T.light; g.fillRect(-2400, -2400, 4800, 4800); g.restore(); }
    g.lineJoin = 'round'; g.lineWidth = lw || 2.4; g.strokeStyle = INK; g.stroke(path);
  }
  function glint(g, x, y, r, col) { g.save(); g.translate(x, y); g.fillStyle = col || '#FFF8E8'; g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * .12, -r * .12, r, 0); g.quadraticCurveTo(r * .12, r * .12, 0, r); g.quadraticCurveTo(-r * .12, r * .12, -r, 0); g.quadraticCurveTo(-r * .12, -r * .12, 0, -r); g.fill(); g.restore(); }

  /* ---------- traced mask models (scripts/trace-masks.mjs) ---------- */
  var MODEL = {};
  function maskModel(arch) {
    var slug = arc(arch).toLowerCase(), e = MODEL[slug]; if (e) return e.ready ? e : null; e = MODEL[slug] = { ready: false };
    fetch('assets/art/mask-' + slug + '.json').then(function (r) { return r.json(); }).then(function (m) {
      e.w = m.w; e.h = m.h; e.layers = m.layers.map(function (L) {
        var subs = L.d.split('Z').filter(Boolean).map(function (dd) { dd += 'Z'; var nums = dd.match(/-?\d+(\.\d+)?/g) || [], cy = 0, n = 0; for (var i = 1; i < nums.length; i += 2) { cy += +nums[i]; n++; } return { p: new Path2D(dd), cy: n ? cy / n / m.h : 0 }; });
        return { c: L.l > .45 ? mix(L.c, '#FFF6E4', .14) : L.l > .2 ? mix(L.c, '#FFE6C8', .06) : L.c, a: L.a, l: L.l, s: L.s, subs: subs, glow: L.s > .55 && L.l > .3 && L.l < .8 };
      }); e.ready = true;
    }).catch(function () { e.fail = true; });
    return null;
  }
  /* exact supplied artwork: the card ground is keyed out (alpha from brightness), nothing else is altered */
  var SPR = {};
  function sprite(a) {
    var slug = a.toLowerCase(), e = SPR[slug]; if (e) return e.cv; e = SPR[slug] = { cv: null }; var im = new Image(); im.decoding = 'async';
    im.onload = function () {
      var W = Math.min(im.width, 830), H = Math.round(W * im.height / im.width), c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, W, H);
      var d = x.getImageData(0, 0, W, H), p = d.data; for (var y = 0; y < H; y++) for (var xx = 0; xx < W; xx++) { var i = (y * W + xx) * 4, mx = Math.max(p[i], p[i + 1], p[i + 2]), nx = (xx / W - .5) / .5, ny = (y / H - .5) / .5, rr = Math.sqrt(nx * nx + ny * ny * .9), al = cl((mx - 9) / 34, 0, 1); al = Math.max(al, cl((1 - rr) / .1, 0, 1) * .0); p[i + 3] = al * cl((1 - rr) / .12, 0, 1) * cl((.86 - y / H) / .08, 0, 1) * 255; }
      x.putImageData(d, 0, 0); e.cv = c;
    };
    im.src = 'assets/art/face-' + slug + '.webp'; return null;
  }
  function maskDraw(g, o, arch, t, HW, sway, heat) {
    o = o || {}; var S = sty(arch), a = arc(arch), eyeY = (EYEY[a] || 600) / 1140;
    if (o.flat) { var m = maskModel(a); if (!m) { g.fillStyle = o.flat; g.beginPath(); g.ellipse(0, 0, HW * .3, HW * .42, 0, 0, TAU); g.fill(); return; } var k0 = HW / m.w; g.save(); g.scale(k0, k0); g.translate(-m.w / 2, -eyeY * m.h); g.fillStyle = o.flat; g.strokeStyle = o.flat; g.lineWidth = 2; for (var fl = 0; fl < m.layers.length; fl++) for (var fs = 0; fs < m.layers[fl].subs.length; fs++) { g.fill(m.layers[fl].subs[fs].p, 'evenodd'); g.stroke(m.layers[fl].subs[fs].p); } g.restore(); return; }
    var cv = sprite(a); if (!cv) { cel(g, o, ellp(0, 0, HW * .26, HW * .36), CER, 40, 2.6); return; }
    var k = HW / cv.width, H = cv.height, top = -eyeY * H * k, cut = H * .55, sl = 24;
    g.drawImage(cv, 0, 0, cv.width, cut, -HW / 2, top, HW, cut * k);
    for (var i = 0; i < sl; i++) { var y0 = cut + (H - cut) * i / sl, h = (H - cut) / sl, f = (i + 1) / sl, off = sway * f * f * .8 + Math.sin(t / 500 + i * .35) * 1.4 * f; g.drawImage(cv, 0, y0, cv.width, h + .8, -HW / 2 + off, top + y0 * k, HW, h * k + .8); }
    var pul = .5 + Math.sin(t / 380) * .15 + (heat || 0) * .5; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = pul * .55;
    (EYES[a] || []).forEach(function (e) { var ex = (e[0] - .5) * HW, ey = top + e[1] * H * k, gr = g.createRadialGradient(ex, ey, 0, ex, ey, HW * .09); gr.addColorStop(0, S.acc + 'CC'); gr.addColorStop(1, S.acc + '00'); g.fillStyle = gr; g.beginPath(); g.arc(ex, ey, HW * .09, 0, TAU); g.fill(); }); g.restore();
  }

  /* ---------- damage cracks ---------- */
  function makeCracks(seed) {
    var r = A.rng(seed), out = [];
    for (var i = 0; i < 9; i++) { var x = (r() - .5) * .5, y = (r() - .55) * .7, pts = [[x, y]], a = r() * TAU; for (var j = 0; j < 6; j++) { a += (r() - .5) * 1.1; x += Math.cos(a) * (.05 + r() * .06); y += Math.sin(a) * (.05 + r() * .06); pts.push([x, y]); } out.push({ pts: pts, at: 100 - (i + 1) * 10 - r() * 4 }); }
    return out;
  }
  function drawCracks(g, cracks, vit, acc, HW, flash) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    cracks.forEach(function (c) { if (vit > c.at) return; var amt = cl((c.at - vit) / 10, 0, 1), n = Math.max(2, Math.ceil(c.pts.length * amt)); g.beginPath(); for (var i = 0; i < n; i++) { var p = c.pts[i]; i ? g.lineTo(p[0] * HW, p[1] * HW * 1.3) : g.moveTo(p[0] * HW, p[1] * HW * 1.3); } g.strokeStyle = INK; g.lineWidth = 4.2; g.stroke(); g.strokeStyle = acc; g.lineWidth = 1.6 + flash * 1.5; g.stroke(); });
    g.restore();
  }

  /* ---------- secondary motion ---------- */
  function sim(Z, t, vx) {
    var S = Z._sec || (Z._sec = { t: t, pv: 0, hs: 0, hv: 0, st: [] }); var dt = cl(t - S.t, 0, 60) / 16.7 || 1; S.t = t; var ac = vx - S.pv; S.pv = vx;
    var tgt = -ac * .7 - vx * .4; S.hv = (S.hv + (tgt - S.hs) * .09 * dt) * Math.pow(.86, dt); S.hs = cl(S.hs + S.hv * dt, -30, 30);
    for (var i = 0; i < 10; i++) { var e = S.st[i] || (S.st[i] = { x: 0, vx: 0, y: 0, vy: 0 }), wind = Math.sin(t / 620 + i * 1.3) * 3.2; var tx = tgt * (.4 + (i % 4) * .2) + wind, ty = -Math.abs(ac) * .3; e.vx = (e.vx + (tx - e.x) * .07 * dt) * Math.pow(.88, dt); e.x += e.vx * dt; e.vy = (e.vy + (ty - e.y) * .07 * dt) * Math.pow(.88, dt); e.y += e.vy * dt; }
    return S;
  }

  /* ---------- cloth ribbons trailing behind the mask ---------- */
  function ribbons(g, o, S, t, R, sec) {
    for (var r = 0; r < 3; r++) {
      var e = sec.st[r * 3], len = R * (1.0 + r * .18), bx = -R * .18, by = R * (.38 + r * .1), pts = [], n = 5;
      for (var i = 0; i <= n; i++) { var f = i / n; pts.push([bx - f * len * 1.05 + e.x * f * 1.4, by + f * R * .55 + Math.sin(t / 420 + r * 1.7 + f * 4) * 7 * f + e.y * f]); }
      var up = [], dn = []; for (var k = 0; k < pts.length; k++) { var w = (1 - k / n) * (R * .13) + 3; up.push([pts[k][0], pts[k][1] - w]); dn.push([pts[k][0], pts[k][1] + w]); }
      cel(g, o, blob(up.concat(dn.reverse())), r % 2 ? ST.Veil.cloth2 : tone(S.cloth.base), R * .2, 2.2, 1);
    }
  }

  /* ---------- orbiting armour plates (shape per archetype) ---------- */
  function plate(g, o, arch, S, i, sz) {
    var a = arc(arch);
    if (a === 'Trace-Hunter') { cel(g, o, poly([[0, -sz * 1.15], [sz * .26, 0], [0, sz * 1.15], [-sz * .26, 0]]), CER, sz * .5, 2.2); if (!o.flat) { g.strokeStyle = S.acc; g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, -sz * .8); g.lineTo(0, sz * .8); g.stroke(); } }
    else if (a === 'Broker') { if (i % 2) cel(g, o, circ(0, 0, sz * .52), GIL, sz * .5, 2.2, 2); else { var p = new Path2D(); p.moveTo(-sz * .7, -sz * .3); p.quadraticCurveTo(0, sz * 1.0, sz * .7, -sz * .3); p.quadraticCurveTo(0, sz * .3, -sz * .7, -sz * .3); cel(g, o, p, GIL, sz * .4, 2.2, 1); } if (i % 2 && !o.flat) { g.fillStyle = INK; g.fillRect(-sz * .13, -sz * .13, sz * .26, sz * .26); } }
    else if (a === 'Stillpoint') { cel(g, o, poly([[-sz * .34, -sz * .95], [sz * .34, -sz * .95], [sz * .44, -sz * .55], [sz * .44, sz * .7], [0, sz * 1.0], [-sz * .44, sz * .7], [-sz * .44, -sz * .55]]), CER, sz * .7, 2.4); if (!o.flat) { g.strokeStyle = S.acc; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -sz * .7); g.lineTo(0, sz * .7); g.stroke(); } }
    else if (a === 'Archive') { cel(g, o, poly([[-sz * .3, -sz * 1.0], [sz * .3, -sz * 1.0], [sz * .3, sz * .9], [0, sz * 1.05], [-sz * .3, sz * .9]]), PAP, sz * .5, 2, 1); if (!o.flat) { g.fillStyle = '#7A2A22'; for (var m = 0; m < 4; m++) g.fillRect(-sz * .09, -sz * .7 + m * sz * .38, sz * .18, sz * .16); } }
    else if (a === 'Swarm') { cel(g, o, ellp(0, 0, sz * .7, sz * .42), { base: '#2A2226', shade: '#15101A', deep: '#08060A', light: '#5A4C58' }, sz * .5, 2.2); if (!o.flat) { g.fillStyle = S.acc; g.beginPath(); g.arc(0, 0, sz * .15, 0, TAU); g.fill(); g.strokeStyle = GIL.base; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-sz * .9, -sz * .42); g.lineTo(sz * .9, -sz * .42); g.stroke(); } }
    else { var q = new Path2D(); q.moveTo(-sz * .6, -sz * .7); q.quadraticCurveTo(sz * .8, -sz * .1, -sz * .6, sz * .7); q.quadraticCurveTo(sz * .2, -sz * .1, -sz * .6, -sz * .7); cel(g, o, q, CER, sz * .4, 2.2, 1); }
  }
  function plates(g, o, arch, S, t, R, Z, front) {
    var n = 6, dir = 1, W = { guard: Z.guard || 0, strike: Z.armF || 0, open: Z.open || 0, raise: Z.raise || 0, crouch: Z.crouch || 0, up: Z.up || 0 }, list = [];
    for (var i = 0; i < n; i++) {
      var a = t / 2100 * dir + i * TAU / n, ox = Math.cos(a) * R * .98, oy = Math.sin(a) * R * .42 + R * .04, z = Math.sin(a), rot = a + Math.PI / 2, sc = 1;
      var tg = [
        ['guard', R * .82, (i - (n - 1) / 2) * R * .27, 0, 1.08], ['strike', -R * (.7 + i * .2), (i % 2 ? 1 : -1) * R * .1, -Math.PI / 2, .95], ['open', Math.cos(t / 500 + i * TAU / n) * R * 1.3, Math.sin(t / 500 + i * TAU / n) * R * 1.18, t / 500 + i * TAU / n + Math.PI / 2, 1.1],
        ['raise', R * (.55 + (i % 3) * .18), (i - (n - 1) / 2) * R * .22, Math.PI / 2 * .0, 1], ['crouch', Math.cos(a) * R * .56, Math.sin(a) * R * .3, rot, .8], ['up', Math.sin((i - (n - 1) / 2) * .34) * R * 1.3, -Math.cos((i - (n - 1) / 2) * .34) * R * 1.2, (i - (n - 1) / 2) * .34, 1.05]
      ], x = ox, y = oy, r = rot, s2 = 1, zz = z;
      tg.forEach(function (q) { var w = W[q[0]]; if (w > .001) { x += (q[1] - ox) * w; y += (q[2] - oy) * w; r += (q[3] - rot) * w; s2 += (q[4] - 1) * w; zz = zz * (1 - w) + (q[0] === 'guard' || q[0] === 'raise' ? .8 : 0) * w; } });
      list.push({ x: x, y: y, r: r, s: s2, z: zz, i: i });
    }
    list.forEach(function (p) { if ((front && p.z < 0) || (!front && p.z >= 0)) return; g.save(); g.translate(p.x, p.y); g.rotate(p.r); var sc = (.8 + .22 * p.z) * p.s; g.scale(sc, sc); plate(g, o, arch, S, p.i, R * .21); g.restore(); });
  }

  /* ---------- guard lattice ---------- */
  function dome(g, cx, cy, R, acc, amt, t) {
    if (amt < .02) return; g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter';
    for (var ring = 0; ring < 5; ring++) for (var k = -4; k <= 4; k++) { var ang = k * .21, rr = R * (.55 + ring * .13), x = Math.cos(ang) * rr * .9 + R * .1, y = Math.sin(ang) * rr + (ring % 2 ? R * .05 : 0); var vis = Math.sin(t / 380 + ring * .8 + k * .6) * .18 + .55; g.save(); g.translate(x, y); g.beginPath(); for (var h = 0; h < 6; h++) { var ha = h / 6 * TAU + Math.PI / 6; g.lineTo(Math.cos(ha) * R * .095, Math.sin(ha) * R * .095); } g.closePath(); g.fillStyle = acc + '33'; g.globalAlpha = amt * vis; g.fill(); g.strokeStyle = acc; g.lineWidth = 1.4; g.stroke(); g.restore(); }
    g.restore();
  }

  /* ---------- stance auras (Adapt): silhouette + colour + motion change ---------- */
  var STC = { Predator: '#E0453A', Sentinel: '#6FA3FF', Hunter: '#E0A03A', Veil: '#A97BE0', Flux: '#4FD1C5', Wild: '#6FBF6A' };
  function stance(g, st, k, R, t, front) {
    if (!st) return; var c = STC[st] || '#fff'; g.save(); g.globalAlpha = k;
    if (!front) {
      g.globalCompositeOperation = 'lighter';
      if (st === 'Predator') { for (var i = 0; i < 9; i++) { var a = -Math.PI * 1.0 + i * .34 + Math.sin(t / 380 + i) * .04, len = R * (.55 + (i % 3) * .22) + Math.sin(t / 240 + i * 2) * 8; g.fillStyle = c; g.globalAlpha = .55 * k; g.beginPath(); g.moveTo(Math.cos(a - .1) * R * .7, Math.sin(a - .1) * R * .7); g.lineTo(Math.cos(a) * (R * .7 + len), Math.sin(a) * (R * .7 + len)); g.lineTo(Math.cos(a + .1) * R * .7, Math.sin(a + .1) * R * .7); g.closePath(); g.fill(); } }
      else if (st === 'Sentinel') { for (var j = 0; j < 4; j++) { var ang = t / 800 + j * TAU / 4; g.save(); g.translate(Math.cos(ang) * R * 1.12, Math.sin(ang) * R * .9); g.rotate(ang); g.strokeStyle = c; g.fillStyle = 'rgba(111,163,255,.22)'; g.lineWidth = 2.4; g.beginPath(); for (var h = 0; h < 6; h++) { var ha = h / 6 * TAU; g.lineTo(Math.cos(ha) * R * .18, Math.sin(ha) * R * .18); } g.closePath(); g.fill(); g.stroke(); g.restore(); } g.strokeStyle = c; g.globalAlpha = .4 * k; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R * 1.25, -1.1, 1.1); g.stroke(); }
      else if (st === 'Hunter') { g.save(); g.rotate(t / 1400); g.strokeStyle = c; g.lineWidth = 2.6; g.globalAlpha = .8 * k; g.beginPath(); g.arc(0, 0, R * 1.05, 0, TAU); g.stroke(); for (var q = 0; q < 4; q++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(R * .92, 0); g.lineTo(R * 1.25, 0); g.stroke(); } g.restore(); }
      else if (st === 'Veil') { for (var r = 0; r < 4; r++) { var fl = Math.sin(t / 420 + r * 1.3) * R * .1; g.fillStyle = 'rgba(169,123,224,' + (.26 - r * .045) * k + ')'; g.beginPath(); g.moveTo(-R * .2, -R * .4); g.bezierCurveTo(-R * (.9 + r * .12) + fl, -R * .1, -R * (1.2 + r * .1) - fl, R * .8, -R * (.8 + r * .1) + fl * .6, R * 1.1); g.lineTo(-R * .1, R * .7); g.closePath(); g.fill(); } }
      else if (st === 'Flux') { for (var m = 0; m < 10; m++) { var an = t / 600 + m * .63; g.save(); g.translate(Math.cos(an) * R * (1 + m * .02), Math.sin(an * 1.3) * R * .95); g.rotate(an * 2); g.fillStyle = m % 2 ? 'rgba(79,209,197,.55)' : 'rgba(255,120,200,.45)'; g.beginPath(); g.moveTo(0, -R * .1); g.lineTo(R * .08, R * .08); g.lineTo(-R * .08, R * .08); g.closePath(); g.fill(); g.restore(); } }
      else if (st === 'Wild') { g.lineCap = 'round'; for (var v = 0; v < 6; v++) { var side = v % 2 ? 1 : -1, ph = t / 500 + v, tx = side * R * (.9 + Math.sin(ph) * .08), ty = -R * (.2 + v * .13); g.strokeStyle = 'rgba(111,191,106,' + (.7 * k) + ')'; g.lineWidth = 4.4 - v * .45; g.beginPath(); g.moveTo(side * R * .3, R * .8); g.bezierCurveTo(side * R * 1.1, R * .4, tx - side * R * .3, ty + R * .4, tx, ty); g.stroke(); g.fillStyle = 'rgba(111,191,106,.6)'; for (var l = 1; l < 4; l++) { var tt = l / 4; g.beginPath(); g.ellipse(side * R * .3 + (tx - side * R * .3) * tt + side * Math.sin(tt * 3) * R * .2, R * .8 + (ty - R * .8) * tt, R * .08, R * .035, side * .8 + tt, 0, TAU); g.fill(); } } }
    } else if (st === 'Predator') { g.globalCompositeOperation = 'lighter'; g.strokeStyle = c; g.globalAlpha = .6; g.lineWidth = 2; for (var z = 0; z < 5; z++) { var x = (z - 2) * R * .22, h2 = R * (.3 + Math.sin(t / 120 + z) * .1); g.beginPath(); g.moveTo(x, R * .8); g.lineTo(x + 5, R * .8 - h2); g.stroke(); } }
    g.restore();
  }

  DY.DuelKit = { cel: cel, cap: cap, blob: blob, poly: poly, circ: circ, ellp: ellp, glint: glint, tone: tone, mix: mix, CER: CER, GIL: GIL, BLK: BLK, PAP: PAP, ST: ST, STC: STC, sty: sty, arc: arc, ALIAS: ALIAS, INK: INK, maskModel: maskModel, maskDraw: maskDraw, makeCracks: makeCracks, drawCracks: drawCracks, sim: sim, ribbons: ribbons, plates: plates, dome: dome, stance: stance };
})();
