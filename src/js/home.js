/* DYADRYN home — round walkthrough, sample replay, mask preview, moves */
(function () {
  'use strict';
  var DY = window.DY, $ = DY.$, $$ = DY.$$;

  /* ---------- 02 · round walkthrough ---------- */
  var th = $('#theatre');
  if (th) {
    var ROUNDS = [
      { a: 'COUNTER', pa: 'PRESS', b: 'PRESS', hit: 'a',
        choose: 'Metis has been watching. She expects Cinder to press, so she locks COUNTER and names PRESS. Cinder locks PRESS. Neither can see the other’s choice.',
        resolve: 'The engine reveals both moves at once. Metis read it right: Cinder’s PRESS is cut to 40% and pressure comes back at him.',
        fx: [['up', 'Metis · Focus +10'], ['up', 'Metis · Momentum +1'], ['dn', 'Metis · Drift −2'], ['dn', 'Cinder · PRESS effect ×0.4'], ['nt', 'Cinder · Heat +']] },
      { a: 'TRACE', b: 'GUARD', hit: null,
        choose: 'Next round. Metis chooses to study rather than strike. Cinder braces. Again, both lock blind.',
        resolve: 'TRACE gives Metis Focus and one tendency signal about Cinder. GUARD gives Cinder a buffer for the next hit. No damage — but information changed hands.',
        fx: [['up', 'Metis · Focus ▲'], ['nt', 'Metis · 1 signal revealed'], ['up', 'Cinder · Guard ▲'], ['dn', 'Cinder · Heat ▼']] },
      { a: 'COUNTER', pa: 'PRESS', b: 'GUARD', hit: 'miss',
        choose: 'Metis predicts another PRESS and locks COUNTER again. Cinder, this time, guards. A confident read can still be wrong.',
        resolve: 'Cinder guarded, so the prediction misses. A missed Counter costs Metis Drift and leaves her exposed for the round. Reading is powerful — and risky.',
        fx: [['up', 'Metis · Drift +6'], ['up', 'Metis · takes ×1.10 this round'], ['up', 'Cinder · Guard ▲']] }
    ];
    var st = { r: 0, s: 0 }, prev = null, hashes = [];
    var stage = $('.th-stage', th), cards = { a: $('.th-card[data-side=a]', th), b: $('.th-card[data-side=b]', th) };
    var txt = $('#thText'), fx = $('#thFx'), hbox = $('#thHash'), nextB = $('#thNext'), backB = $('#thBack'), lab = $('#thRound');
    var steps = $$('.th-steps button', th);
    var sub = function (r, side) { var act = side === 'a' ? r.a : r.b, p = side === 'a' ? r.pa : null; return p ? 'predicts ' + p : (act === 'PRESS' ? 'direct pressure' : act === 'GUARD' ? 'builds a buffer' : act === 'TRACE' ? 'reads the opponent' : ''); };
    var hashFor = function (i) {
      var r = ROUNDS[i]; return DY.sha256('dyadryn.training.sample|round=' + (i + 1) + '|A=' + r.a + (r.pa ? '(' + r.pa + ')' : '') + '|B=' + r.b + '|prev=' + (i ? hashes[i - 1] : 'genesis')).then(function (h) { hashes[i] = h; return h; });
    };
    var render = function () {
      var r = ROUNDS[st.r];
      steps.forEach(function (b, i) { b.setAttribute('aria-current', i === st.s ? 'step' : 'false'); });
      stage.setAttribute('data-step', st.s);
      ['a', 'b'].forEach(function (side) {
        var c = cards[side], act = side === 'a' ? r.a : r.b, m = DY.MOVES.filter(function (x) { return x.k === act; })[0];
        $('[data-ico]', c).innerHTML = DY.icon(m.ico, 54); $('[data-name]', c).textContent = m.name; $('[data-sub]', c).textContent = sub(r, side);
        c.classList.toggle('flip', st.s >= 1);
        c.classList.toggle('hit', st.s >= 1 && ((r.hit === 'a' && side === 'a')));
        c.classList.toggle('miss', st.s >= 1 && r.hit === 'miss' && side === 'a');
      });
      fx.innerHTML = ''; hbox.hidden = true;
      if (st.s === 0) { txt.textContent = r.choose; nextB.firstChild.textContent = 'Reveal both moves '; }
      if (st.s === 1) { txt.textContent = r.resolve; r.fx.forEach(function (f) { var li = DY.el('li', { 'class': f[0] }, f[1]); fx.appendChild(li); }); nextB.firstChild.textContent = 'Seal the round '; }
      if (st.s === 2) {
        txt.textContent = 'The engine seals the round into a hash chain: this round’s hash includes the moves, the result and the hash before it. Change anything later and every hash after it breaks.';
        var i = st.r; (i ? Promise.resolve(hashes[i - 1] || null) : Promise.resolve(null)).then(function (ph) { return hashFor(i).then(function (h) { $('#thPrev').textContent = i ? DY.short(hashes[i - 1]) : 'genesis'; $('#thCur').textContent = DY.short(h); hbox.hidden = false; }); });
        nextB.firstChild.textContent = st.r < ROUNDS.length - 1 ? 'Next round ' : 'Replay from round 1 ';
      }
      backB.disabled = st.s === 0 && st.r === 0;
      lab.textContent = 'Sample round ' + (st.r + 1) + ' of ' + ROUNDS.length;
    };
    nextB.addEventListener('click', function () { if (st.s < 2) st.s++; else { st.s = 0; st.r = (st.r + 1) % ROUNDS.length; if (st.r === 0) hashes = []; } render(); });
    backB.addEventListener('click', function () { if (st.s > 0) st.s--; else if (st.r > 0) { st.r--; st.s = 2; } render(); });
    steps.forEach(function (b) { b.addEventListener('click', function () { st.s = +b.getAttribute('data-step'); if (st.s === 2) { // ensure the chain is filled up to this round
      var p = Promise.resolve(); for (var i = 0; i <= st.r; i++) (function (i) { p = p.then(function () { return hashes[i] || hashFor(i); }); })(i); p.then(render); return; } render(); }); });
    render();
  }

  /* ---------- 03 · sample replay ---------- */
  var chartHost = $('#sampleChart');
  if (chartHost && DY.teach) {
    var m = DY.sample();
    var A = m.rounds.map(function (r) { return r.A.vit; }), B = m.rounds.map(function (r) { return r.B.vit; });
    var last = m.rounds.length - 1, win = m.winner === 'A' ? 'Metis' : m.winner === 'B' ? 'Cinder' : null;
    $('#vsRow').innerHTML =
      '<div class="vs-agent"><span class="th-sig">' + $('.th-sig', th || document).innerHTML + '</span><div><h3>Metis</h3><span class="caps">Trace-Hunter' + (win === 'Metis' ? ' · <b style="color:var(--accent-text)">Won ◆</b>' : '') + '</span></div></div>' +
      '<div class="vs-mid" aria-hidden="true">VS</div>' +
      '<div class="vs-agent r"><span class="th-sig" style="--sigil-axis:var(--cold)">' + $('.th-sig', th || document).innerHTML + '</span><div><h3>Cinder</h3><span class="caps">Pressure' + (win === 'Cinder' ? ' · <b style="color:var(--accent-text)">Won ◆</b>' : '') + '</span></div></div>';
    DY.lineChart(chartHost, [{ name: 'Metis', cls: 'la', mk: 'c', values: A }, { name: 'Cinder', cls: 'lb', mk: 's', values: B }], { label: 'Vitality by round, sample match: Metis versus Cinder', marks: [{ x: last, label: 'Proof complete · round ' + last }] });
  }

  /* ---------- 04 · mask preview ---------- */
  var rows = $('#miniRows');
  if (rows) {
    var names = ['Cold', 'Masked', 'Carry', 'Deep carry'];
    var draw = function (l) { rows.innerHTML = DY.maskRows(l).map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join(''); $('#miniLevel').textContent = names[l]; };
    $$('#discMini input').forEach(function (i) { i.addEventListener('change', function () { draw(+i.value); }); });
    draw(0);
  }

  /* ---------- 05 · meters + moves ---------- */
  var mt = $('#ovMeters');
  if (mt) {
    var vals = { vitality: [78, 100, '78'], energy: [64, 100, '64'], focus: [42, 100, '42'], heat: [61, 100, '61'], momentum: [4 / 6 * 100, 100, '+1'], guard: [24 / 60 * 100, 100, '24'], drift: [18, 100, '18'] };
    mt.innerHTML = DY.RES.map(function (r) { var v = vals[r.k]; return '<div class="meter" data-k="' + r.k + '">' + DY.icon(r.k, 20) + '<span><dfn data-term="' + r.name + '" data-def="' + r.def.replace(/"/g, '&quot;') + '">' + r.name + '</dfn></span><div class="bar" role="img" aria-label="' + r.name + ' ' + v[2] + ' of ' + r.range + '"><i style="--v:' + v[0] + '%"></i></div><b>' + v[2] + '</b></div>'; }).join('') + '<p class="muted" style="font-size:.9rem;margin:.6rem 0 0">Heat 61 is close to <dfn data-term="Bright" data-def="Dangerously exposed: at Heat 70 you push harder but take more damage.">BRIGHT</dfn> (70).</p>';
    var acts = $('#acts'), det = $('#actDetail');
    acts.innerHTML = DY.MOVES.map(function (m, i) { return '<button class="act" role="tab" id="act-' + m.k + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-i="' + i + '">' + DY.icon(m.ico, 32) + '<span>' + m.name + '</span></button>'; }).join('');
    var showAct = function (i) { var m = DY.MOVES[i]; $$('.act', acts).forEach(function (b, j) { b.setAttribute('aria-selected', i === j); b.tabIndex = i === j ? 0 : -1; }); det.innerHTML = '<h4>' + m.name + ' <span class="muted" style="font-weight:400;letter-spacing:.02em;text-transform:none">— ' + m.line + '</span></h4><p>' + m.desc + '</p><div class="meta"><span class="tag">Energy · ' + m.energy + '</span><span class="tag tag--oxide">' + m.gain + '</span><span class="tag tag--trace">' + m.risk + '</span></div>'; };
    acts.addEventListener('click', function (e) { var b = e.target.closest('.act'); if (b) showAct(+b.getAttribute('data-i')); });
    acts.addEventListener('keydown', function (e) { var k = e.key, b = e.target.closest('.act'); if (!b) return; var i = +b.getAttribute('data-i'), n = DY.MOVES.length, t = null; if (k === 'ArrowRight') t = (i + 1) % n; else if (k === 'ArrowLeft') t = (i - 1 + n) % n; else if (k === 'ArrowDown') t = (i + 4) % n; else if (k === 'ArrowUp') t = (i - 4 + n) % n; if (t !== null) { e.preventDefault(); showAct(t); $$('.act', acts)[t].focus(); } });
    showAct(0);
  }

  /* ---------- early access ---------- */
  var ea = $('#eaForm');
  if (ea) ea.addEventListener('submit', function (e) {
    e.preventDefault(); var mail = $('#eaMail').value.trim(), msg = $('#eaMsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { msg.textContent = 'That email does not look right. Check it and try again.'; return; }
    msg.textContent = 'Sending…';
    fetch(ea.getAttribute('data-endpoint'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: mail, source: 'dyadryn-web' }) })
      .then(function (r) { if (!r.ok) throw 0; msg.textContent = 'Mask received. You will hear from us when operator slots open.'; ea.reset(); })
      .catch(function () { msg.textContent = 'Could not send. Try again in a moment.'; });
  });
})();
