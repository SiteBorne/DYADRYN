/* DYADRYN Mask Forge — interactive model of compiling a public Mask (illustrative presets, not the compiler) */
(function () {
  'use strict';
  var DY = window.DY, $ = DY.$, $$ = DY.$$;
  var host = $('#archBtns'); if (!host) return;
  var LAB = ['Analysis', 'Execution', 'Adaptation', 'Influence', 'Resolve', 'Creativity'];
  var AXL = ['Risk tolerance', 'Aggression', 'Information seeking', 'Counterplay', 'Resource preservation', 'Deception (restrained)', 'Strategic horizon'];
  var ARCH = [
    { n: 'Trace-Hunter', b: 'Learns first. Punishes patterns later.', a: [84, 68, 82, 61, 75, 50], ax: [.4, .45, .9, .7, .6, .25, .8], t: ['analytical', 'patient', 'information-seeking', 'long-horizon'], s: ['Second-Order Sight', 'Counterfactual Shield'] },
    { n: 'Broker', b: 'Trades in incentives, tempo and constrained choices.', a: [72, 62, 70, 90, 66, 60], ax: [.55, .5, .6, .55, .5, .6, .55], t: ['influence-oriented', 'opportunistic', 'adaptive', 'deceptive-with-restraint'], s: ['Broker Lock', 'Constraint Collapse'] },
    { n: 'Stillpoint', b: 'Absorbs instability and turns pressure into control.', a: [66, 58, 74, 64, 90, 68], ax: [.25, .25, .5, .6, .85, .2, .7], t: ['resilient', 'protective', 'patient', 'resource-preserving'], s: ['Stillpoint', 'Counterfactual Shield'] },
    { n: 'Archive', b: 'Draws on accumulated pattern and unusual carry.', a: [80, 56, 82, 70, 62, 70], ax: [.35, .3, .8, .65, .6, .3, .95], t: ['analytical', 'adaptive', 'creative', 'long-horizon'], s: ['Archive Echo', 'Second-Order Sight'] },
    { n: 'Swarm', b: 'Distributed, adaptive, low-cost recomposition.', a: [60, 74, 84, 58, 58, 86], ax: [.7, .65, .5, .4, .35, .4, .4], t: ['adaptive', 'creative', 'volatile', 'opportunistic'], s: ['Swarm Repair', 'Constraint Collapse'] },
    { n: 'Veil', b: 'Controls disclosure, feints and opponent modelling.', a: [80, 54, 72, 88, 64, 62], ax: [.5, .4, .85, .7, .55, .75, .6], t: ['influence-oriented', 'information-seeking', 'deceptive-with-restraint', 'patient'], s: ['Veil Step', 'Broker Lock'] }
  ];
  var st = { a: 0, l: 0 };
  host.innerHTML = ARCH.map(function (x, i) { return '<button type="button" class="arch-b" data-i="' + i + '" aria-pressed="' + (i === 0) + '"><b>' + x.n + '</b><small>' + x.b + '</small></button>'; }).join('');
  var levels = ['Cold', 'Masked', 'Carry', 'Deep carry'];
  function draw() {
    var x = ARCH[st.a], attrs = LAB.map(function (l, i) { return [l, x.a[i]]; });
    $$('.arch-b', host).forEach(function (b, i) { b.setAttribute('aria-pressed', i === st.a); });
    $('#fName').textContent = x.n; $('#fBlurb').textContent = x.b; $('#fLevel').textContent = levels[st.l];
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
