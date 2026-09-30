/* DYADRYN — small, honest charts: line + marker + dash so series never rely on colour alone */
(function () {
  'use strict';
  var DY = window.DY = window.DY || {};
  var NS = 'http://www.w3.org/2000/svg';
  /* series: [{name, cls, mk, values[]}], opts: {w,h,max,min,marks:[{x,label}], yLabel} */
  DY.lineChart = function (host, series, o) {
    o = o || {}; var W = o.w || 640, H = o.h || 260, pl = 40, pr = 14, pt = 16, pb = 30, max = o.max == null ? 100 : o.max, min = o.min || 0;
    var n = series[0].values.length, x = function (i) { return pl + (W - pl - pr) * (n <= 1 ? 0 : i / (n - 1)); }, y = function (v) { return pt + (H - pt - pb) * (1 - (v - min) / (max - min)); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (o.label || 'Chart') + '">';
    [0, .25, .5, .75, 1].forEach(function (t) { var v = min + (max - min) * t; s += '<line class="gd" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (pl - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v) + '</text>'; });
    var step = n > 16 ? 4 : 2; for (var i = 0; i < n; i += step) s += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + i + '</text>';
    s += '<line class="ax" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(min) + '" y2="' + y(min) + '"/>';
    (o.marks || []).forEach(function (m) { s += '<line class="gd" style="stroke:var(--line-3)" x1="' + x(m.x) + '" x2="' + x(m.x) + '" y1="' + pt + '" y2="' + y(min) + '"/><text x="' + (x(m.x) + (m.x / (n - 1) > .7 ? -6 : 6)) + '" y="' + (pt + 10) + '" text-anchor="' + (m.x / (n - 1) > .7 ? 'end' : 'start') + '" style="fill:var(--accent-text)">' + m.label + '</text>'; });
    series.forEach(function (se) {
      var d = se.values.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join('');
      s += '<path class="' + se.cls + '" d="' + d + '"/>';
      se.values.forEach(function (v, i) { if (i % (o.everyMark || 3) === 0 || i === n - 1) s += se.mk === 'c' ? '<circle class="ma" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3.5"/>' : '<rect class="mb" x="' + (x(i) - 3.5).toFixed(1) + '" y="' + (y(v) - 3.5).toFixed(1) + '" width="7" height="7"/>'; });
    });
    s += '</svg>';
    s += '<figcaption class="chart-legend">' + series.map(function (se) { return '<span><i class="' + (se.mk === 'c' ? '' : 'b') + '"></i>' + se.name + '</span>'; }).join('') + '<span>Vitality by round</span></figcaption>';
    host.innerHTML = s;
  };
})();
