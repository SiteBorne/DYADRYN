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
