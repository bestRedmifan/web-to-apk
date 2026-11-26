// ============ App Icon Resizer (Play icon, adaptive icon, mipmap set) ============
// Artwork is never stretched: it is made square by centre-crop or by padding with the background colour,
// then resampled with a step-down (halving) resize. The ZIP is written by zipStore (common.js).
(function () {
    const $ = id => document.getElementById(id);
    if (!$('icFile')) return;

    const DENSITIES = [
        { name: 'mdpi', f: 1 }, { name: 'hdpi', f: 1.5 }, { name: 'xhdpi', f: 2 }, { name: 'xxhdpi', f: 3 }, { name: 'xxxhdpi', f: 4 }
    ];
    const IOS = [
        { size: 1024, name: 'AppIcon-1024.png', label: 'App Store (iOS)' },
        { size: 180, name: 'AppIcon-60@3x.png', label: 'iPhone @3x' },
        { size: 167, name: 'AppIcon-83.5@2x.png', label: 'iPad Pro' },
        { size: 152, name: 'AppIcon-76@2x.png', label: 'iPad @2x' },
        { size: 120, name: 'AppIcon-60@2x.png', label: 'iPhone @2x' }
    ];
    const WEB = [
        { size: 512, name: 'icon-512.png', label: 'Web app 512' },
        { size: 192, name: 'icon-192.png', label: 'Web app 192' },
        { size: 180, name: 'apple-touch-icon.png', label: 'Apple touch icon' },
        { size: 32, name: 'favicon-32.png', label: 'Favicon 32' },
        { size: 16, name: 'favicon-16.png', label: 'Favicon 16' }
    ];
    const PLAY_MAX_BYTES = 1024 * 1024;

    let source = null;      // HTMLImageElement
    let master = null;      // 1024x1024 square canvas, opaque (bg under the artwork)
    let masterAlpha = null; // 1024x1024 square canvas, artwork only (transparency kept) for the foreground layer
    let playBlob = null;

    const fit = () => document.querySelector('input[name="icFit"]:checked').value;
    const bg = () => $('icBg').value;
    const fgDp = () => parseInt($('icFgScale').value, 10);

    function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }

    // step-down resample for quality
    function resample(src, size) {
        let cur = src, w = src.width, h = src.height;
        while (w / 2 >= size && h / 2 >= size) {
            const t = makeCanvas(Math.floor(w / 2), Math.floor(h / 2));
            const c = t.getContext('2d');
            c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
            c.drawImage(cur, 0, 0, t.width, t.height);
            cur = t; w = t.width; h = t.height;
        }
        const out = makeCanvas(size);
        const c = out.getContext('2d');
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
        c.drawImage(cur, 0, 0, size, size);
        return out;
    }

    function buildMasters() {
        const S = 1024;
        const iw = source.naturalWidth || source.width, ih = source.naturalHeight || source.height;
        // draw the source at high resolution first, so the square step is a crop/pad of real pixels
        const scaleUp = Math.max(1, S / Math.min(iw, ih));
        const srcW = Math.round(iw * Math.min(scaleUp, 4)), srcH = Math.round(ih * Math.min(scaleUp, 4));
        const src = makeCanvas(srcW, srcH);
        const sc = src.getContext('2d');
        sc.imageSmoothingEnabled = true; sc.imageSmoothingQuality = 'high';
        sc.drawImage(source, 0, 0, srcW, srcH);

        let sq;
        if (fit() === 'crop') {
            const side = Math.min(srcW, srcH);
            sq = makeCanvas(side);
            sq.getContext('2d').drawImage(src, (srcW - side) / 2, (srcH - side) / 2, side, side, 0, 0, side, side);
        } else {
            const side = Math.max(srcW, srcH);
            sq = makeCanvas(side);
            const c = sq.getContext('2d');
            c.fillStyle = bg(); c.fillRect(0, 0, side, side);
            c.drawImage(src, (side - srcW) / 2, (side - srcH) / 2);
        }
        masterAlpha = resample(sq, S);
        master = makeCanvas(S);
        const mc = master.getContext('2d');
        mc.fillStyle = bg(); mc.fillRect(0, 0, S, S);
        mc.drawImage(masterAlpha, 0, 0);
    }

    function icon(size) { return resample(master, size); }

    function roundIcon(size) {
        const c = makeCanvas(size), x = c.getContext('2d');
        x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); x.closePath(); x.clip();
        x.drawImage(icon(size), 0, 0);
        return c;
    }

    // foreground layer: 108 dp canvas, transparent, artwork centred at fgDp dp
    function foreground(px) {
        const c = makeCanvas(px), x = c.getContext('2d');
        const art = Math.round(px * fgDp() / 108);
        x.drawImage(resample(masterAlpha, art), Math.round((px - art) / 2), Math.round((px - art) / 2));
        return c;
    }

    function maskPath(x, kind, s) {
        x.beginPath();
        if (kind === 'circle') { x.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); }
        else if (kind === 'rounded') { toolRoundRectPath(x, 0, 0, s, s, s * 0.18); return; }
        else if (kind === 'squircle') {
            const n = 4, r = s / 2;
            for (let i = 0; i <= 360; i += 2) {
                const t = i * Math.PI / 180, ct = Math.cos(t), st = Math.sin(t);
                const px = r + r * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n), py = r + r * Math.sign(st) * Math.pow(Math.abs(st), 2 / n);
                i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
            }
        } else if (kind === 'teardrop') {
            const r = s / 2, k = s * 0.1;
            x.moveTo(r, 0); x.arcTo(s, 0, s, r, r); x.arcTo(s, s, r, s, k); x.arcTo(0, s, 0, r, r); x.arcTo(0, 0, r, 0, r);
        }
        x.closePath();
    }

    function drawMasks() {
        document.querySelectorAll('#icMasks canvas').forEach(cv => {
            const x = cv.getContext('2d'), s = cv.width, kind = cv.dataset.mask;
            x.clearRect(0, 0, s, s);
            if (kind === 'layers') {
                // whole 108 dp canvas
                const pxPerDp = s / 108;
                x.fillStyle = bg(); x.fillRect(0, 0, s, s);
                if (masterAlpha) x.drawImage(foreground(Math.round(s)), 0, 0, s, s);
                x.save();
                x.setLineDash([6, 5]); x.lineWidth = 2;
                x.strokeStyle = '#ef4444'; x.strokeRect((108 - 72) / 2 * pxPerDp, (108 - 72) / 2 * pxPerDp, 72 * pxPerDp, 72 * pxPerDp);
                x.strokeStyle = '#22c55e'; x.beginPath(); x.arc(s / 2, s / 2, 33 * pxPerDp, 0, Math.PI * 2); x.stroke();
                x.restore();
                return;
            }
            // launcher shows the central 72 dp of the 108 dp layers
            const layer = s * 108 / 72, off = (layer - s) / 2;
            x.save();
            maskPath(x, kind, s); x.clip();
            x.fillStyle = bg(); x.fillRect(0, 0, s, s);
            if (masterAlpha) x.drawImage(foreground(Math.round(layer)), -off, -off);
            if ($('icSafeGuide').checked) {
                x.setLineDash([5, 5]); x.lineWidth = 2; x.strokeStyle = 'rgba(34,197,94,0.95)';
                x.beginPath(); x.arc(s / 2, s / 2, s * 33 / 72, 0, Math.PI * 2); x.stroke();
            }
            x.restore();
        });
    }

    async function refresh() {
        drawMasks();
        if (!source) return;
        buildMasters();
        drawMasks();
        const play = $('icPlay');
        const pc = play.getContext('2d');
        pc.clearRect(0, 0, 512, 512);
        pc.drawImage(icon(512), 0, 0);
        playBlob = await canvasToBlob(play, 'image/png');
        const ok = playBlob.size <= PLAY_MAX_BYTES;
        $('icPlayInfo').innerHTML = `512 × 512 PNG, ${formatBytes(playBlob.size)} ` +
            (ok ? '<span class="pt-badge pt-ok">within the 1 MB limit</span>'
                : '<span class="pt-badge pt-error">over Play\'s 1 MB limit - use flatter artwork with fewer photo-like details</span>');
        $('icDownloadPlay').disabled = false;
        $('icDownloadZip').disabled = false;
        renderSizeGrid();
    }

    function renderSizeGrid() {
        const items = [{ c: icon(512), label: 'Google Play listing icon', dim: '512 × 512' }];
        DENSITIES.forEach(d => items.push({ c: icon(48 * d.f), label: `ic_launcher (${d.name})`, dim: `${48 * d.f} × ${48 * d.f}` }));
        DENSITIES.forEach(d => items.push({ c: foreground(108 * d.f), label: `foreground (${d.name})`, dim: `${108 * d.f} × ${108 * d.f}`, checker: true }));
        IOS.forEach(i => items.push({ c: icon(i.size), label: i.label, dim: `${i.size} × ${i.size}` }));
        WEB.forEach(i => items.push({ c: icon(i.size), label: i.label, dim: `${i.size} × ${i.size}` }));
        $('icSizes').innerHTML = items.map(it => `<figure class="pt-size-item"><img src="${it.c.toDataURL('image/png')}" alt="${escapeHtml(it.label)} ${it.dim}" class="${it.checker ? 'pt-checker' : ''}"><figcaption><strong>${escapeHtml(it.label)}</strong><span>${it.dim}</span></figcaption></figure>`).join('');
    }

    const hex = () => bg().toUpperCase();
    const adaptiveXml = () => `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

    async function buildZip() {
        const entries = [];
        const png = async c => blobBytes(await canvasToBlob(c, 'image/png'));
        for (const d of DENSITIES) {
            const dir = `android/res/mipmap-${d.name}/`;
            entries.push({ name: dir + 'ic_launcher.png', data: await png(icon(48 * d.f)) });
            entries.push({ name: dir + 'ic_launcher_round.png', data: await png(roundIcon(48 * d.f)) });
            entries.push({ name: dir + 'ic_launcher_foreground.png', data: await png(foreground(108 * d.f)) });
        }
        entries.push({ name: 'android/res/mipmap-anydpi-v26/ic_launcher.xml', data: adaptiveXml() });
        entries.push({ name: 'android/res/mipmap-anydpi-v26/ic_launcher_round.xml', data: adaptiveXml() });
        entries.push({ name: 'android/res/values/ic_launcher_background.xml', data: `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${hex()}</color>\n</resources>\n` });
        entries.push({ name: 'google-play/play-store-icon-512.png', data: await blobBytes(playBlob) });
        for (const i of IOS) entries.push({ name: 'ios/' + i.name, data: await blobBytes(await encodeRgbPng(icon(i.size), bg())) });
        for (const w of WEB) entries.push({ name: 'web/' + w.name, data: await png(icon(w.size)) });
        entries.push({ name: 'README.txt', data:
`App icon set
============

