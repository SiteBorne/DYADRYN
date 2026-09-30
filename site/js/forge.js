/* DYADRYN Mask Forge — interactive model of compiling a public Mask (illustrative presets, not the compiler) */
(function () {
  'use strict';
  var DY = window.DY, $ = DY.$, $$ = DY.$$;
  var host = $('#archBtns'); if (!host) return;
  var LAB = ['Analysis', 'Execution', 'Adaptation', 'Influence', 'Resolve', 'Creativity'];
  var AXL = ['Risk tolerance', 'Aggression', 'Information seeking', 'Counterplay', 'Resource preservation', 'Deception (restrained)', 'Strategic horizon'];
  var ARCH = DY.ARCH.map(function (a) { return { n: a.name, b: a.line, a: a.a, ax: a.ax, t: a.t, s: a.s, k: a.k, kj: a.kj, acc: a.acc }; });
  var st = { a: 0, l: 0 };
  host.innerHTML = ARCH.map(function (x, i) { return '<button type="button" class="arch-b" style="--acc:' + x.acc + '" data-i="' + i + '" aria-pressed="' + (i === 0) + '"><span class="ab-img" aria-hidden="true"><img src="assets/art/face-' + x.k + '.webp" alt="" width="830" height="1140" loading="lazy" decoding="async"></span><span class="ab-kj" aria-hidden="true">' + DY.KJ[x.kj] + '</span><b>' + x.n + '</b><small>' + x.b + '</small></button>'; }).join('');
  var levels = ['Cold', 'Masked', 'Carry', 'Deep carry'];
  function draw() {
    var x = ARCH[st.a], attrs = LAB.map(function (l, i) { return [l, x.a[i]]; });
    $$('.arch-b', host).forEach(function (b, i) { b.setAttribute('aria-pressed', i === st.a); });
    $('#fName').textContent = x.n; var mf = $('#maskFace'); if (mf) { mf.src = 'assets/art/face-' + x.k + '.webp'; mf.closest('.mask-fig').style.setProperty('--acc', x.acc); } $('#fBlurb').textContent = x.b; $('#fLevel').textContent = levels[st.l];
    $('#fTraits').innerHTML = x.t.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
    $('#fSigs').innerHTML = x.s.map(function (t) { return '<span class="tag tag--trace">' + t + '</span>'; }).join('');
    DY.radar($('#fRadar'), attrs, { label: x.n + ' attributes', caption: 'Dashed ring = even 70' });
    $('#fAxes').innerHTML = AXL.map(function (l, i) { var v = Math.round(x.ax[i] * 100); return '<div class="axis"><span>' + l + '</span><div class="bar" role="img" aria-label="' + l + ' ' + v + ' of 100"><i style="--v:' + v + '%"></i></div><b>' + v + '</b></div>'; }).join('');
    var rows = DY.maskRows(st.l);
    rows[0][1] = x.n;
    rows[1][1] = '<span class="chipset">' + attrs.map(function (a) { return '<span class="tag">' + a[0].slice(0, 3).toUpperCase() + ' ' + a[1] + '</span>'; }).join('') + '</span><small class="muted" style="display:block;margin-top:.4em">Six attributes · total always ' + x.a.reduce(function (s, v) { return s + v; }, 0) + '</small>';
    rows[2][1] = '<span class="chipset">' + x.t.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</span>';
    rows = rows.filter(function (r) { return r[0] !== 'Sample record'; });
    $('#fRows').innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
  }
  host.addEventListener('click', function (e) { var b = e.target.closest('.arch-b'); if (b) { st.a = +b.getAttribute('data-i'); draw(); } });
  $$('#discFull input').forEach(function (i) { i.addEventListener('change', function () { st.l = +i.value; draw(); }); });
  draw();
})();
