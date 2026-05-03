/**
 * PlatformAdapter - Platform algılama ve optimizasyon
 * TV, mobil, masaüstü cihazları tespit eder, optimizasyonlar uygular
 * Diğer modülleri etkilemez, sadece olay yayınlar
 */
import { eventBus, Events } from '../utils/EventBus.js';
import logger from '../utils/Logger.js';

class PlatformAdapter {
    constructor() {
        this.platform = {
            type: 'desktop', // 'desktop', 'mobile', 'tv'
            isTV: false,
            isMobile: false,
            isDesktop: true,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio,
            userAgent: navigator.userAgent
        };

        this.tvThreshold = 1920; // TV modu için minimum genişlik
        this.detect();
        this.setupListeners();
    }

    detect() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const userAgent = navigator.userAgent.toLowerCase();

        // TV tespiti
        const isTV = this.detectTV(userAgent, width);
        
        // Mobil tespiti
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

        // Touch desteği
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Yeni platform durumu
        const oldType = this.platform.type;
        
        if (isTV) {
            this.platform.type = 'tv';
            this.platform.isTV = true;
            this.platform.isMobile = false;
            this.platform.isDesktop = false;
        } else if (isMobile || (hasTouch && width < 1024)) {
            this.platform.type = 'mobile';
            this.platform.isTV = false;
            this.platform.isMobile = true;
            this.platform.isDesktop = false;
        } else {
            this.platform.type = 'desktop';
            this.platform.isTV = false;
            this.platform.isMobile = false;
            this.platform.isDesktop = true;
        }

        this.platform.screenWidth = width;
        this.platform.screenHeight = height;

        // Platform değişimi olayını yayınla
        if (oldType !== this.platform.type) {
            logger.info(`Platform changed: ${oldType} -> ${this.platform.type}`);
            eventBus.emit(Events.PLATFORM_CHANGED, { ...this.platform });
            
            if (this.platform.isTV) {
                eventBus.emit(Events.TV_MODE_ON, { ...this.platform });
            } else if (oldType === 'tv') {
                eventBus.emit(Events.TV_MODE_OFF, { ...this.platform });
            }

            if (this.platform.isMobile) {
                eventBus.emit(Events.MOBILE_DETECTED, { ...this.platform });
            } else if (this.platform.isDesktop) {
                eventBus.emit(Events.DESKTOP_DETECTED, { ...this.platform });
            }
        }

        return this.platform;
    }

    detectTV(userAgent, width) {
        // TV user agent'ları
        const tvKeywords = [
            'smart-tv', 'smarttv', 'googletv', 'appletv', 'hbbtv',
            'pov_tv', 'webos', 'tizen', 'netcast', 'opera tv',
            'sonydtv', ' philipstv', 'lg smarttv', 'samsung smarttv'
        ];

        const hasTVKeyword = tvKeywords.some(keyword => userAgent.includes(keyword));
        const isLargeScreen = width >= this.tvThreshold;
        const isLandscape = window.innerWidth > window.innerHeight;

        // WebRTC QR kod desteği varsa TV modu olabilir
        const supportsWebRTC = 'RTCPeerConnection' in window;

        return hasTVKeyword || (isLargeScreen && isLandscape && supportsWebRTC);
    }

    setupListeners() {
        // Ekran değişikliklerini izle
        window.addEventListener('resize', () => {
            this.debounce(() => this.detect(), 250);
        });

        // Orientasyon değişiklikleri
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.detect(), 100);
        });

        // TV uzaktan kumanda desteği
        this.setupTVControls();
    }

    setupTVControls() {
        // TV uzaktan kumanda navigasyonu
        document.addEventListener('keydown', (e) => {
            if (!this.platform.isTV) return;

            switch(e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'Enter':
                case 'Backspace':
                    // TV kontrol olaylarını yayınla
                    eventBus.emit('tv:control', { key: e.key });
                    break;
            }
        });
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }

    // Optimizasyon ayarları
    getOptimizationSettings() {
        const base = {
            antialias: true,
            shadowMap: true,
            particleCount: 100,
            treeCount: 30,
            obstacleCount: 10,
            fps: 60
        };

        switch(this.platform.type) {
            case 'tv':
                return {
                    ...base,
                    antialias: true,
                    shadowMap: true,
                    particleCount: 150,
                    treeCount: 40,
                    obstacleCount: 12,
                    fps: 60,
                    largeUI: true
                };
            case 'mobile':
                return {
                    ...base,
                    antialias: false,
                    shadowMap: false,
                    particleCount: 50,
                    treeCount: 20,
                    obstacleCount: 8,
                    fps: 30,
                    touchControls: true
                };
            default:
                return base;
        }
    }

    // UI ölçeklendirme
    getUIScale() {
        switch(this.platform.type) {
            case 'tv':
                return 1.5;
            case 'mobile':
                return 0.9;
            default:
                return 1.0;
        }
    }

    // Font boyutu
    getFontSize(baseSize) {
        return baseSize * this.getUIScale();
    }

    // Buton boyutu
    getButtonSize(baseWidth, baseHeight) {
        const scale = this.getUIScale();
        return {
            width: baseWidth * scale,
            height: baseHeight * scale
        };
    }

    // WebRTC kontrolü (TV modu için telefon sensörü)
    isWebRTCSupported() {
        return 'RTCPeerConnection' in window && 
               'RTCSessionDescription' in window &&
               !this.platform.isMobile; // Mobilde TV modu kullanılamaz
    }

    // TV modunu manuel değiştir
    toggleTVMode(force = null) {
        if (force !== null) {
            this.platform.isTV = force;
        } else {
            this.platform.isTV = !this.platform.isTV;
        }

        if (this.platform.isTV) {
            this.platform.type = 'tv';
            eventBus.emit(Events.TV_MODE_ON, { ...this.platform });
        } else {
            this.platform.type = this.detectDeviceType();
            eventBus.emit(Events.TV_MODE_OFF, { ...this.platform });
        }

        eventBus.emit(Events.PLATFORM_CHANGED, { ...this.platform });
        return this.platform.isTV;
    }

    detectDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        return isMobile ? 'mobile' : 'desktop';
    }

    // Getters
    getPlatform() {
        return { ...this.platform };
    }

    isTV() {
        return this.platform.isTV;
    }

    isMobile() {
        return this.platform.isMobile;
    }

    isDesktop() {
        return this.platform.isDesktop;
    }

    // Ekran bilgileri
    getScreenInfo() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            aspectRatio: window.innerWidth / window.innerHeight,
            pixelRatio: window.devicePixelRatio,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
        };
    }
}

// Singleton instance
export const platformAdapter = new PlatformAdapter();
export default PlatformAdapter;
