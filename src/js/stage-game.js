/* DYADRYN Combat Stage — match logic: normalisation, HUD, captions, timeline, controls, lore */
(function () {
  'use strict';
  var DY = window.DY, S = DY.Stage, P = S.prototype, MOVE = S.MOVE, ICO = S.ICO, SIGN = S.SIGN, KANJI = S.KANJI, CODEX = S.CODEX, A = DY.StageArt, E = A.E, cl = A.cl, el = DY.el;
  var R = function (v) { return Math.round(v); };
  var cjk = (function () { try { var c = document.createElement('canvas').getContext('2d'); c.font = '20px sans-serif'; var a = c.measureText('観').width, b = c.measureText('￿').width; return a > 0 && Math.abs(a - b) > .5 && a > 12; } catch (e) { return false; } })();
  S.cjk = cjk;

  /* --- normalise an engine replay (or any adapter) into rounds --- */
  S.normalize = function (m) {
    var rounds = [], F = m.frames;
    for (var i = 1; i < F.length; i++) {
      var f = F[i], pre = F[i - 1].post, a = f.actions.a || { action: 'STALL' }, b = f.actions.b || { action: 'STALL' };
      rounds.push({ n: f.round, pre: pre, post: f.post, a: a, b: b, notes: f.notes || [], hash: f.hash, prev: f.prev, alts: f.alts || [] });
    }
    var out = { id: m.id, label: m.label, a: m.a, b: m.b, rounds: rounds, outcome: m.outcome, scores: m.scores || null, seed_commitment: m.seed_commitment, root: m.root, mode: m.mode, verified: m.engine_verified, init: F[0].post, source: m.source || 'engine' };
    for (var j = 0; j < rounds.length; j++) rounds[j].key = keyRound(rounds, j, out);
    return out;
  };
  function dv(R, side) { var o = {}, pr = R.pre[side].r, po = R.post[side].r; for (var k in po) o[k] = po[k] - pr[k]; return o; }
  function keyRound(rs, j, M) {
    var r = rs[j], da = dv(r, 'a'), db = dv(r, 'b');
    if (j === 0 || j === rs.length - 1) return true;
    if (da.vitality < -8 || db.vitality < -8 || da.vitality > 5 || db.vitality > 5) return true;
    if (r.a.action === 'SIGNATURE' || r.b.action === 'SIGNATURE' || r.a.action === 'ADAPT' || r.b.action === 'ADAPT') return true;
    if (r.a.action === 'COUNTER' && r.a.prediction === r.b.action || r.b.action === 'COUNTER' && r.b.prediction === r.a.action) return true;
    if (r.pre.a.r.heat < 70 && r.post.a.r.heat >= 70 || r.pre.b.r.heat < 70 && r.post.b.r.heat >= 70) return true;
    return false;
  }
  S.dv = dv; S.cjkOK = cjk;

  P.load = function (m) {
    this.pause(); this.M = S.normalize(m); this.round = 0; this.unlocked = {}; this.dom.codex.querySelector('ul').innerHTML = ''; this.dom.cdxN.textContent = '0';
    var M = this.M; this.names = { a: M.a.name, b: M.b.name }; this.F.a.arch = M.a.arch; this.F.b.arch = M.b.arch;
    ['a', 'b'].forEach(function (s) { var pl = this.dom.plate[s]; pl.querySelector('.pl-name').textContent = M[s].name; pl.querySelector('.pl-arch').textContent = M[s].arch; pl.querySelector('.pl-mask').innerHTML = this.maskSVG(s); }, this);
    this.buildTimeline(); this.snap(0); this.introCard();
  };
  P.introCard = function () {
    if (this.cfg.training) return;
    var M = this.M, c = this.dom.card; c.classList.add('show'); c.innerHTML = '<div class="cd-in"><span class="caps">' + (M.source === 'engine' ? 'Real engine replay' : 'Training match') + '</span><h3>' + M.a.name + ' <em>×</em> ' + M.b.name + '</h3><p>' + M.a.arch + ' against ' + M.b.arch + '. Both masks clean. Seed committed <code>' + (M.seed_commitment ? M.seed_commitment.slice(0, 4) + '·' + M.seed_commitment.slice(4, 8) : '····') + '</code>.</p><p class="cd-q">How much information is worth giving up tempo for?</p><button type="button" class="btn btn--primary btn--sm" data-c="play">' + DY.icon('play', 16) + ' Begin round 1</button></div>';
  };
  P.hideCard = function () { this.dom.card.classList.remove('show'); };

  /* --- timeline strip --- */
  P.buildTimeline = function () {
    var tl = this.dom.tl, self = this; tl.innerHTML = '';
    this.M.rounds.forEach(function (r, i) {
      var b = el('button', { type: 'button', 'class': 'tc' + (r.key ? ' k' : ''), 'aria-label': 'Round ' + r.n + ': ' + MOVE[r.a.action] + ' versus ' + MOVE[r.b.action], 'data-i': i }, '<span class="tn">' + r.n + '</span><span class="ti a">' + DY.icon(ICO[r.a.action], 14) + '</span><span class="ti b">' + DY.icon(ICO[r.b.action], 14) + '</span>');
      b.addEventListener('click', function () { self.pause(); self.snap(i + 1); }); tl.appendChild(b);
    });
  };
  P.markTimeline = function (i) { var cs = this.dom.tl.children; for (var k = 0; k < cs.length; k++) { cs[k].classList.toggle('on', k === i - 1); cs[k].classList.toggle('past', k < i - 1); } var cur = cs[i - 1]; if (cur && cur.scrollIntoView && this.dom.tl.scrollWidth > this.dom.tl.clientWidth) this.dom.tl.scrollLeft = cur.offsetLeft - this.dom.tl.clientWidth / 2; };

  /* --- HUD --- */
  P.setPlate = function (side, post, instant) {
    var pl = this.dom.plate[side], r = post.r, fi = pl.querySelector('.vit .fi'), gh = pl.querySelector('.vit .gh'), gd = pl.querySelector('.vit .gd');
    var v = cl(r.vitality, 0, 100); fi.style.width = v + '%'; if (instant) { gh.style.transition = 'none'; gh.style.width = v + '%'; void gh.offsetWidth; gh.style.transition = ''; } else gh.style.width = v + '%';
    gd.style.width = cl(r.guard / 60 * 100, 0, 100) * .5 + '%'; gd.setAttribute('data-n', r.guard > 0.5 ? R(r.guard) : '');
    pl.querySelector('.vit .num').textContent = R(v);
    pl.querySelector('.vit').setAttribute('aria-label', 'Vitality ' + R(v) + ' of 100' + (r.guard > .5 ? ', guard ' + R(r.guard) : ''));
    pl.querySelector('.en i').style.setProperty('--w', cl(r.energy, 0, 100) + '%'); pl.querySelector('.en b').textContent = R(r.energy);
    pl.querySelector('.fo i').style.setProperty('--w', cl(r.focus, 0, 100) + '%'); pl.querySelector('.fo b').textContent = R(r.focus);
    pl.querySelector('.heat i').style.setProperty('--w', cl(r.heat, 0, 100) + '%'); pl.querySelector('.heat b').textContent = R(r.heat); pl.querySelector('.heat').classList.toggle('br', r.heat >= 70);
    pl.querySelector('.dr i').style.setProperty('--w', cl(r.drift, 0, 100) + '%'); pl.querySelector('.dr b').textContent = R(r.drift); pl.querySelector('.dr').classList.toggle('br', r.drift >= 60);
    var pips = ''; for (var m = -3; m <= 3; m++) pips += '<i class="' + (m === 0 ? 'z ' : '') + ((m > 0 && r.momentum >= m) || (m < 0 && r.momentum <= m) ? 'on' : '') + '"></i>'; pl.querySelector('.pips').innerHTML = pips; pl.querySelector('.mo').setAttribute('aria-label', 'Momentum ' + R(r.momentum));
    var ch = []; if (r.heat >= 90) ch.push(['OVERHEATED', 'hot']); else if (r.heat >= 70) ch.push(['BRIGHT', 'hot']);
    if (r.drift >= 80) ch.push(['UNSTABLE', 'dr']); else if (r.drift >= 60) ch.push(['STRAINED', 'dr']);
    if (post.adapt) ch.push([post.adapt.stance + ' ' + post.adapt.left, 'st']);
    var cd = Object.keys(post.cd || {}); if (cd.length) ch.push(['COOLDOWN', 'cd']);
    pl.querySelector('.chips').innerHTML = ch.map(function (c) { return '<span class="ch ' + c[1] + '">' + c[0] + '</span>'; }).join('');
    var F = this.F[side]; F.res = r; pl.classList.toggle('bright', r.heat >= 70); pl.classList.toggle('drift', r.drift >= 60);
  };
  P.setPhase = function (name, plane) {
    this.dom.ph.textContent = name; this.dom.frame.setAttribute('data-phase', name);
    var ps = this.dom.planes.children; for (var i = 0; i < ps.length; i++) ps[i].classList.toggle('on', ps[i].getAttribute('data-p') === plane);
  };
  P.caption = function (txt, lore) { this.dom.cap.textContent = txt; this.dom.lore.textContent = lore || ''; this.dom.lore.classList.toggle('on', !!lore); };
  P.chg = function (Rd) {
    var self = this, rows = ['a', 'b'].map(function (s) {
      var d = dv(Rd, s), parts = [];
      [['vitality', 'VIT'], ['energy', 'EN'], ['focus', 'FOC'], ['heat', 'HEAT'], ['momentum', 'MOM'], ['guard', 'GRD'], ['drift', 'DRF']].forEach(function (k) { var v = d[k[0]]; if (Math.abs(v) >= .5) parts.push('<span class="' + (v > 0 ? 'up' : 'dn') + '">' + k[1] + ' ' + (v > 0 ? '+' : '−') + Math.abs(R(v)) + '</span>'); });
      return '<div><b>' + self.names[s] + '</b>' + (parts.join('') || '<span class="nt">no change</span>') + '</div>';
    });
    this.dom.chg.innerHTML = rows.join('');
  };
  P.stamp = function (Rd, on) {
    var st = this.dom.stamp; if (!on) { st.classList.remove('on'); return; }
    st.innerHTML = '<span class="caps">Round ' + Rd.n + ' sealed</span><code>' + (Rd.prev ? Rd.prev.slice(0, 4) + '·' + Rd.prev.slice(4, 8) : '····') + '</code><i aria-hidden="true">→</i><code class="cur">' + (Rd.hash ? Rd.hash.slice(0, 4) + '·' + Rd.hash.slice(4, 8) : '····') + '</code>'; st.classList.add('on');
  };
  P.unlock = function (key) {
    if (this.unlocked[key] || !CODEX[key]) return null; this.unlocked[key] = 1; var c = CODEX[key], ul = this.dom.codex.querySelector('ul');
    ul.appendChild(el('li', null, '<b>' + c[0] + '</b><span>' + c[1] + '</span>')); this.dom.cdxN.textContent = Object.keys(this.unlocked).length; return c;
  };

  /* --- text --- */
  P.act = function (x, name) { var m = MOVE[x.action] || x.action; if (x.action === 'SIGNATURE') return (SIGN[x.signatureId] || 'Signature'); if (x.action === 'COUNTER') return 'Counter (predicting ' + MOVE[x.prediction] + ')'; if (x.action === 'ADAPT') return 'Adapt into ' + (x.adaptStance || '').charAt(0) + (x.adaptStance || '').slice(1).toLowerCase(); return m; };
  P.describeChoice = function (Rd) { return 'Round ' + Rd.n + '. ' + this.names.a + ' chose ' + this.act(Rd.a) + '. ' + this.names.b + ' chose ' + this.act(Rd.b) + '.'; };
  P.describeResult = function (Rd) {
    var n = this.names, da = dv(Rd, 'a'), db = dv(Rd, 'b'), out = [];
    var ch = function (X, O, x, o, dx, dO) { if (x.action === 'COUNTER' && o.action !== 'COUNTER') return x.prediction === o.action ? n[X] + '’s read was right: ' + MOVE[o.action] + ' was met.' : n[X] + ' predicted ' + MOVE[x.prediction] + ' and missed. Drift rises.'; return ''; };
    var ca = ch('a', 'b', Rd.a, Rd.b, da, db), cb = ch('b', 'a', Rd.b, Rd.a, db, da); if (ca) out.push(ca); if (cb) out.push(cb);
    if (da.vitality < -.5) out.push(n.a + ' lost ' + R(-da.vitality) + ' vitality.'); if (db.vitality < -.5) out.push(n.b + ' lost ' + R(-db.vitality) + ' vitality.');
    if (da.vitality > .5) out.push(n.a + ' recovered ' + R(da.vitality) + ' vitality.'); if (db.vitality > .5) out.push(n.b + ' recovered ' + R(db.vitality) + ' vitality.');
    if (!(da.vitality < -.5 || db.vitality < -.5)) out.push('No vitality was lost.');
    if (Rd.pre.a.r.heat < 70 && Rd.post.a.r.heat >= 70) out.push(n.a + ' is BRIGHT.'); if (Rd.pre.b.r.heat < 70 && Rd.post.b.r.heat >= 70) out.push(n.b + ' is BRIGHT.');
    if (Rd.notes.length) out.push(Rd.notes.join(' '));
    return out.join(' ');
  };

  /* --- state changes --- */
  P.snap = function (i) {
    this.tweens = []; this.fx = []; this.pops = []; this.rt = null; this.hit = 0; this.cam0(); this.cam.z = 1; this.cam.px = this.cam.py = 0; this.flash = 0; this.frameFx.lines = 0; this.ringClose = 0; this.speed = this.speed || 1;
    this.round = i; var M = this.M; this.dom.banA.className = 'cs-banner a'; this.dom.banB.className = 'cs-banner b'; this.dom.lcA.className = 'cs-lockchip a'; this.dom.lcB.className = 'cs-lockchip b'; this.dom.cut.className = 'cs-cut'; this.dom.sfx.innerHTML = ''; this.stamp(null, false);
    ['a', 'b'].forEach(function (s) { var F = this.F[s]; F.pose = this.pose0(); F.cold = 0; }, this);
    var post = i === 0 ? M.init : M.rounds[i - 1].post; this.setPlate('a', post.a, true); this.setPlate('b', post.b, true);
    this.dom.rn.textContent = i; this.markTimeline(i); this.setPhase(i === 0 ? 'READY' : 'ROUND ' + i, null);
    if (i === 0) { this.caption('Both masks clean. Seed committed. Press play, or step through a round at a time.', ''); this.dom.chg.innerHTML = ''; }
    else { var Rd = M.rounds[i - 1]; this.caption(this.describeChoice(Rd) + ' ' + this.describeResult(Rd), ''); this.chg(Rd); }
    if (i === M.rounds.length && M.outcome) this.applyEnding(true);
    if (i > 0) this.hideCard(); else this.introCard();
    this.updatePlayBtn(); this.dirty = true;
  };
  P.applyEnding = function (instant) {
    var o = this.M.outcome, lose = o && o.winner ? (o.winner === 'A' ? 'b' : 'a') : null; if (lose) { this.F[lose].cold = 1; this.F[lose].pose.dy = 6; this.F[lose].pose.rot = .14; this.F[lose].pose.tilt = .3; }
    this.ringClose = o && o.winner ? .9 : .3;
    if (instant) this.showEnd(true);
  };
  P.showEnd = function (instant) {
    var M = this.M, o = M.outcome, c = this.dom.card, win = o && o.winner ? this.names[o.winner.toLowerCase()] : null;
    var reason = { ko: 'Vitality reached zero.', double_ko: 'Both reached zero in the same round.', forfeit: 'Three timeouts.', double_forfeit: 'Both forfeited.', round_limit: 'Round ' + M.rounds.length + ' reached. The proof score decides.' }[o.reason] || '';
    var bars = ''; if (M.scores && o.reason === 'round_limit') { var mx = Math.max(M.scores.a, M.scores.b, 1); bars = '<div class="sc"><div><b>' + this.names.a + '</b><i style="--v:' + (M.scores.a / mx * 100) + '%"></i><em>' + M.scores.a.toFixed(1) + '</em></div><div><b>' + this.names.b + '</b><i style="--v:' + (M.scores.b / mx * 100) + '%"></i><em>' + M.scores.b.toFixed(1) + '</em></div><small>Proof score — a weighted blend of the final meters</small></div>'; }
    c.classList.add('show', 'end'); c.innerHTML = '<div class="cd-in"><span class="caps">' + (win ? 'Proof complete' : 'No proof advantage') + '</span><h3>' + (win ? win + ' <em>wins</em>' : 'Draw') + '</h3><p>' + reason + '</p>' + bars + '<p class="proofline">Proofline <code>' + (M.root ? M.root.slice(0, 4) + '·' + M.root.slice(4, 8) : '····') + '</code>' + (M.verified ? ' · engine re-resolved all ' + M.verified.rounds + ' rounds ✓' : '') + '</p><div class="btn-row" style="justify-content:center"><button type="button" class="btn btn--primary btn--sm" data-c="' + (this.cfg.training ? 'newmatch' : 'restart') + '">' + (this.cfg.training ? 'New match' : 'Watch again') + '</button>' + (this.cfg.verifyHref ? '<a class="btn btn--ghost btn--sm" href="' + this.cfg.verifyHref + '">Verify the proof</a>' : '') + '</div></div>';
    if (!instant) this.unlockLine('END');
  };
  P.unlockLine = function (key) { var c = this.unlock(key); if (c) this.dom.lore.textContent = c[0] + ' — ' + c[1], this.dom.lore.classList.add('on'); };

  /* --- transport --- */
  P.updatePlayBtn = function () { var b = this.host.querySelector('[data-c=play]'); if (!b) return; var end = this.M && this.round >= this.M.rounds.length; b.innerHTML = DY.icon(this.playing ? 'pause' : 'play', 18) + '<span>' + (this.playing ? 'Pause' : end ? 'Replay' : this.round === 0 ? 'Play' : 'Resume') + '</span>'; b.setAttribute('aria-label', this.playing ? 'Pause' : 'Play'); };
  P.play = function () { if (!this.M) return; if (this.round >= this.M.rounds.length) this.snap(0); this.hideCard(); this.playing = true; this.snd('resume'); if (!this.rt || this.rt.ended) this.playRound(this.round); this.updatePlayBtn(); };
  P.pause = function () { this.playing = false; this.updatePlayBtn(); };
  P.playRound = function (i, o) {
    var Rd = this.M.rounds[i], fast = this.mode === 'key' && !Rd.key && !(o && o.step); this.hideCard(); this.round = i; this.tweens = []; this.fx = []; this.pops = [];
    this.rt = { i: i, t: 0, dur: 4700, q: [], ended: false, fast: fast, stepping: !!(o && o.step) };
    ['a', 'b'].forEach(function (s) { var F = this.F[s]; if (F.cold === 0) F.pose = this.pose0(); }, this);
    this.plan(Rd, fast); this.rt.q.sort(function (a, b) { return a.t - b.t; }); if (this.rt.dur < 4700) this.rt.dur = 4700;
  };
  P.afterRound = function () {
    var i = this.rt.i, M = this.M; this.round = i + 1; this.markTimeline(this.round);
    if (this.cfg.training) { this.playing = false; this.speed = this.cfg.speed || 1; if (M.outcome && this.round >= M.rounds.length) this.showEnd(false); this.updatePlayBtn(); if (this.cfg.onRoundEnd) this.cfg.onRoundEnd(); return; }
    if (this.round >= M.rounds.length) { this.playing = false; this.showEnd(false); this.updatePlayBtn(); return; }
    if (this.playing) this.playRound(this.round); else this.updatePlayBtn();
  };
  P.control = function (c, btn) {
    var M = this.M; if (!M) return;
    if (c === 'play') { this.playing ? this.pause() : this.play(); }
    else if (c === 'restart') { this.snap(0); this.play(); }
    else if (c === 'newmatch') { if (this.cfg.onNew) this.cfg.onNew(); }
    else if (c === 'next') { this.pause(); if (this.round >= M.rounds.length) return; this.hideCard(); this.playRound(this.round, { step: true }); }
    else if (c === 'prev') { this.pause(); this.snap(Math.max(0, (this.rt && !this.rt.ended ? this.rt.i : this.round) - 1)); }
    else if (c === 'key') { this.mode = this.mode === 'key' ? 'all' : 'key'; btn.setAttribute('aria-pressed', this.mode === 'key'); }
    else if (c === 'speed') { var sp = [1, 1.5, 2, .5]; this.speed = sp[(sp.indexOf(this.speed) + 1) % sp.length]; btn.textContent = this.speed + '×'; }
    else if (c === 'view') { this.view = this.view === 'full' ? 'simple' : 'full'; this.host.setAttribute('data-view', this.view); btn.setAttribute('aria-pressed', this.view === 'full'); btn.textContent = this.view === 'full' ? 'Simple meters' : 'Full meters'; this.resize(); }
    else if (c === 'sound') { var on = this.snd('toggle'); btn.setAttribute('aria-pressed', on); btn.textContent = on ? 'Sound on' : 'Sound off'; }
    else if (c === 'codex') { this.dom.codex.hidden = !this.dom.codex.hidden; }
    else if (c === 'fs') { var f = this.host; if (document.fullscreenElement) document.exitFullscreen(); else if (f.requestFullscreen) f.requestFullscreen().catch(function () {}); }
  };
  P.setMatch = function (m) { this.load(m); };
  /* training: a match that grows one played round at a time */
  P.beginTraining = function (meta) {
    this.pause(); this.M = { id: 'training', label: meta.a.name + ' vs ' + meta.b.name, a: meta.a, b: meta.b, rounds: [], outcome: null, scores: null, seed_commitment: meta.commit, root: null, mode: 'TRAINING', verified: null, init: meta.init, source: 'training' };
    this.names = { a: meta.a.name, b: meta.b.name }; this.F.a.arch = meta.a.arch; this.F.b.arch = meta.b.arch; this.unlocked = {}; this.dom.codex.querySelector('ul').innerHTML = ''; this.dom.cdxN.textContent = '0';
    ['a', 'b'].forEach(function (s) { var pl = this.dom.plate[s]; pl.querySelector('.pl-name').textContent = meta[s].name; pl.querySelector('.pl-arch').textContent = meta[s].arch; pl.querySelector('.pl-mask').innerHTML = this.maskSVG(s); }, this);
    this.buildTimeline(); this.snap(0); this.hideCard(); this.dom.card.className = 'cs-card';
  };
  P.playNext = function (rd) { this.M.rounds.push(rd); this.dom.tl.innerHTML = ''; if (rd.outcome) this.M.outcome = rd.outcome; this.hideCard(); this.playing = true; this.speed = this.speed || 1; this.playRound(this.M.rounds.length - 1); };
})();
