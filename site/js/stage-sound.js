/* DYADRYN Combat Stage — tactile sound (Brand Bible §27): ceramic click, dry relay, graphite scrape, low mechanical lock,
   one resolved interval for victory. Synthesised live; off by default; starts only after the viewer opts in. */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {};
  DY.StageSound = function (stage) {
    var ctx = null, on = false, master = null;
    function init() { if (ctx) return true; var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; try { ctx = new AC(); master = ctx.createGain(); master.gain.value = .5; var comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination); } catch (e) { ctx = null; return false; } return true; }
    function noise(dur, f0, f1, q, vol, type, when) {
      var n = Math.max(1, Math.floor(ctx.sampleRate * dur)), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = ctx.createBufferSource(); s.buffer = b; var f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = q || 1; var t = ctx.currentTime + (when || 0); f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      var g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }
    function tone(f0, f1, dur, vol, type, when) { var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + (when || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02); }
    var S = {
      tick: function () { noise(.03, 5200, 3000, 8, .08); },
      lock: function () { noise(.05, 3600, 1800, 6, .16); tone(180, 90, .09, .12, 'triangle'); },
      slam: function () { tone(90, 42, .28, .32, 'sine'); noise(.14, 1400, 300, 1.2, .16, 'lowpass'); },
      whoosh: function () { noise(.28, 400, 2600, 1.4, .12); },
      hit1: function () { tone(120, 60, .16, .26, 'sine'); noise(.06, 2200, 700, 2, .12); },
      hit2: function () { tone(96, 44, .24, .4, 'sine'); noise(.1, 2600, 500, 1.6, .2); },
      hit3: function () { tone(70, 30, .5, .55, 'sine'); noise(.22, 3200, 300, 1.2, .3); tone(240, 90, .18, .16, 'square'); },
      block: function () { noise(.05, 4800, 2200, 8, .22); tone(520, 320, .09, .1, 'triangle'); },
      counter: function () { noise(.04, 5200, 2600, 10, .24); tone(880, 440, .12, .1, 'triangle'); tone(70, 40, .3, .3, 'sine', .02); },
      clash: function () { noise(.12, 4400, 900, 3, .26); tone(110, 50, .3, .34, 'sine'); },
      shield: function () { noise(.24, 900, 2600, 3, .1); tone(240, 340, .3, .07, 'triangle'); },
      scan: function () { noise(.5, 1200, 5200, 6, .06); tone(1400, 2200, .4, .04, 'sine'); },
      adapt: function () { tone(220, 330, .3, .08, 'triangle'); noise(.18, 700, 1400, 3, .08); },
      mirror: function () { tone(660, 660, .18, .06, 'triangle'); tone(660, 655, .3, .05, 'triangle', .06); },
      recover: function () { noise(.7, 2000, 350, 1, .08, 'lowpass'); tone(160, 120, .6, .05, 'sine'); },
      signature: function () { tone(60, 45, .7, .4, 'sine'); noise(.5, 300, 4000, 1.2, .12); tone(330, 330, .5, .05, 'triangle', .05); },
      seal: function () { noise(.04, 3000, 1800, 6, .18); tone(150, 100, .12, .18, 'triangle', .01); noise(.05, 2600, 1400, 6, .12, 'bandpass', .09); },
      victory: function () { tone(196, 196, 1.4, .16, 'sine'); tone(293.66, 293.66, 1.4, .12, 'sine', .04); },
      resume: function () { noise(.03, 3200, 2400, 6, .07); }
    };
    return function (name) {
      if (name === 'toggle') { if (!on) { if (!init()) return false; if (ctx.state === 'suspended') ctx.resume(); on = true; S.tick(); } else on = false; return on; }
      if (!on || !ctx || (stage.rt && stage.rt.fast)) return on; try { if (S[name]) S[name](); } catch (e) {} return on;
    };
  };
})();
