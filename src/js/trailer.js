/* DYADRYN trailer — the 30-second grammar from the Brand Bible §51, performed live in-page (no video file, no audio). */
(function () {
  'use strict';
  var DY = window.DY, $ = DY.$, $$ = DY.$$, d = document;
  var md = $('#trailer'); if (!md) return;
  var opens = $$('[data-open-trailer]'), sc = $$('.tr-sc', md), cap = $('#trCap'), bar = $('#trBar'), clock = $('#trClock'), playB = $('#trPlay'), manual = $('#trManual');
  var TOTAL = 30;
  var SCENES = [
    { t: 0, sc: 0, cap: 'An agent can say anything about itself.' },
    { t: 5, sc: 1, cap: 'The arena doesn’t take its word for it.' },
    { t: 11, sc: 2, cap: 'Metis traced first.<small>The pattern held. Counter window open.</small>' },
    { t: 19, sc: 3, cap: 'Proof complete.<small>Every round sealed. Every claim checkable.</small>' },
    { t: 25, sc: 4, cap: '' },
    { t: 29, sc: 5, cap: 'Built from memory.<br>Proven in battle.' }
  ];
  var t0 = 0, elapsed = 0, playing = false, raf = 0, idx = -1, lastFocus = null, chainDone = false;
  var HASH = ['9f2c·a19e', '41b7·03dd', 'c8e1·7742', '0a55·be19', 'd3f0·61ac', '7be2·f803'];
  var chain = $('#trChain'); chain.innerHTML = HASH.map(function (h, i) { return '<span>r' + (i + 1) * 4 + ' · ' + h + '</span>'; }).join('');
  var reduce = function () { return DY.reduce(); };
  function scene(i, force) {
    if (i === idx && !force) return; idx = i; var s = SCENES[i];
    sc.forEach(function (n, j) { n.classList.toggle('on', j === s.sc); });
    cap.innerHTML = s.cap;
    if (s.sc === 2) [0, 1, 2].forEach(function (k) { setTimeout(function () { $$('.tr-chip', md).forEach(function (c, j) { c.classList.toggle('hot', j === k); }); }, k * 2200 * (reduce() ? 0 : 1)); });
    if (s.sc === 3) $$('#trChain span').forEach(function (n, k) { setTimeout(function () { n.classList.add('on'); }, reduce() ? 0 : k * 700); }); else $$('#trChain span').forEach(function (n) { n.classList.remove('on'); });
  }
  function fmt(s) { s = Math.floor(s); return '00:' + ('0' + Math.min(s, TOTAL)).slice(-2) + ' / 00:30'; }
  function tick(now) {
    if (!playing) return;
    elapsed = (now - t0) / 1000; if (elapsed >= TOTAL) { elapsed = TOTAL; bar.style.width = '100%'; clock.textContent = fmt(TOTAL); pause(true); return; }
    var i = 0; SCENES.forEach(function (s, j) { if (elapsed >= s.t) i = j; }); scene(i);
    bar.style.width = (elapsed / TOTAL * 100) + '%'; clock.textContent = fmt(elapsed);
    raf = requestAnimationFrame(tick);
  }
  function play() { playing = true; t0 = performance.now() - elapsed * 1000; playB.querySelector('span').textContent = 'Pause'; playB.setAttribute('aria-label', 'Pause'); raf = requestAnimationFrame(tick); }
  function pause(end) { playing = false; cancelAnimationFrame(raf); playB.querySelector('span').textContent = end ? 'Replay' : 'Play'; playB.setAttribute('aria-label', end ? 'Replay' : 'Play'); if (end) elapsed = 0; }
  function open() {
    lastFocus = d.activeElement; md.hidden = false; md.classList.add('open'); d.body.style.overflow = 'hidden'; elapsed = 0; idx = -1;
    if (reduce()) { manual.hidden = false; playB.hidden = true; var i = 0; scene(0, true); bar.style.width = '0'; clock.textContent = 'Scene 1 of ' + SCENES.length; md._i = 0; }
    else { manual.hidden = true; playB.hidden = false; scene(0, true); play(); }
    $('#trClose').focus();
  }
  function close() { pause(); md.classList.remove('open'); md.hidden = true; d.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  opens.forEach(function (b) { b.addEventListener('click', open); });
  $('#trClose').addEventListener('click', close);
  playB.addEventListener('click', function () { if (!playing) { if (elapsed === 0 && idx === SCENES.length - 1) scene(0, true); play(); } else pause(); });
  function step(dir) { md._i = Math.max(0, Math.min(SCENES.length - 1, (md._i || 0) + dir)); scene(md._i, true); bar.style.width = ((md._i + 1) / SCENES.length * 100) + '%'; clock.textContent = 'Scene ' + (md._i + 1) + ' of ' + SCENES.length; }
  $('#trNext').addEventListener('click', function () { step(1); }); $('#trPrev').addEventListener('click', function () { step(-1); });
  d.addEventListener('keydown', function (e) {
    if (md.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === ' ' && e.target === d.body) { e.preventDefault(); playB.click(); }
    if (e.key === 'Tab') { var f = $$('button:not([hidden])', md).filter(function (b) { return b.offsetParent !== null; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); } }
  });
})();
