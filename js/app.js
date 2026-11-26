// =====================================================
// FreeWebToApk - Main JavaScript
// =====================================================

// =====================================================
// Temporary Mobile Blocker & App Redirect
// Blocks mobile web users and redirects to Play Store
// (Does NOT block users already inside the WebToApk Android App)
// =====================================================
(function(){
    const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.freewebtoapk';

    function isMobile() {
        const ua = navigator.userAgent;
        
        // SEO PROTECTION: If the user is a known Search Engine Bot, DO NOT block.
        // This ensures Google keeps indexing your content normally.
        const isBot = /Googlebot|bingbot|yandex|baiduspider|Slurp|duckduckgo|ia_archiver/i.test(ua);
        if (isBot) return false;

        if (navigator.userAgentData && typeof navigator.userAgentData.mobile !== 'undefined') {
            return !!navigator.userAgentData.mobile;
        }
        return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua)
            || (window.matchMedia && window.matchMedia('(max-width:767px)').matches);
    }

    // CRITICAL SEO-SAFE AUTOMATION SETTINGS
    const BLOCK_DAY = -1; // disabled (-1 never matches); was a Monday mobile blocker — removed for AdSense compliance
    const today = new Date();
    const isBlockDay = (BLOCK_DAY === null || today.getDay() === BLOCK_DAY);

    // Automation: If it's not the block day, don't show the blocker
    if (!isBlockDay) {
        console.log("Not a block day - Site access granted");
        return;
    }

    // CRITICAL: If the website is opened INSIDE our Android App, DO NOT block it.
    // We check for the 'WebToApk' JavaScript bridge we injected in WebViewActivity.kt
    if (window.WebToApk || (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.WebToApk)) {
        console.log("Internal App Session Detected - Skipping Mobile Blocker");
        return;
    }

    if (!isMobile()) return; // Desktop users are not blocked

    // Set a global flag so other scripts (like the promo popup) know to stay hidden
    window.isMobileBlocked = true;

    // Hide all existing popups/modals to prevent UI clutter behind the blocker
    const hideSelectors = ['.modal', '.popup', '#popup', '.overlay', '.app-popup', '.modal-backdrop', '.site-popup', '.promo-popup', '.promo-popup-overlay'];
    const hideStyle = document.createElement('style');
    hideStyle.id = 'mobile-popup-hider';
    // Use !important to override any JS-applied styles, and pointer-events:none to prevent interaction
    hideStyle.textContent = hideSelectors.map(s => `${s}{display:none !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}`).join(' ');
    document.head.appendChild(hideStyle);

    // Hard block: Prevent scrolling behind the blocker
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Show the blocker overlay
    function showBlockerOverlay() {
        // Only show if not already present
        if (document.getElementById('mobile-hard-blocker')) return;

        const overlay = document.createElement('div');
        overlay.id = 'mobile-hard-blocker';
        overlay.innerHTML = `
            <div class="blocker-content">
                <div class="blocker-icon">⚠️</div>
                <h2>Service Temporary Not Available</h2>
                <p>This service is temporarily unavailable on mobile for maintenance today. Kindly use our Android app for the best experience.</p>
                <div class="play-store-section">
                    <p><strong>Install Android app from Play Store:</strong></p>
                    <a href="${PLAY_STORE_URL}" target="_blank" rel="noopener noreferrer" class="play-button">
                        <img src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png" alt="Get it on Google Play">
                    </a>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #mobile-hard-blocker {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #0A0F1C;
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
                color: white;
                font-family: 'Inter', sans-serif;
            }
            .blocker-content {
                background: #161C2D;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 20px;
                padding: 40px 24px;
                text-align: center;
                width: 100%;
                max-width: 400px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            }
            .blocker-icon {
                font-size: 60px;
                margin-bottom: 20px;
            }
            .blocker-content h2 {
                font-size: 24px;
                margin-bottom: 16px;
                color: #FFFFFF;
                line-height: 1.3;
            }
            .blocker-content p {
                font-size: 16px;
                color: #94A3B8;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .play-store-section {
                border-top: 1px solid rgba(255,255,255,0.1);
                padding-top: 24px;
            }
            .play-store-section p {
                font-size: 14px;
                color: #CBD5E1;
                margin-bottom: 12px;
            }
            .play-button img {
                height: 60px;
                transition: transform 0.2s;
            }
            .play-button:hover img {
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }

    // Run as early as possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showBlockerOverlay);
    } else {
        showBlockerOverlay();
    }
})();

// =====================================================
// Stepper Next Button Countdown Timer
// Disables Next button for 5 seconds to ensure page loads
// =====================================================
(function() {
    // Only run on generator stepper pages
    if (!window.location.pathname.includes('/generator/')) return;
    // Skip first step (users need to type) and download page (no Next button)
    if (window.location.pathname.includes('website-url')) return;
    if (window.location.pathname.includes('download-apk')) return;
    
    document.addEventListener('DOMContentLoaded', function() {
        const nextBtn = document.getElementById('nextBtn');
        if (!nextBtn) return;
        
        // Store original button text
        const originalText = nextBtn.innerHTML.trim();
        let countdown = 5;
        
        // Disable button and start countdown
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.6';
        nextBtn.style.cursor = 'not-allowed';
        nextBtn.innerHTML = countdown + '...';
        
        const timer = setInterval(function() {
            countdown--;
            if (countdown > 0) {
                nextBtn.innerHTML = countdown + '...';
            } else {
                // Countdown complete - enable button
                clearInterval(timer);
                nextBtn.innerHTML = originalText;
                nextBtn.disabled = false;
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
                
                // Add a subtle pulse animation to indicate ready
                nextBtn.style.animation = 'pulse 0.5s ease-out';
            }
        }, 1000);
    });
})();

document.addEventListener('keydown', function(e) {
    // Escape - close mobile menu
    if (e.key === 'Escape') {
        closeMobileMenu();
    }
});

// Mobile Menu Functions (Global)
function openMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const btn = document.querySelector('.mobile-menu-btn');
    if (menu) {
        menu.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    if (btn) {
        btn.classList.add('active');
    }
}

function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const btn = document.querySelector('.mobile-menu-btn');
    if (menu) {
        menu.classList.remove('active');
        document.body.style.overflow = '';
    }
    if (btn) {
        btn.classList.remove('active');
    }
}

// Close menu when clicking outside
document.addEventListener('click', function(e) {
    const menu = document.getElementById('mobileMenu');
    const btn = document.querySelector('.mobile-menu-btn');
    if (menu && menu.classList.contains('active')) {
        // If click is not on menu content and not on the button
        if (!e.target.closest('.mobile-menu-links') && 
            !e.target.closest('.mobile-menu-cta') &&
            !e.target.closest('.mobile-menu-close') &&
            !e.target.closest('.mobile-menu-btn')) {
            closeMobileMenu();
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    
    // Close mobile menu when clicking on links
    document.querySelectorAll('.mobile-menu-links a').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
    
    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
    });
    
    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Form Validation Helper
    window.validateEmail = function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };
    
    window.validateUrl = function(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };
    
    // Quick Generator Form (Homepage)
    const quickForm = document.getElementById('quickGeneratorForm');
    if (quickForm) {
        quickForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const btn = this.querySelector('.btn-generate');
            const btnText = btn.querySelector('.btn-text');
            const appName = document.getElementById('quickAppName')?.value;
            const websiteUrl = document.getElementById('quickWebsiteUrl')?.value;
            
            if (appName && websiteUrl) {
                // Visual feedback for Rewarded Ad
                const originalContent = btn.innerHTML;
                btn.disabled = true;
                btn.style.width = btn.offsetWidth + 'px'; // Maintain width
                btn.innerHTML = '<span class="loading-spinner"></span> Preparing Ad...';
                
                // Store in session storage
                sessionStorage.setItem('quickAppName', appName);
                sessionStorage.setItem('quickWebsiteUrl', websiteUrl);
                
                // Short delay to prepare the AdSense Offerwall context
                setTimeout(() => {
                    // Redirect to generator - The Offerwall will trigger on this path
                    window.location.href = '/generator/website-url';
                }, 1200);
            }
        });
    }
    
    // Animation on Scroll
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card, .value-card, .tech-card');
        
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight - 100;
            
            if (isVisible) {
                el.classList.add('animate-in');
            }
        });
    };
    
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Run on load
    
    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('h3');
        if (question) {
            question.style.cursor = 'pointer';
            question.addEventListener('click', function() {
                item.classList.toggle('open');
            });
        }
    });
    
    // Copy to Clipboard Helper
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    };
    
    // Toast Notifications
    window.showToast = function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        const colors = {
            'success': '#10B981',
            'error': '#EF4444',
            'info': '#3B82F6',
            'warning': '#F59E0B'
        };
        
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '16px 24px',
            background: colors[type] || colors['success'],
            color: 'white',
            borderRadius: '10px',
            fontWeight: '500',
            zIndex: '9999',
            animation: 'slideIn 0.3s ease'
        });
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
    
    // Add toast animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .animate-in {
            animation: fadeInUp 0.5s ease forwards;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .nav-links.mobile-open,
        .nav-actions.mobile-open {
            display: flex !important;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--bg-card);
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
        }
        .mobile-menu-btn.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        .mobile-menu-btn.active span:nth-child(2) {
            opacity: 0;
        }
        .mobile-menu-btn.active span:nth-child(3) {
            transform: rotate(-45deg) translate(5px, -5px);
        }
        .navbar.scrolled {
            background: rgba(10,10,11,0.92);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
    `;
    document.head.appendChild(style);
    
    // Lazy Loading Images
    const lazyImages = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));
    
    // Analytics Event Helper (placeholder for real analytics)
    window.trackEvent = function(category, action, label) {
        console.log('Event tracked:', { category, action, label });
        // Replace with real analytics code
        // gtag('event', action, { event_category: category, event_label: label });
    };
    
    // Preload quick generator data if coming from homepage
    const storedAppName = sessionStorage.getItem('quickAppName');
    const storedUrl = sessionStorage.getItem('quickWebsiteUrl');
    
    if (storedAppName || storedUrl) {
        const appNameInput = document.getElementById('appName');
        const urlInput = document.getElementById('websiteUrl');
        
        if (appNameInput && storedAppName) appNameInput.value = storedAppName;
        if (urlInput && storedUrl) urlInput.value = storedUrl;
        
        // Clear session storage
        sessionStorage.removeItem('quickAppName');
        sessionStorage.removeItem('quickWebsiteUrl');
    }
    
    console.log('🚀 FreeWebToApk loaded successfully');
});

