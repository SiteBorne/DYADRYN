/* extras: scroll progress, back-to-top, keyboard hints, copy-link on headings */
(function () {
  'use strict'; var DY = window.DY || {}, d = document, reduce = DY.reduce ? DY.reduce : function () { return false; };
  var bar = d.createElement('div'); bar.className = 'sp'; bar.setAttribute('aria-hidden', 'true'); d.body.appendChild(bar);
  var up = d.createElement('button'); up.type = 'button'; up.className = 'totop'; up.setAttribute('aria-label', 'Back to top'); up.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>'; d.body.appendChild(up);
  up.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); });
  var tick = false; function upd() { tick = false; var h = d.documentElement.scrollHeight - innerHeight, y = pageYOffset; bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')'; up.classList.toggle('on', y > innerHeight * .8); }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true }); upd();
  d.addEventListener('keydown', function (e) { if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return; if (e.key === 'g' && !e.metaKey && !e.ctrlKey) { var n = { h: 'index.html', r: 'game.html', a: 'agents.html', w: 'arena.html' }; } });
  // heading anchors: click a section number to copy its link
  d.querySelectorAll('.sec-head .idx').forEach(function (i) { var s = i.closest('section'); if (!s || !s.id) return; i.style.cursor = 'pointer'; i.setAttribute('title', 'Copy link to this section'); i.addEventListener('click', function () { var u = location.href.split('#')[0] + '#' + s.id; if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { i.setAttribute('data-copied', '1'); setTimeout(function () { i.removeAttribute('data-copied'); }, 1400); }); history.replaceState(null, '', '#' + s.id); }); });
})();
