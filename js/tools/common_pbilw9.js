// Wait for html2canvas to be fully loaded
window.html2canvasReady = false;
// Shared drag-and-drop helper used by every upload area (icon, mockup, banner…).
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Only tools that export via html2canvas load it; on the others the flag simply stays false.
window.addEventListener('load', () => {
    window.html2canvasReady = typeof html2canvas !== 'undefined';
});


// ============ Mobile Menu ============
function openMobileMenu() {
    document.getElementById('mobileMenu').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    document.getElementById('mobileMenu').classList.remove('active');
    document.body.style.overflow = '';
}


// ============ Shared export helpers (feature graphic, icon, QR, checklist) ============
// Real encoders, no library: a 24-bit PNG writer (canvas.toBlob('image/png') always writes RGBA, which
// Google Play refuses for the feature graphic and screenshots), a STORE-only ZIP writer and CRC-32.

const TOOL_CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();

function toolCrc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = TOOL_CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function toolAdler32(bytes) {
    let a = 1, b = 0;
    for (let i = 0; i < bytes.length; i += 5552) {
        const end = Math.min(i + 5552, bytes.length);
        for (let j = i; j < end; j++) { a += bytes[j]; b += a; }
        a %= 65521; b %= 65521;
    }
    return ((b << 16) | a) >>> 0;
}

// A zlib stream (RFC 1950). CompressionStream('deflate') produces exactly that. A browser without
// CompressionStream gets stored (uncompressed) deflate blocks, which is equally valid zlib: the PNG is
// byte-for-byte correct, only larger.
async function toolZlib(bytes) {
    if (typeof CompressionStream === 'function') {
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    const blocks = Math.max(1, Math.ceil(bytes.length / 65535));
    const out = new Uint8Array(2 + bytes.length + blocks * 5 + 4);
    out[0] = 0x78; out[1] = 0x01;
    let o = 2;
    for (let i = 0; i < blocks; i++) {
        const start = i * 65535, len = Math.min(65535, bytes.length - start);
        out[o++] = i === blocks - 1 ? 1 : 0;
        out[o++] = len & 0xFF; out[o++] = len >>> 8;
        out[o++] = ~len & 0xFF; out[o++] = (~len >>> 8) & 0xFF;
        out.set(bytes.subarray(start, start + len), o); o += len;
    }
    const ad = toolAdler32(bytes);
    out[o++] = ad >>> 24; out[o++] = (ad >>> 16) & 0xFF; out[o++] = (ad >>> 8) & 0xFF; out[o++] = ad & 0xFF;
    return out;
}

// A true 24-bit PNG (colour type 2, no alpha channel). Transparent pixels are composited onto `matte`.
async function encodeRgbPng(canvas, matte) {
    const w = canvas.width, h = canvas.height;
    const flat = document.createElement('canvas');
    flat.width = w; flat.height = h;
    const fctx = flat.getContext('2d');
    fctx.fillStyle = matte || '#ffffff';
    fctx.fillRect(0, 0, w, h);
    fctx.drawImage(canvas, 0, 0);
    const rgba = fctx.getImageData(0, 0, w, h).data;
    const stride = w * 3;
    const raw = new Uint8Array((stride + 1) * h);
    for (let y = 0; y < h; y++) {
        const row = y * (stride + 1);
        raw[row] = 1; // PNG filter type 1 (Sub): compresses gradients well
        for (let x = 0; x < w; x++) {
            const s = (y * w + x) * 4, d = row + 1 + x * 3;
            if (x === 0) {
                raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2];
            } else {
                raw[d] = (rgba[s] - rgba[s - 4]) & 0xFF;
                raw[d + 1] = (rgba[s + 1] - rgba[s - 3]) & 0xFF;
                raw[d + 2] = (rgba[s + 2] - rgba[s - 2]) & 0xFF;
            }
        }
    }
    const idat = await toolZlib(raw);
    const chunk = (type, data) => {
        const out = new Uint8Array(12 + data.length);
        const dv = new DataView(out.buffer);
        dv.setUint32(0, data.length);
        for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
        out.set(data, 8);
        dv.setUint32(8 + data.length, toolCrc32(out.subarray(4, 8 + data.length)));
        return out;
    };
    const ihdr = new Uint8Array(13);
    const hv = new DataView(ihdr.buffer);
    hv.setUint32(0, w); hv.setUint32(4, h);
    ihdr[8] = 8; ihdr[9] = 2; // 8 bits per channel, colour type 2 = RGB
    const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    return new Blob([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))], { type: 'image/png' });
}

// STORE-only ZIP (the PNGs inside are already compressed). entries: [{ name: 'res/x.png', data: Uint8Array | string }]
function zipStore(entries) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    const d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const e of entries) {
        const name = enc.encode(e.name);
        const data = typeof e.data === 'string' ? enc.encode(e.data) : e.data;
        const crc = toolCrc32(data);
        const local = new Uint8Array(30 + name.length);
        const lv = new DataView(local.buffer);
        lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true);
        lv.setUint16(8, 0, true); lv.setUint16(10, dosTime, true); lv.setUint16(12, dosDate, true);
        lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
        lv.setUint16(26, name.length, true);
        local.set(name, 30);
        const cen = new Uint8Array(46 + name.length);
        const cv = new DataView(cen.buffer);
        cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
        cv.setUint16(12, dosTime, true); cv.setUint16(14, dosDate, true);
        cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
        cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
        cen.set(name, 46);
        parts.push(local, data);
        central.push(cen);
        offset += local.length + data.length;
    }
    const cenSize = central.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
    ev.setUint32(12, cenSize, true); ev.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), type, quality));
}

async function blobBytes(blob) {
    return new Uint8Array(await blob.arrayBuffer());
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function formatBytes(n) {
    return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file could not be read as an image.')); };
        img.src = url;
    });
}

function toolRoundRectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