// Features preview: render cards from `.feature-input` fields into all placeholders
document.addEventListener('DOMContentLoaded', function() {
    function renderFeaturePreviewGlobal() {
        const placeholders = document.querySelectorAll('.features-list-placeholder');
        if (!placeholders || placeholders.length === 0) return;
        const features = Array.from(document.querySelectorAll('.feature-input')).map(i => i.value.trim()).filter(Boolean);
        placeholders.forEach(list => {
            list.innerHTML = '';
                if (features.length === 0) {
                    // Show sensible defaults so there are no empty placeholders
                    const defaultFeatures = [
                        'Fast performance and smooth animations',
                        'Easy to use — no signup required',
                        'High quality exports (PNG / MP4)',
                        'Regular updates and bug fixes',
                        'Works offline and lightweight'
                    ];
                    defaultFeatures.slice(0,8).forEach(f => {
                        const card = document.createElement('div');
                        card.className = 'feature-card';
                        const h = document.createElement('h4');
                        h.textContent = f.length > 40 ? f.substring(0,37)+'…' : f;
                        const p = document.createElement('p');
                        p.textContent = 'Example feature';
                        card.appendChild(h);
                        card.appendChild(p);
                        list.appendChild(card);
                    });
                    return;
                }
            features.slice(0,8).forEach(f => {
                const card = document.createElement('div');
                card.className = 'feature-card';
                const h = document.createElement('h4');
                h.textContent = f.length > 40 ? f.substring(0,37)+'…' : f;
                const p = document.createElement('p');
                p.textContent = 'Tap to copy';
                card.appendChild(h);
                card.appendChild(p);
                card.addEventListener('click', () => {
                    navigator.clipboard && navigator.clipboard.writeText(f);
                    card.style.opacity = '0.6';
                    setTimeout(()=> card.style.opacity='1',800);
                });
                list.appendChild(card);
            });
        });
    }

    // update when feature inputs change
    document.addEventListener('input', function(e){
        if (e.target && e.target.classList && e.target.classList.contains('feature-input')) {
            renderFeaturePreviewGlobal();
        }
    });

    // initial render
    renderFeaturePreviewGlobal();
});

