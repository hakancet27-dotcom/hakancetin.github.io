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
            } catch (error) {
                logger.warn('Backend not available:', error.message);
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
            if (video) {
                try {
                    const inputInitialized = await inputLayer.init(video);
                    if (!inputInitialized) {
                        logger.warn('InputLayer initialization failed, continuing without camera');
                    }
                } catch (error) {
                    logger.warn('Camera access denied or failed:', error.message);
                    logger.info('Game will continue without face tracking');
                }
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

        // Oyun sonu → Skor kaydetme
        eventBus.on(Events.GAME_OVER, () => {
            const score = gameEngine.state.score;
            const bestScore = backendService.getLocalBestScore();

            if (score > bestScore) {
                backendService.updateLocalBestScore(score);
                
                // Firebase'e gönder (bağlıysa)
                if (backendService.isConnected()) {
                    backendService.saveScore(score);
                }

                uiManager.showNotification(`🏆 Yeni rekor: ${score}!`, 5000);
            }
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

    // Cleanup
    destroy() {
        inputLayer.stop();
        if (gameEngine.animationId) {
            cancelAnimationFrame(gameEngine.animationId);
        }
        this.initialized = false;
    }
}

// Singleton instance
export const app = new App();
export default App;
