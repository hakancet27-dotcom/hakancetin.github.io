/**
 * App - Ana uygulama koordinatörü
 * Tüm modülleri başlatır, aralarında koordinasyon sağlar
 * Hiçbir modül App.js'i bilmez, sadece EventBus üzerinden iletişim kurar
 */
import { inputLayer } from './core/InputLayer.js';
import { gameEngine } from './core/GameEngine.js';
import { platformAdapter } from './adapters/PlatformAdapter.js';
import { backendService } from './services/BackendService.js';
import { audioManager } from './services/AudioManager.js';
import { uiManager } from './ui/UIManager.js';
import { eventBus, Events } from './utils/EventBus.js';
import logger from './utils/Logger.js';

class App {
    constructor() {
        this.initialized = false;
        this.firebaseConfig = null;
        
        // Auto-pause yönetimi
        this.faceLostTimer = null;
        this.faceLostDelay = 2000; // 2 saniye yüz yoksa pause
        this.autoPaused = false;
        this.leaderboardUnsubscribe = null;
    }

    async init(firebaseConfig) {
        if (this.initialized) return;

        this.firebaseConfig = firebaseConfig;

        try {
            // 1. UI Manager'ı başlat
            uiManager.init();
            uiManager.showLoading('Sistem başlatılıyor...');

            // 2. Platform tespiti
            const platform = platformAdapter.getPlatform();
            logger.info(`Platform detected: ${platform.type}`);

            // 3. Audio Manager'ı başlat
            audioManager.loadSettings();
            audioManager.init();

            // 4. Backend bağlantısı (başarısız olursa oyun devam eder)
            try {
                await backendService.init(firebaseConfig);
                backendService.logUsage();
                backendService.enableOfflinePersistence();
                
                // Leaderboard'u yükle
                await backendService.loadLeaderboard(10);
                
                // Real-time leaderboard listener (canlı güncelleme)
                this.leaderboardUnsubscribe = backendService.onLeaderboardUpdate((sorted) => {
                    backendService.leaderboard = sorted;
                    eventBus.emit(Events.LEADERBOARD_LOADED, sorted);
                });
            } catch (error) {
                logger.warn('Backend not available:', error.message);
            }
            
            // Mobilde kamera kontrol uyarısı
            if (platformAdapter.isMobile()) {
                setTimeout(() => {
                    uiManager.showNotification(
                        '📱 Kamera kontrolü masaüstüne özgüdür. Mobilde performans değişebilir.',
                        6000
                    );
                }, 1500);
            }

            // 5. Game Engine'i başlat
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                throw new Error('Game canvas not found');
            }

            const gameInitialized = gameEngine.init(canvas);
            if (!gameInitialized) {
                throw new Error('GameEngine failed to initialize');
            }

            // 6. Input Layer'i başlat (kamera başarısız olsa bile devam et)
            const video = document.getElementById('cameraVideo');
            let cameraFailed = false;
            if (video) {
                try {
                    const inputInitialized = await inputLayer.init(video);
                    if (!inputInitialized) {
                        logger.warn('InputLayer initialization failed, continuing without camera');
                        cameraFailed = true;
                    }
                } catch (error) {
                    logger.warn('Camera access denied or failed:', error.message);
                    logger.info('Game will continue without face tracking');
                    cameraFailed = true;
                    const cameraErrorOverlay = document.getElementById('cameraErrorOverlay');
                    if (cameraErrorOverlay) {
                        cameraErrorOverlay.classList.add('visible');
                        let continueBtn = document.getElementById('cameraErrorContinueBtn');
                        if (!continueBtn) {
                            continueBtn = document.createElement('button');
                            continueBtn.id = 'cameraErrorContinueBtn';
                            continueBtn.textContent = 'Kamera Olmadan Devam Et';
                            continueBtn.onclick = () => {
                                cameraErrorOverlay.classList.remove('visible');
                                inputLayer.setupFallbackControls();
                            };
                            cameraErrorOverlay.appendChild(continueBtn);
                        }
                    }
                }
            }
            
            // Kamera yoksa fallback kontrolleri aktive et
            if (cameraFailed) {
                inputLayer.setupFallbackControls();
                uiManager.showNotification('⌨️ Kamera bulunamadı — Ok tuşları ve mouse ile oynayabilirsiniz', 6000);
            }

            // 7. Ek koordinasyon event'lerini bağla
            this.bindCoordinationEvents();

            this.initialized = true;
            uiManager.hideLoading();
            logger.info('App initialized successfully');

            // Başlangıç olayını yayınla
            eventBus.emit('app:initialized', { platform: platformAdapter.getPlatform() });

        } catch (error) {
            logger.error('App initialization failed:', error);
            uiManager.showNotification('❌ Başlatma hatası: ' + error.message, 5000);
            throw error;
        }
    }

    bindCoordinationEvents() {
        // Oyun başlayınca müzik çal
        eventBus.on(Events.GAME_START, () => {
            audioManager.startBackground();
        });

        // Oyun sonu → Skor kaydetme (tüm geçerli skorlar Firebase'e gider) + müzik durdur
        eventBus.on(Events.GAME_OVER, async () => {
            const score = gameEngine.state.score;
            const bestScore = backendService.getLocalBestScore();
            
            if (score <= 0) return;
            
            // Yerel best güncellemesi
            const isNewBest = score > bestScore;
            if (isNewBest) {
                backendService.updateLocalBestScore(score);
                uiManager.showNotification(`🏆 Yeni rekor: ${score}!`, 5000);
                const newRecordEl = document.getElementById('newRecord');
                if (newRecordEl) newRecordEl.classList.remove('hidden');
            }
            
            // Firebase'e otomatik gönder (bağlıysa)
            if (backendService.isConnected()) {
                const saved = await backendService.saveScore(score);
                if (saved) {
                    logger.info('Score auto-saved to Firebase:', score);
                    // Liderlik tablosunu yenile (real-time listener zaten çalışıyor)
                    await backendService.loadLeaderboard(10);
                }
            }
            
            // Müzik durdur
            audioManager.stopBackground();
        });

        // TV modu değişiklikleri
        eventBus.on(Events.TV_MODE_ON, () => {
            // Oyun ayarlarını TV'ye göre optimize et
            if (gameEngine.camera) {
                gameEngine.camera.fov = 80; // Daha geniş görüş açısı
                gameEngine.camera.updateProjectionMatrix();
            }
        });

        eventBus.on(Events.TV_MODE_OFF, () => {
            // Normal ayarlara dön
            if (gameEngine.camera) {
                gameEngine.camera.fov = 75;
                gameEngine.camera.updateProjectionMatrix();
            }
        });

        // Kalibrasyon tamamlandığında zorluk seçimi göster
        eventBus.on(Events.CALIBRATION_COMPLETE, () => {
            uiManager.hideLoading();
        });
        
        // ===== AUTO-PAUSE: Yüz çerçeveden çıktığında =====
        eventBus.on(Events.FACE_LOST, () => {
            const state = gameEngine.getState();
            if (!state.isPlaying || state.isPaused) return;
            // Kısa kayıplar için debounce - 2sn bekle
            if (this.faceLostTimer) return;
            this.faceLostTimer = setTimeout(() => {
                if (!gameEngine.getState().isPaused) {
                    this.autoPaused = true;
                    eventBus.emit(Events.GAME_PAUSE);
                    uiManager.showNotification('⏸️ Yüz tespit edilemiyor - Oyun duraklatıldı', 3000);
                    logger.info('Auto-paused: face lost');
                }
                this.faceLostTimer = null;
            }, this.faceLostDelay);
        });
        
        eventBus.on(Events.FACE_DETECTED, () => {
            // Yüz geri geldi - bekleyen pause'u iptal et
            if (this.faceLostTimer) {
                clearTimeout(this.faceLostTimer);
                this.faceLostTimer = null;
            }
            // Auto-paused durumdaysa devam ettir
            if (this.autoPaused && gameEngine.getState().isPaused) {
                this.autoPaused = false;
                eventBus.emit(Events.GAME_RESUME);
                logger.info('Auto-resumed: face detected');
            }
        });
        
        // Pause overlay görsel göstergesi
        eventBus.on(Events.GAME_PAUSE, () => {
            this.showPauseOverlay();
        });
        eventBus.on(Events.GAME_RESUME, () => {
            this.hidePauseOverlay();
        });
        
        // Manuel P tuşu ile pause/resume
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                if (!gameEngine.state.isPlaying) return;
                if (gameEngine.state.isPaused) {
                    eventBus.emit(Events.GAME_RESUME);
                    uiManager.showNotification('▶️ Oyun devam ediyor', 1500);
                } else {
                    eventBus.emit(Events.GAME_PAUSE);
                    uiManager.showNotification('⏸️ Duraklatıldı (P ile devam et)', 2000);
                }
            }
        });
    }

    // Zorluk seçimi
    selectDifficulty(difficulty) {
        gameEngine.setDifficulty(difficulty);
        
        uiManager.hideOverlay('difficultyOverlay');
        
        eventBus.emit(Events.GAME_START, { difficulty });
    }

    // Araba seçimi
    selectCar(carType) {
        const unlockScores = { standard: 0, fast: 1000, super: 2000 };
        const bestScore = backendService.getLocalBestScore();

        if (bestScore >= unlockScores[carType]) {
            gameEngine.setCar(carType);
            return true;
        }
        uiManager.showNotification(`🔒 Bu araba ${unlockScores[carType]} skor ile açılır`, 3000);
        return false;
    }

    // Araba rengi
    setCarColor(color) {
        gameEngine.state.selectedCarColor = color;
        gameEngine.createCar();
    }

    // Kamera preset değiştirme
    toggleCameraPreset() {
        const presets = [
            { pos: [0, 8, 12], lookAt: [0, 0, 0] },
            { pos: [0, 12, 18], lookAt: [0, 0, 0] },
            { pos: [0, 5, 8], lookAt: [0, 0, 0] },
            { pos: [-8, 5, 0], lookAt: [0, 0, 0] } // Yan açı
        ];

        gameEngine.state.cameraPreset = (gameEngine.state.cameraPreset + 1) % presets.length;
        const preset = presets[gameEngine.state.cameraPreset];

        if (gameEngine.camera) {
            gameEngine.camera.position.set(...preset.pos);
            gameEngine.camera.lookAt(...preset.lookAt);
        }

        return gameEngine.state.cameraPreset;
    }

    // TV modu geçiş
    toggleTVMode() {
        return platformAdapter.toggleTVMode();
    }

    // Telefon bağla (WebRTC)
    connectPhone() {
        if (!backendService.isConnected()) {
            uiManager.showNotification('❌ Firebase bağlantısı yok — telefon bağlanamaz', 4000);
            return;
        }
        eventBus.emit(Events.WEBRTC_START_HOST, { firebaseDb: backendService.db });
        uiManager.showNotification('📱 QR kod oluşturuluyor...', 2000);
    }

    // Müzik kontrolü
    toggleMusic() {
        const isMuted = audioManager.toggleMute();
        return isMuted;
    }

    setMusicVolume(value) {
        audioManager.setVolume(value);
    }

    // Oyunu yeniden başlat
    restart() {
        const gameOverOverlay = document.getElementById('gameOverOverlay');
        if (gameOverOverlay) gameOverOverlay.style.display = 'none';
        uiManager.hideOverlay('gameOverOverlay');
        uiManager.showOverlay('difficultyOverlay');
    }

    // Skor tablosu
    async refreshLeaderboard() {
        if (backendService.isConnected()) {
            await backendService.loadLeaderboard(10);
        }
    }

    // İsminizi kaydet
    setPlayerName(name) {
        backendService.setPlayerName(name);
    }

    // Pause overlay göster
    showPauseOverlay() {
        let overlay = document.getElementById('pauseOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pauseOverlay';
            overlay.className = 'game-paused-overlay visible';
            document.body.appendChild(overlay);
        } else {
            overlay.classList.add('visible');
        }
    }
    
    hidePauseOverlay() {
        const overlay = document.getElementById('pauseOverlay');
        if (overlay) overlay.classList.remove('visible');
    }

    // Cleanup
    async destroy() {
        await inputLayer.stop();
        if (gameEngine.animationId) {
            cancelAnimationFrame(gameEngine.animationId);
        }
        if (this.leaderboardUnsubscribe) {
            this.leaderboardUnsubscribe();
        }
        this.initialized = false;
    }
}

// Singleton instance
export const app = new App();
export default App;
