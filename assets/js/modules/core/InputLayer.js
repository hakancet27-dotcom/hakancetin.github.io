/**
 * InputLayer - Kamera ve yüz takibi modülü
 * MediaPipe Face Mesh kullanır, yaw/pitch/blink tespiti yapar
 * GameEngine'den bağımsızdır - sadece olay yayınlar
 */
import { eventBus, Events } from '../utils/EventBus.js';
import { platformAdapter } from '../adapters/PlatformAdapter.js';
import logger from '../utils/Logger.js';

class InputLayer {
    constructor() {
        this.videoElement = null;
        this.faceMesh = null;
        this.camera = null;
        
        // Kalibrasyon durumu
        this.isCalibrated = false;
        this.calibrationSamples = [];
        this.calibrationPhase = 0;
        this.baseYaw = 0;
        this.basePitch = 0;
        this.yawSensitivity = 50;
        this.pitchSensitivity = 25;
        
        // Smoothing
        this.smoothedYaw = 0;
        this.smoothedPitch = 0;
        this.alpha = 0.3; // Low-pass filter
        
        // Blink detection
        this.lastBlinkTime = 0;
        this.blinkCooldown = 500; // ms
        
        // Audio context for beep sounds
        this.audioCtx = null;
        
        // Lite mod (FPS düşükse otomatik geçer)
        this.liteMode = false;
        
        this.running = false;
        
        // FPS düştüğünde lite moda geç
        eventBus.on(Events.LOW_FPS, (data) => this.switchToLiteMode(data));
    }

    async init(videoElement) {
        this.videoElement = videoElement;
        
        try {
            // MediaPipe Face Mesh yükle
            await this.loadMediaPipe();
            
            // Kamera başlat
            await this.startCamera();
            
            logger.info('InputLayer initialized successfully');
            return true;
        } catch (error) {
            logger.error('InputLayer initialization failed:', error);
            return false;
        }
    }

    async loadMediaPipe() {
        return new Promise((resolve, reject) => {
            if (typeof FaceMesh === 'undefined') {
                reject(new Error('FaceMesh not loaded'));
                return;
            }

            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            // Platforma göre MediaPipe ayarları
            this.faceMesh.setOptions(platformAdapter.getMediaPipeOptions(this.liteMode));

            this.faceMesh.onResults(this.onFaceResults.bind(this));
            resolve();
        });
    }

