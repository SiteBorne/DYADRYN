/* DYADRYN 404 — a split Veil mask drifting in the ash. Cursor-aware, glitches now and then, cracks when clicked. */
(function () {
  'use strict';
  var DY = window.DY, A = DY.StageArt, K = DY.DuelKit, cv = DY.$('#lostCv'); if (!cv || !A || !K) return;
  var g = cv.getContext('2d'), W = 0, H = 0, dpr = 1, bg = null, mx = .5, my = .5, sx = .5, sy = .5, vis = true, reduce = DY.reduce(), hit = 0, flash = 0, parts = [], cracks = K.makeCracks(41), crackV = 100;
  var S = K.sty('Veil');
  function size() { var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = Math.round(r.width); H = Math.round(r.height); cv.width = W * dpr; cv.height = H * dpr; bg = A.paintBackground(W * dpr * 1.2, H * dpr); }
  function frame(ts) {
    requestAnimationFrame(frame); if (!vis || !W) return; sx += (mx - sx) * .06; sy += (my - sy) * .06;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); var px = (sx - .5), py = (sy - .5);
    g.drawImage(bg, -W * .1 - px * 30, -py * 14, W * 1.2, H); g.fillStyle = 'rgba(7,6,7,.62)'; g.fillRect(0, 0, W, H);
    // red slash + light shafts
    g.fillStyle = 'rgba(214,58,50,.10)'; g.beginPath(); g.moveTo(W * .5, H); g.lineTo(W * .66, 0); g.lineTo(W * .72, 0); g.lineTo(W * .56, H); g.closePath(); g.fill();
    var HW = Math.min(W * .42, H * .86), cx = W * (W < 820 ? .5 : .72) + px * 40, cy = H * (W < 820 ? .34 : .5) + py * 24 + Math.sin(ts / 1100) * 8, sp = Math.min(1, (hit > 0 ? hit : 0));
    var glitch = !reduce && (Math.sin(ts / 2300) > .92 || hit > 0), t = ts;
    // plates orbiting behind
    g.save(); g.translate(cx, cy); K.plates(g, {}, 'Veil', S, t, HW * .5, { guard: 0, armF: 0, open: 0, raise: 0, crouch: 0, up: 0 }, false); g.restore();
    // the mask, split along its seam; halves drift apart and back
    var drift = (.06 + .03 * Math.sin(ts / 1700)) * HW + sp * HW * .1;
    [-1, 1].forEach(function (h) {
      g.save(); g.translate(cx + h * drift - px * 14 * h, cy + (h > 0 ? 12 : 0)); g.rotate(h * (.05 + .02 * Math.sin(ts / 1300)) + px * .05); g.beginPath(); g.rect(h < 0 ? -HW : 0, -HW * 1.5, HW, HW * 3); g.clip();
      if (glitch) g.translate((Math.random() - .5) * 18, 0);
      g.globalAlpha = .96; K.maskDraw(g, {}, 'Veil', t, HW, Math.sin(ts / 900) * 6, .3); g.restore();
    });
    g.save(); g.translate(cx, cy); K.drawCracks(g, cracks, crackV, S.acc, HW, flash); K.plates(g, {}, 'Veil', S, t, HW * .5, { guard: 0, armF: 0, open: 0, raise: 0, crouch: 0, up: 0 }, true); g.restore();
    // ash
    if (!reduce && parts.length < 90 && Math.random() < .5) parts.push({ x: Math.random() * W, y: -6, vx: -.3 - Math.random() * .5, vy: .5 + Math.random() * .9, a: 0, l: 5200, s: 1.4 + Math.random() * 2 });
    for (var i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.x += p.vx; p.y += p.vy; p.a += 16; if (p.a > p.l || p.y > H) { parts.splice(i, 1); continue; } g.globalAlpha = .45 * (1 - p.a / p.l); g.fillStyle = '#D8D0BE'; g.fillRect(p.x, p.y, p.s, p.s * 1.5); } g.globalAlpha = 1;
    // screen-space: vignette, scanlines, glitch bars
    var vg = g.createRadialGradient(W * .5, H * .5, H * .3, W * .5, H * .5, H); vg.addColorStop(0, 'rgba(5,6,7,0)'); vg.addColorStop(1, 'rgba(5,6,7,.8)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.025)'; for (var y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    if (glitch) { for (var b = 0; b < 4; b++) { var by = Math.random() * H; g.fillStyle = b % 2 ? 'rgba(79,209,197,.18)' : 'rgba(214,58,50,.22)'; g.fillRect(0, by, W, 2 + Math.random() * 6); } }
    if (flash > 0) { g.fillStyle = 'rgba(244,238,223,' + flash * .8 + ')'; g.fillRect(0, 0, W, H); }
    hit = Math.max(0, hit - .02); flash = Math.max(0, flash - .06);
  }
  var sec = DY.$('#lost'); if (window.ResizeObserver) new ResizeObserver(size).observe(cv); size();
  if (sec) { sec.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height; }); sec.addEventListener('pointerdown', function () { hit = 1; flash = .7; crackV = Math.max(0, crackV - 18); setTimeout(function () { crackV = 100; }, 2600); }); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(cv);
  if (reduce) { size(); frame(0); vis = false; } else requestAnimationFrame(frame);
})();
