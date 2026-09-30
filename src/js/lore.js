/* DYADRYN lore — lexicon filter + accordion single-open */
(function () {
  'use strict';
  var DY = window.DY, $ = DY.$, $$ = DY.$$;
  var q = $('#lxq'), rows = $$('#lex > div'), c = $('#lxc'), e = $('#lxe');
  function f() { var v = (q.value || '').trim().toLowerCase(), n = 0; rows.forEach(function (r) { var ok = !v || r.getAttribute('data-k').indexOf(v) >= 0 || r.textContent.toLowerCase().indexOf(v) >= 0; r.hidden = !ok; if (ok) n++; }); c.textContent = n + ' of ' + rows.length + ' terms'; e.hidden = n > 0; }
  if (q) { q.addEventListener('input', f); f(); }
  var ds = $$('#acc details'); ds.forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) ds.forEach(function (o) { if (o !== d) o.open = false; }); }); });
})();
