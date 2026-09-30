/* DYADRYN Training Ground — play a simplified match and watch every round resolve in the combat arena.
   Rules here are the TRAINING model (teach.js), not the ranked resolver. */
(function () {
  'use strict';
  var DY = window.DY, T = DY.teach, $ = DY.$, $$ = DY.$$;
  var root = $('#tg'); if (!root || !T || !DY.Stage) return;
  var MAXR = 12;
  var OPP = { warden: { name: 'Warden', arch: 'Steady', sig: ['counter-oriented', 'resource-preserving', 'patient'] }, pressure: { name: 'Cinder', arch: 'Pressure', sig: ['prefers high intensity', 'volatile', 'likely to repeat successful lines'] }, hunter: { name: 'Metis', arch: 'Trace-Hunter', sig: ['information-seeking', 'long-horizon', 'counter-oriented'] } };
  var S, stage, ready = false;
  var el = { acts: $('#tgActs'), pred: $('#tgPred'), predB: $('#tgPredBtns'), lock: $('#tgLock'), nw: $('#tgNew'), skip: $('#tgSkip'), status: $('#tgStatus'), hashes: $('#tgHashes'), verify: $('#tgVerify'), vmsg: $('#tgVerifyMsg'), sig: $('#tgSignals') };
  var R = function (s) { return { vitality: s.vit, energy: s.en, focus: s.foc, heat: s.heat, momentum: s.mom, guard: s.guard, drift: s.drift }; };
  var post = function (s) { return { r: R(s), ins: s.insight, sg: [], adapt: s.adapt > 0 ? { stance: 'FLUX', left: s.adapt } : null, cd: s.sigCd > 0 ? { SIGNATURE: s.sigCd } : {}, sig: [] }; };
  var envAct = function (x, pred) { var o = { action: x, intensity: 2 }; if (pred) o.prediction = pred; if (x === 'ADAPT') o.adaptStance = 'FLUX'; if (x === 'SIGNATURE') o.signatureId = 'CONSTRAINT_COLLAPSE'; return o; };

  function reset(kind) {
    var seed = (Math.random() * 4294967295) >>> 0;
    S = { kind: kind, me: T.fresh(), opp: T.fresh(), hMe: [], hOpp: [], round: 1, over: false, sel: null, pred: null, seed: seed, commit: null, chain: [], canon: [], rnd: DY.rng(seed), sigs: 0, busy: false };
    S.me.name = 'You'; S.opp.name = OPP[kind].name;
    el.hashes.innerHTML = ''; el.vmsg.textContent = ''; el.verify.disabled = true; el.sig.innerHTML = '<li class="withheld">None revealed</li>'; el.status.textContent = 'Choose a move. Your opponent chooses at the same time.';
    DY.sha256('dyadryn.training.seed|' + seed).then(function (h) {
      S.commit = h; el.hashes.prepend(DY.el('li', { 'class': 'genesis' }, '<span class="caps">Seed</span><code>' + DY.short(h) + '</code><span class="muted">committed before move one</span>'));
      stage.beginTraining({ a: { name: 'You', arch: 'Operator' }, b: { name: OPP[kind].name, arch: OPP[kind].arch }, init: { a: post(S.me), b: post(S.opp) }, commit: h });
    });
    draw();
  }
  function draw() {
    var L = T.legal(S.me, S.opp);
    el.acts.innerHTML = T.ACTIONS.map(function (a) {
      var m = DY.MOVES.filter(function (x) { return x.k === a; })[0], ok = !S.over && !S.busy && L.indexOf(a) >= 0;
      var why = ok ? '' : (S.over ? 'Match over' : S.busy ? 'Round resolving' : a === 'SIGNATURE' ? 'Needs 30 Focus and no cooldown' : a === 'MIRROR' ? 'Needs a copyable opponent move' : 'Not enough Energy');
      return '<button type="button" class="tg-act" data-a="' + a + '" aria-pressed="' + (S.sel === a) + '"' + (ok ? '' : ' disabled title="' + why + '"') + '>' + DY.icon(m.ico, 26) + '<b>' + m.name + '</b><small>' + (a === 'RECOVER' ? '+Energy' : '−' + T.COST[a]) + '</small></button>';
    }).join('');
    el.pred.hidden = S.sel !== 'COUNTER';
    if (S.sel === 'COUNTER') el.predB.innerHTML = T.ACTIONS.filter(function (a) { return a !== 'COUNTER'; }).map(function (a) { return '<button type="button" class="tg-p" data-p="' + a + '" aria-pressed="' + (S.pred === a) + '">' + a.charAt(0) + a.slice(1).toLowerCase() + '</button>'; }).join('');
    el.lock.disabled = S.over || S.busy || !S.sel || (S.sel === 'COUNTER' && !S.pred) || !ready;
    el.skip.hidden = !S.busy;
  }
  el.acts.addEventListener('click', function (e) { var b = e.target.closest('.tg-act'); if (!b || b.disabled) return; S.sel = b.getAttribute('data-a'); if (S.sel !== 'COUNTER') S.pred = null; draw(); if (S.sel === 'COUNTER') { var f = $('.tg-p', el.predB); if (f) f.focus(); } });
  el.predB.addEventListener('click', function (e) { var b = e.target.closest('.tg-p'); if (!b) return; S.pred = b.getAttribute('data-p'); draw(); el.lock.focus(); });

  el.lock.addEventListener('click', function () {
    if (S.busy || S.over || !S.sel) return; S.busy = true; el.lock.disabled = true;
    var pre = { a: post(S.me), b: post(S.opp) }, me = S.me, opp = S.opp, my = { act: S.sel, pred: S.pred };
    var po = T.policy(S.kind, opp, me, S.hMe, S.rnd), r = T.resolve(me, opp, my.act, po.act, my.pred, po.pred, S.rnd);
    S.hMe.push(my.act); S.hOpp.push(po.act); S.me = r.A; S.opp = r.B; S.me.name = 'You'; S.opp.name = OPP[S.kind].name;
    if (my.act === 'TRACE' && S.sigs < OPP[S.kind].sig.length) { var sg = OPP[S.kind].sig[S.sigs++]; if (S.sigs === 1) el.sig.innerHTML = ''; el.sig.appendChild(DY.el('li', { 'class': 'tag tag--trace' }, sg)); }
    var canon = 'dyadryn.training|' + S.commit + '|r=' + S.round + '|A=' + my.act + (my.pred ? '(' + my.pred + ')' : '') + '|B=' + po.act + '|v=' + Math.round(S.me.vit) + '/' + Math.round(S.opp.vit) + '|e=' + Math.round(S.me.en) + '/' + Math.round(S.opp.en);
    var prev = S.chain.length ? S.chain[S.chain.length - 1] : S.commit, end = !!r.outcome || S.round >= MAXR, res = r.outcome;
    if (end && !res) { var a = T.score(S.me), b = T.score(S.opp); res = Math.abs(a - b) < .5 ? 'draw' : a > b ? 'A' : 'B'; }
    DY.sha256(canon + '|prev=' + prev).then(function (h) {
      S.canon.push(canon); S.chain.push(h); el.verify.disabled = false;
      el.hashes.appendChild(DY.el('li', null, '<span class="caps">R' + S.round + '</span><code>' + DY.short(h) + '</code><span class="muted">' + my.act + ' vs ' + po.act + '</span>'));
      var rd = { n: S.round, pre: pre, post: { a: post(S.me), b: post(S.opp) }, a: envAct(my.act, my.pred), b: envAct(po.act, po.pred), notes: [], hash: h, prev: prev, alts: [] };
      if (end) { rd.outcome = { winner: res === 'A' ? 'A' : res === 'B' ? 'B' : null, reason: r.outcome ? (r.outcome === 'draw' ? 'double_ko' : 'ko') : 'round_limit' }; stage.M.scores = { a: T.score(S.me), b: T.score(S.opp) }; }
      stage.speed = 1.35; stage.cfg.onRoundEnd = function () { S.busy = false; S.sel = null; S.pred = null; if (end) { S.over = true; el.status.innerHTML = res === 'A' ? '<b>Proof complete.</b> You won.' : res === 'B' ? '<b>Match closed.</b> ' + S.opp.name + ' won. The proof chain below is checkable.' : '<b>No proof advantage.</b> Draw.'; DY.sha256('dyadryn.training.seed|' + S.seed).then(function (hh) { el.hashes.appendChild(DY.el('li', { 'class': 'genesis' }, '<span class="caps">Seed revealed</span><code>' + S.seed + '</code><span class="muted">' + (hh === S.commit ? '✓ matches the commitment' : '✕ mismatch') + '</span>')); }); el.nw.focus(); } else { S.round++; el.status.textContent = 'Round ' + (S.round - 1) + ' resolved. Choose your next move.'; } draw(); };
      el.status.textContent = 'Round ' + S.round + ' resolving…'; draw(); stage.playNext(rd);
    });
  });
  el.skip.addEventListener('click', function () { stage.speed = 9; });
  el.nw.addEventListener('click', function () { reset(S.kind); });
  el.verify.addEventListener('click', function () {
    var p = Promise.resolve(S.commit), ok = 0, bad = -1;
    S.canon.forEach(function (c, i) { p = p.then(function (prev) { return DY.sha256(c + '|prev=' + prev).then(function (h) { if (h === S.chain[i]) ok++; else if (bad < 0) bad = i; return S.chain[i]; }); }); });
    p.then(function () { el.vmsg.textContent = bad < 0 ? 'Chain verified: all ' + ok + ' links recompute from the seed commitment.' : 'Chain broken at round ' + (bad + 1) + '.'; });
  });
  $$('.tg-opps [role=radio]').forEach(function (b) { b.addEventListener('click', function () { $$('.tg-opps [role=radio]').forEach(function (x) { x.setAttribute('aria-checked', x === b); }); reset(b.getAttribute('data-kind')); }); });
  stage = new DY.Stage($('#tgStage'), { training: true, speed: 1.35, verifyHref: null, onNew: function () { reset(S.kind); } }); stage.host.classList.add('cs--train'); stage.speed = 1.35;
  var boot = function () { ready = true; reset('warden'); }; if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
