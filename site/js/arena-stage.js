/* mounts the combat stage (arena + home) with the four real engine replays */
(function () {
  'use strict';
  var DY = window.DY, host = DY.$('#combat-stage'); if (!host || !DY.ENGINE || !DY.Stage) return;
  var home = !!document.getElementById('how'), M = DY.ENGINE.matches, pick = DY.$('#csPick');
  var st = DY.stage = new DY.Stage(host, { verifyHref: home ? 'arena.html#verify' : '#verify' });
  if (home) { st.mode = 'key'; var kb = host.querySelector('[data-c=key]'); if (kb) kb.setAttribute('aria-pressed', 'true'); }
  pick.innerHTML = M.map(function (m, i) { return '<button type="button" class="cbt" aria-pressed="' + (i === 0) + '" data-i="' + i + '"><span class="pn">' + m.a.name + ' <em>×</em> ' + m.b.name + '</span><small>' + m.a.arch + ' · ' + m.b.arch + '</small></button>'; }).join('');
  function use(i) { DY.$$('.cbt', pick).forEach(function (b, j) { b.setAttribute('aria-pressed', j === i); }); st.load(M[i]); DY.$('#csEngine').textContent = 'Ruleset ' + DY.ENGINE.ruleset + ' · proof ' + DY.ENGINE.proof_format + ' · engine re-resolved all ' + M[i].engine_verified.rounds + ' rounds ✓'; }
  pick.addEventListener('click', function (e) { var b = e.target.closest('.cbt'); if (b) use(+b.getAttribute('data-i')); });
  var start = function () { use(0); }; if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
