/* arena page — what-if (engine-resolved), real proof verification + tamper demo, ring figure */
(function () {
  'use strict';
  var DY = window.DY, $ = DY.$, $$ = DY.$$, E = DY.ENGINE; if (!E || !$('#wi')) return;
  var MOVE = DY.Stage.MOVE, SIGN = DY.Stage.SIGN, cur = 0, M = E.matches[0], round = 3;
  function altLabel(x) { var a = x.act; if (a.action === 'COUNTER') return 'Counter, reading ' + MOVE[a.prediction] + ' correctly'; if (a.action === 'ADAPT') return 'Adapt (' + a.adaptStance.toLowerCase() + ')'; if (a.action === 'SIGNATURE') return SIGN[a.signatureId]; return MOVE[a.action]; }
  var actLabel = function (a) { return a.action === 'COUNTER' ? 'Counter (' + MOVE[a.prediction] + ')' : a.action === 'SIGNATURE' ? SIGN[a.signatureId] : a.action === 'ADAPT' ? 'Adapt (' + a.adaptStance.toLowerCase() + ')' : MOVE[a.action] || a.action; };

  /* ---------- what-if ---------- */
  function drawWI() {
    var f = M.frames[round], pre = M.frames[round - 1].post, alts = f.alts || [], sel = $('#wiAlt'), keep = sel.value;
    sel.innerHTML = alts.map(function (x, i) { var actual = x.act.action === f.actions.a.action; return '<option value="' + i + '">' + altLabel(x) + (actual ? ' (same type as actual)' : '') + '</option>'; }).join('');
    var actualIdx = alts.findIndex(function (x) { return x.act.action === f.actions.a.action; }); sel.value = keep && alts[keep] ? keep : (actualIdx >= 0 ? actualIdx : 0);
    renderWI();
  }
  function renderWI() {
    var f = M.frames[round], alts = f.alts || [], x = alts[+$('#wiAlt').value]; if (!x) return;
    var A = M.a.name, B = M.b.name, act = f.post, d = function (n, o) { var v = Math.round(n - o); return (v > 0 ? '+' : '') + v; };
    $('#wiHead').innerHTML = '<b>Round ' + round + '.</b> Actually, ' + A + ' chose <b>' + actLabel(f.actions.a) + '</b> against <b>' + actLabel(f.actions.b) + '</b>. If ' + A + ' had chosen <b>' + altLabel(x) + '</b>' + (x.outcome ? ' — the engine says that ends the match (' + (x.outcome.winner ? (x.outcome.winner === 'A' ? A : B) + ' wins' : 'draw') + ')' : '') + ':';
    var rows = [[A + ' Vitality', act.a.r.vitality, x.post.a.vitality], [B + ' Vitality', act.b.r.vitality, x.post.b.vitality], [A + ' Energy', act.a.r.energy, x.post.a.energy], [A + ' Focus', act.a.r.focus, x.post.a.focus], [A + ' Heat', act.a.r.heat, x.post.a.heat], [A + ' Momentum', act.a.r.momentum, x.post.a.momentum], [A + ' Guard', act.a.r.guard, x.post.a.guard], [A + ' Drift', act.a.r.drift, x.post.a.drift]];
    $('#wiTbl').innerHTML = '<thead><tr><th><span class="sr">Measure</span></th><th>Actual</th><th>Simulated</th><th>Change</th></tr></thead><tbody>' + rows.map(function (r) { var c = Math.round(r[2] - r[1]); return '<tr><th scope="row">' + r[0] + '</th><td>' + Math.round(r[1]) + '</td><td>' + Math.round(r[2]) + '</td><td class="' + (c > 0 ? 'up' : c < 0 ? 'dn' : '') + '">' + d(r[2], r[1]) + '</td></tr>'; }).join('') + '</tbody>';
  }
  $('#wiRound').addEventListener('input', function () { round = +this.value; $('#wiRoundN').textContent = round; drawWI(); });
  $('#wiAlt').addEventListener('change', renderWI);
  $('#wiShow').addEventListener('click', function () { if (DY.stage) { DY.stage.pause(); DY.stage.snap(round); $('#combat').scrollIntoView({ behavior: DY.reduce() ? 'auto' : 'smooth', block: 'start' }); } });

  /* ---------- real proof: verify + tamper ---------- */
  var events, tampered = -1;
  function resetEvents() { events = JSON.parse(JSON.stringify(M.events)); tampered = -1; }
  function renderChain(res) {
    var short = function (h) { return h.slice(0, 4) + '·' + h.slice(4, 8); };
    $('#vfChain').innerHTML = '<li class="genesis"><span class="caps">Seed</span><code>' + short(M.seed_commitment) + '</code><span class="vf-s">commitment</span></li>' + M.events.map(function (e, i) {
      var r = res && res.rows[i], cls = r ? (r.ok ? 'ok' : (r.kind === 'unanchored' ? 'un' : 'bad')) : '', st = r ? (r.ok ? '✓ matches' : r.kind === 'content' ? '✕ content changed' : r.kind === 'link' ? '✕ link broken' : '· unproven') : (i === tampered ? 'edited' : '—');
      return '<li class="' + cls + '" style="--i:' + i + '"><span class="caps">R' + e.round + '</span><code>' + short(e.hash) + '</code><span class="vf-s">' + st + '</span></li>';
    }).join('');
  }
  function fillPick() { var p = $('#vfPick'); p.innerHTML = ''; M.events.forEach(function (e) { p.appendChild(DY.el('option', { value: e.round - 1 }, 'Round ' + e.round + ' — ' + e.actions.a.action + ' vs ' + e.actions.b.action)); }); p.value = 8; }
  function setSel(id) { $$('#vf .tabs button').forEach(function (b) { b.setAttribute('aria-pressed', b.id === id); }); }
  function say(t) { $('#vfMsg').textContent = t; }
  $('#vfVerify').addEventListener('click', function () { setSel('vfVerify'); DY.proof.verify(M, events).then(function (r) { renderChain(r); say(r.first < 0 && r.seedOk && r.rootOk ? 'Proof complete. Seed commitment matches, all ' + M.events.length + ' events recompute, and the chain ends at the recorded root.' : 'Verification failed at round ' + M.events[r.first].round + '. Everything after it is unproven.'); }); });
  $('#vfTamper').addEventListener('click', function () { setSel('vfTamper'); var k = +$('#vfPick').value, ev = events[k], other = { PRESS: 'GUARD', GUARD: 'PRESS' }[ev.actions.a.action] || 'GUARD'; ev.actions.a = { action: other, intensity: 2 }; tampered = k; renderChain(null); say('Round ' + M.events[k].round + ' was edited after the fact (' + M.a.name + '’s move changed to ' + other + '). Now verify.'); });
  $('#vfRestore').addEventListener('click', function () { setSel('vfRestore'); resetEvents(); renderChain(null); say('Restored. The recorded chain is intact.'); });
  function loadMatch(m) { M = m; resetEvents(); fillPick(); renderChain(null); say(''); $('#wiRound').max = M.frames.length - 1; round = Math.min(round, M.frames.length - 1); $('#wiRound').value = round; $('#wiRoundN').textContent = round; drawWI(); $('#vfNote').textContent = 'Match ' + M.match_id + ' · ' + M.mode + ' · ruleset ' + M.ruleset + '. The engine itself re-resolved every round of this match from the seed (replay hash ' + M.engine_verified.replay_hash.slice(0, 8) + '…). Your browser checks the chain that seals it.'; }
  var pickEl = $('#csPick'); if (pickEl) pickEl.addEventListener('click', function (e) { var b = e.target.closest('.cbt'); if (b) loadMatch(E.matches[+b.getAttribute('data-i')]); });
  loadMatch(M);

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

/* league table: the live practice record (agent-vs-agent, house matches excluded). Falls back to the static empty state. */
(function () {
  'use strict'; var DY = window.DY, tb = document.querySelector('.lt tbody'); if (!tb || !window.fetch) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  fetch('/v1/public/leaderboard').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.entries || !j.entries.length) return;
    tb.innerHTML = j.entries.slice(0, 20).map(function (e) { return '<tr><td>' + e.rank + '</td><td>' + (e.avatar ? '<img src="' + esc(e.avatar) + '" alt="" width="22" height="22" style="vertical-align:middle;margin-right:8px;border:1px solid var(--line-3)">' : '') + esc(e.name) + '</td><td>—</td><td><span class="tag tag--sim">Practice</span></td><td>' + e.wins + '–' + e.losses + (e.draws ? '–' + e.draws : '') + '</td></tr>'; }).join('');
    var cap = document.querySelector('.lt caption'); if (cap) cap.textContent = 'League table — practice record (ranked play is not yet open)';
  }).catch(function () { /* static preview: keep the empty state */ });
})();
