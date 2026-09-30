/* DYADRYN roster — the six original combatant designs, rendered live with the same rig used in the arena */
(function () {
  'use strict';
  var DY = window.DY, A = DY.StageArt, $ = DY.$, $$ = DY.$$, host = $('#roster'); if (!host || !A || !DY.StageChars) return;
  var LAB = ['ANA', 'EXE', 'ADA', 'INF', 'RES', 'CRE'];
  var R = [
    { n: 'Metis', arch: 'Trace-Hunter', line: 'Learns first. Punishes patterns later.', look: 'Tall ceramic mask with a single visor slit, a radar-ring staff, a long teal coat.', a: [84, 68, 82, 61, 75, 50], s: ['Second-Order Sight', 'Counterfactual Shield'] },
    { n: 'Cinder', arch: 'Broker', line: 'Trades in incentives, tempo and constrained choices.', look: 'Wide-brim hood, respirator and amber goggles, a pack hung with memory tags.', a: [72, 62, 70, 90, 66, 60], s: ['Broker Lock', 'Constraint Collapse'] },
    { n: 'Verge', arch: 'Stillpoint', line: 'Absorbs instability and turns pressure into control.', look: 'Nested-rectangle visor helm, heavy pauldrons, plated steel cloak.', a: [66, 58, 74, 64, 90, 68], s: ['Stillpoint', 'Counterfactual Shield'] },
    { n: 'Halcyon', arch: 'Archive', line: 'Draws on accumulated pattern and unusual carry.', look: 'Hooded elder with a single lens eye, a halo of stacked record cards, hanging strips.', a: [80, 56, 82, 70, 62, 70], s: ['Archive Echo', 'Second-Order Sight'] },
    { n: 'Wren', arch: 'Swarm', line: 'Distributed, adaptive, low-cost recomposition.', look: 'Small and quick: goggles, patched jacket, scarf, three scout drones.', a: [60, 74, 84, 58, 58, 86], s: ['Swarm Repair', 'Constraint Collapse'] },
    { n: 'Mote', arch: 'Veil', line: 'Controls disclosure, feints and opponent modelling.', look: 'Faceless cracked mask, layered cloth strips that never quite settle.', a: [80, 54, 72, 88, 64, 62], s: ['Veil Step', 'Broker Lock'] }
  ];
  var POSES = { Idle: {}, Strike: { armF: 1, lean: 1, stride: 1, crouch: .35, ready: 0 }, Guard: { guard: 1, ready: 0, crouch: .32, stride: .35 }, Trace: { raise: 1, ready: 0, tilt: .12 }, Counter: { ready: 1, crouch: .3, stride: .55, guard: .25 } };
  var REST = { armF: 0, guard: 0, raise: 0, open: 0, up: 0, hurt: 0, ready: .25, stride: .25, crouch: .08, lean: 0, tilt: 0 };
  var cards = [];
  host.innerHTML = R.map(function (c, i) {
    return '<article class="rc frame rv" style="--d:' + (i % 3) * 70 + 'ms"><div class="rc-cv"><canvas aria-hidden="true"></canvas><span class="tag">' + c.arch + '</span></div><div class="rc-b"><h3>' + c.n + '</h3><p class="rc-line">' + c.line + '</p><p class="muted rc-look">' + c.look + '</p>' +
      '<div class="rc-at" role="img" aria-label="Attributes: ' + c.a.map(function (v, k) { return LAB[k] + ' ' + v; }).join(', ') + '">' + c.a.map(function (v, k) { return '<span><b>' + LAB[k] + '</b><i style="--v:' + ((v - 40) / 50 * 100) + '%"></i><em>' + v + '</em></span>'; }).join('') + '</div>' +
      '<div class="chipset">' + c.s.map(function (x) { return '<span class="tag tag--trace">' + x + '</span>'; }).join('') + '</div>' +
      '<div class="rc-poses" role="group" aria-label="Pose ' + c.n + '">' + Object.keys(POSES).map(function (p) { return '<button type="button" class="cbt" aria-pressed="' + (p === 'Idle') + '" data-p="' + p + '">' + p + '</button>'; }).join('') + '</div></div></article>';
  }).join('');
  $$('.rc', host).forEach(function (el, i) {
    var cv = $('canvas', el), g = cv.getContext('2d'), c = R[i], F = { side: i % 2 ? 'b' : 'a', x: 0, y: 0, s: 1, face: i % 2 ? -1 : 1, arch: c.arch, cold: 0, res: { heat: 12, drift: 0 }, pose: { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, tilt: 0, flash: 0, ghost: 0, ghostDir: 1, glitch: 0, ring: 0, sway: 0 } };
    Object.keys(REST).forEach(function (k) { F.pose[k] = REST[k]; });
    var st = { F: F, target: Object.assign({}, REST), bg: null, W: 0, H: 0, vis: false, auto: !DY.reduce() };
    cards.push(st);
    function size() { var r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); st.W = Math.round(r.width); st.H = Math.round(r.height); if (!st.W) return; cv.width = st.W * d; cv.height = st.H * d; st.d = d; st.bg = A.paintBackground(st.W * d, st.H * d); F.x = st.W * (i % 2 ? .56 : .44); F.y = st.H * .93; F.s = st.H / 470; }
    function frame(ts) { requestAnimationFrame(frame); if (!st.vis && !st.dirty) return; if (!st.W) size(); if (!st.W) return; st.dirty = false;
      var P = F.pose, k = .12; Object.keys(st.target).forEach(function (key) { P[key] += (st.target[key] - P[key]) * k; });
      if (st.auto && !st.hover && ts - (st.t0 || 0) > 2600 + i * 240) { st.t0 = ts; var names = ['Strike', 'Guard', 'Trace', 'Counter', 'Idle'], nx = names[(st.k = ((st.k || 0) + 1) % names.length)]; st.target = Object.assign({}, REST, POSES[nx]); }
      P.sway = Math.sin(ts / 900 + i) * .2;
      g.setTransform(st.d, 0, 0, st.d, 0, 0); g.clearRect(0, 0, st.W, st.H); g.drawImage(st.bg, 0, 0, st.W, st.H); A.drawRing(g, st.W, st.H, { close: 0, heat: 0 });
      var vg = g.createRadialGradient(st.W / 2, st.H * .55, st.H * .3, st.W / 2, st.H * .55, st.H * .9); vg.addColorStop(0, 'rgba(5,6,7,0)'); vg.addColorStop(1, 'rgba(5,6,7,.7)'); g.fillStyle = vg; g.fillRect(0, 0, st.W, st.H);
      A.drawFighter(g, F, ts);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { st.vis = es[0].isIntersecting; if (st.vis) st.dirty = true; }).observe(el); else st.vis = true;
    if (window.ResizeObserver) new ResizeObserver(function () { size(); st.dirty = true; }).observe(cv);
    el.addEventListener('mouseenter', function () { st.hover = true; }); el.addEventListener('mouseleave', function () { st.hover = false; });
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (!b) return; st.auto = false; $$('[data-p]', el).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); st.target = Object.assign({}, REST, POSES[b.getAttribute('data-p')]); st.dirty = true; });
    document.fonts && document.fonts.ready ? document.fonts.ready.then(function () { size(); requestAnimationFrame(frame); }) : requestAnimationFrame(frame);
  });
})();
