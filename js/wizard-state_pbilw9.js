// =====================================================
// FreeWebToApk - Multi-Page Wizard State Manager
// Persists wizard data across pages using sessionStorage
// =====================================================

const WizardState = {
    STORAGE_KEY: 'freewebtoapk_wizard',
    
    // Default config - matches generator.js config structure
    defaultConfig: {
        appName: '',
        websiteUrl: '',
        // 'url' | 'html' (pasted code) | 'file' (one HTML file) | 'zip'. For anything but 'url' the
        // pages live in WizardFiles (IndexedDB) and ship inside the app.
        sourceType: 'url',
        sourceLabel: '',
        sourceFileCount: 0,
        appVersion: '1.0.0',
        // Optional typed version code (2026-10-03). '' = derived from appVersion (build-config.js).
        versionCode: '',
        iconOption: 'generate',
        iconData: null,
        iconText: '',
        iconBgColor: '#00D4FF',
        iconShape: 'rounded',
        enableSplash: true,
        splashBgColor: '#0A0F1C',
        splashTextColor: '#FFFFFF',
        splashLogoPosition: 'center',
        splashLogoData: null,
        screenMode: 'fullscreen',
        orientation: 'auto',
        externalLinks: 'internal',
        enableDownloads: true,
        enablePullRefresh: true,
        exitConfirmation: true,
        packageName: '',
        developerWebsite: '',
        enableAdmob: false,
        admobPublisherId: '',
        admobBannerId: '',
        adPlacement: 'bottom',
        enablePush: false,
        onesignalAppId: '',
        googleServicesJson: null,
        // Asked on every wizard page since 2026-09-29: the app declares exactly the permissions ticked.
        permissionsDeclared: true,
        permCamera: true,
        permMicrophone: false,
        permLocation: false,
        permStorage: false,
        permContacts: false,
        permPhone: false,
        permBluetooth: false,
        permNfc: false,
        enableSideMenu: true,
        sideMenuColor: '#6366F1',
        appBarColor: '#6366F1',
        aboutUs: '',
        contactEmail: '',
        contactPhone: '',
        enableAboutUs: true,
        enablePrivacyPolicyItem: true,
        enableContactUs: true,
        enableShareApp: true,
        enableRateApp: true,
        youtubeLink: '',
        telegramLink: '',
        instagramLink: '',
        twitterLink: '',
        enableLiveChat: false,
        chatWidgetCode: '',
        chatButtonLabel: 'Live Chat',
        enablePinLock: false,
        pinCode: '',
        privacyPolicyType: 'auto',
        privacyPolicyUrl: '',
        // ── 2026-09-29: the rest of the AppMint phone app's options ──
        appMode: 'url', liveDevPort: '5173', galleryScrollDirection: 'horizontal', mediaAutoPlay: false, mediaRememberPosition: true,
        admobAppId: '', adControl: 'automatic', enableBannerAd: true, fullScreenAdType: '', fullScreenTrigger: 'actions', fullScreenActionCount: 4,
        interstitialAdId: '', rewardAdId: '', mrecAdId: '', rewardedInterstitialAdId: '', appOpenAdId: '',
        enableMediation: false, mediationNetworks: ['inmobi'],
        pushProvider: 'none',
        enableTopBar: true, enableFullscreenToggle: false, statusBarColor: '', enableBottomNav: false, bottomNavStyle: 'controls', bottomTabs: [], bottomNavColor: '', bottomNavLabels: true, enableZoom: true,
        enableClickSound: true, desktopMode: false, userAgent: '', enableExitButton: true, customMenuLinks: [],
        customJs: '', customCss: '', userScripts: [],
        enableOfflineCache: false, enablePersistentCache: true, enableAdBlocking: false, requiresNetwork: false,
        enableBackgroundAudio: false, enableMediaNotification: false, enablePipMode: false, enableTextRecognition: false,
        enableJsxRuntime: false, enableCapacitorPlugins: true,
        enableIap: false, iapProductId: '', enableIapCatalog: false,
        remoteUpdateEnabled: false, remoteManifestUrl: '',
        enableDeepLinks: false, enableFileOpen: false, shareText: true, shareDataFiles: true, shareImages: false,
        shareVideos: false, shareAudio: false, shareDocuments: false,
        permContactsWrite: false, permCalendar: false, permSms: false, permCallLog: false, permBiometric: false,
        permNotifications: false, permReminders: false, permFolder: false, permKeystore: false,
        // ── 1.11.8 native features: every one off by default ──
        permAlarmClock: false, permDndAccess: false, permExactAlarmApp: false,
        bgKeepRunning: false, bgServiceType: 'dataSync', bgLocation: false, bgGeofencing: false, bgStartOnBoot: false,
        bgTasks: false, bgBatteryDialog: false,
        ocr_devanagari: false, ocr_chinese: false, ocr_japanese: false, ocr_korean: false,
        enableDeviceIntegrity: false, integrityCloudProjectNumber: '', enableAndroidTv: false,
        enableHealthConnect: false,
        healthRead_steps: false, healthWrite_steps: false,
        healthRead_distance: false, healthWrite_distance: false,
        healthRead_calories: false, healthWrite_calories: false,
        healthRead_heartRate: false, healthWrite_heartRate: false,
        healthRead_sleep: false, healthWrite_sleep: false,
        healthRead_weight: false, healthWrite_weight: false,
        healthRead_exercise: false, healthWrite_exercise: false,
        facebookEnabled: false, facebookAppId: '', facebookClientToken: '', facebookAppEvents: false,
        firebaseAnalytics: false, analyticsScreenViews: false, revenueCatEnabled: false, revenueCatApiKey: '',
        splashScaleMode: 'fit', splashVideoSkippable: true, splashFadeOut: false, showSplashAppName: true, splashLoadingStyle: 'spinner', backgroundMusicVolume: 40,
        hasSplashVideo: false, hasMusic: false, hasErrorImage: false, hasGoogleServices: false,
        outputFormat: 'apk',
        currentStep: 1,
        lastUpdated: null
    },
    
    /**
     * Get the current wizard state from sessionStorage
     * @returns {Object} Current wizard config
     */
    get() {
        try {
            const saved = sessionStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure all fields exist
                return { ...this.defaultConfig, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load wizard state:', e);
        }
        return { ...this.defaultConfig };
    },
    
    /**
     * Save the wizard state to sessionStorage
     * @param {Object} config - Partial or full config to save
     */
    save(config) {
        try {
            const current = this.get();
            const updated = { 
                ...current, 
                ...config, 
                lastUpdated: Date.now() 
            };
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
            return true;
        } catch (e) {
            console.warn('Failed to save wizard state:', e);
            return false;
        }
    },
    
    /**
     * Update a single field in the wizard state
     * @param {string} key - Field name
     * @param {any} value - Field value
     */
    set(key, value) {
        const current = this.get();
        current[key] = value;
        current.lastUpdated = Date.now();
        return this.save(current);
    },
    
    /**
     * Get the current step number
     * @returns {number} Current step (1-5)
     */
    getCurrentStep() {
        return this.get().currentStep || 1;
    },
    
    /**
     * Set the current step number
     * @param {number} step - Step number (1-5)
     */
    setCurrentStep(step) {
        return this.set('currentStep', step);
    },
    
    /**
     * Check if wizard has valid data for a specific step
     * @param {number} step - Step to validate
     * @returns {boolean} True if step data is valid
     */
    isStepValid(step) {
        const config = this.get();
        
        switch(step) {
            case 1:
                if (!config.appName || config.appName.trim() === '') return false;
                if (config.sourceType === 'livedev') return /^\d{1,5}$/.test(String(config.liveDevPort || ''));
                if (config.sourceType && config.sourceType !== 'url') return config.sourceFileCount > 0;
                return !!config.websiteUrl && this.isValidUrl(config.websiteUrl);
            case 2:
                return (config.iconOption === 'upload' && config.iconData) ||
                       (config.iconOption === 'generate');
            case 3:
                return true; // Splash is optional
            case 4:
                return true; // Settings have defaults
            case 5:
                return this.isStepValid(1) && this.isStepValid(2);
            default:
                return false;
        }
    },
    
    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return url.startsWith('http://') || url.startsWith('https://');
        } catch {
            return false;
        }
    },
    
    /**
     * Get the highest valid step the user can access
     * @returns {number} Highest accessible step
     */
    getMaxAccessibleStep() {
        for (let i = 1; i <= 5; i++) {
            if (!this.isStepValid(i)) {
                return i;
            }
        }
        return 5;
    },
    
    /**
     * Clear all wizard data and start fresh
     */
    clear() {
        try {
            if (typeof WizardFiles !== 'undefined') WizardFiles.clear();
            sessionStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            console.warn('Failed to clear wizard state:', e);
            return false;
        }
    },
    
    /**
     * Check if there's existing wizard data
     * @returns {boolean} True if data exists
     */
    hasData() {
        const config = this.get();
        return !!(config.appName || config.websiteUrl || config.iconData);
    },
    
    /**
     * Navigate to appropriate step page
     * @param {number} step - Target step
     */
    navigateToStep(step) {
        const pages = {
            1: '/generator/website-url',
            2: '/generator/app-icon',
            3: '/generator/splash-screen',
            4: '/generator/app-settings',
            5: '/generator/download-apk'
        };
        
        this.setCurrentStep(step);
        window.location.href = pages[step] || pages[1];
    },
    
    /**
     * Get step URL
     * @param {number} step - Step number
     * @returns {string} URL for the step
     */
    getStepUrl(step) {
        const pages = {
            1: '/generator/website-url',
            2: '/generator/app-icon',
            3: '/generator/splash-screen',
            4: '/generator/app-settings',
            5: '/generator/download-apk'
        };
        return pages[step] || pages[1];
    },
    
    /**
     * Step info for SEO and navigation
     */
    stepInfo: {
        1: {
            title: 'Enter Website URL - Free APK Generator | FreeWebToApk',
            description: 'Step 1: Enter your website URL to convert into an Android APK app. Free website to APK converter with no signup required.',
            h1: 'Enter Your Website URL',
            label: 'Website URL'
        },
        2: {
            title: 'Upload App Icon - Free APK Generator | FreeWebToApk',
            description: 'Step 2: Upload or generate a custom app icon for your Android application. Create professional app icons instantly.',
            h1: 'Design Your App Icon',
            label: 'App Icon'
        },
        3: {
            title: 'Customize Splash Screen - Free APK Generator | FreeWebToApk',
            description: 'Step 3: Customize your app splash screen with colors, logo, and branding. Professional Android app loading screen.',
            h1: 'Customize Splash Screen',
            label: 'Splash Screen'
        },
        4: {
            title: 'Configure App Settings - Free APK Generator | FreeWebToApk',
            description: 'Step 4: Configure app settings including AdMob, push notifications, permissions, and more. All features free.',
            h1: 'Configure App Settings',
            label: 'Settings'
        },
        5: {
            title: 'Download APK - Free APK Generator | FreeWebToApk',
            description: 'Step 5: Review and download your Android APK or AAB file. Free instant download, ready for Play Store.',
            h1: 'Download Your APK',
            label: 'Download'
        }
    }
};

