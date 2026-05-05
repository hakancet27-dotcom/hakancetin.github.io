/**
 * WebSocketClient - WebRTC signaling icin WebSocket baglantisi
 * Firebase yerine kullanilir
 */
import logger from './Logger.js';

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.role = null; // 'host' veya 'peer'
        this.onMessage = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.connected = false;
        
        // Glitch sunucu adresi (deploy edildikten sonra guncellenecek)
        this.serverUrl = 'wss://faceracer-signaling.glitch.me';
    }

    connect(roomId, role) {
        return new Promise((resolve, reject) => {
            this.roomId = roomId;
            this.role = role;

            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.onopen = () => {
                    logger.info('WebSocket baglandi');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    
                    // Odaya katil
                    this.send({ type: 'join', roomId, role });
                    resolve(true);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (this.onMessage) {
                            this.onMessage(msg);
                        }
                    } catch (err) {
                        logger.error('WebSocket mesaj parse hatasi:', err);
                    }
                };

                this.ws.onerror = (err) => {
                    logger.error('WebSocket hatasi:', err);
                    reject(new Error('WebSocket baglanti hatasi'));
                };

                this.ws.onclose = () => {
                    logger.warn('WebSocket kapandi');
                    this.connected = false;
                };

            } catch (err) {
                reject(err);
            }
        });
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            logger.warn('WebSocket acik degil, mesaj gonderilemedi');
        }
    }

    sendOffer(offer) {
        this.send({ type: 'offer', data: offer });
    }

    sendAnswer(answer) {
        this.send({ type: 'answer', data: answer });
    }

    sendIceCandidate(candidate) {
        this.send({ type: 'ice_candidate', data: candidate });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
}

export const wsClient = new WebSocketClient();
export default WebSocketClient;
