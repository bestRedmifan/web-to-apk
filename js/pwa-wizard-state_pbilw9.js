// =====================================================
// FreeWebToApk - PWA Builder Wizard State Manager
// Persists PWA wizard data across pages using sessionStorage
// =====================================================

const PWAWizardState = {
    STORAGE_KEY: 'freewebtoapk_pwa_wizard',
    
    // Default config for PWA Builder
    defaultConfig: {
        // Step 1: Basic Info
        websiteUrl: '',
        appName: '',
        shortName: '',
        description: '',
        packageName: '',
        
        // Step 2: Branding
        iconOption: 'upload',
        iconData: null,
        themeColor: '#6366F1',
        backgroundColor: '#0A0F1C',
        splashLogoPosition: 'center',
        showAppNameOnSplash: true,
        
        // Step 3: Integrations
        enablePush: false,
        onesignalAppId: '',
        onesignalAutoPrompt: true,
        onesignalWelcomeNotification: true,
        enableTawk: false,
        tawkPropertyId: '',
        tawkWidgetId: 'default',
        
        // Step 4: Caching
        cachingStrategy: 'balanced',
        enableOfflineFallback: true,
        maxCacheSize: 50,
        cacheExpiry: 7,
        whiteLabel: false,
        
        // Step 5: Build
        outputAPK: true,
        // The AAB is a paid deliverable (APK + AAB bundle, US$5, Android builder). The PWA builder's AAB
        // option is hidden in the UI, and a default of true here was silently shipping a free AAB in the zip.
        outputAAB: false,
        outputAssetLinks: true,
        outputManifest: true,
        outputServiceWorker: true,
        outputSigningInfo: true,
        
        // Meta
        currentStep: 1,
        lastUpdated: null
    },
    
    get() {
        try {
            const saved = sessionStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...this.defaultConfig, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load PWA wizard state:', e);
        }
        return { ...this.defaultConfig };
    },
    
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
            console.warn('Failed to save PWA wizard state:', e);
            return false;
        }
    },
    
    set(key, value) {
        const current = this.get();
        current[key] = value;
        current.lastUpdated = Date.now();
        return this.save(current);
    },
    
    getCurrentStep() {
        return this.get().currentStep || 1;
    },
    
    setCurrentStep(step) {
        return this.set('currentStep', step);
    },
    
    isStepValid(step) {
        const config = this.get();
        
        switch(step) {
            case 1:
                return config.appName && 
                       config.appName.trim() !== '' && 
                       config.websiteUrl && 
                       this.isValidUrl(config.websiteUrl);
            case 2:
                // Icon is optional - user can proceed without uploading
                return true;
            case 3:
                return true; // Integrations are optional
            case 4:
                return true; // Caching has defaults
            case 5:
                return this.isStepValid(1);
            default:
                return false;
        }
    },
    
    isValidUrl(url) {
        try {
            new URL(url);
            return url.startsWith('http://') || url.startsWith('https://');
        } catch {
            return false;
        }
    },
    
    generatePackageName(appName, url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace(/^www\./, '');
            const parts = domain.split('.').reverse();
            const safeName = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
            return parts.join('.') + '.' + (safeName || 'twa');
        } catch {
            const safeName = appName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'myapp';
            return 'com.' + safeName + '.twa';
        }
    },
    
    clear() {
        try {
            sessionStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            console.warn('Failed to clear PWA wizard state:', e);
            return false;
        }
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PWAWizardState;
}
