# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add global error handler at the beginning of the file
global_handler = '''/*
 * FaceRacer - Kafa Kontrol Oyunu (SOURCE CODE)
 * Copyright (c) 2026 Hakan Çetin
 * Tüm hakları saklıdır.
 *
 * Bu oyun Three.js ve MediaPipe Face Mesh kullanır
 * Yüz takibi ile kafa hareketlerini araba kontrolüne dönüştürür
 */

// Global Error Handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global Error:', { message, source, lineno, colno, error });
    
    // Show user-friendly error message
    const errorOverlay = document.getElementById('calibrationOverlay');
    if (errorOverlay) {
        errorOverlay.style.display = 'flex';
        errorOverlay.classList.remove('hidden');
        const calibrationContent = document.querySelector('.calibration-content');
        if (calibrationContent) {
            calibrationContent.innerHTML = `
                <h1 style="color: #ff4444;">⚠️ Hata Oluştu</h1>
                <p style="color: #ccc;">Bir hata oluştu. Lütfen sayfayı yenileyin.</p>
                <p style="font-size: 0.8rem; color: #888;">Hata: ${message}</p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #00ff88; border: none; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: bold;">
                    🔄 Sayfayı Yenile
                </button>
            `;
        }
    }
    
    return false;
};

// Unhandled Promise Rejection Handler
window.onunhandledrejection = function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    event.preventDefault();
};

'''

c = c.replace('''/*
 * FaceRacer - Kafa Kontrol Oyunu (SOURCE CODE)
 * Copyright (c) 2026 Hakan Çetin
 * Tüm hakları saklıdır.
 *
 * Bu oyun Three.js ve MediaPipe Face Mesh kullanır
 * Yüz takibi ile kafa hareketlerini araba kontrolüne dönüştürür
 *
''', global_handler)

# Improve camera permission error handling
old_camera_error = '''    try {
    } catch (error) {
        console.error('Camera access error:', error);'''

new_camera_error = '''    try {
    } catch (error) {
        console.error('Camera access error:', error);
        
        // Show user-friendly camera error message
        const errorOverlay = document.getElementById('calibrationOverlay');
        if (errorOverlay) {
            errorOverlay.style.display = 'flex';
            errorOverlay.classList.remove('hidden');
            const calibrationContent = document.querySelector('.calibration-content');
            if (calibrationContent) {
                let errorMessage = 'Kameraya erişilemedi';
                let errorDetail = '';
                
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    errorMessage = 'Kamera izni reddedildi';
                    errorDetail = 'Lütfen tarayıcı ayarlarından kamera izni verin.';
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    errorMessage = 'Kamera bulunamadı';
                    errorDetail = 'Kameranız bağlı olduğundan emin olun.';
                } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                    errorMessage = 'Kamera kullanımda';
                    errorDetail = 'Kamera başka bir uygulama tarafından kullanılıyor olabilir.';
                } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
                    errorMessage = 'Kamera ayarları uyumsuz';
                    errorDetail = 'Kamera desteklenmeyen ayarlar gerektiriyor.';
                } else if (error.name === 'TypeError') {
                    errorMessage = 'Kamera bağlantı hatası';
                    errorDetail = 'HTTPS bağlantısı gerekli (yerel test için localhost kullanın).';
                } else {
                    errorMessage = 'Kamera hatası';
                    errorDetail = error.message || 'Bilinmeyen bir hata oluştu.';
                }
                
                calibrationContent.innerHTML = `
                    <h1 style="color: #ff4444;">📷 Kamera Hatası</h1>
                    <p style="font-size: 1.2rem; color: #ff6b00;">${errorMessage}</p>
                    <p style="font-size: 0.9rem; color: #888;">${errorDetail}</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #00ff88; border: none; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: bold;">
                        🔄 Sayfayı Yenile
                    </button>
                `;
            }
        }'''

c = c.replace(old_camera_error, new_camera_error)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Added global error handler and improved camera permission error handling')
