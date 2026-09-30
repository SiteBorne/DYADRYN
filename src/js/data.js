/* DYADRYN — public player-facing rule data (structure, thresholds, tiers). Ranked constants live in the versioned engine. */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {};
  DY.MOVES = [
    { k: 'TRACE', ico: 'trace', name: 'Trace', line: 'Learn first.', desc: 'Read your opponent. You gain Focus and one bounded tendency signal — “prefers high intensity”, “counter-oriented”. Never their private memory.', cost: 'Low', gain: 'Focus ▲ · one signal', risk: 'Costs tempo' },
    { k: 'PRESS', ico: 'press', name: 'Press', line: 'Direct pressure.', desc: 'Your main attack. Damage hits Guard first, then Vitality. Strong hits build Momentum; every press builds Heat.', cost: 'Medium', gain: 'Damage · Momentum', risk: 'Heat ▲' },
    { k: 'GUARD', ico: 'guard', name: 'Guard', line: 'Absorb and steady.', desc: 'Builds a Guard buffer that soaks damage before Vitality does, cools Heat a little and sharpens Focus. Guard halves at the start of each round.', cost: 'Low–medium', gain: 'Guard ▲ · Heat ▼', risk: 'Decays each round' },
    { k: 'COUNTER', ico: 'counter', name: 'Counter', line: 'Name the move.', desc: 'Predict your opponent’s exact move. Right: their move is cut to 40%, you hit back and gain Focus and Momentum. Wrong: Drift rises and you take extra damage.', cost: 'Medium', gain: 'Read right: swing the round', risk: 'Read wrong: Drift ▲ · damage ▲' },
    { k: 'ADAPT', ico: 'adapt', name: 'Adapt', line: 'Reshape, don’t grow.', desc: 'Shift strengths toward one of six stances for three rounds. Total power never rises — you trade one strength for another. Also lowers Drift.', cost: 'Low–medium', gain: 'Stance · Drift ▼', risk: 'Cooldown after' },
    { k: 'MIRROR', ico: 'mirror', name: 'Mirror', line: 'Reuse their last move.', desc: 'Copy your opponent’s previous base move at reduced strength. Cannot copy Signature or Mirror. Only legal after they have moved.', cost: 'Medium–high', gain: 'Their best idea, yours', risk: 'Weaker than the original' },
    { k: 'RECOVER', ico: 'recover', name: 'Recover', line: 'Trade safety for resources.', desc: 'Regain Energy, cool Heat, lower Drift and steady Focus. The price: you are exposed and take a little more damage this round.', cost: 'None (it pays you)', gain: 'Energy ▲ · Heat ▼ · Drift ▼', risk: 'Exposed this round' },
    { k: 'SIGNATURE', ico: 'signature', name: 'Signature', line: 'Your Mask’s own move.', desc: 'One of two special moves your Mask carries, chosen from a fixed, fair list. Needs 30 Focus, then a cooldown. Names are cosmetic; the mechanics never change.', cost: 'Medium–high', gain: 'Template effect', risk: 'Focus spent · cooldown' }
  ];
  DY.RES = [
    { k: 'vitality', name: 'Vitality', range: '0–100', def: 'Your health. At zero after a round, you are defeated.' },
    { k: 'energy', name: 'Energy', range: '0–100', def: 'What moves cost. A little returns at the start of every round.' },
    { k: 'focus', name: 'Focus', range: '0–100', def: 'Tactical clarity. Trace and successful Counters build it; Signatures spend it.' },
    { k: 'heat', name: 'Heat', range: '0–100', def: 'Aggression leaves heat. At 70 you are BRIGHT: more pressure out, more damage in. At 90 it also builds Drift.' },
    { k: 'momentum', name: 'Momentum', range: '−3 … +3', def: 'Each point adds a small bonus to your offense. Heavy hits taken can cost it.' },
    { k: 'guard', name: 'Guard', range: '0–60', def: 'A buffer that absorbs damage first, then halves every round.' },
    { k: 'drift', name: 'Drift', range: '0–100', def: 'Loss of coherence. At 60 your non-recovery moves weaken a little; at 80, more. Adapt and Recover lower it.' }
  ];
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
