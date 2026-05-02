# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove the new camera error handling that shows overlay before camera loads
# Keep only console.error and the simple loadingEl message
old_camera_error = '''    } catch (error) {
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

new_camera_error = '''    } catch (error) {
        console.error('Camera access error:', error);
        loadingEl.innerHTML = '<p style="color: red;">Hata: Kameraya erişilemedi - ' + error.message + '</p>';'''

c = c.replace(old_camera_error, new_camera_error)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed camera error handler - removed premature overlay')
