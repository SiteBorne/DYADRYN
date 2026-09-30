/* DYADRYN core — header, menu, reveal, glossary, comfort prefs, proofline, shared utils */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = function () { return root.getAttribute('data-motion') === 'reduce'; };
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---- shared utils exposed for page modules ---- */
  var DY = window.DY = window.DY || {};
  DY.$ = $; DY.$$ = $$; DY.reduce = reduce;
  DY.sha256 = function (str) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 2166136261 >>> 0; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    var s = ('00000000' + h.toString(16)).slice(-8); return Promise.resolve((s + s + s + s + s + s + s + s).slice(0, 64));
  };
  DY.short = function (h) { return h.slice(0, 4) + '·' + h.slice(4, 8); };
  DY.rng = function (seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  DY.el = function (tag, attrs, html) { var e = d.createElement(tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; };

  /* ---- header ---- */
  var header = $('#siteHeader'), menuBtn = $('#menuBtn');
  function onScroll() { header.classList.toggle('solid', window.scrollY > 24); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  function setMenu(open) {
    header.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!header.classList.contains('open')); });
  $$('#nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && header.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

  /* ---- comfort preferences ---- */
  var pSize = $('#prefSize'), pMotion = $('#prefMotion');
  function syncPrefs() {
    if (pSize) pSize.setAttribute('aria-pressed', root.getAttribute('data-size') === 'lg');
    if (pMotion) pMotion.setAttribute('aria-pressed', root.getAttribute('data-motion') === 'reduce');
  }
  if (pSize) pSize.addEventListener('click', function () { var on = root.getAttribute('data-size') !== 'lg'; if (on) root.setAttribute('data-size', 'lg'); else root.removeAttribute('data-size'); store.set('dy.size', on ? 'lg' : 'std'); syncPrefs(); });
  if (pMotion) pMotion.addEventListener('click', function () { var on = root.getAttribute('data-motion') !== 'reduce'; root.setAttribute('data-motion', on ? 'reduce' : 'full'); store.set('dy.motion', on ? 'reduce' : 'full'); syncPrefs(); d.dispatchEvent(new Event('dy:motion')); });
  syncPrefs();

  /* ---- reveal on scroll ---- */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && !reduce()) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (n) { io.observe(n); });
  } else rv.forEach(function (n) { n.classList.add('in'); });

  /* ---- glossary tooltips (hover / focus / tap) ---- */
  var tip = $('#tip'), tipFor = null;
  function showTip(t) {
    tipFor = t; tip.innerHTML = '<b>' + (t.getAttribute('data-term') || t.textContent) + '</b>' + t.getAttribute('data-def');
    tip.classList.add('show');
    var r = t.getBoundingClientRect(), tr = tip.getBoundingClientRect();
    var x = Math.min(Math.max(8, r.left + r.width / 2 - tr.width / 2), window.innerWidth - tr.width - 8);
    var y = r.top - tr.height - 10; if (y < 8) y = r.bottom + 10;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { tip.classList.remove('show'); tipFor = null; }
  $$('dfn[data-def]').forEach(function (t) {
    t.setAttribute('tabindex', '0'); t.setAttribute('role', 'button'); t.setAttribute('aria-label', (t.getAttribute('data-term') || t.textContent) + ': ' + t.getAttribute('data-def'));
    t.addEventListener('mouseenter', function () { showTip(t); }); t.addEventListener('mouseleave', hideTip);
    t.addEventListener('focus', function () { showTip(t); }); t.addEventListener('blur', hideTip);
    t.addEventListener('click', function (e) { e.preventDefault(); tipFor === t ? hideTip() : showTip(t); });
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, { passive: true });

  /* ---- proofline: a hash-chained rail that records how far you've read ---- */
  var rail = $('#proofline'), secs = $$('[data-proof]');
  if (rail && secs.length > 1) {
    var chain = [], prev = 'genesis', pending = [];
    var fill = $('.fill', rail);
    secs.forEach(function (s, i) {
      var n = DY.el('span', { 'class': 'node' }), h = DY.el('span', { 'class': 'hash' }, '···');
      n.style.top = h.style.top = (i / (secs.length - 1) * 100) + '%';
      rail.appendChild(n); rail.appendChild(h);
      pending.push(DY.sha256(prev + '|' + i + '|' + s.getAttribute('data-proof')).then(function (x) { prev = x; return x; }));
      chain.push({ s: s, n: n, h: h });
    });
    // sequential chain (each depends on previous): recompute in order
    (function seq() { var p = 'genesis'; chain.reduce(function (pr, c, i) { return pr.then(function (prevHash) { return DY.sha256(prevHash + '|' + c.s.getAttribute('data-proof')).then(function (x) { c.h.textContent = DY.short(x); return x; }); }); }, Promise.resolve(p)); })();
    var ticking = false;
    function upd() {
      ticking = false;
      var mid = window.innerHeight * 0.45, cur = -1;
      rail.style.opacity = window.scrollY > window.innerHeight * 0.55 ? 1 : 0;
      chain.forEach(function (c, i) { var r = c.s.getBoundingClientRect(); var on = r.top < mid; c.n.classList.toggle('on', on); c.h.classList.remove('cur'); if (on) cur = i; });
      if (cur >= 0) chain[cur].h.classList.add('cur');
      var max = d.documentElement.scrollHeight - window.innerHeight;
      rail.style.setProperty('--p', (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%');
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd); upd();
  }

  /* ---- generic tabs (role=tablist) ---- */
  $$('[data-tabs]').forEach(function (wrap) {
    var btns = $$('[role=tab]', wrap), panels = btns.map(function (b) { return d.getElementById(b.getAttribute('aria-controls')); });
    function sel(i, focus) { btns.forEach(function (b, j) { b.setAttribute('aria-selected', i === j); b.tabIndex = i === j ? 0 : -1; if (panels[j]) panels[j].hidden = i !== j; }); if (focus) btns[i].focus(); }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { sel(i); });
      b.addEventListener('keydown', function (e) { var k = e.key; if (k === 'ArrowRight') { e.preventDefault(); sel((i + 1) % btns.length, true); } else if (k === 'ArrowLeft') { e.preventDefault(); sel((i - 1 + btns.length) % btns.length, true); } else if (k === 'Home') { e.preventDefault(); sel(0, true); } else if (k === 'End') { e.preventDefault(); sel(btns.length - 1, true); } });
    });
    var init = btns.findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; }); sel(init < 0 ? 0 : init);
  });
})();
