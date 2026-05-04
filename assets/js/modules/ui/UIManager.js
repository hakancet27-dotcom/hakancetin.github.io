/**
 * UIManager - UI/CSS yönetimi ve kullanıcı etkileşimleri
 * GameEngine'den bağımsızdır, sadece olaylara yanıt verir
 */
import { eventBus, Events } from '../utils/EventBus.js';
import logger from '../utils/Logger.js';

class UIManager {
    constructor() {
        this.elements = {};
        this.overlays = [];
        this.notifications = [];
        this.uiScale = 1;
        
        this.bindEvents();
    }

    bindEvents() {
        // Oyun olayları
        eventBus.on(Events.SCORE_CHANGED, (score) => this.updateScore(score));
        eventBus.on(Events.SPEED_CHANGED, (speed) => this.updateSpeed(speed));
        eventBus.on(Events.DAMAGE_TAKEN, (health) => this.updateHealth(health));
        eventBus.on(Events.TURBO_ACTIVATED, () => this.showTurboActive());
        eventBus.on(Events.TURBO_DEACTIVATED, () => this.hideTurboActive());
        eventBus.on(Events.GAME_OVER, () => this.showGameOver());
        eventBus.on(Events.GAME_START, () => this.onGameStart());
        eventBus.on(Events.CALIBRATION_COMPLETE, () => this.onCalibrationComplete());
        eventBus.on('calibration:progress', (data) => this.onCalibrationProgress(data));
        
        // Platform olayları
        eventBus.on(Events.PLATFORM_CHANGED, (platform) => this.onPlatformChange(platform));
        eventBus.on(Events.TV_MODE_ON, () => this.onTVModeOn());
        eventBus.on(Events.TV_MODE_OFF, () => this.onTVModeOff());
        
        // Backend olayları
        eventBus.on(Events.LEADERBOARD_LOADED, (data) => this.updateLeaderboard(data));
        eventBus.on(Events.SCORE_SAVED, (data) => this.showScoreSaved(data));
    }

    init() {
        // DOM elementlerini önbelleğe al
        this.cacheElements();
        this.setupEventListeners();
        logger.info('UIManager initialized');
    }

    cacheElements() {
        this.elements = {
            // HUD
            score: document.getElementById('score'),
            damageLevel: document.getElementById('damageLevel'),
            turboPoints: document.getElementById('turboPoints'),
            turboThreshold: document.getElementById('turboThreshold'),
            distance: document.getElementById('distance'),
            fps: document.getElementById('fps'),
            speedometer: document.getElementById('speedMain'),
            
            // Bars
            turboBar: document.getElementById('turboBar'),
            turboFill: document.getElementById('turboFill'),
            
            // Overlays
            calibrationOverlay: document.getElementById('calibrationOverlay'),
            difficultyOverlay: document.getElementById('difficultyOverlay'),
            gameOverOverlay: document.getElementById('gameOverOverlay'),
            
            // Buttons
            toggleCamera: document.getElementById('toggleCamera'),
            toggleMusic: document.getElementById('toggleMusic'),
            toggleTVMode: document.getElementById('toggleTVMode'),
            connectPhoneBtn: document.getElementById('connectPhoneBtn'),
            toggleControls: document.getElementById('toggleControls'),
            
            // Panels
            controlsPanel: document.getElementById('controlsPanel'),
            hud: document.getElementById('hud'),
            video: document.getElementById('cameraVideo'),
            
            // Technical values
            controlRawYaw: document.getElementById('controlRawYaw'),
            controlRawPitch: document.getElementById('controlRawPitch')
        };
    }

