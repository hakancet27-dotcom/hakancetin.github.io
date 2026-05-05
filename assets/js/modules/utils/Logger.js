/**
 * Logger - Merkezi loglama sistemi
 * Production'da console'u gizler, Firebase'e hata raporlar
 */
class Logger {
    constructor() {
        this.isProduction = window.location.hostname !== 'localhost';
        this.firebaseAvailable = false;
    }

    setFirebaseAvailable(available) {
        this.firebaseAvailable = available;
    }

    error(message, error = null) {
        if (this.isProduction) return;
        console.error(`[ERROR] ${message}`, error || '');
        if (error) this.reportError(message, error);
    }

    warn(message) {
        if (this.isProduction) return;
        console.warn(`[WARN] ${message}`);
    }

    info(message) {
        if (this.isProduction) return;
        console.log(`[INFO] ${message}`);
    }

    debug(message) {
        if (this.isProduction) return;
        console.log(`[DEBUG] ${message}`);
    }

    reportError(message, error = null) {
        if (!this.firebaseAvailable || typeof firebase === 'undefined') {
            return;
        }

        try {
            const errorRef = firebase.database().ref('errors');
            errorRef.push({
                message: message,
                error: error ? error.message : 'Unknown error',
                stack: error ? error.stack : null,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent.substring(0, 200),
                domain: window.location.hostname
            }).catch(() => {});
        } catch (e) {
            // Sessizce gec
        }
    }
}

export const logger = new Logger();
export default logger;
