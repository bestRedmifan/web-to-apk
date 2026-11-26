/*
 * AppMint Help bubble (freewebtoapk.com only — never the sister sites).
 *
 * A floating "Help" button that opens a small chat with AppMint's AI support assistant
 * (POST /api/support/ai, source "web", served by the appmint-support worker on this domain).
 * Live chat with the team is in the AppMint app only: every answer carries that notice with the
 * Play link, and the panel footer says so permanently.
 *
 * Safety: the server's answer is TEXT. It is escaped first and only then given a tiny markdown-lite
 * shape (paragraphs, "- " bullets, numbered lines, `code`, **bold**, ```fenced``` blocks, https
 * links) — no HTML from the server is ever rendered. The conversation lives in sessionStorage only.
 */
(function () {
    'use strict';
    if (window.__appmintHelp) return;
    window.__appmintHelp = true;

    var HOST = location.hostname;
    if (/(^|\.)freewebtoapp\.com$|(^|\.)freewebsitetoapk\.com$/i.test(HOST)) return; // never on the sister sites
    var API = /(^|\.)freewebtoapk\.com$/i.test(HOST) ? '' : 'https://freewebtoapk.com';
    var PLAY = 'https://play.google.com/store/apps/details?id=com.freewebtoapk';
    var KEY = 'appmintHelp.v1';
    var MAX = 1500;

    var CSS = '' +
        '#amh-btn{position:fixed;right:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:8px;padding:12px 16px;border:0;border-radius:999px;cursor:pointer;' +
        'background:var(--primary,#C8F031);color:#0A0A0B;font:600 15px/1 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.45)}' +
        '#amh-btn:hover{filter:brightness(1.06)}#amh-btn:focus-visible{outline:3px solid var(--secondary,#22D3EE);outline-offset:2px}' +
        '#amh-btn svg{width:18px;height:18px}' +
        '#amh-panel{position:fixed;right:16px;bottom:16px;z-index:9999;width:min(390px,calc(100vw - 32px));height:min(600px,calc(100vh - 32px));height:min(600px,calc(100dvh - 32px));' +
        'display:none;flex-direction:column;background:var(--bg-card,#121214);color:var(--text-primary,#FAFAF9);border:1px solid var(--border-color,#232328);border-radius:16px;' +
        'box-shadow:0 16px 48px rgba(0,0,0,.65);font:14px/1.55 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden}' +
        '#amh-panel.open{display:flex}' +
        '#amh-panel *{box-sizing:border-box}' +
        '.amh-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border-color,#232328);background:var(--bg-dark,#0A0A0B)}' +
        '.amh-head b{flex:1;font-size:15px}.amh-head small{display:block;color:var(--text-secondary,#A1A1AA);font-weight:400;font-size:12px}' +
        '.amh-x{background:transparent;border:0;color:var(--text-secondary,#A1A1AA);font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px}.amh-x:hover{color:var(--text-primary,#FAFAF9);background:var(--bg-card-hover,#18181B)}' +
        '.amh-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}' +
        '.amh-m{max-width:92%;padding:10px 12px;border-radius:14px;word-wrap:break-word;overflow-wrap:anywhere}' +
        '.amh-u{align-self:flex-end;background:rgba(200,240,49,.14);border:1px solid rgba(200,240,49,.35);white-space:pre-wrap}' +
        '.amh-a{align-self:flex-start;background:var(--bg-input,#0E0E10);border:1px solid var(--border-color,#232328)}' +
        '.amh-a p{margin:0 0 8px}.amh-a p:last-child{margin-bottom:0}.amh-a ul,.amh-a ol{margin:0 0 8px;padding-left:20px}.amh-a ul{list-style:disc}.amh-a ol{list-style:decimal}.amh-a li{display:list-item;margin:2px 0}' +
        '.amh-a code{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:12.5px;background:rgba(255,255,255,.06);padding:1px 4px;border-radius:4px}' +
        '.amh-a pre{margin:0 0 8px;padding:10px;background:#000;border:1px solid var(--border-color,#232328);border-radius:8px;overflow-x:auto;max-width:100%}' +
        '.amh-a pre code{background:none;padding:0;font-size:12px;white-space:pre}' +
        '.amh-a a,.amh-foot a,.amh-note a{color:var(--secondary,#22D3EE)}' +
        '.amh-src{margin-top:8px;font-size:12px;color:var(--text-secondary,#A1A1AA)}.amh-src a{display:inline-block;margin-right:10px}' +
        '.amh-note{margin-top:8px;padding-top:8px;border-top:1px dashed var(--border-color,#232328);font-size:12px;color:var(--text-secondary,#A1A1AA)}' +
        '.amh-rate{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:var(--text-muted,#6B6B74)}' +
        '.amh-rate button{background:transparent;border:1px solid var(--border-color,#232328);color:var(--text-secondary,#A1A1AA);border-radius:8px;padding:2px 8px;cursor:pointer;font-size:14px}' +
        '.amh-rate button:hover:not(:disabled){border-color:var(--secondary,#22D3EE)}.amh-rate button:disabled{cursor:default;opacity:.45}.amh-rate button.on{opacity:1;border-color:var(--primary,#C8F031);color:var(--primary,#C8F031)}' +
        '.amh-err{align-self:flex-start;color:var(--error,#F87171);font-size:13px}' +
        '.amh-typing{align-self:flex-start;color:var(--text-secondary,#A1A1AA);font-size:13px}' +
        '.amh-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border-color,#232328);align-items:flex-end}' +
        '.amh-form textarea{flex:1;resize:none;min-height:40px;max-height:120px;background:var(--bg-input,#0E0E10);color:var(--text-primary,#FAFAF9);border:1px solid var(--border-color,#232328);border-radius:10px;padding:9px 11px;font:inherit;outline:none}' +
        '.amh-form textarea:focus{border-color:var(--secondary,#22D3EE)}' +
        '.amh-form button{background:var(--primary,#C8F031);color:#0A0A0B;border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}.amh-form button:disabled{opacity:.5;cursor:default}' +
        '.amh-foot{padding:8px 12px 10px;font-size:12px;color:var(--text-secondary,#A1A1AA);text-align:center;border-top:1px solid var(--border-light,#1A1A1F)}' +
        '.amh-count{font-size:11px;color:var(--text-muted,#6B6B74);text-align:right;padding:0 12px}' +
        '@media (max-width:480px){#amh-btn span{display:none}#amh-btn{padding:14px}}' +
        '@media (prefers-reduced-motion:no-preference){#amh-panel.open{animation:amh-in .16s ease-out}@keyframes amh-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}}';

    function el(tag, attrs, text) {
        var e = document.createElement(tag);
        if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
        if (text != null) e.textContent = text;
        return e;
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function safeUrl(u) { u = String(u || ''); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ''; }

    /* ---- markdown-lite over ESCAPED text ---- */
    function inline(s) {
        // s is already escaped. Code spans first, so ** inside code stays literal.
        var parts = s.split(/(`[^`\n]+`)/g);
        return parts.map(function (p) {
            if (/^`[^`\n]+`$/.test(p)) return '<code>' + p.slice(1, -1) + '</code>';
            return p
                .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
                .replace(/(^|[\s(])(https:\/\/[^\s<)]+[^\s<).,;:!?])/g, function (_, pre, url) {
                    return pre + '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
                });
        }).join('');
    }
    function renderText(text) {
        var src = String(text || '').replace(/\r\n?/g, '\n');
        var out = [];
        var re = /```[^\n`]*\n([\s\S]*?)(?:```|$)/g;
        var last = 0, m;
        while ((m = re.exec(src))) {
            out.push(renderBlocks(src.slice(last, m.index)));
            out.push('<pre><code>' + esc(m[1].replace(/\n$/, '')) + '</code></pre>');
            last = re.lastIndex;
        }
        out.push(renderBlocks(src.slice(last)));
        return out.join('');
    }
    function renderBlocks(chunk) {
        var html = [];
        chunk.split(/\n{2,}/).forEach(function (para) {
            var lines = para.split('\n').filter(function (l) { return l.trim() !== ''; });
            if (!lines.length) return;
            var i = 0;
            while (i < lines.length) {
                var bullet = /^\s*[-*•]\s+/, num = /^\s*\d+[.)]\s+/;
                if (bullet.test(lines[i]) || num.test(lines[i])) {
                    var ordered = num.test(lines[i]) && !bullet.test(lines[i]);
                    var rx = ordered ? num : bullet, items = [];
                    while (i < lines.length && rx.test(lines[i])) { items.push('<li>' + inline(esc(lines[i].replace(rx, ''))) + '</li>'); i++; }
                    html.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
                } else {
                    var p = [];
                    while (i < lines.length && !bullet.test(lines[i]) && !num.test(lines[i])) {
                        p.push(inline(esc(lines[i].replace(/^#{1,6}\s+/, '')))); i++;
                    }
                    html.push('<p>' + p.join('<br>') + '</p>');
                }
            }
        });
        return html.join('');
    }

    /* ---- state (sessionStorage only) ---- */
    var state = { open: false, items: [] };
    try { var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (saved && Array.isArray(saved.items)) state = saved; } catch (e) { /* storage blocked: start empty */ }
    function save() { try { sessionStorage.setItem(KEY, JSON.stringify({ open: state.open, items: state.items.slice(-40) })); } catch (e) { /* not persisted */ } }

    /* ---- DOM ---- */
    var style = el('style'); style.textContent = CSS;
    var btn = el('button', { id: 'amh-btn', type: 'button', 'aria-label': 'Open AppMint help', 'aria-expanded': 'false', 'aria-controls': 'amh-panel' });
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Help</span>';
    var panel = el('div', { id: 'amh-panel', role: 'dialog', 'aria-label': 'AppMint help' });
    panel.innerHTML =
        '<div class="amh-head"><b>AppMint Help<small>AI answers from the AppMint guides</small></b><button type="button" class="amh-x" aria-label="Close help">&times;</button></div>' +
        '<div class="amh-log" aria-live="polite"></div>' +
        '<form class="amh-form"><textarea rows="1" maxlength="' + MAX + '" placeholder="Ask about AppMint…" aria-label="Your question"></textarea><button type="submit">Send</button></form>' +
        '<div class="amh-count" aria-hidden="true"></div>' +
        '<div class="amh-foot">Live chat with our team is available in the AppMint app — <a href="' + PLAY + '" target="_blank" rel="noopener noreferrer">get it on Google Play</a></div>';
    var log = panel.querySelector('.amh-log');
    var form = panel.querySelector('.amh-form');
    var input = form.querySelector('textarea');
    var send = form.querySelector('button');
    var count = panel.querySelector('.amh-count');
    var busy = false;

    function scrollDown() { log.scrollTop = log.scrollHeight; }

    function noticeHtml(notice) {
        // The server's notice is plain text; escape it and link the Play URL only.
        return inline(esc(notice || ('Live chat with our team is available in the AppMint app only. Get it on Google Play: ' + PLAY)));
    }

    function renderItem(it, idx) {
        if (it.role === 'user') return el('div', { 'class': 'amh-m amh-u' }, it.text);
        if (it.role === 'error') return el('div', { 'class': 'amh-err', role: 'status' }, it.text);
        var box = el('div', { 'class': 'amh-m amh-a' });
        var html = renderText(it.answer);
        if (it.sources && it.sources.length) {
            html += '<div class="amh-src">Sources: ' + it.sources.map(function (s) {
                var u = safeUrl(s.url);
                return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>' : '<span>' + esc(s.title) + '</span>';
            }).join('') + '</div>';
        }
        if (it.suggestTeam) html += '<div class="amh-note">Our team can look at this with you in the AppMint app.</div>';
        if (it.notice) html += '<div class="amh-note">' + noticeHtml(it.notice) + '</div>';
        box.innerHTML = html;
        if (it.id) {
            var rate = el('div', { 'class': 'amh-rate' });
            rate.appendChild(el('span', null, it.rated == null ? 'Was this helpful?' : 'Thanks for the feedback'));
            [[true, '👍', 'Helpful'], [false, '👎', 'Not helpful']].forEach(function (b) {
                var x = el('button', { type: 'button', 'aria-label': b[2] }, b[1]);
                if (it.rated != null) { x.disabled = true; if (it.rated === b[0]) x.className = 'on'; }
                x.addEventListener('click', function () { rateAnswer(idx, b[0]); });
                rate.appendChild(x);
            });
            box.appendChild(rate);
        }
        return box;
    }

    function render() {
        log.innerHTML = '';
        if (!state.items.length) {
            var hello = el('div', { 'class': 'amh-m amh-a' });
            hello.innerHTML = '<p>Hi! Ask me anything about AppMint: turning a website, ZIP or HTML into an app, AdMob ads, in-app purchases, push notifications, the JavaScript bridge or publishing on Google Play.</p>' +
                '<div class="amh-note">' + noticeHtml('') + '</div>';
            log.appendChild(hello);
        }
        state.items.forEach(function (it, i) { log.appendChild(renderItem(it, i)); });
        if (busy) log.appendChild(el('div', { 'class': 'amh-typing' }, 'Looking through the AppMint guides…'));
        scrollDown();
    }

    function setOpen(open) {
        state.open = open;
        panel.classList.toggle('open', open);
        btn.style.display = open ? 'none' : '';
        btn.setAttribute('aria-expanded', String(open));
        save();
        if (open) { render(); setTimeout(function () { input.focus(); }, 30); } else btn.focus();
    }

    function rateAnswer(idx, helpful) {
        var it = state.items[idx];
        if (!it || it.rated != null) return;
        it.rated = helpful;
        save(); render();
        fetch(API + '/api/support/ai/feedback', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: it.id, helpful: helpful })
        }).catch(function () { /* the rating shows as given; a lost one only affects our stats */ });
    }

    function ask(q) {
        busy = true; send.disabled = true;
        state.items.push({ role: 'user', text: q });
        save(); render();
        // A language copy of the site (/hi/ ...) answers in that language; English pages carry no
        // data-site-lang, so they keep answering in the browser's language as before.
        var lang = (document.documentElement.getAttribute('data-site-lang') || navigator.language || 'en').slice(0, 16);
        fetch(API + '/api/support/ai', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: q, lang: lang, screen: 'web:' + location.pathname.slice(0, 100), source: 'web' })
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; });
        }).then(function (res) {
            var j = res.j || {};
            if (res.ok && typeof j.answer === 'string') {
                state.items.push({ role: 'ai', id: j.id, answer: j.answer, sources: Array.isArray(j.sources) ? j.sources : [], suggestTeam: !!j.suggestTeam, notice: j.notice || '', rated: null });
            } else {
                state.items.push({ role: 'error', text: j.message || (res.status === 429 ? 'Too many questions right now. Please wait a moment.' : 'The assistant could not answer right now. Please try again.') });
                if (j.notice) state.items.push({ role: 'ai', answer: '', notice: j.notice, sources: [] });
            }
        }).catch(function () {
            state.items.push({ role: 'error', text: 'Could not reach the assistant. Check your connection and try again.' });
        }).then(function () {
            busy = false; send.disabled = false;
            save(); render();
        });
    }

    function updateCount() {
        var n = input.value.length;
        count.textContent = n > MAX - 200 ? (n + ' / ' + MAX) : '';
        input.style.height = 'auto';
        input.style.height = Math.min(120, input.scrollHeight + 2) + 'px';
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = input.value.trim();
        if (!q || busy) return;
        if (q.length > MAX) q = q.slice(0, MAX);
        input.value = ''; updateCount();
        ask(q);
    });
    input.addEventListener('input', updateCount);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); }
    });
    btn.addEventListener('click', function () { setOpen(true); });
    panel.querySelector('.amh-x').addEventListener('click', function () { setOpen(false); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

    function mount() {
        document.head.appendChild(style);
        document.body.appendChild(btn);
        document.body.appendChild(panel);
        if (state.open) setOpen(true);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