    setupEventListeners() {
        // Buton olayları
        if (this.elements.toggleControls) {
            this.elements.toggleControls.addEventListener('click', () => {
                this.toggleControlsPanel();
            });
        }

        // Klavye kontrolleri
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.code === 'Space') {
                if (this.elements.calibrationOverlay?.classList.contains('visible')) {
                    // Boşluk tuşu kalibrasyon sırasında
                }
            }
        });
    }

    // HUD Güncellemeleri
    updateScore(score) {
        if (this.elements.score) {
            this.elements.score.textContent = score;
            this.animateElement(this.elements.score, 'score-update');
        }
    }

    updateSpeed(speed) {
        if (this.elements.speedometer) {
            this.elements.speedometer.textContent = Math.round(speed);
            
            // Renk değiştirme
            this.elements.speedometer.classList.remove('speed-low', 'speed-medium', 'speed-high');
            if (speed < 100) {
                this.elements.speedometer.classList.add('speed-low');
            } else if (speed < 250) {
                this.elements.speedometer.classList.add('speed-medium');
            } else {
                this.elements.speedometer.classList.add('speed-high');
            }
        }
    }

    updateHealth(health) {
        if (this.elements.damageLevel) {
            this.elements.damageLevel.textContent = Math.round(health);
            
            // Renk değiştirme
            if (health > 70) {
                this.elements.damageLevel.style.color = '#00ff88';
            } else if (health > 30) {
                this.elements.damageLevel.style.color = '#ffaa00';
            } else {
                this.elements.damageLevel.style.color = '#ff0044';
            }
        }
    }

    updateTurbo(points, threshold) {
        if (this.elements.turboPoints) {
            this.elements.turboPoints.textContent = points;
        }
        if (this.elements.turboThreshold) {
            this.elements.turboThreshold.textContent = threshold;
        }
        if (this.elements.turboFill) {
            const percentage = (points / threshold) * 100;
            this.elements.turboFill.style.width = `${percentage}%`;
        }
    }

    showTurboActive() {
        if (this.elements.turboBar) {
            this.elements.turboBar.classList.add('turbo-active');
        }
        this.showNotification('🔥 TURBO AKTİF!', 2000);
    }

    hideTurboActive() {
        if (this.elements.turboBar) {
            this.elements.turboBar.classList.remove('turbo-active');
        }
    }

    // Overlay yönetimi
    showOverlay(overlayId) {
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('visible');
            this.overlays.push(overlayId);
        }
    }

    hideOverlay(overlayId) {
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.classList.remove('visible');
            overlay.classList.add('hidden');
            const index = this.overlays.indexOf(overlayId);
            if (index > -1) this.overlays.splice(index, 1);
        }
    }

    hideAllOverlays() {
        this.overlays.forEach(id => this.hideOverlay(id));
    }

    // 3 aşamalı kalibrasyon ekranı
    showCalibration(phase) {
        const overlay = document.getElementById('calibrationOverlay');
        const title = document.getElementById('calibrationTitle');
        const desc = document.getElementById('calibrationDesc');
        
        if (overlay) overlay.classList.add('visible');
        
        // Phase dots güncelle
        for (let i = 1; i <= 3; i++) {
            const dot = document.getElementById(`phaseDot${i}`);
            if (dot) dot.classList.toggle('active', i <= phase);
        }
        
        if (phase === 1) {
            if (title) title.textContent = '📷 Yüzünüzü Kameraya Gösterin';
            if (desc) desc.textContent = 'Kamera sizi görüyor mu kontrol ediliyor...';
        } else if (phase === 2) {
            if (title) title.textContent = '🎯 Yüzünüzü Ortaya Getirin';
            if (desc) desc.textContent = 'Alnınız tam ortada olsun, dik durun';
        } else if (phase === 3) {
            if (title) title.textContent = '✅ Harika! Hazırsınız';
            if (desc) desc.textContent = 'Kalibrasyon tamamlandı';
        }
    }
    
    hideCalibration() {
        const overlay = document.getElementById('calibrationOverlay');
        if (overlay) overlay.classList.remove('visible');
    }

    // Kalibrasyon ilerleme
    onCalibrationProgress(data) {
        // Geri sayım güncelle
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            countdownEl.textContent = data.countdown > 0 ? data.countdown : '✔';
        }

        // Progress bar güncelle
        const progressFill = document.getElementById('calibrationProgress');
        if (progressFill) {
            progressFill.style.width = `${data.progress * 100}%`;
        }

        // Video'ya calibrating class ekle
        if (this.elements.video && !this.elements.video.classList.contains('calibrating')) {
            this.elements.video.classList.add('calibrating');
        }
    }

    // Kalibrasyon tamamlandı
    onCalibrationComplete() {
        console.log('🎯 UIManager: Kalibrasyon tamamlandı, zorluk ekranı gösteriliyor...');
        
        this.hideOverlay('calibrationOverlay');
        
        // Zorluk overlay'ı göster
        this.showOverlay('difficultyOverlay');
        
        if (this.elements.video) {
            this.elements.video.classList.remove('calibrating');
        }
    }

    // Oyun başlangıcı
    onGameStart() {
        this.hideAllOverlays();
        
        // Tüm HUD elementlerini göster
        const showElements = [
            'hud', 'toggleCamera', 'toggleControls', 'toggleMusic', 'connectPhoneBtn'
        ];
        showElements.forEach(id => {
            if (this.elements[id]) {
                this.elements[id].classList.add('visible');
            }
        });

        // Speedometer ve turbo bar
        const speedometer = document.getElementById('speedometer');
        if (speedometer) speedometer.classList.add('visible');
        
        const turboBarContainer = document.getElementById('turboBarContainer');
        if (turboBarContainer) turboBarContainer.classList.add('visible');
        
        // Teknik değerleri göster
        this.startTechnicalValuesUpdate();
    }

    // Oyun sonu
    showGameOver(score, isRecord, leaderboard) {
        this.showOverlay('gameOverOverlay');
        
        // Final skoru göster
        const finalScoreEl = document.getElementById('finalScore');
        if (finalScoreEl) {
            finalScoreEl.textContent = score || (this.elements.score?.textContent || '0');
        }
        
        // Yeni rekor bildirimi
        const newRecordEl = document.getElementById('newRecord');
        if (newRecordEl) {
            if (isRecord) {
                newRecordEl.classList.add('visible');
            } else {
                newRecordEl.classList.remove('visible');
            }
        }
        
        // Liderlik tablosunu doldur
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList && leaderboard) {
            leaderboardList.innerHTML = leaderboard.map((entry, index) => `
                <div class="leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                    <span class="rank">${index + 1}</span>
                    <span class="name">${this.escapeHtml(entry.name || 'Anonim')}</span>
                    <span class="score">${entry.score}</span>
                </div>
            `).join('');
        }
    }

    // Kontroller paneli
    toggleControlsPanel() {
        if (this.elements.controlsPanel) {
            this.elements.controlsPanel.classList.toggle('visible');
        }
    }

    // Duraklatma
    togglePause() {
        // GameEngine'e gönder
        const isPaused = this.elements.hud?.classList.contains('paused');
        if (isPaused) {
            eventBus.emit(Events.GAME_RESUME);
            this.elements.hud?.classList.remove('paused');
        } else {
            eventBus.emit(Events.GAME_PAUSE);
            this.elements.hud?.classList.add('paused');
        }
    }

    // Platform değişiklikleri
    onPlatformChange(platform) {
        this.uiScale = platform.isTV ? 1.5 : (platform.isMobile ? 0.9 : 1);
        document.documentElement.style.setProperty('--ui-scale', this.uiScale);
    }

    onTVModeOn() {
        document.body.classList.add('tv-mode');
        if (this.elements.toggleTVMode) {
            this.elements.toggleTVMode.textContent = '📺 TV: AÇIK';
        }
    }

    onTVModeOff() {
        document.body.classList.remove('tv-mode');
        if (this.elements.toggleTVMode) {
            this.elements.toggleTVMode.textContent = '📺 TV: KAPALI';
        }
    }

    // Leaderboard
    updateLeaderboard(leaderboard) {
        const container = document.getElementById('leaderboardList');
        if (!container) return;

        container.innerHTML = leaderboard.map((entry, index) => `
            <div class="leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                <span class="rank">${index + 1}</span>
                <span class="name">${this.escapeHtml(entry.name)}</span>
                <span class="score">${entry.score}</span>
            </div>
        `).join('');
    }

    showScoreSaved(data) {
        this.showNotification(`🏆 Skor kaydedildi: ${data.score}`, 3000);
    }

    // Bildirim sistemi
    showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 255, 136, 0.9);
            color: #000;
            padding: 15px 25px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // Teknik değerleri güncelle (tek sefer kaydet, memory leak engelle)
    startTechnicalValuesUpdate() {
        if (!this.elements.controlRawYaw || !this.elements.controlRawPitch) return;
        if (this._technicalListenersActive) return;
        this._technicalListenersActive = true;

        eventBus.on(Events.YAW_CHANGED, (yaw) => {
            if (this.elements.controlRawYaw) {
                this.elements.controlRawYaw.textContent = yaw.toFixed(3);
            }
        });

        eventBus.on(Events.PITCH_CHANGED, (pitch) => {
            if (this.elements.controlRawPitch) {
                this.elements.controlRawPitch.textContent = pitch.toFixed(3);
            }
        });
    }

    // Animasyon yardımcısı
    animateElement(element, animationClass) {
        element.classList.remove(animationClass);
        void element.offsetWidth; // Reflow
        element.classList.add(animationClass);
    }

    // HTML escape
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Loading göster/gizle
    showLoading(message = 'Yükleniyor...') {
        let loading = document.getElementById('loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loading';
            loading.innerHTML = `
                <div class="spinner"></div>
                <p>${message}</p>
            `;
            document.body.appendChild(loading);
        }
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
}

// Singleton instance
export const uiManager = new UIManager();
export default UIManager;
