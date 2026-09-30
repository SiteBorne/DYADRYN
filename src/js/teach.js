/* DYADRYN — TRAINING RULES
 * A deliberately simplified teaching model of a round. It shows how simultaneous locked turns, guard,
 * counters, heat and drift *feel*. It is NOT the ranked resolver: costs, effects and coefficients here
 * are illustrative and differ from the versioned engine. Ranked results are only ever produced by the
 * authoritative engine and proven through replays.
 */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {};
  var ACTIONS = ['TRACE', 'PRESS', 'GUARD', 'COUNTER', 'ADAPT', 'MIRROR', 'RECOVER', 'SIGNATURE'];
  var HOSTILE = { PRESS: 1, SIGNATURE: 1 };
  var COST = { TRACE: 7, PRESS: 13, GUARD: 8, COUNTER: 11, ADAPT: 8, MIRROR: 14, RECOVER: 0, SIGNATURE: 20 };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function fresh() { return { vit: 100, en: 100, foc: 20, heat: 0, mom: 0, guard: 0, drift: 0, sigCd: 0, adapt: 0, last: null, run: 0, insight: 0 }; }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }

  function legal(s, opp) {
    return ACTIONS.filter(function (a) {
      if (a === 'SIGNATURE') return s.foc >= 30 && s.sigCd <= 0 && s.en >= COST.SIGNATURE;
      if (a === 'MIRROR') return !!opp.last && opp.last !== 'SIGNATURE' && opp.last !== 'MIRROR' && s.en >= COST.MIRROR;
      if (a === 'RECOVER') return true;
      return s.en >= COST[a];
    });
  }

  /* pressure output of an action, before the target's defences */
  function offense(s, act, opp) {
    var m = 1 + 0.04 * s.mom, dm = s.drift >= 80 ? .85 : s.drift >= 60 ? .95 : 1, hm = s.heat >= 70 ? 1.05 : 1, st = s.adapt > 0 ? 1.08 : 1;
    var k = m * dm * hm * st;
    if (act === 'PRESS') return 9.5 * k;
    if (act === 'SIGNATURE') return 16 * k;
    if (act === 'MIRROR' && opp.last === 'PRESS') return 9.5 * .9 * k;
    return 0;
  }

  /* resolve one simultaneous round from one shared snapshot */
  function resolve(A, B, a, b, predA, predB, rnd) {
    var ev = [], A2 = clone(A), B2 = clone(B);
    [A2, B2].forEach(function (s) { s.en = clamp(s.en + 6, 0, 100); s.guard = Math.floor(s.guard * .5); s.sigCd = Math.max(0, s.sigCd - 1); s.adapt = Math.max(0, s.adapt - 1); });
    var eff = { A: { pressure: 0, guard: 0, mults: 1 }, B: { pressure: 0, guard: 0, mults: 1 } };
    var names = { A: A.name || 'You', B: B.name || 'Opponent' };
    function apply(side, s, opp, act, pred, oppAct) {
      var e = eff[side], sn = names[side];
      var real = act === 'MIRROR' ? (opp.last && opp.last !== 'SIGNATURE' && opp.last !== 'MIRROR' ? opp.last : 'GUARD') : act;
      var mirrored = act === 'MIRROR';
      var f = mirrored ? .9 : 1;
      var prior = side === 'A' ? A : B, nr = prior.last === act ? prior.run + 1 : 1;
      if (nr >= 3) { s.drift += 5; ev.push({ side: side, t: sn + ' repeated ' + act + ' a third time — Drift +5.', r: 'repetition' }); }
      var cost = mirrored ? COST.MIRROR : COST[real];
      switch (real) {
        case 'TRACE': s.foc += 18 * f; s.en -= cost; s.insight += 1; ev.push({ side: side, t: sn + ' traced. One tendency signal revealed.', r: 'TRACE' }); break;
        case 'PRESS': s.en -= cost; s.heat += 8; e.pressure += offense(s, 'PRESS', opp) * f; ev.push({ side: side, t: sn + (mirrored ? ' mirrored the last PRESS.' : ' pressed.'), r: mirrored ? 'MIRROR' : 'PRESS' }); break;
        case 'GUARD': s.en -= cost; e.guard += 24 * f * (s.adapt > 0 ? 1.08 : 1); s.heat -= 4; s.foc += 4; ev.push({ side: side, t: sn + (mirrored ? ' mirrored the last GUARD.' : ' guarded.'), r: mirrored ? 'MIRROR' : 'GUARD' }); break;
        case 'COUNTER': s.en -= cost; break;
        case 'ADAPT': s.en -= cost; s.drift -= 8; s.adapt = 3; ev.push({ side: side, t: sn + ' adapted. Drift −8 and a three-round stance opens.', r: 'ADAPT' }); break;
        case 'RECOVER': s.en += 18; s.heat -= 10; s.drift -= 7; s.foc += 5; e.mults *= 1.10; ev.push({ side: side, t: sn + ' recovered. Exposed: incoming pressure ×1.10.', r: 'RECOVER' }); break;
        case 'SIGNATURE': s.en -= cost; s.foc -= 30; s.sigCd = 4; s.heat += 10; e.pressure += offense(s, 'SIGNATURE', opp); ev.push({ side: side, t: sn + ' invoked a signature.', r: 'SIGNATURE' }); break;
      }
    }
    apply('A', A2, B, a, predA, b); apply('B', B2, A, b, predB, a);

    /* counters: judged against the other side's current action, both from the same snapshot */
    var cA = a === 'COUNTER', cB = b === 'COUNTER';
    var hitA = cA && predA === b, hitB = cB && predB === a;
    if (cA) { if (hitA) { A2.foc += 10; A2.mom = clamp(A2.mom + 1, -3, 3); A2.drift -= 2; if (HOSTILE[b]) eff.B.pressure *= .4; eff.A.pressure += 8; ev.push({ side: 'A', t: names.A + ' countered ' + predA + ' — read correctly. Incoming effect cut to 40%, pressure returned.', r: 'COUNTER hit' }); } else { A2.drift += 6; eff.B.mults *= 1.10; ev.push({ side: 'A', t: names.A + ' predicted ' + predA + ' but ' + names.B + ' chose ' + b + '. Drift +6, incoming ×1.10.', r: 'COUNTER miss' }); } }
    if (cB) { if (hitB) { B2.foc += 10; B2.mom = clamp(B2.mom + 1, -3, 3); B2.drift -= 2; if (HOSTILE[a]) eff.A.pressure *= .4; eff.B.pressure += 8; ev.push({ side: 'B', t: names.B + ' countered ' + predB + ' — read correctly. Incoming effect cut to 40%, pressure returned.', r: 'COUNTER hit' }); } else { B2.drift += 6; eff.A.mults *= 1.10; ev.push({ side: 'B', t: names.B + ' predicted ' + predB + ' but ' + names.A + ' chose ' + a + '. Drift +6, incoming ×1.10.', r: 'COUNTER miss' }); } }

    /* guard first, then vitality — simultaneous */
    A2.guard = clamp(A2.guard + eff.A.guard, 0, 60); B2.guard = clamp(B2.guard + eff.B.guard, 0, 60);
    function hit(target, dmg, mult, label, side) {
      var jitter = 1 + (rnd ? (rnd() - .5) * .06 : 0);
      var bright = target.heat >= 70 ? 1.08 : 1;
      dmg = dmg * mult * bright * jitter; if (dmg <= 0) return 0;
      var g = Math.min(target.guard, dmg); target.guard -= g; var v = dmg - g; target.vit -= v;
      if (g > 0 || v > 0) ev.push({ side: side, t: label + ' took ' + Math.round(dmg) + ' pressure: ' + Math.round(g) + ' absorbed by Guard, ' + Math.round(v) + ' to Vitality.', r: 'DAMAGE' });
      return v;
    }
    var vB = hit(B2, eff.A.pressure, eff.B.mults, names.B, 'B'), vA = hit(A2, eff.B.pressure, eff.A.mults, names.A, 'A');
    if (vB >= 8) A2.mom = clamp(A2.mom + 1, -3, 3);
    if (vA >= 8) B2.mom = clamp(B2.mom + 1, -3, 3);
    if (vA >= 14) A2.mom = clamp(A2.mom - 1, -3, 3); if (vB >= 14) B2.mom = clamp(B2.mom - 1, -3, 3);
    [A2, B2].forEach(function (s) {
      s.heat = clamp(s.heat, 0, 100); s.en = clamp(s.en, 0, 100); s.foc = clamp(s.foc, 0, 100); s.drift = clamp(s.drift, 0, 100); s.vit = clamp(s.vit, 0, 100);
      if (s.heat >= 90) s.drift = clamp(s.drift + 3, 0, 100);
    });
    if (A2.heat >= 70 && A.heat < 70) ev.push({ side: 'A', t: names.A + ' is BRIGHT: more pressure out, more damage in.', r: 'BRIGHT' });
    if (B2.heat >= 70 && B.heat < 70) ev.push({ side: 'B', t: names.B + ' is BRIGHT: more pressure out, more damage in.', r: 'BRIGHT' });
    A2.last = a; B2.last = b; A2.run = A.last === a ? A.run + 1 : 1; B2.run = B.last === b ? B.run + 1 : 1;
    var out = null;
    if (A2.vit <= 0 && B2.vit <= 0) out = 'draw'; else if (B2.vit <= 0) out = 'A'; else if (A2.vit <= 0) out = 'B';
    return { A: A2, B: B2, events: ev, outcome: out, hit: { A: hitA, B: hitB } };
  }

  function score(s) { return .55 * s.vit + .15 * s.en + .1 * s.foc + .1 * (s.guard / 60 * 100) + .05 * ((s.mom + 3) / 6 * 100) + .05 * (100 - s.drift); }

  /* opponent / sample policies — read only public history, choose one legal action */
  function policy(kind, me, opp, hist, rnd) {
    var L = legal(me, opp), pick = function (a) { return L.indexOf(a) >= 0 ? a : null; };
    var oppLast = opp.last, repeatOpp = hist.length >= 2 && hist[hist.length - 1] === hist[hist.length - 2];
    var pred = null, act = null;
    if (kind === 'hunter') {                     // learns first, punishes patterns later
      if (me.foc < 22 && rnd() < .5) act = pick('TRACE');
      if (!act && me.foc >= 30 && rnd() < .7) act = pick('SIGNATURE');
      if (!act && repeatOpp && rnd() < .7) { act = pick('COUNTER'); pred = hist[hist.length - 1]; }
      if (!act && me.heat >= 60) act = pick('RECOVER');
      if (!act && opp.heat >= 55 && rnd() < .5) act = pick('GUARD');
      if (!act) act = me.last === 'PRESS' ? pick(rnd() < .55 ? 'GUARD' : 'TRACE') : pick(rnd() < .8 ? 'PRESS' : 'TRACE');
    } else if (kind === 'pressure') {             // pressure and tempo
      if (me.heat >= 72) act = pick('RECOVER');
      if (!act && me.foc >= 30 && rnd() < .5) act = pick('SIGNATURE');
      if (!act && me.guard < 8 && opp.mom >= 1 && rnd() < .5) act = pick('GUARD');
      if (!act && rnd() < .16) { act = pick('COUNTER'); pred = 'PRESS'; }
      if (!act && me.drift >= 30 && rnd() < .6) act = pick('ADAPT');
      if (!act) act = pick(rnd() < .78 ? 'PRESS' : 'TRACE');
    } else {                                       // 'warden': steady guard, opportunistic counter
      if (me.heat >= 60 || me.en < 26) act = pick('RECOVER');
      if (!act && oppLast === 'PRESS' && rnd() < .4) { act = pick('COUNTER'); pred = 'PRESS'; }
      if (!act && me.guard < 14 && rnd() < .35) act = pick('GUARD');
      if (!act && me.foc >= 30 && rnd() < .5) act = pick('SIGNATURE');
      if (!act) act = pick(rnd() < .5 ? 'TRACE' : 'PRESS');
    }
    if (!act) act = L[0] || 'RECOVER';
    if (act === 'COUNTER' && !pred) pred = 'PRESS';
    return { act: act, pred: pred };
  }

  /* deterministic sample match for replays (seeded; labelled SAMPLE wherever shown) */
  function sampleMatch(seed, kindA, kindB, nameA, nameB, maxR) {
    var rnd = DY.rng(seed), A = fresh(), B = fresh(); A.name = nameA; B.name = nameB;
    var hA = [], hB = [], rounds = [], R = maxR || 24;
    rounds.push({ n: 0, A: clone(A), B: clone(B), events: [], actA: null, actB: null });
    for (var n = 1; n <= R; n++) {
      var pa = policy(kindA, A, B, hB, rnd), pb = policy(kindB, B, A, hA, rnd);
      var r = resolve(A, B, pa.act, pb.act, pa.pred, pb.pred, rnd);
      hA.push(pa.act); hB.push(pb.act);
      A = r.A; B = r.B; A.name = nameA; B.name = nameB;
      rounds.push({ n: n, A: clone(A), B: clone(B), events: r.events, actA: pa.act, actB: pb.act, predA: pa.pred, predB: pb.pred, outcome: r.outcome });
      if (r.outcome) break;
    }
    var last = rounds[rounds.length - 1], winner = last.outcome;
    if (!winner) { var sa = score(last.A), sb = score(last.B); winner = Math.abs(sa - sb) < .5 ? 'draw' : sa > sb ? 'A' : 'B'; }
    return { seed: seed, rounds: rounds, winner: winner, nameA: nameA, nameB: nameB };
  }

  var _sample = null;
  DY.sample = function () { return _sample || (_sample = sampleMatch(2024, 'hunter', 'pressure', 'Metis', 'Cinder', 24)); };
  DY.teach = { ACTIONS: ACTIONS, COST: COST, fresh: fresh, clone: clone, legal: legal, resolve: resolve, policy: policy, score: score, sampleMatch: sampleMatch };
})();
