/* boot: runs before paint — flags JS and restores comfort preferences */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  try {
    var s = localStorage.getItem('dy.size'), m = localStorage.getItem('dy.motion');
    if (s === 'lg') d.setAttribute('data-size', 'lg');
    if (m === 'reduce') d.setAttribute('data-motion', 'reduce');
  } catch (e) {}
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && d.getAttribute('data-motion') !== 'full') d.setAttribute('data-motion', 'reduce');
})();
/* navigation: every page opens at its top (or exactly at its #anchor) — never at the bottom, never mid-animation */
(function () {
  var d = document.documentElement;
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  d.style.scrollBehavior = 'auto';
  function go() {
    var id = decodeURIComponent((location.hash || '').slice(1)), t = id && document.getElementById(id);
    if (t) { var y = t.getBoundingClientRect().top + window.pageYOffset - 84; window.scrollTo(0, Math.max(0, y)); } else window.scrollTo(0, 0);
  }
  go();
  document.addEventListener('DOMContentLoaded', go);
  window.addEventListener('load', function () { go(); setTimeout(function () { go(); d.style.scrollBehavior = ''; }, 350); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) go(); });
})();
