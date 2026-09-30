/* DYADRYN proof — browser-side verification of a real engine replay (dyadryn.proof.v2).
   Verifies: seed commitment, every event hash from its body, every previous-hash link, and the terminal root.
   Full re-resolution of the rules is performed by the engine (recorded as "engine re-resolved" on each match). */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {};
  function canonical(v) {
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number') { if (!isFinite(v)) throw new Error('non_finite'); return JSON.stringify(v); }
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort().map(function (k) { return JSON.stringify(k) + ':' + canonical(v[k]); }).join(',') + '}';
    throw new Error('invalid_hash_input');
  }
  /* events: array of proof events (possibly tampered copies). Returns rows [{n, ok, first, kind, hash, recomputed}] and summary */
  function verify(m, events) {
    var rows = [], first = -1;
    return DY.sha256(m.seed_reveal).then(function (sc) {
      var seedOk = sc === m.seed_commitment;
      return DY.sha256(canonical({ matchId: m.match_id, ruleset: m.ruleset, mode: m.mode, seedCommitment: m.seed_commitment, initialState: m.initial_state, proofFormat: m.proof_format })).then(function (root0) {
        var prev = root0, p = Promise.resolve();
        events.forEach(function (e, i) {
          p = p.then(function () {
            var body = {}; Object.keys(e).forEach(function (k) { if (k !== 'hash') body[k] = e[k]; });
            return DY.sha256(canonical(body)).then(function (h) {
              var linkOk = e.previousHash === prev, hashOk = h === e.hash, ok = linkOk && hashOk;
              var un = first >= 0; if (!ok && first < 0) first = i;
              rows.push({ n: e.round, ok: ok && !un, first: !ok && first === i && !un, kind: un ? 'unanchored' : !hashOk ? 'content' : 'link', hash: e.hash, recomputed: h });
              prev = h; // carry the recomputed value: any change poisons everything after it
            });
          });
        });
        return p.then(function () { return { seedOk: seedOk, rows: rows, first: first, rootOk: prev === m.root && first < 0, root0: root0 }; });
      });
    });
  }
  DY.proof = { canonical: canonical, verify: verify };
})();
