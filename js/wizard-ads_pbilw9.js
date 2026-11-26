/* Wizard ad slots (generator/*.html: .wz-ad, AdSense units fwta-wizard-top / -bottom).
 * A slot is shown and filled only when ads-gate.js loaded the AdSense tag on this page — not for the
 * developer shield, paying users or Mediavine mode. css/generator.css hides a slot Google leaves unfilled.
 */
(function () {
  if (!document.querySelector('script[src*="adsbygoogle.js"]')) return;
  var slots = document.querySelectorAll(".wz-ad[hidden]");
  for (var i = 0; i < slots.length; i++) {
    slots[i].hidden = false;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { slots[i].hidden = true; }
  }
})();
