/* DYADRYN rulebook — attribute radar */
(function () {
  'use strict';
  var DY = window.DY, host = DY.$('#radar'); if (!host) return;
  DY.radar(host, DY.ATTR, { label: 'Metis attributes', caption: 'Sample Mask · dashed ring = even 70' });
})();
