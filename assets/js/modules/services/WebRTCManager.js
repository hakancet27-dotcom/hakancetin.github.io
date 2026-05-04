/**
 * WebRTCManager - WebRTC telefon kamera bağlantısı
 * Firebase Realtime Database üzerinden signaling yapar
 * Host (PC) tarafı implementasyonu
 */
import { eventBus, Events } from '../utils/EventBus.js';
import logger from '../utils/Logger.js';

class WebRTCManager {
    constructor() {
        this.pc = null;
        this.roomRef = null;
        this.roomId = null;
        this.cleanupTimer = null;
        this.isConnected = false;
        this.remoteStream = null;

        // STUN/TURN sunucuları
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        // EventBus abonelikleri (loose coupling)
        this.bindEvents();
    }

    bindEvents() {
        eventBus.on(Events.WEBRTC_START_HOST, async (data) => {
            await this.startHost(data.firebaseDb);
        });

        eventBus.on(Events.WEBRTC_STOP, () => {
            this.stop();
        });
    }

    // Benzersiz oda ID'si oluştur
    generateRoomId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Video bitrate sınırlama (daha hızlı bağlantı için)
    limitVideoBitrate(sdp, maxKbps) {
        const lines = sdp.split('\n');
        const idx = lines.findIndex(l => l.startsWith('m=video'));
        if (idx < 0) return sdp;
        lines.splice(idx + 1, 0, `b=AS:${maxKbps}`);
        return lines.join('\n');
    }

