/* DYADRYN arena — replay viewer, counterfactual branch, proof tamper demo, ring figure */
(function () {
  'use strict';
  var DY = window.DY, T = DY.teach, $ = DY.$, $$ = DY.$$;
  if (!$('#rp') || !T) return;
  var m = DY.sample(), R = m.rounds, N = R.length - 1;
  var canon = [], chain = [], genesis = null;
  function canonOf(i) { var r = R[i]; return 'dyadryn.sample|r=' + i + '|A=' + r.actA + (r.predA ? '(' + r.predA + ')' : '') + '|B=' + r.actB + '|vit=' + Math.round(r.A.vit) + '/' + Math.round(r.B.vit) + '|en=' + Math.round(r.A.en) + '/' + Math.round(r.B.en); }
  function buildChain() {
    var p = DY.sha256('dyadryn.sample.seed|2024').then(function (g) { genesis = g; return g; });
    for (var i = 1; i <= N; i++) (function (i) { canon[i] = canonOf(i); p = p.then(function (prev) { return DY.sha256(canon[i] + '|prev=' + prev).then(function (h) { chain[i] = h; return h; }); }); })(i);
    return p;
  }

  /* ---------- replay ---------- */
  var cur = 0, timer = null;
  $('#rpOf').textContent = 'of ' + N; $('#rpRange').max = N;
  var moveOf = function (k) { return DY.MOVES.filter(function (x) { return x.k === k; })[0]; };
  var actCard = function (k, pred) { if (!k) return '<span class="muted caps">Match start</span>'; var mv = moveOf(k); return DY.icon(mv.ico, 34) + '<b>' + mv.name + '</b>' + (pred ? '<small>predicts ' + pred.charAt(0) + pred.slice(1).toLowerCase() + '</small>' : ''); };
  function show(i) {
    cur = i; var r = R[i];
    $('#rpN').textContent = i; $('#rpRange').value = i;
    DY.meters($('#rpA'), r.A, false); DY.meters($('#rpB'), r.B, false);
    $('#rpActA').innerHTML = actCard(r.actA, r.predA); $('#rpActB').innerHTML = actCard(r.actB, r.predB);
    $('#rpEv').innerHTML = i === 0 ? '<li>Both masks clean. Seed committed. Enter.</li>' : r.events.map(function (e) { return '<li class="' + (e.side === 'A' ? 'me' : 'op') + '">' + e.t.replace(/^You /, 'Metis ') + '</li>'; }).join('');
    if (i === N) { var w = m.winner; $('#rpEv').innerHTML += '<li class="ev-head"><b>' + (w === 'A' ? 'Proof complete. Metis won.' : w === 'B' ? 'Match closed. Cinder won.' : 'No proof advantage.') + '</b></li>'; }
    $('#rpHash').textContent = i && chain[i] ? DY.short(chain[i]) : (i ? '····' : 'genesis');
    var A = R.map(function (x) { return x.A.vit; }), B = R.map(function (x) { return x.B.vit; });
    DY.lineChart($('#rpChart'), [{ name: 'Metis', cls: 'la', mk: 'c', values: A }, { name: 'Cinder', cls: 'lb', mk: 's', values: B }], { marks: [{ x: i, label: 'Round ' + i }], label: 'Vitality by round; current round ' + i });
    $('#rpSimOut').hidden = true; setAlt();
  }
  function setAlt() {
    var sel = $('#rpAlt'); if (cur === 0) { sel.innerHTML = '<option>Start of match</option>'; sel.disabled = true; $('#rpSim').disabled = true; return; }
    sel.disabled = false; $('#rpSim').disabled = false;
    var prev = R[cur - 1], legal = T.legal(prev.A, prev.B);
    sel.innerHTML = legal.map(function (a) { return '<option value="' + a + '"' + (a === R[cur].actA ? ' selected' : '') + '>' + moveOf(a).name + (a === R[cur].actA ? ' (actual)' : '') + '</option>'; }).join('');
    var ps = $('#rpPredSel'); ps.innerHTML = T.ACTIONS.filter(function (a) { return a !== 'COUNTER'; }).map(function (a) { return '<option value="' + a + '"' + (a === (R[cur].predA || R[cur].actB) ? ' selected' : '') + '>' + moveOf(a).name + '</option>'; }).join('');
    $('#rpPredWrap').hidden = sel.value !== 'COUNTER';
  }
  $('#rpAlt').addEventListener('change', function () { $('#rpPredWrap').hidden = this.value !== 'COUNTER'; });
  $('#rpSim').addEventListener('click', function () {
    var prev = R[cur - 1], alt = $('#rpAlt').value, pred = alt === 'COUNTER' ? $('#rpPredSel').value : null;
    var b = T.resolve(prev.A, prev.B, alt, R[cur].actB, pred, R[cur].predB, null), a = R[cur];
    var d = function (x, y) { var v = Math.round(x - y); return (v > 0 ? '+' : '') + v; };
    var out = $('#rpSimOut'); out.hidden = false;
    out.innerHTML = '<div class="sim-head"><span class="tag tag--sim">Simulated</span><b>If Metis had chosen ' + moveOf(alt).name + (pred ? ' (predicting ' + pred + ')' : '') + ' in round ' + cur + ':</b></div>' +
      '<table class="sim-t"><thead><tr><th></th><th>Actual</th><th>Simulated</th><th>Change</th></tr></thead><tbody>' +
      [['Metis Vitality', a.A.vit, b.A.vit], ['Cinder Vitality', a.B.vit, b.B.vit], ['Metis Energy', a.A.en, b.A.en], ['Metis Focus', a.A.foc, b.A.foc], ['Metis Drift', a.A.drift, b.A.drift], ['Cinder Heat', a.B.heat, b.B.heat]].map(function (x) { return '<tr><th scope="row">' + x[0] + '</th><td>' + Math.round(x[1]) + '</td><td>' + Math.round(x[2]) + '</td><td>' + d(x[2], x[1]) + '</td></tr>'; }).join('') +
      '</tbody></table><ul class="tg-events sim-ev">' + b.events.map(function (e) { return '<li class="' + (e.side === 'A' ? 'me' : 'op') + '">' + e.t.replace(/^You /, 'Metis ') + '</li>'; }).join('') + '</ul><p class="muted" style="font-size:.88rem;margin:.6rem 0 0">Simulated with training rules and no random variance. The historical record above is unchanged.</p>';
  });
  $('#rpRange').addEventListener('input', function () { stop(); show(+this.value); });
  $('#rpPrev').addEventListener('click', function () { stop(); show(Math.max(0, cur - 1)); });
  $('#rpNext').addEventListener('click', function () { stop(); show(Math.min(N, cur + 1)); });
  function stop() { if (timer) { clearInterval(timer); timer = null; $('#rpPlay').textContent = 'Play'; } }
  $('#rpPlay').addEventListener('click', function () { if (timer) { stop(); return; } if (cur >= N) show(0); $('#rpPlay').textContent = 'Pause'; timer = setInterval(function () { if (cur >= N) { stop(); return; } show(cur + 1); }, DY.reduce() ? 1400 : 900); });

  buildChain().then(function () { $('#rpSeed').textContent = 'Seed commitment ' + DY.short(genesis); show(0); buildVerify(); });
  show(0);

  /* ---------- verify / tamper ---------- */
  var tampered = -1;
  function buildVerify() {
    var pick = $('#vfPick'); pick.innerHTML = ''; for (var i = 1; i <= N; i++) pick.appendChild(DY.el('option', { value: i }, 'Round ' + i)); pick.value = Math.min(9, N);
    renderChain(null);
  }
  function renderChain(res) {
    $('#vfChain').innerHTML = '<li class="genesis"><span class="caps">Seed</span><code>' + DY.short(genesis) + '</code><span class="vf-s">committed</span></li>' + chain.map(function (h, i) {
      if (!i) return ''; var s = res ? res[i] : null;
      return '<li class="' + (s ? (s.ok ? 'ok' : 'bad') : '') + '" style="--i:' + i + '"><span class="caps">R' + i + '</span><code>' + DY.short(h) + '</code><span class="vf-s">' + (s ? (s.ok ? '✓ matches' : (s.first ? '✕ content changed' : '✕ chain broken')) : (i === tampered ? 'edited' : '—')) + '</span></li>';
    }).join('');
  }
  function verify() {
    var out = [], p = Promise.resolve(genesis), first = -1;
    for (var i = 1; i <= N; i++) (function (i) { p = p.then(function (prev) { return DY.sha256(canon[i] + '|prev=' + prev).then(function (h) { var ok = h === chain[i]; if (!ok && first < 0) first = i; out[i] = { ok: ok, first: i === first }; return chain[i - 1] && ok ? h : h; }); }); })(i);
    return p.then(function () { return { out: out, first: first }; });
  }
  function setSel(id) { $$('#vf .tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.id === id); }); }
  $('#vfVerify').addEventListener('click', function () { setSel('vfVerify'); verify().then(function (r) { renderChain(r.out); $('#vfMsg').textContent = r.first < 0 ? 'Proof complete. All ' + N + ' links recompute from the seed commitment.' : 'Verification failed at round ' + r.first + '. Every later link is broken too.'; }); });
  $('#vfTamper').addEventListener('click', function () { setSel('vfTamper'); var k = +$('#vfPick').value; tampered = k; canon[k] = canonOf(k) + '|edited'; renderChain(null); $('#vfMsg').textContent = 'Round ' + k + ' was edited after the fact. Now verify.'; });
  $('#vfRestore').addEventListener('click', function () { setSel('vfRestore'); if (tampered > 0) canon[tampered] = canonOf(tampered); tampered = -1; renderChain(null); $('#vfMsg').textContent = 'Restored. Chain is intact.'; });

  /* ---------- ring figure ---------- */
  var f = $('#ringFig');
  if (f) {
    var cx = 200, cy = 200, r = 140, s = '<svg viewBox="0 0 400 400" width="100%" role="img" aria-label="Eight combatants on a broken ring converging on a proofline"><circle cx="200" cy="200" r="168" fill="none" stroke="var(--line)" stroke-dasharray="2 6"/>';
    var pt = function (a, rr) { return [cx + rr * Math.cos(a * Math.PI / 180), cy + rr * Math.sin(a * Math.PI / 180)]; };
    var arc = function (a0, a1, rr) { var p0 = pt(a0, rr), p1 = pt(a1, rr); return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1); };
    s += '<path d="' + arc(-80, 200, r) + '" fill="none" stroke="var(--line-3)" stroke-width="2"/>';
    for (var i = 0; i < 8; i++) { var a = -80 + i * 40, p = pt(a, r), q = pt(a, 60); s += '<path d="M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'L' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + '" stroke="var(--line-2)"/><rect x="' + (p[0] - 7).toFixed(1) + '" y="' + (p[1] - 7).toFixed(1) + '" width="14" height="14" fill="var(--s0)" stroke="' + (i === 3 ? 'var(--oxide)' : 'var(--bone)') + '" stroke-width="2"/><text x="' + pt(a, r + 24)[0].toFixed(1) + '" y="' + (pt(a, r + 24)[1] + 4).toFixed(1) + '" text-anchor="middle" style="font:500 11px var(--f-mono);letter-spacing:.1em;fill:var(--text-3)">M' + (i + 1) + '</text>'; }
    s += '<circle cx="200" cy="200" r="60" fill="none" stroke="var(--oxide)" stroke-width="3" stroke-dasharray="290 90" transform="rotate(-20 200 200)"/><path d="M200 172v56" stroke="var(--paper)" stroke-width="2"/><text x="200" y="250" text-anchor="middle" style="font:500 10px var(--f-mono);letter-spacing:.2em;fill:var(--accent-text)">PROOFLINE</text></svg>';
    f.innerHTML = s;
  }
})();
