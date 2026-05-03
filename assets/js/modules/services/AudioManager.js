/**
 * AudioManager - Ses yönetimi
 * Web Audio API kullanır, müzik ve efektleri kontrol eder
 */
import { eventBus, Events } from '../utils/EventBus.js';
import logger from '../utils/Logger.js';

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.gainNodes = {};
        this.oscillators = [];
        this.backgroundMusic = null;
        this.isMuted = false;
        this.volume = 0.5;
        this.initialized = false;

        this.bindEvents();
    }

    bindEvents() {
        eventBus.on('audio:play', (data) => this.playEffect(data.type));
        eventBus.on(Events.TURBO_ACTIVATED, () => this.playTurboSound());
        eventBus.on(Events.OBSTACLE_HIT, (data) => this.playObstacleSound(data.type));
        eventBus.on(Events.GAME_OVER, () => this.playGameOverSound());
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            logger.info('AudioManager initialized');
            return true;
        } catch (error) {
            logger.error('AudioManager initialization failed:', error);
            return false;
        }
    }

    // Kullanıcı etkileşimi gerektirir (tarayıcı politikası)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Efekt sesleri
    playEffect(type) {
        if (!this.initialized || this.isMuted) return;
        this.resume();

        switch(type) {
            case 'green':
                this.playGreenSound();
                break;
            case 'gold':
                this.playGoldSound();
                break;
            case 'damage':
                this.playDamageSound();
                break;
            case 'turbo':
                this.playTurboSound();
                break;
        }
    }

    playGreenSound() {
        if (!this.audioContext) return;

        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523, this.audioContext.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1047, this.audioContext.currentTime + 0.1);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659, this.audioContext.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1319, this.audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(0.2 * this.volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.audioContext.currentTime + 0.2);
        osc2.stop(this.audioContext.currentTime + 0.2);
    }

    playGoldSound() {
        if (!this.audioContext) return;

        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1568, this.audioContext.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(3136, this.audioContext.currentTime + 0.05);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2093, this.audioContext.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(4186, this.audioContext.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2 * this.volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.audioContext.currentTime + 0.15);
        osc2.stop(this.audioContext.currentTime + 0.15);
    }

    playDamageSound() {
        if (!this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);

        gain.gain.setValueAtTime(0.3 * this.volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    playTurboSound() {
        if (!this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
        osc.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 1);

        gain.gain.setValueAtTime(0.2 * this.volume, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.1 * this.volume, this.audioContext.currentTime + 1);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 1);
    }

    playGameOverSound() {
        if (!this.audioContext) return;

        const notes = [262, 247, 233, 220]; // Düşen notalar
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

                gain.gain.setValueAtTime(0.3 * this.volume, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

                osc.connect(gain);
                gain.connect(this.audioContext.destination);

                osc.start();
                osc.stop(this.audioContext.currentTime + 0.5);
            }, index * 150);
        });
    }

    // Arkaplan müziği
    playBackgroundMusic(audioElement) {
        this.backgroundMusic = audioElement;
        if (this.backgroundMusic && !this.isMuted) {
            this.backgroundMusic.volume = this.volume;
            this.backgroundMusic.play().catch(() => {
                // Otomatik oynatma engellendi
            });
        }
    }

    pauseBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
        }
    }

    // Kontroller
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.volume;
        }
        localStorage.setItem('faceracer_volume', this.volume.toString());
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.backgroundMusic) {
            this.backgroundMusic.muted = this.isMuted;
        }
        localStorage.setItem('faceracer_muted', this.isMuted.toString());
        return this.isMuted;
    }

    loadSettings() {
        const savedVolume = localStorage.getItem('faceracer_volume');
        const savedMuted = localStorage.getItem('faceracer_muted');

        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
        }
        if (savedMuted !== null) {
            this.isMuted = savedMuted === 'true';
        }
    }
}

// Singleton instance
export const audioManager = new AudioManager();
export default AudioManager;
