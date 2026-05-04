/**
 * EventBus - Modüller arası gevşek bağlı iletişim
 * Hiçbir modül diğerini doğrudan bilmez, sadece olaylara abone olur
 */
class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.events.has(event)) return;
        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
    }

    emit(event, data) {
        if (!this.events.has(event)) return;
        this.events.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`EventBus error in ${event}:`, error);
            }
        });
    }

    once(event, callback) {
        const onceWrapper = (data) => {
            this.off(event, onceWrapper);
            callback(data);
        };
        return this.on(event, onceWrapper);
    }
}

// Singleton instance
export const eventBus = new EventBus();

// Event names as constants to avoid typos
export const Events = {
    // Input events
    FACE_DETECTED: 'face:detected',
    FACE_LOST: 'face:lost',
    YAW_CHANGED: 'input:yaw',
    PITCH_CHANGED: 'input:pitch',
    BLINK_DETECTED: 'input:blink',
    CALIBRATION_COMPLETE: 'input:calibrationComplete',
    
    // Game events
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    SCORE_CHANGED: 'game:score',
    SPEED_CHANGED: 'game:speed',
    DAMAGE_TAKEN: 'game:damage',
    TURBO_ACTIVATED: 'game:turbo',
    TURBO_DEACTIVATED: 'game:turboEnd',
    OBSTACLE_HIT: 'game:obstacleHit',
    
    // Platform events
    PLATFORM_CHANGED: 'platform:changed',
    TV_MODE_ON: 'platform:tvOn',
    TV_MODE_OFF: 'platform:tvOff',
    MOBILE_DETECTED: 'platform:mobile',
    DESKTOP_DETECTED: 'platform:desktop',
    
    // Backend events
    LEADERBOARD_LOADED: 'backend:leaderboard',
    SCORE_SAVED: 'backend:scoreSaved',
    CONNECTION_LOST: 'backend:connectionLost',
    
    // Performance events
    LOW_FPS: 'performance:lowFps',
    MODEL_SWITCHED: 'performance:modelSwitched',
    
    // WebRTC events
    WEBRTC_START_HOST: 'webrtc:startHost',
    WEBRTC_STOP: 'webrtc:stop',
    WEBRTC_CONNECTED: 'webrtc:connected',
    WEBRTC_DISCONNECTED: 'webrtc:disconnected',
    WEBRTC_TIMEOUT: 'webrtc:timeout',
    WEBRTC_VIDEO_READY: 'webrtc:videoReady',
    
    // UI events
    UI_SHOW: 'ui:show',
    UI_HIDE: 'ui:hide',
    OVERLAY_SHOW: 'ui:overlay',
    NOTIFICATION: 'ui:notification'
};

export default EventBus;
