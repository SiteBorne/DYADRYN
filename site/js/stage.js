/* DYADRYN Combat Stage — core: DOM, sizing, clock, HUD, captions, lore. Drives ANY normalized match
   (real engine replays, training rounds). Choreography lives in stage-fx.js, sound in stage-sound.js. */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {}, A = DY.StageArt, C = A.C, E = A.E, cl = A.cl;
  var MOVE = { TRACE: 'Trace', PRESS: 'Press', GUARD: 'Guard', COUNTER: 'Counter', ADAPT: 'Adapt', MIRROR: 'Mirror', RECOVER: 'Recover', SIGNATURE: 'Signature', STALL: 'Stall' };
  var ICO = { TRACE: 'trace', PRESS: 'press', GUARD: 'guard', COUNTER: 'counter', ADAPT: 'adapt', MIRROR: 'mirror', RECOVER: 'recover', SIGNATURE: 'signature', STALL: 'drift' };
  var SIGN = { SECOND_ORDER_SIGHT: 'Second-Order Sight', CONSTRAINT_COLLAPSE: 'Constraint Collapse', COUNTERFACTUAL_SHIELD: 'Counterfactual Shield', STILLPOINT: 'Stillpoint', BROKER_LOCK: 'Broker Lock', ARCHIVE_ECHO: 'Archive Echo', SWARM_REPAIR: 'Swarm Repair', VEIL_STEP: 'Veil Step' };
  var SIGCLASS = { SECOND_ORDER_SIGHT: 'trace', CONSTRAINT_COLLAPSE: 'strike', COUNTERFACTUAL_SHIELD: 'guard', STILLPOINT: 'recover', BROKER_LOCK: 'lock', ARCHIVE_ECHO: 'echo', SWARM_REPAIR: 'repair', VEIL_STEP: 'veil' };
  var KANJI = { TRACE: '観', PRESS: '圧', GUARD: '守', COUNTER: '反', ADAPT: '変', MIRROR: '映', RECOVER: '癒', SIGNATURE: '印', STALL: '滞' };
  /* lore: each mechanic answers one of the six principles (Brand Bible §12). Codex lines unlock as they appear on stage. */
  var CODEX = {
    TRACE: ['The Hunt Is Study', 'Watching is a move. It costs tempo and pays in understanding.'],
    PRESS: ['Heat Must Be Carried', 'Every push leaves heat behind. You carry it, or it carries you.'],
    GUARD: ['Take the Useful, Bury the Hungry', 'A shield is useful until it grows into a cage. Guard halves every round.'],
    COUNTER: ['Proof Before Claim', 'A prediction is only a claim until the round resolves it.'],
    ADAPT: ['Memory Is Ancestral Terrain', 'What you were shapes what you can become — but the total never grows.'],
    MIRROR: ['Memory Is Ancestral Terrain', 'To copy is to inherit. The copy is always a little less than the original.'],
    RECOVER: ['Heat Must Be Carried', 'Rest is not free. Exposure is the price of clarity.'],
    SIGNATURE: ['Mask Is Mercy', 'A signature is what a mask chooses to show. The rules never let it change.'],
    STALL: ['Take the Useful, Bury the Hungry', 'A missed turn never secretly wins. The engine records a stall.'],
    BRIGHT: ['Heat Must Be Carried', 'Bright means overexposed: more pressure out, more damage in.'],
    STRAINED: ['Memory Is Ancestral Terrain', 'Drift is identity loosening under too much adaptation.'],
    END: ['Proof Before Claim', 'The result is not announced. It is proven, and it can be replayed.']
  };
  var el = DY.el;

  function Stage(host, cfg) {
    this.host = host; this.cfg = cfg || {}; this.speed = 1; this.mode = 'all'; this.playing = false; this.view = 'simple';
    this.match = null; this.round = 0; this.rt = null; this.tweens = []; this.fx = []; this.pops = []; this.unlocked = {};
    this.cam = { z: 1, px: 0, py: 0, tz: 1, tpx: 0, tpy: 0, shake: 0, sx: 0, sy: 0 }; this.flash = 0; this.frameFx = { lines: 0, lx: .5, ly: .5, ink: 0 }; this.hit = 0; this.ringClose = 0; this.lastTs = 0; this.time = 0;
    this.reduce = DY.reduce(); this.visible = true; this.dead = false; this.parts = []; this.grain = null;
    this.F = { a: this.mkFighter('a'), b: this.mkFighter('b') };
    this.build(); this.resize(); this.bindLoop();
  }
  Stage.prototype.mkFighter = function (side) { return { side: side, x: 0, y: 0, s: 1, face: side === 'a' ? 1 : -1, cold: 0, res: null, pose: this.pose0() }; };
  Stage.prototype.pose0 = function () { return { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, tilt: 0, flash: 0, ghost: 0, ghostDir: 1, glitch: 0, ring: 0, sway: 0, armF: 0, guard: 0, raise: 0, open: 0, up: 0, hurt: 0, ready: .25, stride: .25, crouch: .08, lean: 0 }; };
  Stage.REST = { armF: 0, guard: 0, raise: 0, open: 0, up: 0, hurt: 0, ready: .25, stride: .25, crouch: .08, lean: 0, tilt: 0 };

  Stage.prototype.build = function () {
    var h = this.host; h.classList.add('cs'); h.setAttribute('data-view', this.view);
    h.innerHTML =
      '<div class="cs-frame"><canvas class="cs-cv" aria-hidden="true"></canvas>' +
      '<div class="cs-hud">' + this.plateHTML('a') + '<div class="cs-mid"><div class="cs-seal" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="r1" cx="50" cy="50" r="44"/><circle class="r2" cx="50" cy="50" r="36"/><path class="tk" d="M50 2v9M50 89v9M2 50h9M89 50h9"/></svg><b class="rn">0</b></div><div class="cs-ph"><span class="ph">READY</span></div><div class="cs-planes" aria-hidden="true"><span data-p="d2">D2 Muse</span><span data-p="d0">D0 Engine</span></div></div>' + this.plateHTML('b') + '</div>' +
      '<div class="cs-banner a" aria-hidden="true"></div><div class="cs-banner b" aria-hidden="true"></div><div class="cs-lockchip a" aria-hidden="true"></div><div class="cs-lockchip b" aria-hidden="true"></div>' +
      '<div class="cs-sfx" aria-hidden="true"></div><div class="cs-cut" aria-hidden="true"></div><div class="cs-card" role="group" aria-label="Match card"></div><div class="cs-stamp" aria-hidden="true"></div></div>' +
      '<div class="cs-cap"><p class="cap" aria-live="polite"></p><p class="lore" aria-live="off"></p><div class="chg" aria-hidden="true"></div></div>' +
      '<div class="cs-tl" role="group" aria-label="Rounds"></div>' +
      '<div class="cs-ctl"><div class="cs-ctl-l"><button type="button" class="cbt" data-c="play" aria-label="Play">' + DY.icon('play', 18) + '<span>Play</span></button><button type="button" class="cbt" data-c="prev" aria-label="Previous round">←</button><button type="button" class="cbt" data-c="next" aria-label="Next round">→</button><button type="button" class="cbt" data-c="key" aria-pressed="false" title="Play only the rounds where something decisive happens">Key moments</button></div>' +
      '<div class="cs-ctl-r"><button type="button" class="cbt" data-c="speed" title="Playback speed">1×</button><button type="button" class="cbt" data-c="view" aria-pressed="false" title="Show every meter">Full meters</button><button type="button" class="cbt" data-c="sound" aria-pressed="false" title="Tactile sound: ceramic, relay, graphite">Sound off</button><button type="button" class="cbt" data-c="codex" title="Lore unlocked in this match">Codex <b class="cdx">0</b></button><button type="button" class="cbt" data-c="fs" aria-label="Fullscreen">⤢</button></div></div>' +
      '<aside class="cs-codex" hidden aria-label="Codex"><h4>Codex</h4><ul></ul><p class="muted">Lines unlock as their mechanic appears on stage.</p></aside>';
    var q = function (s) { return h.querySelector(s); };
    this.cv = q('.cs-cv'); this.g = this.cv.getContext('2d');
    this.dom = { frame: q('.cs-frame'), hud: q('.cs-hud'), rn: q('.rn'), ph: q('.ph'), seal: q('.cs-seal'), banA: q('.cs-banner.a'), banB: q('.cs-banner.b'), lcA: q('.cs-lockchip.a'), lcB: q('.cs-lockchip.b'), sfx: q('.cs-sfx'), cut: q('.cs-cut'), card: q('.cs-card'), stamp: q('.cs-stamp'), cap: q('.cap'), lore: q('.lore'), chg: q('.chg'), tl: q('.cs-tl'), codex: q('.cs-codex'), cdxN: q('.cdx'), planes: q('.cs-planes'),
      plate: { a: q('.pl-a'), b: q('.pl-b') } };
    var self = this;
    h.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) self.control(b.getAttribute('data-c'), b); });
    h.setAttribute('tabindex', '0'); h.setAttribute('role', 'region'); h.setAttribute('aria-label', 'Combat arena — replay of a DYADRYN match');
    h.addEventListener('keydown', function (e) { if (e.target.closest('button,input,select')) return; var k = e.key; if (k === ' ') { e.preventDefault(); self.control('play'); } else if (k === 'ArrowRight') { e.preventDefault(); self.control('next'); } else if (k === 'ArrowLeft') { e.preventDefault(); self.control('prev'); } else if (k === 's' || k === 'S') self.control('sound'); else if (k === 'f' || k === 'F') self.control('fs'); });
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(this.dom.frame); else window.addEventListener('resize', function () { self.resize(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }).observe(h);
    document.addEventListener('visibilitychange', function () { if (document.hidden && self.playing) self.pause(); });
    document.addEventListener('dy:motion', function () { self.reduce = DY.reduce(); });
    if (this.cfg.sound !== false && DY.StageSound) this.snd = DY.StageSound(this); else this.snd = function () {};
  };
  Stage.prototype.plateHTML = function (s) {
    return '<section class="pl pl-' + s + '" aria-label="' + (s === 'a' ? 'Left' : 'Right') + ' combatant"><div class="pl-id"><span class="pl-mask" aria-hidden="true"></span><div><b class="pl-name"></b><small class="pl-arch"></small></div></div>' +
      '<div class="vit" role="img" aria-label="Vitality"><i class="gh"></i><i class="fi"></i><span class="gd"></span><span class="lab">VIT</span><b class="num">100</b></div>' +
      '<div class="mini"><div class="en"><span>EN</span><i></i><b>100</b></div><div class="fo"><span>FOCUS</span><i></i><b>20</b></div></div>' +
      '<div class="chips"></div>' +
      '<div class="xtra"><div class="heat"><span>HEAT</span><i></i><em class="t70" title="Bright at 70"></em><em class="t90" title="Overheated at 90"></em><b>0</b></div><div class="dr"><span>DRIFT</span><i></i><em class="t60"></em><em class="t80"></em><b>0</b></div><div class="mo"><span>MOM</span><div class="pips"></div></div></div></section>';
  };
  Stage.prototype.maskSVG = function (side) {
    var l = side === 'a' ? 'M50 4C74 4 88 26 90 48C92 74 74 92 50 98Z' : 'M50 4C26 4 12 26 10 48C8 74 26 92 50 98Z', d = side === 'a' ? 'M50 4C26 4 12 26 10 48C8 74 26 92 50 98Z' : 'M50 4C74 4 88 26 90 48C92 74 74 92 50 98Z';
    return '<svg viewBox="0 0 100 102"><path d="' + d + '" fill="#E7DECA"/><path d="' + l + '" fill="#3D3E3B"/><path d="M50 2V100" stroke="' + (side === 'a' ? '#B85C32' : '#8FB1BC') + '" stroke-width="5"/><rect x="' + (side === 'a' ? 20 : 54) + '" y="42" width="26" height="9" fill="#050607"/></svg>';
  };

  /* ---------- geometry & sizing ---------- */
  Stage.prototype.resize = function () {
    var r = this.dom.frame.getBoundingClientRect(), w = Math.max(320, Math.round(r.width)), hh = Math.max(240, Math.round(r.height)); if (!r.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1); this.W = w; this.H = hh; this.dpr = dpr;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(hh * dpr); this.cv.style.width = w + 'px'; this.cv.style.height = hh + 'px';
    this.bg = A.paintBackground(w * dpr, hh * dpr); this.ht = A.halftoneOverlay(w * dpr, hh * dpr); this.grain = A.grainTile();
    var portrait = w / hh < 1.05; this.F.a.x = w * (portrait ? .27 : .27); this.F.b.x = w * (portrait ? .73 : .73);
    var ys = hh * .885; this.F.a.y = this.F.b.y = ys; this.F.a.s = this.F.b.s = hh * (portrait ? .0020 : .00175);
    this.dom.frame.style.setProperty('--u', (hh / 640).toFixed(3));
    this.dirty = true;
  };
  Stage.prototype.pt = function (side, part) { // world points on a fighter (css px)
    var F = this.F[side], s = F.s, f = F.face, P = F.pose, o = { head: [8, -262], chest: [10, -170], feet: [0, -8], front: [78, -170] }[part || 'chest'];
    return { x: F.x + (P.dx + o[0] * f * P.sx) * s + 0, y: F.y + (P.dy + o[1] * P.sy) * s };
  };

  /* ---------- clock ---------- */
  Stage.prototype.bindLoop = function () {
    var self = this;
    function frame(ts) { if (self.dead) return; requestAnimationFrame(frame); if (!self.visible && !self.dirty) { self.lastTs = ts; return; } var dt = Math.min(64, ts - (self.lastTs || ts)); self.lastTs = ts; self.tick(dt, ts); }
    requestAnimationFrame(frame);
  };
  Stage.prototype.destroy = function () { this.dead = true; };
  Stage.prototype.tick = function (dt, ts) {
    this.time = ts; var rt = this.rt;
    if (this.hit > 0) this.hit -= dt; // hit-stop freezes the round clock, not the render
    if (rt && this.playing && this.hit <= 0) {
      rt.t += dt * this.speed * (rt.fast ? 3.4 : 1);
      while (rt.q.length && rt.q[0].t <= rt.t) rt.q.shift().fn.call(this);
      if (rt.t >= rt.dur && !rt.ended) { rt.ended = true; this.afterRound(); }
    } else if (rt && !this.playing && rt.stepping && this.hit <= 0) { rt.t += dt * this.speed; while (rt.q.length && rt.q[0].t <= rt.t) rt.q.shift().fn.call(this); if (rt.t >= rt.dur && !rt.ended) { rt.ended = true; rt.stepping = false; this.afterRound(); } }
    var rtT = rt ? rt.t : 0; this.stepTweens(rtT);
    this.decay(dt); this.draw(ts); this.dirty = false;
  };
  Stage.prototype.tw = function (o, k, to, d, delay, ease) {
    var t0 = (this.rt ? this.rt.t : 0) + (delay || 0); this.tweens = this.tweens.filter(function (x) { return !(x.o === o && x.k === k); });
    this.tweens.push({ o: o, k: k, from: o[k], to: to, t0: t0, d: Math.max(1, d), e: ease || E.out3 });
  };
  Stage.prototype.stepTweens = function (t) { var keep = []; for (var i = 0; i < this.tweens.length; i++) { var w = this.tweens[i]; if (t < w.t0) { keep.push(w); continue; } var p = Math.min(1, (t - w.t0) / w.d); if (w.t0 === w.t0 && w.from === undefined) w.from = w.o[w.k]; w.o[w.k] = w.from + (w.to - w.from) * w.e(p); if (p < 1) keep.push(w); } this.tweens = keep; };
  Stage.prototype.decay = function (dt) {
    var k = dt / 16.7, c = this.cam;
    c.shake *= Math.pow(.86, k); c.sx = (Math.random() - .5) * c.shake; c.sy = (Math.random() - .5) * c.shake;
    this.flash = Math.max(0, this.flash - dt / 260); this.frameFx.lines = Math.max(0, this.frameFx.lines - dt / 520); this.frameFx.ink = Math.max(0, this.frameFx.ink - dt / 220);
    for (var s in this.F) { var p = this.F[s].pose; p.hurt = Math.max(0, p.hurt - dt / 520); p.flash = Math.max(0, p.flash - dt / 220); p.glitch = Math.max(0, p.glitch - dt / 400); p.sway *= Math.pow(.94, k); }
    // embers rise off heat; ash drifts through the city (sparse, and only when motion is welcome)
    if (!this.reduce) { for (var sd in this.F) { var Fs = this.F[sd], heat = Fs.res ? Fs.res.heat / 100 : 0; if (Math.random() < heat * .45 * k && this.parts.length < 90) this.parts.push({ x: Fs.x + (Math.random() - .5) * 120 * Fs.s, y: Fs.y - Math.random() * 260 * Fs.s, vx: (Math.random() - .5) * .3, vy: -.5 - Math.random() * .9, life: 1100 + Math.random() * 900, age: 0, s: 1.6 + Math.random() * 2, a: .95, c: heat >= .7 ? '#D78A43' : '#B85C32' }); } if (Math.random() < .35 * k && this.parts.length < 90) this.parts.push({ x: Math.random() * this.W, y: -6, vx: -.35 - Math.random() * .5, vy: .5 + Math.random() * .7, life: 5200, age: 0, s: 1.4 + Math.random() * 1.6, a: .45, c: '#D8D0BE' }); }
    for (var pj = this.parts.length - 1; pj >= 0; pj--) { var pp = this.parts[pj]; pp.x += pp.vx * k; pp.y += pp.vy * k; pp.age += dt; if (pp.age > pp.life || pp.y < -10 || pp.y > this.H + 10) this.parts.splice(pj, 1); }
    for (var i = this.fx.length - 1; i >= 0; i--) { var f = this.fx[i]; f.age += dt * (this.rt && this.hit > 0 ? 0 : 1); if (f.age >= f.life) this.fx.splice(i, 1); }
    for (var j = this.pops.length - 1; j >= 0; j--) { this.pops[j].age += dt; if (this.pops[j].age > this.pops[j].life) this.pops.splice(j, 1); }
    // camera ease back
    c.z += (c.tz - c.z) * Math.min(1, dt / 160) || 0; c.px += (c.tpx - c.px) * Math.min(1, dt / 160) || 0; c.py += (c.tpy - c.py) * Math.min(1, dt / 160) || 0;
  };
  Stage.prototype.cam0 = function () { this.cam.tz = 1; this.cam.tpx = 0; this.cam.tpy = 0; };

  /* ---------- rendering ---------- */
  Stage.prototype.draw = function (ts) {
    var g = this.g, d = this.dpr, W = this.W, H = this.H, c = this.cam;
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    g.save();
    var ox = c.sx * (this.reduce ? 0 : 1), oy = c.sy * (this.reduce ? 0 : 1);
    g.translate(W / 2 + ox, H * .62 + oy); g.scale(c.z, c.z); g.translate(-W / 2 + c.px, -H * .62 + c.py);
    // background (parallax by scale)
    g.save(); g.translate(W / 2, H / 2); g.scale(1 + (c.z - 1) * -.35, 1 + (c.z - 1) * -.35); g.translate(-W / 2, -H / 2); if (this.bg) g.drawImage(this.bg, 0, 0, W, H); g.restore();
    var ha = this.F.a.res ? this.F.a.res.heat : 0, hb = this.F.b.res ? this.F.b.res.heat : 0;
    A.drawRing(g, W, H, { close: this.ringClose, heat: Math.max(ha, hb) / 100 * (Math.max(ha, hb) >= 70 ? 1 : .35), heatA0: ts / 2600 });
    this.drawFx(g, 'under', ts);
    var order = ['a', 'b']; if (this.front === 'a') order = ['b', 'a'];
    for (var i = 0; i < 2; i++) { var F = this.F[order[i]]; g.save(); if (F.cold > 0) g.globalAlpha = 1 - F.cold * .25; A.drawFighter(g, F, ts); g.restore(); }
    this.drawFx(g, 'over', ts);
    for (var pi = 0; pi < this.parts.length; pi++) { var q = this.parts[pi], a = 1 - q.age / q.life; g.globalAlpha = a * q.a; g.fillStyle = q.c; g.fillRect(q.x, q.y, q.s, q.s * 1.5); } g.globalAlpha = 1;
    g.restore();
    // screen-space overlays
    if (this.ht) { g.save(); g.globalAlpha = .34 + this.frameFx.ink * .3; g.drawImage(this.ht, 0, 0, W, H); g.restore(); }
    if (this.grain && !this.reduce) { g.save(); g.globalAlpha = .55; var gx = (Math.floor(ts / 80) * 37) % 256, gy = (Math.floor(ts / 80) * 91) % 256; g.translate(-gx, -gy); g.fillStyle = g.createPattern(this.grain, 'repeat'); g.fillRect(0, 0, W + 256, H + 256); g.restore(); }
    var vg = g.createRadialGradient(W / 2, H * .55, H * .3, W / 2, H * .55, H * .95); vg.addColorStop(0, 'rgba(5,6,7,0)'); vg.addColorStop(1, 'rgba(5,6,7,.78)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (this.frameFx.lines > 0 && !this.reduce) A.speedLines(g, W * this.frameFx.lx, H * this.frameFx.ly, H * .16, H * 1.3, 46, Math.floor(ts / 70) % 7 + 3, this.frameFx.lines * .8, C.paper, W, H);
    if (this.flash > 0 && !this.reduce) { g.fillStyle = 'rgba(231,222,202,' + (this.flash * .85) + ')'; g.fillRect(0, 0, W, H); }
    if (this.frameFx.ink > 0 && !this.reduce) { g.fillStyle = 'rgba(5,6,7,' + (this.frameFx.ink * .7) + ')'; g.fillRect(0, 0, W, H); }
    // ink frame + registration corners
    g.strokeStyle = 'rgba(216,208,190,.55)'; g.lineWidth = 1.5; var m = 8; g.strokeRect(m, m, W - m * 2, H - m * 2); g.lineWidth = 2.5; g.strokeStyle = C.paper; var L = 22; [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(function (q) { g.beginPath(); g.moveTo(q[0], q[1] + q[3] * L); g.lineTo(q[0], q[1]); g.lineTo(q[0] + q[2] * L, q[1]); g.stroke(); });
  };
  Stage.prototype.drawFx = function (g, layer, ts) {
    for (var i = 0; i < this.fx.length; i++) { var f = this.fx[i]; if (f.layer !== layer) continue; var p = cl(f.age / f.life, 0, 1); g.save(); f.draw.call(this, g, p, f, ts); g.restore(); }
    if (layer === 'over') for (var j = 0; j < this.pops.length; j++) { var q = this.pops[j], pp = q.age / q.life, y = q.y - 50 * E.out3(pp); g.save(); g.globalAlpha = pp < .7 ? 1 : 1 - (pp - .7) / .3; g.font = '700 ' + Math.round(this.H * .05 * (q.big ? 1.3 : 1)) + 'px "IBM Plex Sans Condensed",sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = C.ink; g.strokeText(q.t, q.x, y); g.fillStyle = q.c; g.fillText(q.t, q.x, y); g.restore(); }
  };
  Stage.prototype.addFx = function (o) { o.age = 0; this.fx.push(o); return o; };
  Stage.prototype.pop = function (side, txt, col, big, dy) { var p = this.pt(side, 'head'); this.pops.push({ x: p.x + (side === 'a' ? -30 : 30), y: p.y + (dy || 0), t: txt, c: col, age: 0, life: 1300, big: big }); };
  Stage.prototype.shake = function (m) { if (!this.reduce) this.cam.shake = Math.max(this.cam.shake, m); };
  Stage.prototype.zoom = function (z, x, y) { if (this.reduce) return; this.cam.tz = z; this.cam.tpx = (this.W / 2 - x) * (z - 1) * .6; this.cam.tpy = (this.H * .62 - y) * (z - 1) * .5; };
  Stage.prototype.stop = function (ms) { if (!this.reduce) this.hit = Math.max(this.hit, ms); };

  DY.Stage = Stage; Stage.MOVE = MOVE; Stage.ICO = ICO; Stage.SIGN = SIGN; Stage.SIGCLASS = SIGCLASS; Stage.KANJI = KANJI; Stage.CODEX = CODEX;
})();