/**
 * The pages of an HTML / ZIP app, kept between wizard pages in IndexedDB (a ZIP is far past what
 * sessionStorage holds). They never leave the browser: the builder packs them into the APK and AAB.
 * [{ path: 'index.html', data: ArrayBuffer }, ...]
 */
const WizardFiles = {
    DB: 'freewebtoapk_wizard_files',
    STORE: 'files',
    KEY: 'current',
    _open() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(this.STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('This browser blocked local storage for your files'));
        });
    },
    async _tx(mode, fn) {
        const db = await this._open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, mode);
            const out = fn(tx.objectStore(this.STORE));
            tx.oncomplete = () => { db.close(); resolve(out && 'result' in out ? out.result : undefined); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    },
    // key: 'current' = the site's pages; named slots hold the other picks ('media' for a
    // documents / gallery / audio / video app, 'splashVideo', 'music', 'errorImage', 'googleServices').
    put(files, key) { return this._tx('readwrite', st => st.put(files, key || this.KEY)); },
    async get(key) { const v = await this._tx('readonly', st => st.get(key || this.KEY)); return v || (key && key !== this.KEY ? null : []); },
    remove(key) { return this._tx('readwrite', st => st.delete(key)).catch(() => {}); },
    clear() { return this._tx('readwrite', st => st.clear()).catch(() => {}); }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WizardState;
}