google-play/play-store-icon-512.png
  The Store listing > App icon upload: 512 x 512, 32-bit PNG, ${formatBytes(playBlob.size)} (limit 1 MB).

android/res/
  Copy the mipmap-* and values folders into app/src/main/res of your Android project.
  mipmap-<density>/ic_launcher.png, ic_launcher_round.png  - legacy launcher icons (48 dp)
  mipmap-<density>/ic_launcher_foreground.png              - adaptive foreground layer (108 dp,
                                                             artwork ${fgDp()} dp, safe zone 66 dp)
  mipmap-anydpi-v26/ic_launcher.xml, ic_launcher_round.xml - adaptive icon (Android 8+)
  values/ic_launcher_background.xml                        - background layer colour ${hex()}
  Reference it from AndroidManifest.xml:
    android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round"

ios/   App icon PNGs without an alpha channel (the App Store refuses alpha in the 1024 icon).
web/   Web app manifest icons, Apple touch icon and favicons.
` });
        return zipStore(entries);
    }

    let sourceName = '';
    function describe() {
        if (!source) return;
        const w = source.naturalWidth, h = source.naturalHeight;
        $('icSource').textContent = `${sourceName}: ${w} × ${h}` + (w !== h ? ` - not square, so it is ${fit() === 'crop' ? 'cropped to the centre square' : 'padded with the background colour'} (never stretched).` : '.') + (Math.min(w, h) < 512 ? ' Smaller than 512 px: it is upscaled and may look soft.' : '');
    }

    async function handle(file) {
        if (!file) return;
        try {
            source = await loadImageFile(file);
            sourceName = file.name || 'Artwork';
            describe();
            await refresh();
        } catch (err) {
            $('icSource').textContent = err.message;
        }
    }

    $('icFile').addEventListener('change', e => handle(e.target.files[0]));
    const drop = $('icDrop');
    ['dragenter', 'dragover'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) handle(f); });
    // re-run with the already-loaded image when the fit mode changes
    document.querySelectorAll('input[name="icFit"]').forEach(r => r.addEventListener('change', () => { describe(); refresh(); }));
    $('icBg').addEventListener('change', refresh);
    $('icBg').addEventListener('input', drawMasks);
    $('icFgScale').addEventListener('input', () => { $('icFgScaleOut').textContent = fgDp(); drawMasks(); });
    $('icFgScale').addEventListener('change', refresh);
    $('icSafeGuide').addEventListener('change', drawMasks);

    $('icDownloadPlay').addEventListener('click', () => { if (playBlob) downloadBlob(playBlob, 'play-store-icon-512.png'); });
    $('icDownloadZip').addEventListener('click', async () => {
        const st = $('icZipStatus');
        st.textContent = 'Building the ZIP...';
        try {
            const zip = await buildZip();
            downloadBlob(zip, 'app-icons.zip');
            st.textContent = `app-icons.zip saved (${formatBytes(zip.size)}).`;
        } catch (err) {
            st.textContent = 'Could not build the ZIP: ' + err.message;
        }
    });

    window.__iconTool = { buildZip, getPlayBlob: () => playBlob, load: handle };
    drawMasks();
})();
