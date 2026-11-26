(function(){
    const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.freewebtoapk';

    const promoHTML = `
        <div class="promo-content">
            <div class="promo-left">
                <strong>Get the AppMint Android App</strong>
                <div class="promo-features">Web to APK · AI App Builder · Document to APK · Audio to APK · Video to APK · Images to APK · Offline HTML to APK</div>
            </div>
            <div class="promo-right">
                <a class="promo-cta" href="${PLAY_STORE_URL}" target="_blank" rel="noopener noreferrer">Install Free on Google Play</a>
            </div>
        </div>
    `;

    const promoStyle = `
        /* ensure desktop navbar (z-index:1000) and overlays stay above the banner */
        #global-promo-banner { width:100%; box-sizing:border-box; margin-top:8px; position:relative; z-index:0; }
        .promo-banner, .promo-banner-inline, #global-promo-banner { font-family: Inter, Arial, sans-serif; }
        #global-promo-banner .promo-content {
            display:flex; align-items:center; justify-content:flex-start; gap:8px;
            background: linear-gradient(90deg,#0b1220,#132035);
            color:#E6F0FF; padding:6px 12px; border-radius:8px; margin:4px 0; box-shadow:0 6px 18px rgba(2,6,23,0.5);
        }
        /* Make left column flexible and prevent overflow */
        #global-promo-banner .promo-left { flex: 1 1 auto; min-width: 0; }
        #global-promo-banner .promo-left strong{ display:block; font-size:15px; }
        #global-promo-banner .promo-features{ font-size:13px; color:#B7C9E6; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        /* CTA stays fixed size on the right */
        #global-promo-banner .promo-right { flex: 0 0 auto; margin-left: 8px; }
        #global-promo-banner .promo-right .promo-cta{ background:#1DB954; color:#082018; padding:8px 12px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block; }

        /* Compact inline variant used near steppers */
        .promo-banner-inline { margin:6px 0; }
        .promo-banner-inline .promo-content { padding:4px 8px; border-radius:6px; gap:8px; }
        .promo-banner-inline .promo-left strong{ font-size:13px; }
        .promo-banner-inline .promo-features{ display:none; }
        .promo-banner-inline .promo-right .promo-cta{ padding:4px 8px; font-size:13px; }

        /* Mobile adjustments - keep banner compact and avoid long feature text */
        @media (max-width:720px){
            #global-promo-banner .promo-content{ flex-direction:row; align-items:center; }
            #global-promo-banner .promo-left .promo-features{ display:none; }
            #global-promo-banner .promo-left strong{ font-size:14px; }
            #global-promo-banner .promo-right{ display:flex; justify-content:flex-end; }
            /* A long button label (French "Installer gratuitement sur Google Play") wraps instead of
               pushing over the heading: the button column may shrink to at most 55% of the row. */
            #global-promo-banner .promo-right{ flex:0 1 auto; min-width:0; max-width:55%; }
            #global-promo-banner .promo-right .promo-cta{ white-space:normal; text-align:center; }
        }
        @media (max-width:420px){
            /* reduce large gap under hero on small screens and keep banner under menu */
            #global-promo-banner { padding:0 8px; margin-top:8px; }
            #global-promo-banner .promo-content{ padding:8px; gap:8px; }
            .promo-banner-inline .promo-left strong{ font-size:12px; }
            .promo-banner-inline .promo-right .promo-cta{ padding:6px 8px; font-size:12px; }
        }
    `;

    function insertPromo() {
        try {
            const navbar = document.querySelector('.navbar');
            if (navbar && !document.getElementById('global-promo-banner')) {
                const container = document.createElement('div');
                container.id = 'global-promo-banner';
                container.className = 'promo-banner';
                container.innerHTML = promoHTML;

                // Prefer inserting before the hero so the banner sits above the hero block
                const heroContainer = document.querySelector('.hero-container');
                if (heroContainer) {
                    heroContainer.parentNode.insertBefore(container, heroContainer);
                    container.style.position = 'relative';
                    container.style.zIndex = '10';
                    container.style.width = '100%';
                    container.style.marginBottom = '12px';
                    container.style.marginTop = '0px';
                } else {
                    const hero = document.querySelector('.hero, main, #hero');
                    if (hero && hero.parentNode) {
                        hero.parentNode.insertBefore(container, hero);
                    } else if (navbar && navbar.parentNode) {
                        navbar.parentNode.insertBefore(container, navbar.nextSibling);
                    }
                    try {
                        const navH = navbar ? (navbar.offsetHeight || 64) : 64;
                        container.style.marginTop = navH + 'px';
                    } catch (e) {
                        container.style.marginTop = '8px';
                    }
                }
            }

            document.querySelectorAll('.stepper-progress, .pwa-stepper').forEach(function(el){
                if (el.parentNode && !el.parentNode.querySelector('.promo-banner-inline')) {
                    const small = document.createElement('div');
                    small.className = 'promo-banner-inline';
                    small.innerHTML = promoHTML;
                    el.parentNode.insertBefore(small, el.nextSibling);
                }
            });
        } catch (e) {
            console.warn('Promo injection failed', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertPromo);
    } else {
        insertPromo();
    }

    if (!document.getElementById('promo-banner-style')) {
        const s = document.createElement('style');
        s.id = 'promo-banner-style';
        s.textContent = promoStyle;
        document.head.appendChild(s);
    }
})();