    // WebRTC host başlat (PC tarafı)
    async startHost(firebaseDb) {
        logger.info('WebRTC Host başlatılıyor...');
        this.stop(); // Önceki bağlantıyı temizle

        this.roomId = this.generateRoomId();
        logger.info('Room ID:', this.roomId);

        try {
            // Firebase referansı oluştur
            this.roomRef = firebaseDb.ref('webrtc_rooms/' + this.roomId);
            
            // RTCPeerConnection oluştur
            this.pc = new RTCPeerConnection(this.iceServers);
            
            // Video transceiver ekle (sadece alma)
            this.pc.addTransceiver('video', { direction: 'recvonly' });
            logger.info('Video transceiver eklendi (recvonly)');

            // Track olayını dinle (telefon kamerası geldiğinde)
            this.pc.ontrack = (event) => {
                logger.info('Remote track alındı:', event.streams[0]);
                this.remoteStream = event.streams[0];
                this.onRemoteTrack(event.streams[0]);
            };

            // ICE candidate olayını dinle
            this.pc.onicecandidate = (e) => {
                if (e.candidate) {
                    logger.debug('ICE candidate:', e.candidate.candidate.substring(0, 50));
                    this.roomRef.child('laptopCandidates')
                        .push(e.candidate.toJSON())
                        .catch(err => logger.error('ICE yazma hatası:', err));
                }
            };

            // Bağlantı durumunu izle
            this.pc.onconnectionstatechange = () => {
                const state = this.pc.connectionState;
                logger.info('WebRTC bağlantı durumu:', state);
                
                this.updateConnectionStatus(state);
                
                if (state === 'connected') {
                    this.isConnected = true;
                    eventBus.emit(Events.WEBRTC_CONNECTED, { roomId: this.roomId });
                } else if (state === 'failed') {
                    this.pc.restartIce();
                } else if (state === 'closed' || state === 'disconnected') {
                    this.isConnected = false;
                }
            };

            // Offer oluştur
            let offer = await this.pc.createOffer();
            offer = new RTCSessionDescription({
                type: offer.type,
                sdp: this.limitVideoBitrate(offer.sdp, 800)
            });
            
            await this.pc.setLocalDescription(offer);
            
            // Offer'ı Firebase'e kaydet
            await this.roomRef.child('offer').set({
                type: offer.type,
                sdp: offer.sdp
            });

            // Telefonun answer'ını bekle
            this.roomRef.child('answer').on('value', async (snap) => {
                const answer = snap.val();
                if (!answer || this.pc.remoteDescription) return;
                try {
                    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
                    logger.info('Remote description ayarlandı');
                } catch (err) {
                    logger.error('Answer alma hatası:', err);
                }
            });

            // Telefonun ICE candidate'larını dinle
            this.roomRef.child('phoneCandidates').on('child_added', async (snap) => {
                const c = snap.val();
                if (!c) return;
                try {
                    await this.pc.addIceCandidate(new RTCIceCandidate(c));
                } catch (err) {
                    // Sessizce hata verme - candidate zaten eklenmiş olabilir
                }
            });

            // 5 dakika sonra otomatik temizleme
            this.cleanupTimer = setTimeout(() => {
                if (!this.isConnected) {
                    logger.warn('WebRTC zaman aşımı, bağlantı kapatılıyor...');
                    this.stop();
                    eventBus.emit(Events.WEBRTC_TIMEOUT);
                }
            }, 5 * 60 * 1000);

            // QR kod URL'sini oluştur ve overlay'i göster
            const qrUrl = this.getQRCodeUrl();
            const apiQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`;
            this.showQROverlay(qrUrl, apiQRUrl);

            eventBus.emit('webrtc:connection_start', { roomId: this.roomId });
            return { success: true, roomId: this.roomId };

        } catch (error) {
            logger.error('WebRTC Host başlatma hatası:', error);
            this.stop();
            return { success: false, error: error.message };
        }
    }

    // Remote track geldiğinde
    onRemoteTrack(stream) {
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = stream;
            remoteVideo.play().catch(e => logger.warn('Remote video play hatası:', e));
            
            remoteVideo.onloadeddata = () => {
                logger.info('Remote video yüklendi, face detection başlatılabilir');
                eventBus.emit(Events.WEBRTC_VIDEO_READY, { stream });
            };
        }
    }

    // QR kod overlay'i göster
    showQROverlay(qrUrl, apiQRUrl) {
        // Yeni kamera hata ekranındaki qrCode elementini doldur
        const qrCodeEl = document.getElementById('qrCode');
        if (qrCodeEl) {
            qrCodeEl.innerHTML = `<img src="${apiQRUrl}" alt="QR Kod" style="width:160px;height:160px;border-radius:8px;">`;
        }
        
        // Eski webrtcOverlay'e de yedek göster
        const webrtcOverlay = document.getElementById('webrtcOverlay');
        if (webrtcOverlay) {
            webrtcOverlay.innerHTML = `
                <div style="text-align: center; padding: 28px 32px; background: #0d0d1f; border-radius: 16px; border: 2px solid #00ff88; max-width: 360px; width: 90vw;">
                    <h2 style="color: #00ff88; margin-bottom: 6px;">📱 Telefonu Bağla</h2>
                    <p style="color: #888; font-size: 0.82rem; margin-bottom: 18px;">Telefonunla QR'ı okut — kamera sensörü olarak kullan</p>
                    <img src="${apiQRUrl}" alt="QR Kod" style="border-radius: 8px; border: 3px solid #fff; width: 220px; height: 220px;">
                    <p style="color: #555; font-size: 0.68rem; margin-top: 10px; word-break: break-all;">${qrUrl}</p>
                    <div id="webrtcStatus" style="margin-top: 14px; color: #888; font-size: 0.9rem; min-height: 22px;">⏳ Telefon bekleniyor...</div>
                    <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
                        <button data-action="cancelWebRTC" style="padding: 8px 18px; background: transparent; border: 1px solid #444; border-radius: 8px; color: #888; cursor: pointer; font-size: 0.85rem;">İptal</button>
                        <button data-action="restartWebRTC" style="padding: 8px 18px; background: transparent; border: 1px solid #00ff88; border-radius: 8px; color: #00ff88; cursor: pointer; font-size: 0.85rem;">🔄 Yeni QR</button>
                    </div>
                </div>
            `;
            webrtcOverlay.classList.add('visible');

            // Buton click listener'ları
            webrtcOverlay.addEventListener('click', (e) => {
                const action = e.target?.dataset?.action;
                if (action === 'cancelWebRTC') {
                    this.stop();
                } else if (action === 'restartWebRTC') {
                    this.stop();
                    eventBus.emit(Events.WEBRTC_START_HOST, { firebaseDb: window.backendService?.db });
                }
            });
        }
    }

    // Bağlantı durumunu UI'a bildir
    updateConnectionStatus(state) {
        const statusEl = document.getElementById('webrtcStatus');
        if (!statusEl) return;

        const states = {
            connecting:    { msg: '⏳ Bağlanıyor...', color: '#888' },
            connected:     { msg: '✅ Telefon bağlandı!', color: '#00ff88' },
            disconnected:  { msg: '⚠️ Bağlantı zayıfladı...', color: '#ff6b00' },
            failed:        { msg: '❌ Bağlantı başarısız', color: '#ff4444' },
            closed:        { msg: '🔌 Bağlantı kapatıldı', color: '#888' }
        };

        const stateInfo = states[state];
        if (stateInfo) {
            statusEl.textContent = stateInfo.msg;
            statusEl.style.color = stateInfo.color;
        }
    }

    // Bağlantıyı durdur ve temizle
    stop() {
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        if (this.roomRef) {
            this.roomRef.remove();
            this.roomRef = null;
        }

        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }

        this.roomId = null;
        this.isConnected = false;
        this.remoteStream = null;

        // Overlay'i gizle
        const overlay = document.getElementById('webrtcOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.add('hidden');
        }

        logger.info('WebRTC bağlantısı temizlendi');
        eventBus.emit(Events.WEBRTC_DISCONNECTED);
    }

    // QR kod URL'sini oluştur
    getQRCodeUrl() {
        if (!this.roomId) return null;
        const baseUrl = window.location.origin + window.location.pathname.replace('game.html', 'telefon.html');
        return `${baseUrl}?room=${this.roomId}`;
    }

    // Bağlantı durumunu kontrol et
    isWebRTCConnected() {
        return this.isConnected && this.pc && this.pc.connectionState === 'connected';
    }
}

// Singleton instance
export const webRTCManager = new WebRTCManager();
export default WebRTCManager;
