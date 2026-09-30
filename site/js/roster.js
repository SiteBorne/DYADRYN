/* DYADRYN roster — the six combatant masks as live cel-shaded seats (same renderer as the Duel Table) */
(function () {
  'use strict';
  var DY = window.DY, K = DY.DuelKit, DD = DY.DuelDraw, $ = DY.$, $$ = DY.$$, host = $('#roster'); if (!host || !K || !DD) return;
  var LAB = ['ANA', 'EXE', 'ADA', 'INF', 'RES', 'CRE'];
  var LOOK = { 'Trace-Hunter': 'A bone-and-crimson hunter mask: long blade crests and a burning eye-slit.', Broker: 'A gilt ceramic face under crescent horns, hung with coin tags.', Stillpoint: 'A crowned helm of stacked bone plates with a cold blue core.', Archive: 'A mask of paper talismans and hanging record strips.', Swarm: 'Fanged plates and a cluster of red sensor gems.', Veil: 'A cracked white mask under layers of violet cloth.' };
  var R = [
    { n: 'Metis', arch: 'Trace-Hunter', a: [84, 68, 82, 61, 75, 50], s: ['Second-Order Sight', 'Counterfactual Shield'] }, { n: 'Cinder', arch: 'Broker', a: [72, 62, 70, 90, 66, 60], s: ['Broker Lock', 'Constraint Collapse'] },
    { n: 'Verge', arch: 'Stillpoint', a: [66, 58, 74, 64, 90, 68], s: ['Stillpoint', 'Counterfactual Shield'] }, { n: 'Halcyon', arch: 'Archive', a: [80, 56, 82, 70, 62, 70], s: ['Archive Echo', 'Second-Order Sight'] },
    { n: 'Wren', arch: 'Swarm', a: [60, 74, 84, 58, 58, 86], s: ['Swarm Repair', 'Constraint Collapse'] }, { n: 'Mote', arch: 'Veil', a: [80, 54, 72, 88, 64, 62], s: ['Veil Step', 'Broker Lock'] }
  ];
  var POSES = { Idle: {}, Strike: { armF: 1, lean: 1 }, Guard: { guard: 1, ready: 0, crouch: .1 }, Trace: { raise: 1, ready: 0 }, Counter: { ready: 1, crouch: .14, guard: .2 } };
  var REST = { armF: 0, guard: 0, raise: 0, open: 0, up: 0, hurt: 0, ready: .2, crouch: 0, lean: 0, tilt: 0 };
  function pose0() { return { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, tilt: 0, flash: 0, ghost: 0, glitch: 0, sway: 0, armF: 0, guard: 0, raise: 0, open: 0, up: 0, hurt: 0, ready: .2, crouch: 0, lean: 0, split: 0 }; }
  host.innerHTML = R.map(function (c, i) {
    var st = K.sty(c.arch);
    return '<article class="rc frame" style="--acc:' + st.acc + '"><div class="rc-cv"><canvas aria-hidden="true"></canvas><span class="tag">' + c.arch + '</span><span class="rc-kj" aria-hidden="true">' + ((DY.KJ && DY.KJ[st.kj]) || '') + '</span></div><div class="rc-b"><h3>' + c.n + '</h3><p class="rc-line">' + (DY.ARCH.filter(function (x) { return x.name === c.arch; })[0] || {}).line + '</p><p class="muted rc-look">' + LOOK[c.arch] + '</p>' +
      '<div class="rc-at" role="img" aria-label="Attributes: ' + c.a.map(function (v, k) { return LAB[k] + ' ' + v; }).join(', ') + '">' + c.a.map(function (v, k) { return '<span><b>' + LAB[k] + '</b><i style="--v:' + ((v - 40) / 50 * 100) + '%"></i><em>' + v + '</em></span>'; }).join('') + '</div>' +
      '<div class="chipset">' + c.s.map(function (x) { return '<span class="tag tag--trace">' + x + '</span>'; }).join('') + '</div>' +
      '<div class="rc-poses" role="group" aria-label="Pose ' + c.n + '">' + Object.keys(POSES).map(function (p) { return '<button type="button" class="cbt" aria-pressed="' + (p === 'Idle') + '" data-p="' + p + '">' + p + '</button>'; }).join('') + '</div></div></article>';
  }).join('');
  $$('.rc', host).forEach(function (el, i) {
    var cv = $('canvas', el), g = cv.getContext('2d'), c = R[i], F = { side: 'a', face: 1, arch: c.arch, pose: pose0(), cold: 0, res: { heat: 12, drift: 0, vitality: 100 }, stance: null, stanceK: 1, cracks: K.makeCracks(i + 3) }, target = {}, W = 0, H = 0, dpr = 1, vis = false, auto = !DY.reduce(), hover = false, t0 = 0, k = 0, bg = null;
    var d = { F: { a: F }, R: { a: { x: 10, y: 10, w: 10, h: 10 } }, dpr: 1, reduce: DY.reduce(), actorHW: function () { var r = d.R.a; return Math.min(r.w * .92, r.h * .78); } };
    function size() { var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = Math.round(r.width); H = Math.round(r.height); if (!W) return; cv.width = W * dpr; cv.height = H * dpr; d.dpr = dpr; d.R.a = { x: 14, y: 14, w: W - 34, h: H - 28 }; }
    function frame(ts) {
      requestAnimationFrame(frame); if (!vis) return; if (!W) size(); if (!W) return;
      var P = F.pose; Object.keys(REST).forEach(function (key) { var to = target[key] != null ? target[key] : REST[key]; P[key] += (to - P[key]) * .14; });
      if (auto && !hover && ts - t0 > 2800 + i * 260) { t0 = ts; var names = ['Strike', 'Guard', 'Trace', 'Counter', 'Idle']; k = (k + 1) % names.length; target = POSES[names[k]]; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.fillStyle = '#0A0809'; g.fillRect(0, 0, W, H); DD.seat(d, g, 'a', ts);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(el); else vis = true;
    if (window.ResizeObserver) new ResizeObserver(size).observe(cv);
    el.addEventListener('mouseenter', function () { hover = true; }); el.addEventListener('mouseleave', function () { hover = false; });
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (!b) return; auto = false; $$('[data-p]', el).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); target = POSES[b.getAttribute('data-p')]; });
    requestAnimationFrame(frame);
  });
})();
