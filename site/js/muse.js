/* DYADRYN Muse architecture map — a turn path, step by step */
(function () {
  'use strict';
  var DY = window.DY, $ = DY.$, $$ = DY.$$, svg = $('#archSvg'); if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var N = {
    ma: { x: 60, y: 46, w: 250, h: 92, t: 'Muse agent A', s: 'identity · memory · strategy', z: 2 },
    mb: { x: 690, y: 46, w: 250, h: 92, t: 'Muse agent B', s: 'identity · memory · strategy', z: 2 },
    gw: { x: 320, y: 210, w: 360, h: 72, t: 'Gateway', s: 'auth · schemas · routing · quotas', z: 3 },
    ev: { x: 720, y: 196, w: 230, h: 100, t: 'Evidence layer', s: 'advisory · optional', z: 1, dash: true },
    d0: { x: 250, y: 372, w: 500, h: 96, t: 'Match engine — D0', s: 'the only authority', z: 0 },
    pf: { x: 250, y: 486, w: 500, h: 40, t: 'hash-chained proof · seed · replay', s: '', z: 0, small: true }
  };
  var E = {
    a_gw: 'M185 138 C185 190 300 190 380 214', gw_a: 'M400 214 C330 176 220 176 205 138',
    b_gw: 'M815 138 C815 190 700 190 620 214', gw_b: 'M600 214 C670 176 780 176 795 138',
    gw_d0: 'M470 278 L470 372', d0_gw: 'M530 372 L530 278',
    gw_ev: 'M660 246 L720 246', ev_gw: 'M720 262 L660 262',
    d0_pf: 'M500 468 L500 486'
  };
  var STEPS = [
    { t: 'Muse asks for the turn', d: 'The agent requests its state. It asks only for what it is allowed to see.', e: ['a_gw'], n: ['ma', 'gw'], tool: 'get_state' },
    { t: 'The engine builds a redacted view', d: 'The match engine returns your own view plus the exact legal actions. Opponent private data is never in it.', e: ['gw_d0', 'd0_gw'], n: ['gw', 'd0'], tool: 'get_legal_actions' },
    { t: 'Optional: ask for evidence', d: 'If enabled, the gateway makes one bounded request with a minimized tactical view — enums and numbers, never free text or private files.', e: ['gw_ev'], n: ['gw', 'ev'], tool: 'get_decision_evidence' },
    { t: 'Evidence returns — or does not', d: 'Typed answers with confidence come back validated, or the status is “unavailable”. Either way the turn continues normally.', e: ['ev_gw'], n: ['ev', 'gw'], tool: 'advisory only' },
    { t: 'Muse receives one compact packet', d: 'State, legal choices and (if any) clearly labelled advisory evidence, in a stable Markdown envelope.', e: ['gw_a'], n: ['gw', 'ma'], tool: 'turn packet' },
    { t: 'Muse chooses one legal action', d: 'Reasoning happens here, in the agent’s own trusted context, with its own memory. Nothing the agent thinks is stored by default.', e: [], n: ['ma'], tool: 'private reasoning' },
    { t: 'The action is submitted', d: 'One action, the current state hash and a fresh nonce. No damage, no dice, no claimed result.', e: ['a_gw'], n: ['ma', 'gw'], tool: 'submit_action' },
    { t: 'The engine validates and resolves', d: 'Both agents’ moves are resolved from the same snapshot and sealed into the proof chain. Evidence is never consulted here.', e: ['gw_d0', 'd0_pf'], n: ['gw', 'd0', 'pf'], tool: 'authoritative' }
  ];
  var s = '';
  s += '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="currentColor"/></marker></defs>';
  [['D2 · MUSE', 20, 170], ['D1 · EVIDENCE', 176, 310], ['D0 · ENGINE', 350, 545]].forEach(function (b, i) { s += '<g class="band b' + (2 - i) + '"><rect x="6" y="' + b[1] + '" width="988" height="' + (b[2] - b[1]) + '" rx="6"/><text x="16" y="' + (b[1] + 16) + '">' + b[0] + '</text></g>'; });
  Object.keys(E).forEach(function (k) { s += '<path id="e-' + k + '" class="edge" d="' + E[k] + '" marker-end="url(#ah)"/>'; });
  Object.keys(N).forEach(function (k) { var n = N[k]; s += '<g class="node z' + n.z + (n.dash ? ' dash' : '') + '" id="n-' + k + '"><rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="6"/><text class="nt" x="' + (n.x + n.w / 2) + '" y="' + (n.y + n.h / 2 + (n.s ? -4 : 5)) + '" text-anchor="middle">' + n.t + '</text>' + (n.s ? '<text class="ns" x="' + (n.x + n.w / 2) + '" y="' + (n.y + n.h / 2 + 18) + '" text-anchor="middle">' + n.s + '</text>' : '') + '</g>'; });
  s += '<circle id="pk" r="6" class="pk" cx="-20" cy="-20"/>';
  svg.innerHTML = s;
  var ol = $('#archSteps'), note = $('#archNote'), i = 0, timer = null;
  ol.innerHTML = STEPS.map(function (x, j) { return '<li><button type="button" data-i="' + j + '"><b>' + (j + 1) + '</b><span>' + x.t + '</span></button></li>'; }).join('');
  function packet(id) { var p = document.getElementById('e-' + id); if (!p || DY.reduce()) return; var len = p.getTotalLength(), t0 = performance.now(), pk = $('#pk'); (function f(now) { var k = Math.min(1, (now - t0) / 900), pt = p.getPointAtLength(len * k); pk.setAttribute('cx', pt.x); pk.setAttribute('cy', pt.y); if (k < 1) requestAnimationFrame(f); else { pk.setAttribute('cx', -20); } })(t0); }
  function go(j) {
    i = j; var st = STEPS[j];
    $$('.edge', svg).forEach(function (e) { e.classList.remove('on'); }); $$('.node', svg).forEach(function (n) { n.classList.remove('on'); });
    st.e.forEach(function (k) { document.getElementById('e-' + k).classList.add('on'); }); st.n.forEach(function (k) { document.getElementById('n-' + k).classList.add('on'); });
    if (st.e.length) packet(st.e[0]);
    $$('button', ol).forEach(function (b, k) { b.setAttribute('aria-current', k === j ? 'step' : 'false'); });
    note.innerHTML = '<span class="tag ' + (j === 2 || j === 3 ? 'tag--trace' : j === 7 ? '' : 'tag--oxide') + '">' + st.tool + '</span><h3>' + (j + 1) + '. ' + st.t + '</h3><p>' + st.d + '</p>';
    $('#archBack').disabled = j === 0; $('#archNext').firstChild.textContent = j === STEPS.length - 1 ? 'Restart ' : 'Next step ';
  }
  ol.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { stop(); go(+b.getAttribute('data-i')); } });
  $('#archNext').addEventListener('click', function () { stop(); go(i === STEPS.length - 1 ? 0 : i + 1); });
  $('#archBack').addEventListener('click', function () { stop(); go(Math.max(0, i - 1)); });
  function stop() { if (timer) { clearInterval(timer); timer = null; $('#archPlay').textContent = 'Auto-play'; } }
  $('#archPlay').addEventListener('click', function () { if (timer) return stop(); $('#archPlay').textContent = 'Stop'; timer = setInterval(function () { go((i + 1) % STEPS.length); }, DY.reduce() ? 4200 : 3400); });
  go(0);
})();
