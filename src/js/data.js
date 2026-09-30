/* DYADRYN — public player-facing rule data (structure, thresholds, tiers). Ranked constants live in the versioned engine. */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {};
  DY.meters = function (host, s, hideHidden) {
    var v = { vitality: [s.vit, Math.round(s.vit)], energy: [s.en, Math.round(s.en)], focus: [s.foc, Math.round(s.foc)], heat: [s.heat, Math.round(s.heat)], momentum: [(s.mom + 3) / 6 * 100, (s.mom > 0 ? '+' : '') + s.mom], guard: [s.guard / 60 * 100, Math.round(s.guard)], drift: [s.drift, Math.round(s.drift)] };
    host.innerHTML = DY.RES.map(function (r) {
      var hid = hideHidden && (r.k === 'energy' || r.k === 'focus');
      if (hid) return '<div class="meter" data-k="' + r.k + '">' + DY.icon(r.k, 20) + '<span>' + r.name + '</span><div class="bar"><span class="withheld" style="min-height:1.6em;font-size:.66rem;width:100%">' + DY.icon('lock', 14) + 'Withheld by mask</span></div><b>–</b></div>';
      var x = v[r.k]; var flag = (r.k === 'heat' && s.heat >= 70) ? ' <em class="flag">BRIGHT</em>' : (r.k === 'drift' && s.drift >= 60) ? ' <em class="flag">STRAINED</em>' : '';
      return '<div class="meter" data-k="' + r.k + '">' + DY.icon(r.k, 20) + '<span>' + r.name + flag + '</span><div class="bar" role="img" aria-label="' + r.name + ' ' + x[1] + '"><i style="--v:' + x[0] + '%"></i></div><b>' + x[1] + '</b></div>';
    }).join('');
  };

  DY.icon = function (k, size) { var s = DY.icons && DY.icons[k] || ''; return size ? s.replace(/width="24" height="24"/, 'width="' + size + '" height="' + size + '"') : s; };
  DY.ATTR = [['ANALYSIS', 84], ['EXECUTION', 68], ['ADAPTATION', 82], ['INFLUENCE', 61], ['RESOLVE', 75], ['CREATIVITY', 50]];

  /* what a public Mask shows at each disclosure level (Brand Bible §22, §45, §64) */
  DY.maskRows = function (lvl) {
    var W = function (t, lock) { return '<span class="withheld">' + (lock ? DY.icon('lock', 16) : '') + t + '</span>'; };
    var chips = DY.ATTR.map(function (a) { return '<span class="tag">' + a[0].slice(0, 3) + ' ' + a[1] + '</span>'; }).join('');
    return [
      ['Archetype', 'Trace-Hunter'],
      ['Attributes', '<span class="chipset">' + chips + '</span><small class="muted" style="display:block;margin-top:.4em">Six attributes · total always 420</small>'],
      ['Traits', '<span class="chipset"><span class="tag">analytical</span><span class="tag">patient</span><span class="tag">information-seeking</span><span class="tag">long-horizon</span></span>'],
      ['Signatures', W('Revealed on use')],
      ['Principles', lvl >= 1 ? 'Prefers evidence to persuasion. Reads before it commits.' : W('Withheld by mask')],
      ['History', lvl === 0 ? W('Withheld by mask') : lvl === 1 ? 'High-level: adapts after repeated openings.' : lvl === 2 ? 'Approved battle history: 3 lessons carried in.' : 'Richer context you selected: 7 items carried in.'],
      ['Private memory', W('Private carry', true)],
      ['Raw identity files', W('Never leave the agent', true)],
      ['Sample record', '9 proof matches won · 5 lost <span class="tag tag--sim" style="margin-left:.4em">Sample</span>']
    ];
  };
})();
