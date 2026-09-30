/* DYADRYN combat stage — original combatants. One rigged body (IK arms, IK legs, leaning torso) dressed as six archetypes.
   Style: heavy ink outlines, muted teal / olive / rust cloth, pale ceramic masks, halftone shading, amber light from the eclipse.
   These are original DYADRYN designs — not ASHEN characters (see the canon firewall). */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {}, A = DY.StageArt, C = A.C, TAU = A.TAU, cl = A.cl;
  var PAL = {
    'Trace-Hunter': { coat: '#22343E', coat2: '#36525F', trim: C.bone, cloth: '#4B646E', skin: '#8E7A66' },
    Broker: { coat: '#3A2E24', coat2: '#5C4834', trim: C.amber, cloth: '#7A6046', skin: '#9A7B5E' },
    Stillpoint: { coat: '#29323A', coat2: '#465862', trim: C.bone, cloth: '#5C6E78', skin: '#8E7A66' },
    Archive: { coat: '#3A322B', coat2: '#5E5245', trim: C.paper, cloth: '#7A6C5A', skin: '#A48A70' },
    Swarm: { coat: '#2D3A29', coat2: '#4C6140', trim: C.amber, cloth: '#647C52', skin: '#B78A62' },
    Veil: { coat: '#1F222A', coat2: '#383E4C', trim: C.bone, cloth: '#4A5266', skin: '#8E7A66' }
  };
  var ALIAS = { Operator: 'Veil', Steady: 'Stillpoint', Pressure: 'Broker' };
  var BODY = { 'Trace-Hunter': { h: 1.04, w: 1 }, Broker: { h: .97, w: 1.16 }, Stillpoint: { h: 1.02, w: 1.24 }, Archive: { h: .98, w: 1.05 }, Swarm: { h: .86, w: .92 }, Veil: { h: 1.06, w: .9 } };
  var dots = null;
  function dotFill(g) { if (dots) return dots; var c = document.createElement('canvas'); c.width = c.height = 6; var x = c.getContext('2d'); x.fillStyle = '#000'; x.beginPath(); x.arc(1.5, 1.5, 1.05, 0, TAU); x.fill(); x.beginPath(); x.arc(4.5, 4.5, 1.05, 0, TAU); x.fill(); return (dots = g.createPattern(c, 'repeat')); }

  function ik(x0, y0, tx, ty, l1, l2, bend) {
    var dx = tx - x0, dy = ty - y0, d = Math.min(Math.hypot(dx, dy) || .01, l1 + l2 - .5), a = Math.atan2(dy, dx), cb = cl((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), b = Math.acos(cb), ang = a + bend * b;
    var ex = x0 + Math.cos(ang) * l1, ey = y0 + Math.sin(ang) * l1, hx = x0 + Math.cos(a) * d, hy = y0 + Math.sin(a) * d;
    return { ex: ex, ey: ey, hx: hx, hy: hy };
  }
  function limbPath(g, ax, ay, bx, by, w0, w1) {
    var dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; g.beginPath(); g.moveTo(ax + nx * w0, ay + ny * w0); g.lineTo(bx + nx * w1, by + ny * w1); g.arc(bx, by, w1, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true); g.lineTo(ax - nx * w0, ay - ny * w0); g.arc(ax, ay, w0, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, true); g.closePath();
  }
  var INK = C.ink;
  function paint(g, o, fill, lw) { if (o.flat) { g.fillStyle = o.flat; g.fill(); if (o.stroke) { g.lineWidth = o.lw || 2; g.strokeStyle = o.stroke; g.stroke(); } return; } g.fillStyle = fill; g.fill(); g.lineJoin = 'round'; g.lineWidth = lw || 5; g.strokeStyle = INK; g.stroke(); }
  function rimLine(g, o, col, lw) { if (o.flat) return; g.lineWidth = lw || 1.4; g.strokeStyle = col; g.stroke(); }
  function shadeClip(g, o, drawPath, amberSide) { // halftone shadow + amber rim on the side facing the eclipse
    if (o.flat) return; g.save(); drawPath(); g.clip(); var gr = g.createLinearGradient(-60, 0, 60, 0); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(215,138,67,.5)'); g.fillStyle = gr; g.fillRect(-140, -330, 280, 340);
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = .32; g.fillStyle = dotFill(g); g.save(); g.translate(0, 0); g.fillRect(-140, -330, 100, 340); g.restore(); g.restore();
  }

  /* ---------- pose → joints ---------- */
  function pose(F, t) {
    var P = F.pose, arch = ALIAS[F.arch] || F.arch || 'Veil', B = BODY[arch] || BODY.Veil, cold = F.cold || 0;
    var crouch = cl(P.crouch + cold * .35 + (P.hurt || 0) * .12, 0, 1), lean = P.lean - cold * .5 - (P.hurt || 0) * .9, br = Math.sin(t / 560 + (F.side === 'a' ? 0 : 2)) * (1 - cold) * 1.6;
    var cy = -192 * B.h + crouch * 28, cx = lean * 24, hipY = -104 * B.h + crouch * 30, hipX = -cx * .2;
    var S1 = [cx + 20 * B.w, cy + 6 + br], S2 = [cx - 24 * B.w, cy + 6 + br];
    var w = { s: P.armF, g: P.guard, r: P.raise, o: P.open, u: P.up, h: P.hurt || 0, k: P.ready || 0 };
    var idleF = [22, 60], idleB = [-8, 66], tgt = function (idle, strike, guard, raise, open, up, hurt, ready) { return [idle[0] + w.s * (strike[0] - idle[0]) + w.g * (guard[0] - idle[0]) + w.r * (raise[0] - idle[0]) + w.o * (open[0] - idle[0]) + w.u * (up[0] - idle[0]) + w.h * (hurt[0] - idle[0]) + w.k * (ready[0] - idle[0]), idle[1] + w.s * (strike[1] - idle[1]) + w.g * (guard[1] - idle[1]) + w.r * (raise[1] - idle[1]) + w.o * (open[1] - idle[1]) + w.u * (up[1] - idle[1]) + w.h * (hurt[1] - idle[1]) + w.k * (ready[1] - idle[1])]; };
    var hf = tgt(idleF, [104, -6], [50, -20], [30, -52], [78, -46], [34, -104], [-34, 44], [62, -12]), hb = tgt(idleB, [-40, 34], [40, 4], [4, 58], [-78, -46], [-22, -100], [-46, 52], [-6, 44]);
    var L1 = 46 * B.h, L2 = 44 * B.h;
    var af = ik(S1[0], S1[1], S1[0] + hf[0] * B.h, S1[1] + hf[1] * B.h, L1, L2, 1), ab = ik(S2[0], S2[1], S2[0] + hb[0] * B.h, S2[1] + hb[1] * B.h, L1, L2, 1);
    var st = P.stride, fF = [hipX + 18 + st * 50, 0], fB = [hipX - 18 - st * 38, 0], T1 = 54 * B.h, T2 = 52 * B.h;
    var lf = ik(hipX + 8, hipY, fF[0], fF[1], T1, T2, -1), lb = ik(hipX - 8, hipY, fB[0], fB[1], T1, T2, -1);
    return { arch: arch, B: B, S1: S1, S2: S2, af: af, ab: ab, lf: lf, lb: lb, hip: [hipX, hipY], cx: cx, cy: cy, head: [cx + 6, cy - 44 * B.h + (P.hurt || 0) * -6 + br - (crouch * 4)], br: br, fF: fF, fB: fB, crouch: crouch, lean: lean };
  }

  /* ---------- parts ---------- */
  function torso(g, o, J, pal, acc, F) {
    var B = J.B, wS = 22 * B.w, path = function () { g.beginPath(); g.moveTo(J.S1[0] + 4, J.S1[1] - 6); g.quadraticCurveTo(J.S1[0] + 8 * B.w, J.S1[1] + 30, J.hip[0] + 22 * B.w, J.hip[1] + 8); g.lineTo(J.hip[0] - 22 * B.w, J.hip[1] + 8); g.quadraticCurveTo(J.S2[0] - 4, J.S2[1] + 30, J.S2[0] - 8, J.S2[1] - 6); g.closePath(); };
    path(); paint(g, o, pal.coat2, 5); shadeClip(g, o, path); if (!o.flat) { path(); rimLine(g, o, 'rgba(216,208,190,.5)', 1.4); g.strokeStyle = acc; g.lineWidth = 7; g.beginPath(); g.moveTo(J.hip[0] - 18 * B.w, J.hip[1] - 12); g.lineTo(J.hip[0] + 20 * B.w, J.hip[1] - 4); g.stroke(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); g.fillStyle = pal.trim; g.fillRect(J.hip[0] - 3, J.hip[1] - 14, 8, 10);
      g.fillStyle = acc; [0, 1, 2].forEach(function (i) { g.beginPath(); g.arc(J.S1[0] - 8 + i * 8, J.S1[1] + 26 + i * 2, 2.2, 0, TAU); g.fill(); });
      g.strokeStyle = 'rgba(184,92,50,.9)'; g.lineWidth = 1.8; g.strokeRect(J.hip[0] - 4, J.S1[1] + 46, 20, 16); for (var q = 0; q < 4; q++) { g.beginPath(); g.moveTo(J.hip[0] - 4 + q * 5, J.S1[1] + 44); g.lineTo(J.hip[0] - 4 + q * 5, J.S1[1] + 48); g.stroke(); } }
  }
  function coat(g, o, J, pal, acc, F, t, len) {
    var B = J.B, P = F.pose, sw = Math.sin(t / 300 + (F.side === 'a' ? 0 : 1.4)) * 5 + P.sway * 30, hem = -len, fx = J.hip[0] + 38 * B.w + sw * .2, bx = J.hip[0] - 42 * B.w - 12 + sw;
    var path = function () { g.beginPath(); g.moveTo(J.S1[0] + 8, J.S1[1] - 8); g.bezierCurveTo(J.S1[0] + 26 * B.w, J.S1[1] + 40, fx + 12, hem * .45, fx, hem + 6); var n = 6; for (var i = 0; i <= n; i++) { var x = fx + (bx - fx) * i / n, y = hem + (i % 2 ? 0 : 12) + Math.sin(i * 1.9 + t / 400) * 2; g.lineTo(x, y); } g.bezierCurveTo(bx - 8, hem * .5, J.S2[0] - 24 * B.w, J.S2[1] + 40, J.S2[0] - 8, J.S2[1] - 8); g.closePath(); };
    path(); paint(g, o, pal.coat, 5); shadeClip(g, o, path);
    if (!o.flat) { g.save(); path(); g.clip(); g.strokeStyle = 'rgba(216,208,190,.2)'; g.lineWidth = 1.3; for (var k = 0; k < 7; k++) { g.beginPath(); g.moveTo(J.hip[0] - 30 + k * 12, hem + 8); g.lineTo(J.hip[0] - 22 + k * 11, J.hip[1] - 20 - k * 4); g.stroke(); } g.restore(); path(); rimLine(g, o, 'rgba(216,208,190,.55)', 1.5); }
  }
  function leg(g, o, J, L, foot, pal, front, boot) {
    var hx = J.hip[0] + (front ? 8 : -8), hy = J.hip[1];
    limbPath(g, hx, hy, L.ex, L.ey, 15 * J.B.w, 11); paint(g, o, front ? pal.coat2 : pal.coat, 4.5);
    limbPath(g, L.ex, L.ey, L.hx, L.hy - 6, 11, 8.5); paint(g, o, front ? pal.coat2 : pal.coat, 4.5);
    g.beginPath(); g.moveTo(L.hx - 8, L.hy - 12); g.lineTo(L.hx + 6, L.hy - 14); g.lineTo(L.hx + 30 * boot, L.hy - 4); g.lineTo(L.hx + 30 * boot, L.hy + 3); g.lineTo(L.hx - 10, L.hy + 3); g.closePath(); paint(g, o, '#0B0C0D', 4.5); if (!o.flat) { g.fillStyle = pal.trim; g.fillRect(L.hx - 8, L.hy - 20, 15, 4); }
  }
  function arm(g, o, J, A_, S, pal, acc, front, glove) {
    limbPath(g, S[0], S[1], A_.ex, A_.ey, 12 * J.B.w, 9.5); paint(g, o, pal.coat2, 4.5);
    limbPath(g, A_.ex, A_.ey, A_.hx, A_.hy, 9.5, 7.5); paint(g, o, pal.cloth, 4.5);
    g.beginPath(); g.arc(A_.hx, A_.hy, (glove || 8) + 2.5, 0, TAU); paint(g, o, front ? '#0B0C0D' : '#15171A', 4); if (!o.flat) { g.strokeStyle = acc; g.lineWidth = 3; g.beginPath(); g.moveTo(A_.ex + (A_.hx - A_.ex) * .55, A_.ey + (A_.hy - A_.ey) * .55 - 7); g.lineTo(A_.ex + (A_.hx - A_.ex) * .55, A_.ey + (A_.hy - A_.ey) * .55 + 7); g.stroke(); }
  }
  function eye(g, x, y, r, iris, up) { g.save(); g.translate(x, y); g.fillStyle = '#EFE6D2'; g.beginPath(); g.ellipse(0, 0, r * 1.2, r, 0, 0, TAU); g.fill(); g.fillStyle = iris; g.beginPath(); g.ellipse(r * .2, r * .05, r * .68, r * .82, 0, 0, TAU); g.fill(); g.fillStyle = INK; g.beginPath(); g.arc(r * .2, r * .05, r * .32, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(r * .5, -r * .3, r * .24, 0, TAU); g.fill(); g.lineWidth = 2.2; g.strokeStyle = INK; g.beginPath(); g.ellipse(0, 0, r * 1.2, r, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.restore(); }

  /* ---------- heads ---------- */
  function head(g, o, J, F, pal, acc, t) {
    var arch = J.arch, P = F.pose, side = F.side, hx = J.head[0], hy = J.head[1];
    g.save(); g.translate(hx, hy); g.rotate(P.tilt * .8 + (P.hurt || 0) * -.3 + J.lean * .1); var hs = { Swarm: 1.34, Stillpoint: 1.12, Broker: 1.16 }[arch] || 1.22; g.scale(hs, hs);
    var maskFill = C.paper, dark = '#3D3E3B';
    var oval = function (rx, ry) { g.beginPath(); g.ellipse(4, 0, rx, ry, 0, 0, TAU); };
    if (arch === 'Trace-Hunter') {
      g.beginPath(); g.moveTo(-26, 16); g.bezierCurveTo(-30, -30, -14, -50, 6, -52); g.bezierCurveTo(28, -50, 34, -22, 26, 14); g.lineTo(6, 26); g.closePath(); paint(g, o, pal.coat, 5);
      oval(15, 30); paint(g, o, maskFill, 4.5); if (!o.flat) { g.save(); oval(15, 30); g.clip(); g.fillStyle = dark; g.fillRect(-20, -40, 20, 80); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(4, -40, 30, 80); g.restore(); g.fillStyle = INK; g.fillRect(-11, -8, 30, 7); g.strokeStyle = acc; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-8, -4.5); g.lineTo(17, -4.5); g.stroke(); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(4, -30); g.lineTo(4, 30); g.moveTo(-6, 14); g.lineTo(14, 14); g.stroke(); g.fillStyle = '#0B0C0D'; g.beginPath(); g.arc(-15, 0, 5, 0, TAU); g.fill(); g.strokeStyle = C.bone; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-15, -4); g.lineTo(-17, -22); g.stroke(); g.strokeStyle = 'rgba(184,92,50,.85)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(10, -26); g.lineTo(6, -12); g.lineTo(11, -2); g.stroke(); }
    } else if (arch === 'Broker') {
      g.beginPath(); g.ellipse(2, -26, 40, 9, 0, 0, TAU); paint(g, o, pal.coat, 5); g.beginPath(); g.moveTo(-22, -26); g.bezierCurveTo(-22, -58, 26, -60, 28, -26); g.closePath(); paint(g, o, pal.coat2, 5);
      g.beginPath(); g.ellipse(4, -6, 16, 20, 0, 0, TAU); paint(g, o, pal.skin, 4.5);
      if (!o.flat) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-14, -24, 14, 40); g.fillStyle = '#15171A'; g.beginPath(); g.moveTo(-10, 2); g.lineTo(22, 2); g.lineTo(18, 24); g.lineTo(-4, 26); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); g.fillStyle = '#2C2C2C'; g.beginPath(); g.arc(-6, 14, 6, 0, TAU); g.arc(16, 14, 6, 0, TAU); g.fill(); g.strokeStyle = INK; g.stroke(); g.strokeStyle = C.bone; g.lineWidth = 1.2; for (var i = -1; i < 2; i += 2) { g.beginPath(); g.moveTo(i * 8 + 5, 10); g.lineTo(i * 8 + 5, 20); g.stroke(); }
        g.fillStyle = C.amber; g.strokeStyle = INK; g.lineWidth = 3.4; [-3, 15].forEach(function (x) { g.beginPath(); g.arc(x, -10, 8, 0, TAU); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,240,200,.85)'; g.beginPath(); g.arc(x + 2, -12, 2.6, 0, TAU); g.fill(); g.fillStyle = C.amber; }); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(-14, -10); g.lineTo(26, -10); g.stroke(); }
    } else if (arch === 'Stillpoint') {
      g.beginPath(); g.moveTo(-20, -40); g.lineTo(26, -40); g.lineTo(32, -6); g.lineTo(26, 26); g.lineTo(-16, 26); g.lineTo(-24, -6); g.closePath(); paint(g, o, pal.coat2, 5);
      if (!o.flat) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-24, -40, 16, 66); g.strokeStyle = C.bone; g.lineWidth = 1.5; g.stroke(); [[-14, -18, 38, 22], [-9, -14, 28, 14], [-4, -10, 18, 6]].forEach(function (r, i) { g.strokeStyle = i ? acc : INK; g.lineWidth = i ? 2 : 5; g.strokeRect(r[0], r[1], r[2], r[3]); }); g.fillStyle = INK; g.fillRect(-4, -10, 18, 6); g.fillStyle = C.paper; g.fillRect(-18, 10, 40, 4); g.fillStyle = INK; for (var q = 0; q < 4; q++) g.fillRect(-10 + q * 9, 16, 4, 8); }
    } else if (arch === 'Archive') {
      if (!o.flat) { g.save(); g.rotate(t / 2400); g.strokeStyle = 'rgba(231,222,202,.65)'; g.lineWidth = 1.5; for (var k = 0; k < 14; k++) { var a = k / 14 * TAU; g.save(); g.translate(Math.cos(a) * 52, Math.sin(a) * 52); g.rotate(a); g.fillStyle = k % 3 ? '#3D362F' : C.paper; g.fillRect(-4, -8, 8, 16); g.strokeRect(-4, -8, 8, 16); g.restore(); } g.restore(); }
      g.beginPath(); g.moveTo(-26, 20); g.bezierCurveTo(-30, -32, -12, -50, 6, -52); g.bezierCurveTo(28, -50, 32, -22, 26, 18); g.lineTo(6, 26); g.closePath(); paint(g, o, pal.coat, 5);
      oval(15, 26); paint(g, o, C.paper, 4.5); if (!o.flat) { g.save(); oval(15, 26); g.clip(); g.fillStyle = dark; g.fillRect(-20, -40, 16, 80); g.restore(); g.fillStyle = INK; g.beginPath(); g.arc(8, -4, 8, 0, TAU); g.fill(); g.fillStyle = C.coldHi; g.beginPath(); g.arc(8, -4, 4.6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(10, -6, 1.6, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(4, -26); g.lineTo(4, 26); g.stroke(); g.strokeStyle = '#8A8478'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, 16); g.lineTo(-4, 40); g.moveTo(4, 20); g.lineTo(5, 46); g.moveTo(14, 16); g.lineTo(13, 38); g.stroke(); }
    } else if (arch === 'Swarm') {
      g.beginPath(); g.ellipse(4, -6, 17, 20, 0, 0, TAU); paint(g, o, pal.skin, 4.5);
      g.beginPath(); g.moveTo(-20, 0); g.bezierCurveTo(-30, -30, -14, -52, 8, -50); g.bezierCurveTo(30, -50, 36, -24, 26, -8); g.lineTo(18, -22); g.lineTo(8, -16); g.lineTo(-2, -24); g.lineTo(-10, -14); g.closePath(); paint(g, o, '#2A1E17', 4.5);
      if (!o.flat) { g.strokeStyle = '#2A1E17'; g.lineWidth = 3; [[-18, -6, -30, 6], [-20, -20, -34, -10], [24, -30, 34, -38]].forEach(function (s) { g.beginPath(); g.moveTo(s[0], s[1]); g.quadraticCurveTo((s[0] + s[2]) / 2 - 4, s[1] + 8, s[2], s[3]); g.stroke(); }); eye(g, -2, -6, 6, C.cold); eye(g, 15, -6, 5.4, C.cold); g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-9, -14); g.lineTo(5, -16); g.moveTo(10, -15); g.lineTo(22, -13); g.stroke();
        g.fillStyle = 'rgba(120,70,40,.7)'; [[0, 3], [5, 5], [11, 3]].forEach(function (s) { g.beginPath(); g.arc(s[0], s[1], 1, 0, TAU); g.fill(); }); g.fillStyle = acc; g.beginPath(); g.moveTo(-14, 6); g.quadraticCurveTo(4, 12, 22, 4); g.lineTo(20, 22); g.quadraticCurveTo(4, 28, -12, 20); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 3.4; g.stroke();
        g.fillStyle = '#15171A'; g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.ellipse(-2, -30, 9, 7, 0, 0, TAU); g.ellipse(17, -30, 8, 6.4, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = 'rgba(143,177,188,.8)'; g.beginPath(); g.ellipse(-2, -30, 5.6, 4, 0, 0, TAU); g.ellipse(17, -30, 5, 3.6, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(-12, -30); g.lineTo(-24, -26); g.moveTo(25, -30); g.lineTo(32, -24); g.stroke(); }
    } else { // Veil
      g.beginPath(); g.moveTo(-22, 26); g.bezierCurveTo(-28, -30, -10, -58, 8, -60); g.bezierCurveTo(28, -56, 32, -20, 24, 22); g.lineTo(6, 34); g.closePath(); paint(g, o, pal.coat, 5);
      g.beginPath(); g.moveTo(4, -34); g.bezierCurveTo(22, -30, 22, 10, 6, 34); g.bezierCurveTo(-10, 10, -10, -30, 4, -34); g.closePath(); paint(g, o, C.paper, 4.5);
      if (!o.flat) { g.save(); g.beginPath(); g.moveTo(4, -34); g.bezierCurveTo(22, -30, 22, 10, 6, 34); g.bezierCurveTo(-10, 10, -10, -30, 4, -34); g.clip(); g.fillStyle = dark; g.fillRect(-16, -40, 20, 80); g.strokeStyle = C.oxide; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-6, -30); g.lineTo(6, -14); g.lineTo(-2, 0); g.lineTo(10, 18); g.moveTo(14, -20); g.lineTo(8, -8); g.stroke(); g.restore(); g.strokeStyle = acc; g.lineWidth = 2; g.beginPath(); g.moveTo(-4, -2); g.lineTo(14, -2); g.stroke(); }
    }
    g.restore();
  }
  /* archetype extras: staff, pack, tags, drones, shoulder plates */
  function gearBack(g, o, J, F, pal, acc, t) {
    var arch = J.arch; if (o.flat) return;
    if (arch === 'Trace-Hunter') { var hb = [J.ab.hx, J.ab.hy]; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(hb[0] - 6, 6); g.lineTo(hb[0] + 2, -330); g.stroke(); g.strokeStyle = '#5A5F60'; g.lineWidth = 2.4; g.stroke(); g.save(); g.translate(hb[0] + 2, -336); g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 18, .4, TAU - .4); g.stroke(); g.strokeStyle = acc; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, 18, .4, TAU - .4); g.stroke(); g.fillStyle = C.paper; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); g.restore(); }
    if (arch === 'Broker' || arch === 'Swarm') { var s = arch === 'Swarm' ? .85 : 1, bx = J.S2[0] - 34, by = J.cy + 4; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 30 * s, by - 6); g.lineTo(bx + 32 * s, by + 70 * s); g.lineTo(bx + 2, by + 76 * s); g.closePath(); g.fillStyle = pal.cloth; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); g.strokeStyle = 'rgba(216,208,190,.5)'; g.lineWidth = 1.4; g.stroke(); g.fillStyle = pal.trim; g.fillRect(bx + 6, by + 22 * s, 20 * s, 6); g.fillRect(bx + 6, by + 46 * s, 20 * s, 6);
      if (arch === 'Broker') { for (var i = 0; i < 4; i++) { var sw = Math.sin(t / 500 + i) * 4; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(bx + 6 + i * 7, by + 76); g.lineTo(bx + 4 + i * 7 + sw, by + 96 + i * 3); g.stroke(); g.fillStyle = i % 2 ? C.paper : C.amber; g.fillRect(bx + 1 + i * 7 + sw, by + 96 + i * 3, 7, 11); g.strokeRect(bx + 1 + i * 7 + sw, by + 96 + i * 3, 7, 11); } } }
    if (arch === 'Archive') { for (var k = 0; k < 6; k++) { var sx = J.hip[0] - 22 + k * 9, sy = J.hip[1] - 6, sw2 = Math.sin(t / 620 + k) * 3; g.fillStyle = k % 2 ? C.paper : '#8A8478'; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + sw2, sy + 66 + (k % 3) * 10); g.lineTo(sx + 7 + sw2, sy + 66 + (k % 3) * 10); g.lineTo(sx + 7, sy); g.closePath(); g.fill(); g.stroke(); } }
    if (arch === 'Veil') { for (var v = 0; v < 4; v++) { var sw3 = Math.sin(t / 380 + v * 1.3) * 10; g.beginPath(); g.moveTo(J.S2[0] - 4 - v * 6, J.cy + 4); g.bezierCurveTo(J.S2[0] - 40 - v * 12 + sw3, J.cy + 40, J.S2[0] - 20 - v * 16 - sw3, J.cy + 100, J.S2[0] - 44 - v * 14 + sw3, J.cy + 150 - v * 12); g.lineTo(J.S2[0] - 30 - v * 14 + sw3, J.cy + 152 - v * 12); g.bezierCurveTo(J.S2[0] - 10 - v * 14, J.cy + 100, J.S2[0] - 24 - v * 8, J.cy + 40, J.S2[0] + 2 - v * 6, J.cy + 4); g.closePath(); g.fillStyle = v % 2 ? pal.cloth : pal.coat2; g.fill(); g.lineWidth = 3.4; g.strokeStyle = INK; g.stroke(); } }
  }
  function gearFront(g, o, J, F, pal, acc, t) {
    var arch = J.arch; if (o.flat) return;
    if (arch === 'Stillpoint') { [[J.S1, 1], [J.S2, .9]].forEach(function (q) { var s = q[0], k = q[1]; g.beginPath(); g.moveTo(s[0] - 22 * k, s[1] - 12); g.lineTo(s[0] + 24 * k, s[1] - 14); g.lineTo(s[0] + 28 * k, s[1] + 14); g.lineTo(s[0] - 20 * k, s[1] + 20); g.closePath(); g.fillStyle = pal.coat2; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); g.strokeStyle = C.bone; g.lineWidth = 1.5; g.stroke(); g.strokeStyle = acc; g.lineWidth = 3; g.beginPath(); g.moveTo(s[0] - 14 * k, s[1] + 4); g.lineTo(s[0] + 18 * k, s[1] + 2); g.stroke(); }); }
    if (arch === 'Broker') { g.beginPath(); g.moveTo(J.S2[0] - 4, J.cy + 6); g.lineTo(J.S2[0] + 10, J.cy + 2); g.lineTo(J.hip[0] + 22, J.hip[1] - 6); g.lineTo(J.hip[0] + 8, J.hip[1] - 2); g.closePath(); g.fillStyle = '#15171A'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); for (var i = 0; i < 4; i++) { var p = i / 3; g.fillStyle = i % 2 ? C.amber : C.coldHi; g.beginPath(); g.arc(J.S2[0] + 6 + (J.hip[0] + 14 - J.S2[0] - 6) * p, J.cy + 4 + (J.hip[1] - 4 - J.cy - 4) * p, 4, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); } }
    if (arch === 'Swarm') { var drones = [[-64, -270, 0], [70, -300, 1.7], [-86, -190, 3.1]]; drones.forEach(function (d, i) { var x = d[0] + Math.sin(t / 420 + d[2]) * 8, y = d[1] + Math.cos(t / 380 + d[2]) * 6; g.save(); g.translate(x, y); g.fillStyle = '#1B1E20'; g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.ellipse(0, 0, 11, 7, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = C.amber; g.beginPath(); g.arc(3, 0, 2.6, 0, TAU); g.fill(); g.strokeStyle = 'rgba(216,208,190,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-18, -7 + Math.sin(t / 40 + i) * 1.4); g.lineTo(18, -7 - Math.sin(t / 40 + i) * 1.4); g.stroke(); g.restore(); }); }
  }

  /* ---------- assemble ---------- */
  function draw(g, F, t, opt) {
    var o = opt || {}, J = pose(F, t), pal = PAL[J.arch] || PAL.Veil, acc = F.side === 'a' ? C.oxide : C.coldHi, arch = J.arch;
    var lens = { 'Trace-Hunter': 176, Broker: 112, Stillpoint: 84, Archive: 182, Swarm: 60, Veil: 156 }[arch];
    var stanceCol = F.side === 'a' ? C.oxide : C.cold;
    gearBack(g, o, J, F, pal, acc, t);
    leg(g, o, J, J.lb, J.fB, pal, false, 1); arm(g, o, J, J.ab, J.S2, pal, stanceCol, false, 7.5);
    if (arch === 'Trace-Hunter' || arch === 'Archive' || arch === 'Veil' || arch === 'Stillpoint' || arch === 'Broker') coat(g, o, J, pal, acc, F, t, lens); else if (arch === 'Swarm') coat(g, o, J, pal, acc, F, t, 96);
    torso(g, o, J, pal, acc, F);
    leg(g, o, J, J.lf, J.fF, pal, true, 1);
    head(g, o, J, F, pal, acc, t);
    arm(g, o, J, J.af, J.S1, pal, stanceCol, true, 8.5);
    gearFront(g, o, J, F, pal, acc, t);
    // scarf
    if (!o.flat) { var sw = Math.sin(t / 240 + (F.side === 'a' ? 0 : 1.7)) * 8 + F.pose.sway * 26, nx = J.head[0] - 8, ny = J.head[1] + 34; g.save(); g.translate(nx, ny); g.fillStyle = stanceCol; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-24, -4 + sw * .3, -48 + sw, 10 + sw * .4, -84 + sw * 1.2, 4 + sw * .7); g.bezierCurveTo(-52 + sw, 26 + sw * .3, -28, 24, 8, 16); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    return J;
  }
  DY.StageChars = { draw: draw, pose: pose, ALIAS: ALIAS, PAL: PAL };
})();
