/* DYADRYN hero — responsive framing, depth parallax, Trace Window, ash */
(function () {
  'use strict';
  var d = document, hero = d.getElementById('hero'), svg = d.getElementById('heroArt');
  if (!hero || !svg) return;
  var DY = window.DY, reduce = DY.reduce;
  var layers = DY.$$('.layer', svg), tw = d.getElementById('twCircle'), ring = d.getElementById('twRing');

  /* frame the composition per aspect so the eclipse + wanderer stay in view on phones */
  function frame() {
    var w = hero.clientWidth, h = hero.clientHeight, a = w / h, H = 900, W = H * a;
    if (a >= 1600 / 900) { svg.setAttribute('viewBox', '0 0 1600 900'); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice'); return; }
    var cx = a < 0.8 ? 1150 : a < 1.2 ? 1000 : 800; // phones: eclipse; tablets: skyline+eclipse
    var x = Math.max(0, Math.min(1600 - W, cx - W / 2)); if (W >= 1600) x = 0;
    svg.setAttribute('viewBox', x + ' 0 ' + Math.min(W, 1600) + ' 900'); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  }
  frame(); window.addEventListener('resize', frame);

  /* pointer → svg coords */
  function toSvg(cx, cy) { var p = svg.createSVGPoint(); p.x = cx; p.y = cy; var m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
  var tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, R = 0, Rt = 0, raf = 0;
  function loop() {
    cur.x += (tgt.x - cur.x) * 0.14; cur.y += (tgt.y - cur.y) * 0.14; R += (Rt - R) * 0.12;
    layers.forEach(function (l) { var k = +l.getAttribute('data-depth') || 0; l.style.transform = 'translate(' + (-cur.x * k * 5).toFixed(2) + 'px,' + (-cur.y * k * 3).toFixed(2) + 'px)'; });
    tw.setAttribute('r', R.toFixed(1)); ring.setAttribute('r', R.toFixed(1));
    raf = (Math.abs(tgt.x - cur.x) > .001 || Math.abs(tgt.y - cur.y) > .001 || Math.abs(Rt - R) > .3) ? requestAnimationFrame(loop) : 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function move(e) {
    var r = hero.getBoundingClientRect();
    tgt.x = ((e.clientX - r.left) / r.width - .5) * 2; tgt.y = ((e.clientY - r.top) / r.height - .5) * 2;
    if (reduce()) { tgt.x = tgt.y = 0; }
    var p = toSvg(e.clientX, e.clientY);
    ['cx', 'cy'].forEach(function (k, i) { var v = (i ? p.y : p.x).toFixed(1); tw.setAttribute(k, v); ring.setAttribute(k, v); });
    Rt = 150; hero.classList.add('tracing'); kick();
  }
  hero.addEventListener('pointermove', move);
  hero.addEventListener('pointerdown', move);
  hero.addEventListener('pointerleave', function () { Rt = 0; tgt.x = tgt.y = 0; kick(); setTimeout(function () { if (Rt === 0) hero.classList.remove('tracing'); }, 500); });
  var touch = window.matchMedia('(hover: none)').matches;
  var hint = d.getElementById('heroHint'); if (hint && touch) hint.lastChild.textContent = 'Tap the scene to open a trace window';

  /* ash: sparse, slow, meaningful — not a particle show */
  var cv = d.getElementById('ash'); if (!cv) return;
  var ctx = cv.getContext('2d'), parts = [], W = 0, H = 0, dpr = 1, run = false, last = 0;
  var rnd = DY.rng(2026);
  function size() { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function seed() { parts = []; var n = Math.round(Math.min(70, W / 22)); for (var i = 0; i < n; i++) parts.push({ x: rnd() * W, y: rnd() * H, r: .5 + rnd() * 1.6, vy: 6 + rnd() * 16, vx: -4 - rnd() * 10, a: .15 + rnd() * .5, o: rnd() * 6 }); }
  function draw(t) {
    if (!run) return;
    var dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
    ctx.clearRect(0, 0, W, H);
    parts.forEach(function (p) {
      p.y += p.vy * dt; p.x += (p.vx + Math.sin(t / 1800 + p.o) * 6) * dt;
      if (p.y > H + 4) { p.y = -4; p.x = rnd() * W; } if (p.x < -4) p.x = W + 4;
      ctx.globalAlpha = p.a; ctx.fillStyle = p.r > 1.5 ? '#D78A43' : '#D8D0BE';
      ctx.fillRect(p.x, p.y, p.r, p.r * 1.4);
    });
    requestAnimationFrame(draw);
  }
  function start() { if (reduce() || run) return; size(); seed(); run = true; requestAnimationFrame(draw); }
  function stop() { run = false; ctx.clearRect(0, 0, W, H); }
  new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(hero);
  d.addEventListener('dy:motion', function () { reduce() ? stop() : start(); });
  window.addEventListener('resize', function () { if (run) { size(); seed(); } });
})();
