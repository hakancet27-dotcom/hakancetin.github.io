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
        // Input → Game Engine koordinasyonu
        eventBus.on(Events.TURBO_ACTIVATED, () => {
            // Oyun durumunu güncelle
            gameEngine.state.nitroActive = true;
        });

        eventBus.on(Events.TURBO_DEACTIVATED, () => {
            gameEngine.state.nitroActive = false;
        });

        // Skor değişiminde UI güncelleme
        eventBus.on(Events.SCORE_CHANGED, (score) => {
            // Turbo puanlarını da göster
            const turboPoints = gameEngine.state.turboPoints;
            uiManager.updateTurbo(turboPoints, gameEngine.state.turboThreshold);
        });

        // Engelle çarpışma → Skor/Hasar güncelleme
        eventBus.on(Events.OBSTACLE_HIT, (data) => {
            switch(data.type) {
                case 'turbo':
                    gameEngine.state.turboPoints = Math.min(
                        gameEngine.state.turboPoints + 10, 
                        gameEngine.state.turboThreshold
                    );
                    gameEngine.state.health = Math.max(0, gameEngine.state.health - 5);
                    break;
                case 'gold':
                    gameEngine.state.goldPoints += 10;
                    break;
                case 'damage':
                    gameEngine.state.health = Math.min(100, gameEngine.state.health + 10);
                    gameEngine.state.speed *= 0.7;
                    break;
            }

            // UI güncelle
            uiManager.updateTurbo(
                gameEngine.state.turboPoints, 
                gameEngine.state.turboThreshold
            );
        });

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
            if (!gameEngine.state.isPlaying || gameEngine.state.isPaused) return;
            // Kısa kayıplar için debounce - 2sn bekle
            if (this.faceLostTimer) return;
            this.faceLostTimer = setTimeout(() => {
                if (!gameEngine.state.isPaused) {
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
            if (this.autoPaused && gameEngine.state.isPaused) {
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
        eventBus.emit(Events.GAME_OVER);
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
            overlay.className = 'game-paused-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }
    
    hidePauseOverlay() {
        const overlay = document.getElementById('pauseOverlay');
        if (overlay) overlay.style.display = 'none';
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
