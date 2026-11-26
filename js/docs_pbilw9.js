/* Generated into /js/docs.js by web/docsgen/build.js — edit web/docsgen/assets/docs.js instead. */
(function () {
    'use strict';

    document.addEventListener('click', function (e) {
        var copy = e.target.closest ? e.target.closest('[data-copy]') : null;
        if (copy) {
            var code = copy.parentNode.querySelector('code');
            if (!code || !navigator.clipboard) return;
            navigator.clipboard.writeText(code.textContent).then(function () {
                var was = copy.textContent;
                copy.textContent = 'Copied';
                copy.classList.add('copied');
                setTimeout(function () { copy.textContent = was; copy.classList.remove('copied'); }, 1600);
            }).catch(function () { copy.textContent = 'Press Ctrl+C'; });
        }
    });

    /*
     * A contents list for the long chapters, built from the headings already on the page.
     *
     */
    var body = document.querySelector('.doc-body');
    var head = document.querySelector('.doc-head');
    var toc = null;

    function headings() {
        var out = [];
        Array.prototype.forEach.call(body.children, function (el) {
            if (el.tagName === 'H2' && el.id) { out.push(el); return; }
            // The API reference groups its 140 methods into <section class="api-family">, whose
            // h2 is a child of the section rather than of .doc-body. Without this the longest
            // page on the site was the one page with no contents list at all.
            //
            // The anchor id is on the SECTION, not the heading, so it is carried across in
            // data-anchor rather than copied onto the h2 — two elements sharing an id is invalid
            // and breaks getElementById for whichever one loses.
            if (el.classList && el.classList.contains('api-family')) {
                var fh = el.querySelector('h2');
                if (fh && el.id) { fh.setAttribute('data-anchor', el.id); out.push(fh); }
                return;
            }
            // A family page of the API reference: one <section class="api-method"> per entry, the
            // anchor on the section for the same reason as above.
            if (el.classList && el.classList.contains('api-method')) {
                var mh = el.querySelector('h3');
                if (mh && el.id) { mh.setAttribute('data-anchor', el.id); out.push(mh); }
                return;
            }
            if (!el.classList || !el.classList.contains('doc-step')) return;
            var hs = el.querySelectorAll('h3[id]');
            for (var i = 0; i < hs.length; i++) {
                // offsetParent is null for the variant CSS has hidden.
                if (hs.length === 1 || hs[i].offsetParent !== null) { out.push(hs[i]); return; }
            }
            if (hs.length) out.push(hs[0]);
        });
        // Headings inside the hand-written appendix are direct children too, but sit outside a step.
        Array.prototype.forEach.call(body.querySelectorAll(':scope > h3[id]'), function (h) {
            if (out.indexOf(h) === -1) out.push(h);
        });
        out.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
        return out;
    }

    /*
     * The list lives in the sticky right rail rather than in a box at the top of the article.
     *
     * As a box it scrolled away with everything else, so on a chapter 8,000 pixels tall it was
     * useful for the first screen and invisible for the remaining twelve — precisely when knowing
     * where you are matters most. In the rail it stays, and the current step is highlighted.
     */
    var rail = document.getElementById('docsRail');
    var links = [];
    var targets = [];

    function buildToc() {
        if (!body || !rail) return;
        var hs = headings();
        // A short chapter needs no map of itself.
        if (hs.length < 4) { rail.innerHTML = ''; links = []; targets = []; return; }
        var html = '<p class="docs-rail-title">On this page</p><ol>';
        hs.forEach(function (h) {
            var text = h.textContent.replace(/#$/, '').trim();
            // An API entry's heading also carries its kind badge; the rail wants only the name.
            var hc = h.parentNode && h.parentNode.classList && h.parentNode.classList.contains('api-method') ? h.querySelector('code') : null;
            if (hc) text = hc.textContent;
            if (h.querySelector('.step-n')) text = text.replace(/^\s*\d+\s*/, '');
            var id = h.getAttribute('data-anchor') || h.id;
            html += '<li class="lvl-' + h.tagName.toLowerCase() + '"><a href="#' + id + '">' + text + '</a></li>';
        });
        rail.innerHTML = html + '</ol>';
        targets = hs;
        links = Array.prototype.slice.call(rail.querySelectorAll('a'));
        markRailOverflow();
        spy();
    }

    /* The same "there is more below" edge the chapter list gets. The scroller is the rail's outer
       element, not the inner div the contents are written into. */
    var railBox = rail && rail.parentNode;
    function markRailOverflow() {
        if (!railBox) return;
        if (railBox.scrollHeight > railBox.clientHeight + 2) railBox.setAttribute('data-overflow', '');
        else railBox.removeAttribute('data-overflow');
    }
    if (railBox) {
        railBox.addEventListener('scroll', markRailOverflow, { passive: true });
        window.addEventListener('resize', markRailOverflow, { passive: true });
    }

    /*
     * Scroll-spy, computed from positions rather than IntersectionObserver.
     *
     * The steps here are far taller than the viewport, so "is it intersecting" is true for one
     * element most of the time and true for none of them while a long code block fills the screen
     * — which makes the highlight blink out exactly where the reader is. Asking instead which
     * heading is the last one above the reading line always has an answer.
     */
    function spy() {
        if (!links.length) return;
        // Pure viewport coordinates: "which heading is the last one above the reading line",
        // where the line is 140px down the screen. Deliberately NOT computed from window.scrollY
        // — that assumes the window is what scrolls, and it is not always (a wrapper with its own
        // overflow, an embedded pane, some in-app browsers). getBoundingClientRect is measured
        // against the viewport whatever the scroller is, so this cannot silently stick at step 1.
        var line = 140;
        var idx = 0;
        for (var i = 0; i < targets.length; i++) {
            if (targets[i].getBoundingClientRect().top <= line) idx = i;
            else break;
        }
        for (var j = 0; j < links.length; j++) links[j].classList.toggle('is-current', j === idx);
        var cur = links[idx];
        // Keep the highlighted entry in view when the rail itself is taller than the screen.
        if (cur && rail.scrollHeight > rail.clientHeight) {
            var r = cur.getBoundingClientRect(), rr = rail.getBoundingClientRect();
            if (r.top < rr.top || r.bottom > rr.bottom) cur.scrollIntoView({ block: 'nearest' });
        }
    }

    var ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { spy(); ticking = false; });
    }
    // Both, for the same reason the measurement is viewport-relative: a scroll inside a wrapper
    // does not reach window in the bubble phase, so window alone can miss it. Capture catches it
    // wherever it happens.
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });

    buildToc();

    /*
     * The API reference used to be one page with an anchor per method (/docs/api#m-vibrate), and
     * those links are out in the world. The methods now live on family pages; the index links to
     * every one of them, so an old anchor is forwarded to wherever its link points.
     */
    function forwardOldAnchor() {
        if (!/^#[ma]-[w-]+$/.test(location.hash) || document.getElementById(location.hash.slice(1))) return;
        var fwd = document.querySelector('.api-index a[href$="' + location.hash + '"]');
        if (fwd) location.replace(fwd.href);
    }
    forwardOldAnchor();
    window.addEventListener('hashchange', forwardOldAnchor);

    /* Filtering the API index: matches the method name, its signature and its family. */
    var apiFilter = document.getElementById('apiFilter');
    if (apiFilter) {
        var apiEmpty = document.getElementById('apiFilterEmpty');
        var fams = Array.prototype.slice.call(document.querySelectorAll('.api-index-family'));
        apiFilter.addEventListener('input', function () {
            var q = apiFilter.value.trim().toLowerCase();
            var hits = 0;
            fams.forEach(function (f) {
                var any = false;
                Array.prototype.forEach.call(f.querySelectorAll('li'), function (li) {
                    var match = !q || (li.getAttribute('data-kw') || '').indexOf(q) !== -1;
                    li.hidden = !match;
                    if (match) { any = true; hits++; }
                });
                f.hidden = !any;
            });
            if (apiEmpty) apiEmpty.hidden = !(q && hits === 0);
        });
    }

    /*
     * Filtering the chapter list.
     *
     * 47 chapters is more than anyone scans comfortably, and the reader usually arrives knowing a
     * word — "purchases", "push", "music" — rather than which of the eight sections owns it. The
     * filter matches chapter titles and opens whichever sections still have a hit, so typing turns
     * the whole list into just the matching handful.
     */
    var filter = document.getElementById('docsFilter');
    var side = document.getElementById('docsSide');
    if (filter && side) {
        var empty = document.getElementById('docsFilterEmpty');
        var groups = Array.prototype.slice.call(side.querySelectorAll('.docs-side-group'));
        // Remembered so clearing the box restores what the reader had open, rather than
        // collapsing everything including the section they are reading.
        var openBefore = groups.map(function (g) { return g.open; });

        filter.addEventListener('input', function () {
            var q = filter.value.trim().toLowerCase();
            var hits = 0;
            groups.forEach(function (g, i) {
                var any = false;
                Array.prototype.forEach.call(g.querySelectorAll('li'), function (li) {
                    // data-kw carries the title, the one-line summary and the slug, so the words a
                    // reader actually types find the chapter even when its title does not contain
                    // them. Falls back to the link text if the attribute is ever missing.
                    var hay = li.getAttribute('data-kw');
                    if (!hay) { var a = li.querySelector('a'); hay = a ? a.textContent.toLowerCase() : ''; }
                    var match = !q || hay.indexOf(q) !== -1;
                    li.hidden = !match;
                    if (match) { any = true; hits++; }
                });
                g.hidden = !any;
                g.open = q ? any : openBefore[i];
            });
            if (empty) empty.hidden = !(q && hits === 0);
        });
    }

    /*
     * Keep the chapter you are reading visible in the list, and say when the list runs past the
     * fold.
     *
     * Measured before this: on an 820px-tall viewport the sidebar had 716px of room and 753px of
     * content with only the current section open, so the list scrolled internally in the ordinary
     * case — and the highlighted chapter could sit below the visible slice with nothing to suggest
     * it was there. block:'nearest' moves the rail the minimum needed, so a chapter already in
     * view does not cause a pointless jump on every page load.
     */
    if (side) {
        var here = side.querySelector('a[aria-current="page"]');

        var markOverflow = function () {
            if (side.scrollHeight > side.clientHeight + 2) side.setAttribute('data-overflow', '');
            else side.removeAttribute('data-overflow');
        };

        /* Bring the current chapter back into the visible slice if it has left it. */
        var keepCurrentVisible = function () {
            if (!here || side.scrollHeight <= side.clientHeight + 2) return;
            var hr = here.getBoundingClientRect(), sr = side.getBoundingClientRect();
            if (hr.top < sr.top || hr.bottom > sr.bottom) here.scrollIntoView({ block: 'nearest' });
        };

        var sync = function () { markOverflow(); keepCurrentVisible(); };

        /*
         * Height changes come from three places and only one of them is a window resize: opening a
         * section, the fonts finishing loading, and the viewport. Measured with a window 'resize'
         * listener alone, a 768px window still reported no overflow while the list was 9px past
         * the fold — so the fade never appeared. A ResizeObserver on the list itself sees all
         * three, because every one of them ends in the list changing height.
         */
        if (typeof ResizeObserver === 'function') {
            new ResizeObserver(sync).observe(side.querySelector('.docs-side-inner') || side);
        } else {
            window.addEventListener('resize', sync, { passive: true });
        }

        /*
         * Re-run on every open/close, not only at load. With all eight sections expanded the list
         * stands at 1867px against ~670px of room, and the chapter being read was pushed clean out
         * of view — the reader expands a section to look around and loses their place in the one
         * element whose job is to hold it.
         */
        Array.prototype.forEach.call(side.querySelectorAll('.docs-side-group'), function (g) {
            g.addEventListener('toggle', sync);
        });

        side.addEventListener('scroll', markOverflow, { passive: true });
        sync();
    }

    /*
     * On a phone the chapter list is a disclosure, not a column above the article. Added here
     * rather than in the HTML so a reader with no JavaScript gets the plain expanded list, which
     * is long but entirely usable, instead of a button that does nothing.
     */
    if (side) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'docs-side-toggle';
        btn.textContent = 'Browse all chapters';
        btn.setAttribute('aria-expanded', 'false');
        side.insertBefore(btn, side.firstChild);
        btn.addEventListener('click', function () {
            var open = side.hasAttribute('data-open');
            if (open) side.removeAttribute('data-open');
            else side.setAttribute('data-open', '');
            btn.setAttribute('aria-expanded', String(!open));
        });
    }

    /*
     * Search the whole guide: chapters, every step, every API entry and its example text.
     *
     * The index (docs/search-index.json, written by build.js from the same HTML as the pages) is
     * fetched the first time a box gets focus, not on page load: most readers never search, and it
     * is a few hundred KB. Every word typed must match somewhere in a record; where it matches
     * decides the order (the name of an API or step first, then its signature, then the prose,
     * then identifiers in its example code). People type the thing they want, not our word for it,
     * so a few families of words stand in for each other: "fingerprint" finds authenticateBiometric.
     */
    var SYNONYMS = [
        ['fingerprint', 'biometric', 'faceid', 'touchid'],
        ['notification', 'notify', 'push'],
        ['ads', 'admob', 'advert', 'banner', 'interstitial', 'rewarded'],
        ['purchase', 'iap', 'billing', 'subscription', 'in-app'],
        ['qr', 'barcode', 'scancode', 'scanner'],
        ['gps', 'location', 'geolocation'],
        ['vibrate', 'vibration', 'haptic'],
        ['camera', 'photo', 'getusermedia'],
        ['microphone', 'mic', 'getusermedia'],
        ['login', 'signin', 'sign-in'],
        ['clipboard', 'copy', 'paste'],
        ['bluetooth', 'ble'],
        ['tts', 'speech', 'speak'],
        ['encrypt', 'keystore', 'encryption'],
        ['sms', 'composesms', 'sendsms'],
        ['download', 'savefile', 'saveblob', 'downloadfile']
    ];
    var SYN = {};
    SYNONYMS.forEach(function (g) { g.forEach(function (w) { SYN[w] = (SYN[w] || []).concat(g); }); });

    var index = null, loading = null;
    function loadIndex(url) {
        if (index) return Promise.resolve(index);
        if (!loading) {
            loading = fetch(url).then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            }).then(function (j) {
                index = j.r.map(function (r) {
                    r.lt = (r.t || '').toLowerCase();
                    r.ls = (r.s || '').toLowerCase();
                    r.lp = (r.p || '').toLowerCase();
                    r.lx = (r.x || '').toLowerCase();
                    r.lc = (r.c || '').toLowerCase();
                    return r;
                });
                return index;
            });
            loading.catch(function () { loading = null; });
        }
        return loading;
    }

    function escHtml(s) {
        return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }
    function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    /** A query word and the words that stand in for it; one or two letters match only at a word start. */
    function terms(q) {
        return q.toLowerCase().split(/[^\w$.-]+/).filter(Boolean).map(function (w) {
            var alts = [w];
            (SYN[w] || []).forEach(function (a) { if (alts.indexOf(a) === -1) alts.push(a); });
            return alts.map(function (a, i) {
                return { w: a, own: i === 0, re: a.length <= 2 ? new RegExp('(^|[^a-z0-9])' + escRe(a)) : null };
            });
        });
    }
    function has(hay, a) { return a.re ? a.re.test(hay) : hay.indexOf(a.w) !== -1; }

    function score(r, groups) {
        var total = 0;
        for (var i = 0; i < groups.length; i++) {
            var best = 0;
            for (var j = 0; j < groups[i].length; j++) {
                var a = groups[i][j], s = 0;
                if (r.lt === a.w) s = 100;
                else if (r.lt.indexOf(a.w) === 0 || r.lt.indexOf('.' + a.w) !== -1) s = 70;
                else if (has(r.lt, a)) s = 50;
                else if (has(r.ls, a)) s = 30;
                else if (has(r.lp, a)) s = 14;
                else if (has(r.lx, a)) s = 10;
                else if (has(r.lc, a)) s = 6;
                if (s && !a.own) s *= 0.85;
                if (s > best) best = s;
            }
            if (!best) return 0;
            total += best;
        }
        if (r.k === 'chapter') total += 8;
        else if (r.k === 'api') total += 12;
        return total;
    }

    function snippet(r, groups) {
        var text = r.x || r.s || '';
        var words = [];
        groups.forEach(function (g) { g.forEach(function (a) { if (a.w.length > 2) words.push(a.w); }); });
        var lower = text.toLowerCase(), at = -1;
        for (var i = 0; i < words.length && at === -1; i++) at = lower.indexOf(words[i]);
        var start = at > 60 ? text.lastIndexOf(' ', at - 50) + 1 : 0;
        var cut = text.slice(start, start + 180);
        if (start + 180 < text.length) cut = cut.replace(/\s+\S*$/, '') + '…';
        var html = escHtml((start ? '…' : '') + cut);
        if (words.length) html = html.replace(new RegExp('(' + words.map(function (w) { return escRe(escHtml(w)); }).join('|') + ')', 'gi'), '<mark>$1</mark>');
        return html;
    }

    var KIND = { chapter: 'Guide', step: 'Step', api: 'API' };

    Array.prototype.forEach.call(document.querySelectorAll('[data-docs-search]'), function (box, n) {
        var input = box.querySelector('input');
        var panel = box.querySelector('.docs-search-results');
        var url = box.getAttribute('data-index');
        var active = -1;
        panel.id = 'docsSearchResults' + n;
        input.setAttribute('aria-controls', panel.id);

        function close() {
            panel.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            active = -1;
        }
        function mark(i) {
            var items = panel.querySelectorAll('.docs-search-hit');
            if (!items.length) return;
            active = (i + items.length) % items.length;
            Array.prototype.forEach.call(items, function (el, k) { el.setAttribute('aria-selected', String(k === active)); });
            input.setAttribute('aria-activedescendant', items[active].id);
            items[active].scrollIntoView({ block: 'nearest' });
        }
        function render(q) {
            var groups = terms(q);
            if (!groups.length) { close(); return; }
            var hits = [];
            for (var i = 0; i < index.length; i++) {
                var s = score(index[i], groups);
                if (s) hits.push({ r: index[i], s: s });
            }
            hits.sort(function (a, b) { return b.s - a.s || a.r.t.length - b.r.t.length; });
            var total = hits.length;
            var shown = hits.slice(0, 40);
            active = -1;
            panel.innerHTML = total
                ? '<p class="docs-search-count">' + total + (total === 1 ? ' result' : ' results') + (total > shown.length ? ', best ' + shown.length + ' shown' : '') + '</p>' +
                  shown.map(function (h, k) {
                      var r = h.r;
                      return '<a class="docs-search-hit" role="option" aria-selected="false" id="' + panel.id + '-' + k + '" href="' + escHtml(r.u) + '">' +
                          '<span class="docs-search-kind docs-search-kind-' + r.k + '">' + KIND[r.k] + '</span>' +
                          '<span class="docs-search-title">' + (r.k === 'api' ? '<code>' + escHtml(r.t) + '</code>' : escHtml(r.t)) + '</span>' +
                          '<span class="docs-search-where">' + escHtml(r.p) + '</span>' +
                          '<span class="docs-search-snip">' + snippet(r, groups) + '</span></a>';
                  }).join('')
                : '<p class="docs-search-none">Nothing matches “' + escHtml(q) + '”. Try one shorter word, or browse the <a href="/docs/api">API reference</a>.</p>';
            panel.hidden = false;
            input.setAttribute('aria-expanded', 'true');
        }
        function run() {
            var q = input.value.trim();
            if (!q) { close(); return; }
            if (index) { render(q); return; }
            panel.innerHTML = '<p class="docs-search-count">Loading the search index…</p>';
            panel.hidden = false;
            loadIndex(url).then(function () { if (input.value.trim()) render(input.value.trim()); })
                .catch(function () {
                    panel.innerHTML = '<p class="docs-search-none">The search index did not load. Check your connection and type again.</p>';
                });
        }

        input.addEventListener('focus', function () { loadIndex(url).catch(function () {}); if (input.value.trim()) run(); });
        input.addEventListener('input', run);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); if (panel.hidden) run(); else mark(active + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); mark(active - 1); }
            else if (e.key === 'Enter') {
                var items = panel.querySelectorAll('.docs-search-hit');
                var pick = items[active >= 0 ? active : 0];
                if (pick) { e.preventDefault(); close(); location.href = pick.href; }
            } else if (e.key === 'Escape') { if (!panel.hidden) { e.preventDefault(); close(); } else input.blur(); }
        });
        // A result on the SAME page only changes the hash; close the panel so the target is visible.
        panel.addEventListener('click', function (e) { if (e.target.closest('.docs-search-hit')) close(); });
        document.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
    });

    // "/" focuses the search, as on most documentation sites, unless the reader is already typing.
    document.addEventListener('keydown', function (e) {
        if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        var first = document.querySelector('[data-docs-search] input');
        if (first) { e.preventDefault(); first.focus(); }
    });
})();
