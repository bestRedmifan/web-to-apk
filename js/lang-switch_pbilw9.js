/*
 * Language switch (web/i18n). Every page that exists in other languages lists them in <head> as
 * <link rel="alternate" hreflang="..">, written by web/i18n/publish.mjs (English pages) and
 * web/i18n/build.mjs (language copies). This draws one link per language into the desktop nav
 * and the mobile menu. Names come from the browser (Intl.DisplayNames, each in its own
 * language), so this file holds no words and a new language needs no change here.
 */
(function () {
    var links = [].slice.call(document.querySelectorAll('link[rel="alternate"][hreflang]')).filter(function (l) { return l.getAttribute('hreflang') !== 'x-default'; });
    if (links.length < 2) return;
    var here = (document.documentElement.getAttribute('data-site-lang') || 'en').toLowerCase();
    function nameOf(code) {
        try { var n = new Intl.DisplayNames([code], { type: 'language' }).of(code); return n.charAt(0).toLocaleUpperCase(code) + n.slice(1); }
        catch (e) { return code.toUpperCase(); }
    }
    function build() {
        var box = document.createElement('div');
        box.className = 'lang-switch';
        box.setAttribute('translate', 'no');
        links.forEach(function (l) {
            var code = l.getAttribute('hreflang'), a = document.createElement('a');
            a.href = new URL(l.href).pathname + location.search + location.hash;
            a.hreflang = code;
            a.lang = code;
            a.textContent = nameOf(code);
            if (code.toLowerCase() === here) a.setAttribute('aria-current', 'true');
            box.appendChild(a);
        });
        return box;
    }
    var style = document.createElement('style');
    style.textContent = '.lang-switch{display:flex;align-items:center;gap:2px;font-size:13px}' +
        '.lang-switch a{padding:4px 8px;border-radius:8px;color:var(--text-secondary,#A1A1AA);text-decoration:none;white-space:nowrap}' +
        '.lang-switch a:hover{color:var(--text-primary,#fff)}' +
        '.lang-switch a[aria-current]{color:var(--text-primary,#fff);background:rgba(255,255,255,.08)}' +
        '.mobile-menu .lang-switch{justify-content:center;margin:12px 0;font-size:15px}' +
        // shown in the nav row only where the row has room for it (fits() below); the footer and
        // the mobile menu always have it
        '.nav-actions .lang-switch.no-room{display:none}' +
        '.footer-bottom .lang-switch{justify-content:center;flex-wrap:wrap}';
    document.head.appendChild(style);
    function place() {
        var desk = document.querySelector('.nav-actions');
        if (desk) {
            var sw = desk.insertBefore(build(), desk.firstChild);
            var row = desk.parentNode;
            // the nav row's last visible item must end inside the row, with the switch shown
            var fits = function () {
                sw.classList.remove('no-room');
                var right = row.getBoundingClientRect().right, last = 0;
                [].forEach.call(row.querySelectorAll('.nav-links > *, .nav-actions > *'), function (e) {
                    var r = e.getBoundingClientRect();
                    if (r.width) last = Math.max(last, r.right);
                });
                if (last > right + 0.5) sw.classList.add('no-room');
            };
            fits();
            var t;
            window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fits, 120); });
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(fits);
        }
        var mob = document.querySelector('.mobile-menu-cta') || document.querySelector('.mobile-menu-links');
        if (mob) mob.parentNode.insertBefore(build(), mob.classList.contains('mobile-menu-cta') ? mob : mob.nextSibling);
        var foot = document.querySelector('.footer-bottom');
        if (foot) foot.appendChild(build());
        if (!desk && !mob && !foot) {
            var host = document.querySelector('header, nav') || document.body;
            host.insertBefore(build(), host.firstChild);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();
})();
