/* DYADRYN Duel Table — canvas renderer: backdrop, slanted cel seats with mask actors, clash ring, effects, impact frames. */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {}, A = DY.StageArt, K = DY.DuelKit, C = A.C, cl = A.cl, TAU = A.TAU;
  var BUF = {};
  function buf(key, w, h) { var b = BUF[key]; if (!b) b = BUF[key] = document.createElement('canvas'); if (b.width !== w || b.height !== h) { b.width = w; b.height = h; } else b.getContext('2d').clearRect(0, 0, w, h); return b; }
  var HALF = null;
  function halftone(g) { if (HALF) return HALF; var c = document.createElement('canvas'); c.width = c.height = 8; var x = c.getContext('2d'); x.fillStyle = 'rgba(255,240,220,.16)'; x.beginPath(); x.arc(2, 2, 1.2, 0, TAU); x.arc(6, 6, 1.2, 0, TAU); x.fill(); return HALF = g.createPattern(c, 'repeat'); }

  /* ---------- mask actor, drawn into its own buffer so ink / flash / cold apply to the whole creature ---------- */
  function actor(d, side, ts) {
    var F = d.F[side], P = F.pose, S = K.sty(F.arch), HW = d.actorHW(side), dir = side === 'a' ? 1 : -1, q = d.dpr, bw = Math.ceil(HW * 2.9 * q), bh = Math.ceil(HW * 2.7 * q);
    var cv = buf('act' + side, bw, bh), b = cv.getContext('2d'), t = ts, hot = F.res ? F.res.heat / 100 : 0, vit = F.res ? F.res.vitality : 100, sec = K.sim(F, t, (P.dx || 0) * .02 * dir);
    var lean = P.armF * .14 + P.lean * .1 - P.hurt * .22 + P.ready * .05 - P.crouch * .1 + P.tilt * .5 + (P.up ? -.04 * P.up : 0), sc = (1 + P.armF * .06 + P.up * .1 - P.crouch * .06) , bob = Math.sin(t / 700 + (side === 'a' ? 0 : 2)) * HW * .012;
    var shape = { flat: null };
    b.save(); b.scale(q, q); b.translate(HW * 1.45, HW * 1.35); if (dir < 0) b.scale(-1, 1);
    // behind: stance aura, back plates, ribbons
    K.stance(b, F.stance, F.stanceK == null ? 1 : F.stanceK, HW * .6, t, false);
    if (P.up > .05) { b.save(); b.globalCompositeOperation = 'lighter'; b.globalAlpha = .5 * P.up; var gr = b.createRadialGradient(0, 0, HW * .1, 0, 0, HW * .9); gr.addColorStop(0, S.acc + 'AA'); gr.addColorStop(1, S.acc + '00'); b.fillStyle = gr; b.beginPath(); b.arc(0, 0, HW * .9, 0, TAU); b.fill(); b.restore(); }
    K.plates(b, shape, F.arch, S, t, HW * .64, P, false);
    b.save(); b.translate(0, HW * .02); K.ribbons(b, shape, S, t, HW * .5, sec); b.restore();
    // the creature: traced mask, leaning and breathing
    b.save(); b.translate(0, bob + P.crouch * HW * .06); b.rotate(lean); b.scale(sc * P.sx, sc * P.sy);
    if (P.ghost > 0) { for (var gi = 1; gi <= 3; gi++) { b.save(); b.globalAlpha = P.ghost * .18 / gi; b.translate(-gi * HW * .13, gi * 2); K.maskDraw(b, { flat: S.acc }, F.arch, t, HW, 0, 0); b.restore(); } }
    if (P.split > .02) { var sp = P.split; [-1, 1].forEach(function (h) { b.save(); b.beginPath(); b.rect(h < 0 ? -HW : 0, -HW * 1.4, HW, HW * 2.8); b.clip(); b.translate(h * sp * HW * .16, sp * HW * .34 * (h > 0 ? 1.15 : 1)); b.rotate(h * sp * .4); b.globalAlpha = 1 - sp * .3; K.maskDraw(b, shape, F.arch, t, HW, sec.hs, hot); b.restore(); }); }
    else K.maskDraw(b, shape, F.arch, t, HW, sec.hs, hot);
    if (P.split < .3) K.drawCracks(b, F.cracks, vit, S.acc, HW, P.flash);
    b.restore();
    // in front: plates, guard lattice, scan reticle, counter brackets, adapt ring, stance sparks
    K.plates(b, shape, F.arch, S, t, HW * .64, P, true);
    if (P.guard > .02) K.dome(b, HW * .2, 0, HW * .7, S.acc, P.guard, t);
    if (P.raise > .02) { b.save(); b.globalCompositeOperation = 'lighter'; b.globalAlpha = P.raise; b.strokeStyle = '#6FA3FF'; b.lineWidth = 2.4; b.rotate(t / 900); b.beginPath(); b.arc(0, 0, HW * .66, 0, TAU); b.stroke(); for (var r = 0; r < 4; r++) { b.rotate(Math.PI / 2); b.beginPath(); b.moveTo(HW * .58, 0); b.lineTo(HW * .8, 0); b.stroke(); } b.restore(); b.save(); b.globalAlpha = .55 * P.raise; b.globalCompositeOperation = 'lighter'; b.strokeStyle = '#9CC4FF'; b.lineWidth = 2; var sy = Math.sin(t / 260) * HW * .5; b.beginPath(); b.moveTo(-HW * .55, sy); b.lineTo(HW * .55, sy); b.stroke(); b.restore(); }
    if (P.open > .02) { b.save(); b.globalCompositeOperation = 'lighter'; b.globalAlpha = P.open * .8; b.strokeStyle = (K.STC[F.stance] || '#4FD1C5'); b.lineWidth = 2.2; b.rotate(t / 500); for (var o = 0; o < 6; o++) { b.rotate(TAU / 6); b.beginPath(); for (var h = 0; h < 6; h++) { var ha = h / 6 * TAU; b.lineTo(HW * .8 + Math.cos(ha) * HW * .07, Math.sin(ha) * HW * .07); } b.closePath(); b.stroke(); } b.restore(); }
    if (P.ready > .6) { b.save(); b.strokeStyle = '#E0A03A'; b.lineWidth = 3.2; b.globalAlpha = Math.min(1, (P.ready - .6) * 3) * (.75 + Math.sin(t / 120) * .25); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { b.beginPath(); b.moveTo(c[0] * HW * .62, c[1] * HW * .86 - c[1] * 26); b.lineTo(c[0] * HW * .62, c[1] * HW * .86); b.lineTo(c[0] * HW * .62 - c[0] * 26, c[1] * HW * .86); b.stroke(); }); b.restore(); }
    K.stance(b, F.stance, F.stanceK == null ? 1 : F.stanceK, HW * .6, t, true);
    b.restore();
    if (P.flash > 0) { b.save(); b.globalCompositeOperation = 'source-atop'; b.fillStyle = 'rgba(255,244,220,' + cl(P.flash, 0, 1) * .85 + ')'; b.fillRect(0, 0, bw, bh); b.restore(); }
    return { cv: cv, bw: bw, bh: bh, q: q };
  }
  function inked(d, side, a) { // whole-creature ink outline
    var ol = buf('ol' + side, a.bw, a.bh), o = ol.getContext('2d'), r = Math.max(2, 3.2 * a.q); for (var i = 0; i < 14; i++) { var an = i / 14 * TAU; o.drawImage(a.cv, Math.cos(an) * r, Math.sin(an) * r); } o.globalCompositeOperation = 'source-in'; o.fillStyle = '#060607'; o.fillRect(0, 0, a.bw, a.bh); return ol;
  }

  /* ---------- seat: slanted cel panel with a hard offset shadow ---------- */
  function seat(d, g, side, ts) {
    var F = d.F[side], R = d.R[side], P = F.pose, S = K.sty(F.arch), dir = side === 'a' ? 1 : -1, sk = R.h * .11, hot = F.res ? F.res.heat / 100 : 0;
    var pts = [[R.x, R.y + R.h], [R.x + sk, R.y], [R.x + R.w, R.y], [R.x + R.w - sk, R.y + R.h]], path = new Path2D(); path.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < 4; i++) path.lineTo(pts[i][0], pts[i][1]); path.closePath();
    var cx = R.x + R.w * .5, cy = R.y + R.h * .5;
    g.save(); g.translate(dir * 9, 9); g.fillStyle = S.acc + '55'; g.fill(path); g.restore();
    g.save(); g.clip(path);
    var bg = g.createLinearGradient(0, R.y, 0, R.y + R.h); bg.addColorStop(0, '#15100F'); bg.addColorStop(1, '#0A0809'); g.fillStyle = bg; g.fillRect(R.x, R.y, R.w, R.h);
    var rg = g.createRadialGradient(cx + dir * R.w * .06, cy - R.h * .04, 4, cx, cy, R.h * .7); rg.addColorStop(0, S.acc + (hot >= .7 ? '99' : '55')); rg.addColorStop(.6, S.acc + '18'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(R.x, R.y, R.w, R.h);
    // diagonal colour-holds (Persona-style slashes)
    g.fillStyle = S.acc + '1C'; g.beginPath(); g.moveTo(R.x + R.w * .15, R.y + R.h); g.lineTo(R.x + R.w * .42, R.y); g.lineTo(R.x + R.w * .55, R.y); g.lineTo(R.x + R.w * .28, R.y + R.h); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(R.x + R.w * .62, R.y + R.h); g.lineTo(R.x + R.w * .78, R.y); g.lineTo(R.x + R.w * .83, R.y); g.lineTo(R.x + R.w * .67, R.y + R.h); g.closePath(); g.fill();
    g.globalAlpha = .7; g.fillStyle = halftone(g); g.fillRect(R.x, R.y + R.h * .55, R.w, R.h * .45); g.globalAlpha = 1;
    if (P.flash > 0) { g.fillStyle = 'rgba(255,240,220,' + P.flash * .35 + ')'; g.fillRect(R.x, R.y, R.w, R.h); }
    g.restore();
    // creature breaks the panel edge (manga pop-out)
    var a = actor(d, side, ts), ol = inked(d, side, a), ax = cx + P.dx - a.bw / a.q / 2, ay = cy + P.dy - a.bh / a.q / 2, bwc = a.bw / a.q, bhc = a.bh / a.q;
    if (F.cold > 0 && 'filter' in g) g.filter = 'grayscale(' + F.cold + ') brightness(' + (1 - F.cold * .35) + ')';
    var drift = F.res ? F.res.drift : 0, gl = drift >= 60 || P.glitch > 0;
    if (gl && !d.reduce) { var seed = Math.floor(ts / 90), rr = A.rng(seed + (side === 'a' ? 3 : 9)), n = 7, sh = bhc / n; for (var s = 0; s < n; s++) { var off = (rr() - .5) * (P.glitch > 0 ? 34 : 14); g.drawImage(ol, 0, s * a.bh / n, a.bw, a.bh / n, ax + off, ay + s * sh, bwc, sh + .5); g.drawImage(a.cv, 0, s * a.bh / n, a.bw, a.bh / n, ax + off, ay + s * sh, bwc, sh + .5); } }
    else { g.drawImage(ol, ax, ay, bwc, bhc); g.drawImage(a.cv, ax, ay, bwc, bhc); }
    if ('filter' in g) g.filter = 'none';
    // frame: ink + accent keyline
    g.save(); g.lineJoin = 'miter'; g.strokeStyle = '#050607'; g.lineWidth = 5; g.stroke(path); g.strokeStyle = S.acc; g.lineWidth = 2; g.stroke(path); g.restore();
    // corner cut marks
    g.save(); g.strokeStyle = 'rgba(232,224,204,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(pts[1][0] + 12, pts[1][1] + 8); g.lineTo(pts[1][0] + 12 + 18, pts[1][1] + 8); g.moveTo(pts[1][0] + 12, pts[1][1] + 8); g.lineTo(pts[1][0] + 4, pts[1][1] + 26); g.stroke(); g.restore();
    return { cx: cx + P.dx, cy: cy + P.dy, a: a };
  }

  /* ---------- clash ring ---------- */
  function ring(d, g, ts) {
    var c = d.ringC(), r = c.r * .95, gap = .42 + 0, a0 = gap + d.ringClose * .3, a1 = TAU - gap - d.ringClose * .3, ha = Math.max(d.F.a.res ? d.F.a.res.heat : 0, d.F.b.res ? d.F.b.res.heat : 0) / 100;
    g.save(); g.translate(c.x, c.y);
    var gr = g.createRadialGradient(0, 0, r * .1, 0, 0, r); gr.addColorStop(0, 'rgba(214,58,50,.16)'); gr.addColorStop(.7, 'rgba(10,8,9,.55)'); gr.addColorStop(1, 'rgba(10,8,9,.0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.lineCap = 'round'; g.strokeStyle = 'rgba(232,224,204,.6)'; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, r, a0, a1); g.stroke(); g.strokeStyle = 'rgba(214,58,50,.55)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, r * 1.06, a0 + .06, a1 - .06); g.stroke();
    g.setLineDash([2, 9]); g.strokeStyle = 'rgba(232,224,204,.32)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, r * .8, ts / 3000, ts / 3000 + TAU); g.stroke(); g.setLineDash([]);
    for (var i = 0; i < 48; i++) { var a = i / 48 * TAU, maj = i % 4 === 0; g.beginPath(); g.moveTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1); g.lineTo(Math.cos(a) * r * (maj ? 1.2 : 1.15), Math.sin(a) * r * (maj ? 1.2 : 1.15)); g.strokeStyle = 'rgba(232,224,204,' + (maj ? .5 : .2) + ')'; g.lineWidth = 1; g.stroke(); }
    if (ha > .05) { g.strokeStyle = 'rgba(224,101,58,' + (.25 + ha * .7) + ')'; g.lineWidth = 3.2; g.beginPath(); g.arc(0, 0, r * .92, ts / 2600, ts / 2600 + ha * 1.6); g.stroke(); }
    g.restore();
  }
  function shafts(g, W, H, amt, ts) {
    g.save(); g.globalCompositeOperation = 'lighter'; var cx = W * .5, cy = H * .3; for (var i = 0; i < 9; i++) { var a = Math.PI * (.14 + i * .09) + Math.sin(ts / 4200 + i) * .015, w = .026 + (i % 3) * .011, len = H * 1.3, gr = g.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len); gr.addColorStop(0, 'rgba(215,138,67,' + (.07 * amt) + ')'); gr.addColorStop(1, 'rgba(215,138,67,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - w) * len, cy + Math.sin(a - w) * len); g.lineTo(cx + Math.cos(a + w) * len, cy + Math.sin(a + w) * len); g.closePath(); g.fill(); } g.restore();
  }

  /* ---------- impact frame: two frames of pure black on white ---------- */
  function impact(d, g, ts) {
    var W = d.W, H = d.H; g.fillStyle = '#F4EEDF'; g.fillRect(0, 0, W, H); var rr = A.rng(Math.floor(ts / 50) + 5), lx = W * d.frameFx.lx, ly = H * d.frameFx.ly;
    g.strokeStyle = '#0A080A'; for (var i = 0; i < 70; i++) { var a = i / 70 * TAU + rr() * .05, r0 = H * (.08 + rr() * .1), r1 = H * 1.2; g.lineWidth = .5 + rr() * 3.4; g.beginPath(); g.moveTo(lx + Math.cos(a) * r0, ly + Math.sin(a) * r0); g.lineTo(lx + Math.cos(a) * r1, ly + Math.sin(a) * r1); g.stroke(); }
    ['a', 'b'].forEach(function (s) { var c = d.center(s), HW = d.actorHW(s), dir = s === 'a' ? 1 : -1; g.save(); g.translate(c.x, c.y); g.scale(dir, 1); g.rotate(d.F[s].pose.armF * .14 * dir * dir); K.maskDraw(g, { flat: '#0A080A' }, d.F[s].arch, ts, HW * 1.05, 0, 0); g.restore(); });
  }

  /* ---------- a full frame ---------- */
  function frame(d, ts) {
    var g = d.g, dpr = d.dpr, W = d.W, H = d.H, c = d.cam; if (!W) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (d.ifr > 0 && !d.reduce) { impact(d, g, ts); return; }
    g.save(); var ox = c.sx * (d.reduce ? 0 : 1), oy = c.sy * (d.reduce ? 0 : 1); g.translate(W / 2 + ox, H * .5 + oy); g.scale(c.z, c.z); g.translate(-W / 2 + c.px, -H * .5 + c.py);
    g.save(); g.translate(W / 2, H / 2); g.scale(1 + (c.z - 1) * -.35, 1 + (c.z - 1) * -.35); g.translate(-W / 2, -H / 2); if (d.bg) g.drawImage(d.bg, -W * .125 - c.px * .3, 0, W * 1.25, H); g.restore();
    g.fillStyle = 'rgba(6,7,8,.46)'; g.fillRect(-20, -20, W + 40, H + 40); shafts(g, W, H, 1, ts);
    // the big diagonal slash behind the table
    g.save(); g.fillStyle = 'rgba(214,58,50,.10)'; g.beginPath(); g.moveTo(W * .44, H); g.lineTo(W * .58, 0); g.lineTo(W * .64, 0); g.lineTo(W * .5, H); g.closePath(); g.fill(); g.fillStyle = 'rgba(232,224,204,.06)'; g.beginPath(); g.moveTo(W * .5, H); g.lineTo(W * .64, 0); g.lineTo(W * .655, 0); g.lineTo(W * .515, H); g.closePath(); g.fill(); g.restore();
    d.drawFx(g, 'under', ts); ring(d, g, ts);
    var order = d.front === 'a' ? ['b', 'a'] : ['a', 'b']; d.seatC = {}; for (var i = 0; i < 2; i++) d.seatC[order[i]] = seat(d, g, order[i], ts);
    d.drawFx(g, 'over', ts);
    for (var pi = 0; pi < d.parts.length; pi++) { var q = d.parts[pi], a = 1 - q.age / q.life; g.globalAlpha = a * q.a; g.fillStyle = q.c; g.fillRect(q.x, q.y, q.s, q.s * 1.5); } g.globalAlpha = 1;
    g.restore();
    if (d.ht) { g.save(); g.globalAlpha = .26 + d.frameFx.ink * .3; g.drawImage(d.ht, 0, 0, W, H); g.restore(); }
    if (d.grain && !d.reduce) { g.save(); g.globalAlpha = .45; var gx = (Math.floor(ts / 80) * 37) % 256, gy = (Math.floor(ts / 80) * 91) % 256; g.translate(-gx, -gy); g.fillStyle = g.createPattern(d.grain, 'repeat'); g.fillRect(0, 0, W + 256, H + 256); g.restore(); }
    var vg = g.createRadialGradient(W / 2, H * .5, H * .36, W / 2, H * .5, H * .98); vg.addColorStop(0, 'rgba(5,6,7,0)'); vg.addColorStop(1, 'rgba(5,6,7,.75)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (d.frameFx.lines > 0 && !d.reduce) A.speedLines(g, W * d.frameFx.lx, H * d.frameFx.ly, H * .16, H * 1.3, 46, Math.floor(ts / 70) % 7 + 3, d.frameFx.lines * .8, C.paper, W, H);
    if (d.flash > 0 && !d.reduce) { g.fillStyle = 'rgba(231,222,202,' + (d.flash * .85) + ')'; g.fillRect(0, 0, W, H); }
    if (d.frameFx.ink > 0 && !d.reduce) { g.fillStyle = 'rgba(5,6,7,' + (d.frameFx.ink * .7) + ')'; g.fillRect(0, 0, W, H); }
    g.strokeStyle = 'rgba(216,208,190,.5)'; g.lineWidth = 1.5; var m = 8; g.strokeRect(m, m, W - m * 2, H - m * 2); g.lineWidth = 2.5; g.strokeStyle = C.paper; var L = 22; [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(function (q) { g.beginPath(); g.moveTo(q[0], q[1] + q[3] * L); g.lineTo(q[0], q[1]); g.lineTo(q[0] + q[2] * L, q[1]); g.stroke(); });
  }
  DY.DuelDraw = { frame: frame, actor: actor, seat: seat };
})();
