/* Ads gate for every freewebtoapk.com page (one shared file; same origin, so one flag covers all).
 *
 * Loads Google's AdSense tag and/or the Privacy & messaging (Offerwall) tag EXACTLY as the pages did
 * before — async, at the same spot in <head>, with no wait — for everyone, unless this browser holds
 * the "no ads" flag: localStorage "amAdFreeUntil" (a time, at most 24 hours ahead) that the AI Studio
 * writes after AppMint Cloud's GET /v1/me said this signed-in person pays (and removes when that
 * stops being true, or on sign-out). The flag only hides ads; it unlocks nothing else.
 *
 * Use, in place of the two tags:  <script src="/js/ads-gate.js?v=3" data-ads="adsense fc"></script>
 * data-ads lists which of the two tags that page had ("adsense", "fc"). Bump ?v= when this file
 * changes (/js/* is cached as immutable).
 *
 * Mediavine mode (admin panel "Website ads", 2026-10-14): functions/_middleware.js rewrites data-ads
 * to "none" so no Google tag loads, and puts the Mediavine script right after this one.
 */
(function () {
  var ADSENSE = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5416155719825820";
  var FC = "https://fundingchoicesmessages.google.com/i/pub-5416155719825820?ers=1";
  var DAY = 24 * 60 * 60 * 1000;
  var me = document.currentScript;
  var want = ((me && me.getAttribute("data-ads")) || "adsense fc").split(/\s+/);
  var until = 0;
  try { until = Number(localStorage.getItem("amAdFreeUntil")) || 0; } catch (e) { until = 0; }
  var now = Date.now();
  // A flag further out than a day was not written by the studio: it is ignored.
  var adFree = until > now && until - now <= DAY + 60000;
  var shield = false;
  // The owner's own browsers and test browsers (the home page's "developer shield", set by any
  // freewebtoapk.com page opened with ?dev=true): no ad requests from them, so no self-traffic.
  try {
    if (/[?&]dev=true\b/.test(location.search) || location.hostname === "localhost" || location.hostname === "127.0.0.1")
      localStorage.setItem("developer_shield", "true");
    if (localStorage.getItem("developer_shield") === "true") { adFree = true; shield = true; }
  } catch (e) {}
  // Mirrored into a cookie for functions/_middleware.js: in Mediavine mode the server writes the
  // Mediavine tag into the page itself and leaves it out for a browser carrying am_noads.
  try {
    document.cookie = adFree
      ? "am_noads=1; path=/; max-age=" + (shield ? 31536000 : 86400) + "; SameSite=Lax; Secure"
      : "am_noads=; path=/; max-age=0; SameSite=Lax; Secure";
  } catch (e) {}
  var loaded = false;

  function add(src, crossOrigin) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    if (crossOrigin) s.crossOrigin = "anonymous";
    (document.head || document.documentElement).appendChild(s);
  }
  function load() {
    if (loaded || shield) return; // the owner's shield always wins, even when the studio asks
    loaded = true;
    window.__amAds.adFree = false;
    document.documentElement.className = document.documentElement.className.replace(/\s*\bam-adfree\b/g, "");
    if (want.indexOf("adsense") >= 0) add(ADSENSE, true);
    if (want.indexOf("fc") >= 0) add(FC, false);
  }

  window.__amAds = { adFree: adFree, load: load, loaded: function () { return loaded; } };
  if (adFree) {
    // No ad script on this page: empty ad slots take no room.
    document.documentElement.className += " am-adfree";
    var st = document.createElement("style");
    st.textContent = ".am-adfree ins.adsbygoogle{display:none!important}";
    (document.head || document.documentElement).appendChild(st);
  } else {
    load();
  }
})();
