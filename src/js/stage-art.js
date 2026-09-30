/* DYADRYN Combat Stage — art layer (canvas). Inked-manga treatment inside the brand palette:
   graphite / bone / oxide / cold blue. No neon, no glow-as-decoration; halftone, hatching, speed lines and
   impact frames carry the energy. All drawing is vector, DPR-aware and deterministic. */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {};
  var TAU = Math.PI * 2;
  var C = { ink: '#050607', deep: '#0C0E0F', graphite: '#17191A', bone: '#D8D0BE', paper: '#E7DECA', oxide: '#B85C32', amber: '#D78A43', cold: '#607C86', coldHi: '#8FB1BC', rust: '#743923', ash: '#777A78' };
  var E = {
    lin: function (t) { return t; }, out3: function (t) { return 1 - Math.pow(1 - t, 3); }, in3: function (t) { return t * t * t; },
    io3: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }, outBack: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outExp: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }, snap: function (t) { return t < .15 ? t / .15 * .2 : .2 + (t - .15) / .85 * .8; }
  };
  var cl = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var rngf = function (seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

  /* ---------- background: ruined skyline under the broken-ring eclipse, drawn once per size ---------- */
  function paintBackground(W, H) {
    var cv = document.createElement('canvas'); cv.width = Math.ceil(W); cv.height = Math.ceil(H); var g = cv.getContext('2d');
    var sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#060708'); sky.addColorStop(.42, '#14161A'); sky.addColorStop(.66, '#2A2622'); sky.addColorStop(.8, '#5A4331'); sky.addColorStop(1, '#0C0E0F');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    var ex = W * .5, ey = H * .37, er = H * .16;
    var hz = g.createRadialGradient(ex, H * .74, 0, ex, H * .74, W * .7); hz.addColorStop(0, 'rgba(215,138,67,.55)'); hz.addColorStop(.3, 'rgba(184,92,50,.22)'); hz.addColorStop(1, 'rgba(184,92,50,0)'); g.fillStyle = hz; g.fillRect(0, 0, W, H);
    // clouds: seeded value noise, tinted bone, brightest around the eclipse
    var nw = 200, nh = Math.round(200 * H / W * .75) + 20, nc = document.createElement('canvas'); nc.width = nw; nc.height = nh; var ng = nc.getContext('2d'), id = ng.createImageData(nw, nh), r = rngf(7);
    var lat = []; for (var i = 0; i < 24 * 24; i++) lat.push(r());
    var smooth = function (t) { return t * t * (3 - 2 * t); };
    var vn = function (x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi), a = lat[(yi % 24) * 24 + xi % 24], b = lat[(yi % 24) * 24 + (xi + 1) % 24], c = lat[((yi + 1) % 24) * 24 + xi % 24], d = lat[((yi + 1) % 24) * 24 + (xi + 1) % 24]; return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
    for (var y = 0; y < nh; y++) for (var x = 0; x < nw; x++) {
      var v = 0, amp = .55, fx = x / nw * 5, fy = y / nh * 3; for (var o = 0; o < 4; o++) { v += vn(fx + o * 3.1, fy + o * 1.7) * amp; fx *= 2; fy *= 2; amp *= .5; }
      var dx = (x / nw - .5), dy = (y / nh - .34), near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy * 1.6) * 1.5), fade = Math.max(0, 1 - y / nh * 1.25);
      var al = cl((v - .42) * 3.4, 0, 1) * (.18 + .82 * near) * fade, k = (y * nw + x) * 4;
      id.data[k] = 224; id.data[k + 1] = 214; id.data[k + 2] = 194; id.data[k + 3] = Math.round(al * 255 * .85);
    }
    ng.putImageData(id, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(nc, 0, 0, W, H * .75);
    // eclipse
    var halo = g.createRadialGradient(ex, ey, er, ex, ey, er * 2.4); halo.addColorStop(0, 'rgba(231,222,202,.28)'); halo.addColorStop(1, 'rgba(231,222,202,0)'); g.fillStyle = halo; g.beginPath(); g.arc(ex, ey, er * 2.4, 0, TAU); g.fill();
    g.fillStyle = '#050607'; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
    g.lineWidth = Math.max(1.5, H * .002); g.strokeStyle = 'rgba(231,222,202,.9)'; g.beginPath(); g.arc(ex, ey, er + 4, .55, TAU + .1 - .55); g.stroke();
    g.lineCap = 'butt'; g.lineWidth = H * .011; g.strokeStyle = C.rust; g.beginPath(); g.arc(ex, ey, er + 5, -1.3, .9); g.stroke(); g.lineWidth = H * .0065; g.strokeStyle = C.oxide; g.beginPath(); g.arc(ex, ey, er + 5, -1.3, .9); g.stroke(); g.lineWidth = H * .002; g.strokeStyle = C.amber; g.beginPath(); g.arc(ex, ey, er + 5, -.9, .55); g.stroke();
    g.strokeStyle = 'rgba(216,208,190,.35)'; g.lineWidth = 1; for (var t = 0; t < 120; t++) { var a = t / 120 * TAU, l = t % 5 === 0 ? 14 : 7, r0 = er * 1.55; g.beginPath(); g.moveTo(ex + Math.cos(a) * r0, ey + Math.sin(a) * r0); g.lineTo(ex + Math.cos(a) * (r0 + l), ey + Math.sin(a) * (r0 + l)); g.stroke(); }
    // skyline layers
    var fillStyle_reset = function () {};
    function towers(seed, base, minH, maxH, minW, maxW, fill, rim, alpha) {
      var rr = rngf(seed), x = -20; g.fillStyle = fill; g.globalAlpha = alpha;
      while (x < W + 20) {
        var w = minW + rr() * (maxW - minW), h = minH + rr() * (maxH - minH); if (Math.abs(x + w / 2 - ex) < er * 1.1 && h > H * .28) h = H * .2;
        var top = base - h, st = rr(); g.beginPath(); g.moveTo(x, base);
        if (st < .3) { g.lineTo(x, top + 10); g.lineTo(x + w * .4, top + 10); g.lineTo(x + w * .4, top); g.lineTo(x + w, top); }
        else if (st < .6) { g.lineTo(x, top + rr() * h * .2); var n = 3 + Math.floor(rr() * 3); for (var k = 1; k < n; k++) g.lineTo(x + w * k / n, top + rr() * h * .18); g.lineTo(x + w, top + rr() * h * .2); }
        else if (st < .8) { g.lineTo(x, top + h * .18); g.lineTo(x + w, top); }
        else { var cx2 = x + w * (.3 + rr() * .4); g.lineTo(x, top); g.lineTo(cx2 - 2, top); g.lineTo(cx2, top - h * .35); g.lineTo(cx2 + 2, top); g.lineTo(x + w, top); }
        g.lineTo(x + w, base); g.closePath(); g.fillStyle = fill; g.fill();
        if (alpha >= 1 && h > H * .16) { // lit windows and vertical signage: the city still runs, badly
          var wr = rngf((seed * 131 + x) | 0), cols = Math.max(1, Math.floor(w / 9)), rows = Math.floor((h - 14) / 12);
          g.fillStyle = 'rgba(215,138,67,.85)'; for (var cy = 0; cy < rows; cy++) for (var cx = 0; cx < cols; cx++) if (wr() < .075) g.fillRect(x + 4 + cx * 9, top + 12 + cy * 12, 3, 4);
          if (wr() < .45 && w > W * .022) { var sx = x + w * (.15 + wr() * .5), sh = h * (.25 + wr() * .3), sy = top + h * (.1 + wr() * .25); g.fillStyle = wr() < .5 ? 'rgba(184,92,50,.9)' : 'rgba(216,208,190,.85)'; g.fillRect(sx, sy, 5, sh); g.fillStyle = '#050607'; for (var k2 = 0; k2 < sh / 9; k2++) g.fillRect(sx + 1, sy + 3 + k2 * 9, 3 - (k2 % 2), 3); }
          g.fillStyle = fill;
        }
        g.globalAlpha = alpha * .8; g.strokeStyle = rim; g.lineWidth = 1; g.beginPath(); var fx = x + w / 2 < ex ? x + w : x; g.moveTo(fx, base); g.lineTo(fx, top + 8); g.stroke(); g.globalAlpha = alpha;
        x += w + rr() * 6;
      }
      g.globalAlpha = 1;
    }
    towers(21, H * .68, H * .06, H * .22, W * .012, W * .03, '#7A6450', 'rgba(215,138,67,.4)', .55);
    towers(5, H * .72, H * .09, H * .34, W * .016, W * .04, '#2A2420', 'rgba(215,138,67,.5)', 1);
    towers(88, H * .76, H * .12, H * .44, W * .02, W * .05, '#0B0C0D', 'rgba(215,138,67,.55)', 1);
    // mist + floor
    var mist = g.createLinearGradient(0, H * .58, 0, H * .78); mist.addColorStop(0, 'rgba(216,208,190,0)'); mist.addColorStop(.6, 'rgba(216,208,190,.16)'); mist.addColorStop(1, 'rgba(216,208,190,0)'); g.fillStyle = mist; g.fillRect(0, H * .58, W, H * .2);
    var fl = g.createLinearGradient(0, H * .76, 0, H); fl.addColorStop(0, '#0E0F10'); fl.addColorStop(1, '#050607'); g.fillStyle = fl; g.fillRect(0, H * .76, W, H * .24);
    g.strokeStyle = 'rgba(216,208,190,.07)'; g.lineWidth = 1; var rw = rngf(3); for (var q = 0; q < 60; q++) { var yy = H * .77 + Math.pow(rw(), 1.7) * H * .22, xx = rw() * W; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 20 + rw() * 140, yy); g.stroke(); }
    return cv;
  }

  /* arena floor ring (drawn live so heat/victory can act on it) */
  function drawRing(g, W, H, o) {
    var cx = W * .5, cy = H * .87, rx = W * .43, ry = H * .07;
    g.save(); g.translate(cx, cy);
    g.lineWidth = Math.max(1.5, H * .0025); g.strokeStyle = 'rgba(216,208,190,.42)';
    var gap = o.close || 0; // 0 = broken ring, 1 = near-closure (victory)
    var a0 = .35 + gap * .30, a1 = TAU - .35 - gap * .3 + .0;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, a0, a1); g.stroke();
    g.setLineDash([2, 9]); g.strokeStyle = 'rgba(216,208,190,.3)'; g.beginPath(); g.ellipse(0, 0, rx * .82, ry * .82, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    for (var i = 0; i < 72; i++) { var a = i / 72 * TAU, maj = i % 6 === 0; g.beginPath(); g.moveTo(Math.cos(a) * rx, Math.sin(a) * ry); g.lineTo(Math.cos(a) * (rx + (maj ? 14 : 7)), Math.sin(a) * (ry + (maj ? 5 : 2.5))); g.strokeStyle = 'rgba(216,208,190,' + (maj ? .5 : .22) + ')'; g.stroke(); }
    if (o.heat) { g.strokeStyle = 'rgba(184,92,50,' + (.15 + o.heat * .7) + ')'; g.lineWidth = Math.max(2, H * .004); g.beginPath(); g.ellipse(0, 0, rx * 1.0, ry * 1.0, 0, o.heatA0 || 0, (o.heatA0 || 0) + o.heat * 1.4); g.stroke(); }
    g.restore();
  }

  /* ---------- fighter: cloaked combatant with split ceramic mask ---------- */
  var MASK_HALF = new Path2D('M0 -300C74 -300 158 -236 180 -132C198 -46 184 46 154 126C128 196 72 258 0 308Z');
  var CLOAK = new Path2D('M-64 0L-50 -72C-56 -136 -44 -192 -28 -224C-32 -264 -14 -302 6 -308C28 -302 36 -264 32 -228C48 -192 60 -134 54 -68L70 0L48 -10L34 6L14 -8L-6 8L-26 -6L-44 6Z');
  var MANTLE = new Path2D('M-46 -190C-24 -170 24 -170 48 -190L58 -132C30 -114 -30 -114 -56 -132Z');
  function dotPattern(g, r) {
    var c = document.createElement('canvas'); c.width = c.height = 8; var x = c.getContext('2d'); x.fillStyle = '#000'; x.beginPath(); x.arc(2, 2, r, 0, TAU); x.fill(); x.beginPath(); x.arc(6, 6, r, 0, TAU); x.fill(); return g.createPattern(c, 'repeat');
  }
  var _dots = null;
  function drawMask(g, side, o) {
    // local head coords: centre 0,0, height ~64
    var s = .105, light = side === 'a' ? -1 : 1;
    g.save(); g.scale(s, s);
    g.save(); g.translate(-light * 8, -12 * 0); g.scale(-light, 1); g.fillStyle = C.paper; g.fill(MASK_HALF); g.restore();
    g.save(); g.translate(light * 8, 0); g.scale(light, 1); g.fillStyle = '#3D3E3B'; g.fill(MASK_HALF); g.restore();
    g.fillStyle = C.ink; g.fillRect(-light * 132 - 20, -60, 110 * 1, 34); g.fillRect(light * 26 - 4, -44, 108, 30);
    g.strokeStyle = side === 'a' ? C.oxide : C.coldHi; g.lineWidth = 14; g.beginPath(); g.moveTo(0, -304); g.lineTo(0, 312); g.stroke();
    g.strokeStyle = side === 'a' ? C.amber : C.paper; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -304); g.lineTo(0, 312); g.stroke();
    g.strokeStyle = o.eye || (side === 'a' ? C.oxide : C.coldHi); g.lineWidth = 12; g.beginPath(); g.moveTo(light * 40, -30); g.lineTo(light * 116, -24); g.stroke();
    g.restore();
  }
  function fighterPath(g) { g.fill(CLOAK); }
  /* ---- unified look: every combatant (mask art + body) is rendered to one buffer, then inked, rim-lit, bloomed and graded together ---- */
  var BUF = {}, PAINT = null;
  function buf(key, w, h) { var b = BUF[key]; if (!b) b = BUF[key] = document.createElement('canvas'); if (b.width !== w || b.height !== h) { b.width = w; b.height = h; } else b.getContext('2d').clearRect(0, 0, w, h); return b; }
  function paintTex() { if (PAINT) return PAINT; var c = document.createElement('canvas'); c.width = c.height = 160; var x = c.getContext('2d'); var r = rngf(31); for (var i = 0; i < 900; i++) { var v = r() < .5 ? 0 : 255, len = 4 + r() * 22, a = r() * Math.PI; x.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (.05 + r() * .1) + ')'; x.lineWidth = .6 + r() * 1.6; x.beginPath(); var px = r() * 160, py = r() * 160; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke(); } return PAINT = c; }
  var LX0 = 240, LX1 = 240, LY0 = 480, LY1 = 56;
  function drawFighterRig(g, F, time) {
    var P = F.pose, s = F.s, side = F.side, face = F.face, cold = F.cold || 0, CH = DY.CelChars || DY.StageChars, kx = F.kx || 1;
    var m = g.getTransform(), k = Math.hypot(m.a, m.b) || 1, q = cl(s * k, .8, 1.7), W = Math.ceil((LX0 + LX1) * q), H = Math.ceil((LY0 + LY1) * q), rot = P.rot * face;
    // ground shadow (main canvas)
    g.save(); g.translate(F.x + P.dx * s, F.y + P.dy * s); g.save(); g.scale(1, .16); g.fillStyle = 'rgba(0,0,0,.62)'; g.beginPath(); g.arc(0, 0, 84 * s, 0, TAU); g.fill(); g.restore(); g.restore();
    var ch = buf(side + 'c', W, H), c = ch.getContext('2d'); c.imageSmoothingQuality = 'high';
    c.save(); c.translate(LX0 * q, LY0 * q); c.scale(face * q * P.sx * kx, q * P.sy);
    if (P.ghost > 0) { c.save(); c.globalAlpha = P.ghost * .3; c.translate(-30 * P.ghostDir, 0); CH.draw(c, F, time, { flat: side === 'a' ? C.oxide : C.cold, nostance: true }); c.restore(); }
    var drift = cl((F.res ? F.res.drift : 0) / 100, 0, 1), mis = (drift > .6 ? 6 : drift * 5) * (P.glitch ? 2 : 1);
    if (mis > .5) { c.save(); c.translate(mis, -mis * .4); CH.draw(c, F, time, { flat: 'rgba(0,0,0,0)', stroke: side === 'a' ? 'rgba(184,92,50,.75)' : 'rgba(143,177,188,.75)', lw: 2.2, nostance: true }); c.restore(); }
    CH.draw(c, F, time);
    if (P.flash > 0) { c.save(); c.globalAlpha = P.flash; CH.draw(c, F, time, { flat: C.paper, nostance: true }); c.restore(); }
    c.restore();
    // grade + painted texture, clipped to the combatant
    c.save(); c.globalCompositeOperation = 'source-atop'; var gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,196,140,.08)'); gr.addColorStop(.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,30,70,.16)'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 1; c.globalAlpha = .45; c.fillStyle = c.createPattern(paintTex(), 'repeat'); c.fillRect(0, 0, W, H); c.restore();
    // pass 2: ink outline around the whole silhouette (mask + body read as one drawing)
    var ol = buf(side + 'o', W, H), o = ol.getContext('2d'), r = Math.max(1.6, 2.3 * q); for (var i = 0; i < 12; i++) { var an = i / 12 * TAU; o.drawImage(ch, Math.cos(an) * r, Math.sin(an) * r); } o.globalCompositeOperation = 'source-in'; o.fillStyle = '#060607'; o.fillRect(0, 0, W, H);
    // pass 3: rim light (eclipse, upper toward centre) + archetype accent back-light
    var rm = buf(side + 'r', W, H), rc = rm.getContext('2d'), dirx = side === 'a' ? -1 : 1, acc = (CH.ACC && CH.ACC[(F.arch && (CH.ALIAS[F.arch] || F.arch))]) || '#D63A32';
    rc.drawImage(ch, 0, 0); rc.globalCompositeOperation = 'destination-out'; rc.drawImage(ch, dirx * 3.2 * q, 3.4 * q); rc.globalCompositeOperation = 'source-in'; rc.fillStyle = '#F6C58A'; rc.fillRect(0, 0, W, H);
    var bk = buf(side + 'k', W, H), kc = bk.getContext('2d'); kc.drawImage(ch, 0, 0); kc.globalCompositeOperation = 'destination-out'; kc.drawImage(ch, -dirx * 3 * q, -2 * q); kc.globalCompositeOperation = 'source-in'; kc.fillStyle = acc; kc.fillRect(0, 0, W, H);
    // pass 4: bloom of the bright/emissive parts
    var bw = Math.max(8, W >> 2), bh = Math.max(8, H >> 2), bl = buf(side + 'b', bw, bh), bc = bl.getContext('2d'), haveF = 'filter' in bc; if (haveF) { bc.filter = 'brightness(1.25) contrast(1.9) saturate(1.5)'; bc.drawImage(ch, 0, 0, bw, bh); bc.filter = 'none'; }
    // composite to the stage
    g.save(); g.translate(F.x + P.dx * s, F.y + P.dy * s); g.rotate(rot); var sc = s / q, dx = -LX0 * q * sc, dy = -LY0 * q * sc, dw = W * sc, dh = H * sc;
    if (cold > 0 && 'filter' in g) g.filter = 'grayscale(' + cold + ') brightness(' + (1 - cold * .3) + ')';
    g.drawImage(ol, dx, dy, dw, dh); g.drawImage(ch, dx, dy, dw, dh);
    g.globalAlpha = .9; g.drawImage(rm, dx, dy, dw, dh); g.globalAlpha = .75; g.drawImage(bk, dx, dy, dw, dh); g.globalAlpha = 1;
    if (haveF) { g.save(); g.globalCompositeOperation = 'lighter'; g.filter = 'blur(' + (7 * s) + 'px)' + (cold > 0 ? ' grayscale(' + cold + ')' : ''); g.globalAlpha = .55 * (1 - cold); g.drawImage(bl, dx, dy, dw, dh); g.restore(); }
    if ('filter' in g) g.filter = 'none'; g.restore();
    // heat halo + ring around the head (HUD-like, stays crisp)
    var J0 = CH.pose(F, time), heat = cl((F.res ? F.res.heat : 0) / 100, 0, 1), bright = heat >= .7;
    g.save(); g.translate(F.x + P.dx * s, F.y + P.dy * s); g.rotate(rot); g.scale(face * s * P.sx * kx, s * P.sy); g.translate(J0.head[0] + 2, J0.head[1] - 4);     if (heat > .05) { g.lineWidth = bright ? 6 : 4; g.strokeStyle = bright ? C.amber : C.oxide; g.beginPath(); g.arc(0, 0, 64, .5 + P.ring, .5 + P.ring + Math.min(heat, 1) * (TAU - 1)); g.stroke(); }
    if (bright) { g.save(); g.translate(3, -2); g.lineWidth = 1.6; g.strokeStyle = 'rgba(215,138,67,.8)'; g.beginPath(); g.arc(0, 0, 69, .5 + P.ring, TAU - .5 + P.ring); g.stroke(); g.restore(); } g.restore();
  }
  function drawReflection(g, F) { // mirror of last frame's combatant, fading into the floor
    var ch = BUF[F.side + 'c']; if (!ch) return; var P = F.pose, s = F.s, q = cl(s * (g.getTransform().a || 1), .8, 1.7), W = ch.width, H = ch.height, sc = s / q;
    g.save(); g.translate(F.x + P.dx * s, F.y + 6); g.scale(1, -.92); g.globalAlpha = .17 * (1 - (F.cold || 0) * .6); g.drawImage(ch, -LX0 * q * sc, -(LY0 - 0) * q * sc + (P.dy * s) * 0, W * sc, H * sc); g.restore();
  }
  /* F: {side,x,y,s,face,pose,res,cold,name, t} */
  function drawFighter(g, F, time) {
    if (DY.CelChars || DY.StageChars) return drawFighterRig(g, F, time);
    var P = F.pose, s = F.s, side = F.side, face = F.face;
    g.save(); g.translate(F.x + P.dx * s, F.y + P.dy * s); g.scale(face * s * P.sx, s * P.sy); g.rotate(P.rot * face * 1);
    var cold = F.cold || 0, breathe = Math.sin(time / 520 + (side === 'a' ? 0 : 2)) * (1 - cold) * 2;
    // ground shadow
    g.save(); g.scale(1, .16); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(0, 0, 76, 0, TAU); g.fill(); g.restore();
    // afterimages
    if (P.ghost > 0) { g.save(); g.globalAlpha = P.ghost * .28; g.translate(-28 * P.ghostDir, 0); g.fillStyle = side === 'a' ? C.oxide : C.cold; g.fill(CLOAK); g.restore(); }
    // drift misregistration (double outline)
    var drift = cl((F.res ? F.res.drift : 0) / 100, 0, 1), mis = (drift > .6 ? 6 : drift * 5) * (F.pose.glitch ? 2 : 1);
    if (mis > .5) { g.save(); g.translate(mis, -mis * .4); g.strokeStyle = side === 'a' ? 'rgba(184,92,50,.7)' : 'rgba(143,177,188,.7)'; g.lineWidth = 2.2; g.stroke(CLOAK); g.restore(); }
    // body
    g.save(); g.translate(0, breathe * .3);
    g.fillStyle = cold ? '#1A1C1D' : C.ink; g.fill(CLOAK);
    // halftone shading on the lit-away side + hem
    g.save(); g.clip(CLOAK); if (!_dots) _dots = dotPattern(g, 1.4);
    var sh = g.createLinearGradient(-70, 0, 70, 0); sh.addColorStop(0, 'rgba(216,208,190,0)'); sh.addColorStop(.6, 'rgba(216,208,190,.0)'); sh.addColorStop(1, 'rgba(215,138,67,.35)');
    g.fillStyle = sh; g.fillRect(-80, -320, 160, 330);
    g.globalAlpha = .55; g.fillStyle = C.paper; g.fillRect(28, -300, 60, 300); g.globalCompositeOperation = 'destination-out'; g.fillStyle = _dots; g.save(); g.scale(.9, .9); g.fillRect(-90, -340, 200, 380); g.restore(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // fold lines (ink hatching)
    g.strokeStyle = 'rgba(216,208,190,.22)'; g.lineWidth = 1.4; for (var i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-40 + i * 16, -20); g.lineTo(-34 + i * 15, -120 - i * 6); g.stroke(); }
    g.restore();
    g.fillStyle = C.ink; g.fill(MANTLE); g.strokeStyle = 'rgba(216,208,190,.5)'; g.lineWidth = 1.6; g.stroke(MANTLE);
    // repair stitches + cables: technology that was inherited, repaired, audited
    g.strokeStyle = C.oxide; g.lineWidth = 2; for (var st = 0; st < 9; st++) { var sxs = -46 + st * 12; g.beginPath(); g.moveTo(sxs, -178 + Math.sin(st) * 4 + 2); g.lineTo(sxs + 4, -170 + Math.sin(st) * 4); g.stroke(); }
    g.strokeStyle = 'rgba(216,208,190,.55)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-14, -226); g.bezierCurveTo(-30, -204, -40, -190, -38, -150); g.moveTo(24, -226); g.bezierCurveTo(38, -206, 48, -186, 44, -146); g.stroke();
    // sash in team colour
    g.strokeStyle = side === 'a' ? C.oxide : C.cold; g.lineWidth = 7; g.beginPath(); g.moveTo(-50, -100); g.lineTo(54, -82); g.stroke();
    // outline: ink + bone rim
    g.lineJoin = 'miter'; g.lineWidth = 6; g.strokeStyle = C.ink; g.stroke(CLOAK); g.lineWidth = 1.8; g.strokeStyle = cold ? 'rgba(216,208,190,.4)' : C.bone; g.stroke(CLOAK);
    g.restore();
    // halo ring (heat): broken ring around head
    var heat = cl((F.res ? F.res.heat : 0) / 100, 0, 1), bright = heat >= .7;
    g.save(); g.translate(0, -252 + breathe); g.lineWidth = 3; g.strokeStyle = 'rgba(216,208,190,.55)'; g.beginPath(); g.arc(0, 0, 50, .5 + P.ring, TAU - .5 + P.ring); g.stroke();
    if (heat > .05) { g.lineWidth = bright ? 6 : 4; g.strokeStyle = bright ? C.amber : C.oxide; g.beginPath(); g.arc(0, 0, 50, .5 + P.ring, .5 + P.ring + Math.min(heat, 1) * (TAU - 1)); g.stroke(); }
    if (bright) { g.save(); g.translate(3, -2); g.lineWidth = 1.6; g.strokeStyle = 'rgba(215,138,67,.8)'; g.beginPath(); g.arc(0, 0, 55, .5 + P.ring, TAU - .5 + P.ring); g.stroke(); g.restore(); }
    // mask
    g.save(); g.rotate(P.tilt * 1); drawMask(g, side, { eye: P.flash > .5 ? C.paper : null }); g.restore();
    g.restore();
    // scarf
    var sw = Math.sin(time / 260 + (side === 'a' ? 0 : 1.7)) * 8 + P.sway * 26;
    g.save(); g.translate(-8, -214 + breathe); g.fillStyle = side === 'a' ? C.oxide : C.cold; g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-30, -8 + sw * .3, -64 + sw, 6 + sw * .4, -110 + sw * 1.2, -4 + sw * .8); g.bezierCurveTo(-70 + sw, 22 + sw * .3, -34, 20, 6, 12); g.closePath(); g.fill(); g.stroke(); g.restore();
    // flash (ink-frame white-out of the silhouette on impact)
    if (P.flash > 0) { g.save(); g.globalAlpha = P.flash; g.fillStyle = C.paper; g.fill(CLOAK); g.restore(); }
    g.restore();
  }

  /* ---------- FX primitives ---------- */
  function crescent(g, cx, cy, r, a0, a1, w, fill, stroke) {
    g.save(); g.translate(cx, cy); g.beginPath(); g.arc(0, 0, r, a0, a1); g.arc(0, 0, r - w, a1, a0, true); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = 2; g.strokeStyle = stroke; g.stroke(); } g.restore();
  }
  function burst(g, x, y, R, spikes, rot, core, edge, seed) {
    var r = rngf(seed || 5); g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
    for (var i = 0; i < spikes * 2; i++) { var a = i / (spikes * 2) * TAU, rr = i % 2 ? R * (.32 + r() * .1) : R * (.85 + r() * .3); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fillStyle = edge; g.fill(); g.scale(.62, .62); g.rotate(.15); g.beginPath(); for (var j = 0; j < spikes * 2; j++) { var a2 = j / (spikes * 2) * TAU, r2 = j % 2 ? R * .3 : R * .9; g.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2); } g.closePath(); g.fillStyle = core; g.fill(); g.restore();
  }
  function speedLines(g, cx, cy, inner, outer, n, seed, alpha, col, W, H) {
    var r = rngf(seed); g.save(); g.fillStyle = col || C.paper; g.globalAlpha = alpha;
    for (var i = 0; i < n; i++) { var a = r() * TAU, len = outer * (.6 + r() * .6), w = .006 + r() * .012, i0 = inner * (.8 + r() * .5); g.beginPath(); g.moveTo(cx + Math.cos(a - w) * len, cy + Math.sin(a - w) * len); g.lineTo(cx + Math.cos(a) * i0, cy + Math.sin(a) * i0); g.lineTo(cx + Math.cos(a + w) * len, cy + Math.sin(a + w) * len); g.closePath(); g.fill(); }
    g.restore();
  }
  function hLines(g, x0, x1, y, n, seed, alpha, dir, H) { // horizontal action lines
    var r = rngf(seed); g.save(); g.fillStyle = C.paper; g.globalAlpha = alpha;
    for (var i = 0; i < n; i++) { var yy = y + (r() - .5) * H * .5, len = (x1 - x0) * (.2 + r() * .6), xx = dir > 0 ? x0 + r() * (x1 - x0 - len) : x1 - len - r() * (x1 - x0 - len); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + len, yy - 1 - r() * 2); g.lineTo(xx + len, yy + 1 + r() * 2); g.closePath(); g.fill(); }
    g.restore();
  }
  function halftoneOverlay(W, H) {
    var cv = document.createElement('canvas'); cv.width = Math.ceil(W); cv.height = Math.ceil(H); var g = cv.getContext('2d'); var step = Math.max(5, Math.round(H / 130));
    g.fillStyle = '#000'; for (var y = 0; y < H + step; y += step) for (var x = 0; x < W + step; x += step) { var ox = (Math.round(y / step) % 2) * step / 2, dx = (x + ox) / W - .5, dy = y / H - .5, d = Math.sqrt(dx * dx * 1.3 + dy * dy * 1.9), rr = cl((d - .36) * 5, 0, 1) * step * .42; if (rr > .3) { g.beginPath(); g.arc(x + ox, y, rr, 0, TAU); g.fill(); } }
    return cv;
  }

  function grainTile() {
    var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'), id = g.createImageData(256, 256), r = rngf(99);
    for (var i = 0; i < 256 * 256; i++) { var v = r(), k = i * 4, dark = v < .5; id.data[k] = dark ? 0 : 231; id.data[k + 1] = dark ? 0 : 222; id.data[k + 2] = dark ? 0 : 202; id.data[k + 3] = (dark ? (.5 - v) * 110 : (v - .5) * 60) | 0; }
    g.putImageData(id, 0, 0); return c;
  }
  DY.StageArt = { drawReflection: drawReflection, grainTile: grainTile, C: C, E: E, cl: cl, rng: rngf, paintBackground: paintBackground, drawRing: drawRing, drawFighter: drawFighter, drawMask: drawMask, crescent: crescent, burst: burst, speedLines: speedLines, hLines: hLines, halftoneOverlay: halftoneOverlay, TAU: TAU, CLOAK: CLOAK };
})();