// =====================================================
// Speculation Rules API — Prefetch for instant navigation
// Prefetches same-origin links on moderate hover intent
// =====================================================
(function() {
    if (!HTMLScriptElement.supports || !HTMLScriptElement.supports('speculationrules')) return;
    var defined = document.querySelector('script[type="speculationrules"]');
    if (defined) return;
    var s = document.createElement('script');
    s.type = 'speculationrules';
    s.textContent = JSON.stringify({
        prefetch: [{
            where: {
                and: [
                    { href_matches: "/*" },
                    { not: { href_matches: "/generator/*" } },
                    { not: { href_matches: "/assets/*" } },
                    { not: { href_matches: "/fireadmin*" } },
                    { not: { selector_matches: "a[download]" } }
                ]
            },
            eagerness: "moderate"
        }]
    });
    document.head.appendChild(s);
})();

// =====================================================
// Promo Banner Injection - inserts app promo into pages
// =====================================================
(function() {
    // The homepage promotes the app in its own section; a strip above its hero is a duplicate.
    if (document.querySelector('main.home')) return;
    const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.freewebtoapk';

    const promoHTML = `
        <div class="promo-content">
            <div class="promo-left">
                <strong>Get the AppMint Android App</strong>
                <div class="promo-features">Web to APK · AI App Builder · Document to APK · Audio to APK · Video to APK · Images to APK · Offline HTML to APK</div>
            </div>
            <div class="promo-right">
                <a class="promo-cta" href="${PLAY_STORE_URL}" target="_blank" rel="noopener noreferrer">
                    Install Free on Google Play
                </a>
            </div>
        </div>
    `;

    const promoStyle = `
        /* Promo Banner Styles - adjusted to avoid covering mobile menu and reduce hero gap */
        /* ensure desktop navbar (z-index:1000) and overlays stay above the banner */
        #global-promo-banner { width:100%; max-width:1200px; margin:8px auto 0; padding:0 24px; box-sizing:border-box; position:relative; z-index:0; }
        .promo-banner, .promo-banner-inline, #global-promo-banner { font-family: Inter, Arial, sans-serif; }
        #global-promo-banner .promo-content, .promo-banner-inline .promo-content {
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
        #global-promo-banner .promo-right .promo-cta, .promo-banner-inline .promo-right .promo-cta{ background:#1DB954; color:#082018; padding:8px 12px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block; }
        /* Compact inline variant used near steppers */
        .promo-banner-inline { margin:6px 0; }
        .promo-banner-inline .promo-content { padding:4px 8px; border-radius:6px; gap:8px; }
        .promo-banner-inline .promo-left strong{ font-size:13px; }
        .promo-banner-inline .promo-features{ display:none; }
        .promo-banner-inline .promo-right .promo-cta{ padding:4px 8px; font-size:13px; }

        /* Mobile adjustments */
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
            // Don't inject the promo banner on focused conversion flows (wizard steps)
            const path = window.location.pathname;
            if (path.indexOf('/generator/') !== -1 || path.indexOf('/pwa-builder/') !== -1) return;
            // Insert global banner after navbar if present
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

        } catch (e) {
            console.warn('Promo injection failed', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertPromo);
    } else {
        insertPromo();
    }

    // Add styles if not already present
    if (!document.getElementById('promo-banner-style')) {
        const s = document.createElement('style');
        s.id = 'promo-banner-style';
        s.textContent = promoStyle;
        document.head.appendChild(s);
    }
})();
