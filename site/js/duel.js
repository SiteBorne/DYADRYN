/* DYADRYN Duel Table — a trading-card × Persona hybrid built for a simultaneous, locked-turn prediction duel.
   Masks are the combatants (slanted cel-shaded seats), moves are cards that lock face-down, flip, and clash on a ring.
   Drives ANY normalised match (real engine replays, training rounds). Choreography lives in duel-fx.js. */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {}, A = DY.StageArt, K = DY.DuelKit, C = A.C, E = A.E, cl = A.cl, TAU = A.TAU, el = DY.el;
  var MOVE = { TRACE: 'Trace', PRESS: 'Press', GUARD: 'Guard', COUNTER: 'Counter', ADAPT: 'Adapt', MIRROR: 'Mirror', RECOVER: 'Recover', SIGNATURE: 'Signature', STALL: 'Stall' };
  var ICO = { TRACE: 'trace', PRESS: 'press', GUARD: 'guard', COUNTER: 'counter', ADAPT: 'adapt', MIRROR: 'mirror', RECOVER: 'recover', SIGNATURE: 'signature', STALL: 'drift' };
  var MCLS = { TRACE: { c: '#6FA3FF', t: 'Recon' }, PRESS: { c: '#E0453A', t: 'Attack' }, GUARD: { c: '#8FB1BC', t: 'Defense' }, COUNTER: { c: '#E0A03A', t: 'Prediction' }, ADAPT: { c: '#4FD1C5', t: 'Shift' }, MIRROR: { c: '#A97BE0', t: 'Copy' }, RECOVER: { c: '#7FD18A', t: 'Reset' }, SIGNATURE: { c: '#D2A25E', t: 'Mask move' }, STALL: { c: '#8A8F94', t: 'Missed' } };
  var SIGN = { SECOND_ORDER_SIGHT: 'Second-Order Sight', CONSTRAINT_COLLAPSE: 'Constraint Collapse', COUNTERFACTUAL_SHIELD: 'Counterfactual Shield', STILLPOINT: 'Stillpoint', BROKER_LOCK: 'Broker Lock', ARCHIVE_ECHO: 'Archive Echo', SWARM_REPAIR: 'Swarm Repair', VEIL_STEP: 'Veil Step' };
  var SIGCLASS = { SECOND_ORDER_SIGHT: 'trace', CONSTRAINT_COLLAPSE: 'strike', COUNTERFACTUAL_SHIELD: 'guard', STILLPOINT: 'recover', BROKER_LOCK: 'lock', ARCHIVE_ECHO: 'echo', SWARM_REPAIR: 'repair', VEIL_STEP: 'veil' };
  var KANJI = { TRACE: '観', PRESS: '圧', GUARD: '守', COUNTER: '反', ADAPT: '変', MIRROR: '映', RECOVER: '癒', SIGNATURE: '印', STALL: '滞' };
  var CODEX = {
    TRACE: ['The Hunt Is Study', 'Watching is a move. It costs tempo and pays in understanding.'], PRESS: ['Heat Must Be Carried', 'Every push leaves heat behind. You carry it, or it carries you.'],
    GUARD: ['Take the Useful, Bury the Hungry', 'A shield is useful until it grows into a cage. Guard halves every round.'], COUNTER: ['Proof Before Claim', 'A prediction is only a claim until the round resolves it.'],
    ADAPT: ['Memory Is Ancestral Terrain', 'What you were shapes what you can become — but the total never grows.'], MIRROR: ['Memory Is Ancestral Terrain', 'To copy is to inherit. The copy is always a little less than the original.'],
    RECOVER: ['Heat Must Be Carried', 'Rest is not free. Exposure is the price of clarity.'], SIGNATURE: ['Mask Is Mercy', 'A signature is what a mask chooses to show. The rules never let it change.'],
    STALL: ['Take the Useful, Bury the Hungry', 'A missed turn never secretly wins. The engine records a stall.'], BRIGHT: ['Heat Must Be Carried', 'Bright means overexposed: more pressure out, more damage in.'],
    STRAINED: ['Memory Is Ancestral Terrain', 'Drift is identity loosening under too much adaptation.'], END: ['Proof Before Claim', 'The result is not announced. It is proven, and it can be replayed.']
  };
  var M7 = [['vitality', 'VIT', 'Vitality — your health'], ['energy', 'EN', 'Energy — what moves cost'], ['focus', 'FOC', 'Focus — clarity; Signatures spend it'], ['heat', 'HEAT', 'Heat — 70 Bright, 90 Overheated'], ['momentum', 'MOM', 'Momentum — offense bonus, −3 to +3'], ['guard', 'GRD', 'Guard — absorbs damage, halves each round'], ['drift', 'DRF', 'Drift — lost coherence; 60 strained, 80 unstable']];
  var R_ = function (v) { return Math.round(v); };

  function Duel(host, cfg) {
    this.host = host; this.cfg = cfg || {}; this.speed = 1; this.mode = 'all'; this.playing = false; this.view = 'simple';
    this.M = null; this.round = 0; this.rt = null; this.tweens = []; this.fx = []; this.pops = []; this.unlocked = {}; this.parts = [];
    this.cam = { z: 1, px: 0, py: 0, tz: 1, tpx: 0, tpy: 0, shake: 0, sx: 0, sy: 0 }; this.flash = 0; this.frameFx = { lines: 0, lx: .5, ly: .5, ink: 0 }; this.hit = 0; this.ringClose = 0; this.ifr = 0; this.lastTs = 0; this.time = 0;
    this.reduce = DY.reduce(); this.visible = true; this.dead = false; this.names = { a: 'A', b: 'B' };
    this.F = { a: this.mkF('a'), b: this.mkF('b') }; this.cards = { a: null, b: null }; this.R = { a: { x: 0, y: 0, w: 1, h: 1 }, b: { x: 0, y: 0, w: 1, h: 1 }, ring: { x: 0, y: 0, w: 1, h: 1 } };
    this.build(); this.resize(); this.bindLoop();
  }
  Duel.MOVE = MOVE; Duel.ICO = ICO; Duel.SIGN = SIGN; Duel.SIGCLASS = SIGCLASS; Duel.KANJI = KANJI; Duel.CODEX = CODEX; Duel.MCLS = MCLS; Duel.M7 = M7;
  var P = Duel.prototype;
  P.pose0 = function () { return { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, tilt: 0, flash: 0, ghost: 0, ghostDir: 1, glitch: 0, ring: 0, sway: 0, armF: 0, guard: 0, raise: 0, open: 0, up: 0, hurt: 0, ready: .2, stride: 0, crouch: 0, lean: 0, split: 0 }; };
  Duel.REST = { armF: 0, guard: 0, raise: 0, open: 0, up: 0, hurt: 0, ready: .2, crouch: 0, lean: 0, tilt: 0 };
  P.mkF = function (side) { return { side: side, face: side === 'a' ? 1 : -1, arch: 'Veil', pose: this.pose0(), cold: 0, res: null, stance: null, stanceK: 1, cracks: K.makeCracks(side === 'a' ? 11 : 29), name: '' }; };

  /* ---------- DOM ---------- */
  P.idHTML = function (s) {
    return '<section class="dt-id ' + s + '" aria-label="' + (s === 'a' ? 'Left' : 'Right') + ' combatant"><span class="dt-emb" aria-hidden="true"></span><div class="dt-nm"><b class="nm"></b><small class="ar"></small></div>' +
      '<div class="vit" role="img" aria-label="Vitality"><i class="gh"></i><i class="fi"></i><span class="gd"></span><span class="lab">VIT</span><b class="num">100</b></div><div class="chips"></div></section>';
  };
  P.m7HTML = function (s) {
    return '<div class="dt-m7 m7 ' + s + '" role="group" aria-label="Seven meters">' + M7.map(function (m) { return '<div class="m" data-k="' + m[0] + '" title="' + m[2] + '"><span class="mi" aria-hidden="true">' + (DY.icons && DY.icons[m[0]] || '') + '</span><span class="ml">' + m[1] + '</span><i><u></u></i><b>0</b><em aria-hidden="true"></em></div>'; }).join('') + '</div>';
  };
  P.build = function () {
    var h = this.host; h.classList.add('cs', 'dt'); h.setAttribute('data-view', this.view);
    h.innerHTML =
      '<div class="cs-frame dt-frame"><canvas class="cs-cv dt-cv" aria-hidden="true"></canvas><div class="dt-ui">' +
      '<div class="dt-top">' + this.idHTML('a') + '<div class="dt-mid"><div class="dt-seal" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="r1" cx="50" cy="50" r="44"/><circle class="r2" cx="50" cy="50" r="36"/><path class="tk" d="M50 2v9M50 89v9M2 50h9M89 50h9"/></svg><b class="rn">0</b></div><ol class="dt-phases" aria-label="Round phase"><li data-p="LOCK">Lock</li><li data-p="REVEAL">Reveal</li><li data-p="CLASH">Clash</li><li data-p="RESOLVE">Resolve</li><li data-p="PROOF">Proof</li></ol><span class="ph dt-ph" aria-live="polite">READY</span></div>' + this.idHTML('b') + '</div>' +
      '<div class="dt-board"><div class="dt-seat a"></div><div class="dt-table"><div class="dt-ring"></div></div><div class="dt-seat b"></div></div>' +
      '<div class="dt-low">' + this.m7HTML('a') + '<div class="dt-ledger"><div class="dt-hist a" role="group" aria-label="Move history"></div><div class="dt-chg chg" aria-live="polite"></div><div class="dt-hist b" role="group" aria-label="Move history"></div></div>' + this.m7HTML('b') + '</div></div>' +
      '<div class="dt-cards"></div><div class="dt-wipe" aria-hidden="true"></div><div class="cs-sfx" aria-hidden="true"></div><div class="cs-cut" aria-hidden="true"></div><div class="cs-card" role="group" aria-label="Match card"></div><div class="cs-stamp" aria-hidden="true"></div></div>' +
      '<div class="cs-cap"><p class="cap" aria-live="polite"></p><p class="lore" aria-live="off"></p></div><div class="cs-tl" role="group" aria-label="Rounds"></div>' +
      '<div class="cs-ctl"><div class="cs-ctl-l"><button type="button" class="cbt" data-c="play" aria-label="Play">' + DY.icon('play', 18) + '<span>Play</span></button><button type="button" class="cbt" data-c="prev" aria-label="Previous round">←</button><button type="button" class="cbt" data-c="next" aria-label="Next round">→</button><button type="button" class="cbt" data-c="key" aria-pressed="false" title="Play only the rounds where something decisive happens">Key moments</button></div>' +
      '<div class="cs-ctl-r"><button type="button" class="cbt" data-c="speed" title="Playback speed">1×</button><button type="button" class="cbt" data-c="sound" aria-pressed="false" title="Tactile sound: ceramic, relay, graphite">Sound off</button><button type="button" class="cbt" data-c="codex" title="Lore unlocked in this match">Codex <b class="cdx">0</b></button><button type="button" class="cbt" data-c="fs" aria-label="Fullscreen">⤢</button></div></div>' +
      '<aside class="cs-codex" hidden aria-label="Codex"><h4>Codex</h4><ul></ul><p class="muted">Lines unlock as their mechanic appears on the table.</p></aside>';
    var q = function (s) { return h.querySelector(s); }, qa = function (s) { return h.querySelectorAll(s); };
    this.cv = q('.dt-cv'); this.g = this.cv.getContext('2d');
    this.dom = { frame: q('.dt-frame'), ui: q('.dt-ui'), rn: q('.rn'), ph: q('.dt-ph'), phases: q('.dt-phases'), seal: q('.dt-seal'), seatA: q('.dt-seat.a'), seatB: q('.dt-seat.b'), ring: q('.dt-ring'), histA: q('.dt-hist.a'), histB: q('.dt-hist.b'), chg: q('.dt-chg'), cards: q('.dt-cards'), wipe: q('.dt-wipe'), sfx: q('.cs-sfx'), cut: q('.cs-cut'), card: q('.cs-card'), stamp: q('.cs-stamp'), cap: q('.cap'), lore: q('.lore'), tl: q('.cs-tl'), codex: q('.cs-codex'), cdxN: q('.cdx'), plate: { a: q('.dt-id.a'), b: q('.dt-id.b') }, m7: { a: q('.dt-m7.a'), b: q('.dt-m7.b') } };
    var self = this; h.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b && h.contains(b)) self.control(b.getAttribute('data-c'), b); });
    h.addEventListener('keydown', function (e) { if (e.target.closest('input,textarea,select')) return; if (e.key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); self.control('play'); } else if (e.key === 'ArrowRight') self.control('next'); else if (e.key === 'ArrowLeft') self.control('prev'); });
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(this.dom.frame); else window.addEventListener('resize', function () { self.resize(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }).observe(h);
    document.addEventListener('visibilitychange', function () { if (document.hidden && self.playing) self.pause(); });
    document.addEventListener('dy:motion', function () { self.reduce = DY.reduce(); });
    this.snd = (this.cfg.sound !== false && DY.StageSound) ? DY.StageSound(this) : function () {};
  };

  /* ---------- geometry ---------- */
  P.rectOf = function (node) { var f = this.dom.frame.getBoundingClientRect(), r = node.getBoundingClientRect(); return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height }; };
  P.resize = function () {
    var f = this.dom.frame.getBoundingClientRect(), w = Math.max(320, Math.round(f.width)), hh = Math.max(240, Math.round(f.height)); if (!f.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1); this.W = w; this.H = hh; this.dpr = dpr; this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(hh * dpr); this.cv.style.width = w + 'px'; this.cv.style.height = hh + 'px';
    this.bg = A.paintBackground(w * dpr * 1.25, hh * dpr); this.ht = A.halftoneOverlay(w * dpr, hh * dpr); this.grain = A.grainTile();
    this.dom.frame.style.setProperty('--u', cl(hh / 640, .9, 1.35).toFixed(3));
    this.R.a = this.rectOf(this.dom.seatA); this.R.b = this.rectOf(this.dom.seatB); this.R.ring = this.rectOf(this.dom.ring); this.layoutCards(); this.dirty = true;
  };
  P.actorHW = function (side) { var R = this.R[side]; return Math.min(R.w * .92, R.h * .78); };
  P.center = function (side) { var R = this.R[side], F = this.F[side], P_ = F.pose; return { x: R.x + R.w * .5 + P_.dx, y: R.y + R.h * .5 + P_.dy }; };
  P.pt = function (side, part) { // anchor points for effects (css px)
    var c = this.center(side), HW = this.actorHW(side), d = side === 'a' ? 1 : -1;
    if (part === 'front') return { x: c.x + d * HW * .36, y: c.y + HW * .06 };
    if (part === 'chest') return { x: c.x, y: c.y + HW * .1 };
    if (part === 'feet') return { x: c.x, y: c.y + HW * .62 };
    return { x: c.x, y: c.y - HW * .08 };
  };
  P.ringC = function () { var r = this.R.ring; return { x: r.x + r.w / 2, y: r.y + r.h / 2, r: Math.min(r.w, r.h) / 2 }; };

  /* ---------- clock ---------- */
  P.bindLoop = function () {
    var self = this; function frame(ts) { if (self.dead) return; requestAnimationFrame(frame); if (!self.visible && !self.dirty) { self.lastTs = ts; return; } var dt = Math.min(64, ts - (self.lastTs || ts)); self.lastTs = ts; self.tick(dt, ts); } requestAnimationFrame(frame);
  };
  P.destroy = function () { this.dead = true; };
  P.tick = function (dt, ts) {
    this.time = ts; var rt = this.rt; if (this.hit > 0) this.hit -= dt;
    if (rt && (this.playing || rt.stepping) && this.hit <= 0) {
      rt.t += dt * this.speed * (rt.fast ? 3.4 : 1); while (rt.q.length && rt.q[0].t <= rt.t) rt.q.shift().fn.call(this);
      if (rt.t >= rt.dur && !rt.ended) { rt.ended = true; rt.stepping = false; this.afterRound(); }
    }
    this.stepTweens(rt ? rt.t : 0); this.decay(dt); this.draw(ts); this.dirty = false;
  };
  P.tw = function (o, k, to, d, delay, ease) { var t0 = (this.rt ? this.rt.t : 0) + (delay || 0); this.tweens = this.tweens.filter(function (x) { return !(x.o === o && x.k === k); }); this.tweens.push({ o: o, k: k, from: o[k], to: to, t0: t0, d: Math.max(1, d), e: ease || E.out3 }); };
  P.stepTweens = function (t) { var keep = []; for (var i = 0; i < this.tweens.length; i++) { var w = this.tweens[i]; if (t < w.t0) { keep.push(w); continue; } if (w.from === undefined) w.from = w.o[w.k]; var p = Math.min(1, (t - w.t0) / w.d); w.o[w.k] = w.from + (w.to - w.from) * w.e(p); if (p < 1) keep.push(w); } this.tweens = keep; };
  P.decay = function (dt) {
    var k = dt / 16.7, c = this.cam; c.shake *= Math.pow(.86, k); c.sx = (Math.random() - .5) * c.shake; c.sy = (Math.random() - .5) * c.shake;
    this.flash = Math.max(0, this.flash - dt / 260); this.frameFx.lines = Math.max(0, this.frameFx.lines - dt / 520); this.frameFx.ink = Math.max(0, this.frameFx.ink - dt / 220); this.ifr = Math.max(0, this.ifr - dt);
    for (var s in this.F) { var p = this.F[s].pose; p.hurt = Math.max(0, p.hurt - dt / 620); p.flash = Math.max(0, p.flash - dt / 220); p.glitch = Math.max(0, p.glitch - dt / 400); p.sway *= Math.pow(.94, k); }
    if (!this.reduce) { for (var sd in this.F) { var Fs = this.F[sd], heat = Fs.res ? Fs.res.heat / 100 : 0, R = this.R[sd]; if (Math.random() < heat * .4 * k && this.parts.length < 100) this.parts.push({ x: R.x + R.w * (.25 + Math.random() * .5), y: R.y + R.h * (.5 + Math.random() * .4), vx: (Math.random() - .5) * .3, vy: -.5 - Math.random() * .9, life: 1100 + Math.random() * 900, age: 0, s: 1.6 + Math.random() * 2, a: .95, c: heat >= .7 ? '#E0653A' : '#B85C32' }); } if (Math.random() < .3 * k && this.parts.length < 100) this.parts.push({ x: Math.random() * this.W, y: -6, vx: -.3 - Math.random() * .4, vy: .5 + Math.random() * .7, life: 5200, age: 0, s: 1.4 + Math.random() * 1.6, a: .4, c: '#D8D0BE' }); }
    for (var pj = this.parts.length - 1; pj >= 0; pj--) { var pp = this.parts[pj]; pp.x += pp.vx * k; pp.y += pp.vy * k; pp.age += dt; if (pp.age > pp.life || pp.y < -10 || pp.y > this.H + 10) this.parts.splice(pj, 1); }
    for (var i = this.fx.length - 1; i >= 0; i--) { var f = this.fx[i]; f.age += dt * (this.rt && this.hit > 0 ? 0 : 1); if (f.age >= f.life) this.fx.splice(i, 1); }
    for (var j = this.pops.length - 1; j >= 0; j--) { this.pops[j].age += dt; if (this.pops[j].age > this.pops[j].life) this.pops.splice(j, 1); }
    c.z += (c.tz - c.z) * Math.min(1, dt / 160) || 0; c.px += (c.tpx - c.px) * Math.min(1, dt / 160) || 0; c.py += (c.tpy - c.py) * Math.min(1, dt / 160) || 0;
    this.applyCards();
  };
  P.cam0 = function () { this.cam.tz = 1; this.cam.tpx = 0; this.cam.tpy = 0; };
  P.shake = function (m) { if (!this.reduce) this.cam.shake = Math.max(this.cam.shake, m); };
  P.zoom = function (z, x, y) { if (this.reduce) return; this.cam.tz = z; this.cam.tpx = (this.W / 2 - x) * (z - 1) * .6; this.cam.tpy = (this.H * .5 - y) * (z - 1) * .5; };
  P.stop = function (ms) { if (!this.reduce) this.hit = Math.max(this.hit, ms); };
  P.addFx = function (o) { o.age = 0; this.fx.push(o); return o; };
  P.pop = function (side, txt, col, big, dy) { var p = this.pt(side, 'head'); this.pops.push({ x: p.x, y: p.y + (dy || 0), t: txt, c: col, age: 0, life: 1300, big: big }); };

  /* ---------- rendering ---------- */
  P.draw = function (ts) { if (DY.DuelDraw) DY.DuelDraw.frame(this, ts); };

  /* ---------- HUD ---------- */
  P.setPlate = function (side, post, instant) {
    var pl = this.dom.plate[side], m7 = this.dom.m7[side], r = post.r, fi = pl.querySelector('.vit .fi'), gh = pl.querySelector('.vit .gh'), gd = pl.querySelector('.vit .gd');
    var v = cl(r.vitality, 0, 100); fi.style.width = v + '%'; if (instant) { gh.style.transition = 'none'; gh.style.width = v + '%'; void gh.offsetWidth; gh.style.transition = ''; } else gh.style.width = v + '%';
    gd.style.width = cl(r.guard / 60 * 100, 0, 100) * .5 + '%'; pl.querySelector('.vit .num').textContent = R_(v);
    pl.querySelector('.vit').setAttribute('aria-label', 'Vitality ' + R_(v) + ' of 100' + (r.guard > .5 ? ', guard ' + R_(r.guard) : ''));
    var mv = { vitality: [r.vitality, 100], energy: [r.energy, 100], focus: [r.focus, 100], heat: [r.heat, 100], momentum: [r.momentum, 3], guard: [r.guard, 60], drift: [r.drift, 100] };
    Object.keys(mv).forEach(function (k) { var c = m7.querySelector('.m[data-k=' + k + ']'); if (!c) return; var x = mv[k][0], mx = mv[k][1], u = c.querySelector('u'), flag = (k === 'heat' && x >= 70) || (k === 'drift' && x >= 60) || (k === 'vitality' && x <= 25) || (k === 'energy' && x <= 15);
      if (k === 'momentum') { u.style.left = x >= 0 ? '50%' : (50 + x / 3 * 50) + '%'; u.style.width = Math.abs(x) / 3 * 50 + '%'; } else u.style.width = cl(x / mx * 100, 0, 100) + '%';
      var prev = c._v; c._v = x; if (prev != null && Math.abs(x - prev) >= .5 && !instant) { var cls = (k === 'heat' || k === 'drift') ? (x > prev ? 'dn' : 'up') : (x > prev ? 'up' : 'dn'); c.classList.remove('up', 'dn'); void c.offsetWidth; c.classList.add(cls); (function (cc) { setTimeout(function () { cc.classList.remove('up', 'dn'); }, 900); })(c); }
      c.querySelector('b').textContent = (k === 'momentum' && x > 0 ? '+' : '') + R_(x); c.classList.toggle('flag', !!flag); c.querySelector('em').textContent = flag ? '▲' : ''; });
    var ch = []; if (r.heat >= 90) ch.push(['OVERHEATED', 'hot']); else if (r.heat >= 70) ch.push(['BRIGHT', 'hot']); if (r.drift >= 80) ch.push(['UNSTABLE', 'dr']); else if (r.drift >= 60) ch.push(['STRAINED', 'dr']);
    if (post.adapt) ch.push([post.adapt.stance + ' ' + post.adapt.left, 'st']); if (Object.keys(post.cd || {}).length) ch.push(['COOLDOWN', 'cd']);
    pl.querySelector('.chips').innerHTML = ch.map(function (c) { return '<span class="ch ' + c[1] + '">' + c[0] + '</span>'; }).join('');
    var F = this.F[side]; F.res = r; var ns = post.adapt ? post.adapt.stance : null; if (ns !== F.stance) { F.stance = ns; F.stanceK = 0; this.tw(F, 'stanceK', 1, 500, 0, E.out3); }
    pl.classList.toggle('bright', r.heat >= 70); pl.classList.toggle('drift', r.drift >= 60);
  };
  P.setPhase = function (name, plane) {
    this.dom.ph.textContent = name; this.dom.frame.setAttribute('data-phase', name); var key = name.split(' ')[0], ps = this.dom.phases.children;
    for (var i = 0; i < ps.length; i++) ps[i].classList.toggle('on', ps[i].getAttribute('data-p') === key);
  };
  P.caption = function (txt, lore) { this.dom.cap.textContent = txt; this.dom.lore.textContent = lore || ''; this.dom.lore.classList.toggle('on', !!lore); };
  P.chg = function (Rd) {
    var self = this, rows = ['a', 'b'].map(function (s) {
      var d = dv(Rd, s), parts = []; M7.forEach(function (k) { var v = d[k[0]]; if (Math.abs(v) >= .5) parts.push('<span class="' + (v > 0 ? 'up' : 'dn') + '">' + k[1] + ' ' + (v > 0 ? '+' : '−') + Math.abs(R_(v)) + '</span>'); });
      return '<div><b>' + self.names[s] + '</b>' + (parts.join('') || '<span class="nt">no change</span>') + '</div>';
    }); this.dom.chg.innerHTML = rows.join('');
  };
  P.stamp = function (Rd, on) {
    var st = this.dom.stamp; if (!on) { st.classList.remove('on'); return; }
    st.innerHTML = '<span class="caps">Round ' + Rd.n + ' sealed</span><code>' + (Rd.prev ? Rd.prev.slice(0, 4) + '·' + Rd.prev.slice(4, 8) : '····') + '</code><i aria-hidden="true">→</i><code class="cur">' + (Rd.hash ? Rd.hash.slice(0, 4) + '·' + Rd.hash.slice(4, 8) : '····') + '</code>'; st.classList.add('on');
  };
  P.unlock = function (key) { if (this.unlocked[key] || !CODEX[key]) return null; this.unlocked[key] = 1; var c = CODEX[key], ul = this.dom.codex.querySelector('ul'); ul.appendChild(el('li', null, '<b>' + c[0] + '</b><span>' + c[1] + '</span>')); this.dom.cdxN.textContent = Object.keys(this.unlocked).length; return c; };
  P.unlockLine = function (key) { var c = this.unlock(key); if (c) { this.dom.lore.textContent = c[0] + ' — ' + c[1]; this.dom.lore.classList.add('on'); } };
  P.histChip = function (x) { var k = x.action, c = MCLS[k] || MCLS.STALL; return '<i class="hc" style="--c:' + c.c + '" title="' + (MOVE[k] || k) + '">' + DY.icon(ICO[k] || 'drift', 14) + '</i>'; };
  P.buildHist = function (upto) { var self = this; ['a', 'b'].forEach(function (s) { var rs = self.M.rounds.slice(Math.max(0, upto - 7), upto); self.dom['hist' + s.toUpperCase()].innerHTML = rs.map(function (r) { return self.histChip(r[s]); }).join(''); }); };

  /* ---------- text ---------- */
  P.act = function (x) { var m = MOVE[x.action] || x.action; if (x.action === 'SIGNATURE') return (SIGN[x.signatureId] || 'Signature'); if (x.action === 'COUNTER') return 'Counter (predicting ' + MOVE[x.prediction] + ')'; if (x.action === 'ADAPT') return 'Adapt into ' + (x.adaptStance || '').charAt(0) + (x.adaptStance || '').slice(1).toLowerCase(); return m; };
  P.describeChoice = function (Rd) { return 'Round ' + Rd.n + '. ' + this.names.a + ' chose ' + this.act(Rd.a) + '. ' + this.names.b + ' chose ' + this.act(Rd.b) + '.'; };
  P.describeResult = function (Rd) {
    var n = this.names, da = dv(Rd, 'a'), db = dv(Rd, 'b'), out = [];
    var ch = function (X, x, o) { if (x.action === 'COUNTER' && o.action !== 'COUNTER') return x.prediction === o.action ? n[X] + '’s read was right: ' + MOVE[o.action] + ' was met.' : n[X] + ' predicted ' + MOVE[x.prediction] + ' and missed. Drift rises.'; return ''; };
    var ca = ch('a', Rd.a, Rd.b), cb = ch('b', Rd.b, Rd.a); if (ca) out.push(ca); if (cb) out.push(cb);
    if (da.vitality < -.5) out.push(n.a + ' lost ' + R_(-da.vitality) + ' vitality.'); if (db.vitality < -.5) out.push(n.b + ' lost ' + R_(-db.vitality) + ' vitality.');
    if (da.vitality > .5) out.push(n.a + ' recovered ' + R_(da.vitality) + ' vitality.'); if (db.vitality > .5) out.push(n.b + ' recovered ' + R_(db.vitality) + ' vitality.');
    if (!(da.vitality < -.5 || db.vitality < -.5)) out.push('No vitality was lost.');
    if (Rd.pre.a.r.heat < 70 && Rd.post.a.r.heat >= 70) out.push(n.a + ' is BRIGHT.'); if (Rd.pre.b.r.heat < 70 && Rd.post.b.r.heat >= 70) out.push(n.b + ' is BRIGHT.');
    if (Rd.notes.length) out.push(Rd.notes.join(' ')); return out.join(' ');
  };

  /* ---------- match data ---------- */
  function dv(R, side) { var o = {}, pr = R.pre[side].r, po = R.post[side].r; for (var k in po) o[k] = po[k] - pr[k]; return o; }
  function keyRound(rs, j) {
    var r = rs[j], da = dv(r, 'a'), db = dv(r, 'b'); if (j === 0 || j === rs.length - 1) return true;
    if (da.vitality < -8 || db.vitality < -8 || da.vitality > 5 || db.vitality > 5) return true; if (r.a.action === 'SIGNATURE' || r.b.action === 'SIGNATURE' || r.a.action === 'ADAPT' || r.b.action === 'ADAPT') return true;
    if (r.a.action === 'COUNTER' && r.a.prediction === r.b.action || r.b.action === 'COUNTER' && r.b.prediction === r.a.action) return true;
    return r.pre.a.r.heat < 70 && r.post.a.r.heat >= 70 || r.pre.b.r.heat < 70 && r.post.b.r.heat >= 70;
  }
  Duel.dv = dv;
  Duel.normalize = function (m) {
    var rounds = [], F = m.frames;
    for (var i = 1; i < F.length; i++) { var f = F[i], pre = F[i - 1].post; rounds.push({ n: f.round, pre: pre, post: f.post, a: f.actions.a || { action: 'STALL' }, b: f.actions.b || { action: 'STALL' }, notes: f.notes || [], hash: f.hash, prev: f.prev, alts: f.alts || [] }); }
    var out = { id: m.id, label: m.label, a: m.a, b: m.b, rounds: rounds, outcome: m.outcome, scores: m.scores || null, seed_commitment: m.seed_commitment, root: m.root, mode: m.mode, verified: m.engine_verified, init: F[0].post, source: m.source || 'engine' };
    for (var j = 0; j < rounds.length; j++) rounds[j].key = keyRound(rounds, j); return out;
  };
  P.setSeats = function (M) {
    ['a', 'b'].forEach(function (s) { var F = this.F[s], pl = this.dom.plate[s]; F.arch = M[s].arch; F.name = M[s].name; F.cracks = K.makeCracks(s === 'a' ? 11 : 29); pl.querySelector('.nm').textContent = M[s].name; pl.querySelector('.ar').textContent = M[s].arch; pl.style.setProperty('--acc', K.sty(M[s].arch).acc); var emb = pl.querySelector('.dt-emb'); emb.style.setProperty('--acc', K.sty(M[s].arch).acc); emb.innerHTML = (DY.KJ && DY.KJ[K.sty(M[s].arch).kj]) || ''; }, this);
  };
  P.load = function (m) {
    this.pause(); this.M = Duel.normalize(m); this.round = 0; this.unlocked = {}; this.dom.codex.querySelector('ul').innerHTML = ''; this.dom.cdxN.textContent = '0';
    var M = this.M; this.names = { a: M.a.name, b: M.b.name }; this.setSeats(M); this.buildTimeline(); this.snap(0); this.introCard();
  };
  P.introCard = function () {
    if (this.cfg.training) return; var M = this.M, c = this.dom.card; c.classList.add('show'); c.innerHTML = '<div class="cd-in"><span class="caps">' + (M.source === 'engine' ? 'Real engine replay' : 'Training match') + '</span><h3>' + M.a.name + ' <em>×</em> ' + M.b.name + '</h3><p>' + M.a.arch + ' against ' + M.b.arch + '. Both masks clean. Seed committed <code>' + (M.seed_commitment ? M.seed_commitment.slice(0, 4) + '·' + M.seed_commitment.slice(4, 8) : '····') + '</code>.</p><p class="cd-q">How much information is worth giving up tempo for?</p><button type="button" class="btn btn--primary btn--sm" data-c="play">' + DY.icon('play', 16) + ' Begin round 1</button></div>';
  };
  P.hideCard = function () { this.dom.card.classList.remove('show'); };
  P.buildTimeline = function () {
    var tl = this.dom.tl, self = this; tl.innerHTML = '';
    this.M.rounds.forEach(function (r, i) { var b = el('button', { type: 'button', 'class': 'tc' + (r.key ? ' k' : ''), 'aria-label': 'Round ' + r.n + ': ' + MOVE[r.a.action] + ' versus ' + MOVE[r.b.action], 'data-i': i }, '<span class="tn">' + r.n + '</span><span class="ti a">' + DY.icon(ICO[r.a.action], 14) + '</span><span class="ti b">' + DY.icon(ICO[r.b.action], 14) + '</span>'); b.addEventListener('click', function () { self.pause(); self.snap(i + 1); }); tl.appendChild(b); });
  };
  P.markTimeline = function (i) { var cs = this.dom.tl.children; for (var k = 0; k < cs.length; k++) { cs[k].classList.toggle('on', k === i - 1); cs[k].classList.toggle('past', k < i - 1); } var cur = cs[i - 1]; if (cur && this.dom.tl.scrollWidth > this.dom.tl.clientWidth) this.dom.tl.scrollLeft = cur.offsetLeft - this.dom.tl.clientWidth / 2; };

  /* ---------- state ---------- */
  P.snap = function (i) {
    this.tweens = []; this.fx = []; this.pops = []; this.rt = null; this.hit = 0; this.cam0(); this.cam.z = 1; this.cam.px = this.cam.py = 0; this.flash = 0; this.frameFx.lines = 0; this.ringClose = 0; this.ifr = 0; this.speed = this.speed || 1;
    this.round = i; var M = this.M; this.clearCards(); this.dom.cut.className = 'cs-cut'; this.dom.sfx.innerHTML = ''; this.stamp(null, false);
    ['a', 'b'].forEach(function (s) { var F = this.F[s]; F.pose = this.pose0(); F.cold = 0; }, this);
    var post = i === 0 ? M.init : M.rounds[i - 1].post; this.setPlate('a', post.a, true); this.setPlate('b', post.b, true); this.syncCracks(true);
    this.dom.rn.textContent = i; this.markTimeline(i); this.setPhase(i === 0 ? 'READY' : 'ROUND ' + i, null); this.buildHist(i);
    if (i === 0) { this.caption('Both masks clean. Seed committed. Press play, or step through a round at a time.', ''); this.dom.chg.innerHTML = ''; } else { var Rd = M.rounds[i - 1]; this.caption(this.describeChoice(Rd) + ' ' + this.describeResult(Rd), ''); this.chg(Rd); }
    if (i === M.rounds.length && M.outcome) this.applyEnding(true); if (i > 0) this.hideCard(); else this.introCard(); this.updatePlayBtn(); this.dirty = true;
  };
  P.syncCracks = function () { /* cracks are drawn from live vitality; nothing to store */ };
  P.applyEnding = function (instant) {
    var o = this.M.outcome, lose = o && o.winner ? (o.winner === 'A' ? 'b' : 'a') : null; if (lose) { this.F[lose].cold = 1; this.F[lose].pose.split = 1; this.F[lose].pose.hurt = 0; }
    this.ringClose = o && o.winner ? .9 : .3; if (instant) this.showEnd(true);
  };
  P.showEnd = function (instant) {
    var M = this.M, o = M.outcome, c = this.dom.card, win = o && o.winner ? this.names[o.winner.toLowerCase()] : null;
    var reason = { ko: 'Vitality reached zero.', double_ko: 'Both reached zero in the same round.', forfeit: 'Three timeouts.', double_forfeit: 'Both forfeited.', round_limit: 'Round ' + M.rounds.length + ' reached. The proof score decides.' }[o.reason] || '';
    var bars = ''; if (M.scores && o.reason === 'round_limit') { var mx = Math.max(M.scores.a, M.scores.b, 1); bars = '<div class="sc"><div><b>' + this.names.a + '</b><i style="--v:' + (M.scores.a / mx * 100) + '%"></i><em>' + M.scores.a.toFixed(1) + '</em></div><div><b>' + this.names.b + '</b><i style="--v:' + (M.scores.b / mx * 100) + '%"></i><em>' + M.scores.b.toFixed(1) + '</em></div><small>Proof score — a weighted blend of the final meters</small></div>'; }
    c.classList.add('show', 'end'); c.innerHTML = '<div class="cd-in"><span class="caps">' + (win ? 'Proof complete' : 'No proof advantage') + '</span><h3>' + (win ? win + ' <em>wins</em>' : 'Draw') + '</h3><p>' + reason + '</p>' + bars + '<p class="proofline">Proofline <code>' + (M.root ? M.root.slice(0, 4) + '·' + M.root.slice(4, 8) : '····') + '</code>' + (M.verified ? ' · engine re-resolved all ' + M.verified.rounds + ' rounds ✓' : '') + '</p><div class="btn-row" style="justify-content:center"><button type="button" class="btn btn--primary btn--sm" data-c="' + (this.cfg.training ? 'newmatch' : 'restart') + '">' + (this.cfg.training ? 'New match' : 'Watch again') + '</button>' + (this.cfg.verifyHref ? '<a class="btn btn--ghost btn--sm" href="' + this.cfg.verifyHref + '">Verify the proof</a>' : '') + '</div></div>';
    if (!instant) this.unlockLine('END');
  };

  /* ---------- transport ---------- */
  P.updatePlayBtn = function () { var b = this.host.querySelector('[data-c=play]'); if (!b) return; var end = this.M && this.round >= this.M.rounds.length; b.innerHTML = DY.icon(this.playing ? 'pause' : 'play', 18) + '<span>' + (this.playing ? 'Pause' : end ? 'Replay' : this.round === 0 ? 'Play' : 'Resume') + '</span>'; b.setAttribute('aria-label', this.playing ? 'Pause' : 'Play'); };
  P.play = function () { if (!this.M) return; if (this.round >= this.M.rounds.length) this.snap(0); this.hideCard(); this.playing = true; this.snd('resume'); if (!this.rt || this.rt.ended) this.playRound(this.round); this.updatePlayBtn(); };
  P.pause = function () { this.playing = false; this.updatePlayBtn(); };
  P.playRound = function (i, o) {
    var Rd = this.M.rounds[i], fast = this.mode === 'key' && !Rd.key && !(o && o.step); this.hideCard(); this.round = i; this.tweens = []; this.fx = []; this.pops = []; this.clearCards();
    this.rt = { i: i, t: 0, dur: 4700, q: [], ended: false, fast: fast, stepping: !!(o && o.step) };
    ['a', 'b'].forEach(function (s) { var F = this.F[s]; if (F.cold === 0) F.pose = this.pose0(); }, this);
    this.plan(Rd, fast); this.rt.q.sort(function (a, b) { return a.t - b.t; }); if (this.rt.dur < 4700) this.rt.dur = 4700;
  };
  P.afterRound = function () {
    var i = this.rt.i, M = this.M; this.round = i + 1; this.markTimeline(this.round);
    if (this.cfg.training) { this.playing = false; this.speed = this.cfg.speed || 1; if (M.outcome && this.round >= M.rounds.length) this.showEnd(false); this.updatePlayBtn(); if (this.cfg.onRoundEnd) this.cfg.onRoundEnd(); return; }
    if (this.round >= M.rounds.length) { this.playing = false; this.showEnd(false); this.updatePlayBtn(); return; } if (this.playing) this.playRound(this.round); else this.updatePlayBtn();
  };
  P.control = function (c, btn) {
    var M = this.M; if (!M) return;
    if (c === 'play') { this.playing ? this.pause() : this.play(); } else if (c === 'restart') { this.snap(0); this.play(); } else if (c === 'newmatch') { if (this.cfg.onNew) this.cfg.onNew(); }
    else if (c === 'next') { this.pause(); if (this.round >= M.rounds.length) return; this.hideCard(); this.playRound(this.round, { step: true }); }
    else if (c === 'prev') { this.pause(); this.snap(Math.max(0, (this.rt && !this.rt.ended ? this.rt.i : this.round) - 1)); }
    else if (c === 'key') { this.mode = this.mode === 'key' ? 'all' : 'key'; btn.setAttribute('aria-pressed', this.mode === 'key'); }
    else if (c === 'speed') { var sp = [1, 1.5, 2, .5]; this.speed = sp[(sp.indexOf(this.speed) + 1) % sp.length]; btn.textContent = this.speed + '×'; }
    else if (c === 'sound') { var on = this.snd('toggle'); btn.setAttribute('aria-pressed', on); btn.textContent = on ? 'Sound on' : 'Sound off'; }
    else if (c === 'codex') { this.dom.codex.hidden = !this.dom.codex.hidden; } else if (c === 'fs') { var f = this.host; if (document.fullscreenElement) document.exitFullscreen(); else if (f.requestFullscreen) f.requestFullscreen().catch(function () {}); }
  };
  P.setMatch = function (m) { this.load(m); };
  P.beginTraining = function (meta) {
    this.pause(); this.M = { id: 'training', label: meta.a.name + ' vs ' + meta.b.name, a: meta.a, b: meta.b, rounds: [], outcome: null, scores: null, seed_commitment: meta.commit, root: null, mode: 'TRAINING', verified: null, init: meta.init, source: 'training' };
    this.names = { a: meta.a.name, b: meta.b.name }; this.unlocked = {}; this.dom.codex.querySelector('ul').innerHTML = ''; this.dom.cdxN.textContent = '0'; this.setSeats(this.M); this.buildTimeline(); this.snap(0); this.hideCard(); this.dom.card.className = 'cs-card';
  };
  P.playNext = function (rd) { this.M.rounds.push(rd); this.dom.tl.innerHTML = ''; if (rd.outcome) this.M.outcome = rd.outcome; this.hideCard(); this.playing = true; this.speed = this.speed || 1; this.playRound(this.M.rounds.length - 1); };

  DY.Duel = DY.Stage = Duel;
})();
