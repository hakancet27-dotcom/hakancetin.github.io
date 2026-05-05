/**
 * BackendService - Firebase bağlantısı ve veri yönetimi
 * Leaderboard, skor kaydetme, hata raporlama
 * Diğer modüllerden bağımsızdır
 */
import { eventBus, Events } from '../utils/EventBus.js';
import logger from '../utils/Logger.js';

class BackendService {
    constructor() {
        this.firebase = null;
        this.database = null;
        this.connected = false;
        this.leaderboard = [];
        this.playerName = '';
        
        // Skor gönderme hız sınırı
        this.lastScoreSubmit = 0;
        this.scoreSubmitCooldown = 5000; // 5 saniye
    }

    init(firebaseConfig) {
        return new Promise((resolve) => {
            try {
                if (typeof firebase === 'undefined') {
                    logger.warn('Firebase SDK yuklenmemis, oyun offline devam ediyor');
                    this.connected = false;
                    resolve(false);
                    return;
                }

                // Firebase başlat
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }

                this.firebase = firebase;
                this.database = firebase.database();
                this.db = this.database; // WebRTC için alias
                this.connected = true;

                // Logger'a Firebase durumunu bildir
                logger.setFirebaseAvailable(true);

                // Bağlantı durumunu izle
                this.monitorConnection();

                // Kullanıcı adını localStorage'dan al
                this.playerName = localStorage.getItem('faceracer_name') || '';

                logger.info('BackendService initialized');
                resolve(true);
            } catch (error) {
                logger.warn('BackendService baslatilamadi, oyun offline devam ediyor:', error.message);
                this.connected = false;
                resolve(false);
            }
        });
    }

    monitorConnection() {
        if (!this.database) return;

        const connectedRef = this.database.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            const wasConnected = this.connected;
            this.connected = snap.val();

            if (wasConnected && !this.connected) {
                logger.warn('Firebase connection lost');
                eventBus.emit(Events.CONNECTION_LOST);
            } else if (!wasConnected && this.connected) {
                logger.info('Firebase connection restored');
            }
        });
    }

    // Leaderboard yükle
    async loadLeaderboard(limit = 10) {
        if (!this.connected || !this.database) {
            logger.warn('Cannot load leaderboard - not connected');
            return [];
        }

        try {
            const snapshot = await this.database
                .ref('leaderboard')
                .orderByChild('score')
                .limitToLast(limit)
                .once('value');

            const data = snapshot.val();
            if (!data) return [];

            this.leaderboard = Object.values(data)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            eventBus.emit(Events.LEADERBOARD_LOADED, this.leaderboard);
            return this.leaderboard;
        } catch (error) {
            logger.error('Failed to load leaderboard:', error);
            return [];
        }
    }

    // Skor kaydet
    async saveScore(score, name = null) {
        if (!this.connected || !this.database) {
            logger.warn('Cannot save score - not connected');
            return false;
        }

        // Hız sınırı kontrolü
        const now = Date.now();
        if (now - this.lastScoreSubmit < this.scoreSubmitCooldown) {
            logger.warn('Score submit too fast - cooldown active');
            return false;
        }

        const playerName = name || this.playerName || 'Anonim';

        // Spam koruması - skor makul mü?
        if (!this.isValidScore(score)) {
            logger.warn('Invalid score rejected:', score);
            return false;
        }

        try {
            const scoreData = {
                name: playerName,
                score: score,
                timestamp: Date.now(),
                date: new Date().toISOString(),
                domain: window.location.hostname,
                userAgent: navigator.userAgent.substring(0, 50)
            };

            await this.database.ref('leaderboard').push(scoreData);
            this.lastScoreSubmit = now;

            // LocalStorage'a da kaydet
            this.updateLocalBestScore(score);

            eventBus.emit(Events.SCORE_SAVED, { score, name: playerName });
            logger.info('Score saved:', score);
            return true;
        } catch (error) {
            logger.error('Failed to save score:', error);
            return false;
        }
    }

    // Skor doğrulama
    isValidScore(score) {
        if (typeof score !== 'number') return false;
        if (score < 0) return false;
        if (score > 100000) return false; // Maksimum makul skor
        return true;
    }

    // Yerel en yüksek skor
    updateLocalBestScore(score) {
        const currentBest = parseInt(localStorage.getItem('faceracer_bestScore') || '0');
        if (score > currentBest) {
            localStorage.setItem('faceracer_bestScore', score.toString());
            return true;
        }
        return false;
    }

    getLocalBestScore() {
        return parseInt(localStorage.getItem('faceracer_bestScore') || '0');
    }

    // Kullanıcı adı yönetimi
    setPlayerName(name) {
        this.playerName = name.trim().substring(0, 20); // 20 karakter sınırı
        localStorage.setItem('faceracer_name', this.playerName);
    }

    getPlayerName() {
        return this.playerName;
    }

    // Hata raporlama
    async reportError(message, error = null) {
        if (!this.connected || !this.database) return;

        try {
            const errorData = {
                message: message,
                error: error ? error.message : null,
                stack: error ? error.stack : null,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent.substring(0, 200),
                domain: window.location.hostname
            };

            await this.database.ref('errors').push(errorData);
        } catch (e) {
            console.error('Failed to report error:', e);
        }
    }

    // Kullanım istatistikleri
    async logUsage() {
        if (!this.connected || !this.database) return;

        try {
            const usageData = {
                domain: window.location.hostname,
                timestamp: Date.now(),
                userAgent: navigator.userAgent.substring(0, 100),
                platform: navigator.platform,
                screen: `${window.screen.width}x${window.screen.height}`
            };

            await this.database.ref('usage').push(usageData);
        } catch (e) {
            // Sessizce başarısız ol
        }
    }

    // Real-time listener
    onLeaderboardUpdate(callback) {
        if (!this.connected || !this.database) return () => {};

        const ref = this.database.ref('leaderboard').orderByChild('score').limitToLast(10);
        ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const sorted = Object.values(data).sort((a, b) => b.score - a.score);
                callback(sorted);
            }
        });

        // Unsubscribe fonksiyonu
        return () => ref.off('value');
    }

    // Bağlantı durumu
    isConnected() {
        return this.connected;
    }

    // Offline desteği
    enableOfflinePersistence() {
        if (!this.firebase) return;

        this.firebase.database().enablePersistence({
            synchronizeTabs: true
        }).catch((err) => {
            if (err.code === 'failed-precondition') {
                logger.warn('Multiple tabs open, persistence enabled in first tab only');
            } else if (err.code === 'unimplemented') {
                logger.warn('Browser does not support offline persistence');
            }
        });
    }
}

// Singleton instance
export const backendService = new BackendService();
export default BackendService;
