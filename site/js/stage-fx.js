/* DYADRYN Combat Stage — choreography. Each round is staged as LOCK → REVEAL → CLASH → RESOLVE → PROOF,
   mirroring the architecture: both agents lock blind, the engine reveals, resolves both together, then seals the proof.
   Everything that lands is driven by the recorded resource deltas — nothing is invented. */
(function () {
  'use strict';
  var DY = window.DY, S = DY.Stage, P = S.prototype, A = DY.StageArt, C = A.C, E = A.E, cl = A.cl, TAU = A.TAU, MOVE = S.MOVE, ICO = S.ICO, SIGN = S.SIGN, SIGCLASS = S.SIGCLASS, KANJI = S.KANJI, CODEX = S.CODEX, dv = S.dv;
  var INT = ['', 'Light', 'Standard', 'Heavy'];

  P.verb = function (Rd, side) {
    var x = Rd[side], o = Rd[side === 'a' ? 'b' : 'a'], k;
    if (x.action === 'STALL') return { k: 'stall' };
    if (x.action === 'SIGNATURE') return { k: SIGCLASS[x.signatureId] || 'strike', sig: x.signatureId };
    if (x.action === 'MIRROR') { var pr = this.M.rounds[Rd.n - 2], po = pr ? pr[side === 'a' ? 'b' : 'a'] : null; if (po) { var m = { PRESS: 'strike', GUARD: 'guard', TRACE: 'trace', RECOVER: 'recover', ADAPT: 'adapt', COUNTER: 'counter' }[po.action]; if (m) return { k: m, mirror: po.action }; } return { k: 'mirror' }; }
    return { k: { TRACE: 'trace', PRESS: 'strike', GUARD: 'guard', COUNTER: 'counter', ADAPT: 'adapt', RECOVER: 'recover' }[x.action] || 'strike' };
  };
  P.opp = function (s) { return s === 'a' ? 'b' : 'a'; };
  P.dirOf = function (s) { return s === 'a' ? 1 : -1; };
  P.gap = function () { return this.F.b.x - this.F.a.x; };

  /* ---------- DOM effects ---------- */
  P.sfx = function (text, x, y, cls, kanji) {
    if (this.rt && this.rt.fast) return;
    var n = document.createElement('span'); n.className = 'sf ' + (cls || ''); n.innerHTML = '<b>' + text + '</b>' + (kanji && S.cjkOK ? '<i lang="ja">' + kanji + '</i>' : ''); n.style.left = (x / this.W * 100) + '%'; n.style.top = (y / this.H * 100) + '%'; n.style.setProperty('--r', (Math.random() * 10 - 5).toFixed(1) + 'deg'); this.dom.sfx.appendChild(n); setTimeout(function () { n.remove(); }, 1100);
  };
  P.banner = function (side, x) {
    var b = side === 'a' ? this.dom.banA : this.dom.banB, sub = x.action === 'COUNTER' ? 'predicts ' + MOVE[x.prediction] : x.action === 'ADAPT' ? (x.adaptStance || '').toLowerCase() + ' stance' : x.action === 'SIGNATURE' ? (SIGN[x.signatureId] || '') : x.action === 'STALL' ? 'no move locked' : INT[x.intensity] + ' intensity';
    var pips = x.intensity ? '<span class="pp" aria-hidden="true">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= x.intensity ? 'on' : '') + '"></i>'; }).join('') + '</span>' : '';
    b.innerHTML = '<span class="bi">' + DY.icon(ICO[x.action] || 'drift', 30) + '</span><span class="bt"><b>' + (MOVE[x.action] || x.action) + '</b><small>' + sub + '</small></span>' + pips;
    b.className = 'cs-banner ' + side + ' in';
  };
  P.lockChip = function (side) { var c = side === 'a' ? this.dom.lcA : this.dom.lcB, p = this.pt(side, 'head'); c.style.left = (p.x / this.W * 100) + '%'; c.style.top = (p.y / this.H * 100 - 9) + '%'; c.innerHTML = DY.icon('lock', 14) + '<span>SEALED</span>'; c.className = 'cs-lockchip ' + side + ' on'; };
  P.cutin = function (side, id) {
    var c = this.dom.cut, nm = SIGN[id] || 'Signature', who = this.names[side];
    c.innerHTML = '<div class="ci-band ' + side + '"><span class="ci-mask">' + this.maskSVG(side) + '</span><div class="ci-t"><small>' + who + ' · Signature</small><b>' + nm + '</b><em>' + (S.cjkOK ? '<i lang="ja">印</i>' : '') + '</em></div></div>'; c.className = 'cs-cut on ' + side;
    var self = this; setTimeout(function () { c.className = 'cs-cut'; }, 1000 / Math.max(.5, this.speed));
  };

  /* ---------- canvas FX ---------- */
  P.fxSlash = function (from, to, opt) {
    opt = opt || {}; var col = opt.col || C.paper, edge = opt.edge || C.oxide, W = opt.w || 26, bend = opt.bend == null ? .18 : opt.bend, life = opt.life || 460;
    this.addFx({ layer: 'over', life: life, draw: function (g, p) {
      var t = E.out3(Math.min(1, p * 2.2)), fade = 1 - Math.max(0, (p - .35) / .65), dx = to.x - from.x, dy = to.y - from.y, mx = from.x + dx / 2 - dy * bend, my = from.y + dy / 2 + dx * bend, N = 22, L = [], Rr = [];
      for (var i = 0; i <= N; i++) { var u = i / N * t, x = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * mx + u * u * to.x, y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * my + u * u * to.y, tx = 2 * (1 - u) * (mx - from.x) + 2 * u * (to.x - mx), ty = 2 * (1 - u) * (my - from.y) + 2 * u * (to.y - my), l = Math.hypot(tx, ty) || 1, w = Math.sin(Math.PI * (i / N)) * W * (.4 + .6 * (i / N)); L.push([x - ty / l * w, y + tx / l * w]); Rr.push([x + ty / l * w, y - tx / l * w]); }
      g.globalAlpha = fade; g.beginPath(); L.forEach(function (q, i) { i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); for (var j = Rr.length - 1; j >= 0; j--) g.lineTo(Rr[j][0], Rr[j][1]); g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = edge; g.stroke(); } });
  };
  P.fxBurst = function (x, y, size, heavy) {
    var seed = (Math.random() * 90) | 0; this.addFx({ layer: 'over', life: heavy ? 520 : 360, draw: function (g, p) {
      var t = E.outBack(Math.min(1, p * 3)), fade = 1 - Math.max(0, (p - .3) / .7); g.globalAlpha = fade; A.burst(g, x, y, size * t, heavy ? 14 : 10, p * .4, C.paper, C.ink, seed);
      g.lineWidth = 3; g.strokeStyle = heavy ? C.oxide : C.bone; g.beginPath(); g.arc(x, y, size * (.5 + p * 1.5), 0, TAU); g.globalAlpha = fade * .8; g.stroke();
      var r = A.rng(seed); g.globalAlpha = fade; g.strokeStyle = C.amber; g.lineWidth = 2; for (var i = 0; i < 10; i++) { var a = r() * TAU, d0 = size * (.6 + p * 1.2), d1 = d0 + size * (.3 + r() * .5) * (1 - p); g.beginPath(); g.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); g.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); g.stroke(); } } });
  };
  P.fxShield = function (side, life, big) {
    var self = this; this.addFx({ layer: 'over', life: life, draw: function (g, p, f) {
      var F = self.F[side], fr = self.pt(side, 'front'), s = F.s, dir = F.face, a = Math.min(1, p * 8) * (1 - Math.max(0, (p - .8) / .2)); if (f.crack) a *= 1;
      g.translate(fr.x + dir * 8 * s, fr.y - 4 * s); g.scale(dir, 1); g.globalAlpha = a; g.lineWidth = 2.6; g.strokeStyle = C.coldHi; var w = 58 * s * (big ? 1.25 : 1), h = 150 * s * (big ? 1.2 : 1);
      for (var i = 0; i < 3; i++) { var k = 1 - i * .22, sk = 16 * s; g.beginPath(); g.moveTo(-w * k, -h * k * .5 + sk); g.lineTo(w * k, -h * k * .5); g.lineTo(w * k, h * k * .5); g.lineTo(-w * k, h * k * .5 + sk); g.closePath(); g.stroke(); if (i === 0) { g.fillStyle = 'rgba(96,124,134,.16)'; g.fill(); } }
      g.lineWidth = 1; g.beginPath(); for (var y = -h / 2; y < h / 2; y += 14 * s) { g.moveTo(-w * .6, y + 8 * s); g.lineTo(w * .6, y); } g.globalAlpha = a * .35; g.stroke();
      if (f.hitAt != null) { var q = cl((p - f.hitAt) / .2, 0, 1); if (q > 0) { g.globalAlpha = a * (1 - q); g.strokeStyle = C.paper; g.lineWidth = 3; g.beginPath(); g.moveTo(w * .9, -20 * s); g.lineTo(w * .1, 4 * s); g.lineTo(w * .5, 30 * s); g.stroke(); } } } });
  };
  P.fxBrackets = function (side) {
    var self = this; this.addFx({ layer: 'over', life: 760, draw: function (g, p) {
      var c = self.pt(side, 'chest'), s = self.F[side].s, t = E.out3(Math.min(1, p / .35)), gap = (150 - 100 * t) * s, h = 120 * s, fade = 1 - Math.max(0, (p - .55) / .45);
      g.globalAlpha = fade; g.lineWidth = 6; g.strokeStyle = C.ink; var draw = function () { g.beginPath(); g.moveTo(c.x - gap, c.y - h); g.lineTo(c.x - gap - 26 * s, c.y - h); g.lineTo(c.x - gap - 26 * s, c.y + h); g.lineTo(c.x - gap, c.y + h); g.moveTo(c.x + gap, c.y - h); g.lineTo(c.x + gap + 26 * s, c.y - h); g.lineTo(c.x + gap + 26 * s, c.y + h); g.lineTo(c.x + gap, c.y + h); g.stroke(); }; draw(); g.lineWidth = 2.4; g.strokeStyle = C.amber; draw(); } });
  };
  P.fxScan = function (from, to) {
    var self = this; this.addFx({ layer: 'over', life: 1000, draw: function (g, p) {
      var T = self.F[to], top = T.y - 320 * T.s, hgt = 330 * T.s, y = top + hgt * E.io3(Math.min(1, p / .8)), a = 1 - Math.max(0, (p - .75) / .25);
      g.save(); g.beginPath(); g.rect(T.x - 130 * T.s, top - 20, 260 * T.s, y - top + 20); g.clip(); g.translate(T.x + T.pose.dx * T.s, T.y + T.pose.dy * T.s); g.scale(T.face * T.s, T.s); g.globalAlpha = a; DY.StageChars.draw(g, T, 0, { flat: 'rgba(96,124,134,.3)', stroke: C.coldHi, lw: 2.2 / T.s }); g.restore();
      g.globalAlpha = a; g.strokeStyle = C.coldHi; g.lineWidth = 2; g.beginPath(); g.moveTo(T.x - 150 * T.s, y); g.lineTo(T.x + 150 * T.s, y); g.stroke(); g.setLineDash([3, 6]); g.beginPath(); g.moveTo(T.x - 210 * T.s, y + 8); g.lineTo(T.x + 210 * T.s, y + 8); g.stroke(); } });
  };
  P.fxRingAdapt = function (side) {
    var self = this; this.addFx({ layer: 'over', life: 1100, draw: function (g, p) {
      var F = self.F[side], c = self.pt(side, 'chest'), r = 130 * F.s, a = 1 - Math.max(0, (p - .7) / .3), rot = p * 3.2 * F.face;
      g.translate(c.x, c.y); g.globalAlpha = a * Math.min(1, p * 6); g.lineWidth = 4; g.strokeStyle = C.paper; g.beginPath(); g.arc(0, 0, r, rot, rot + 4.6); g.stroke(); g.translate(10 * F.s, -6 * F.s); g.lineWidth = 2; g.strokeStyle = C.amber; g.beginPath(); g.arc(0, 0, r * .86, -rot, -rot + 3.6); g.stroke(); } });
  };
  P.fxGhost = function (side, ofSide, n) {
    var self = this; this.addFx({ layer: 'under', life: 1100, draw: function (g, p, f, ts) {
      var F = self.F[side], O = self.F[ofSide], a = Math.sin(p * Math.PI) * .55, dir = F.face; g.globalAlpha = a; for (var i = 0; i < (n || 1); i++) { g.save(); g.translate(F.x + dir * (90 + i * 46) * F.s, F.y); g.scale(-dir * F.s, F.s); DY.StageChars.draw(g, O, ts || 0, { flat: 'rgba(215,138,67,.9)', stroke: C.paper, lw: 2 }); g.restore(); g.globalAlpha = a * .6; } } });
  };
  P.fxRecover = function (side) {
    var self = this; this.addFx({ layer: 'over', life: 1300, draw: function (g, p) {
      var F = self.F[side], x = F.x, y = F.y, s = F.s, a = Math.sin(p * Math.PI); g.globalAlpha = a; g.lineWidth = 3; g.strokeStyle = C.oxide; for (var i = 0; i < 5; i++) { var xx = x + (i - 2) * 26 * s, y0 = y - 330 * s + i * 8 * s, y1 = y - 20 * s; g.beginPath(); g.moveTo(xx, y0 + (y1 - y0) * 0); g.lineTo(xx + (i % 2 ? 6 : -6) * s, y0 + (y1 - y0) * .55 * E.out3(p)); g.stroke(); }
      g.strokeStyle = C.paper; g.lineWidth = 2.4; [1, .68, .38].forEach(function (k) { g.strokeRect(x - 70 * s * k, y - 26 * s * k - 4, 140 * s * k, 26 * s * k); }); } });
  };
  P.fxSwarm = function (side) {
    var self = this, r = A.rng(11); var pts = []; for (var i = 0; i < 26; i++) pts.push({ a: r() * TAU, d: 1 + r() * .8, w: .8 + r() * .8 });
    this.addFx({ layer: 'over', life: 1400, draw: function (g, p) { var c = self.pt(side, 'chest'), s = self.F[side].s; g.globalAlpha = Math.sin(p * Math.PI); g.fillStyle = C.paper; pts.forEach(function (q) { var d = (1 - E.io3(p)) * 190 * q.d * s + 10 * s, a = q.a + p * 4 * q.w; g.fillRect(c.x + Math.cos(a) * d - 2, c.y + Math.sin(a) * d * .8 - 2, 4, 4); }); } });
  };
  P.fxLock = function (target) {
    var self = this; this.addFx({ layer: 'over', life: 1300, draw: function (g, p) {
      var F = self.F[target], s = F.s, c = self.pt(target, 'chest'), a = Math.min(1, p * 5) * (1 - Math.max(0, (p - .8) / .2)); g.globalAlpha = a; g.lineWidth = 5; g.strokeStyle = C.ink; var d = function () { [-1, 1].forEach(function (k) { g.beginPath(); g.moveTo(c.x - 96 * s, c.y + k * 44 * s); g.lineTo(c.x - 30 * s, c.y + k * 44 * s); g.moveTo(c.x + 30 * s, c.y + k * 44 * s); g.lineTo(c.x + 96 * s, c.y + k * 44 * s); g.stroke(); }); }; d(); g.lineWidth = 2; g.strokeStyle = C.amber; d(); g.strokeRect(c.x - 20 * s, c.y - 64 * s, 40 * s, 128 * s); } });
  };
  P.fxRipple = function (x, y, col, R0) { this.addFx({ layer: 'under', life: 700, draw: function (g, p) { g.globalAlpha = 1 - p; g.strokeStyle = col || C.bone; g.lineWidth = 2.4; g.beginPath(); g.ellipse(x, y, (R0 || 40) + p * 220, (R0 || 40) * .22 + p * 42, 0, 0, TAU); g.stroke(); } }); };
  P.fxSparks = function (x, y, n, col) { var r = A.rng((x * 7 + y) | 0); var pts = []; for (var i = 0; i < n; i++) pts.push({ a: r() * TAU, v: 60 + r() * 220, l: 6 + r() * 16 }); this.addFx({ layer: 'over', life: 520, draw: function (g, p) { g.globalAlpha = 1 - p; g.strokeStyle = col || C.amber; g.lineWidth = 2; pts.forEach(function (q) { var d = q.v * E.out3(p); g.beginPath(); g.moveTo(x + Math.cos(q.a) * d, y + Math.sin(q.a) * d); g.lineTo(x + Math.cos(q.a) * (d + q.l * (1 - p)), y + Math.sin(q.a) * (d + q.l * (1 - p))); g.stroke(); }); } }); };

  /* ---------- impacts ---------- */
  P.hitOn = function (side, dmg, kind) {
    var sev = dmg < 4 ? 1 : dmg < 9 ? 2 : 3, F = this.F[side], p = this.pt(side, 'chest'), fast = this.rt && this.rt.fast, dir = -this.dirOf(side) * -1;
    this.fxBurst(p.x, p.y, 34 + sev * 24, sev >= 3);
    if (!fast) { this.stop([0, 50, 90, 150][sev]); this.shake([0, 5, 10, 18][sev]); if (sev >= 2) { this.frameFx.lines = .8; this.frameFx.lx = p.x / this.W; this.frameFx.ly = p.y / this.H; } if (sev >= 3) { this.flash = .5; this.frameFx.ink = .5; this.zoom(1.09, p.x, p.y); var self = this; this.rt.q.push({ t: this.rt.t + 420, fn: function () { self.cam0(); } }); } }
    F.pose.flash = 1; var away = -this.dirOf(side); this.tw(F.pose, 'dx', away * (10 + sev * 14), 140, 0, E.out3); this.tw(F.pose, 'rot', -away * -.04 * sev * (side === 'a' ? -1 : -1), 140, 0); F.pose.hurt = Math.min(1, .5 + sev * .2); F.pose.sway = away * -.5;
    var words = [['', ''], ['TAP', '撃'], ['THUD', '撃'], ['CRASH', '砕']][sev]; if (kind !== 'graze') this.sfx(words[0], p.x + this.dirOf(side) * -50, p.y + 30, 'hit s' + sev, words[1]); this.snd('hit' + sev);
    this.pop(side, '−' + Math.round(dmg), sev >= 3 ? C.oxide : C.paper, sev >= 3, -70);
  };
  P.blocked = function (side) {
    var F = this.F[side], p = this.pt(side, 'front'); this.fxSparks(p.x, p.y, 16, C.paper); this.fxBurst(p.x, p.y, 34, false); this.stop(40); this.shake(4); this.sfx('CLACK', p.x - this.dirOf(side) * -10, p.y - 60, 'blk', '防'); this.snd('block');
    var self = this; this.tw(F.pose, 'dx', -this.dirOf(side) * 8, 90, 0);
  };

  /* ---------- the round ---------- */
  P.plan = function (Rd, fast) {
    var S_ = this, rt = this.rt, at = function (t, fn) { rt.q.push({ t: t, fn: fn }); }, n = this.names, Fa = this.F.a, Fb = this.F.b;
    var va = this.verb(Rd, 'a'), vb = this.verb(Rd, 'b'), da = dv(Rd, 'a'), db = dv(Rd, 'b'), dmg = { a: -da.vitality, b: -db.vitality };
    var cnt = { a: Rd.a.action === 'COUNTER', b: Rd.b.action === 'COUNTER' }, hitC = { a: cnt.a && Rd.a.prediction === Rd.b.action, b: cnt.b && Rd.b.prediction === Rd.a.action };
    var sigs = Rd.a.action === 'SIGNATURE' || Rd.b.action === 'SIGNATURE', off = sigs && !fast ? 900 : 0, T = function (t) { return t + off; };
    var V = { a: va, b: vb }, pose = function (s) { return S_.F[s].pose; }, dirS = function (s) { return S_.dirOf(s); };
    var lore = [];
    // ---- LOCK ----
    at(0, function () { this.setPhase('LOCK', 'd2'); this.dom.rn.textContent = Rd.n; this.markTimeline(Rd.n); this.dom.banA.className = 'cs-banner a'; this.dom.banB.className = 'cs-banner b'; this.dom.lcA.className = 'cs-lockchip a'; this.dom.lcB.className = 'cs-lockchip b'; this.dom.cut.className = 'cs-cut'; this.stamp(null, false); this.dom.stamp.classList.remove('on'); this.dom.seal.classList.remove('closed'); this.caption('Round ' + Rd.n + '. Both agents choose at the same time, blind.', ''); this.dom.chg.innerHTML = ''; this.snd('tick'); ['a', 'b'].forEach(function (s) { if (this.F[s].cold === 0) { this.tw(this.F[s].pose, 'tilt', -.08, 260); this.tw(this.F[s].pose, 'crouch', .18, 300); } }, this); this.cam0(); });
    at(280, function () { this.lockChip('a'); this.snd('lock'); });
    at(470, function () { this.lockChip('b'); this.snd('lock'); this.dom.seal.classList.add('closed'); });
    // ---- REVEAL ----
    at(640, function () {
      this.setPhase('REVEAL', 'd0'); this.banner('a', Rd.a); this.banner('b', Rd.b); this.flash = fast ? 0 : .35; this.frameFx.lines = fast ? 0 : .5; this.frameFx.lx = .5; this.frameFx.ly = .5; this.snd('slam'); this.dom.lcA.className = 'cs-lockchip a'; this.dom.lcB.className = 'cs-lockchip b';
      this.caption(this.describeChoice(Rd), '');
      var lines = []; [va, vb].forEach(function (v, i) { var x = i ? Rd.b : Rd.a, key = x.action; var c = S_.unlock(key); if (c) lines.push(c[0] + ' — ' + c[1]); }); if (lines.length) { this.dom.lore.textContent = lines[0]; this.dom.lore.classList.add('on'); }
      ['a', 'b'].forEach(function (s) { rest(s); this.tw(this.F[s].pose, 'dx', dirS(s) * -14, 260, 0, E.out3); }, this);
    });
    if (sigs) { at(1300, function () { ['a', 'b'].forEach(function (q) { if (Rd[q].action === 'SIGNATURE') { S_.tw(pose(q), 'up', 1, 260, 0, E.out3); S_.tw(pose(q), 'ready', 0, 200); } }); var s = Rd.a.action === 'SIGNATURE' ? 'a' : 'b'; this.cutin(s, Rd[s].signatureId); this.snd('signature'); this.stop(0); if (Rd.a.action === 'SIGNATURE' && Rd.b.action === 'SIGNATURE') { var self = this; this.rt.q.push({ t: this.rt.t + 950, fn: function () { self.cutin('b', Rd.b.signatureId); } }); } }); }
    // ---- CLASH ----
    at(T(1300), function () { this.setPhase('CLASH', 'd0'); if (!fast) this.zoom(1.05, (Fa.x + Fb.x) / 2, this.H * .6); });
    var imp = T(1760), stag = function (s, t0) { return t0; };
    var mutual = va.k === 'strike' && vb.k === 'strike', wasCounterHit = hitC.a || hitC.b;
    var dashDx = function (s, mut) { var o = S_.opp(s), F = S_.F[s], O = S_.F[o], d = dirS(s), sep = (mut === 'far' ? 270 : 150) * F.s, tx = mut === true ? F.x + d * ((Math.abs(O.x - F.x) - sep) / 2) : O.x + O.pose.dx * O.s - d * sep; return (tx - F.x) / F.s; };
    var stance = function (s, params, dur, delay) { Object.keys(params).forEach(function (k) { S_.tw(pose(s), k, params[k], dur || 220, delay || 0, E.out3); }); };
    var rest = function (s, delay) { if (S_.F[s].cold) return; var Rr = S.REST; Object.keys(Rr).forEach(function (k) { S_.tw(pose(s), k, Rr[k], 460, delay || 0, E.io3); }); S_.tw(pose(s), 'dx', 0, 460, delay || 0, E.io3); S_.tw(pose(s), 'rot', 0, 300, delay || 0); };
    var doOwn = function (s, k, X) {
      var o = S_.opp(s), F = S_.F[s], d = dirS(s), gap = S_.gap(), ph = S_.pt(s, 'head');
      if (k === 'strike') { at(T(1310), function () { stance(s, { armF: -.35, lean: -.25, stride: .7, crouch: .3, ready: 0 }, 170); }); at(T(1420), function () { S_.tw(pose(s), 'dx', dashDx(s, mutual ? true : wasCounterHit ? 'far' : false), 360, 0, E.outBack); pose(s).ghost = 1; pose(s).ghostDir = d; stance(s, { armF: 1, lean: 1, stride: 1, crouch: .35, ready: 0 }, 200); S_.snd('whoosh'); }); at(T(1580), function () { var a = S_.pt(s, 'front'), b = S_.pt(o, 'chest'); S_.fxSlash({ x: a.x + d * 10, y: a.y }, { x: b.x - d * 30, y: b.y + 10 * F.s }, { w: 30, col: C.paper, edge: s === 'a' ? C.oxide : C.coldHi, bend: s === 'a' ? .2 : -.2 }); }); at(T(2200), function () { pose(s).ghost = 0; rest(s); }); }
      else if (k === 'guard') { at(T(1320), function () { S_.fxShield(s, 1800, X && X.sig === 'COUNTERFACTUAL_SHIELD'); stance(s, { guard: 1, ready: 0, crouch: .32, stride: .35 }, 200); S_.tw(pose(s), 'dx', d * -10, 200); S_.snd('shield'); }); at(T(2500), function () { rest(s); }); }
      else if (k === 'trace') { at(T(1340), function () { S_.fxScan(s, o); stance(s, { raise: 1, ready: 0, tilt: .12 }, 260); S_.sfx('SCAN', S_.pt(o, 'head').x, S_.pt(o, 'head').y - 40, 'scan', '観'); S_.snd('scan'); }); at(T(2300), function () { rest(s); }); }
      else if (k === 'adapt') { at(T(1340), function () { S_.fxRingAdapt(s); stance(s, { open: 1, ready: 0, crouch: .12 }, 260); S_.tw(pose(s), 'ring', 3.2, 900, 0, E.io3); S_.sfx('SHIFT', ph.x, ph.y - 60, 'adp', '変'); S_.snd('adapt'); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'mirror' || k === 'echo') { at(T(1340), function () { S_.fxGhost(s, o, k === 'echo' ? 3 : 1); stance(s, { ready: 1, armF: .45, stride: .5 }, 240); S_.sfx('ECHO', ph.x + d * 60, ph.y - 40, 'mir', '映'); S_.snd('mirror'); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'recover') { at(T(1340), function () { S_.fxRecover(s); stance(s, { crouch: .75, ready: 0, tilt: .28, stride: .1 }, 380); S_.sfx('EXHALE', ph.x - d * 40, ph.y - 40, 'rec', '癒'); S_.snd('recover'); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'repair') { at(T(1340), function () { S_.fxSwarm(s); stance(s, { open: .5, crouch: .35, ready: 0 }, 260); S_.sfx('MEND', ph.x, ph.y - 40, 'rec', '癒'); S_.snd('recover'); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'lock') { at(T(1340), function () { S_.fxLock(o); stance(s, { armF: .9, lean: .3, ready: 0, stride: .5 }, 240); S_.sfx('LOCK', S_.pt(o, 'head').x, S_.pt(o, 'head').y - 30, 'lck', '封'); S_.snd('shield'); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'veil') { at(T(1340), function () { pose(s).ghost = 1; pose(s).ghostDir = d; S_.tw(pose(s), 'dx', d * -50, 320, 0, E.out3); stance(s, { open: .35, lean: -.3, ready: 0 }, 240); S_.tw(pose(s), 'ghost', 0, 900); S_.sfx('VEIL', ph.x, ph.y - 40, 'mir', '幕'); }); at(T(2300), function () { rest(s); }); }
      else if (k === 'stall') { at(T(1340), function () { stance(s, { crouch: .6, hurt: .5, ready: 0 }, 380); pose(s).glitch = 1; S_.sfx('STALL', ph.x, ph.y - 40, 'blk', '滞'); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'counter') { at(T(1320), function () { stance(s, { ready: 1, crouch: .3, stride: .55, guard: .25 }, 240); }); at(T(2300), function () { rest(s); }); }
      if (X && X.sig) { at(T(1300), function () { stance(s, { up: 0 }, 160); }); }
    };
    if (wasCounterHit) {
      var c = hitC.a ? 'a' : 'b', o = this.opp(c), dc = dirS(c), F = this.F[c];
      if (V[o].k === 'strike') doOwn(o, 'strike', V[o]); else doOwn(o, V[o].k, V[o]);
      at(T(1330), function () { stance(c, { ready: 1, crouch: .3, stride: .55, guard: .3 }, 220); });
      at(T(1600), function () { this.fxBrackets(c); this.stop(0); });
      at(T(1700), function () { this.stop(140); this.flash = fast ? 0 : .4; this.frameFx.ink = fast ? 0 : .35; this.shake(8); var p = this.pt(c, 'front'); this.fxSparks(p.x, p.y, 20, C.amber); this.sfx('SNAP', p.x, this.pt(c, 'head').y - 90, 'ctr', '反'); this.snd('counter'); stance(c, { guard: 1, ready: 0 }, 90); this.pop(c, 'READ', C.amber, true, -110); if (dmg[c] > .3) this.hitOn(c, dmg[c], 'graze'); });
      at(T(1900), function () { var a = this.pt(c, 'front'), b = this.pt(o, 'chest'); this.tw(pose(c), 'dx', dashDx(c, false), 260, 0, E.outBack); pose(c).ghost = 1; pose(c).ghostDir = dc; stance(c, { guard: 0, armF: 1, lean: 1, stride: 1, crouch: .35, ready: 0 }, 160); this.fxSlash({ x: a.x, y: a.y }, { x: b.x - dc * 30, y: b.y + 8 }, { w: 40, col: C.amber, edge: C.paper, bend: .25 }); this.snd('whoosh'); });
      at(T(2120), function () { pose(c).ghost = 0; if (dmg[o] > .3) this.hitOn(o, dmg[o]); else { var p = this.pt(o, 'chest'); this.fxBurst(p.x, p.y, 40, false); } });
      at(T(2600), function () { rest(c); });
    } else {
      doOwn('a', va.k, va); doOwn('b', vb.k, vb);
      var strikeA = va.k === 'strike', strikeB = vb.k === 'strike';
      at(imp, function () {
        if (strikeA && strikeB) { var mx = (this.F.a.x + this.F.b.x) / 2; this.fxBurst(mx, this.F.a.y - 130 * this.F.a.s, 70, true); this.sfx('CLASH', mx, this.F.a.y - 250 * this.F.a.s, 'ctr', '衝'); this.snd('clash'); this.stop(70); }
        [['a', 'b', strikeB], ['b', 'a', strikeA]].forEach(function (q) { var tgt = q[0], atk = q[1], atkStrikes = q[2]; if (dmg[tgt] > .3) this.hitOn(tgt, dmg[tgt]); else if (atkStrikes) { if (V[tgt].k === 'guard') this.blocked(tgt); else { var p = this.pt(tgt, 'chest'); this.sfx('WHIFF', p.x, p.y - 60, 'blk', '空'); } } }, this);
      });
    }
    // ---- RESOLVE ----
    var RS = T(2950) + (wasCounterHit ? 300 : 0);
    at(RS, function () {
      this.setPhase('RESOLVE', 'd0'); this.cam0(); this.setPlate('a', Rd.post.a, false); this.setPlate('b', Rd.post.b, false); this.caption(this.describeChoice(Rd) + ' ' + this.describeResult(Rd), ''); this.chg(Rd);
      var lore = null; if (Rd.pre.a.r.heat < 70 && Rd.post.a.r.heat >= 70 || Rd.pre.b.r.heat < 70 && Rd.post.b.r.heat >= 70) lore = this.unlock('BRIGHT'); if (!lore && (Rd.pre.a.r.drift < 60 && Rd.post.a.r.drift >= 60 || Rd.pre.b.r.drift < 60 && Rd.post.b.r.drift >= 60)) lore = this.unlock('STRAINED');
      if (lore) { this.dom.lore.textContent = lore[0] + ' — ' + lore[1]; this.dom.lore.classList.add('on'); }
      ['a', 'b'].forEach(function (s) { var d = dv(Rd, s); if (d.focus >= 8) this.pop(s, '+' + Math.round(d.focus) + ' FOCUS', C.coldHi, false, -60); if (d.heat <= -8) this.pop(s, '−' + Math.abs(Math.round(d.heat)) + ' HEAT', C.paper, false, -60); if (d.vitality >= 4) this.pop(s, '+' + Math.round(d.vitality) + ' VIT', C.paper, false, -60); if (d.drift >= 5) this.pop(s, '+' + Math.round(d.drift) + ' DRIFT', C.oxide, false, -100); }, this);
      ['a', 'b'].forEach(function (s) { rest(s); }, this);
    });
    at(RS + 900, function () { this.setPhase('PROOF', 'd0'); this.stamp(Rd, true); this.snd('seal'); });
    var end = RS + 1750; rt.dur = Math.max(4700, end);
    // ---- finish ----
    if (Rd.n === this.M.rounds.length && this.M.outcome) {
      var oc = this.M.outcome, win = oc && oc.winner ? oc.winner.toLowerCase() : null, lose = win ? this.opp(win) : null;
      at(end + 250, function () { this.setPhase('PROOF COMPLETE', 'd0'); if (!fast) { this.flash = .6; this.stop(160); } if (lose) { this.tw(this.F[lose], 'cold', 1, 900, 0, E.io3); this.tw(pose(lose), 'rot', .1, 900); this.tw(pose(lose), 'tilt', .35, 900); } this.tw(this, 'ringClose', win ? .9 : .3, 2200, 0, E.io3); if (win) { this.tw(pose(win), 'up', 1, 600, 0, E.out3); this.tw(pose(win), 'ready', 0, 300); this.zoom(1.14, this.F[win].x, this.F[win].y - 160 * this.F[win].s); } this.snd('victory'); this.sfx('END', this.W / 2, this.H * .3, 'end', '終'); });
      at(end + 1900, function () { this.cam0(); });
      rt.dur = end + 2600;
    }
    if (fast) rt.dur = rt.dur;
  };
})();
