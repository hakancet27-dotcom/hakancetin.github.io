@echo off
echo 🔒 FaceRacer Obfuscation Kurulumu
echo.

echo 1. Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js yüklü değil!
    echo 📥 Lütfen https://nodejs.org adresinden indirin
    pause
    exit /b 1
)
echo ✅ Node.js yüklü

echo.
echo 2. Paketler yükleniyor...
npm install
if %errorlevel% neq 0 (
    echo ❌ Paket yüklemesi başarısız!
    pause
    exit /b 1
)
echo ✅ Paketler yüklendi

echo.
echo 3. Obfuscation başlıyor...
npm run obfuscate
if %errorlevel% neq 0 (
    echo ❌ Obfuscation başarısız!
    pause
    exit /b 1
)

echo.
echo 🎉 Kurulum tamamlandı!
echo 📁 Obfuscated kod: assets/js/faceracer.js
echo 🗺️ Source map: assets/js/faceracer.map.js (sadece local)
echo ⚠️ GitHub'a push etmeden önce kontrol edin!
echo.

echo 4. GitHub'a göndermek için:
echo git add assets/js/faceracer.js
echo git commit -m "Apply obfuscation"
echo git push origin main
echo.

pause
