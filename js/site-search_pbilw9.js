/*
 * FreeWebToApk - Homescreen Site Search
 * Searches across Integration Guides, FAQs and Pricing content.
 * Self-contained: injects its own styles + markup into #siteSearch.
 * Uses relative URLs so it works across all domain mirrors.
 */
(function () {
    'use strict';

    // ---- Searchable content index ----------------------------------------
    // category controls the icon/label shown next to a result.
    var SEARCH_INDEX = [
        // ----- Integration Guides -----
        {
            category: 'guide',
            title: 'AdMob ads integration',
            snippet: 'Monetize your app with Google AdMob. In the generator open Advanced Options, enable AdMob, then enter your Publisher ID (pub-XXX) and Banner Ad Unit ID. Add app-ads.txt to your site for verification.',
            url: '/features#admob',
            keywords: 'admob ads monetize banner interstitial rewarded revenue publisher id ad unit app-ads.txt money earn'
        },
        {
            category: 'guide',
            title: 'Push notifications (OneSignal)',
            snippet: 'Create a free OneSignal account, add an Android app and copy your App ID. In the generator enable Push Notifications and paste the OneSignal App ID to re-engage users.',
            url: '/features#push-notifications',
            keywords: 'push notifications onesignal app id re-engage retention alerts messaging notify'
        },
        {
            category: 'guide',
            title: 'Free live chat integration (Tawk)',
            snippet: 'Add unlimited free live chat to your app powered by Tawk. Great for instant support and increasing user engagement.',
            url: '/features#live-chat',
            keywords: 'live chat tawk support customer service messaging help engagement free unlimited'
        },
        {
            category: 'guide',
            title: 'PWA Builder & offline support',
            snippet: 'Convert any website to a Progressive Web App with a TWA (Trusted Web Activity) APK. Get offline support via service worker, push notifications and Play Store-ready builds.',
            url: '/pwa-builder',
            keywords: 'pwa progressive web app twa trusted web activity offline service worker caching builder'
        },
        {
            category: 'guide',
            title: 'Custom app icon & splash screen',
            snippet: 'Upload a custom app icon and configure a splash screen in the generator. No design tools required — your branding is applied automatically.',
            url: '/generator/app-icon',
            keywords: 'custom icon splash screen branding logo image launcher generator design'
        },
        {
            category: 'guide',
            title: 'Publish your APK to Google Play Store',
            snippet: 'Set a custom package name (com.yourcompany.app), generate your APK, create a Google Play Developer account ($25 one-time) and upload. Your signing key is deterministic so updates use the same key.',
            url: '/playstore-checklist',
            keywords: 'publish google play store aab package name signing key developer account upload submit listing'
        },

        // ----- FAQs -----
        {
            category: 'faq',
            title: 'How do I convert my website to an Android app?',
            snippet: 'Enter your website URL in the generator, customize your app name and icon, then click Generate. Your APK is ready to download in about 2 seconds.',
            url: '/generator/website-url',
            keywords: 'convert website url android app apk generate create how to make build'
        },
        {
            category: 'faq',
            title: 'Is FreeWebToApk really free?',
            snippet: 'Yes. The APK and the Google Play AAB are free and unlimited, with all features, no signup and no watermark.',
            url: '/pricing',
            keywords: 'free cost price unlimited hidden fees premium really 100% no signup watermark'
        },
        {
            category: 'faq',
            title: 'What features are included?',
            snippet: 'All features are free: splash screen, push notifications (OneSignal), AdMob ads, side menu, social links, PIN lock, dark mode, file downloads and more. No hidden fees.',
            url: '/features',
            keywords: 'features included splash push admob side menu social pin lock dark mode downloads free'
        },
        {
            category: 'faq',
            title: 'What websites can I convert?',
            snippet: 'You can convert any website — WordPress, Wix, Shopify, Squarespace, HTML5 games, Blogger, Webflow and any other web URL.',
            url: '/features',
            keywords: 'websites convert wordpress wix shopify squarespace html5 game blogger webflow url any'
        },
        {
            category: 'faq',
            title: 'How fast is APK generation?',
            snippet: 'Super fast — APKs are generated in roughly 2 seconds thanks to our optimized build system, with no waiting.',
            url: '/',
            keywords: 'fast speed how long time 2 seconds quick generation build instant'
        },
        {
            category: 'faq',
            title: 'Can I publish the APK to Google Play Store?',
            snippet: 'Yes. Every build gives you an APK to install and test, and the AAB that Google Play asks for, free.',
            url: '/playstore-checklist',
            keywords: 'publish play store sideload aab submit google upload approve listing'
        },

        // ----- Pricing -----
        {
            category: 'pricing',
            title: 'Pricing — 100% free APK generation',
            snippet: 'Unlimited APKs and AABs with all features, free. No signup and no watermark.',
            url: '/pricing',
            keywords: 'pricing price free cost plan unlimited apk aab all features no watermark'
        },
        {
            category: 'pricing',
            title: 'AAB for Play Store — free with every build',
            snippet: 'Google Play asks for the Android App Bundle (AAB). Every build gives you one, free and unlimited.',
            url: '/pricing',
            keywords: 'aab android app bundle play store free price unlimited format google'
        },
        {
            category: 'pricing',
            title: 'PWA Builder — also free',
            snippet: 'Build a Progressive Web App with a signed APK and AAB for the Play Store, free.',
            url: '/pwa-builder',
            keywords: 'pwa builder free price progressive web app cost aab'
        }
    ];

    var CATEGORY_META = {
        guide:   { label: 'Integration Guide', icon: '🔌' }, // 🔌
        faq:     { label: 'FAQ',               icon: '❓' },       // ❓
        pricing: { label: 'Pricing',           icon: '💰' }  // 💰
    };

    // ---- Styles ----------------------------------------------------------
    var STYLES = [
        '.site-search{position:relative;max-width:680px;margin:0 auto 28px;width:100%;z-index:30}',
        '.site-search-box{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.97);border:1px solid rgba(99,102,241,0.25);border-radius:14px;padding:12px 16px;box-shadow:0 8px 30px rgba(0,0,0,0.18);transition:border-color .2s,box-shadow .2s}',
        '.site-search-box:focus-within{border-color:#6366F1;box-shadow:0 8px 36px rgba(99,102,241,0.35)}',
        '.site-search-icon{font-size:18px;line-height:1;opacity:.7}',
        '.site-search-input{flex:1;border:none;outline:none;background:transparent;font-size:16px;color:#1f2937;min-width:0}',
        '.site-search-input::placeholder{color:#9ca3af}',
        '.site-search-clear{border:none;background:transparent;cursor:pointer;font-size:18px;color:#9ca3af;line-height:1;padding:2px 4px;display:none}',
        '.site-search-clear:hover{color:#4b5563}',
        '.site-search.has-query .site-search-clear{display:block}',
        '.site-search-results{position:absolute;top:calc(100% + 8px);left:0;right:0;background:#fff;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,0.25);overflow:hidden;max-height:60vh;overflow-y:auto;display:none}',
        '.site-search.open .site-search-results{display:block}',
        '.site-search-hint{padding:10px 16px;font-size:12px;color:#9ca3af;border-bottom:1px solid #f1f1f4}',
        '.ss-result{display:block;padding:12px 16px;text-decoration:none;border-bottom:1px solid #f4f4f6;transition:background .12s}',
        '.ss-result:last-child{border-bottom:none}',
        '.ss-result:hover,.ss-result.active{background:#f5f5ff}',
        '.ss-result-head{display:flex;align-items:center;gap:8px;margin-bottom:3px}',
        '.ss-cat{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:#6366F1;background:rgba(99,102,241,0.1);padding:2px 8px;border-radius:20px;white-space:nowrap}',
        '.ss-title{font-size:15px;font-weight:600;color:#111827;margin:0}',
        '.ss-snippet{font-size:13px;color:#6b7280;margin:0;line-height:1.45}',
        '.ss-result mark{background:#fde68a;color:inherit;padding:0 1px;border-radius:2px}',
        '.ss-empty{padding:22px 16px;text-align:center;color:#6b7280;font-size:14px}',
        '@media (max-width:600px){.site-search-input{font-size:15px}.site-search-results{max-height:65vh}}'
    ].join('');

    // ---- Helpers ---------------------------------------------------------
    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function escapeRegExp(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlight(text, terms) {
        var out = escapeHtml(text);
        terms.forEach(function (t) {
            if (!t) return;
            var re = new RegExp('(' + escapeRegExp(t) + ')', 'gi');
            out = out.replace(re, '<mark>$1</mark>');
        });
        return out;
    }

    function scoreEntry(entry, terms) {
        var hayTitle = entry.title.toLowerCase();
        var haySnippet = entry.snippet.toLowerCase();
        var hayKeywords = (entry.keywords || '').toLowerCase();
        var score = 0;
        for (var i = 0; i < terms.length; i++) {
            var t = terms[i];
            if (!t) continue;
            var hit = 0;
            if (hayTitle.indexOf(t) !== -1) { score += 5; hit = 1; }
            if (hayKeywords.indexOf(t) !== -1) { score += 3; hit = 1; }
            if (haySnippet.indexOf(t) !== -1) { score += 1; hit = 1; }
            if (!hit) return 0; // every term must match somewhere
        }
        return score;
    }

    function search(query) {
        var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (!terms.length) return [];
        return SEARCH_INDEX
            .map(function (e) { return { entry: e, score: scoreEntry(e, terms) }; })
            .filter(function (r) { return r.score > 0; })
            .sort(function (a, b) { return b.score - a.score; })
            .slice(0, 8)
            .map(function (r) { return r.entry; });
    }

    // ---- Render ----------------------------------------------------------
    function init() {
        var mount = document.getElementById('siteSearch');
        if (!mount) return;

        var style = document.createElement('style');
        style.textContent = STYLES;
        document.head.appendChild(style);

        mount.classList.add('site-search');
        mount.innerHTML =
            '<div class="site-search-box">' +
                '<span class="site-search-icon" aria-hidden="true">🔍</span>' +
                '<input type="text" class="site-search-input" id="siteSearchInput" ' +
                    'placeholder="Search guides, FAQs & pricing…" ' +
                    'autocomplete="off" aria-label="Search guides, FAQs and pricing" ' +
                    'role="combobox" aria-expanded="false" aria-controls="siteSearchResults">' +
                '<button type="button" class="site-search-clear" id="siteSearchClear" aria-label="Clear search">×</button>' +
            '</div>' +
            '<div class="site-search-results" id="siteSearchResults" role="listbox"></div>';

        var input = mount.querySelector('#siteSearchInput');
        var clearBtn = mount.querySelector('#siteSearchClear');
        var results = mount.querySelector('#siteSearchResults');
        var activeIndex = -1;
        var current = [];

        function close() {
            mount.classList.remove('open');
            input.setAttribute('aria-expanded', 'false');
            activeIndex = -1;
        }

        function open() {
            mount.classList.add('open');
            input.setAttribute('aria-expanded', 'true');
        }

        function render(query) {
            var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
            current = search(query);
            activeIndex = -1;

            if (!query.trim()) {
                results.innerHTML = '';
                close();
                return;
            }

            if (!current.length) {
                results.innerHTML = '<div class="ss-empty">No results for “' +
                    escapeHtml(query) + '”. Try AdMob, push, pricing or PWA.</div>';
                open();
                return;
            }

            var html = '<div class="site-search-hint">' + current.length +
                ' result' + (current.length > 1 ? 's' : '') + '</div>';
            current.forEach(function (e, i) {
                var meta = CATEGORY_META[e.category] || { label: '', icon: '' };
                html +=
                    '<a class="ss-result" href="' + e.url + '" role="option" data-index="' + i + '">' +
                        '<div class="ss-result-head">' +
                            '<span class="ss-cat">' + meta.icon + ' ' + meta.label + '</span>' +
                            '<span class="ss-title">' + highlight(e.title, terms) + '</span>' +
                        '</div>' +
                        '<p class="ss-snippet">' + highlight(e.snippet, terms) + '</p>' +
                    '</a>';
            });
            results.innerHTML = html;
            open();
        }

        function setActive(idx) {
            var nodes = results.querySelectorAll('.ss-result');
            if (!nodes.length) return;
            if (idx < 0) idx = nodes.length - 1;
            if (idx >= nodes.length) idx = 0;
            nodes.forEach(function (n) { n.classList.remove('active'); });
            nodes[idx].classList.add('active');
            nodes[idx].scrollIntoView({ block: 'nearest' });
            activeIndex = idx;
        }

        input.addEventListener('input', function () {
            mount.classList.toggle('has-query', !!input.value);
            render(input.value);
        });

        input.addEventListener('focus', function () {
            if (input.value.trim()) render(input.value);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
            else if (e.key === 'Enter') {
                var nodes = results.querySelectorAll('.ss-result');
                if (activeIndex >= 0 && nodes[activeIndex]) {
                    window.location.href = nodes[activeIndex].getAttribute('href');
                } else if (nodes.length) {
                    window.location.href = nodes[0].getAttribute('href');
                }
            } else if (e.key === 'Escape') {
                close();
                input.blur();
            }
        });

        clearBtn.addEventListener('click', function () {
            input.value = '';
            mount.classList.remove('has-query');
            render('');
            input.focus();
        });

        document.addEventListener('click', function (e) {
            if (!mount.contains(e.target)) close();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
