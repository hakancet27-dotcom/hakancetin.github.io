# -*- coding: utf-8 -*-
filepath = r'assets/js/faceracer.source.js'

with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove global error handler that might be blocking camera loading
old_global = '''// Global Error Handler
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

new_global = '''// Note: Error handling is done in specific functions to avoid blocking camera loading

'''

c = c.replace(old_global, new_global)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print('Removed global error handler - camera should load normally')
