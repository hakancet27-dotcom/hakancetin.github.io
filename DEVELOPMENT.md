# 🛠️ FaceRacer Geliştirme Rehberi

## 📁 Dosya Yapısı

```
assets/js/
├── faceracer.source.js    # GELİŞTİRME İÇİN KULLANIN (Source kod)
└── faceracer.js           # PRODUCTION (Obfuscated/Minified)
```

## 🔄 Geliştirme Süreci

### 1. Yeni Özellik Eklerken:
```bash
# faceracer.source.js dosyasını düzenleyin
# Kodları buraya yazın, test edin
```

### 2. Test Ettikten Sonra:
```bash
# faceracer.source.js → faceracer.js kopyalayın
# İsteğe bağlı: Obfuscation tool'u kullanın
```

### 3. Deploy:
```bash
git add .
git commit -m "Yeni özellik"
git push
```

## 🔒 Kod Korunması

**Source Kodu Gizli:**
- `faceracer.source.js` → `.gitignore`'da
- GitHub'a push edilmez
- Sadece yerel makinede kalır

**Production Kodu:**
- `faceracer.js` → GitHub'da görünür
- Tarayıcıda çalışır
- Telif hakkı ile korunur

## 🛡️ Ek Önlemler

### Obfuscation (İsteğe Bağlı):

**Online Tool:**
- https://obfuscator.io/
- faceracer.source.js → paste → obfuscate → faceracer.js

**NPM Tool:**
```bash
npm install -g javascript-obfuscator
javascript-obfuscator assets/js/faceracer.source.js -o assets/js/faceracer.js
```

## ⚠️ Önemli Notlar

1. **Her zaman source.js dosyasını düzenleyin**
2. **Değişiklikleri test edin**
3. **Sonra production'a taşıyın**
4. **Source kodu asla GitHub'a push etmeyin**
5. **.gitignore dosyasını silmeyin**

## 🐛 Debug

Production'da debug yapmak zor olabilir. Geliştirme sırasında:

```javascript
// faceracer.source.js'de console.log ekleyin
console.log('Debug:', gameState.yaw);
```

Deploy öncinde debug loglarını kaldırın veya comment edin.

## 📦 İlerideki İyileştirmeler

**Sürece Etkilemez:**
- ✅ Source dosyasını düzenleyin
- ✅ Test edin
- ✅ Production'a taşıyın
- ✅ Deploy edin

**Süreci Kolaylaştırır:**
- Otomatik obfuscation script'i
- CI/CD pipeline
- Pre-commit hooks

---

**Soru:** Geliştirme süreciyle ilgili sorularınız varsa sorun!
