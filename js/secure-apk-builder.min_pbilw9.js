/**
 * @license SecureAPKBuilder v3.0
 * Copyright (c) 2026 SmartrixLabs. All rights reserved.
 *
 * The page's half of an app build. Since 2026-09-29 the APK and the AAB are assembled and signed on
 * our server (/api/build): the template, the manifest rules, the asset encryption and the signing key
 * never reach the browser. This file only renders the artwork (the launcher icon set and the splash
 * image need a canvas), collects the creator's files and receives the result.
 *
 * Same interface as before for every wizard: buildAPK(config, iconBlob, progress) builds BOTH files in
 * one request and returns the APK; buildAAB(...) then returns the AAB from that same build.
 */
(function (w) {
    // ───────────────────────────── Artwork: launcher icon + splash image ─────────────────────────
    // The SAME output the AppMint phone app's ApkBuilder produces (IconGenerator.kt,
    // SplashWindowBgPatcher.kt). Before 2026-09-28 the website wrote only circle-clipped
    // ic_launcher.png / ic_launcher_round.png, but the template's launcher icon is ADAPTIVE
    // (mipmap-anydpi-v26/ic_launcher.xml -> @mipmap/ic_launcher_fg + @color/ic_launcher_bg), so
    // every Android 8+ phone showed the template's placeholder foreground; and the splash logo
    // was collected but never packaged, so the built app showed only colour + app name.

    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('The image could not be decoded. Use a PNG or JPG.'));
        img.src = src;
    });
    const loadImageFromBlob = async (blob) => {
        const url = URL.createObjectURL(blob);
        try { return await loadImage(url); } finally { URL.revokeObjectURL(url); }
    };
    const makeCanvas = (w, h) => {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        return { canvas, ctx };
    };
    const canvasPng = async (canvas) => {
        const blob = await new Promise((resolve, reject) =>
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG encoding failed')), 'image/png'));
        return new Uint8Array(await blob.arrayBuffer());
    };

    // Parses #RRGGBB / #AARRGGBB the way the template does (Color.parseColor, alpha dropped for
    // a window background). Anything else -> opaque black, exactly like SplashWindowBgPatcher.
    const parseOpaqueColor = (hex) => {
        const h = String(hex || '').trim().replace(/^#/, '');
        if (h.length !== 6 && h.length !== 8) return 0xFF000000 >>> 0;
        const n = parseInt(h, 16);
        if (Number.isNaN(n)) return 0xFF000000 >>> 0;
        return (0xFF000000 | (n & 0xFFFFFF)) >>> 0;
    };
    const argbToCss = (argb) => '#' + (argb & 0xFFFFFF).toString(16).padStart(6, '0');

    // The compiled colour the OS paints as the very first cold-start frame (@color/splash_window_bg):
    // the app's own splash colour, or black when the splash is off — the same rule as
    // SplashWindowBgPatcher.windowBackgroundColor, and the same value buildConfig writes as
    // splashBgColor so the launch is one continuous colour.
    const windowBackgroundArgb = (appConfig) =>
        appConfig.enableSplash ? parseOpaqueColor(appConfig.splashBgColor) : (0xFF000000 >>> 0);

    // Legacy launcher icon sizes (pre-Android-8 launchers draw these as-is, full-bleed).
    const LEGACY_ICON_SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    // Adaptive icon layer sizes: the 108dp canvas per density (IconGenerator.adaptiveSizes).
    const ADAPTIVE_ICON_SIZES = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
    // Fraction of the 108dp adaptive canvas guaranteed visible under every launcher mask.
    const ADAPTIVE_SAFE_FRACTION = 66 / 108;

    // Every launcher PNG the template carries, keyed by its path under res/:
    //   ic_launcher.png       the icon square, resized (never circle-clipped)
    //   ic_launcher_round.png the icon circle-clipped
    //   ic_launcher_fg.png    adaptive foreground: artwork FIT (never cropped, aspect kept) into the
    //                         centred 66/108 safe box on a transparent canvas
    // Mirrors IconGenerator.generatePng / generateRoundPng / generateAdaptiveForeground.
    const renderLauncherIcons = async (img) => {
        const out = {};
        for (const [density, size] of Object.entries(LEGACY_ICON_SIZES)) {
            const sq = makeCanvas(size, size);
            sq.ctx.drawImage(img, 0, 0, size, size);
            out[`mipmap-${density}-v4/ic_launcher.png`] = await canvasPng(sq.canvas);

            const rd = makeCanvas(size, size);
            rd.ctx.beginPath();
            rd.ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            rd.ctx.closePath();
            rd.ctx.clip();
            rd.ctx.drawImage(img, 0, 0, size, size);
            out[`mipmap-${density}-v4/ic_launcher_round.png`] = await canvasPng(rd.canvas);
        }
        for (const [density, size] of Object.entries(ADAPTIVE_ICON_SIZES)) {
            const fg = makeCanvas(size, size);
            const box = Math.max(1, Math.floor(size * ADAPTIVE_SAFE_FRACTION));
            const scale = Math.min(box / img.width, box / img.height);
            const w = Math.max(1, Math.floor(img.width * scale));
            const h = Math.max(1, Math.floor(img.height * scale));
            const left = Math.floor((size - w) / 2);
            const top = Math.floor((size - h) / 2);
            fg.ctx.drawImage(img, left, top, w, h);
            out[`mipmap-${density}-v4/ic_launcher_fg.png`] = await canvasPng(fg.canvas);
        }
        return out;
    };

    // Status-bar notification glyph (drawable/ic_stat_push), 24dp per density. Android draws small
    // icons from their alpha channel only, so this is the artwork's WHITE silhouette, or the app's
    // initial when the artwork is an opaque square (no shape to show). Mirrors
    // IconGenerator.generateNotificationIcon. Before 2026-11-25 website apps kept the template's
    // generic placeholder in the status bar (support report: "a generic icon instead of the logo").
    const NOTIFICATION_ICON_SIZES = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
    const renderNotificationIcons = async (img, appName) => {
        const out = {};
        for (const [density, size] of Object.entries(NOTIFICATION_ICON_SIZES)) {
            const { canvas, ctx } = makeCanvas(size, size);
            const box = Math.max(1, Math.floor(size * 20 / 24));
            const scale = Math.min(box / img.width, box / img.height);
            const w = Math.max(1, Math.floor(img.width * scale));
            const h = Math.max(1, Math.floor(img.height * scale));
            const art = makeCanvas(w, h);
            art.ctx.drawImage(img, 0, 0, w, h);
            const data = art.ctx.getImageData(0, 0, w, h);
            const px = data.data;
            let opaque = 0;
            for (let i = 3; i < px.length; i += 4) if (px[i] > 40) opaque++;
            if (opaque / (w * h) < 0.92) {
                for (let i = 0; i < px.length; i += 4) { px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; }
                art.ctx.putImageData(data, 0, 0);
                ctx.drawImage(art.canvas, Math.floor((size - w) / 2), Math.floor((size - h) / 2));
            } else {
                const letter = (String(appName || '').trim().charAt(0) || 'A').toUpperCase();
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold ' + Math.round(size * 0.72) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(letter, size / 2, size / 2);
            }
            out[`drawable-${density}-v4/ic_stat_push.png`] = await canvasPng(canvas);
        }
        return out;
    };

    // Adaptive icon background layer (@color/ic_launcher_bg): the mean colour of the artwork's own
    // one-pixel border ring, so a full-bleed icon melts into the launcher's mask with no seam.
    // Pixels with alpha < 128 are skipped; when every edge pixel is transparent (a logo floating on
    // nothing) there is no "own" colour to melt into and [fallbackArgb] (the splash colour) is used.
    // Mirrors IconGenerator.adaptiveBackgroundColor.
    const adaptiveBackgroundArgb = (img, fallbackArgb) => {
        // Sampling only needs the border, so the artwork is read at most 1024px wide: the ring of
        // a 4134px source read at full size would allocate a 68 MB canvas for 16K samples.
        const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const { canvas, ctx } = makeCanvas(w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data;
        let r = 0, g = 0, b = 0, n = 0;
        const add = (x, y) => {
            const i = (y * w + x) * 4;
            if (px[i + 3] < 128) return;
            r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
        };
        for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
        for (let y = 0; y < h; y++) { add(0, y); add(w - 1, y); }
        if (n === 0) return fallbackArgb;
        const avg = v => Math.floor(v / n) & 0xFF;
        return (0xFF000000 | (avg(r) << 16) | (avg(g) << 8) | avg(b)) >>> 0;
    };

    // The template's own launcher artwork when the creator picked none: the same blue "W" the
    // website has always drawn, now used by BOTH the APK and the AAB path (the AAB used to keep
    // the template's placeholder icon in that case).
    const defaultIconBlob = async () => {
        const { canvas, ctx } = makeCanvas(512, 512);
        ctx.fillStyle = '#6366F1';
        ctx.beginPath();
        const radius = 72;
        ctx.moveTo(radius, 0);
        ctx.lineTo(512 - radius, 0);
        ctx.quadraticCurveTo(512, 0, 512, radius);
        ctx.lineTo(512, 512 - radius);
        ctx.quadraticCurveTo(512, 512, 512 - radius, 512);
        ctx.lineTo(radius, 512);
        ctx.quadraticCurveTo(0, 512, 0, 512 - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 320px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('W', 256, 256);
        return new Blob([await canvasPng(canvas)], { type: 'image/png' });
    };

    // Splash image (assets/splash_image.png, PLAINTEXT — SplashActivity opens it with
    // BitmapFactory, it is not an ENCF asset). ONE 1080x1920 transparent PNG reproducing the
    // site's own splash preview: the logo fitted into a box no larger than 560x560, the app name
    // below it in splashTextColor, the block placed per splashLogoPosition. The template draws it
    // FIT_CENTER (splashScaleMode "fit") over splashBgColor and hides its own app-name text, so
    // the built app shows exactly what the preview showed. The creator's upload is always
    // re-rendered here — a 4134x4134 PNG shipped raw would decode to 68 MB on the phone.
    // Android TV launcher banner (android:banner, 320x180): TvBannerGenerator.kt — the icon on the
    // left, the app name on the right in white or near-black, over the icon's adaptive background
    // colour. Rendered only for a build with "Android TV" on; the server puts it in the template's
    // drawable/appmint_tv_banner slot of BOTH the APK and the AAB.
    const TV_W = 320, TV_H = 180;
    const renderTvBanner = async (img, bgArgb, appName) => {
        const { canvas, ctx } = makeCanvas(TV_W, TV_H);
        const r = (bgArgb >>> 16) & 0xFF, g = (bgArgb >>> 8) & 0xFF, b = bgArgb & 0xFF;
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(0, 0, TV_W, TV_H);
        const iconSize = 112, top = (TV_H - iconSize) / 2;
        ctx.drawImage(img, 20, top, iconSize, iconSize);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        ctx.fillStyle = lum > 0.6 ? '#111111' : '#FFFFFF';
        ctx.textBaseline = 'alphabetic';
        const left = 20 + iconSize + 16, room = TV_W - left - 14;
        const text = String(appName || '').trim() || 'App';
        let size = 26;
        const font = () => { ctx.font = 'bold ' + size + 'px sans-serif'; };
        const lay = () => {
            const out = []; let cur = '';
            for (const w of text.split(/\s+/)) {
                const next = cur ? cur + ' ' + w : w;
                if (ctx.measureText(next).width <= room || !cur) cur = next; else { out.push(cur); cur = w; }
            }
            if (cur) out.push(cur);
            return out;
        };
        font();
        let lines = lay();
        if (lines.length > 3 || lines.some(l => ctx.measureText(l).width > room)) { size = 20; font(); lines = lay(); }
        if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] += '\u2026'; }
        lines = lines.map(l => { let x = l; while (x.length > 1 && ctx.measureText(x).width > room) x = x.slice(0, -2) + '\u2026'; return x; });
        const lineH = size * 1.17;
        let y = (TV_H - lineH * lines.length) / 2 + size * 0.93;
        for (const l of lines) { ctx.fillText(l, left, y); y += lineH; }
        return canvasPng(canvas);
    };

    // The creator's own TV banner (creator request 2026-10-27: the made-up one "does not look good"):
    // drawn to exactly 320x180, cropped to fill like the launcher does, so any size or ratio works.
    const fitTvBanner = async (blob) => {
        const img = await loadImageFromBlob(blob);
        const { canvas, ctx } = makeCanvas(TV_W, TV_H);
        const s = Math.max(TV_W / img.width, TV_H / img.height);
        const w = img.width * s, h = img.height * s;
        ctx.drawImage(img, (TV_W - w) / 2, (TV_H - h) / 2, w, h);
        return canvasPng(canvas);
    };

    const SPLASH_W = 1080, SPLASH_H = 1920;
    const composeSplashImage = async (cfg) => {
        if (!cfg.splashLogoData || cfg.enableSplash === false) return null;
        const logo = await loadImage(cfg.splashLogoData);
        const { canvas, ctx } = makeCanvas(SPLASH_W, SPLASH_H);

        const box = 560;
        const scale = Math.min(box / logo.width, box / logo.height);
        const lw = Math.max(1, Math.round(logo.width * scale));
        const lh = Math.max(1, Math.round(logo.height * scale));

        // "Show the app name on the splash" off: the logo alone (the template hides its own name too,
        // appNamePosition "none").
        const name = cfg.showSplashAppName === false ? '' : String(cfg.appName || 'My App');
        const gap = name ? 48 : 0;
        let fontPx = 64;
        ctx.font = `500 ${fontPx}px sans-serif`;
        // Long names shrink to fit the width the template gives its own name view (edge padding
        // of 60px each side), never below 40px.
        const maxTextW = SPLASH_W - 120;
        while (fontPx > 40 && ctx.measureText(name).width > maxTextW) {
            fontPx -= 2;
            ctx.font = `500 ${fontPx}px sans-serif`;
        }
        const lineH = name ? Math.round(fontPx * 1.25) : 0;
        const blockH = lh + gap + lineH;

        const pos = cfg.splashLogoPosition;
        const blockTop = pos === 'top' ? Math.round(SPLASH_H * 0.15)
            : pos === 'bottom' ? Math.round(SPLASH_H * 0.85) - blockH
            : Math.round((SPLASH_H - blockH) / 2);

        ctx.drawImage(logo, Math.round((SPLASH_W - lw) / 2), blockTop, lw, lh);
        if (!name) return canvasPng(canvas);
        ctx.fillStyle = argbToCss(parseOpaqueColor(cfg.splashTextColor || '#FFFFFF'));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.39)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.fillText(name, SPLASH_W / 2, blockTop + lh + gap + lineH / 2, maxTextW);
        return canvasPng(canvas);
    };

    // First frame of the splash video (the phone's SplashVideoAsset.posterJpeg): shown while the
    // decoder starts, and its average colour becomes the launch window's colour, so the cold start
    // never flashes a colour the video does not have.
    const videoPoster = (blob) => new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
        const fail = () => { URL.revokeObjectURL(url); reject(new Error('This browser could not read the splash video. Use an MP4 (H.264) video.')); };
        v.onerror = fail;
        v.onloadeddata = () => { try { v.currentTime = 0.01; } catch (_) { fail(); } };
        v.onseeked = async () => {
            try {
                const longest = Math.max(v.videoWidth, v.videoHeight) || 1;
                const scale = Math.min(1, 1280 / longest);
                const { canvas, ctx } = makeCanvas(Math.max(1, Math.round(v.videoWidth * scale)), Math.max(1, Math.round(v.videoHeight * scale)));
                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let r = 0, g = 0, b = 0, n = 0;
                for (let i = 0; i < px.length; i += 16) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
                const avg = n ? ((0xFF000000 | ((r / n & 0xFF) << 16) | ((g / n & 0xFF) << 8) | (b / n & 0xFF)) >>> 0) : null;
                const jpeg = await new Promise((res, rej) => canvas.toBlob(x => x ? res(x) : rej(new Error('Poster encoding failed')), 'image/jpeg', 0.85));
                URL.revokeObjectURL(url);
                resolve({ jpeg, argb: avg });
            } catch (e) { URL.revokeObjectURL(url); reject(e); }
        };
    });

    const asBlob = (x, type) => x instanceof Blob ? x : new Blob([x], { type: type || 'application/octet-stream' });

    // The creator's files. The freewebtoapk.com wizard hands them over as config.__files; the other
    // wizards pass the bundled site as config.webFiles.
    const collectFiles = (config) => {
        const f = config.__files || {};
        return {
            web: f.web || config.webFiles || [],
            splashVideo: f.splashVideo || null, music: f.music || null, errorImage: f.errorImage || null,
            tvBanner: f.tvBanner || null,
            googleServices: f.googleServices || null,
            documents: f.documents || [], gallery: f.gallery || [], audio: f.audio || [], video: f.video || []
        };
    };

    const stripForServer = (config) => {
        const out = {};
        for (const [k, v] of Object.entries(config)) {
            if (k === '__files' || k === 'webFiles' || k === 'iconData' || k === 'splashLogoData' || k === 'googleServicesJson') continue;
            out[k] = v;
        }
        return out;
    };

    // The server streams the APK and the AAB while it builds them, so the response has no
    // Content-Length and the browser cannot say how much is left. Before 2026-11-04 the bar then held
    // one value for the whole download ("39%" on the download page) — 18 MB for a plain Website app,
    // minutes on mobile data — and 21 people in 10 days asked support why it was stuck. Now the
    // megabytes received are shown and the bar keeps moving toward the end of its range; a build that
    // sends nothing for STALL_MS is stopped with an error instead of waiting forever.
    const STALL_MS = 90000;
    const send = (form, progress) => new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let stall = null, over = false;
        const settle = (fn) => (v) => { if (over) return; over = true; clearTimeout(stall); fn(v); };
        const ok = settle(resolve), fail = settle(reject);
        const arm = () => {
            clearTimeout(stall);
            stall = setTimeout(() => { fail(new Error('The build stopped responding for 90 seconds. Check your connection and try again.')); xhr.abort(); }, STALL_MS);
        };
        xhr.open('POST', '/api/build');
        xhr.responseType = 'arraybuffer';
        xhr.upload.onprogress = (e) => { arm(); if (e.lengthComputable) progress?.('Uploading your app files...', 10 + Math.round(40 * e.loaded / e.total)); };
        xhr.upload.onload = () => { arm(); progress?.('Building and signing your APK and AAB...', 55); };
        xhr.onprogress = (e) => {
            arm();
            if (e.lengthComputable && e.total) { progress?.('Downloading your app...', 60 + Math.round(35 * e.loaded / e.total)); return; }
            const mb = e.loaded / 1048576;
            // Unknown total: approaches 94 (a typical app's APK + AAB is 15-25 MB) and never stops moving.
            progress?.('Downloading your app... ' + mb.toFixed(1) + ' MB', 60 + Math.round(34 * (1 - Math.exp(-mb / 8))));
        };
        xhr.onerror = () => fail(new Error('Could not reach the build service. Check your connection and try again.'));
        xhr.onload = () => ok(xhr);
        arm();
        xhr.send(form);
    });

    const readErr = (bytes) => {
        try { return JSON.parse(new TextDecoder().decode(bytes)).error; } catch (_) { return null; }
    };

    let last = null;   // { config, apk, aab, cert }

    const buildKey = async (config, iconBlob) => JSON.stringify(stripForServer(config)) + '|' + (iconBlob ? iconBlob.size + ':' + iconBlob.type : '-') +
        '|' + (config.__files ? Object.keys(config.__files).map(k => k + ':' + (config.__files[k] ? (config.__files[k].size || config.__files[k].length || 1) : 0)).join(',') : '') +
        '|' + ((config.webFiles || []).length);

    const build = async (config, iconBlob, progress) => {
        if (!config || !config.appName) throw new Error('App name required');
        progress?.('Preparing your icon and splash screen...', 5);
        const files = collectFiles(config);
        const img = await loadImageFromBlob(iconBlob || await defaultIconBlob());
        let windowBg = windowBackgroundArgb({ enableSplash: config.enableSplash !== false, splashBgColor: config.splashBgColor || '#0A0F1C' });
        let poster = null;
        if (files.splashVideo && config.enableSplash !== false) {
            poster = await videoPoster(asBlob(files.splashVideo, 'video/mp4'));
            if (poster.argb !== null) windowBg = poster.argb;
        }
        const icons = { ...await renderLauncherIcons(img), ...await renderNotificationIcons(img, config.appName) };
        const iconBg = adaptiveBackgroundArgb(img, windowBg);
        const splashPng = files.splashVideo ? null : await composeSplashImage(config);
        const tvBanner = !config.enableAndroidTv ? null
            : files.tvBanner ? await fitTvBanner(asBlob(files.tvBanner, 'image/png'))
            : await renderTvBanner(img, iconBg, config.appName);

        const form = new FormData();
        form.append('config', JSON.stringify(stripForServer(config)));
        form.append('art', JSON.stringify({ windowBg, iconBg }));
        for (const [p, bytes] of Object.entries(icons)) form.append('icon:' + p, new Blob([bytes], { type: 'image/png' }));
        if (splashPng) form.append('splash', new Blob([splashPng], { type: 'image/png' }));
        if (tvBanner) form.append('tvBanner', new Blob([tvBanner], { type: 'image/png' }));
        if (files.splashVideo) form.append('splashVideo', asBlob(files.splashVideo, 'video/mp4'));
        if (poster) form.append('splashPoster', poster.jpeg);
        if (files.music) form.append('music', asBlob(files.music, 'audio/mpeg'));
        if (files.errorImage) form.append('errorImage', asBlob(files.errorImage, 'image/png'));
        if (files.googleServices) form.append('googleServices', asBlob(files.googleServices, 'application/json'));
        for (const wf of files.web) form.append('web:' + wf.path, asBlob(wf.data));
        for (const [kind, list] of [['doc', files.documents], ['gallery', files.gallery], ['audio', files.audio], ['video', files.video]]) {
            for (const m of list) form.append(kind + ':' + m.name, asBlob(m.data));
        }

        const xhr = await send(form, progress);
        const body = new Uint8Array(xhr.response || new ArrayBuffer(0));
        if (xhr.status !== 200) throw new Error(readErr(body) || ('The build service answered HTTP ' + xhr.status + '. Please try again.'));
        const tag = new TextDecoder().decode(body.subarray(0, 4));
        if (tag !== 'AMB1') throw new Error(readErr(body.subarray(4)) || 'The build failed. Please try again.');
        const u32 = (o) => (body[o] | (body[o + 1] << 8) | (body[o + 2] << 16) | (body[o + 3] << 24)) >>> 0;
        const apkLen = u32(4);
        const apk = body.subarray(8, 8 + apkLen);
        const at = 8 + apkLen;
        if (new TextDecoder().decode(body.subarray(at, at + 4)) === '\u0000ERR') throw new Error(readErr(body.subarray(at + 4)) || 'The AAB build failed.');
        const aabLen = u32(at);
        const aab = body.subarray(at + 4, at + 4 + aabLen);
        if (apk.length !== apkLen || aab.length !== aabLen || !aabLen) throw new Error('The download was cut off. Please try again.');
        last = {
            config, key: await buildKey(config, iconBlob),
            apk: new Blob([apk], { type: 'application/vnd.android.package-archive' }),
            aab: new Blob([aab], { type: 'application/octet-stream' }),
            cert: { sha256: xhr.getResponseHeader('X-Cert-Sha256'), sha1: xhr.getResponseHeader('X-Cert-Sha1'), pkg: xhr.getResponseHeader('X-Package') }
        };
        progress?.('Complete!', 100);
        return last;
    };

    const buildAPK = async (config, iconBlob, progress) => {
        const r = await build(config, iconBlob, progress);
        return { blob: r.apk, signingKey: { algorithm: 'RSA-2048', scheme: 'v1+v2', verified: true } };
    };
    const buildAAB = async (config, iconBlob, progress) => {
        // The same settings as the APK just built -> that build's AAB. Compared by content: the PWA
        // Builder makes a fresh config object for each call, which used to cost a second full build.
        const r = (last && (last.config === config || last.key === await buildKey(config, iconBlob))) ? last : await build(config, iconBlob, progress);
        progress?.('AAB complete!', 100);
        return { blob: r.aab, signingKey: { algorithm: 'RSA-2048', scheme: 'jar-v1', verified: true } };
    };
    const getSigningKeyInfo = async () => last ? {
        certificate: null, privateKey: null, fingerprint: last.cert.sha256, sha1: last.cert.sha1,
        packageName: last.cert.pkg, algorithm: 'RSA-2048', scheme: 'v2'
    } : null;

    w.SecureAPKBuilder = {
        init: async () => true,
        buildAPK, buildAAB, getSigningKeyInfo,
        loadTemplate: async () => true,
        getSigningKey: () => ({ algorithm: 'RSA-2048', scheme: 'v2', verified: true })
    };
})(window);
