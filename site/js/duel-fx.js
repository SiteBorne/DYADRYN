/* DYADRYN Duel Table — cards, effects and round choreography.
   Each round: LOCK (cards arrive face-down) → REVEAL (flip) → CLASH (cards meet on the ring, masks act) → RESOLVE (meters settle) → PROOF (hash seals).
   Everything that lands is driven by the recorded resource deltas — nothing is invented. */
(function () {
  'use strict';
  var DY = window.DY, D = DY.Duel, P = D.prototype, A = DY.StageArt, K = DY.DuelKit, C = A.C, E = A.E, cl = A.cl, TAU = A.TAU, MOVE = D.MOVE, ICO = D.ICO, SIGN = D.SIGN, SIGCLASS = D.SIGCLASS, KANJI = D.KANJI, MCLS = D.MCLS, dv = D.dv;
  var INT = ['', 'Light', 'Standard', 'Heavy'], COST = { Low: 1, 'Low–medium': 1, Medium: 2, 'Medium–high': 2 };
  function kj(ch) { return (DY.KJ && DY.KJ[ch]) || ''; }

  P.verb = function (Rd, side) {
    var x = Rd[side];
    if (x.action === 'STALL') return { k: 'stall' }; if (x.action === 'SIGNATURE') return { k: SIGCLASS[x.signatureId] || 'strike', sig: x.signatureId };
    if (x.action === 'MIRROR') { var pr = this.M.rounds[Rd.n - 2], po = pr ? pr[side === 'a' ? 'b' : 'a'] : null; if (po) { var m = { PRESS: 'strike', GUARD: 'guard', TRACE: 'trace', RECOVER: 'recover', ADAPT: 'adapt', COUNTER: 'counter' }[po.action]; if (m) return { k: m, mirror: po.action }; } return { k: 'mirror' }; }
    return { k: { TRACE: 'trace', PRESS: 'strike', GUARD: 'guard', COUNTER: 'counter', ADAPT: 'adapt', RECOVER: 'recover' }[x.action] || 'strike' };
  };
  P.opp = function (s) { return s === 'a' ? 'b' : 'a'; };
  P.dirOf = function (s) { return s === 'a' ? 1 : -1; };

  /* ---------- cards ---------- */
  var BACK = '<svg viewBox="0 0 100 140" aria-hidden="true"><rect x="6" y="6" width="88" height="128" fill="none" stroke="currentColor" stroke-width="2"/><path d="M50 30a26 26 0 1 1-18.4 7.6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M40 52h-8v36h8M60 52h8v36h-8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M50 40v64" stroke="#D63A32" stroke-width="3"/></svg>';
  P.cardHTML = function (x, side) {
    var k = x.action, c = MCLS[k] || MCLS.STALL, mv = (DY.MOVES || []).filter(function (m) { return m.k === k; })[0] || {}, sg = k === 'SIGNATURE' ? (DY.SIGS || []).filter(function (s) { return s.id === x.signatureId; })[0] : null;
    var name = k === 'SIGNATURE' ? (SIGN[x.signatureId] || 'Signature') : (MOVE[k] || k), line = sg ? sg.tag : (mv.line || ''), tx = sg ? sg.desc : (mv.gain || ''), cost = COST[mv.energy] != null ? COST[mv.energy] : 0, sub = k === 'COUNTER' ? 'reads ' + MOVE[x.prediction] : k === 'ADAPT' ? (x.adaptStance || '').toLowerCase() + ' stance' : '';
    var pips = function (n, max) { var s = ''; for (var i = 1; i <= max; i++) s += '<i class="' + (i <= n ? 'on' : '') + '"></i>'; return s; };
    return '<div class="dt-card ' + side + '" style="--c:' + c.c + '"><div class="ci"><div class="cb">' + BACK + '<span class="lk">' + DY.icon('lock', 14) + 'SEALED</span></div><div class="cf"><header><span class="cost" title="Energy cost">' + pips(cost, 3) + '</span><b>' + name + '</b></header><div class="art"><span class="kj" aria-hidden="true">' + kj(KANJI[k]) + '</span><span class="emb">' + DY.icon(ICO[k] || 'drift', 44) + '</span></div><div class="ty"><span>' + c.t + (sub ? ' · ' + sub : '') + '</span><span class="ip" title="Intensity">' + pips(x.intensity || 0, 3) + '</span></div><p class="tx"><b>' + line + '</b><span>' + tx + '</span></p></div></div></div>';
  };
  P.layoutCards = function () {
    var cw = Math.round((this.W < 700 ? Math.round(this.W * .36) : Math.max(150, Math.min(this.H * .34, this.W * .3)))), ch = Math.round(cw * 1.5), Ra = this.R.a, Rb = this.R.b, rc = this.ringC(); this.cw = cw; this.ch = ch; this.dom.cards.style.setProperty('--cw', cw + 'px');
    this.slot = { a: { x: Ra.x + Ra.w - cw * .1, y: Ra.y + Ra.h - ch * .36 }, b: { x: Rb.x + cw * .1, y: Rb.y + Rb.h - ch * .36 } }; this.clashAt = { a: { x: rc.x - cw * (this.W < 700 ? .56 : .6), y: rc.y - ch * (this.W < 700 ? .3 : .02) }, b: { x: rc.x + cw * (this.W < 700 ? .56 : .6), y: rc.y - ch * (this.W < 700 ? .3 : .02) } };
  };
  P.clearCards = function () { if (this.dom && this.dom.cards) this.dom.cards.innerHTML = ''; this.cards = { a: null, b: null }; };
  P.spawnCard = function (side, x, ghost) {
    var w = document.createElement('div'); w.innerHTML = this.cardHTML(x, side); var node = w.firstChild; if (ghost) node.classList.add('ghost'); this.dom.cards.appendChild(node);
    var s = { x: side === 'a' ? -this.cw : this.W + this.cw, y: this.slot[side].y, rot: 0, sc: 1, flip: ghost ? 1 : 0, a: 1, glow: 0, z: ghost ? 3 : 1 }; var key = ghost ? side + 'g' : side; this.cards[key] = { el: node, s: s, x: x }; this.applyCards(); return this.cards[key];
  };
  P.applyCards = function () {
    if (!this.cards) return; for (var k in this.cards) { var c = this.cards[k]; if (!c) continue; var s = c.s; c.el.style.transform = 'translate(' + (s.x - this.cw / 2).toFixed(1) + 'px,' + (s.y - this.ch / 2).toFixed(1) + 'px) rotate(' + s.rot.toFixed(3) + 'rad) scale(' + s.sc.toFixed(3) + ')'; c.el.style.opacity = s.a; c.el.style.zIndex = s.z | 0; c.el.style.setProperty('--glow', s.glow.toFixed(2)); c.el.firstChild.style.transform = 'rotateY(' + ((1 - s.flip) * 180).toFixed(1) + 'deg)'; }
  };
  P.wipe = function (kind) { if (this.reduce || (this.rt && this.rt.fast)) return; var w = this.dom.wipe; w.className = 'dt-wipe'; void w.offsetWidth; w.className = 'dt-wipe go ' + kind; };

  /* ---------- DOM effects ---------- */
  P.sfx = function (text, x, y, cls, kanji) {
    if (this.rt && this.rt.fast) return; var n = document.createElement('span'); n.className = 'sf ' + (cls || ''); n.innerHTML = '<b>' + text + '</b>' + (kanji && kj(kanji) ? '<i>' + kj(kanji) + '</i>' : ''); n.style.left = (x / this.W * 100) + '%'; n.style.top = (y / this.H * 100) + '%'; n.style.setProperty('--r', (Math.random() * 10 - 5).toFixed(1) + 'deg'); this.dom.sfx.appendChild(n); setTimeout(function () { n.remove(); }, 1100);
  };
  P.cutin = function (side, id) {
    var c = this.dom.cut, nm = SIGN[id] || 'Signature', who = this.names[side], st = K.sty(this.F[side].arch);
    c.innerHTML = '<div class="ci-band ' + side + '" style="--acc:' + st.acc + '"><span class="ci-mask">' + kj(st.kj) + '</span><div class="ci-t"><small>' + who + ' · Signature</small><b>' + nm + '</b><em>' + kj('印') + '</em></div></div>'; c.className = 'cs-cut on ' + side; var self = this; setTimeout(function () { c.className = 'cs-cut'; }, 1000 / Math.max(.5, this.speed));
  };
  P.drawFx = function (g, layer, ts) {
    for (var i = 0; i < this.fx.length; i++) { var f = this.fx[i]; if (f.layer !== layer) continue; var p = cl(f.age / f.life, 0, 1); g.save(); f.draw.call(this, g, p, f, ts); g.restore(); }
    if (layer === 'over') for (var j = 0; j < this.pops.length; j++) { var q = this.pops[j], pp = q.age / q.life, y = q.y - 50 * E.out3(pp); g.save(); g.globalAlpha = pp < .7 ? 1 : 1 - (pp - .7) / .3; g.font = '700 ' + Math.round(this.H * .05 * (q.big ? 1.3 : 1)) + 'px "IBM Plex Sans Condensed",sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = C.ink; g.strokeText(q.t, q.x, y); g.fillStyle = q.c; g.fillText(q.t, q.x, y); g.restore(); }
  };

  /* ---------- canvas effects ---------- */
  P.fxBurst = function (x, y, size, heavy) {
    this.addFx({ layer: 'over', life: 440, draw: function (g, p) { var r = size * (.35 + p * .95), n = 14, a = 1 - p; g.globalAlpha = a; g.translate(x, y); g.rotate(p * .4); g.beginPath(); for (var i = 0; i < n * 2; i++) { var an = i / (n * 2) * TAU, rr = i % 2 ? r * .46 : r * (i % 4 ? .9 : 1.15); g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } g.closePath(); g.fillStyle = heavy ? '#FFF1D8' : '#F4EEDF'; g.fill(); g.lineWidth = 4; g.lineJoin = 'miter'; g.strokeStyle = '#0A080A'; g.stroke(); g.beginPath(); g.arc(0, 0, r * .3, 0, TAU); g.fillStyle = heavy ? '#E0453A' : '#D2A25E'; g.fill(); } });
  };
  P.fxShock = function (x, y, R, col) { this.addFx({ layer: 'under', life: 640, draw: function (g, p) { g.strokeStyle = col || '#F4EEDF'; for (var i = 0; i < 2; i++) { var pp = cl(p * 1.15 - i * .15, 0, 1); g.globalAlpha = (1 - pp) * .9; g.lineWidth = 7 * (1 - pp) + 1; g.beginPath(); g.ellipse(x, y, R * pp, R * pp * .86, 0, 0, TAU); g.stroke(); } } }); };
  P.fxSparks = function (x, y, n, col) { var r = A.rng((x * 7 + y) | 0), pts = []; for (var i = 0; i < n; i++) pts.push([r() * TAU, 30 + r() * 120, 6 + r() * 16]); this.addFx({ layer: 'over', life: 520, draw: function (g, p) { g.strokeStyle = col || C.paper; g.lineWidth = 2.4; g.globalAlpha = 1 - p; pts.forEach(function (q) { var d0 = q[1] * E.out3(p), d1 = d0 + q[2] * (1 - p); g.beginPath(); g.moveTo(x + Math.cos(q[0]) * d0, y + Math.sin(q[0]) * d0); g.lineTo(x + Math.cos(q[0]) * d1, y + Math.sin(q[0]) * d1); g.stroke(); }); } }); };
  P.fxSlash = function (from, to, o) {
    o = o || {}; this.addFx({ layer: 'over', life: 360, draw: function (g, p) { var w = (o.w || 34) * Math.sin(Math.min(1, p * 1.4) * Math.PI) , mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2 - (o.bend || 60), tx = from.x + (to.x - from.x) * E.out3(Math.min(1, p * 1.6)), ty = from.y + (to.y - from.y) * E.out3(Math.min(1, p * 1.6)); g.globalAlpha = 1 - Math.max(0, p - .6) / .4; g.beginPath(); g.moveTo(from.x, from.y); g.quadraticCurveTo(mx, my - w, tx, ty); g.quadraticCurveTo(mx, my + w * .4, from.x, from.y); g.fillStyle = o.col || C.paper; g.fill(); g.lineWidth = 3; g.strokeStyle = o.edge || '#0A080A'; g.stroke(); } });
  };
  P.fxBeam = function (from, to, col) {
    this.addFx({ layer: 'over', life: 1000, draw: function (g, p) { var a = Math.sin(p * Math.PI), dx = to.x - from.x, dy = to.y - from.y, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, w = 38; g.globalCompositeOperation = 'lighter'; var gr = g.createLinearGradient(from.x, from.y, to.x, to.y); gr.addColorStop(0, col + '00'); gr.addColorStop(1, col + '88'); g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(to.x + nx * w, to.y + ny * w); g.lineTo(to.x - nx * w, to.y - ny * w); g.closePath(); g.fill(); g.strokeStyle = col; g.lineWidth = 2.4; g.beginPath(); g.arc(to.x, to.y, 40 + (1 - p) * 30, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(to.x - 56, to.y); g.lineTo(to.x + 56, to.y); g.moveTo(to.x, to.y - 56); g.lineTo(to.x, to.y + 56); g.stroke(); } });
  };
  P.fxChains = function (side) { var c = this.center(side), HW = this.actorHW(side); this.addFx({ layer: 'over', life: 1100, draw: function (g, p) { var tight = E.io3(Math.min(1, p * 1.6)); g.globalAlpha = 1 - Math.max(0, p - .7) / .3; g.strokeStyle = '#E0A03A'; g.lineWidth = 4; for (var i = 0; i < 4; i++) { var a = i * TAU / 4 + .4, r = HW * (1.0 - tight * .42); g.beginPath(); g.ellipse(c.x, c.y, r, r * .9, a, 0, Math.PI * 1.3); g.setLineDash([10, 8]); g.stroke(); g.setLineDash([]); } g.lineWidth = 2; g.strokeStyle = '#0A080A'; g.beginPath(); g.ellipse(c.x, c.y, HW * (1.0 - tight * .42), HW * (1.0 - tight * .42) * .9, 0, 0, TAU); g.stroke(); } }); };
  P.fxMend = function (side, col) { var c = this.center(side), HW = this.actorHW(side), r = A.rng(side === 'a' ? 4 : 8), pts = []; for (var i = 0; i < 20; i++) pts.push([(r() - .5) * HW * 1.1, r() * HW * .9, .5 + r()]); this.addFx({ layer: 'over', life: 1300, draw: function (g, p) { g.globalCompositeOperation = 'lighter'; g.fillStyle = col || '#7FD18A'; pts.forEach(function (q) { var y = c.y + q[1] - p * HW * .9 * q[2]; g.globalAlpha = Math.sin(Math.min(1, p * 1.2) * Math.PI) * .8; g.beginPath(); g.arc(c.x + q[0], y, 3 + q[2] * 2, 0, TAU); g.fill(); }); var gr = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, HW * .7); gr.addColorStop(0, (col || '#7FD18A') + '55'); gr.addColorStop(1, (col || '#7FD18A') + '00'); g.globalAlpha = Math.sin(p * Math.PI); g.fillStyle = gr; g.beginPath(); g.arc(c.x, c.y, HW * .7, 0, TAU); g.fill(); } }); };
  P.fxEcho = function (side, ofSide) { var c = this.center(side), HW = this.actorHW(side), arch = this.F[ofSide].arch, dir = side === 'a' ? 1 : -1; this.addFx({ layer: 'over', life: 900, draw: function (g, p, f, ts) { g.globalAlpha = Math.sin(p * Math.PI) * .5; g.translate(c.x + dir * HW * .7 * E.out3(p), c.y); g.scale(-dir, 1); K.maskDraw(g, { flat: '#A97BE0' }, arch, ts, HW * .9, 0, 0); } }); };
  P.fxRing = function (side, col) { var c = this.center(side), HW = this.actorHW(side); this.addFx({ layer: 'over', life: 900, draw: function (g, p) { g.strokeStyle = col; g.globalAlpha = 1 - p; g.lineWidth = 5 * (1 - p) + 1; g.beginPath(); g.ellipse(c.x, c.y, HW * (.6 + p * .7), HW * (.6 + p * .7) * .9, 0, 0, TAU); g.stroke(); } }); };

  P.hitOn = function (side, dmg, kind) {
    var sev = dmg < 4 ? 1 : dmg < 9 ? 2 : 3, F = this.F[side], p = this.pt(side, 'chest'), fast = this.rt && this.rt.fast, away = -this.dirOf(side) * -1 * -1;
    this.fxBurst(p.x, p.y, 40 + sev * 26, sev >= 3); if (sev >= 2) { var fr = this.dom.frame; fr.classList.add('hit' + sev); setTimeout(function () { fr.classList.remove('hit2', 'hit3'); }, 170); } if (F.res) F.res.vitality = Math.max(0, F.res.vitality - dmg);
    if (!fast) { this.stop([0, 50, 90, 150][sev]); this.shake([0, 5, 10, 18][sev]); if (sev >= 2) { this.frameFx.lines = .8; this.frameFx.lx = p.x / this.W; this.frameFx.ly = p.y / this.H; } if (sev >= 3) { this.flash = .4; this.ifr = 90; this.frameFx.ink = .4; } }
    F.pose.flash = 1; var push = -this.dirOf(side) * (10 + sev * 14); this.tw(F.pose, 'dx', push, 140, 0, E.out3); F.pose.hurt = Math.min(1, .5 + sev * .2); F.pose.sway = -this.dirOf(side) * .5; F.pose.glitch = sev >= 2 ? .5 : 0;
    var words = [['', ''], ['TAP', '撃'], ['THUD', '撃'], ['CRASH', '砕']][sev]; if (kind !== 'graze') this.sfx(words[0], p.x - this.dirOf(side) * 40, p.y - 30, 'hit s' + sev, words[1]); this.snd('hit' + sev);
    this.pop(side, '−' + Math.round(dmg), sev >= 3 ? C.oxide : C.paper, sev >= 3, -90);
  };
  P.blocked = function (side) { var p = this.pt(side, 'front'); this.fxSparks(p.x, p.y, 16, C.paper); this.fxBurst(p.x, p.y, 38, false); this.stop(40); this.shake(4); this.sfx('CLACK', p.x, p.y - 60, 'blk', '防'); this.snd('block'); this.tw(this.F[side].pose, 'dx', -this.dirOf(side) * 8, 90, 0); };

  /* ---------- the round ---------- */
  P.plan = function (Rd, fast) {
    var S_ = this, rt = this.rt, at = function (t, fn) { rt.q.push({ t: t, fn: fn }); }, n = this.names, rc = this.ringC();
    var va = this.verb(Rd, 'a'), vb = this.verb(Rd, 'b'), da = dv(Rd, 'a'), db = dv(Rd, 'b'), dmg = { a: -da.vitality, b: -db.vitality };
    var cnt = { a: Rd.a.action === 'COUNTER', b: Rd.b.action === 'COUNTER' }, hitC = { a: cnt.a && Rd.a.prediction === Rd.b.action, b: cnt.b && Rd.b.prediction === Rd.a.action };
    var sigs = Rd.a.action === 'SIGNATURE' || Rd.b.action === 'SIGNATURE', off = sigs && !fast ? 900 : 0, T = function (t) { return t + off; };
    var V = { a: va, b: vb }, pose = function (s) { return S_.F[s].pose; }, dirS = function (s) { return S_.dirOf(s); }, cardOf = function (s) { return S_.cards[s]; };
    var stance = function (s, params, dur, delay) { Object.keys(params).forEach(function (k) { S_.tw(pose(s), k, params[k], dur || 220, delay || 0, E.out3); }); };
    var rest = function (s, delay) { if (S_.F[s].cold) return; var Rr = D.REST; Object.keys(Rr).forEach(function (k) { S_.tw(pose(s), k, Rr[k], 460, delay || 0, E.io3); }); S_.tw(pose(s), 'dx', 0, 460, delay || 0, E.io3); S_.tw(pose(s), 'rot', 0, 300, delay || 0); };
    var glowCard = function (s, v, dur) { var c = cardOf(s); if (c) { S_.tw(c.s, 'glow', v, dur || 200, 0, E.out3); } };

    /* LOCK — both lock blind, at the same time */
    at(0, function () {
      this.setPhase('LOCK', 'd2'); this.dom.rn.textContent = Rd.n; this.markTimeline(Rd.n); this.dom.cut.className = 'cs-cut'; this.stamp(null, false); this.dom.seal.classList.remove('closed'); this.caption('Round ' + Rd.n + ': both masks lock a move — blind, at the same time.', ''); this.dom.lore.classList.remove('on');
      ['a', 'b'].forEach(function (s) { stance(s, { ready: .7, crouch: .1, lean: -.5 }, 260); }); var ca = this.spawnCard('a', Rd.a), cb = this.spawnCard('b', Rd.b);
      this.tw(ca.s, 'x', this.slot.a.x, 440, 160, E.outBack); this.tw(cb.s, 'x', this.slot.b.x, 440, 300, E.outBack);
    });
    at(280, function () { this.snd('lock'); }); at(470, function () { this.snd('lock'); this.dom.seal.classList.add('closed'); });
    /* REVEAL — the engine opens both cards */
    at(640, function () {
      this.setPhase('REVEAL', 'd0'); this.wipe('bone'); this.flash = fast ? 0 : .3; this.frameFx.lines = fast ? 0 : .4; this.frameFx.lx = .5; this.frameFx.ly = .55; this.snd('slam'); this.caption(this.describeChoice(Rd), '');
      ['a', 'b'].forEach(function (s, i) { var c = cardOf(s); this.tw(c.s, 'flip', 1, 520, i * 110, E.out3); this.tw(c.s, 'sc', 1.12, 200, i * 110 + 380, E.out3); this.tw(c.s, 'sc', 1, 260, i * 110 + 620, E.io3); var p = { x: c.s.x, y: c.s.y - this.ch * .62 }; var x = Rd[s]; var nm = x.action === 'SIGNATURE' ? (SIGN[x.signatureId] || 'Signature') : (MOVE[x.action] || x.action); var self = this; rt.q.push({ t: rt.t + i * 110 + 380, fn: function () { self.sfx(nm.toUpperCase(), p.x, p.y, 'rev', KANJI[x.action]); } }); }, this);
      var lines = []; [va, vb].forEach(function (v, i) { var x = i ? Rd.b : Rd.a, key = x.action; var c = S_.unlock(key); if (c) lines.push(c[0] + ' — ' + c[1]); }); if (lines.length) { this.dom.lore.textContent = lines[0]; this.dom.lore.classList.add('on'); }
      ['a', 'b'].forEach(function (s) { rest(s); this.tw(this.F[s].pose, 'dx', dirS(s) * -14, 260, 0, E.out3); }, this);
    });
    if (sigs) at(1300, function () { ['a', 'b'].forEach(function (q) { if (Rd[q].action === 'SIGNATURE') { S_.tw(pose(q), 'up', 1, 260, 0, E.out3); S_.tw(pose(q), 'ready', 0, 200); } }); var s = Rd.a.action === 'SIGNATURE' ? 'a' : 'b'; this.cutin(s, Rd[s].signatureId); this.snd('signature'); this.stop(0); this.wipe('ink'); if (Rd.a.action === 'SIGNATURE' && Rd.b.action === 'SIGNATURE') { var s2 = this.opp(s); setTimeout(function () { S_.cutin(s2, Rd[s2].signatureId); }, 520 / Math.max(.5, S_.speed)); } });
    /* CLASH — the cards meet on the ring and the masks act */
    at(T(1300), function () {
      this.setPhase('CLASH', 'd0'); this.wipe('red'); ['a', 'b'].forEach(function (s) { var c = cardOf(s), to = this.clashAt[s], d = dirS(s); this.tw(c.s, 'x', to.x, 360, 0, E.outBack); this.tw(c.s, 'y', to.y, 360, 0, E.out3); this.tw(c.s, 'rot', d * -.07, 360, 0, E.out3); this.tw(c.s, 'sc', 1.08, 360, 0, E.out3); c.s.z = 2; }, this); if (!fast) this.zoom(1.04, rc.x, rc.y);
    });
    var imp = T(1760), mutual = va.k === 'strike' && vb.k === 'strike', wasCounterHit = hitC.a || hitC.b;
    var lunge = function (s) { return dirS(s) * S_.W * .11 * (mutual ? .8 : 1); };
    var doOwn = function (s, k, X) {
      var o = S_.opp(s), d = dirS(s), ph = S_.pt(s, 'head'), oh = S_.pt(o, 'head');
      if (k === 'strike') { at(T(1310), function () { stance(s, { armF: -.35, lean: -.7, crouch: .12, ready: 0 }, 170); }); at(T(1420), function () { S_.tw(pose(s), 'dx', lunge(s), 300, 0, E.outBack); pose(s).ghost = 1; stance(s, { armF: 1, lean: 1, crouch: 0, ready: 0 }, 200); S_.snd('whoosh'); glowCard(s, 1, 140); var c = cardOf(s); if (c) S_.tw(c.s, 'x', S_.clashAt[s].x + d * 40, 200, 0, E.outBack); S_.fxSlash(S_.pt(s, 'front'), { x: oh.x - d * 30, y: oh.y + 20 }, { w: 34, col: X && X.sig ? C.amber : C.paper, bend: 50 }); }); at(T(2500), function () { pose(s).ghost = 0; rest(s); }); }
      else if (k === 'guard') { at(T(1320), function () { stance(s, { guard: 1, ready: 0, crouch: .1 }, 200); S_.tw(pose(s), 'dx', d * -10, 200); S_.fxRing(s, '#6FA3FF'); S_.snd('shield'); glowCard(s, 1, 200); }); at(T(2500), function () { rest(s); }); }
      else if (k === 'trace') { at(T(1340), function () { S_.fxBeam(S_.pt(s, 'front'), oh, '#6FA3FF'); stance(s, { raise: 1, ready: 0 }, 260); S_.sfx('SCAN', oh.x, oh.y - 50, 'scan', '観'); S_.snd('scan'); glowCard(s, 1, 240); }); at(T(2300), function () { rest(s); }); }
      else if (k === 'adapt') { at(T(1340), function () { S_.fxRing(s, '#4FD1C5'); stance(s, { open: 1, ready: 0 }, 260); S_.tw(pose(s), 'ring', 3.2, 900, 0, E.io3); S_.sfx('SHIFT', ph.x, ph.y - 60, 'adp', '変'); S_.snd('adapt'); glowCard(s, 1, 240); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'mirror' || k === 'echo') { at(T(1340), function () { S_.fxEcho(s, o); var c = cardOf(o); if (c) { var g = S_.spawnCard(s, c.x, true); g.s.x = S_.clashAt[s].x; g.s.y = S_.clashAt[s].y; g.s.rot = c.s.rot; g.s.sc = 1.08; g.s.a = 0; S_.tw(g.s, 'a', .55, 260, 0, E.out3); S_.tw(g.s, 'x', S_.clashAt[s].x + d * -26, 400, 0, E.out3); } stance(s, { ready: 1 }, 240); S_.sfx('ECHO', ph.x, ph.y - 50, 'mir', '映'); S_.snd('mirror'); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'recover') { at(T(1340), function () { S_.fxMend(s, '#7FD18A'); stance(s, { crouch: .8, ready: 0, tilt: .3 }, 380); S_.sfx('EXHALE', ph.x, ph.y - 50, 'rec', '癒'); S_.snd('recover'); glowCard(s, 1, 240); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'repair') { at(T(1340), function () { S_.fxMend(s, '#D63A32'); stance(s, { open: .5, crouch: .3, ready: 0 }, 260); S_.sfx('MEND', ph.x, ph.y - 50, 'rec', '癒'); S_.snd('recover'); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'lock') { at(T(1340), function () { S_.fxChains(o); stance(s, { armF: .9, lean: .4, ready: 0 }, 240); S_.sfx('LOCK', oh.x, oh.y - 40, 'lck', '封'); S_.snd('shield'); glowCard(s, 1, 240); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'veil') { at(T(1340), function () { pose(s).ghost = 1; S_.tw(pose(s), 'dx', d * -50, 320, 0, E.out3); stance(s, { open: .35, lean: -.4, ready: 0 }, 240); S_.tw(pose(s), 'ghost', 0, 900); S_.sfx('VEIL', ph.x, ph.y - 50, 'mir', '幕'); glowCard(s, 1, 240); }); at(T(2300), function () { rest(s); }); }
      else if (k === 'stall') { at(T(1340), function () { stance(s, { crouch: .5, hurt: .4, ready: 0 }, 380); pose(s).glitch = 1; S_.sfx('STALL', ph.x, ph.y - 50, 'blk', '滞'); var c = cardOf(s); if (c) S_.tw(c.s, 'a', .45, 300); }); at(T(2400), function () { rest(s); }); }
      else if (k === 'counter') { at(T(1320), function () { stance(s, { ready: 1, crouch: .14, guard: .2 }, 240); glowCard(s, 1, 220); }); at(T(2300), function () { rest(s); }); }
      if (X && X.sig) at(T(1300), function () { stance(s, { up: 0 }, 160); });
    };
    if (wasCounterHit) {
      var c = hitC.a ? 'a' : 'b', o = this.opp(c), dc = dirS(c);
      doOwn(o, V[o].k, V[o]);
      at(T(1330), function () { stance(c, { ready: 1, crouch: .14, guard: .3 }, 220); glowCard(c, 1, 200); });
      at(T(1600), function () { var p = S_.pt(c, 'front'); S_.fxRing(c, '#E0A03A'); S_.stop(0); S_.sfx('READ', p.x, p.y - 80, 'scan', '反'); });
      at(T(1700), function () { this.stop(140); this.flash = fast ? 0 : .4; this.ifr = fast ? 0 : 90; this.frameFx.ink = fast ? 0 : .3; this.shake(8); var p = this.pt(c, 'front'); this.fxSparks(p.x, p.y, 22, C.amber); this.fxShock(rc.x, rc.y, rc.r * 1.6, '#E0A03A'); this.sfx('SNAP', rc.x, rc.y - 60, 'ctr', '反'); this.snd('counter'); stance(c, { guard: 1, ready: 0 }, 90); this.pop(c, 'READ', C.amber, true, -130); if (dmg[c] > .3) this.hitOn(c, dmg[c], 'graze'); });
      at(T(1900), function () { var a = this.pt(c, 'front'), b = this.pt(o, 'chest'); this.tw(pose(c), 'dx', lunge(c) * .8, 260, 0, E.outBack); pose(c).ghost = 1; stance(c, { guard: 0, armF: 1, lean: 1, crouch: 0, ready: 0 }, 160); this.fxSlash({ x: a.x, y: a.y }, { x: b.x - dc * 30, y: b.y + 8 }, { w: 40, col: C.amber, edge: C.paper, bend: 70 }); this.snd('whoosh'); });
      at(T(2120), function () { pose(c).ghost = 0; if (dmg[o] > .3) this.hitOn(o, dmg[o]); else { var p = this.pt(o, 'chest'); this.fxBurst(p.x, p.y, 44, false); } });
      at(T(2600), function () { rest(c); });
    } else {
      doOwn('a', va.k, va); doOwn('b', vb.k, vb); var strikeA = va.k === 'strike', strikeB = vb.k === 'strike';
      at(imp, function () {
        this.fxShock(rc.x, rc.y, rc.r * 1.3, strikeA || strikeB ? '#E0453A' : '#F4EEDF');
        if (strikeA && strikeB) { this.fxBurst(rc.x, rc.y, 90, true); this.sfx('CLASH', rc.x, rc.y - 70, 'ctr', '衝'); this.snd('clash'); this.stop(70); this.ifr = fast ? 0 : 70; }
        [['a', 'b', strikeB], ['b', 'a', strikeA]].forEach(function (q) { var tgt = q[0], atk = q[1], atkStrikes = q[2]; if (dmg[tgt] > .3) this.hitOn(tgt, dmg[tgt]); else if (atkStrikes) { if (V[tgt].k === 'guard') this.blocked(tgt); else { var p = this.pt(tgt, 'chest'); this.sfx('WHIFF', p.x, p.y - 70, 'blk', '空'); } } }, this);
        ['a', 'b'].forEach(function (s) { var c = cardOf(s); if (c && dmg[s] > .3) { S_.tw(c.s, 'a', .55, 260); S_.tw(c.s, 'rot', c.s.rot + dirS(s) * -.3, 220); } });
      });
    }
    /* RESOLVE — the meters settle */
    var RS = T(2950) + (wasCounterHit ? 300 : 0);
    at(RS, function () {
      this.setPhase('RESOLVE', 'd0'); this.cam0(); this.setPlate('a', Rd.post.a, false); this.setPlate('b', Rd.post.b, false); this.caption(this.describeChoice(Rd) + ' ' + this.describeResult(Rd), ''); this.chg(Rd);
      var lore = null; if (Rd.pre.a.r.heat < 70 && Rd.post.a.r.heat >= 70 || Rd.pre.b.r.heat < 70 && Rd.post.b.r.heat >= 70) lore = this.unlock('BRIGHT'); if (!lore && (Rd.pre.a.r.drift < 60 && Rd.post.a.r.drift >= 60 || Rd.pre.b.r.drift < 60 && Rd.post.b.r.drift >= 60)) lore = this.unlock('STRAINED');
      if (lore) { this.dom.lore.textContent = lore[0] + ' — ' + lore[1]; this.dom.lore.classList.add('on'); }
      ['a', 'b'].forEach(function (s) { var d = dv(Rd, s); if (d.focus >= 8) this.pop(s, '+' + Math.round(d.focus) + ' FOCUS', C.coldHi, false, -40); if (d.heat <= -8) this.pop(s, '−' + Math.abs(Math.round(d.heat)) + ' HEAT', C.paper, false, -40); if (d.vitality >= 4) this.pop(s, '+' + Math.round(d.vitality) + ' VIT', C.paper, false, -40); if (d.drift >= 5) this.pop(s, '+' + Math.round(d.drift) + ' DRIFT', C.oxide, false, -80); }, this);
      ['a', 'b'].forEach(function (s) { rest(s); var c = cardOf(s), g = S_.cards[s + 'g']; [c, g].forEach(function (cc) { if (cc) { S_.tw(cc.s, 'y', cc.s.y - 60, 480, 0, E.io3); S_.tw(cc.s, 'a', 0, 480, 0, E.io3); S_.tw(cc.s, 'sc', .7, 480, 0, E.io3); } }); }, this);
      this.buildHist(Rd.n);
    });
    at(RS + 900, function () { this.setPhase('PROOF', 'd0'); this.stamp(Rd, true); this.snd('seal'); });
    var end = RS + 1750; rt.dur = Math.max(4700, end);
    if (Rd.n === this.M.rounds.length && this.M.outcome) {
      var oc = this.M.outcome, win = oc && oc.winner ? oc.winner.toLowerCase() : null, lose = win ? this.opp(win) : null;
      at(end + 250, function () { this.setPhase('PROOF COMPLETE', 'd0'); if (!fast) { this.flash = .6; this.stop(160); } if (lose) { this.tw(this.F[lose], 'cold', 1, 900, 0, E.io3); this.tw(pose(lose), 'split', 1, 1100, 0, E.out3); } this.tw(this, 'ringClose', win ? .9 : .3, 2200, 0, E.io3); if (win) { this.tw(pose(win), 'up', 1, 600, 0, E.out3); this.tw(pose(win), 'ready', 0, 300); var p = this.pt(win, 'head'); this.zoom(1.1, p.x, p.y); } this.snd('victory'); this.sfx('END', this.W / 2, this.H * .3, 'end', '終'); });
      at(end + 1900, function () { this.cam0(); }); rt.dur = end + 2600;
    }
  };
})();