    async startCamera() {
        // Önce mevcut stream'i temizle
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 500));

        const Camera = window.Camera;
        if (!Camera) {
            throw new Error('Camera utils not loaded');
        }

        const res = platformAdapter.getCameraResolution();
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                if (this.running) {
                    await this.faceMesh.send({ image: this.videoElement });
                }
            },
            width: res.width,
            height: res.height
        });

        await this.camera.start();
        this.running = true;
    }
    
    // FPS düştüğünde MediaPipe'i hafif moda geçir
    switchToLiteMode(data) {
        if (this.liteMode) return; // Zaten lite mod
        if (!this.faceMesh) return;
        
        this.liteMode = true;
        try {
            this.faceMesh.setOptions(platformAdapter.getMediaPipeOptions(true));
            logger.info(`Switched to MediaPipe lite mode (FPS: ${data?.fps?.toFixed(1) || '?'})`);
            eventBus.emit(Events.MODEL_SWITCHED, { mode: 'lite', fps: data?.fps });
            eventBus.emit(Events.NOTIFICATION, {
                message: '⚡ Performans için hafif moda geçildi',
                duration: 4000
            });
        } catch (e) {
            logger.error('Lite mode switch failed:', e);
        }
    }

    onFaceResults(results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            eventBus.emit(Events.FACE_LOST);
            return;
        }

        eventBus.emit(Events.FACE_DETECTED);

        const landmarks = results.multiFaceLandmarks[0];
        
        // Üst yüz landmark'ları
        const forehead = landmarks[10];
        const foreheadUpper = landmarks[151];
        const leftEyebrow = landmarks[70];
        const rightEyebrow = landmarks[300];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseBridge = landmarks[6];
        const noseTip = landmarks[1];

        // Yüz merkezi hesaplama
        const upperFaceCenterX = (leftEyebrow.x + rightEyebrow.x + leftEye.x + rightEye.x) / 4;
        const upperFaceCenterY = (forehead.y * 0.7 + foreheadUpper.y * 0.3 + noseBridge.y * 0.3) / 1.3;

        const faceHeight = Math.abs(forehead.y - noseBridge.y);
        const faceWidth = Math.abs(rightEyebrow.x - leftEyebrow.x);

        // Yaw hesaplama
        const yaw = (0.5 - noseTip.x) * this.yawSensitivity * 2.5;
        
        // Pitch hesaplama
        const pitch = (noseTip.y - upperFaceCenterY) / faceHeight * this.pitchSensitivity;

        if (!this.isCalibrated) {
            this.collectCalibrationSamples(yaw, pitch);
        } else {
            this.processInputs(yaw, pitch, landmarks);
        }
    }

    collectCalibrationSamples(yaw, pitch) {
        this.calibrationSamples.push({ yaw, pitch });
        
        // Son 90 örneği tut
        if (this.calibrationSamples.length > 90) {
            this.calibrationSamples.shift();
        }

        // Geri sayım güncellemesi (30fps varsayımı: 90 örnek = 3 saniye)
        const progress = this.calibrationSamples.length / 90;
        const countdown = Math.ceil(3 - (progress * 3));
        eventBus.emit('calibration:progress', { 
            progress, 
            countdown: Math.max(0, countdown),
            samples: this.calibrationSamples.length 
        });

        // Kalibrasyon tamamlandı mı?
        if (this.calibrationSamples.length >= 90 && this.calibrationPhase === 0) {
            this.completeCalibration();
        }
    }

    completeCalibration() {
        const yawValues = this.calibrationSamples.map(s => s.yaw);
        const pitchValues = this.calibrationSamples.map(s => s.pitch);

        this.baseYaw = yawValues.reduce((a, b) => a + b, 0) / yawValues.length;
        this.basePitch = pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length;

        // Dinamik hassasiyet hesaplama
        const yawRange = Math.max(...yawValues) - Math.min(...yawValues);
        const pitchRange = Math.max(...pitchValues) - Math.min(...pitchValues);

        this.yawSensitivity = yawRange > 0.1 ? 50 / yawRange : 50;
        this.pitchSensitivity = pitchRange > 0.1 ? 25 / pitchRange : 25;

        this.isCalibrated = true;
        
        eventBus.emit(Events.CALIBRATION_COMPLETE, {
            baseYaw: this.baseYaw,
            basePitch: this.basePitch,
            yawSensitivity: this.yawSensitivity,
            pitchSensitivity: this.pitchSensitivity
        });

        this.playBeep('success');
    }

    processInputs(yaw, pitch, landmarks) {
        // Smoothing
        this.smoothedYaw = this.alpha * yaw + (1 - this.alpha) * this.smoothedYaw;
        this.smoothedPitch = this.alpha * pitch + (1 - this.alpha) * this.smoothedPitch;

        // Kalibre değerler
        const rawYaw = this.smoothedYaw - this.baseYaw;
        const rawPitch = this.smoothedPitch - this.basePitch;

        // Deadzone uygula
        const deadzone = 0.05;
        const finalYaw = Math.abs(rawYaw) > deadzone ? Math.max(-1, Math.min(1, rawYaw)) : 0;
        const finalPitch = Math.abs(rawPitch) > deadzone ? Math.max(-1, Math.min(1, rawPitch)) : 0;

        // Olayları yayınla
        eventBus.emit(Events.YAW_CHANGED, finalYaw);
        eventBus.emit(Events.PITCH_CHANGED, finalPitch);

        // Göz kırpma tespiti
        this.detectBlink(landmarks);
    }

    detectBlink(landmarks) {
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const rightEyeTop = landmarks[386];
        const rightEyeBottom = landmarks[374];

        const leftEyeOpen = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const rightEyeOpen = Math.abs(rightEyeTop.y - rightEyeBottom.y);

        const now = Date.now();
        if ((leftEyeOpen < 0.015 || rightEyeOpen < 0.015) && 
            now - this.lastBlinkTime > this.blinkCooldown) {
            this.lastBlinkTime = now;
            eventBus.emit(Events.BLINK_DETECTED);
        }
    }

    playBeep(type) {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        switch(type) {
            case 'success':
                oscillator.frequency.value = 1200;
                gainNode.gain.value = 0.4;
                oscillator.start();
                setTimeout(() => oscillator.frequency.value = 1500, 100);
                oscillator.stop(this.audioCtx.currentTime + 0.3);
                break;
            case 'tick':
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.3;
                oscillator.start();
                oscillator.stop(this.audioCtx.currentTime + 0.1);
                break;
        }
    }

    resetCalibration() {
        this.isCalibrated = false;
        this.calibrationSamples = [];
        this.calibrationPhase = 0;
    }

    async stop() {
        this.running = false;
        if (this.camera) {
            await this.camera.stop();
            this.camera = null;
        }
        // Video element stream'ini de temizle
        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
    }

    start() {
        this.running = true;
    }
}

// Singleton instance
export const inputLayer = new InputLayer();
export default InputLayer;
