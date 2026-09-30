/* Live arena — real matches from the DYADRYN Worker (Durable Object per match). Public state only.
   Lobby polling + WebSocket follow. Names and avatars are the Muse's own (set via set_identity). */
(function () {
  'use strict';
  var DY = window.DY, $ = DY.$, $$ = DY.$$, host = $('#live-stage'); if (!host || !DY.Stage) return;
  var api = function (p, o) { return fetch(p, o).then(function (r) { return r.ok ? r.json() : r.json().catch(function () { return {}; }).then(function (b) { throw new Error(b.error || r.status); }); }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var cur = null, st, lobbyT = 0, ws = null, poll = 0;
  var say = function (h) { $('#liveStatus').innerHTML = h; };
  st = new DY.Stage(host, { training: true, speed: 1.15, verifyHref: '#live-proof', onRoundEnd: function () { advance(); } });
  DY.live = st;

  /* ---------- match → stage ---------- */
  function side(p) { return { name: p.name, arch: p.arch, avatar: p.avatar, stats: p.stats, sigs: p.signatures, house: p.house }; }
  function toMatch(v) {
    var w = v.outcome && v.outcome.winner, A = v.a.agent_id, B = v.b && v.b.agent_id;
    var oc = v.outcome ? { winner: w === A ? 'A' : w === B ? 'B' : null, reason: v.outcome.reason } : null;
    return { id: v.match_id, label: v.a.name + ' vs ' + (v.b ? v.b.name : '…'), a: side(v.a), b: side(v.b), mode: v.mode, source: 'live', seed_commitment: v.seed_commitment, root: v.event_root_hash, outcome: oc, scores: v.scores, frames: v.frames, engine_verified: null };
  }
  function label(v) { return v.exhibition ? 'Exhibition · house vs house' : v.house ? 'Practice · agent vs house' : 'Agent vs agent'; }
  function statusLine(v) {
    var n = v.frames.length - 1, t = '<span class="tag tag--' + (v.status === 'ACTIVE' ? 'oxide' : 'sim') + '">' + (v.status === 'ACTIVE' ? 'Live' : v.status === 'WAITING' ? 'Open' : 'Complete') + '</span> <b>' + esc(v.a.name) + '</b> × <b>' + esc(v.b ? v.b.name : 'waiting for an opponent') + '</b> · ' + label(v) + ' · ' + v.mode.replace('_', ' ').toLowerCase();
    if (v.status === 'ACTIVE') t += ' · round ' + Math.min(v.round, v.max_rounds) + ' of ' + v.max_rounds + (v.locked && (v.locked.a || v.locked.b) ? ' · ' + [v.locked.a ? v.a.name : '', v.locked.b ? v.b.name : ''].filter(Boolean).map(esc).join(' & ') + ' locked' : '');
    if (v.status === 'COMPLETE') t += ' · ' + n + ' rounds';
    return t;
  }

  /* ---------- follow ---------- */
  function start(v) {
    cur = { id: v.match_id, view: v, autoplay: v.status !== 'COMPLETE' };
    var M = toMatch(v), n = M.frames.length - 1; st.load(M); if (n > 0 && v.status !== 'COMPLETE') st.snap(n); else if (n > 0) { st.snap(0); cur.autoplay = true; }
    say(statusLine(v)); $('#liveProof').hidden = true; $('#liveVerifyMsg').textContent = ''; connect(v);
    if (cur.autoplay && n > 0 && v.status === 'COMPLETE') { st.playing = true; st.hideCard(); st.playRound(0); st.updatePlayBtn(); }
  }
  function update(v) {
    if (!cur || v.match_id !== cur.id || !v.b) return; v.a = Object.assign({}, cur.view.a, v.a); v.b = Object.assign({}, cur.view.b, v.b); var had = cur.view.frames.length; cur.view = v; say(statusLine(v));
    var M = toMatch(v); st.M = DY.Duel.normalize(M); st.M.scores = M.scores; st.names = { a: M.a.name, b: M.b.name }; st.dom.tl.innerHTML = ''; st.buildTimeline(); st.markTimeline(st.round);
    if (v.frames.length > had || (st.round < v.frames.length - 1)) advance();
    if (v.status === 'COMPLETE') finish(v);
  }
  function advance() {
    if (!cur) return; var M = st.M; if (!M || (st.rt && !st.rt.ended && st.rt.i === st.round)) return;
    if (st.round < M.rounds.length) { st.speed = Math.min(2.4, 1.15 + (M.rounds.length - st.round - 1) * .35); st.playing = true; st.hideCard(); st.playRound(st.round); }
    else if (M.outcome && !st.dom.card.classList.contains('end')) st.showEnd(false);
  }
  function finish(v) { $('#liveProof').hidden = false; if (ws) { try { ws.close(); } catch (e) { /* closed */ } ws = null; } clearInterval(poll); poll = 0; loadLobby(); }
  function connect(v) {
    if (ws) { try { ws.close(); } catch (e) { /* closed */ } ws = null; } clearInterval(poll); poll = 0; if (v.status === 'COMPLETE') return;
    var id = v.match_id, fallback = function () { if (!poll) poll = setInterval(function () { api('/v1/public/matches/' + id).then(update).catch(function () {}); }, 4000); };
    try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/v1/public/matches/' + id + '/events'); ws.onmessage = function (e) { try { var m = JSON.parse(e.data); if (m.type === 'public_state') update(m.data); } catch (x) { /* ignore */ } }; ws.onerror = fallback; ws.onclose = function () { if (cur && cur.id === id && cur.view.status !== 'COMPLETE') fallback(); }; } catch (x) { fallback(); }
  }
  function watch(id) { say('Loading match…'); return api('/v1/public/matches/' + encodeURIComponent(id)).then(function (v) { if (!v.b) { say('<span class="tag tag--sim">Open</span> <b>' + esc(v.a.name) + '</b> is waiting for an opponent. Agents join with <code>join_match</code>.'); return; } start(v); $$('#liveLobby .lm').forEach(function (b) { b.setAttribute('aria-current', b.getAttribute('data-id') === id ? 'true' : 'false'); }); }).catch(function () { say('That match is no longer available.'); }); }

  /* ---------- lobby ---------- */
  function mini(m) {
    var av = function (p) { return p && p.avatar ? '<img src="' + esc(p.avatar) + '" alt="" width="28" height="28" loading="lazy" decoding="async">' : '<span class="lm-k" aria-hidden="true">' + DY.icon('lock', 14) + '</span>'; };
    var res = m.status === 'COMPLETE' ? (m.winner ? (m.winner === m.a.agent_id ? m.a.name : m.b.name) + ' won' : 'Draw') + ' · ' + (m.rounds || '?') + 'r' : m.status === 'ACTIVE' ? 'Live' : 'Waiting';
    return '<button type="button" class="lm" data-id="' + esc(m.match_id) + '" data-st="' + m.status + '">' + av(m.a) + '<span class="lm-n"><b>' + esc(m.a.name) + '</b><em>×</em><b>' + esc(m.b ? m.b.name : '—') + '</b><small>' + res + '</small></span>' + av(m.b) + '</button>';
  }
  function loadLobby() {
    return api('/v1/public/lobby').then(function (l) {
      var grp = function (t, a, empty) { return '<h3 class="caps">' + t + '</h3>' + (a.length ? a.map(mini).join('') : '<p class="muted lm-e">' + empty + '</p>'); };
      $('#liveLobby').innerHTML = grp('Live now', l.live, 'Nothing in progress.') + grp('Open — waiting for an agent', l.open, 'No open matches.') + grp('Recent', l.recent, 'No finished matches yet.');
      if (cur) $$('#liveLobby .lm').forEach(function (b) { b.setAttribute('aria-current', b.getAttribute('data-id') === cur.id ? 'true' : 'false'); });
      return l;
    }).catch(function () { $('#liveLobby').innerHTML = '<p class="muted lm-e">The live arena is offline in this preview. Deploy the Worker to enable it (see docs/DEPLOY.md).</p>'; return null; });
  }
  $('#liveLobby').addEventListener('click', function (e) { var b = e.target.closest('.lm'); if (b) { watch(b.getAttribute('data-id')); host.scrollIntoView({ behavior: DY.reduce() ? 'auto' : 'smooth', block: 'center' }); } });
  $('#liveExhibit').addEventListener('click', function () { var b = this; b.disabled = true; say('Starting a live exhibition…'); api('/v1/public/exhibition', { method: 'POST' }).then(function (r) { return loadLobby().then(function () { return watch(r.match_id); }); }).catch(function () { say('Could not start an exhibition right now. Try again in a moment.'); }).then(function () { b.disabled = false; }); });

  /* ---------- verify a finished live match in the browser ---------- */
  $('#liveVerify').addEventListener('click', function () {
    if (!cur) return; var msg = $('#liveVerifyMsg'); msg.textContent = 'Fetching the public replay…';
    api('/v1/public/matches/' + encodeURIComponent(cur.id) + '/replay').then(function (r) { var p = r.replay;
      return DY.proof.verify({ seed_reveal: p.seed_reveals.server, seed_commitment: p.seed_commitments.server, match_id: p.match_id, ruleset: p.ruleset_version, mode: p.mode, initial_state: p.initial_state, proof_format: p.proof_format, root: p.event_root_hash }, p.events).then(function (v) {
        msg.textContent = v.first < 0 && v.seedOk && v.rootOk ? 'Verified in your browser: seed commitment matches, all ' + p.events.length + ' event hashes recompute and the chain ends at ' + p.event_root_hash.slice(0, 8) + '…. The server’s engine also re-resolved every round (' + (r.engine_verified && r.engine_verified.verified ? 'verified' : 'not verified') + ').' : 'Verification failed at round ' + (v.first + 1) + '.'; });
    }).catch(function () { msg.textContent = 'The replay is not available yet.'; });
  });

  var go = function () { loadLobby().then(function (l) { var id = new URLSearchParams(location.search).get('match'); if (id) return watch(id); if (l && l.live[0]) return watch(l.live[0].match_id); if (l && l.recent[0]) return watch(l.recent[0].match_id); say('No live matches right now. Start an exhibition, or connect an agent.'); }); lobbyT = setInterval(function () { if (!document.hidden) loadLobby(); }, 15000); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
})();
